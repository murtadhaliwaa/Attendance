import type Human from "@vladmandic/human";
import { getVideoDetectionCanvas } from "@/lib/camera-frame";
import {
  ENROLLMENT_MIN_CONFIDENCE,
  ENROLLMENT_MIN_FACE_SIZE_RATIO,
  LIVENESS_ENABLED,
  SCAN_MIN_CONFIDENCE,
  SCAN_MIN_FACE_SIZE_RATIO,
} from "@/lib/face-match-config";
import { passesLiveness } from "@/lib/face-liveness";
import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  FACE_DESCRIPTOR_V2_SIZE,
} from "@/lib/face-descriptor-version";
import { humanMatchDistance } from "@/lib/face-match-distance";
import { HUMAN_MODEL_BASE } from "./constants";
import { getFaceSizeRatio } from "./geometry";
import type { FaceDetectionOutput, FaceEngine } from "./types";

let humanInstance: Human | null = null;
let modelsLoaded = false;

/** آخر وقت تم فيه رفض وجه بسبب فشل كشف الحيوية (صورة/شاشة). */
let lastLivenessRejectionAt = 0;

/**
 * هل آخر محاولة كشف فشلت بسبب الحيوية خلال آخر `withinMs` ميلي ثانية؟
 * تستخدمها الواجهة لعرض رسالة «استخدم وجهك الحقيقي» بدل «لم يُكتشف وجه».
 */
export function wasRecentLivenessRejection(withinMs = 1500): boolean {
  return Date.now() - lastLivenessRejectionAt <= withinMs;
}

let lastMotionRejectionAt = 0;

export function wasRecentMotionRejection(withinMs = 1500): boolean {
  return Date.now() - lastMotionRejectionAt <= withinMs;
}

export function markMotionRejection(): void {
  lastMotionRejectionAt = Date.now();
  lastLivenessRejectionAt = Date.now();
}

/**
 * @see passesLiveness في face-liveness.ts
 */
async function getHuman(): Promise<Human> {
  if (typeof window === "undefined") {
    throw new Error("Human يعمل في المتصفح فقط");
  }
  if (!humanInstance) {
    const { default: Human } = await import("@vladmandic/human");
    humanInstance = new Human({
      modelBasePath: HUMAN_MODEL_BASE,
      backend: "webgl",
      cacheSensitivity: 0,
      face: {
        enabled: true,
        detector: {
          enabled: true,
          rotation: true,
          maxDetected: 1,
          minConfidence: SCAN_MIN_CONFIDENCE,
        },
        mesh: { enabled: true },
        iris: { enabled: false },
        description: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: LIVENESS_ENABLED },
        liveness: { enabled: LIVENESS_ENABLED },
      },
      body: { enabled: false },
      hand: { enabled: false },
      gesture: { enabled: false },
      object: { enabled: false },
    });
  }
  return humanInstance;
}

function getFrame(video: HTMLVideoElement) {
  const source = getVideoDetectionCanvas(video) ?? video;
  const frameWidth =
    source instanceof HTMLCanvasElement ? source.width : source.videoWidth;
  const frameHeight =
    source instanceof HTMLCanvasElement ? source.height : source.videoHeight;
  if (!frameWidth || !frameHeight) return null;
  return { source, frameWidth, frameHeight };
}

async function detectEmbedding(
  video: HTMLVideoElement,
  mode: "scan" | "enrollment"
): Promise<FaceDetectionOutput | null> {
  const frame = getFrame(video);
  if (!frame) return null;

  const human = await getHuman();
  const minConfidence =
    mode === "enrollment" ? ENROLLMENT_MIN_CONFIDENCE : SCAN_MIN_CONFIDENCE;
  const minFaceRatio =
    mode === "enrollment"
      ? ENROLLMENT_MIN_FACE_SIZE_RATIO
      : SCAN_MIN_FACE_SIZE_RATIO;

  const result = await human.detect(frame.source, {
    face: {
      detector: {
        minConfidence,
        rotation: mode === "enrollment",
      },
    },
  });
  const face = result.face[0];
  if (!face?.embedding || face.embedding.length !== FACE_DESCRIPTOR_V2_SIZE) {
    return null;
  }

  if (!passesLiveness(face, mode, modelsLoaded)) {
    lastLivenessRejectionAt = Date.now();
    return null;
  }

  const box = face.box;
  const faceSizeRatio = getFaceSizeRatio(
    { width: box[2], height: box[3] },
    frame.frameWidth,
    frame.frameHeight
  );
  if (faceSizeRatio < minFaceRatio) return null;

  const score = face.faceScore ?? face.score ?? 0;
  if (score < minConfidence) return null;

  return {
    descriptor: new Float32Array(face.embedding),
    score,
    faceSizeRatio,
    faceBox: {
      x: box[0],
      y: box[1],
      width: box[2],
      height: box[3],
    },
    frameWidth: frame.frameWidth,
    frameHeight: frame.frameHeight,
  };
}

export const humanFaceEngine: FaceEngine = {
  async loadScanModels() {
    if (modelsLoaded) return;
    const human = await getHuman();
    await human.load();
    modelsLoaded = true;
  },

  async loadEnrollmentModels() {
    await this.loadScanModels();
  },

  detectForScan(video) {
    return detectEmbedding(video, "scan");
  },

  detectForEnrollment(video) {
    return detectEmbedding(video, "enrollment");
  },

  euclideanDistance(a, b) {
    return humanMatchDistance(Array.from(a), Array.from(b));
  },

  descriptorVersion: CURRENT_FACE_DESCRIPTOR_VERSION,
};

export const FACE_ENGINE_VERSION = CURRENT_FACE_DESCRIPTOR_VERSION;
