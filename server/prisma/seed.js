import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@Root123", 10);

  // 1. Create the System Administrator
  const admin = await prisma.user.upsert({
    where: { email: "admin@tgms.edu" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@tgms.edu",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  // 2. Create a demo TeacherInvite code
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days
  const invite = await prisma.teacherInvite.upsert({
    where: { code: "POLY-ADMIN-CREATES-INVITE" },
    update: {},
    create: {
      code: "POLY-ADMIN-CREATES-INVITE",
      department: "Computer Engineering",
      createdById: admin.id,
      expiresAt: expiresAt,
    },
  });

  console.log("✅ Seed successful: Admin user and Teacher Invite populated.");
  console.log(`-> Admin Login: admin@tgms.edu`);
  console.log(`-> Admin Password: Admin@Root123`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });