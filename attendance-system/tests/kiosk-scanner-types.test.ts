import { describe, expect, it } from "vitest";
import {
  blockMessage,
  getBlockReason,
  type TodayStatus,
} from "@/lib/kiosk-scanner-types";

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
  });

  describe("getBlockReason — checkout", () => {
    it("يمنع إذا لم يسجّل الحضور", () => {
      expect(getBlockReason("checkout", today())).toBe("no_checkin");
    });

    it("يمنع إذا سبق تسجيل الانصراف", () => {
      expect(
        getBlockReason("checkout", today({ hasCheckIn: true, hasCheckOut: true }))
      ).toBe("already_done");
    });

    it("يسمح إذا سجّل الحضور ولم ينصرف", () => {
      expect(getBlockReason("checkout", today({ hasCheckIn: true }))).toBeNull();
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

    it("يطلب تسجيل الحضور أولاً عند no_checkin", () => {
      const msg = blockMessage("checkout", "no_checkin", "محمد", today());
      expect(msg).toContain("سجّل حضورك");
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
