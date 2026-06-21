import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getDepartmentRows } from "@/lib/departments";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const departments = await getDepartmentRows();
    return NextResponse.json(departments);
  } catch (error) {
    console.error("GET /api/departments:", error);
    return NextResponse.json(
      { error: "فشل تحميل الأقسام" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
    }

    const existing = await prisma.department.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `القسم «${name}» موجود مسبقاً` },
        { status: 409 }
      );
    }

    const created = await prisma.department.create({ data: { name } });
    return NextResponse.json(
      { id: created.id, name: created.name, employeeCount: 0 },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/departments:", error);
    return NextResponse.json({ error: "فشل إنشاء القسم" }, { status: 500 });
  }
}
