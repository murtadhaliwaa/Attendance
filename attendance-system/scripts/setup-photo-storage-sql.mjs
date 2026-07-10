import { config } from "dotenv";
import path from "path";
import { Pool } from "pg";

const projectRoot = path.resolve(import.meta.dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

const BUCKET = "attendance-photos";

try {
  const existing = await pool.query(
    `SELECT id FROM storage.buckets WHERE id = $1`,
    [BUCKET]
  );

  if (existing.rowCount > 0) {
    console.log(`OK: bucket "${BUCKET}" already exists`);
    process.exit(0);
  }

  await pool.query(
    `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
     VALUES ($1, $1, false, $2, $3::text[])`,
    [BUCKET, 5 * 1024 * 1024, ["image/jpeg", "image/png", "image/webp"]]
  );

  console.log(`OK: bucket "${BUCKET}" created via SQL`);
} catch (error) {
  console.error(
    "Failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
} finally {
  await pool.end();
}
