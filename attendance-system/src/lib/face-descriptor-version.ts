/** بصمة وجه 128-d (قديم — face-api) */
export const FACE_DESCRIPTOR_V1_SIZE = 128;
/** بصمة وجه 1024-d (جديد — Human) */
export const FACE_DESCRIPTOR_V2_SIZE = 1024;

/** الإصدار الافتراضي للتسجيلات الجديدة */
export const CURRENT_FACE_DESCRIPTOR_VERSION = 2;

export function getDescriptorSize(version: number): number {
  return version === 2 ? FACE_DESCRIPTOR_V2_SIZE : FACE_DESCRIPTOR_V1_SIZE;
}

export function inferDescriptorVersion(descriptor: number[]): number | null {
  if (descriptor.length === FACE_DESCRIPTOR_V2_SIZE) return 2;
  if (descriptor.length === FACE_DESCRIPTOR_V1_SIZE) return 1;
  return null;
}

export function isKnownDescriptorVersion(version: number): boolean {
  return version === 1 || version === 2;
}
