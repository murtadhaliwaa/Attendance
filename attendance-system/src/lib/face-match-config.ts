/** إعدادات موحّدة لدقة التعرف على الوجه في كل النظام */

import { CURRENT_FACE_DESCRIPTOR_VERSION } from "@/lib/face-descriptor-version";

/** عتبات v1 (128-d — face-api) */
export const FACE_MATCH_THRESHOLD_V1 = 0.48;
export const FACE_STRONG_MATCH_DISTANCE_V1 = 0.38;
export const DUPLICATE_FACE_MATCH_THRESHOLD_V1 = 0.38;
export const FACE_MIN_GAP_FROM_SECOND_V1 = 0.1;
export const DUPLICATE_MIN_GAP_FROM_SECOND_V1 = 0.12;

/** عتبات v2 (1024-d — Human) — مسافة = 1 - similarity */
export const FACE_MATCH_THRESHOLD_V2 = 0.5;
export const FACE_STRONG_MATCH_DISTANCE_V2 = 0.4;
export const DUPLICATE_FACE_MATCH_THRESHOLD_V2 = 0.42;
export const FACE_MIN_GAP_FROM_SECOND_V2 = 0.08;
export const DUPLICATE_MIN_GAP_FROM_SECOND_V2 = 0.1;

/** @deprecated استخدم getFaceMatchThresholds */
export const FACE_MATCH_THRESHOLD = FACE_MATCH_THRESHOLD_V2;
/** @deprecated */
export const FACE_STRONG_MATCH_DISTANCE = FACE_STRONG_MATCH_DISTANCE_V2;
/** @deprecated */
export const DUPLICATE_FACE_MATCH_THRESHOLD = DUPLICATE_FACE_MATCH_THRESHOLD_V2;
/** @deprecated */
export const FACE_MIN_GAP_FROM_SECOND = FACE_MIN_GAP_FROM_SECOND_V2;
/** @deprecated */
export const DUPLICATE_MIN_GAP_FROM_SECOND = DUPLICATE_MIN_GAP_FROM_SECOND_V2;

export type FaceMatchThresholds = {
  match: number;
  strong: number;
  duplicate: number;
  minGap: number;
  duplicateMinGap: number;
};

export function getFaceMatchThresholds(
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): FaceMatchThresholds {
  if (version === 2) {
    return {
      match: FACE_MATCH_THRESHOLD_V2,
      strong: FACE_STRONG_MATCH_DISTANCE_V2,
      duplicate: DUPLICATE_FACE_MATCH_THRESHOLD_V2,
      minGap: FACE_MIN_GAP_FROM_SECOND_V2,
      duplicateMinGap: DUPLICATE_MIN_GAP_FROM_SECOND_V2,
    };
  }
  return {
    match: FACE_MATCH_THRESHOLD_V1,
    strong: FACE_STRONG_MATCH_DISTANCE_V1,
    duplicate: DUPLICATE_FACE_MATCH_THRESHOLD_V1,
    minGap: FACE_MIN_GAP_FROM_SECOND_V1,
    duplicateMinGap: DUPLICATE_MIN_GAP_FROM_SECOND_V1,
  };
}

/** عدد اللقطات المتتالية المطلوبة قبل تسجيل الحضور */
export const CONSECUTIVE_MATCHES_REQUIRED = 3;

/** كشف الوجه أثناء المسح */
export const SCAN_DETECT_INPUT_SIZE = 320;
export const SCAN_MIN_CONFIDENCE = 0.55;
export const SCAN_MIN_FACE_SIZE_RATIO = 0.08;

/** تسجيل بصمة الوجه */
export const ENROLLMENT_SAMPLES = 7;
export const MAX_ENROLLMENT_VARIANCE = 0.1;
export const ENROLLMENT_MIN_CONFIDENCE = 0.55;
export const ENROLLMENT_MIN_FACE_SIZE_RATIO = 0.1;

export type FaceMatchPurpose = "recognize" | "duplicate";

export type ScoredFaceCandidate = {
  distance: number;
};

export function selectBestFaceMatch<T extends ScoredFaceCandidate>(
  candidates: T[],
  purpose: FaceMatchPurpose,
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): T | null {
  const thresholds = getFaceMatchThresholds(version);
  const threshold =
    purpose === "duplicate" ? thresholds.duplicate : thresholds.match;
  const minGap =
    purpose === "duplicate"
      ? thresholds.duplicateMinGap
      : thresholds.minGap;

  const inRange = candidates.filter((c) => c.distance <= threshold);
  if (inRange.length === 0) return null;

  inRange.sort((a, b) => a.distance - b.distance);
  const best = inRange[0];

  if (purpose === "duplicate") {
    if (inRange.length > 1) {
      const gap = inRange[1].distance - best.distance;
      if (gap < minGap) return null;
    }
    return best;
  }

  if (best.distance <= thresholds.strong) {
    return best;
  }

  if (inRange.length > 1) {
    const gap = inRange[1].distance - best.distance;
    if (gap >= minGap) return best;
    return null;
  }

  return best.distance <= threshold ? best : null;
}
