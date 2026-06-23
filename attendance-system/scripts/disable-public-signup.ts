import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function disablePublicSignUp() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("SKIP: missing SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ disable_signup: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log(`FAIL settings: ${res.status} ${text.slice(0, 180)}`);
    return false;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const test = await admin.auth.signUp({
    email: `blocked-test-${Date.now()}@company.com`,
    password: "TestPass123!",
  });

  if (test.error) {
    const msg = test.error.message.toLowerCase();
    if (
      msg.includes("signup") ||
      msg.includes("sign up") ||
      msg.includes("disabled") ||
      msg.includes("not allowed")
    ) {
      console.log("OK: public signup disabled");
      return true;
    }
    console.log(`WARN signup test: ${test.error.message}`);
    return true;
  }

  console.log("WARN: signup may still be open");
  return false;
}

disablePublicSignUp().then((ok) => process.exit(ok ? 0 : 1));
