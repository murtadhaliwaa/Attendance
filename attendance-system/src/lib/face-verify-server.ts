import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  getDescriptorSize,
  inferDescriptorVersion,
  isKnownDescriptorVersion,
} from "@/lib/face-descriptor-version";
import {
  computeFaceMatchDistance,
  euclideanDistanceV1,
} from "@/lib/face-match-distance";
import { getFaceMatchThresholds } from "@/lib/face-match-config";

export {
  CONSECUTIVE_MATCHES_REQUIRED,
  DUPLICATE_FACE_MATCH_THRESHOLD,
  DUPLICATE_FACE_MATCH_THRESHOLD_V1,
  DUPLICATE_FACE_MATCH_THRESHOLD_V2,
  DUPLICATE_MIN_GAP_FROM_SECOND,
  ENROLLMENT_MIN_CONFIDENCE,
  ENROLLMENT_MIN_FACE_SIZE_RATIO,
  ENROLLMENT_SAMPLES,
  FACE_MATCH_THRESHOLD,
  FACE_MATCH_THRESHOLD_V1,
  FACE_MATCH_THRESHOLD_V2,
  FACE_MIN_GAP_FROM_SECOND,
  FACE_STRONG_MATCH_DISTANCE,
  FACE_STRONG_MATCH_DISTANCE_V1,
  FACE_STRONG_MATCH_DISTANCE_V2,
  MAX_ENROLLMENT_VARIANCE,
  SCAN_DETECT_INPUT_SIZE,
  SCAN_MIN_CONFIDENCE,
  SCAN_MIN_FACE_SIZE_RATIO,
  getFaceMatchThresholds,
  selectBestFaceMatch,
  type FaceMatchPurpose,
} from "@/lib/face-match-config";

export {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  FACE_DESCRIPTOR_V1_SIZE,
  FACE_DESCRIPTOR_V2_SIZE,
} from "@/lib/face-descriptor-version";

export function isValidFaceDescriptor(
  descriptor: unknown,
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): descriptor is number[] {
  const size = getDescriptorSize(version);
  return (
    Array.isArray(descriptor) &&
    descriptor.length === size &&
    descriptor.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export function isValidFaceDescriptorAny(descriptor: unknown): descriptor is number[] {
  if (!Array.isArray(descriptor)) return false;
  const version = inferDescriptorVersion(descriptor);
  if (version === null) return false;
  return isValidFaceDescriptor(descriptor, version);
}

/** @deprecated استخدم computeFaceMatchDistance */
export function euclideanDistance(a: number[], b: number[]): number {
  return euclideanDistanceV1(a, b);
}

export function verifyFaceDescriptor(
  stored: number[],
  provided: number[],
  version = CURRENT_FACE_DESCRIPTOR_VERSION,
  threshold?: number
): boolean {
  if (!isValidFaceDescriptor(stored, version)) return false;
  if (!isValidFaceDescriptor(provided, version)) return false;

  const distance = computeFaceMatchDistance(stored, provided, version);
  if (distance === null) return false;

  const matchThreshold =
    threshold ?? getFaceMatchThresholds(version).match;
  return distance <= matchThreshold;
}

export function getDescriptorVersionOrThrow(version: number): number {
  if (!isKnownDescriptorVersion(version)) {
    throw new Error("إصدار بصمة الوجه غير مدعوم");
  }
  return version;
}
