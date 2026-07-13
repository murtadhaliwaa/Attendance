-- Allow limited photo re-submissions while pending review
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInPhotoAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutPhotoAttempts" INTEGER NOT NULL DEFAULT 0;

-- Existing pending/approved photo rows count as 1 attempt already used
UPDATE "Attendance"
SET "checkInPhotoAttempts" = 1
WHERE "checkInMethod" = 'PHOTO'
  AND "checkInPhotoUrl" IS NOT NULL
  AND "checkInPhotoAttempts" = 0;

UPDATE "Attendance"
SET "checkOutPhotoAttempts" = 1
WHERE "checkOutMethod" = 'PHOTO'
  AND "checkOutPhotoUrl" IS NOT NULL
  AND "checkOutPhotoAttempts" = 0;
