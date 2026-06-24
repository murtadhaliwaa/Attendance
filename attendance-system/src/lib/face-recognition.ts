import type * as faceapi from "face-api.js";
import { getVideoDetectionCanvas } from "@/lib/camera-frame";
import {
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
  selectBestFaceMatch,
} from "@/lib/face-match-config";

const MODEL_URL = "/models";

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

let scanModelsLoaded = false;
let enrollmentModelsLoaded = false;
let faceApiModule: typeof faceapi | null = null;

async function importFaceApi() {
  if (faceApiModule) return faceApiModule;
  try {
    faceApiModule = await import("face-api.js");
    return faceApiModule;
  } catch {
    throw new Error("فشل تحميل مكتبة التعرف على الوجه");
  }
}

export async function loadScanFaceModels(): Promise<void> {
  if (scanModelsLoaded) return;

  const faceapi = await importFaceApi();

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  } catch {
    throw new Error(
      "فشل تحميل نماذج التعرف. تأكد من وجود ملفات /public/models ثم حدّث الصفحة"
    );
  }

  scanModelsLoaded = true;
}

export async function loadEnrollmentFaceModels(): Promise<void> {
  await loadScanFaceModels();
  if (enrollmentModelsLoaded) return;

  const faceapi = await importFaceApi();

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
  } catch {
    throw new Error("فشل تحميل نماذج تسجيل الوجه");
  }

  enrollmentModelsLoaded = true;
}

export async function loadFaceModels(): Promise<void> {
  await loadEnrollmentFaceModels();
}

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

function getFaceSizeRatio(
  box: { width: number; height: number },
  frameWidth: number,
  frameHeight: number
): number {
  const frameArea = frameWidth * frameHeight;
  if (frameArea === 0) return 0;
  return (box.width * box.height) / frameArea;
}

function getDetectionSource(
  video: HTMLVideoElement
): HTMLCanvasElement | HTMLVideoElement | null {
  return getVideoDetectionCanvas(video) ?? video;
}

export async function detectFaceForScan(
  video: HTMLVideoElement
): Promise<FaceDetectionResult | null> {
  if (!faceApiModule) await loadScanFaceModels();

  const source = getDetectionSource(video);
  if (!source) return null;

  const frameWidth =
    source instanceof HTMLCanvasElement ? source.width : source.videoWidth;
  const frameHeight =
    source instanceof HTMLCanvasElement ? source.height : source.videoHeight;

  const detection = await faceApiModule!.detectSingleFace(
    source,
    new faceApiModule!.TinyFaceDetectorOptions({
      inputSize: SCAN_DETECT_INPUT_SIZE,
      scoreThreshold: SCAN_MIN_CONFIDENCE,
    })
  )
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection?.descriptor) return null;

  const faceSizeRatio = getFaceSizeRatio(
    detection.detection.box,
    frameWidth,
    frameHeight
  );
  if (faceSizeRatio < SCAN_MIN_FACE_SIZE_RATIO) return null;

  return {
    descriptor: detection.descriptor,
    score: detection.detection.score,
    faceSizeRatio,
  };
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
  if (!faceApiModule) return [];

  const scored: Array<FaceMatchResult & { distance: number }> = [];

  for (const employee of employees) {
    if (employee.descriptor.length !== 128) continue;

    const stored = new Float32Array(employee.descriptor);
    const distance = faceApiModule.euclideanDistance(descriptor, stored);

    scored.push({
      employee,
      distance,
      confidence: Math.max(0, 1 - distance / FACE_MATCH_THRESHOLD),
    });
  }

  return scored;
}

export function findBestMatch(
  descriptor: Float32Array,
  employees: EmployeeFaceData[]
): FaceMatchResult | null {
  if (employees.length === 0) return null;

  const best = selectBestFaceMatch(scoreEmployeeMatches(descriptor, employees), "recognize");
  if (!best) return null;

  return {
    employee: best.employee,
    distance: best.distance,
    confidence: Math.max(0, 1 - best.distance / FACE_MATCH_THRESHOLD),
  };
}

/** تحقق صارم من التسجيل المكرر — للاستخدام عند إضافة موظف جديد فقط */
export function findStrictDuplicateMatch(
  descriptor: Float32Array,
  employees: EmployeeFaceData[]
): FaceMatchResult | null {
  if (employees.length === 0) return null;

  const best = selectBestFaceMatch(
    scoreEmployeeMatches(descriptor, employees),
    "duplicate"
  );
  if (!best) return null;

  return {
    employee: best.employee,
    distance: best.distance,
    confidence: Math.max(0, 1 - best.distance / DUPLICATE_FACE_MATCH_THRESHOLD),
  };
}

export function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  const length = descriptors[0]?.length ?? 128;
  const avg = new Float32Array(length);

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
  if (!faceApiModule || descriptors.length < 2) return 0;

  const avg = averageDescriptors(descriptors);
  let total = 0;

  for (const desc of descriptors) {
    total += faceApiModule.euclideanDistance(desc, avg);
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

async function detectFaceForEnrollment(
  video: HTMLVideoElement
): Promise<FaceDetectionResult | null> {
  if (!faceApiModule) await loadEnrollmentFaceModels();

  const source = getDetectionSource(video);
  if (!source) return null;

  const frameWidth =
    source instanceof HTMLCanvasElement ? source.width : source.videoWidth;
  const frameHeight =
    source instanceof HTMLCanvasElement ? source.height : source.videoHeight;

  const detection = await faceApiModule!.detectSingleFace(
    source,
    new faceApiModule!.SsdMobilenetv1Options({
      minConfidence: ENROLLMENT_MIN_CONFIDENCE,
    })
  )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection?.descriptor) return null;

  const faceSizeRatio = getFaceSizeRatio(
    detection.detection.box,
    frameWidth,
    frameHeight
  );
  if (faceSizeRatio < ENROLLMENT_MIN_FACE_SIZE_RATIO) return null;

  return {
    descriptor: detection.descriptor,
    score: detection.detection.score,
    faceSizeRatio,
  };
}

async function captureEnrollmentSample(
  video: HTMLVideoElement
): Promise<FaceDetectionResult> {
  for (let attempt = 0; attempt < ENROLLMENT_SAMPLE_RETRIES; attempt++) {
    const result = await detectFaceForEnrollment(video);
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
