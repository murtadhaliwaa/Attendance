import type { Prisma } from "@prisma/client";
import { isValidTimeValue } from "@/lib/schedule-utils";

export const employeeShiftSelect = {
  startTime: true,
  endTime: true,
  lateAfter: true,
  earlyLeaveBefore: true,
} as const;

export type EmployeeWriteFields = {
  name?: string;
  department?: string;
  position?: string;
  phone?: string | null;
  employeeCode?: string;
  emergencyCode?: string;
  customEndTime?: string | null;
  isActive?: boolean;
  faceDescriptor?: number[];
  hasFaceRegistered?: boolean;
  shiftId?: string | null;
};

export function toEmployeeUncheckedUpdateInput(
  data: EmployeeWriteFields
): Prisma.EmployeeUncheckedUpdateInput {
  const { shiftId, ...rest } = data;

  return {
    ...rest,
    ...(shiftId !== undefined ? { shiftId } : {}),
  };
}

export function parseCustomEndTime(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (!isValidTimeValue(trimmed)) {
    throw new Error("وقت الانصراف المخصص غير صالح. استخدم HH:MM مثل 16:00");
  }

  return trimmed;
}
