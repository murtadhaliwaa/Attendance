import { Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/app-timezone";
import {
  getAttendanceStatus,
  getCheckoutStatus,
  getEffectiveCheckInStatus,
  type ShiftTiming,
} from "@/lib/attendance-utils";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { resolveEmployeeShift } from "@/lib/attendance-shift";
import { createTTLCache } from "@/lib/query-cache";

const shiftBundleCache = createTTLCache<{
  allShifts: ShiftTiming[];
  defaultShift: ShiftTiming | null;
}>(5 * 60 * 1000);

export function invalidateShiftTimingsCache() {
  shiftBundleCache.invalidate();
}

export async function getDefaultShiftTiming(): Promise<ShiftTiming | null> {
  const bundle = await getShiftTimingsBundle();
  return bundle.defaultShift;
}

export async function getAllShiftTimings(): Promise<ShiftTiming[]> {
  const bundle = await getShiftTimingsBundle();
  return bundle.allShifts;
}

async function loadShiftTimingsBundle(): Promise<{
  allShifts: ShiftTiming[];
  defaultShift: ShiftTiming | null;
}> {
  const rows = await prisma.workSchedule.findMany({
    select: {
      ...employeeShiftSelect,
      isDefault: true,
    },
    orderBy: [{ startTime: "asc" }],
  });

  const defaultRow = rows.find((row) => row.isDefault) ?? rows[0] ?? null;

  return {
    allShifts: rows.map((row) => ({
      startTime: row.startTime,
      endTime: row.endTime,
      lateAfter: row.lateAfter,
      earlyLeaveBefore: row.earlyLeaveBefore,
    })),
    defaultShift: defaultRow
      ? {
          startTime: defaultRow.startTime,
          endTime: defaultRow.endTime,
          lateAfter: defaultRow.lateAfter,
          earlyLeaveBefore: defaultRow.earlyLeaveBefore,
        }
      : null,
  };
}

export async function getShiftTimingsBundle(): Promise<{
  allShifts: ShiftTiming[];
  defaultShift: ShiftTiming | null;
}> {
  const cached = shiftBundleCache.get();
  if (cached) return cached;

  const bundle = await loadShiftTimingsBundle();
  shiftBundleCache.set(bundle);
  return bundle;
}

export async function reconcileTodayAttendanceStatuses(
  allShifts: ShiftTiming[],
  defaultShift: ShiftTiming | null
) {
  const today = getTodayDate();

  const records = await prisma.attendance.findMany({
    where: { date: today, checkIn: { not: null } },
    include: {
      employee: {
        select: {
          id: true,
          customEndTime: true,
          shift: { select: employeeShiftSelect },
        },
      },
    },
  });

  for (const record of records) {
    if (!record.checkIn) continue;

    const shift = resolveEmployeeShift(
      record.employee,
      record.checkIn,
      { allShifts, defaultShift }
    );
    if (!shift) continue;

    let nextStatus = getEffectiveCheckInStatus(record.checkIn, shift).status;

    if (record.checkOut) {
      const earlyStatus = getCheckoutStatus(record.checkOut, shift);
      if (earlyStatus === Status.EARLY_LEAVE) {
        nextStatus = Status.EARLY_LEAVE;
      } else if (record.status !== Status.EARLY_LEAVE) {
        nextStatus = getAttendanceStatus(
          record.checkIn,
          shift.startTime,
          shift.lateAfter,
          shift.endTime
        );
      }
    }

    if (nextStatus !== record.status) {
      await prisma.attendance.update({
        where: { id: record.id },
        data: { status: nextStatus },
      });
    }
  }
}
