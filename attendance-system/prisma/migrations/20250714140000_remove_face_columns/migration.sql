-- Remove unused face-recognition columns (product is photo attendance only).
DROP INDEX IF EXISTS "Employee_isActive_hasFaceRegistered_idx";

ALTER TABLE "Employee" DROP COLUMN IF EXISTS "faceDescriptor";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "faceDescriptorVersion";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "hasFaceRegistered";
