import { Method, Status, type Prisma } from "@prisma/client";
import { getTodayDate } from "@/lib/app-timezone";
import {
  formatTimeAr,
  getAttendanceStatus,
  getCheckoutStatus,
} from "@/lib/attendance-utils";
import { resolveEmployeeShiftAsync } from "@/lib/attendance-shift";
import { employeeShiftSelect } from "@/lib/employee-shift";
import { prisma } from "@/lib/prisma";

type EmployeeWithShift = Prisma.EmployeeGetPayload<{
  include: { shift: { select: typeof employeeShiftSelect } };
}>;

export type AdminAttendanceAction =
  | "checkin"
  | "checkout"
  | "clear_checkin"
  | "clear_checkout";

export async function getEmployeeForAttendance(
  employeeId: string
): Promise<EmployeeWithShift | null> {
  return prisma.employee.findUnique({
    where: { id: employeeId, isActive: true },
    include: { shift: { select: employeeShiftSelect } },
  });
}

export async function adminRecordCheckIn(employee: EmployeeWithShift) {
  const today = getTodayDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (existing?.checkIn) {
    throw new AdminAttendanceError(
      "تم تسجيل الحضور مسبقاً لهذا الموظف اليوم",
      409
    );
  }

  const shift = await resolveEmployeeShiftAsync(employee, now);
  const status = shift
    ? getAttendanceStatus(now, shift.startTime, shift.lateAfter, shift.endTime)
    : Status.PRESENT;

  const attendance = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: now,
      status,
      checkInMethod: Method.MANUAL,
    },
    update: {
      checkIn: now,
      status,
      checkInMethod: Method.MANUAL,
    },
  });

  return {
    message: `تم تسجيل حضور ${employee.name} يدوياً`,
    employeeName: employee.name,
    action: "checkin" as const,
    time: formatTimeAr(now),
    status: attendance.status,
  };
}

export async function adminRecordCheckOut(employee: EmployeeWithShift) {
  const today = getTodayDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkIn) {
    throw new AdminAttendanceError("لم يُسجَّل حضور لهذا الموظف اليوم", 400);
  }

  if (existing.checkOut) {
    throw new AdminAttendanceError(
      "تم تسجيل الانصراف مسبقاً لهذا الموظف اليوم",
      409
    );
  }

  let status = existing.status;
  const shift = await resolveEmployeeShiftAsync(employee, existing.checkIn);

  if (shift) {
    const earlyStatus = getCheckoutStatus(now, shift);
    if (earlyStatus === Status.EARLY_LEAVE) {
      status = Status.EARLY_LEAVE;
    }
  }

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      status,
      checkOutMethod: Method.MANUAL,
    },
  });

  return {
    message: `تم تسجيل انصراف ${employee.name} يدوياً`,
    employeeName: employee.name,
    action: "checkout" as const,
    time: formatTimeAr(now),
    status: attendance.status,
  };
}

export async function adminClearCheckIn(employee: EmployeeWithShift) {
  const today = getTodayDate();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkIn) {
    throw new AdminAttendanceError("لا يوجد حضور مسجّل اليوم لهذا الموظف", 400);
  }

  if (existing.checkOut) {
    throw new AdminAttendanceError(
      "لا يمكن مسح الحضور بعد تسجيل الانصراف — امسح الانصراف أولاً",
      400
    );
  }

  await prisma.attendance.delete({ where: { id: existing.id } });

  return {
    message: `تم مسح حضور ${employee.name} لهذا اليوم`,
    employeeName: employee.name,
    action: "clear_checkin" as const,
  };
}

export async function adminClearCheckOut(employee: EmployeeWithShift) {
  const today = getTodayDate();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing?.checkOut) {
    throw new AdminAttendanceError("لا يوجد انصراف مسجّل اليوم لهذا الموظف", 400);
  }

  let status: Status = Status.PRESENT;
  if (existing.checkIn) {
    const shift = await resolveEmployeeShiftAsync(employee, existing.checkIn);
    status = shift
      ? getAttendanceStatus(
          existing.checkIn,
          shift.startTime,
          shift.lateAfter,
          shift.endTime
        )
      : Status.PRESENT;
  }

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: null,
      checkOutMethod: null,
      status,
    },
  });

  return {
    message: `تم مسح انصراف ${employee.name} لهذا اليوم`,
    employeeName: employee.name,
    action: "clear_checkout" as const,
  };
}

export class AdminAttendanceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AdminAttendanceError";
  }
}
