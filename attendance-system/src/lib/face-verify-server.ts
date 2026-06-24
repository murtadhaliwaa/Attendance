import { FACE_MATCH_THRESHOLD } from "@/lib/face-match-config";

export {
  CONSECUTIVE_MATCHES_REQUIRED,
  DUPLICATE_FACE_MATCH_THRESHOLD,
  DUPLICATE_MIN_GAP_FROM_SECOND,
  ENROLLMENT_MIN_CONFIDENCE,
  ENROLLMENT_MIN_FACE_SIZE_RATIO,
  ENROLLMENT_SAMPLES,
  FACE_MATCH_THRESHOLD,
  FACE_MIN_GAP_FROM_SECOND,
  FACE_STRONG_MATCH_DISTANCE,
  MAX_ENROLLMENT_VARIANCE,
  SCAN_DETECT_INPUT_SIZE,
  SCAN_MIN_CONFIDENCE,
  SCAN_MIN_FACE_SIZE_RATIO,
  selectBestFaceMatch,
  type FaceMatchPurpose,
} from "@/lib/face-match-config";

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
