import { KioskShell } from "@/components/kiosk/kiosk-nav";
import { KioskTabletAutoActivate } from "@/components/kiosk/kiosk-tablet-auto";
import { KioskWarmup } from "@/components/kiosk/kiosk-warmup";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <KioskWarmup />
      <KioskTabletAutoActivate />
      <KioskShell>{children}</KioskShell>
    </>
  );
}
