import { describe, expect, it } from "vitest";
import { canRecordAttendance, parseAttendance } from "../src/rules/attendanceRules.js";

describe("F-10 attendance rules", () => {
  it("TEST-77 attendance only after the start, only ATTENDED or NO_SHOW (BR-17)", () => {
    const now = new Date("2026-12-01T03:00:00Z");
    expect(canRecordAttendance(new Date(now.getTime() + 60000), now)).toBe(false);
    expect(canRecordAttendance(new Date(now.getTime() - 60000), now)).toBe(true);
    expect(canRecordAttendance(now, now)).toBe(true);

    expect(parseAttendance("ATTENDED")).toEqual({ ok: true, value: "ATTENDED" });
    expect(parseAttendance("NO_SHOW")).toEqual({ ok: true, value: "NO_SHOW" });
    expect(parseAttendance("attended")).toEqual({ ok: false, error: "Status must be ATTENDED or NO_SHOW" });
    expect(parseAttendance(undefined).ok).toBe(false);
  });
});
