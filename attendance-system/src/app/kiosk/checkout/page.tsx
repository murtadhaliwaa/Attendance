import { KioskScanner } from "@/components/kiosk/kiosk-scanner";
import { getKioskApiKey } from "@/lib/kiosk-auth";

export const metadata = {
  title: "كشك الانصراف | نظام الحضور والانصراف",
};

export default function KioskCheckoutPage() {
  const kioskApiKey = getKioskApiKey();

  if (!kioskApiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-text-secondary">
        الكشك غير مهيأ. أضف متغير KIOSK_API_KEY في ملف البيئة ثم أعد تشغيل
        السيرفر.
      </div>
    );
  }

  return <KioskScanner mode="checkout" kioskApiKey={kioskApiKey} />;
}
