/** إعدادات موحّدة لدقة التعرف على الوجه في كل النظام */

/** أقصى مسافة لقبول تطابق في الحضور والانصراف */
export const FACE_MATCH_THRESHOLD = 0.48;

/** تطابق قوي — يُقبل مباشرة دون الحاجة لفرق عن وجه ثانٍ */
export const FACE_STRONG_MATCH_DISTANCE = 0.38;

/** الحد الأدنى للفرق عن ثاني أقرب وجه عند وجود أكثر من موظف */
export const FACE_MIN_GAP_FROM_SECOND = 0.1;

/** عتبة اكتشاف التسجيل المكرر — أصرّ من الحضور */
export const DUPLICATE_FACE_MATCH_THRESHOLD = 0.38;

export const DUPLICATE_MIN_GAP_FROM_SECOND = 0.12;

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
  purpose: FaceMatchPurpose
): T | null {
  const threshold =
    purpose === "duplicate"
      ? DUPLICATE_FACE_MATCH_THRESHOLD
      : FACE_MATCH_THRESHOLD;
  const minGap =
    purpose === "duplicate"
      ? DUPLICATE_MIN_GAP_FROM_SECOND
      : FACE_MIN_GAP_FROM_SECOND;

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

  if (best.distance <= FACE_STRONG_MATCH_DISTANCE) {
    return best;
  }

  if (inRange.length > 1) {
    const gap = inRange[1].distance - best.distance;
    if (gap >= minGap) return best;
    return null;
  }

  return best.distance <= threshold ? best : null;
}
