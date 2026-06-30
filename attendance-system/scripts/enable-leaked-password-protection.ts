import { config } from "dotenv";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

function getProjectRef(url: string): string | null {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

async function enableLeakedPasswordProtection(): Promise<boolean> {
  const projectRef = getProjectRef(supabaseUrl);
  if (!projectRef) {
    console.log("SKIP: NEXT_PUBLIC_SUPABASE_URL غير صالح");
    return false;
  }

  if (!accessToken) {
    console.log(
      "SKIP: أضف SUPABASE_ACCESS_TOKEN إلى .env.local (من supabase.com/dashboard/account/tokens)"
    );
    console.log(
      "ثم من لوحة Supabase: Authentication → Providers → Email → فعّل «Prevent use of leaked passwords»"
    );
    console.log(
      "ملاحظة: هذه الميزة متاحة على خطة Pro فما فوق — مشروعك على Free قد لا يدعمها."
    );
    return false;
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password_hibp_enabled: true }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.log(`FAIL: ${res.status} ${text.slice(0, 300)}`);
    if (res.status === 403 || text.includes("entitlement")) {
      console.log(
        "قد تحتاج ترقية الخطة إلى Pro لتفعيل حماية كلمات المرور المسربة."
      );
    }
    return false;
  }

  console.log("OK: تم تفعيل حماية كلمات المرور المسربة (HaveIBeenPwned)");
  return true;
}

enableLeakedPasswordProtection().then((ok) => process.exit(ok ? 0 : 1));
