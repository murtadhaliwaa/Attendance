import { describe, expect, it } from "vitest";
import { passesLiveness } from "@/lib/face-liveness";

describe("passesLiveness", () => {
  it("rejects when models are loaded but scores are missing", () => {
    expect(passesLiveness({}, "scan", true)).toBe(false);
    expect(passesLiveness({ real: 0.9 }, "scan", true)).toBe(false);
    expect(passesLiveness({ live: 0.9 }, "scan", true)).toBe(false);
  });

  it("uses stricter thresholds during scan", () => {
    expect(
      passesLiveness({ real: 0.7, live: 0.7 }, "scan", true)
    ).toBe(false);
    expect(
      passesLiveness({ real: 0.75, live: 0.75 }, "scan", true)
    ).toBe(true);
    expect(
      passesLiveness({ real: 0.7, live: 0.7 }, "enrollment", true)
    ).toBe(true);
  });

  it("rejects low antispoof or liveness scores", () => {
    expect(
      passesLiveness({ real: 0.4, live: 0.9 }, "enrollment", true)
    ).toBe(false);
    expect(
      passesLiveness({ real: 0.9, live: 0.4 }, "enrollment", true)
    ).toBe(false);
  });
});
