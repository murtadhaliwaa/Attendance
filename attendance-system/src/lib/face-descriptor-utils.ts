import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  getDescriptorSize,
  inferDescriptorVersion,
} from "@/lib/face-descriptor-version";

const SEED_EMPLOYEE_COUNT = 88;

function generateSeedFaceDescriptor(seed: number): number[] {
  const descriptor: number[] = [];
  for (let i = 0; i < 128; i++) {
    descriptor.push(Math.sin(seed * (i + 1) * 0.13) * 0.5);
  }
  const magnitude = Math.sqrt(
    descriptor.reduce((sum, value) => sum + value * value, 0)
  );
  return descriptor.map((value) => value / magnitude);
}

export function isSeedFakeDescriptor(descriptor: number[]): boolean {
  if (descriptor.length !== 128) return false;

  for (let seed = 1; seed <= SEED_EMPLOYEE_COUNT; seed++) {
    const fake = generateSeedFaceDescriptor(seed);
    let matches = true;
    for (let i = 0; i < 128; i++) {
      if (Math.abs(descriptor[i]! - fake[i]!) > 0.0001) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}

export function hasRealFaceDescriptor(
  descriptor: number[],
  faceDescriptorVersion = CURRENT_FACE_DESCRIPTOR_VERSION
): boolean {
  const version =
    faceDescriptorVersion || inferDescriptorVersion(descriptor) || 0;
  const expectedSize = getDescriptorSize(version);

  if (descriptor.length !== expectedSize) return false;
  if (version === 1 && isSeedFakeDescriptor(descriptor)) return false;

  return descriptor.some((value) => value !== 0);
}

export function needsFaceReEnrollment(
  faceDescriptorVersion: number,
  hasFaceRegistered: boolean
): boolean {
  return (
    hasFaceRegistered &&
    faceDescriptorVersion !== CURRENT_FACE_DESCRIPTOR_VERSION
  );
}
