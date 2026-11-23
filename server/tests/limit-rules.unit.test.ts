import { describe, expect, it } from "vitest";
import { checkStudentLimits } from "../src/rules/bookingRules.js";

const now = new Date("2026-12-01T03:00:00Z");
// a range that starts some hours after now and lasts some minutes
const range = (hours: number, minutes = 30) => {
  const startsAt = new Date(now.getTime() + hours * 3600000);
  return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60000) };
};

describe("F-07 booking limits", () => {
  it("TEST-52 at most 3 active upcoming bookings, past ones do not count (BR-13)", () => {
    const target = range(100);
    expect(checkStudentLimits([range(10), range(20)], target, now)).toEqual({ ok: true });

    const full = checkStudentLimits([range(10), range(20), range(30)], target, now);
    expect(full).toMatchObject({ ok: false, status: 422, code: "BOOKING_LIMIT" });

    // the slot of one booking started 1 hour ago and is not finished: it is not upcoming
    const onePast = checkStudentLimits([range(-1, 120), range(20), range(30)], target, now);
    expect(onePast).toEqual({ ok: true });
  });

  it("TEST-53 no overlap with another active booking, touching is ok (BR-14)", () => {
    const existing = [range(10, 60)]; // 10:00 to 11:00 (relative)
    const overlap = checkStudentLimits(existing, range(10.5, 30), now);
    expect(overlap).toMatchObject({ ok: false, status: 409, code: "BOOKING_OVERLAP" });
    expect(checkStudentLimits(existing, range(11, 30), now)).toEqual({ ok: true });
    expect(checkStudentLimits(existing, range(9.5, 30), now)).toEqual({ ok: true });
  });
});
