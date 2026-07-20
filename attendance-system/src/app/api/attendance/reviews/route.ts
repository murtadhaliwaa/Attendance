import { NextResponse } from "next/server";
import { VerificationStatus } from "@prisma/client";
import { requirePermission } from "@/lib/api-auth";
import { getTodayDate } from "@/lib/app-timezone";
import { formatTimeAr } from "@/lib/attendance-utils";
import { getSignedPhotoUrl } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/app-timezone";

export async function GET(request: Request) {
  const auth = await requirePermission("attendance:review");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "pending";

  if (scope === "all") {
    const historyAuth = await requirePermission("attendance:review-history");
    if (historyAuth.error) return historyAuth.error;
  }

  const today = getTodayDate();

  const records = await prisma.attendance.findMany({
    where:
      scope === "all"
        ? {
            OR: [
              { checkInVerificationStatus: { not: null } },
              { checkOutVerificationStatus: { not: null } },
            ],
          }
        : {
            OR: [
              { checkInVerificationStatus: VerificationStatus.PENDING },
              { checkOutVerificationStatus: VerificationStatus.PENDING },
            ],
          },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          department: true,
          referencePhotoUrl: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    // الطابور المعلّق قابل للتنفيذ ويجب أن يظهر كاملاً؛ سجل المراجعات (all) محدود.
    ...(scope === "pending" ? {} : { take: 200 }),
  });

  const items = [];

  try {
    for (const record of records) {
      const dateKey = toDateKey(record.date);
      const referenceUrl = record.employee.referencePhotoUrl
        ? await getSignedPhotoUrl(record.employee.referencePhotoUrl)
        : null;

      if (record.checkInVerificationStatus) {
        items.push({
          id: `${record.id}:checkin`,
          attendanceId: record.id,
          event: "checkin" as const,
          date: dateKey,
          isToday: record.date.getTime() === today.getTime(),
          time: record.checkIn ? formatTimeAr(record.checkIn) : null,
          verificationStatus: record.checkInVerificationStatus,
          rejectionReason: record.checkInRejectionReason,
          reviewedByName: record.checkInReviewedByName,
          employee: {
            id: record.employee.id,
            name: record.employee.name,
            employeeCode: record.employee.employeeCode,
            department: record.employee.department,
          },
          referencePhotoUrl: referenceUrl,
          eventPhotoUrl: record.checkInPhotoUrl
            ? await getSignedPhotoUrl(record.checkInPhotoUrl)
            : null,
        });
      }

      if (record.checkOutVerificationStatus) {
        items.push({
          id: `${record.id}:checkout`,
          attendanceId: record.id,
          event: "checkout" as const,
          date: dateKey,
          isToday: record.date.getTime() === today.getTime(),
          time: record.checkOut ? formatTimeAr(record.checkOut) : null,
          verificationStatus: record.checkOutVerificationStatus,
          rejectionReason: record.checkOutRejectionReason,
          reviewedByName: record.checkOutReviewedByName,
          employee: {
            id: record.employee.id,
            name: record.employee.name,
            employeeCode: record.employee.employeeCode,
            department: record.employee.department,
          },
          referencePhotoUrl: referenceUrl,
          eventPhotoUrl: record.checkOutPhotoUrl
            ? await getSignedPhotoUrl(record.checkOutPhotoUrl)
            : null,
        });
      }
    }
  } catch (error) {
    console.error("GET /api/attendance/reviews:", error);
    return NextResponse.json(
      { error: "فشل تحميل طلبات المراجعة" },
      { status: 500 }
    );
  }

  const pending = items.filter((i) => i.verificationStatus === "PENDING");

  return NextResponse.json({
    pendingCount: pending.length,
    items: scope === "pending" ? pending : items,
  });
}
