import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/api-auth";
import { findEmployeeByFaceDescriptor } from "@/lib/face-match-employee";
import { isValidFaceDescriptor } from "@/lib/face-verify-server";

export async function POST(request: Request) {
  const auth = await requireAnyPermission([
    "employees:create",
    "employees:update",
  ]);
  if (auth.error) return auth.error;

  try {
    let body: { descriptor?: number[]; excludeEmployeeId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const { descriptor, excludeEmployeeId } = body;

    if (!isValidFaceDescriptor(descriptor)) {
      return NextResponse.json(
        { error: "بصمة الوجه غير صالحة" },
        { status: 400 }
      );
    }

    const match = await findEmployeeByFaceDescriptor(
      descriptor,
      excludeEmployeeId?.trim() || undefined,
      "duplicate"
    );

    return NextResponse.json({ match });
  } catch (error) {
    console.error("POST /api/employees/face-match:", error);
    return NextResponse.json(
      { error: "فشل التحقق من بصمة الوجه" },
      { status: 500 }
    );
  }
}
