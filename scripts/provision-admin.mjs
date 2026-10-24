#!/usr/bin/env node

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "Provision the first Joga Placas administrator.\n" +
      "Required environment: DATABASE_URL, ADMIN_USERNAME, ADMIN_INITIAL_PASSWORD, CONFIRM_ADMIN_PROVISIONING=CREATE_FIRST_ADMIN.\n" +
      "The account is created with mustChangePassword=true. Never put these values in source control.\n",
    );
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const confirmation = process.env.CONFIRM_ADMIN_PROVISIONING;

  if (!databaseUrl || !username || !initialPassword || confirmation !== "CREATE_FIRST_ADMIN") {
    throw new Error("Missing required environment or confirmation. Run with --help for instructions.");
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new Error("ADMIN_USERNAME must be 3-50 characters: letters, numbers, dot, underscore or hyphen.");
  }

  const [{ PrismaPg }, { PrismaClient }, { hashPassword }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("../src/generated/prisma/client.ts"),
    import("../src/lib/auth/password.ts"),
  ]);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const passwordHash = await hashPassword(initialPassword);
    const created = await prisma.$transaction(async (tx) => {
      // Serialize concurrent bootstrap attempts so only one can create the first admin.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(728194603112::bigint)`;
      const existingAdmin = await tx.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
      if (existingAdmin) throw new Error("An administrator already exists; bootstrap refuses to create another.");
      const existingUser = await tx.user.findUnique({ where: { username }, select: { id: true } });
      if (existingUser) throw new Error("That username already exists; bootstrap will not change existing accounts.");
      return tx.user.create({
        data: {
          username,
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          mustChangePassword: true,
        },
        select: { id: true, username: true, role: true },
      });
    });
    process.stdout.write(`Created first administrator: ${created.username} (id ${created.id}). Sign in and change the initial password.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`Administrator provisioning failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
