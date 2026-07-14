import { VerificationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { MAX_PHOTO_SUBMIT_ATTEMPTS } from "@/lib/photo-attendance-limits";
import {
  attemptsMessage,
  resolveCheckInMode,
  resolveCheckOutMode,
} from "@/lib/photo-attendance-mode";

describe("photo-attendance-mode", () => {
  describe("resolveCheckInMode", () => {
    it("ينشئ سجلاً جديداً عند عدم وجود حضور", () => {
      expect(resolveCheckInMode(null)).toBe("create");
      expect(
        resolveCheckInMode({
          checkIn: null,
          checkInVerificationStatus: null,
          checkInPhotoAttempts: 0,
        })
      ).toBe("create");
    });

    it("يعيد الإرسال أثناء PENDING قبل الحد الأقصى", () => {
      expect(
        resolveCheckInMode({
          checkIn: new Date(),
          checkInVerificationStatus: VerificationStatus.PENDING,
          checkInPhotoAttempts: 1,
        })
      ).toBe("retry_pending");
    });

    it("يمنع تجاوز الحد الأقصى أثناء PENDING", () => {
      expect(() =>
        resolveCheckInMode({
          checkIn: new Date(),
          checkInVerificationStatus: VerificationStatus.PENDING,
          checkInPhotoAttempts: MAX_PHOTO_SUBMIT_ATTEMPTS,
        })
      ).toThrow(/وصلت للحد/);
    });

    it("يمنع الحضور بعد الموافقة", () => {
      expect(() =>
        resolveCheckInMode({
          checkIn: new Date(),
          checkInVerificationStatus: VerificationStatus.APPROVED,
          checkInPhotoAttempts: 1,
        })
      ).toThrow(/تم تأكيد حضورك/);
    });

    it("يعيد البدء بعد الرفض", () => {
      expect(
        resolveCheckInMode({
          checkIn: new Date(),
          checkInVerificationStatus: VerificationStatus.REJECTED,
          checkInPhotoAttempts: 3,
        })
      ).toBe("restart");
    });
  });

  describe("resolveCheckOutMode", () => {
    it("ينشئ انصرافاً جديداً عند عدم وجوده", () => {
      expect(
        resolveCheckOutMode({
          checkOut: null,
          checkOutVerificationStatus: null,
          checkOutPhotoAttempts: 0,
        })
      ).toBe("create");
    });

    it("يمنع الانصراف بعد الموافقة", () => {
      expect(() =>
        resolveCheckOutMode({
          checkOut: new Date(),
          checkOutVerificationStatus: VerificationStatus.APPROVED,
          checkOutPhotoAttempts: 1,
        })
      ).toThrow(/تم تأكيد انصرافك/);
    });

    it("يمنع تجاوز محاولات الانصراف أثناء PENDING", () => {
      expect(() =>
        resolveCheckOutMode({
          checkOut: new Date(),
          checkOutVerificationStatus: VerificationStatus.PENDING,
          checkOutPhotoAttempts: MAX_PHOTO_SUBMIT_ATTEMPTS,
        })
      ).toThrow(/وصلت للحد/);
    });
  });

  describe("attemptsMessage", () => {
    it("يعرض المتبقي قبل الحد", () => {
      expect(attemptsMessage("الحضور", 1)).toContain("يمكنك إعادة الإرسال");
    });

    it("يمنع الإرسال الإضافي عند استنفاذ المحاولات", () => {
      expect(attemptsMessage("الانصراف", MAX_PHOTO_SUBMIT_ATTEMPTS)).toContain(
        "ولا يمكن إرسال صورة إضافية"
      );
    });
  });
});
