import { config } from "dotenv";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");

config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "KIOSK_API_KEY",
] as const;

const RECOMMENDED = ["DIRECT_URL"] as const;

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return (
    value.includes("your-project") ||
    value.includes("your-anon") ||
    value.includes("change-me")
  );
}

function main() {
  const missing: string[] = [];
  const placeholders: string[] = [];

  for (const key of REQUIRED) {
    const value = process.env[key];
    if (!value?.trim()) missing.push(key);
    else if (isPlaceholder(value)) placeholders.push(key);
  }

  const warnings: string[] = [];
  for (const key of RECOMMENDED) {
    if (!process.env[key]?.trim()) warnings.push(key);
  }

  if (missing.length > 0) {
    console.error("❌ متغيرات مطلوبة ناقصة:");
    missing.forEach((k) => console.error(`   - ${k}`));
    process.exit(1);
  }

  if (placeholders.length > 0) {
    console.error("❌ متغيرات لا تزال بقيم افتراضية:");
    placeholders.forEach((k) => console.error(`   - ${k}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("⚠️  متغيرات مُوصى بها ناقصة:");
    warnings.forEach((k) => console.warn(`   - ${k}`));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (url.includes("[project-ref]")) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL غير مُعدّ");
    process.exit(1);
  }

  const db = process.env.DATABASE_URL!;
  if (!db.includes("pgbouncer=true") && db.includes(":6543")) {
    console.warn("⚠️  DATABASE_URL: يُفضّل إضافة ?pgbouncer=true مع منفذ 6543");
  }

  console.log("✅ جميع متغيرات البيئة المطلوبة جاهزة");
  console.log(`   Supabase: ${url}`);
  console.log(`   Database: ${db.includes("supabase.com") ? "Supabase ✓" : "custom"}`);
  console.log(`   Kiosk key: ${process.env.KIOSK_API_KEY!.slice(0, 8)}…`);
}

main();
