import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo fixtures...");

  const teacherPassword = await bcrypt.hash("Teacher@1234", 10);
  const studentPassword = await bcrypt.hash("Stud@12345", 10);

  // 1. Create Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: "gatet1@tgms.test" },
    update: {},
    create: {
      email: "gatet1@tgms.test",
      passwordHash: teacherPassword,
      name: "Gate Test Teacher",
      role: "TEACHER",
      teacherProfile: {
        create: {
          employeeId: "EMP-GATE-01",
          department: "Computer Engineering",
        },
      },
    },
  });
  console.log("Created teacher:", teacherUser.email);

  // 2. Create Students
  const student1 = await prisma.user.upsert({
    where: { email: "gates1@tgms.test" },
    update: {},
    create: {
      email: "gates1@tgms.test",
      passwordHash: studentPassword,
      name: "Gate Student One",
      role: "STUDENT",
      studentProfile: {
        create: {
          rollNumber: "GT-100",
          yearOfAdmission: 2024,
        },
      },
    },
  });
  console.log("Created student:", student1.email);

  const student2 = await prisma.user.upsert({
    where: { email: "gateout@tgms.test" },
    update: {},
    create: {
      email: "gateout@tgms.test",
      passwordHash: studentPassword,
      name: "Gate Student Two",
      role: "STUDENT",
      studentProfile: {
        create: {
          rollNumber: "GT-200",
          yearOfAdmission: 2024,
        },
      },
    },
  });
  console.log("Created student:", student2.email);

  // 3. Create Group & Memberships
  const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: teacherUser.id } });
  const s1Profile = await prisma.studentProfile.findUnique({ where: { userId: student1.id } });

  let group = await prisma.group.findFirst({ where: { name: "Gate Test Batch", teacherId: teacherProfile.id } });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "Gate Test Batch",
        teacherId: teacherProfile.id,
      },
    });
    console.log("Created group:", group.name);
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: group.id, studentId: s1Profile.id },
  });
  if (!membership) {
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        studentId: s1Profile.id,
      },
    });
    console.log("Added student 1 to group");
  }

  // 4. Create Notice
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) {
    const notice = await prisma.notice.findFirst({ where: { title: "Welcome to the TGMS notice board" } });
    if (!notice) {
      await prisma.notice.create({
        data: {
          title: "Welcome to the TGMS notice board",
          content: "This is a demo notice created by the fixtures script.",
          authorId: admin.id,
        },
      });
      console.log("Created notice");
    }
  }

  console.log("Fixtures loaded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
