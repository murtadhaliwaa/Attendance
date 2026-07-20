import { describe, expect, it } from "vitest";
import {
  blockMessage,
  getBlockReason,
  type TodayStatus,
} from "@/lib/kiosk-scanner-types";
import { MAX_PHOTO_SUBMIT_ATTEMPTS } from "@/lib/photo-attendance-limits";

const today = (overrides: Partial<TodayStatus> = {}): TodayStatus => ({
  hasCheckIn: false,
  hasCheckOut: false,
  checkInTime: null,
  checkOutTime: null,
  employeeName: "محمد",
  ...overrides,
});

describe("kiosk-scanner-types", () => {
  describe("getBlockReason — checkin", () => {
    it("يمنع إذا سبق تسجيل الحضور", () => {
      expect(getBlockReason("checkin", today({ hasCheckIn: true }))).toBe(
        "already_checkin"
      );
    });

    it("يسمح إذا لم يسجّل الحضور بعد", () => {
      expect(getBlockReason("checkin", today())).toBeNull();
    });

    it("يسمح بإعادة الإرسال أثناء PENDING قبل الحد الأقصى", () => {
      expect(
        getBlockReason(
          "checkin",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "PENDING",
            checkInPhotoAttempts: 1,
          })
        )
      ).toBeNull();
    });

    it("يمنع عند استنفاد محاولات PENDING", () => {
      expect(
        getBlockReason(
          "checkin",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "PENDING",
            checkInPhotoAttempts: MAX_PHOTO_SUBMIT_ATTEMPTS,
          })
        )
      ).toBe("already_checkin");
    });

    it("يسمح بعد الرفض", () => {
      expect(
        getBlockReason(
          "checkin",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "REJECTED",
            checkInPhotoAttempts: 0,
          })
        )
      ).toBeNull();
    });
  });

  describe("getBlockReason — checkout", () => {
    it("يسمح بالانصراف بدون حضور مسبق", () => {
      expect(getBlockReason("checkout", today())).toBeNull();
    });

    it("يسمح بالانصراف حتى لو الحضور بانتظار التأكيد", () => {
      expect(
        getBlockReason(
          "checkout",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "PENDING",
            checkInPhotoAttempts: 1,
          })
        )
      ).toBeNull();
    });

    it("يمنع إذا سبق تسجيل الانصراف", () => {
      expect(
        getBlockReason(
          "checkout",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "APPROVED",
            hasCheckOut: true,
          })
        )
      ).toBe("already_done");
    });

    it("يسمح بإعادة انصراف PENDING قبل الحد", () => {
      expect(
        getBlockReason(
          "checkout",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "APPROVED",
            hasCheckOut: true,
            checkOutVerificationStatus: "PENDING",
            checkOutPhotoAttempts: 2,
          })
        )
      ).toBeNull();
    });

    it("يسمح إذا سجّل الحضور ولم ينصرف", () => {
      expect(
        getBlockReason(
          "checkout",
          today({
            hasCheckIn: true,
            checkInVerificationStatus: "APPROVED",
          })
        )
      ).toBeNull();
    });
  });

  describe("blockMessage", () => {
    it("يذكر اسم الموظف ووقت الحضور عند already_checkin", () => {
      const msg = blockMessage(
        "checkin",
        "already_checkin",
        "محمد",
        today({ hasCheckIn: true, checkInTime: "08:00 ص" })
      );
      expect(msg).toContain("محمد");
      expect(msg).toContain("08:00 ص");
    });

    it("يوضح حد المحاولات عند PENDING مستنفد", () => {
      const msg = blockMessage(
        "checkin",
        "already_checkin",
        "محمد",
        today({
          hasCheckIn: true,
          checkInVerificationStatus: "PENDING",
          checkInPhotoAttempts: MAX_PHOTO_SUBMIT_ATTEMPTS,
        })
      );
      expect(msg).toContain("وصلت للحد الأقصى");
    });

    it("يذكر وقت الانصراف عند already_done", () => {
      const msg = blockMessage(
        "checkout",
        "already_done",
        "محمد",
        today({ checkOutTime: "05:00 م" })
      );
      expect(msg).toContain("05:00 م");
    });
  });
});
