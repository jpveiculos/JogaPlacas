#!/usr/bin/env node

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "Provision the first Joga Placas administrator once.\n" +
      "Required environment: DATABASE_URL, ADMIN_USERNAME, ADMIN_INITIAL_PASSWORD, CONFIRM_ADMIN_PROVISIONING=CREATE_FIRST_ADMIN.\n" +
      "Run after db:deploy. If an administrator already exists, this command exits successfully without changing any account.\n" +
      "The new account must change its initial password at first sign-in. Remove temporary bootstrap variables afterward.\n",
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
  if (initialPassword.length < 6) {
    throw new Error("ADMIN_INITIAL_PASSWORD must contain at least 6 characters.");
  }

  const [{ PrismaPg }, { PrismaClient }, { hashPassword }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("../src/generated/prisma/client.ts"),
    import("../src/lib/auth/password.ts"),
  ]);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize concurrent bootstrap attempts so only one can create the first admin.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(728194603112::bigint)`;
      const existingAdmin = await tx.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, username: true } });
      if (existingAdmin) return { created: false, username: existingAdmin.username };

      const existingUser = await tx.user.findUnique({ where: { username }, select: { id: true } });
      if (existingUser) throw new Error("That username already exists for a non-admin account; bootstrap will not change it.");

      const passwordHash = await hashPassword(initialPassword);
      const created = await tx.user.create({
        data: { username, passwordHash, role: "ADMIN", status: "ACTIVE", mustChangePassword: true },
        select: { id: true, username: true },
      });
      return { created: true, id: created.id, username: created.username };
    });

    if (result.created) {
      process.stdout.write(`Created first administrator: ${result.username} (id ${result.id}). Sign in and change the initial password.\n`);
    } else {
      process.stdout.write(`Administrator already exists (${result.username}); no account or password was changed.\n`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`Administrator provisioning failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
