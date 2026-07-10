import type { Method, VerificationStatus } from "@prisma/client";

export function isPhotoMethod(method: Method | null | undefined): boolean {
  return method === "PHOTO";
}

/** هل يُحسب الحضور في التقارير؟ */
export function isCheckInCounted(
  method: Method | null | undefined,
  verification: VerificationStatus | null | undefined
): boolean {
  if (!method) return false;
  if (method === "PHOTO") return verification === "APPROVED";
  return verification !== "REJECTED";
}

/** هل يُحسب الانصراف في التقارير؟ */
export function isCheckOutCounted(
  method: Method | null | undefined,
  verification: VerificationStatus | null | undefined
): boolean {
  if (!method) return false;
  if (method === "PHOTO") return verification === "APPROVED";
  return verification !== "REJECTED";
}

export function formatVerificationLabel(
  status: VerificationStatus | null | undefined
): string | null {
  if (!status) return null;
  if (status === "PENDING") return "بانتظار التأكيد";
  if (status === "APPROVED") return "مؤكد";
  return "مرفوض";
}
