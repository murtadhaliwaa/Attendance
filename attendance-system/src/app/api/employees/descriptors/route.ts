import { NextResponse } from "next/server";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";
import { nextEmployeeCode, nextEmergencyCode } from "@/lib/employee-codes";
import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";

export async function GET(request: Request) {
  const kioskError = requireKioskAuth(request);
  if (kioskError) return kioskError;

  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true, hasFaceRegistered: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        faceDescriptor: true,
      },
    });

    const withRealFaces = employees.filter((e) =>
      hasRealFaceDescriptor(e.faceDescriptor)
    );

    return NextResponse.json(
      withRealFaces.map((e) => ({
        id: e.id,
        name: e.name,
        employeeCode: e.employeeCode,
        descriptor: e.faceDescriptor,
        hasFace: true,
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل بيانات الموظفين" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const kioskError = requireKioskAuth(request);
  if (kioskError) return kioskError;

  try {
    let body: { name?: string; descriptor?: number[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const name = String(body.name ?? "").trim();
    const { descriptor } = body;

    if (!name) {
      return NextResponse.json(
        { error: "أدخل اسمك الكامل" },
        { status: 400 }
      );
    }

    if (!isValidFaceDescriptor(descriptor)) {
      return NextResponse.json(
        { error: "بصمة الوجه غير صالحة. حاول مرة أخرى أمام الكاميرا" },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findFirst({
      where: {
        isActive: true,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existing && hasRealFaceDescriptor(existing.faceDescriptor)) {
      return NextResponse.json(
        {
          error: `${existing.name} مسجّل مسبقاً. قف أمام الكاميرا لتسجيل الحضور أو الانصراف`,
        },
        { status: 409 }
      );
    }

    const defaultShift = await prisma.workSchedule.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
    const fallbackShift =
      defaultShift ??
      (await prisma.workSchedule.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }));

    if (existing) {
      const updated = await prisma.employee.update({
        where: { id: existing.id },
        data: {
          faceDescriptor: descriptor,
          hasFaceRegistered: true,
          shiftId: existing.shiftId ?? fallbackShift?.id,
        },
        select: { id: true, name: true, employeeCode: true },
      });

      return NextResponse.json({
        message: `تم تسجيل وجه ${updated.name} بنجاح. يمكنه الآن تسجيل الحضور بالكاميرا فقط`,
        employee: updated,
        isNew: false,
      });
    }

    const [employeeCode, emergencyCode] = await Promise.all([
      nextEmployeeCode(),
      nextEmergencyCode(),
    ]);

    const created = await prisma.employee.create({
      data: {
        name,
        employeeCode,
        emergencyCode,
        department: "عام",
        position: "موظف",
        shiftId: fallbackShift?.id ?? null,
        faceDescriptor: descriptor,
        hasFaceRegistered: true,
        isActive: true,
      },
      select: { id: true, name: true, employeeCode: true },
    });

    return NextResponse.json(
      {
        message: `مرحباً ${created.name}! تم حفظ اسمك ووجهك. في المرات القادمة قف أمام الكاميرا فقط`,
        employee: created,
        isNew: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PUT /api/employees/descriptors:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ بصمة الوجه" },
      { status: 500 }
    );
  }
}
