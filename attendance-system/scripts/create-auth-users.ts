import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const defaultPassword =
  process.env.AUTH_SETUP_PASSWORD ?? "Admin@123456";

const users = [
  { email: "hr@company.com", name: "سارة القحطاني" },
  { email: "ahmed@company.com", name: "أحمد العتيبي" },
  { email: "mohammed@company.com", name: "محمد الشمري" },
];

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🔐 إنشاء حسابات Supabase Auth...\n");

  for (const user of users) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: defaultPassword,
      options: { data: { name: user.name } },
    });

    if (error) {
      if (
        error.message.includes("already registered") ||
        error.message.includes("already been registered")
      ) {
        console.log(`⚠️  ${user.email} — موجود مسبقاً`);
      } else {
        console.log(`❌ ${user.email} — ${error.message}`);
      }
      continue;
    }

    if (data.user) {
      console.log(`✅ ${user.email} — تم الإنشاء`);
    }
  }

  console.log(`\n📋 بيانات الدخول:`);
  console.log(`   كلمة المرور: ${defaultPassword}`);
  users.forEach((u) => console.log(`   - ${u.email}`));
  console.log("\n💡 للإعداد الكامل: npm run auth:setup-production");
}

main().catch(console.error);
