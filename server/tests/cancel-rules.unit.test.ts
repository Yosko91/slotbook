import { describe, expect, it } from "vitest";
import { canChangeBooking, validateReason } from "../src/rules/bookingRules.js";

const now = new Date("2026-12-01T03:00:00Z");
const later = (minutes: number) => new Date(now.getTime() + minutes * 60000);

describe("F-04 cancel rules", () => {
  it("TEST-32 a student can change a booking until 12 hours before the start (BR-15)", () => {
    expect(canChangeBooking(later(12 * 60), now)).toBe(true);
    expect(canChangeBooking(later(12 * 60 - 1), now)).toBe(false);
    expect(canChangeBooking(later(-60), now)).toBe(false);
  });

  it("TEST-33 tutor reason is required (5 to 200), student reason is optional (max 200)", () => {
    expect(validateReason("abcd", "STAFF").ok).toBe(false);
    expect(validateReason("abcde", "STAFF")).toEqual({ ok: true, reason: "abcde" });
    expect(validateReason("a".repeat(200), "STAFF").ok).toBe(true);
    expect(validateReason("a".repeat(201), "STAFF").ok).toBe(false);
    expect(validateReason("     ", "STAFF").ok).toBe(false);
    expect(validateReason(undefined, "STAFF").ok).toBe(false);

    expect(validateReason(undefined, "STUDENT")).toEqual({ ok: true, reason: null });
    expect(validateReason("   ", "STUDENT")).toEqual({ ok: true, reason: null });
    expect(validateReason(" Exam moved ", "STUDENT")).toEqual({ ok: true, reason: "Exam moved" });
    expect(validateReason("a".repeat(201), "STUDENT").ok).toBe(false);
    expect(validateReason(42, "STUDENT").ok).toBe(false);
  });
});
