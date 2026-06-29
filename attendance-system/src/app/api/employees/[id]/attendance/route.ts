import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import {
  AdminAttendanceError,
  adminClearCheckIn,
  adminClearCheckOut,
  adminRecordCheckIn,
  adminRecordCheckOut,
  getEmployeeForAttendance,
  type AdminAttendanceAction,
} from "@/lib/admin-attendance";
import { formatTimeAr } from "@/lib/attendance-utils";
import { getTodayDate } from "@/lib/app-timezone";
import { prisma } from "@/lib/prisma";

const ACTIONS: AdminAttendanceAction[] = [
  "checkin",
  "checkout",
  "clear_checkin",
  "clear_checkout",
];

function isAdminAttendanceAction(value: string): value is AdminAttendanceAction {
  return ACTIONS.includes(value as AdminAttendanceAction);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("employees:update");
  if (auth.error) return auth.error;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id, isActive: true },
    select: { id: true, name: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  const today = getTodayDate();
  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: params.id, date: today } },
  });

  return NextResponse.json({
    employeeName: employee.name,
    hasCheckIn: !!attendance?.checkIn,
    hasCheckOut: !!attendance?.checkOut,
    checkInTime: attendance?.checkIn ? formatTimeAr(attendance.checkIn) : null,
    checkOutTime: attendance?.checkOut ? formatTimeAr(attendance.checkOut) : null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("employees:update");
  if (auth.error) return auth.error;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  if (!isAdminAttendanceAction(action)) {
    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
  }

  try {
    const employee = await getEmployeeForAttendance(params.id);
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    }

    const result =
      action === "checkin"
        ? await adminRecordCheckIn(employee)
        : action === "checkout"
          ? await adminRecordCheckOut(employee)
          : action === "clear_checkin"
            ? await adminClearCheckIn(employee)
            : await adminClearCheckOut(employee);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`POST /api/employees/${params.id}/attendance:`, error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تنفيذ العملية" },
      { status: 500 }
    );
  }
}
