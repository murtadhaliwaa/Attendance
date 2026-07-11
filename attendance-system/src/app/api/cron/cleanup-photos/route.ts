import { NextResponse } from "next/server";
import { cleanupOldAttendancePhotos } from "@/lib/cleanup-attendance-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  // التطوير المحلي بدون سر
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await cleanupOldAttendancePhotos();
    return NextResponse.json({
      message: "اكتمل تنظيف صور الحضور القديمة",
      ...result,
    });
  } catch (error) {
    console.error("GET /api/cron/cleanup-photos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "فشل تنظيف صور الحضور",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
