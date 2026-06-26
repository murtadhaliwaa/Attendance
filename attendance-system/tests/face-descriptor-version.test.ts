import { describe, expect, it } from "vitest";
import {
  CURRENT_FACE_DESCRIPTOR_VERSION,
  FACE_DESCRIPTOR_V1_SIZE,
  FACE_DESCRIPTOR_V2_SIZE,
  getDescriptorSize,
  inferDescriptorVersion,
  isKnownDescriptorVersion,
} from "@/lib/face-descriptor-version";

describe("face-descriptor-version", () => {
  it("الإصدار الحالي هو 2 (Human 1024-d)", () => {
    expect(CURRENT_FACE_DESCRIPTOR_VERSION).toBe(2);
  });

  describe("getDescriptorSize", () => {
    it("يعيد 1024 للإصدار 2", () => {
      expect(getDescriptorSize(2)).toBe(FACE_DESCRIPTOR_V2_SIZE);
      expect(getDescriptorSize(2)).toBe(1024);
    });

    it("يعيد 128 للإصدار 1", () => {
      expect(getDescriptorSize(1)).toBe(FACE_DESCRIPTOR_V1_SIZE);
      expect(getDescriptorSize(1)).toBe(128);
    });

    it("يعيد 128 لأي إصدار غير 2", () => {
      expect(getDescriptorSize(99)).toBe(128);
    });
  });

  describe("inferDescriptorVersion", () => {
    it("يستنتج 2 من طول 1024", () => {
      expect(inferDescriptorVersion(new Array(1024).fill(0))).toBe(2);
    });

    it("يستنتج 1 من طول 128", () => {
      expect(inferDescriptorVersion(new Array(128).fill(0))).toBe(1);
    });

    it("يعيد null لطول غير معروف", () => {
      expect(inferDescriptorVersion(new Array(512).fill(0))).toBeNull();
      expect(inferDescriptorVersion([])).toBeNull();
    });
  });

  describe("isKnownDescriptorVersion", () => {
    it("يقبل 1 و 2 فقط", () => {
      expect(isKnownDescriptorVersion(1)).toBe(true);
      expect(isKnownDescriptorVersion(2)).toBe(true);
      expect(isKnownDescriptorVersion(0)).toBe(false);
      expect(isKnownDescriptorVersion(3)).toBe(false);
    });
  });
});
