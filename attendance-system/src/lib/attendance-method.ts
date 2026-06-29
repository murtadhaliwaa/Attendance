import type { Method } from "@prisma/client";

export type AttendanceMethodInfo = {
  method: Method | null;
  supervisorName: string | null;
};

/** نص عرض طريقة التسجيل (حضور أو انصراف) */
export function formatAttendanceMethodLabel(
  info: AttendanceMethodInfo
): string | null {
  if (!info.method) return null;
  if (info.method === "EMERGENCY_CODE") {
    return info.supervisorName
      ? `رمز طارئ · ${info.supervisorName}`
      : "رمز طارئ";
  }
  if (info.method === "MANUAL") {
    return "تسجيل يدوي";
  }
  return "بصمة الوجه";
}

export function isEmergencyMethod(method: Method | null | undefined): boolean {
  return method === "EMERGENCY_CODE";
}
