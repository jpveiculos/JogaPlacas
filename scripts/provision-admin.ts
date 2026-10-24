import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
if (!username || username.length > 100) {
  throw new Error("ADMIN_USERNAME is required and must be at most 100 characters");
}
if (!password) {
  throw new Error("ADMIN_PASSWORD is required");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  // Create-only by design: this command never changes an existing account or role.
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    throw new Error("A user with ADMIN_USERNAME already exists; no changes were made");
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        mustChangePassword: true,
      },
      select: { id: true, username: true },
    });
    await tx.auditEvent.create({
      data: {
        actorId: null,
        action: "admin.account.provisioned",
        entityType: "User",
        entityId: user.id,
        metadata: { username: user.username, source: "provision-admin-script" },
      },
    });
  });

  console.info("Administrator account created. Sign in and change the initial password.");
} finally {
  await prisma.$disconnect();
}
