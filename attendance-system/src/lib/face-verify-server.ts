/** نفس عتبة التطابق المستخدمة في الحضور والانصراف */
export const FACE_MATCH_THRESHOLD = 0.58;

export function isValidFaceDescriptor(
  descriptor: unknown
): descriptor is number[] {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === 128 &&
    descriptor.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function verifyFaceDescriptor(
  stored: number[],
  provided: number[],
  threshold = FACE_MATCH_THRESHOLD
): boolean {
  if (!isValidFaceDescriptor(stored) || !isValidFaceDescriptor(provided)) {
    return false;
  }
  return euclideanDistance(stored, provided) <= threshold;
}
