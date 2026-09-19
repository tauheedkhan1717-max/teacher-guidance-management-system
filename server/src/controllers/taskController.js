import { prisma } from "../lib/prisma.js";

// Teacher creates a task for a group
export async function createTask(req, res, next) {
  try {
    const { title, description, dueDate, groupId } = req.body;
    
    // Check if group belongs to this teacher
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { teacher: true }
    });
    
    if (!group || (req.user.role === "TEACHER" && group.teacher.userId !== req.user.userId)) {
      return res.status(403).json({ error: { message: "Unauthorized." } });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        groupId,
        createdById: req.user.userId
      }
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (err) {
    next(err);
  }
}

// Get all tasks for a group (Any member or teacher)
export async function getGroupTasks(req, res, next) {
  try {
    const { groupId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { groupId, isDeleted: false },
      include: {
        submissions: {
          include: { student: { include: { user: { select: { name: true } } } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

// Student marks a task as done (assigns/submits it)
export async function submitTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const { studentNote } = req.body;
    
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const submission = await prisma.taskSubmission.upsert({
      where: { taskId_studentId: { taskId, studentId: profile.id } },
      update: { status: "SUBMITTED", studentNote },
      create: { taskId, studentId: profile.id, status: "SUBMITTED", studentNote }
    });

    res.json({ message: "Task submitted successfully", submission });
  } catch (err) {
    next(err);
  }
}

// Teacher verifies a submission (marks as COMPLETED)
export async function verifyTaskSubmission(req, res, next) {
  try {
    const { taskId, studentId } = req.params;
    const { teacherNote, status } = req.body; // status could be "COMPLETED" or rejected
    
    const submission = await prisma.taskSubmission.upsert({
      where: { taskId_studentId: { taskId, studentId } },
      update: { status: status || "COMPLETED", teacherNote },
      create: { taskId, studentId, status: status || "COMPLETED", teacherNote }
    });

    res.json({ message: "Submission verified", submission });
  } catch (err) {
    next(err);
  }
}

// Teacher edits a task
export async function editTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const { title, description, dueDate } = req.body;
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { title, description, dueDate: dueDate ? new Date(dueDate) : null }
    });
    
    res.json({ message: "Task updated", task });
  } catch (err) {
    next(err);
  }
}
