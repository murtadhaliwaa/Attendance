/** إعدادات موحّدة لدقة التعرف على الوجه في كل النظام */

import { CURRENT_FACE_DESCRIPTOR_VERSION } from "@/lib/face-descriptor-version";

/** عتبات v1 (128-d — face-api) */
export const FACE_MATCH_THRESHOLD_V1 = 0.48;
export const FACE_STRONG_MATCH_DISTANCE_V1 = 0.38;
export const DUPLICATE_FACE_MATCH_THRESHOLD_V1 = 0.38;
export const FACE_MIN_GAP_FROM_SECOND_V1 = 0.1;
export const DUPLICATE_MIN_GAP_FROM_SECOND_V1 = 0.12;

/**
 * عتبات v2 (1024-d — Human) — مسافة = 1 - similarity (الأقل = أقوى)
 *
 * مضبوطة لبيئة ~150 موظفاً مع أولوية منع الأخطاء (false matches):
 * - match 0.45: أصرم من 0.5 السابقة (تشابه ~55%) لتقليل قبول الغرباء المشابهين.
 * - strong 0.40: مطابقة عالية الثقة (لكنها لم تعد تتجاوز فحص الفجوة — انظر selectBestFaceMatch).
 * - minGap 0.10: يجب أن يتفوّق الأفضل على الثاني بهذا الفارق وإلا نرفض (منع التخمين بين متشابهين).
 *
 * ملاحظة: القيم المثالية تحتاج معايرة على وجوه حقيقية بكاميرا التابلت نفسها.
 */
export const FACE_MATCH_THRESHOLD_V2 = 0.45;
export const FACE_STRONG_MATCH_DISTANCE_V2 = 0.4;
// كشف التكرار عند التسجيل: شُدِّد إلى 0.36 (تشابه ~64%) لتقليل الإنذارات الكاذبة
// التي تمنع تسجيل موظف جديد بسبب تشابهه السطحي مع موظف آخر. التكرار الحقيقي
// لنفس الشخص بلقطة جيدة يكون أقل بكثير من ذلك. المشرف يملك زر تجاوز عند اللزوم.
export const DUPLICATE_FACE_MATCH_THRESHOLD_V2 = 0.36;
export const FACE_MIN_GAP_FROM_SECOND_V2 = 0.1;
export const DUPLICATE_MIN_GAP_FROM_SECOND_V2 = 0.12;

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

/**
 * كشف الحيوية (Liveness / Anti-spoofing) — لمنع خداع النظام بصورة على هاتف أو ورقة.
 * - real: ثقة نموذج antispoof أن الوجه حقيقي (ليس صورة مطبوعة/شاشة)
 * - live: ثقة نموذج liveness أن الوجه حي (وليس صورة ثابتة)
 * القيم بين 0 و 1، والأعلى أكثر ثقة. مفعّل أثناء المسح والتسجيل.
 */
export const LIVENESS_ENABLED = true;
export const LIVENESS_MIN_REAL = 0.5;
export const LIVENESS_MIN_LIVE = 0.5;

/** تسجيل بصمة الوجه */
export const ENROLLMENT_SAMPLES = 7;
export const MAX_ENROLLMENT_VARIANCE = 0.1;
export const ENROLLMENT_MIN_CONFIDENCE = 0.55;
export const ENROLLMENT_MIN_FACE_SIZE_RATIO = 0.1;

export type FaceMatchPurpose = "recognize" | "duplicate";

export type ScoredFaceCandidate = {
  distance: number;
};

/**
 * يختار أفضل تطابق غير ملتبس، أو null إن لم يكن آمناً.
 *
 * سياسة موحّدة لمنع الأخطاء:
 * 1. المرشحون ضمن العتبة فقط (match للتعرف، duplicate للتسجيل).
 * 2. حارس الالتباس: عند وجود مرشحَين أو أكثر ضمن العتبة، يجب أن يتفوّق الأفضل
 *    على الثاني بفارق ≥ minGap — وإلا نرفض بدل التخمين بين وجهين متشابهين.
 *    يُطبَّق هذا **دائماً** (حتى للمطابقة القوية ≤ strong) — هذا ما يمنع
 *    اختيار الموظف الخطأ عندما يكون موظفان متقاربين.
 * 3. المرشح الوحيد ضمن العتبة يُقبل (السقف المطلق هو العتبة نفسها، وقد شُدِّدت).
 */
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

  if (inRange.length > 1) {
    const gap = inRange[1].distance - best.distance;
    if (gap < minGap) return null;
  }

  return best;
}
