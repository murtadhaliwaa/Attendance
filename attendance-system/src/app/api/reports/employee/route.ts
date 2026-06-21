import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEmployeeReport } from "@/lib/reports";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "اختر موظفاً لعرض تقريره" },
        { status: 400 }
      );
    }

    const data = await getEmployeeReport(employeeId, {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/reports/employee:", error);
    const message =
      error instanceof Error ? error.message : "فشل تحميل تقرير الموظف";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
