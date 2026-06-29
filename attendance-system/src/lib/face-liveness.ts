import {
  LIVENESS_ENABLED,
  LIVENESS_MIN_LIVE,
  LIVENESS_MIN_REAL,
  LIVENESS_SCAN_MIN_LIVE,
  LIVENESS_SCAN_MIN_REAL,
} from "@/lib/face-match-config";

export type LivenessFaceScores = {
  real?: number;
  live?: number;
};

export type LivenessCheckMode = "scan" | "enrollment";

/**
 * يتحقق من كون الوجه حيّاً حقيقياً (ليس صورة على هاتف/ورقة).
 * بعد تحميل النماذج: يجب وجود درجتي real و live معاً، وإلا نرفض (fail-closed).
 */
export function passesLiveness(
  face: LivenessFaceScores,
  mode: LivenessCheckMode,
  modelsLoaded: boolean
): boolean {
  if (!LIVENESS_ENABLED) return true;

  const hasReal = typeof face.real === "number";
  const hasLive = typeof face.live === "number";

  if (modelsLoaded && (!hasReal || !hasLive)) {
    return false;
  }

  const minReal = mode === "scan" ? LIVENESS_SCAN_MIN_REAL : LIVENESS_MIN_REAL;
  const minLive = mode === "scan" ? LIVENESS_SCAN_MIN_LIVE : LIVENESS_MIN_LIVE;

  if (hasReal && face.real! < minReal) return false;
  if (hasLive && face.live! < minLive) return false;
  return true;
}
