import { describe, expect, it } from "vitest";
import { parseAvailabilityFilter } from "../src/rules/filterRules.js";

describe("F-08 availability filter", () => {
  it("TEST-58 Bangkok days become UTC bounds, to is inclusive (NFR-07)", () => {
    const res = parseAvailabilityFilter({ from: "2026-12-01", to: "2026-12-01", tutorId: "4" });
    expect(res).toEqual({
      ok: true,
      filter: {
        startsFrom: new Date("2026-11-30T17:00:00.000Z"), // 1 Dec 00:00 Bangkok
        startsBefore: new Date("2026-12-01T17:00:00.000Z"), // 2 Dec 00:00 Bangkok
        tutorId: 4,
      },
    });
    expect(parseAvailabilityFilter({})).toEqual({ ok: true, filter: {} });
  });

  it("TEST-59 bad dates, from after to and bad tutorId give errors", () => {
    const bad = (q: Record<string, unknown>) => {
      const r = parseAvailabilityFilter(q);
      return r.ok ? null : r.details;
    };
    expect(bad({ from: "2026-13-01" })?.from).toBe("Date must be in the format YYYY-MM-DD");
    expect(bad({ to: "2026-02-30" })?.to).toBe("Date must be in the format YYYY-MM-DD");
    expect(bad({ from: "1/12/2026" })?.from).toBeDefined();
    expect(bad({ from: "2026-12-03", to: "2026-12-01" })?.from).toBe("From must be before or equal to To");
    expect(bad({ tutorId: "abc" })?.tutorId).toBe("tutorId must be a positive integer");
    expect(bad({ tutorId: "0" })?.tutorId).toBeDefined();
    expect(bad({ tutorId: ["1", "2"] })?.tutorId).toBeDefined();
  });
});
