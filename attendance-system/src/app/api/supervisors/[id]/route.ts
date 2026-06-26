import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validateSupervisorCode } from "@/lib/supervisor-types";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("settings:write");
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.shiftSupervisor.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "المسؤول غير موجود" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? existing.name).trim();
    const emergencyCode = String(
      body.emergencyCode ?? existing.emergencyCode
    ).trim();
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : existing.isActive;

    if (!name) {
      return NextResponse.json(
        { error: "اسم المسؤول مطلوب" },
        { status: 400 }
      );
    }

    const codeError = validateSupervisorCode(emergencyCode);
    if (codeError) {
      return NextResponse.json({ error: codeError }, { status: 400 });
    }

    if (emergencyCode !== existing.emergencyCode) {
      const duplicate = await prisma.shiftSupervisor.findUnique({
        where: { emergencyCode },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "هذا الرمز الطارئ مستخدم بالفعل لمسؤول آخر" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.shiftSupervisor.update({
      where: { id: params.id },
      data: { name, emergencyCode, isActive },
      select: { id: true, name: true, emergencyCode: true, isActive: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/supervisors/[id]:", error);
    return NextResponse.json(
      { error: "فشل تحديث المسؤول" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("settings:write");
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.shiftSupervisor.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "المسؤول غير موجود" },
        { status: 404 }
      );
    }

    // سجلات الحضور القديمة تحتفظ بالاسم (supervisorName) ويُصبح المرجع null.
    await prisma.shiftSupervisor.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "تم حذف المسؤول" });
  } catch (error) {
    console.error("DELETE /api/supervisors/[id]:", error);
    return NextResponse.json(
      { error: "فشل حذف المسؤول" },
      { status: 500 }
    );
  }
}
