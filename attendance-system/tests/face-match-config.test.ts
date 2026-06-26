import { describe, expect, it } from "vitest";
import {
  FACE_MATCH_THRESHOLD_V1,
  FACE_MATCH_THRESHOLD_V2,
  getFaceMatchThresholds,
  selectBestFaceMatch,
} from "@/lib/face-match-config";

describe("face-match-config", () => {
  describe("getFaceMatchThresholds", () => {
    it("يعيد عتبات v2 افتراضياً", () => {
      const t = getFaceMatchThresholds();
      expect(t.match).toBe(FACE_MATCH_THRESHOLD_V2);
    });

    it("يعيد عتبات v1 للإصدار 1", () => {
      const t = getFaceMatchThresholds(1);
      expect(t.match).toBe(FACE_MATCH_THRESHOLD_V1);
    });

    it("عتبة strong أقل من match", () => {
      const t = getFaceMatchThresholds(2);
      expect(t.strong).toBeLessThan(t.match);
    });
  });

  describe("selectBestFaceMatch — recognize", () => {
    it("يعيد null عندما لا مرشح ضمن العتبة", () => {
      const result = selectBestFaceMatch(
        [{ distance: 0.9 }, { distance: 0.95 }],
        "recognize",
        2
      );
      expect(result).toBeNull();
    });

    it("يقبل المرشح الوحيد ضمن العتبة", () => {
      const best = { distance: 0.44 };
      const result = selectBestFaceMatch([best], "recognize", 2);
      expect(result).toBe(best);
    });

    it("يقبل الأفضل عند وجود فجوة كافية عن الثاني", () => {
      const best = { distance: 0.1 };
      const result = selectBestFaceMatch(
        [best, { distance: 0.45 }],
        "recognize",
        2
      );
      expect(result).toBe(best);
    });

    it("يرفض عند تقارب أفضل مرشحين (فجوة صغيرة)", () => {
      const result = selectBestFaceMatch(
        [{ distance: 0.4 }, { distance: 0.44 }],
        "recognize",
        2
      );
      expect(result).toBeNull();
    });

    it("يرفض المطابقة القوية إذا كان هناك ثانٍ قريب (لا تجاوز للفجوة)", () => {
      // إصلاح: المطابقة القوية (≤ 0.40) لم تعد تتجاوز فحص الفجوة
      const result = selectBestFaceMatch(
        [{ distance: 0.2 }, { distance: 0.25 }],
        "recognize",
        2
      );
      expect(result).toBeNull();
    });

    it("يقبل المطابقة القوية إذا كانت الفجوة كافية", () => {
      const best = { distance: 0.2 };
      const result = selectBestFaceMatch(
        [best, { distance: 0.42 }],
        "recognize",
        2
      );
      expect(result).toBe(best);
    });

    it("يستبعد المرشحين خارج العتبة قبل فحص الفجوة", () => {
      // 0.5 خارج عتبة 0.45 → يبقى مرشح وحيد 0.42 ويُقبل
      const best = { distance: 0.42 };
      const result = selectBestFaceMatch(
        [best, { distance: 0.5 }],
        "recognize",
        2
      );
      expect(result).toBe(best);
    });
  });

  describe("selectBestFaceMatch — duplicate", () => {
    it("يعيد أفضل مرشح فريد ضمن عتبة التكرار", () => {
      const best = { distance: 0.1 };
      const result = selectBestFaceMatch([best], "duplicate", 2);
      expect(result).toBe(best);
    });

    it("يرفض عند تقارب مرشحين (فجوة أقل من duplicateMinGap)", () => {
      const result = selectBestFaceMatch(
        [{ distance: 0.1 }, { distance: 0.12 }],
        "duplicate",
        2
      );
      expect(result).toBeNull();
    });
  });
});
