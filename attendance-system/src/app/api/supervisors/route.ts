import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getSupervisorRows } from "@/lib/supervisors";
import { validateSupervisorCode } from "@/lib/supervisor-types";

export async function GET() {
  const auth = await requirePermission("settings:read");
  if (auth.error) return auth.error;

  try {
    const supervisors = await getSupervisorRows();
    return NextResponse.json(supervisors);
  } catch (error) {
    console.error("GET /api/supervisors:", error);
    return NextResponse.json(
      { error: "فشل تحميل مسؤولي الشفتات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("settings:write");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const emergencyCode = String(body.emergencyCode ?? "").trim();

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

    const created = await prisma.shiftSupervisor.create({
      data: { name, emergencyCode },
      select: { id: true, name: true, emergencyCode: true, isActive: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/supervisors:", error);
    return NextResponse.json(
      { error: "فشل إضافة المسؤول" },
      { status: 500 }
    );
  }
}
