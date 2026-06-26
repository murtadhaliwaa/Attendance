import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hasRealFaceDescriptor } from "@/lib/face-descriptor-utils";
import { CURRENT_FACE_DESCRIPTOR_VERSION } from "@/lib/face-descriptor-version";

// يُعيد بصمات الوجه للموظفين النشطين لأداة المعايرة الحيّة في لوحة التحكم.
// محمي بصلاحية settings:read (للمشرفين فقط)، للقراءة فقط ولا يكتب أي شيء.
export async function GET() {
  const auth = await requirePermission("settings:read");
  if (auth.error) return auth.error;

  try {
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        hasFaceRegistered: true,
        faceDescriptorVersion: CURRENT_FACE_DESCRIPTOR_VERSION,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        faceDescriptor: true,
        faceDescriptorVersion: true,
      },
    });

    const withRealFaces = employees.filter((e) =>
      hasRealFaceDescriptor(e.faceDescriptor, e.faceDescriptorVersion)
    );

    return NextResponse.json(
      withRealFaces.map((e) => ({
        id: e.id,
        name: e.name,
        employeeCode: e.employeeCode,
        descriptor: e.faceDescriptor,
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل بيانات المعايرة" },
      { status: 500 }
    );
  }
}
