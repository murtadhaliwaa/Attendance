-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "faceDescriptorVersion" INTEGER NOT NULL DEFAULT 2;

-- Mark legacy 128-d enrollments as v1 (require re-enrollment for v2 kiosk)
UPDATE "Employee"
SET "faceDescriptorVersion" = 1
WHERE cardinality("faceDescriptor") = 128
  AND "hasFaceRegistered" = true;
