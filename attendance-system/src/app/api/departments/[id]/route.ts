import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body.name ?? existing.name).trim();

    if (!name) {
      return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
    }

    const duplicate = await prisma.department.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        NOT: { id: params.id },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `القسم «${name}» موجود مسبقاً` },
        { status: 409 }
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.department.update({
        where: { id: params.id },
        data: { name },
      }),
      ...(name !== existing.name
        ? [
            prisma.employee.updateMany({
              where: { department: existing.name },
              data: { department: name },
            }),
          ]
        : []),
    ]);

    const employeeCount = await prisma.employee.count({
      where: { department: updated.name },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      employeeCount,
    });
  } catch (error) {
    console.error("PUT /api/departments/[id]:", error);
    return NextResponse.json({ error: "فشل تحديث القسم" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });
    }

    const employeeCount = await prisma.employee.count({
      where: { department: existing.name },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف «${existing.name}» — مرتبط بـ ${employeeCount} موظف`,
        },
        { status: 409 }
      );
    }

    await prisma.department.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "تم حذف القسم" });
  } catch (error) {
    console.error("DELETE /api/departments/[id]:", error);
    return NextResponse.json({ error: "فشل حذف القسم" }, { status: 500 });
  }
}
