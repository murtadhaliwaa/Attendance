import { cookies } from "next/headers";
import { KioskShell } from "@/components/kiosk/kiosk-nav";
import { KioskTabletAutoActivate } from "@/components/kiosk/kiosk-tablet-auto";
import { RoleProvider } from "@/components/dashboard/role-context";
import { resolveSessionAuth } from "@/lib/session";

/** تابلت الضيف غالباً بلا جلسة — تجنّب استدعاء Supabase Auth في كل فتحة كشك */
function hasLikelySupabaseSessionCookie() {
  return cookies()
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("auth-token") ||
        (cookie.name.startsWith("sb-") && cookie.value.length > 0)
    );
}

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = hasLikelySupabaseSessionCookie()
    ? await resolveSessionAuth()
    : null;

  const content = (
    <>
      <KioskTabletAutoActivate />
      <KioskShell loggedIn={!!session}>{children}</KioskShell>
    </>
  );

  if (!session) {
    return content;
  }

  return (
    <RoleProvider role={session.systemUser.role}>{content}</RoleProvider>
  );
}
