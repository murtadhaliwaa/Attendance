import { describe, expect, it } from "vitest";
import {
  isValidFaceDescriptor,
  isValidFaceDescriptorAny,
  verifyFaceDescriptor,
} from "@/lib/face-verify-server";

const v2 = (fill: number) => new Array(1024).fill(fill);
const v1 = (fill: number) => new Array(128).fill(fill);

describe("face-verify-server", () => {
  describe("isValidFaceDescriptor", () => {
    it("يقبل مصفوفة 1024 رقم صحيح للإصدار 2", () => {
      expect(isValidFaceDescriptor(v2(0.1), 2)).toBe(true);
    });

    it("يرفض الطول الخاطئ", () => {
      expect(isValidFaceDescriptor(v1(0.1), 2)).toBe(false);
    });

    it("يرفض القيم غير الرقمية", () => {
      const bad = v2(0.1);
      bad[0] = "x" as unknown as number;
      expect(isValidFaceDescriptor(bad, 2)).toBe(false);
    });

    it("يرفض NaN و Infinity", () => {
      const nan = v2(0.1);
      nan[5] = NaN;
      expect(isValidFaceDescriptor(nan, 2)).toBe(false);

      const inf = v2(0.1);
      inf[5] = Infinity;
      expect(isValidFaceDescriptor(inf, 2)).toBe(false);
    });

    it("يرفض غير المصفوفات", () => {
      expect(isValidFaceDescriptor(null, 2)).toBe(false);
      expect(isValidFaceDescriptor("abc", 2)).toBe(false);
      expect(isValidFaceDescriptor({}, 2)).toBe(false);
    });
  });

  describe("isValidFaceDescriptorAny", () => {
    it("يقبل أطوال v1 و v2", () => {
      expect(isValidFaceDescriptorAny(v1(0.1))).toBe(true);
      expect(isValidFaceDescriptorAny(v2(0.1))).toBe(true);
    });

    it("يرفض الأطوال غير المعروفة", () => {
      expect(isValidFaceDescriptorAny(new Array(512).fill(0))).toBe(false);
    });
  });

  describe("verifyFaceDescriptor", () => {
    it("يطابق متجهين متطابقين", () => {
      expect(verifyFaceDescriptor(v2(0.1), v2(0.1), 2)).toBe(true);
    });

    it("يرفض متجهين متباعدين جداً", () => {
      expect(verifyFaceDescriptor(v2(0.1), v2(0.9), 2)).toBe(false);
    });

    it("يرفض المدخلات غير الصالحة", () => {
      expect(verifyFaceDescriptor(v1(0.1), v2(0.1), 2)).toBe(false);
    });

    it("يحترم عتبة مخصّصة", () => {
      expect(verifyFaceDescriptor(v2(0.1), v2(0.1), 2, 0)).toBe(true);
    });
  });
});
