import { describe, expect, it } from "vitest";
import {
  computeFaceMatchDistance,
  computeFaceMatchDistanceAuto,
  euclideanDistanceV1,
  humanMatchDistance,
  humanRawDistance,
  humanSimilarity,
} from "@/lib/face-match-distance";

const v2 = (fill: number) => new Array(1024).fill(fill);
const v1 = (fill: number) => new Array(128).fill(fill);

describe("face-match-distance", () => {
  describe("humanRawDistance", () => {
    it("صفر لمتجهين متطابقين", () => {
      expect(humanRawDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    it("موجب لمتجهين مختلفين", () => {
      expect(humanRawDistance([0, 0], [1, 1])).toBeGreaterThan(0);
    });
  });

  describe("humanSimilarity", () => {
    it("يساوي 1 للمتطابقين", () => {
      expect(humanSimilarity([1, 2, 3], [1, 2, 3])).toBe(1);
    });

    it("محصور بين 0 و 1", () => {
      const sim = humanSimilarity([0, 0, 0], [10, 10, 10]);
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(1);
    });
  });

  describe("humanMatchDistance", () => {
    it("صفر للمتطابقين (1 - similarity)", () => {
      expect(humanMatchDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    it("أكبر للوجوه الأبعد", () => {
      const near = humanMatchDistance(v2(0.1), v2(0.11));
      const far = humanMatchDistance(v2(0.1), v2(0.9));
      expect(far).toBeGreaterThan(near);
    });
  });

  describe("euclideanDistanceV1", () => {
    it("يحسب المسافة الإقليدية على 128 بعد", () => {
      const a = v1(0);
      const b = v1(0);
      b[0] = 3;
      b[1] = 4;
      expect(euclideanDistanceV1(a, b)).toBeCloseTo(5, 5);
    });
  });

  describe("computeFaceMatchDistance", () => {
    it("يعيد null لأطوال مختلفة", () => {
      expect(computeFaceMatchDistance([1, 2], [1, 2, 3])).toBeNull();
    });

    it("يعيد null لطول v2 خاطئ", () => {
      expect(computeFaceMatchDistance([1, 2, 3], [1, 2, 3], 2)).toBeNull();
    });

    it("يحسب مسافة v2 لطول صحيح", () => {
      const d = computeFaceMatchDistance(v2(0.1), v2(0.1), 2);
      expect(d).toBe(0);
    });

    it("يحسب مسافة v1 لطول صحيح", () => {
      const d = computeFaceMatchDistance(v1(0.1), v1(0.1), 1);
      expect(d).toBe(0);
    });
  });

  describe("computeFaceMatchDistanceAuto", () => {
    it("يستنتج الإصدار من الطول", () => {
      expect(computeFaceMatchDistanceAuto(v2(0.2), v2(0.2))).toBe(0);
    });

    it("يعيد null لإصدارين مختلفين", () => {
      expect(computeFaceMatchDistanceAuto(v1(0.2), v2(0.2))).toBeNull();
    });

    it("يعيد null لطول غير معروف", () => {
      expect(
        computeFaceMatchDistanceAuto(new Array(512).fill(0), new Array(512).fill(0))
      ).toBeNull();
    });
  });
});
