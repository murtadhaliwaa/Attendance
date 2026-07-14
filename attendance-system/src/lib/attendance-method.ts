import type { Method, VerificationStatus } from "@prisma/client";

/** نص عرض طريقة التسجيل (حضور أو انصراف) */
export function formatAttendanceMethodLabel(
  method: Method | null | undefined,
  verification?: VerificationStatus | null
): string | null {
  if (!method) return null;
  if (method === "MANUAL") {
    return "تسجيل يدوي";
  }
  if (method === "PHOTO") {
    if (verification === "PENDING") return "صورة — بانتظار التأكيد";
    if (verification === "APPROVED") return "صورة — مؤكد";
    if (verification === "REJECTED") return "صورة — مرفوض";
    return "صورة (مراجعة)";
  }
  if (method === "EMERGENCY_CODE") {
    return "سجل قديم";
  }
  return "بصمة الوجه";
}
