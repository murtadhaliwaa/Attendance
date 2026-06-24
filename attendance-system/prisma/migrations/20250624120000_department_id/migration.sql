-- ربط الموظفين بجدول الأقسام (departmentId)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx" ON "Employee"("departmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Employee_departmentId_fkey'
  ) THEN
    ALTER TABLE "Employee"
      ADD CONSTRAINT "Employee_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
