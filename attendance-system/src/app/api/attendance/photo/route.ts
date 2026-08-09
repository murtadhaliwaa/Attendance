import { NextResponse } from "next/server";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import {
  PhotoAttendanceError,
  submitPhotoCheckIn,
  submitPhotoCheckOut,
} from "@/lib/photo-attendance";
import type { PhotoUploadSource } from "@/lib/photo-storage";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

async function readPhotoPayload(request: Request): Promise<{
  employeeId: string;
  shiftId: string;
  mode: "checkin" | "checkout";
  image: PhotoUploadSource;
} | { error: string; status: number }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { error: "بيانات الطلب غير صالحة", status: 400 };
    }

    const employeeId = String(form.get("employeeId") ?? "").trim();
    const shiftId = String(form.get("shiftId") ?? "").trim();
    const mode =
      String(form.get("mode") ?? "").trim() === "checkout"
        ? "checkout"
        : "checkin";
    const photo = form.get("photo");

    if (!employeeId || !shiftId || !(photo instanceof File)) {
      return { error: "الموظف والشفت والصورة مطلوبة", status: 400 };
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    return {
      employeeId,
      shiftId,
      mode,
      image: {
        buffer,
        contentType: photo.type || "image/jpeg",
      },
    };
  }

  // توافق خلفي مع العملاء القديمة (JSON + data URL)
  let body: {
    employeeId?: string;
    shiftId?: string;
    imageDataUrl?: string;
    mode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return { error: "بيانات الطلب غير صالحة", status: 400 };
  }

  const employeeId = String(body.employeeId ?? "").trim();
  const shiftId = String(body.shiftId ?? "").trim();
  const imageDataUrl = String(body.imageDataUrl ?? "").trim();
  const mode = body.mode === "checkout" ? "checkout" : "checkin";

  if (!employeeId || !shiftId || !imageDataUrl) {
    return { error: "الموظف والشفت والصورة مطلوبة", status: 400 };
  }

  return { employeeId, shiftId, mode, image: imageDataUrl };
}

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

  const payload = await readPhotoPayload(request);
  if ("error" in payload) {
    return NextResponse.json(
      { error: payload.error },
      { status: payload.status }
    );
  }

  try {
    const result =
      payload.mode === "checkout"
        ? await submitPhotoCheckOut({
            employeeId: payload.employeeId,
            shiftId: payload.shiftId,
            image: payload.image,
          })
        : await submitPhotoCheckIn({
            employeeId: payload.employeeId,
            shiftId: payload.shiftId,
            image: payload.image,
          });

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
