import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;
const baseUrl = process.env.DATABASE_URL;

if (!baseUrl) {
  throw new Error("DATABASE_URL is required; use a disposable PostgreSQL instance.");
}

const initMigrationPath = "prisma/migrations/20261023000000_init/migration.sql";
const initMigration = await readFile(initMigrationPath, "utf8");
const migrationName = "20261023000000_init";
const suffix = `${Date.now()}_${process.pid}`;
const validDbName = `jogaplacas_mig_valid_${suffix}`;
const invalidDbName = `jogaplacas_mig_invalid_${suffix}`;

function databaseUrl(name) {
  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

function runPrisma(args, url, expectedSuccess = true) {
  const result = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: url },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (expectedSuccess && result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} failed:\n${output}`);
  }
  if (!expectedSuccess && result.status === 0) {
    throw new Error(`prisma ${args.join(" ")} unexpectedly succeeded:\n${output}`);
  }
  return output;
}

async function connect(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function seedLegacyRows(url, includeInvalid) {
  const client = await connect(url);
  try {
    await client.query(initMigration);
    await client.query(
      `INSERT INTO "Round" ("id", "code", "startsAt", "cutoffAt", "resultAt", "status", "resultPlate", "updatedAt")
       VALUES ('round-legacy', 'ROUND-LEGACY', now(), now(), now(), 'COMPLETED', 'ABC1K23', now())`,
    );
    await client.query(
      `INSERT INTO "Purchase" ("id", "paymentMethod", "totalCents", "receiptCode", "idempotencyKey", "updatedAt")
       VALUES ('purchase-legacy', 'PIX', 300, 'RECEIPT-LEGACY', 'IDEMPOTENCY-LEGACY', now())`,
    );
    await client.query(
      `INSERT INTO "PurchaseParticipation" ("id", "purchaseId", "roundId", "totalCents")
       VALUES ('participation-legacy', 'purchase-legacy', 'round-legacy', 300)`,
    );

    const plates = [
      { id: "line-legacy", display: "ABC-1234", normalized: "ABC1234" },
      { id: "line-mercosur", display: "ABC1K23", normalized: "ABC1K23" },
    ];
    if (includeInvalid) {
      plates.push({ id: "line-invalid", display: "NOT-A-PLATE", normalized: "NOTAPLATE" });
    }

    for (const plate of plates) {
      await client.query(
        `INSERT INTO "ParticipationLine"
          ("id", "participationId", "plateDisplay", "normalizedPlate", "unitCents", "tensCents",
           "hundredsCents", "thousandsCents", "lettersCents", "fullPlateCents", "ruleVersion",
           "ruleSnapshot")
         VALUES ($1, 'participation-legacy', $2, $3, 100, 100, 100, 0, 0, 0, 'test-v1', '{}'::jsonb)`,
        [plate.id, plate.display, plate.normalized],
      );
    }
  } finally {
    await client.end();
  }

  runPrisma(["migrate", "resolve", "--applied", migrationName], url);
}

async function assertValidBackfill(url) {
  const client = await connect(url);
  try {
    const round = await client.query(
      `SELECT "resultPlate" AS legacy_old_column FROM "Round" LIMIT 0`,
    ).catch(() => null);
    assert.equal(round, null, "the old resultPlate column should no longer exist");

    const results = await client.query(
      `SELECT "resultLegacyPlate", "resultMercosurPlate" FROM "Round" WHERE "id" = 'round-legacy'`,
    );
    assert.equal(results.rows[0].resultLegacyPlate, null);
    assert.equal(results.rows[0].resultMercosurPlate, "ABC1K23");

    const formats = await client.query(
      `SELECT "id", "plateFormat"::text AS format FROM "ParticipationLine" ORDER BY "id"`,
    );
    assert.deepEqual(
      Object.fromEntries(formats.rows.map((row) => [row.id, row.format])),
      { "line-legacy": "LEGACY", "line-mercosur": "MERCOSUR" },
    );
  } finally {
    await client.end();
  }
}

async function main() {
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.searchParams.delete("schema");
  const admin = await connect(adminUrl.toString());
  const created = [];

  try {
    for (const name of [validDbName, invalidDbName]) {
      await admin.query(`CREATE DATABASE "${name}"`);
      created.push(name);
    }

    const validUrl = databaseUrl(validDbName);
    await seedLegacyRows(validUrl, false);
    runPrisma(["migrate", "deploy"], validUrl);
    await assertValidBackfill(validUrl);

    const invalidUrl = databaseUrl(invalidDbName);
    await seedLegacyRows(invalidUrl, true);
    const failure = runPrisma(["migrate", "deploy"], invalidUrl, false);
    assert.match(
      failure,
      /Cannot safely classify all existing ParticipationLine rows/,
      "invalid historical data must stop the dual-plate migration with the expected safety error",
    );

    console.log("Historical dual-plate migration test passed: valid rows were classified and invalid rows blocked migration.");
  } finally {
    await admin.end();
    const cleanup = await connect(adminUrl.toString());
    try {
      for (const name of created.reverse()) {
        await cleanup.query(
          "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
          [name],
        );
        await cleanup.query(`DROP DATABASE IF EXISTS "${name}"`);
      }
    } finally {
      await cleanup.end();
    }
  }
}

await main();
