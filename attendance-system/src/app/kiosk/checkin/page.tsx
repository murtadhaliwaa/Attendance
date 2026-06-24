import { KioskScanner } from "@/components/kiosk/kiosk-scanner";
import { isKioskConfigured } from "@/lib/kiosk-auth";

export const metadata = {
  title: "الحضور | نظام الحضور والانصراف",
};

export default function KioskCheckinPage() {
  if (!isKioskConfigured()) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-text-secondary">
        الحضور والانصراف غير مهيأ. أضف متغير KIOSK_API_KEY في ملف البيئة ثم أعد تشغيل
        السيرفر.
      </div>
    );
  }

  return <KioskScanner mode="checkin" />;
}
