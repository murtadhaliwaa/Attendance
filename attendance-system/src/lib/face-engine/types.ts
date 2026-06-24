export type FaceDetectionOutput = {
  descriptor: Float32Array;
  score: number;
  faceSizeRatio: number;
};

export interface FaceEngine {
  loadScanModels(): Promise<void>;
  loadEnrollmentModels(): Promise<void>;
  detectForScan(video: HTMLVideoElement): Promise<FaceDetectionOutput | null>;
  detectForEnrollment(
    video: HTMLVideoElement
  ): Promise<FaceDetectionOutput | null>;
  /** مسافة مطابقة — أقل = أقوى */
  euclideanDistance(a: Float32Array, b: Float32Array): number;
  readonly descriptorVersion: number;
}
