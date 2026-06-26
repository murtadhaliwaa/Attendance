import { getFaceEngine, wasRecentLivenessRejection } from "@/lib/face-engine";
import { getDescriptorSize } from "@/lib/face-descriptor-version";

export { wasRecentLivenessRejection };
import {
  CONSECUTIVE_MATCHES_REQUIRED,
  DUPLICATE_FACE_MATCH_THRESHOLD,
  ENROLLMENT_MIN_CONFIDENCE,
  ENROLLMENT_MIN_FACE_SIZE_RATIO,
  ENROLLMENT_SAMPLES,
  FACE_MATCH_THRESHOLD,
  FACE_STRONG_MATCH_DISTANCE,
  getFaceMatchThresholds,
  MAX_ENROLLMENT_VARIANCE,
  SCAN_DETECT_INPUT_SIZE,
  SCAN_MIN_CONFIDENCE,
  SCAN_MIN_FACE_SIZE_RATIO,
  selectBestFaceMatch,
} from "@/lib/face-match-config";
export {
  CONSECUTIVE_MATCHES_REQUIRED,
  DUPLICATE_FACE_MATCH_THRESHOLD,
  ENROLLMENT_MIN_CONFIDENCE,
  ENROLLMENT_MIN_FACE_SIZE_RATIO,
  ENROLLMENT_SAMPLES,
  FACE_MATCH_THRESHOLD,
  FACE_STRONG_MATCH_DISTANCE,
  MAX_ENROLLMENT_VARIANCE,
  SCAN_DETECT_INPUT_SIZE,
  SCAN_MIN_CONFIDENCE,
  SCAN_MIN_FACE_SIZE_RATIO,
};

/** @deprecated استخدم FACE_MATCH_THRESHOLD */
export const MATCH_THRESHOLD = FACE_MATCH_THRESHOLD;
/** @deprecated استخدم FACE_STRONG_MATCH_DISTANCE */
export const STRONG_MATCH_DISTANCE = FACE_STRONG_MATCH_DISTANCE;

export const ENROLLMENT_SAMPLE_RETRIES = 25;
export const ENROLLMENT_RETRY_DELAY_MS = 200;

export interface EmployeeFaceData {
  id: string;
  name: string;
  employeeCode: string;
  descriptor: number[];
}

export interface FaceMatchResult {
  employee: EmployeeFaceData;
  distance: number;
  confidence: number;
}

export interface FaceDetectionResult {
  descriptor: Float32Array;
  score: number;
  faceSizeRatio: number;
}

export async function loadScanFaceModels(): Promise<void> {
  await getFaceEngine().loadScanModels();
}

export async function loadEnrollmentFaceModels(): Promise<void> {
  await getFaceEngine().loadEnrollmentModels();
}

export async function loadFaceModels(): Promise<void> {
  await loadEnrollmentFaceModels();
}

export async function detectFaceForScan(
  video: HTMLVideoElement
): Promise<FaceDetectionResult | null> {
  return getFaceEngine().detectForScan(video);
}

export async function detectFaceDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  const result = await detectFaceForScan(video);
  return result?.descriptor ?? null;
}

function scoreEmployeeMatches(
  descriptor: Float32Array,
  employees: EmployeeFaceData[]
): Array<FaceMatchResult & { distance: number }> {
  const engine = getFaceEngine();
  const version = engine.descriptorVersion;
  const expectedSize = getDescriptorSize(version);
  const thresholds = getFaceMatchThresholds(version);
  const scored: Array<FaceMatchResult & { distance: number }> = [];

  for (const employee of employees) {
    if (employee.descriptor.length !== expectedSize) continue;

    const stored = new Float32Array(employee.descriptor);
    const distance = engine.euclideanDistance(descriptor, stored);

    scored.push({
      employee,
      distance,
      confidence: Math.max(0, 1 - distance / thresholds.match),
    });
  }

  return scored;
}
export function findBestMatch(
  descriptor: Float32Array,
  employees: EmployeeFaceData[]
): FaceMatchResult | null {
  if (employees.length === 0) return null;

  const engine = getFaceEngine();
  const thresholds = getFaceMatchThresholds(engine.descriptorVersion);

  const best = selectBestFaceMatch(
    scoreEmployeeMatches(descriptor, employees),
    "recognize",
    engine.descriptorVersion
  );
  if (!best) return null;

  return {
    employee: best.employee,
    distance: best.distance,
    confidence: Math.max(0, 1 - best.distance / thresholds.match),
  };
}
export function findStrictDuplicateMatch(
  descriptor: Float32Array,
  employees: EmployeeFaceData[]
): FaceMatchResult | null {
  if (employees.length === 0) return null;

  const engine = getFaceEngine();
  const thresholds = getFaceMatchThresholds(engine.descriptorVersion);

  const best = selectBestFaceMatch(
    scoreEmployeeMatches(descriptor, employees),
    "duplicate",
    engine.descriptorVersion
  );
  if (!best) return null;

  return {
    employee: best.employee,
    distance: best.distance,
    confidence: Math.max(0, 1 - best.distance / thresholds.duplicate),
  };
}
export function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  const length =
    descriptors[0]?.length ?? getDescriptorSize(getFaceEngine().descriptorVersion);  const avg = new Float32Array(length);

  for (const desc of descriptors) {
    for (let i = 0; i < length; i++) {
      avg[i] += desc[i];
    }
  }

  for (let i = 0; i < length; i++) {
    avg[i] /= descriptors.length;
  }

  return avg;
}

export function computeDescriptorVariance(descriptors: Float32Array[]): number {
  if (descriptors.length < 2) return 0;

  const engine = getFaceEngine();
  const avg = averageDescriptors(descriptors);
  let total = 0;

  for (const desc of descriptors) {
    total += engine.euclideanDistance(desc, avg);
  }

  return total / descriptors.length;
}

async function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 5000
): Promise<void> {
  const start = Date.now();
  while (video.videoWidth === 0 || video.readyState < 2) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("الكاميرا غير جاهزة. انتظر ثانية وأعد المحاولة");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function captureEnrollmentSample(
  video: HTMLVideoElement
): Promise<FaceDetectionResult> {
  const engine = getFaceEngine();

  for (let attempt = 0; attempt < ENROLLMENT_SAMPLE_RETRIES; attempt++) {
    const result = await engine.detectForEnrollment(video);
    if (result) return result;
    await new Promise((r) => setTimeout(r, ENROLLMENT_RETRY_DELAY_MS));
  }

  throw new Error(
    "لم يُكتشف الوجه. قرّب وجهك داخل الإطار الدائري وأبقِه ثابتاً بإضاءة جيدة"
  );
}

export async function captureEnrollmentDescriptor(
  video: HTMLVideoElement,
  onProgress?: (current: number, total: number) => void
): Promise<Float32Array> {
  await waitForVideoReady(video);
  await new Promise((r) => setTimeout(r, 400));

  const samples: Float32Array[] = [];

  for (let i = 0; i < ENROLLMENT_SAMPLES; i++) {
    onProgress?.(i + 1, ENROLLMENT_SAMPLES);
    const result = await captureEnrollmentSample(video);
    samples.push(result.descriptor);

    if (i < ENROLLMENT_SAMPLES - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const variance = computeDescriptorVariance(samples);
  if (variance > MAX_ENROLLMENT_VARIANCE) {
    throw new Error(
      "حركة زائدة أثناء التسجيل. حافظ على ثبات وجهك وأعد المحاولة"
    );
  }

  return averageDescriptors(samples);
}

export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}
