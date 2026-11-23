import { describe, expect, it } from "vitest";
import { parseSummaryRange, summarize } from "../src/rules/summaryRules.js";

const b = (status: "ACTIVE" | "CANCELLED", attendance: "ATTENDED" | "NO_SHOW" | null = null) => ({ status, attendance });

describe("F-11 summary rules", () => {
  it("TEST-84 five numbers: open, booked, cancelled, attended, no-show (AC-60, AC-61)", () => {
    const slots = [
      { bookings: [] }, // open
      { bookings: [b("ACTIVE")] }, // booked
      { bookings: [b("ACTIVE", "ATTENDED")] }, // booked + attended
      { bookings: [b("ACTIVE", "NO_SHOW")] }, // booked + no-show
      { bookings: [b("CANCELLED")] }, // open again + 1 cancelled
      { bookings: [b("CANCELLED"), b("CANCELLED"), b("ACTIVE")] }, // booked + 2 cancelled
    ];
    expect(summarize(slots)).toEqual({ open: 2, booked: 4, cancelled: 3, attended: 1, noShow: 1 });
    expect(summarize([])).toEqual({ open: 0, booked: 0, cancelled: 0, attended: 0, noShow: 0 });
  });

  it("TEST-84b the range needs from and to, from <= to, at most 92 days (AC-62)", () => {
    const ok = parseSummaryRange({ from: "2026-11-01", to: "2026-11-30" });
    expect(ok.ok && [ok.range.startsFrom.toISOString(), ok.range.startsBefore.toISOString()]).toEqual([
      "2026-10-31T17:00:00.000Z",
      "2026-11-30T17:00:00.000Z",
    ]);
    expect(parseSummaryRange({ from: "2026-11-01", to: "2027-01-31" }).ok).toBe(true); // 92 days
    expect(parseSummaryRange({ to: "2026-11-30" })).toEqual({ ok: false, details: { from: "From is required" } });
    expect(parseSummaryRange({ from: "2026-02-30", to: "2026-03-01" })).toEqual({ ok: false, details: { from: "Date must be in the format YYYY-MM-DD" } });
    expect(parseSummaryRange({ from: "2026-11-30", to: "2026-11-01" })).toEqual({ ok: false, details: { from: "From must be before or equal to To" } });
    expect(parseSummaryRange({ from: "2026-11-01", to: "2027-02-01" })).toEqual({ ok: false, details: { to: "The period can be at most 92 days" } });
  });
});
