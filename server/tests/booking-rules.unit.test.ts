import { describe, expect, it } from "vitest";
import { isBookingOpen, validateTopic } from "../src/rules/bookingRules.js";

const NOW = new Date("2026-11-10T10:00:00+07:00");
const minutesLater = (m: number) => new Date(NOW.getTime() + m * 60000);

describe("F-03 booking rules", () => {
  it("TEST-20 booking closes 1 hour before the start", () => {
    expect(isBookingOpen(minutesLater(59), NOW)).toBe(false);
    expect(isBookingOpen(minutesLater(60), NOW)).toBe(true);
    expect(isBookingOpen(minutesLater(24 * 60), NOW)).toBe(true);
    expect(isBookingOpen(minutesLater(-30), NOW)).toBe(false);
  });

  it("TEST-21 topic must have 5 to 200 characters", () => {
    const error = "Topic must have 5 to 200 characters";
    expect(validateTopic("abcd")).toEqual({ ok: false, error });
    expect(validateTopic("abcde")).toEqual({ ok: true, topic: "abcde" });
    expect(validateTopic("x".repeat(200)).ok).toBe(true);
    expect(validateTopic("x".repeat(201))).toEqual({ ok: false, error });
    expect(validateTopic("        ")).toEqual({ ok: false, error });
    expect(validateTopic(undefined)).toEqual({ ok: false, error });
    // spaces around are removed before the check
    expect(validateTopic("  Limits  ")).toEqual({ ok: true, topic: "Limits" });
  });
});
