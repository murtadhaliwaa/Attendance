import { KioskShell } from "@/components/kiosk/kiosk-nav";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KioskShell>{children}</KioskShell>;
}
