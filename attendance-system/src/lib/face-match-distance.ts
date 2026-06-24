import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  FACE_DESCRIPTOR_V1_SIZE,
  FACE_DESCRIPTOR_V2_SIZE,
  inferDescriptorVersion,
} from "@/lib/face-descriptor-version";

export const HUMAN_MATCH_OPTIONS = {
  order: 2,
  multiplier: 25,
  min: 0.2,
  max: 0.8,
} as const;

/** مسافة خام — مطابقة لـ @vladmandic/human match.distance */
export function humanRawDistance(
  a: number[],
  b: number[],
  multiplier = HUMAN_MATCH_OPTIONS.multiplier
): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }
  return Math.round(100 * multiplier * sum) / 100;
}

/** تشابه 0..1 — مطابقة لـ human.match.similarity */
export function humanSimilarity(a: number[], b: number[]): number {
  const dist = humanRawDistance(a, b);
  if (dist === 0) return 1;
  const root = Math.sqrt(dist);
  const { min, max } = HUMAN_MATCH_OPTIONS;
  const norm = (1 - root / 100 - min) / (max - min);
  return Math.round(100 * Math.max(Math.min(norm, 1), 0)) / 100;
}

/** مسافة للمطابقة — أقل = أقوى (1 - similarity) */
export function humanMatchDistance(a: number[], b: number[]): number {
  return 1 - humanSimilarity(a, b);
}

export function euclideanDistanceV1(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < FACE_DESCRIPTOR_V1_SIZE; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function computeFaceMatchDistance(
  a: number[],
  b: number[],
  version = CURRENT_FACE_DESCRIPTOR_VERSION
): number | null {
  if (a.length !== b.length) return null;
  if (version === 2) {
    if (a.length !== FACE_DESCRIPTOR_V2_SIZE) return null;
    return humanMatchDistance(a, b);
  }
  if (a.length !== FACE_DESCRIPTOR_V1_SIZE) return null;
  return euclideanDistanceV1(a, b);
}

export function computeFaceMatchDistanceAuto(
  a: number[],
  b: number[]
): number | null {
  const version = inferDescriptorVersion(a);
  if (version === null || version !== inferDescriptorVersion(b)) return null;
  return computeFaceMatchDistance(a, b, version);
}
