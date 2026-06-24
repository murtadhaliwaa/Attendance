import { KioskTabletSetup } from "@/components/kiosk/kiosk-tablet-setup";

export const metadata = {
  title: "إعداد كشك التابلت | نظام الحضور والانصراف",
};

export default function KioskSetupPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center py-6">
      <KioskTabletSetup />
    </div>
  );
}
