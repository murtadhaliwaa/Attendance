import { NextResponse } from "next/server";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import {
  PhotoAttendanceError,
  submitPhotoCheckIn,
  submitPhotoCheckOut,
} from "@/lib/photo-attendance";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const kioskError = await requireKioskAuth(request);
  if (kioskError) return kioskError;

  const clientIp = getClientIp(request);
  if (!(await checkRateLimit(`photo-attendance:${clientIp}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "محاولات كثيرة — انتظر قليلاً ثم حاول مجدداً" },
      { status: 429 }
    );
  }

  let body: {
    employeeId?: string;
    shiftId?: string;
    imageDataUrl?: string;
    mode?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const employeeId = String(body.employeeId ?? "").trim();
  const shiftId = String(body.shiftId ?? "").trim();
  const imageDataUrl = String(body.imageDataUrl ?? "").trim();
  const mode = body.mode === "checkout" ? "checkout" : "checkin";

  if (!employeeId || !shiftId || !imageDataUrl) {
    return NextResponse.json(
      { error: "الموظف والشفت والصورة مطلوبة" },
      { status: 400 }
    );
  }

  try {
    const result =
      mode === "checkout"
        ? await submitPhotoCheckOut({ employeeId, shiftId, imageDataUrl })
        : await submitPhotoCheckIn({ employeeId, shiftId, imageDataUrl });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PhotoAttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/attendance/photo:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "فشل تسجيل الحضور بالصورة",
      },
      { status: 500 }
    );
  }
}
