import { NextResponse } from "next/server";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

export const preferredRegion = "fra1";

export async function GET(request: Request) {
  const kioskError = await requireKioskAuth(request);
  if (kioskError) return kioskError;

  try {
    const shifts = await prisma.workSchedule.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
      },
    });
    return NextResponse.json(shifts, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل الشفتات" },
      { status: 500 }
    );
  }
}
