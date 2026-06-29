import { describe, expect, it } from "vitest";
import {
  DescriptorStabilityTracker,
  FaceMotionTracker,
} from "@/lib/face-motion-liveness";

describe("FaceMotionTracker", () => {
  it("rejects static face positions", () => {
    const tracker = new FaceMotionTracker();
    for (let i = 0; i < 8; i++) {
      tracker.record(
        { x: 100, y: 100, width: 80, height: 80 },
        640,
        480
      );
    }
    expect(tracker.hasEnoughMotion()).toBe(false);
  });

  it("accepts moving face positions", () => {
    const tracker = new FaceMotionTracker();
    const positions = [0, 4, 8, 12, 16, 20, 24, 28];
    for (const offset of positions) {
      tracker.record(
        { x: 100 + offset, y: 100 + offset / 2, width: 80, height: 80 },
        640,
        480
      );
    }
    expect(tracker.hasEnoughMotion()).toBe(true);
  });
});

describe("DescriptorStabilityTracker", () => {
  it("flags nearly identical descriptors as static", () => {
    const tracker = new DescriptorStabilityTracker();
    const base = new Float32Array([1, 0, 0, 0]);
    const distance = (a: Float32Array, b: Float32Array) =>
      Math.abs(a[0]! - b[0]!);

    tracker.record(base);
    tracker.record(base);
    tracker.record(base);

    expect(tracker.isTooStatic(new Float32Array([1.001, 0, 0, 0]), distance)).toBe(
      true
    );
    expect(tracker.isTooStatic(new Float32Array([1.2, 0, 0, 0]), distance)).toBe(
      false
    );
  });
});
