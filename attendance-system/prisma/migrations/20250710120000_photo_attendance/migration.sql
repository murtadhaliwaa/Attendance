-- Photo-based attendance: reference photos + verification workflow

CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "Method" ADD VALUE IF NOT EXISTS 'PHOTO';

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "referencePhotoUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hasReferencePhoto" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInPhotoUrl" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutPhotoUrl" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInShiftId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutShiftId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInVerificationStatus" "VerificationStatus";
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutVerificationStatus" "VerificationStatus";
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInRejectionReason" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutRejectionReason" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInReviewedAt" TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutReviewedAt" TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInReviewedById" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutReviewedById" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInReviewedByName" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutReviewedByName" TEXT;

CREATE INDEX IF NOT EXISTS "Attendance_checkInVerificationStatus_idx"
  ON "Attendance"("checkInVerificationStatus");
CREATE INDEX IF NOT EXISTS "Attendance_checkOutVerificationStatus_idx"
  ON "Attendance"("checkOutVerificationStatus");
CREATE INDEX IF NOT EXISTS "Employee_isActive_hasReferencePhoto_idx"
  ON "Employee"("isActive", "hasReferencePhoto");
