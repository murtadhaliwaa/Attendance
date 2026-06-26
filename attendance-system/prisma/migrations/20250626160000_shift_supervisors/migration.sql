-- مسؤولو الشفتات: رموز طارئة على مستوى المشرف بدل كل موظف
CREATE TABLE IF NOT EXISTS "ShiftSupervisor" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "emergencyCode" TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShiftSupervisor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShiftSupervisor_emergencyCode_key"
  ON "ShiftSupervisor"("emergencyCode");

CREATE INDEX IF NOT EXISTS "ShiftSupervisor_isActive_idx"
  ON "ShiftSupervisor"("isActive");

-- ربط سجل الحضور بالمشرف الذي سجّل بالرمز الطارئ (مع حفظ الاسم للسجل)
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "supervisorName" TEXT;

CREATE INDEX IF NOT EXISTS "Attendance_supervisorId_idx"
  ON "Attendance"("supervisorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_supervisorId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
      ADD CONSTRAINT "Attendance_supervisorId_fkey"
      FOREIGN KEY ("supervisorId") REFERENCES "ShiftSupervisor"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
