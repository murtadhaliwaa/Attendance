import { NextResponse } from "next/server";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

// قائمة كل الموظفين النشطين (للاختيار في الرمز الطارئ على الكشك).
// تشمل من لم يسجّل وجهه بعد، لأن الرمز الطارئ يعمل على الجميع.
export async function GET(request: Request) {
  const kioskError = await requireKioskAuth(request);
  if (kioskError) return kioskError;

  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true, department: true },
    });
    return NextResponse.json(employees);
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل قائمة الموظفين" },
      { status: 500 }
    );
  }
}
