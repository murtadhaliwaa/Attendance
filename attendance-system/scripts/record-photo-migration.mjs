import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const migrationName = "20250710120000_photo_attendance";
const migrationPath = `prisma/migrations/${migrationName}/migration.sql`;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = readFileSync(migrationPath, "utf8");
const checksum = createHash("sha256").update(sql).digest("hex");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  const existing = await pool.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    [migrationName]
  );

  if (existing.rowCount > 0) {
    console.log("Migration already recorded in _prisma_migrations");
    process.exit(0);
  }

  await pool.query(
    `INSERT INTO "_prisma_migrations" (
      id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      gen_random_uuid()::text, $1, NOW(), $2, NULL, NULL, NOW(), 1
    )`,
    [checksum, migrationName]
  );

  console.log("Recorded migration in _prisma_migrations");
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}
