-- Remove emergency code feature: supervisors, employee codes, attendance supervisor refs

ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_checkInSupervisorId_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_checkOutSupervisorId_fkey";

DROP INDEX IF EXISTS "Attendance_checkInSupervisorId_idx";
DROP INDEX IF EXISTS "Attendance_checkOutSupervisorId_idx";

ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "checkInSupervisorId";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "checkInSupervisorName";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "checkOutSupervisorId";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "checkOutSupervisorName";

DROP INDEX IF EXISTS "Employee_emergencyCode_key";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "emergencyCode";

DROP TABLE IF EXISTS "ShiftSupervisor";
