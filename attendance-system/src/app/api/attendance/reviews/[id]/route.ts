import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import {
  PhotoAttendanceError,
  deletePhotoReviewEvent,
  reviewPhotoAttendance,
} from "@/lib/photo-attendance";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("attendance:review");
  if (auth.error) return auth.error;

  let body: { event?: string; action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const event = body.event === "checkout" ? "checkout" : "checkin";
  const action = body.action === "reject" ? "reject" : "approve";

  if (action === "reject" && !String(body.reason ?? "").trim()) {
    return NextResponse.json(
      { error: "سبب الرفض مطلوب" },
      { status: 400 }
    );
  }

  try {
    const result = await reviewPhotoAttendance({
      attendanceId: params.id,
      event,
      action,
      reason: body.reason,
      reviewerId: auth.systemUser.id,
      reviewerName: auth.systemUser.name,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PhotoAttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`POST /api/attendance/reviews/${params.id}:`, error);
    return NextResponse.json(
      { error: "فشل تنفيذ المراجعة" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission("attendance:review-delete");
  if (auth.error) return auth.error;

  let body: { event?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const event = body.event === "checkout" ? "checkout" : "checkin";

  try {
    const result = await deletePhotoReviewEvent({
      attendanceId: params.id,
      event,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PhotoAttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`DELETE /api/attendance/reviews/${params.id}:`, error);
    return NextResponse.json(
      { error: "فشل حذف صورة المراجعة" },
      { status: 500 }
    );
  }
}
