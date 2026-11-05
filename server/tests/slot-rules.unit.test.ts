import { describe, expect, it } from "vitest";
import { overlaps, validateSlot } from "../src/rules/slotRules.js";

// fixed "now": 10 Nov 2026 10:00 Bangkok time
const NOW = new Date("2026-11-10T10:00:00+07:00");
const at = (iso: string) => new Date(iso);

function errorsOf(startsAt: string, durationMinutes: unknown) {
  const r = validateSlot({ startsAt, durationMinutes }, NOW);
  return r.ok ? {} : r.errors;
}

describe("F-02 slot rules", () => {
  it("TEST-09 length must be 30 or 60 and start on :00 or :30", () => {
    expect(errorsOf("2026-11-11T10:00:00+07:00", 45).durationMinutes).toBe("Length must be 30 or 60 minutes");
    expect(errorsOf("2026-11-11T10:15:00+07:00", 30).startsAt).toBe("Start time must be on the hour or half hour");
    expect(validateSlot({ startsAt: "2026-11-11T10:30:00+07:00", durationMinutes: 60 }, NOW).ok).toBe(true);
  });

  it("TEST-09b missing or bad start time", () => {
    expect(errorsOf("", 30).startsAt).toBe("Start time is required");
    expect(errorsOf("not a date", 30).startsAt).toBe("Start time is required");
  });

  it("TEST-10 start must be in the future and at most 60 days ahead", () => {
    expect(errorsOf("2026-11-10T09:00:00+07:00", 30).startsAt).toBe("Start time must be in the future");
    expect(errorsOf("2027-01-09T10:30:00+07:00", 30).startsAt).toBe("Start time must be within the next 60 days");
    // exactly 60 days later is still ok
    expect(validateSlot({ startsAt: "2027-01-09T10:00:00+07:00", durationMinutes: 30 }, NOW).ok).toBe(true);
  });

  it("TEST-11 slot must be inside 08:00 - 20:00 Bangkok time", () => {
    const msg = "The slot must be between 08:00 and 20:00 (Bangkok time)";
    expect(errorsOf("2026-11-11T07:30:00+07:00", 30).startsAt).toBe(msg);
    expect(validateSlot({ startsAt: "2026-11-11T08:00:00+07:00", durationMinutes: 30 }, NOW).ok).toBe(true);
    expect(validateSlot({ startsAt: "2026-11-11T19:30:00+07:00", durationMinutes: 30 }, NOW).ok).toBe(true);
    expect(errorsOf("2026-11-11T19:30:00+07:00", 60).startsAt).toBe(msg);
  });

  it("valid slot gives the end time", () => {
    const r = validateSlot({ startsAt: "2026-11-11T13:00:00+07:00", durationMinutes: 60 }, NOW);
    expect(r).toEqual({ ok: true, startsAt: at("2026-11-11T06:00:00Z"), endsAt: at("2026-11-11T07:00:00Z") });
  });

  it("TEST-12 overlap is true only when the times really cross", () => {
    const s = at("2026-11-11T10:00:00+07:00");
    const e = at("2026-11-11T11:00:00+07:00");
    expect(overlaps(s, e, at("2026-11-11T10:30:00+07:00"), at("2026-11-11T11:00:00+07:00"))).toBe(true);
    expect(overlaps(s, e, at("2026-11-11T09:30:00+07:00"), at("2026-11-11T12:00:00+07:00"))).toBe(true);
    // touching slots are ok
    expect(overlaps(s, e, at("2026-11-11T11:00:00+07:00"), at("2026-11-11T11:30:00+07:00"))).toBe(false);
    expect(overlaps(s, e, at("2026-11-11T09:30:00+07:00"), at("2026-11-11T10:00:00+07:00"))).toBe(false);
  });
});
