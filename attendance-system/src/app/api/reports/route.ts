import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { getWeeklyReport } from "@/lib/reports";

export async function GET(request: Request) {
  const auth = await requirePermission("reports:read");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);

    const data = await getWeeklyReport({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      shiftId: searchParams.get("shiftId") ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/reports:", error);
    return NextResponse.json(
      { error: "فشل تحميل التقرير" },
      { status: 500 }
    );
  }
}
