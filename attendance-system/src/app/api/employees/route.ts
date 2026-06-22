import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { nextEmployeeCode, nextEmergencyCode } from "@/lib/employee-codes";
import { ensureDepartmentExists } from "@/lib/departments";
import {
  employeeListSelect,
  serializeEmployee,
} from "@/lib/employee-serialize";
import { parseCustomEndTime } from "@/lib/employee-shift";
import {
  ensureShiftExists,
  validateEmergencyCode,
  validateEmployeeCode,
} from "@/lib/employee-validation";
import { findEmployeeByFaceDescriptor } from "@/lib/face-match-employee";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const department = searchParams.get("department")?.trim() ?? "";
    const status = searchParams.get("status") ?? "all";

    const where: {
      isActive?: boolean;
      department?: string;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        employeeCode?: { contains: string; mode: "insensitive" };
        phone?: { contains: string };
      }>;
    } = {};

    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;
    if (department && department !== "all") where.department = department;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { employeeCode: "asc" },
      select: employeeListSelect,
    });

    return NextResponse.json({
      employees: employees.map(serializeEmployee),
      total: employees.length,
    });
  } catch (error) {
    console.error("GET /api/employees:", error);
    return NextResponse.json(
      { error: "فشل تحميل قائمة الموظفين" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const name = String(body.name ?? "").trim();
    const department = String(body.department ?? "").trim();
    const position = String(body.position ?? "").trim();
    const phone = String(body.phone ?? "").trim() || null;
    let employeeCode = String(body.employeeCode ?? "").trim().toUpperCase();
    let emergencyCode = String(body.emergencyCode ?? "").trim();
    const shiftId = String(body.shiftId ?? "").trim() || null;
    const isActive = body.isActive !== false;
    let customEndTime: string | null = null;

    try {
      if (body.customEndTime !== undefined) {
        customEndTime = parseCustomEndTime(body.customEndTime);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "وقت الانصراف غير صالح" },
        { status: 400 }
      );
    }

    if (customEndTime && !shiftId) {
      return NextResponse.json(
        { error: "لا يمكن تحديد وقت انصراف مخصص بدون اختيار شفت" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json({ error: "اسم الموظف مطلوب" }, { status: 400 });
    }
    if (!department) {
      return NextResponse.json({ error: "القسم مطلوب" }, { status: 400 });
    }
    if (!position) {
      return NextResponse.json({ error: "المسمى الوظيفي مطلوب" }, { status: 400 });
    }

    if (!employeeCode) {
      employeeCode = await nextEmployeeCode();
    }
    const employeeCodeError = validateEmployeeCode(employeeCode);
    if (employeeCodeError) {
      return NextResponse.json({ error: employeeCodeError }, { status: 400 });
    }

    if (!emergencyCode) {
      emergencyCode = await nextEmergencyCode();
    }
    const emergencyCodeError = validateEmergencyCode(emergencyCode);
    if (emergencyCodeError) {
      return NextResponse.json({ error: emergencyCodeError }, { status: 400 });
    }

    const existingCode = await prisma.employee.findUnique({
      where: { employeeCode },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: `رقم الموظف ${employeeCode} مستخدم مسبقاً` },
        { status: 409 }
      );
    }

    const existingEmergency = await prisma.employee.findFirst({
      where: { emergencyCode },
    });
    if (existingEmergency) {
      return NextResponse.json(
        { error: "الرمز الطارئ مستخدم مسبقاً" },
        { status: 409 }
      );
    }

    if (shiftId && !(await ensureShiftExists(shiftId))) {
      return NextResponse.json(
        { error: "الشفت المحدد غير موجود" },
        { status: 400 }
      );
    }

    await ensureDepartmentExists(department);

    const faceDescriptor = body.faceDescriptor;
    const hasFace =
      faceDescriptor !== undefined && isValidFaceDescriptor(faceDescriptor);

    if (
      faceDescriptor !== undefined &&
      faceDescriptor !== null &&
      !hasFace
    ) {
      return NextResponse.json(
        { error: "بصمة الوجه غير صالحة. أعد التقاطها من الكاميرا" },
        { status: 400 }
      );
    }

    if (hasFace) {
      const duplicate = await findEmployeeByFaceDescriptor(faceDescriptor);
      if (duplicate) {
        return NextResponse.json(
          {
            error: `بصمة الوجه مسجّلة مسبقاً للموظف ${duplicate.name} (${duplicate.employeeCode})`,
          },
          { status: 409 }
        );
      }
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        name,
        department,
        position,
        phone,
        emergencyCode,
        customEndTime,
        isActive,
        faceDescriptor: hasFace ? faceDescriptor : [],
        hasFaceRegistered: hasFace,
        ...(shiftId ? { shift: { connect: { id: shiftId } } } : {}),
      },
      select: employeeListSelect,
    });

    return NextResponse.json(
      {
        message: `تم إضافة ${employee.name} بنجاح`,
        employee: serializeEmployee(employee),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/employees:", error);
    return NextResponse.json(
      { error: "فشل إضافة الموظف" },
      { status: 500 }
    );
  }
}
