export type KioskMode = "checkin" | "checkout";

export const KIOSK_MODE_LABELS: Record<
  KioskMode,
  { title: string; subtitle: string; action: string; scanning: string }
> = {
  checkin: {
    title: "الحضور",
    subtitle: "قف أمام الكاميرا لتسجيل حضورك",
    action: "تسجيل حضور",
    scanning: "جاري تسجيل الحضور...",
  },
  checkout: {
    title: "الانصراف",
    subtitle: "قف أمام الكاميرا لتسجيل انصرافك",
    action: "تسجيل انصراف",
    scanning: "جاري تسجيل الانصراف...",
  },
};
