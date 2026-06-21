import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, Role } from "@prisma/client";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword =
  process.env.AUTH_SETUP_PASSWORD ?? "Admin@123456";

const PRODUCTION_USERS = [
  {
    email: "hr@company.com",
    name: "سارة القحطاني",
    role: Role.HR_MANAGER,
  },
  {
    email: "ahmed@company.com",
    name: "أحمد العتيبي",
    role: Role.IT_ADMIN,
  },
  {
    email: "mohammed@company.com",
    name: "محمد الشمري",
    role: Role.GENERAL_MANAGER,
  },
] as const;

function getPrisma() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL أو DIRECT_URL غير مُعد");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return { prisma: new PrismaClient({ adapter }), pool };
}

async function confirmEmail(pool: Pool, email: string) {
  const result = await pool.query(
    `UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
     WHERE email = $1
     RETURNING email`,
    [email]
  );
  return (result.rowCount ?? 0) > 0;
}

async function createAuthUser(email: string, name: string) {
  if (serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) {
      if (
        error.message.includes("already been registered") ||
        error.message.includes("already exists")
      ) {
        return "exists" as const;
      }
      if (error.message.includes("rate limit")) {
        return "rate_limited" as const;
      }
      throw new Error(`${email}: ${error.message}`);
    }
    return data.user ? ("created" as const) : ("exists" as const);
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: defaultPassword,
    options: { data: { name } },
  });

  if (error) {
    if (
      error.message.includes("already registered") ||
      error.message.includes("already been registered") ||
      error.message.includes("already exists")
    ) {
      return "exists" as const;
    }
    if (error.message.includes("rate limit")) {
      return "rate_limited" as const;
    }
    throw new Error(`${email}: ${error.message}`);
  }

  return data.user ? ("created" as const) : ("exists" as const);
}

async function main() {
  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL و ANON_KEY مطلوبان");
  }

  const { prisma, pool } = getPrisma();

  console.log("🔐 إعداد Supabase للإنتاج\n");

  for (const user of PRODUCTION_USERS) {
    const authResult = await createAuthUser(user.email, user.name);
    const confirmed = await confirmEmail(pool, user.email);

    await prisma.systemUser.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
      },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
    });

    const authLabel =
      authResult === "created"
        ? "✅ Auth: أُنشئ"
        : authResult === "rate_limited"
          ? "⏳ Auth: انتظر ثم أعد المحاولة"
          : "⚠️  Auth: موجود";
    const confirmLabel = confirmed ? "✅ Email: مُفعَّل" : "⚠️  Email: تحقق يدوياً";
    console.log(`${authLabel} | ${confirmLabel} | ${user.email}`);
  }

  await prisma.systemUser.updateMany({
    where: { email: { endsWith: "@example.com" } },
    data: { isActive: false },
  });

  await prisma.$disconnect();
  await pool.end();

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? "your-project";

  console.log("\n📋 يدوياً في Supabase Dashboard (خطوتان فقط):");
  console.log(`   1) Authentication → Providers → Email → عطّل "Enable sign ups"`);
  console.log(`   2) Authentication → URL Configuration:`);
  console.log(`      Site URL: https://your-domain.vercel.app`);
  console.log(`      Redirect URLs:`);
  console.log(`        http://localhost:3000/**`);
  console.log(`        https://your-domain.vercel.app/**`);
  console.log(`        https://${projectRef}.supabase.co/**`);
  console.log("\n🔑 بيانات الدخول الافتراضية (غيّرها فوراً في الإنتاج):");
  console.log(`   كلمة المرور: ${defaultPassword}`);
  PRODUCTION_USERS.forEach((u) => console.log(`   - ${u.email}`));
  console.log("\n✅ SystemUser + Auth جاهزان في قاعدة البيانات");
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
