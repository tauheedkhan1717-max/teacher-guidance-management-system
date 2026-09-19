import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import toast from "react-hot-toast";
import { CheckSquare, Calendar, Edit2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils.js";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const [showModal, setShowModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", groupId: "" });
  const [groups, setGroups] = useState([]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/tasks", taskForm);
      toast.success("Task created successfully!");
      setShowModal(false);
      loadTasks();
    } catch (err) {
      toast.error("Failed to create task");
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      // In a real app we'd fetch all groups first, then fetch tasks for those groups.
      // For simplicity here, we assume an endpoint /api/tasks/my-tasks exists, or we fetch groups.
      // Wait, I created GET /api/tasks/group/:groupId
      // Let's get the groups first.
      let groupIds = [];
      if (isTeacher) {
         const gRes = await api.get("/api/groups");
         setGroups(gRes.data.groups);
         groupIds = gRes.data.groups.map(g => g.id);
      } else {
         const gRes = await api.get("/api/students/me/memberships");
         groupIds = gRes.data.memberships.map(m => m.group.id);
      }

      let allTasks = [];
      for (const id of groupIds) {
        const tRes = await api.get(`/api/tasks/group/${id}`);
        allTasks = [...allTasks, ...tRes.data.tasks];
      }
      setTasks(allTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStudentSubmit = async (taskId) => {
    try {
      await api.post(`/api/tasks/${taskId}/submit`, { studentNote: "Done" });
      toast.success("Task submitted!");
      loadTasks();
    } catch (err) {
      toast.error("Failed to submit task");
    }
  };

  const handleTeacherVerify = async (taskId, studentId) => {
    try {
      await api.post(`/api/tasks/${taskId}/submissions/${studentId}/verify`, { status: "COMPLETED" });
      toast.success("Task verified as completed!");
      loadTasks();
    } catch (err) {
      toast.error("Failed to verify task");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Tasks & Assignments
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {isTeacher ? "Manage and verify tasks for your groups." : "View your assigned tasks and submit them."}
        </p>
      </div>
      {isTeacher && (
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition active:scale-95">
          + Create New Task
        </button>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-12 text-center shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl">
          <CheckSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">No tasks found</h2>
          <p className="text-slate-500 mt-2 text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tasks.map(task => {
            const studentSubmission = task.submissions?.find(s => s.student?.userId === user?.userId);
            const status = studentSubmission?.status || "ASSIGNED";

            return (
              <div key={task.id} className="rounded-2xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{task.title}</h3>
                    {task.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{task.description}</p>}
                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-4">
                      <Calendar className="h-4 w-4" /> Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                    </p>
                  </div>
                  
                  {!isTeacher && (
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full",
                        status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                        status === "SUBMITTED" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {status}
                      </span>
                      {status === "ASSIGNED" && (
                        <button onClick={() => handleStudentSubmit(task.id)} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition active:scale-95">
                          Mark as Done
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Teacher View: Submissions */}
                {isTeacher && task.submissions?.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Student Submissions</h4>
                    <div className="space-y-2">
                      {task.submissions.map((sub, i) => (<div key={sub.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                          <span className="text-sm font-medium dark:text-white">{sub.student?.user?.name || "Student"}</span>
                          <div className="flex items-center gap-3">
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-md", 
                              sub.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {sub.status}
                            </span>
                            {sub.status === "SUBMITTED" && (
                              <button onClick={() => handleTeacherVerify(task.id, sub.studentId)} className="text-emerald-600 hover:text-emerald-700" title="Verify & Mark Completed">
                                <CheckCircle2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
