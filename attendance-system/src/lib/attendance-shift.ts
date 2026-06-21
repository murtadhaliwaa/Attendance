import {
  buildEmployeeShiftTiming,
  resolveShiftForAttendance,
  type ShiftTiming,
} from "@/lib/attendance-utils";
import { getShiftTimingsBundle } from "@/lib/attendance-reconcile";

type EmployeeShiftSource = {
  customEndTime: string | null;
  shift: {
    startTime: string;
    endTime: string;
    lateAfter: number;
    earlyLeaveBefore?: number | null;
  } | null;
};

export type ShiftTimingsContext = {
  allShifts: ShiftTiming[];
  defaultShift: ShiftTiming | null;
};

export function resolveEmployeeShift(
  employee: EmployeeShiftSource,
  checkInTime: Date | null | undefined,
  context: ShiftTimingsContext
): ShiftTiming | null {
  return resolveShiftForAttendance(
    buildEmployeeShiftTiming(employee.shift, employee.customEndTime),
    checkInTime,
    context.allShifts,
    context.defaultShift
  );
}

export async function resolveEmployeeShiftAsync(
  employee: EmployeeShiftSource,
  checkInTime: Date | null | undefined
): Promise<ShiftTiming | null> {
  const assigned = buildEmployeeShiftTiming(
    employee.shift,
    employee.customEndTime
  );
  if (assigned) return assigned;

  const context = await getShiftTimingsBundle();
  return resolveEmployeeShift(employee, checkInTime, context);
}
