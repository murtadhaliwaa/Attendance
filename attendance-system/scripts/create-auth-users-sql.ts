import { config } from "dotenv";
import { Pool } from "pg";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const defaultPassword =
  process.env.AUTH_SETUP_PASSWORD ?? "Admin@123456";

const USERS = [
  { email: "inquiry@company.com", name: "فهد العنزي" },
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });

  const instance = await pool.query<{ instance_id: string }>(
    `SELECT instance_id FROM auth.users LIMIT 1`
  );
  const instanceId =
    instance.rows[0]?.instance_id ??
    "00000000-0000-0000-0000-000000000000";

  console.log("👤 إنشاء مستخدمي Auth عبر قاعدة البيانات...\n");

  for (const user of USERS) {
    const exists = await pool.query(
      `SELECT email FROM auth.users WHERE email = $1`,
      [user.email]
    );

    if ((exists.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE auth.users
         SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
         WHERE email = $1`,
        [user.email]
      );
      console.log(`⚠️  ${user.email} — موجود (تم التفعيل)`);
      continue;
    }

    await pool.query(
      `INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) VALUES (
        $1,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        $2,
        crypt($3, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        $4::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )`,
      [
        instanceId,
        user.email,
        defaultPassword,
        JSON.stringify({ name: user.name }),
      ]
    );

    console.log(`✅ ${user.email} — تم الإنشاء`);
  }

  await pool.end();
  console.log("\n✅ اكتمل");
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
