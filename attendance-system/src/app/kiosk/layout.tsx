import { KioskShell } from "@/components/kiosk/kiosk-nav";
import { KioskTabletAutoActivate } from "@/components/kiosk/kiosk-tablet-auto";
import { KioskWarmup } from "@/components/kiosk/kiosk-warmup";
import { RoleProvider } from "@/components/dashboard/role-context";
import { resolveSessionAuth } from "@/lib/session";

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSessionAuth();

  const content = (
    <>
      <KioskWarmup />
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
