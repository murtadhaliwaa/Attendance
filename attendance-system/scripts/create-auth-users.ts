import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { resolveAuthSetupPassword } from "./auth-setup-password";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const defaultPassword = resolveAuthSetupPassword({ allowWeakDefault: true });

const users = [
  { email: "hr@company.com", name: "سارة القحطاني" },
  { email: "inquiry@company.com", name: "فهد العنزي" },
];

async function main() {
  if (defaultPassword === "Admin@123456") {
    console.warn(
      "⚠️  تستخدم كلمة المرور الافتراضية الضعيفة — للتطوير المحلي فقط. للإنتاج عيّن AUTH_SETUP_PASSWORD.\n"
    );
  }

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
    } else if (data.user) {
      console.log(`✅ ${user.email}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
