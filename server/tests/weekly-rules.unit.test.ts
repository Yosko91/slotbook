import { describe, expect, it } from "vitest";
import { parseWeeks, planWeeklySlots, weeklyStarts } from "../src/rules/slotRules.js";

// fixed "now": Tue 10 Nov 2026 10:00 Bangkok time
const NOW = new Date("2026-11-10T10:00:00+07:00");
const bangkokTime = (d: Date) => new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(11, 16);

describe("F-09 weekly slot rules", () => {
  it("TEST-72 four weeks give 4 dates 7 days apart at the same Bangkok time; weeks after 60 days are refused (AC-51, AC-52)", () => {
    const starts = weeklyStarts(new Date("2026-11-17T10:00:00+07:00"), 4);
    expect(starts.map((d) => d.toISOString())).toEqual([
      "2026-11-17T03:00:00.000Z",
      "2026-11-24T03:00:00.000Z",
      "2026-12-01T03:00:00.000Z",
      "2026-12-08T03:00:00.000Z",
    ]);
    expect(starts.every((d) => bangkokTime(d) === "10:00")).toBe(true);

    const ok = planWeeklySlots({ startsAt: "2026-11-17T10:00:00+07:00", durationMinutes: 60, weeks: 4 }, NOW);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.slots.map((s) => s.endsAt.getTime() - s.startsAt.getTime())).toEqual([3600000, 3600000, 3600000, 3600000]);

    // start 20 days ahead, 8 weeks: weeks 7 and 8 are more than 60 days ahead (BR-07)
    const late = planWeeklySlots({ startsAt: "2026-11-30T10:00:00+07:00", durationMinutes: 30, weeks: 8 }, NOW);
    expect(late.ok).toBe(false);
    expect("weeks" in late && late.weeks.map((w) => w.week)).toEqual([7, 8]);
    expect("weeks" in late && late.weeks[0]?.error).toBe("Start time must be within the next 60 days");
  });

  it("TEST-72b weeks must be an integer from 2 to 8, and the first slot is checked like a normal slot (AC-53)", () => {
    expect([1, 9, "4", 2.5, null, undefined].map(parseWeeks)).toEqual([null, null, null, null, null, null]);
    expect([2, 8].map(parseWeeks)).toEqual([2, 8]);

    const bad = planWeeklySlots({ startsAt: "2026-11-17T10:00:00+07:00", durationMinutes: 45, weeks: 1 }, NOW);
    expect(bad).toEqual({
      ok: false,
      details: { weeks: "Weeks must be a whole number from 2 to 8", durationMinutes: "Length must be 30 or 60 minutes" },
    });
  });
});
