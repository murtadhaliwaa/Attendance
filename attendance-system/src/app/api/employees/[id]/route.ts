import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { ensureDepartmentExists } from "@/lib/departments";
import { resolveEmployeeDepartment } from "@/lib/department-resolve";
import {
  employeeListSelect,
  serializeEmployee,
} from "@/lib/employee-serialize";
import { parseCustomEndTime, toEmployeeUncheckedUpdateInput } from "@/lib/employee-shift";
import {
  ensureShiftExists,
  validateEmergencyCode,
  validateEmployeeCode,
} from "@/lib/employee-validation";
import { findEmployeeByFaceDescriptor } from "@/lib/face-match-employee";
import { CURRENT_FACE_DESCRIPTOR_VERSION } from "@/lib/face-descriptor-version";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("employees:read");
  if (auth.error) return auth.error;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: employeeListSelect,
    });

    if (!employee) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee: serializeEmployee(employee) });
  } catch (error) {
    console.error("GET /api/employees/[id]:", error);
    return NextResponse.json(
      { error: "فشل تحميل بيانات الموظف" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("employees:update");
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const data: {
      name?: string;
      department?: string;
      departmentId?: string | null;
      position?: string;
      phone?: string | null;
      employeeCode?: string;
      emergencyCode?: string;
      shiftId?: string | null;
      customEndTime?: string | null;
      isActive?: boolean;
      faceDescriptor?: number[];
      hasFaceRegistered?: boolean;
      faceDescriptorVersion?: number;
    } = {};

    if (body.clearFace === true) {
      data.faceDescriptor = [];
      data.hasFaceRegistered = false;
      data.faceDescriptorVersion = CURRENT_FACE_DESCRIPTOR_VERSION;
    }

    if (body.faceDescriptor !== undefined) {
      if (!isValidFaceDescriptor(body.faceDescriptor)) {
        return NextResponse.json(
          { error: "بصمة الوجه غير صالحة. أعد التقاطها من الكاميرا" },
          { status: 400 }
        );
      }

      const duplicate = await findEmployeeByFaceDescriptor(
        body.faceDescriptor,
        params.id,
        "duplicate"
      );
      if (duplicate) {
        return NextResponse.json(
          {
            error: `بصمة الوجه مسجّلة مسبقاً للموظف ${duplicate.name} (${duplicate.employeeCode})`,
          },
          { status: 409 }
        );
      }

      data.faceDescriptor = body.faceDescriptor;
      data.hasFaceRegistered = true;
      data.faceDescriptorVersion = CURRENT_FACE_DESCRIPTOR_VERSION;
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "اسم الموظف مطلوب" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.department !== undefined || body.departmentId !== undefined) {
      const resolved = await resolveEmployeeDepartment({
        departmentId:
          body.departmentId !== undefined
            ? String(body.departmentId).trim() || null
            : undefined,
        departmentName:
          body.department !== undefined
            ? String(body.department).trim()
            : undefined,
      });
      data.department = resolved.department;
      data.departmentId = resolved.departmentId;
    }

    if (body.position !== undefined) {
      const position = String(body.position).trim();
      if (!position) {
        return NextResponse.json(
          { error: "المسمى الوظيفي مطلوب" },
          { status: 400 }
        );
      }
      data.position = position;
    }

    if (body.phone !== undefined) {
      data.phone = String(body.phone).trim() || null;
    }

    if (body.employeeCode !== undefined) {
      const employeeCode = String(body.employeeCode).trim().toUpperCase();
      const employeeCodeError = validateEmployeeCode(employeeCode);
      if (employeeCodeError) {
        return NextResponse.json({ error: employeeCodeError }, { status: 400 });
      }
      const duplicate = await prisma.employee.findFirst({
        where: { employeeCode, NOT: { id: params.id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `رقم الموظف ${employeeCode} مستخدم مسبقاً` },
          { status: 409 }
        );
      }
      data.employeeCode = employeeCode;
    }

    if (body.emergencyCode !== undefined) {
      const emergencyCode = String(body.emergencyCode).trim();
      const emergencyCodeError = validateEmergencyCode(emergencyCode);
      if (emergencyCodeError) {
        return NextResponse.json({ error: emergencyCodeError }, { status: 400 });
      }
      const duplicate = await prisma.employee.findFirst({
        where: { emergencyCode, NOT: { id: params.id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "الرمز الطارئ مستخدم مسبقاً" },
          { status: 409 }
        );
      }
      data.emergencyCode = emergencyCode;
    }

    if (body.shiftId !== undefined) {
      const shiftId = String(body.shiftId).trim() || null;
      if (shiftId && !(await ensureShiftExists(shiftId))) {
        return NextResponse.json(
          { error: "الشفت المحدد غير موجود" },
          { status: 400 }
        );
      }
      data.shiftId = shiftId;
      if (!shiftId) {
        data.customEndTime = null;
      }
    }

    if (body.customEndTime !== undefined) {
      try {
        data.customEndTime = parseCustomEndTime(body.customEndTime);
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "وقت الانصراف غير صالح",
          },
          { status: 400 }
        );
      }
    }

    if (data.customEndTime && !(data.shiftId ?? existing.shiftId)) {
      return NextResponse.json(
        { error: "لا يمكن تحديد وقت انصراف مخصص بدون اختيار شفت" },
        { status: 400 }
      );
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "لا توجد بيانات للتحديث" },
        { status: 400 }
      );
    }

    if (data.department) {
      await ensureDepartmentExists(data.department);
    }
    if (data.departmentId === null && data.department) {
      const resolved = await resolveEmployeeDepartment({
        departmentName: data.department,
      });
      data.departmentId = resolved.departmentId;
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: toEmployeeUncheckedUpdateInput(data),
      select: employeeListSelect,
    });

    return NextResponse.json({
      message: `تم تحديث بيانات ${employee.name}`,
      employee: serializeEmployee(employee),
    });
  } catch (error) {
    console.error("PUT /api/employees/[id]:", error);
    return NextResponse.json(
      { error: "فشل تحديث بيانات الموظف" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("employees:delete");
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.alert.deleteMany({ where: { employeeId: params.id } }),
      prisma.attendance.deleteMany({ where: { employeeId: params.id } }),
      prisma.employee.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({
      message: `تم حذف ${existing.name} نهائياً`,
    });
  } catch (error) {
    console.error("DELETE /api/employees/[id]:", error);
    return NextResponse.json(
      { error: "فشل حذف الموظف" },
      { status: 500 }
    );
  }
}
