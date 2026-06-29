import {
  MOTION_HISTORY_SIZE,
  MOTION_MIN_STD,
  STATIC_DESCRIPTOR_MAX_DISTANCE,
  STATIC_DESCRIPTOR_SAMPLES,
} from "@/lib/face-match-config";

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** يتتبع حركة مركز الوجه — الصور الثابتة على الشاشة تتحرك أقل من الوجه الحقيقي. */
export class FaceMotionTracker {
  private positions: Array<{ x: number; y: number }> = [];

  reset(): void {
    this.positions = [];
  }

  record(
    box: { x: number; y: number; width: number; height: number },
    frameWidth: number,
    frameHeight: number
  ): void {
    if (!frameWidth || !frameHeight) return;

    const centerX = (box.x + box.width / 2) / frameWidth;
    const centerY = (box.y + box.height / 2) / frameHeight;
    this.positions.push({ x: centerX, y: centerY });
    if (this.positions.length > MOTION_HISTORY_SIZE) {
      this.positions.shift();
    }
  }

  hasEnoughMotion(): boolean {
    if (this.positions.length < MOTION_HISTORY_SIZE) return false;

    const xs = this.positions.map((point) => point.x);
    const ys = this.positions.map((point) => point.y);
    return stdDev(xs) + stdDev(ys) >= MOTION_MIN_STD;
  }
}

/** يكتشف البصمات المتطابقة جداً عبر إطارات متتالية (صورة ثابتة). */
export class DescriptorStabilityTracker {
  private samples: Float32Array[] = [];

  reset(): void {
    this.samples = [];
  }

  record(descriptor: Float32Array): void {
    this.samples.push(new Float32Array(descriptor));
    if (this.samples.length > STATIC_DESCRIPTOR_SAMPLES) {
      this.samples.shift();
    }
  }

  isTooStatic(descriptor: Float32Array, distanceFn: (a: Float32Array, b: Float32Array) => number): boolean {
    if (this.samples.length < STATIC_DESCRIPTOR_SAMPLES - 1) return false;

    for (const sample of this.samples) {
      if (distanceFn(descriptor, sample) > STATIC_DESCRIPTOR_MAX_DISTANCE) {
        return false;
      }
    }

    return true;
  }
}
