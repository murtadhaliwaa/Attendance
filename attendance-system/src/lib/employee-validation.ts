import { prisma } from "@/lib/prisma";

export const EMP_CODE_PATTERN = /^EMP\d{3,}$/;
export const EMERGENCY_CODE_PATTERN = /^\d{6}$/;

export function validateEmployeeCode(code: string): string | null {
  if (!EMP_CODE_PATTERN.test(code)) {
    return "رقم الموظف يجب أن يكون بصيغة EMP001";
  }
  return null;
}

export function validateEmergencyCode(code: string): string | null {
  if (!EMERGENCY_CODE_PATTERN.test(code)) {
    return "الرمز الطارئ يجب أن يتكون من 6 أرقام";
  }
  return null;
}

export async function ensureShiftExists(shiftId: string): Promise<boolean> {
  const shift = await prisma.workSchedule.findUnique({
    where: { id: shiftId },
    select: { id: true },
  });
  return Boolean(shift);
}
