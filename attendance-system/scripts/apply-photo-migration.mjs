import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = readFileSync(
  "prisma/migrations/20250710120000_photo_attendance/migration.sql",
  "utf8"
);

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await pool.query(sql);
  console.log("Migration applied successfully via DATABASE_URL");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}
