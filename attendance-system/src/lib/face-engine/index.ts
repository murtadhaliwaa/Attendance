export { FACE_DESCRIPTOR_SIZE, HUMAN_MODEL_BASE } from "./constants";
export { humanFaceEngine, FACE_ENGINE_VERSION } from "./human-engine";
export type { FaceDetectionOutput, FaceEngine } from "./types";

import { humanFaceEngine } from "./human-engine";
import type { FaceEngine } from "./types";

let engine: FaceEngine | null = null;

export function getFaceEngine(): FaceEngine {
  if (!engine) {
    engine = humanFaceEngine;
  }
  return engine;
}

export function resetFaceEngineCache(): void {
  engine = null;
}
