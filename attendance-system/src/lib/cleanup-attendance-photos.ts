import { VerificationStatus } from "@prisma/client";
import { subDays } from "date-fns";
import { getTodayDate, toDateKey } from "@/lib/app-timezone";
import { deleteEmployeePhoto } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";

/** عدد الأيام التي تبقى فيها صور الحضور/الانصراف بعد تاريخ السجل. */
export const ATTENDANCE_PHOTO_RETENTION_DAYS = 14;

export type PhotoCleanupResult = {
  retentionDays: number;
  cutoffDate: string;
  scanned: number;
  deletedCheckIn: number;
  deletedCheckOut: number;
  clearedDbFields: number;
  errors: string[];
};

function canDeletePhoto(
  path: string | null | undefined,
  verification: VerificationStatus | null | undefined
): path is string {
  if (!path?.trim()) return false;
  // لا تحذف صور الطلبات المعلّقة — مطلوبة للمراجعة
  if (verification === VerificationStatus.PENDING) return false;
  // لا تحذف مسارات مرجعية بالخطأ
  if (path.startsWith("reference/")) return false;
  return true;
}

/**
 * يحذف صور الحضور/الانصراف الأقدم من مدة الاحتفاظ من Storage
 * ويمسح مساراتها من قاعدة البيانات.
 * يُبقي: الصور المرجعية + أي صورة لطلب مراجعة معلّق.
 */
export async function cleanupOldAttendancePhotos(
  retentionDays: number = ATTENDANCE_PHOTO_RETENTION_DAYS
): Promise<PhotoCleanupResult> {
  const cutoff = subDays(getTodayDate(), retentionDays);

  const records = await prisma.attendance.findMany({
    where: {
      date: { lt: cutoff },
      OR: [
        { checkInPhotoUrl: { not: null } },
        { checkOutPhotoUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      date: true,
      checkInPhotoUrl: true,
      checkOutPhotoUrl: true,
      checkInVerificationStatus: true,
      checkOutVerificationStatus: true,
    },
    orderBy: { date: "asc" },
    take: 500,
  });

  const result: PhotoCleanupResult = {
    retentionDays,
    cutoffDate: toDateKey(cutoff),
    scanned: records.length,
    deletedCheckIn: 0,
    deletedCheckOut: 0,
    clearedDbFields: 0,
    errors: [],
  };

  for (const record of records) {
    const data: {
      checkInPhotoUrl?: null;
      checkOutPhotoUrl?: null;
    } = {};

    if (
      canDeletePhoto(record.checkInPhotoUrl, record.checkInVerificationStatus)
    ) {
      try {
        await deleteEmployeePhoto(record.checkInPhotoUrl);
        data.checkInPhotoUrl = null;
        result.deletedCheckIn += 1;
      } catch (error) {
        result.errors.push(
          `checkin ${record.id}: ${
            error instanceof Error ? error.message : "فشل الحذف"
          }`
        );
      }
    }

    if (
      canDeletePhoto(
        record.checkOutPhotoUrl,
        record.checkOutVerificationStatus
      )
    ) {
      try {
        await deleteEmployeePhoto(record.checkOutPhotoUrl);
        data.checkOutPhotoUrl = null;
        result.deletedCheckOut += 1;
      } catch (error) {
        result.errors.push(
          `checkout ${record.id}: ${
            error instanceof Error ? error.message : "فشل الحذف"
          }`
        );
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.attendance.update({
        where: { id: record.id },
        data,
      });
      result.clearedDbFields += 1;
    }
  }

  return result;
}
