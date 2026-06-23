import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.AUTH_SETUP_PASSWORD ?? "Admin@123456";
const liveUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://attendance-zeta-flax.vercel.app";

const accounts = [
  { email: "hr@company.com", label: "مدير" },
  { email: "inquiry@company.com", label: "موظف استعلامات" },
];

async function checkLiveSite() {
  const res = await fetch(`${liveUrl}/login`, {
    redirect: "follow",
    headers: { "User-Agent": "attendance-verify/1.0" },
  });
  return { ok: res.ok, status: res.status, url: liveUrl };
}

async function checkLogin(email: string) {
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: !!data.session, userId: data.user?.id };
}

async function disableSignUps() {
  if (!serviceRoleKey) {
    return { ok: false, skipped: true, reason: "SUPABASE_SERVICE_ROLE_KEY غير مُعد" };
  }

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
  if (!projectRef) {
    return { ok: false, reason: "تعذر استخراج project ref" };
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ disable_signup: true }),
    }
  );

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      skipped: true,
      reason: "يتطلب Supabase Personal Access Token وليس service role",
    };
  }

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `${res.status}: ${text.slice(0, 200)}` };
  }

  return { ok: true };
}

async function main() {
  console.log("🔍 التحقق من الإنتاج\n");

  const site = await checkLiveSite();
  console.log(
    site.ok
      ? `✅ الموقع الحي يعمل: ${site.url} (${site.status})`
      : `❌ الموقع الحي: ${site.status}`
  );

  console.log("\n🔐 اختبار تسجيل الدخول (Supabase Auth):\n");
  for (const account of accounts) {
    const result = await checkLogin(account.email);
    if (result.ok) {
      console.log(`✅ ${account.email} (${account.label}) — ناجح`);
    } else {
      console.log(
        `❌ ${account.email} (${account.label}) — ${result.error ?? "فشل"}`
      );
    }
  }

  console.log("\n🛡️  تعطيل التسجيل العام (Sign ups):\n");
  const signup = await disableSignUps();
  if (signup.ok) {
    console.log("✅ تم تعطيل Enable sign ups");
  } else if (signup.skipped) {
    console.log(`⚠️  ${signup.reason}`);
  } else {
    console.log(`❌ ${signup.reason}`);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signupTest = await supabase.auth.signUp({
    email: `blocked-test-${Date.now()}@example.com`,
    password: "TestPass123!",
  });
  if (signupTest.error) {
    const msg = signupTest.error.message.toLowerCase();
    if (
      msg.includes("signup") ||
      msg.includes("sign up") ||
      msg.includes("disabled") ||
      msg.includes("not allowed")
    ) {
      console.log("✅ التسجيل العام معطّل — signUp مرفوض");
    } else {
      console.log(`⚠️  signUp أرجع خطأ: ${signupTest.error.message}`);
    }
  } else {
    console.log("⚠️  التسجيل العام لا يزال مفتوحاً — عطّله في Supabase Dashboard");
  }

  const dashboard = await fetch(`${liveUrl}/dashboard`, { redirect: "manual" });
  const redirectsToLogin =
    dashboard.status === 307 ||
    dashboard.status === 308 ||
    dashboard.headers.get("location")?.includes("/login");
  console.log(
    redirectsToLogin
      ? "\n✅ /dashboard محمي — يوجّه غير المسجّلين إلى تسجيل الدخول"
      : `\n⚠️  /dashboard رمز الحالة: ${dashboard.status}`
  );
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
