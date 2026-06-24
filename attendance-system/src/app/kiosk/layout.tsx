import { KioskShell } from "@/components/kiosk/kiosk-nav";
import { KioskWarmup } from "@/components/kiosk/kiosk-warmup";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <KioskWarmup />
      <KioskShell>{children}</KioskShell>
    </>
  );
}
