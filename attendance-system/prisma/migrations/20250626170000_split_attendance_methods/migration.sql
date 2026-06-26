-- فصل طريقة الحضور عن طريقة الانصراف (وجه / رمز طارئ لكل حدث على حدة)

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInMethod" "Method";
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutMethod" "Method";
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInSupervisorId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkInSupervisorName" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutSupervisorId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutSupervisorName" TEXT;

-- ترحيل البيانات القديمة (method/supervisorId/supervisorName الموحّدة)
UPDATE "Attendance"
SET
  "checkInMethod" = CASE WHEN "checkIn" IS NOT NULL THEN COALESCE("method", 'FACE'::"Method") ELSE NULL END,
  "checkOutMethod" = CASE WHEN "checkOut" IS NOT NULL THEN COALESCE("method", 'FACE'::"Method") ELSE NULL END,
  "checkInSupervisorId" = CASE
    WHEN "checkIn" IS NOT NULL AND COALESCE("method", 'FACE'::"Method") = 'EMERGENCY_CODE'
    THEN "supervisorId" ELSE NULL END,
  "checkInSupervisorName" = CASE
    WHEN "checkIn" IS NOT NULL AND COALESCE("method", 'FACE'::"Method") = 'EMERGENCY_CODE'
    THEN "supervisorName" ELSE NULL END,
  "checkOutSupervisorId" = CASE
    WHEN "checkOut" IS NOT NULL AND COALESCE("method", 'FACE'::"Method") = 'EMERGENCY_CODE'
    THEN "supervisorId" ELSE NULL END,
  "checkOutSupervisorName" = CASE
    WHEN "checkOut" IS NOT NULL AND COALESCE("method", 'FACE'::"Method") = 'EMERGENCY_CODE'
    THEN "supervisorName" ELSE NULL END
WHERE "checkInMethod" IS NULL;

-- إزالة الحقول القديمة الموحّدة
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_supervisorId_fkey";
DROP INDEX IF EXISTS "Attendance_supervisorId_idx";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "supervisorId";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "supervisorName";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "method";

CREATE INDEX IF NOT EXISTS "Attendance_checkInSupervisorId_idx"
  ON "Attendance"("checkInSupervisorId");
CREATE INDEX IF NOT EXISTS "Attendance_checkOutSupervisorId_idx"
  ON "Attendance"("checkOutSupervisorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_checkInSupervisorId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
      ADD CONSTRAINT "Attendance_checkInSupervisorId_fkey"
      FOREIGN KEY ("checkInSupervisorId") REFERENCES "ShiftSupervisor"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_checkOutSupervisorId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
      ADD CONSTRAINT "Attendance_checkOutSupervisorId_fkey"
      FOREIGN KEY ("checkOutSupervisorId") REFERENCES "ShiftSupervisor"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
