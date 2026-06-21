import { config } from "dotenv";
import { Pool } from "pg";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const emails = [
  "hr@company.com",
  "ahmed@company.com",
  "mohammed@company.com",
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });

  console.log("✉️  تفعيل حسابات البريد...\n");

  for (const email of emails) {
    const result = await pool.query(
      `UPDATE auth.users
       SET email_confirmed_at = NOW()
       WHERE email = $1
       RETURNING email`,
      [email]
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ ${email} — تم التفعيل`);
    } else {
      console.log(`⚠️  ${email} — غير موجود`);
    }
  }

  await pool.end();
}

main().catch(console.error);
