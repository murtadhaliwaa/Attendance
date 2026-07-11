import type { Method } from "@prisma/client";

/** نص عرض طريقة التسجيل (حضور أو انصراف) */
export function formatAttendanceMethodLabel(
  method: Method | null | undefined
): string | null {
  if (!method) return null;
  if (method === "MANUAL") {
    return "تسجيل يدوي";
  }
  if (method === "PHOTO") {
    return "صورة (مراجعة)";
  }
  if (method === "EMERGENCY_CODE") {
    return "سجل قديم";
  }
  return "بصمة الوجه";
}
