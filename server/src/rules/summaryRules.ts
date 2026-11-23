// F-11: counts of a schedule for a period (FR-15). Days are Bangkok days, like F-08.
import { bangkokMidnight } from "./filterRules.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 92;
const DATE_ERROR = "Date must be in the format YYYY-MM-DD";

export interface SummaryCounts {
  open: number;
  booked: number;
  cancelled: number;
  attended: number;
  noShow: number;
}

type SlotWithBookings = { bookings: { status: "ACTIVE" | "CANCELLED"; attendance: "ATTENDED" | "NO_SHOW" | null }[] };

// Open = no active booking; Booked = an active booking; Cancelled = every cancelled booking
// (a move leaves one on the old slot); Attended / No-show = active bookings with this attendance
export function summarize(slots: SlotWithBookings[]): SummaryCounts {
  const counts: SummaryCounts = { open: 0, booked: 0, cancelled: 0, attended: 0, noShow: 0 };
  for (const slot of slots) {
    const active = slot.bookings.find((b) => b.status === "ACTIVE");
    if (active) counts.booked++;
    else counts.open++;
    counts.cancelled += slot.bookings.filter((b) => b.status === "CANCELLED").length;
    if (active?.attendance === "ATTENDED") counts.attended++;
    if (active?.attendance === "NO_SHOW") counts.noShow++;
  }
  return counts;
}

export type RangeCheck =
  | { ok: true; range: { from: string; to: string; startsFrom: Date; startsBefore: Date } }
  | { ok: false; details: Record<string, string> };

export function parseSummaryRange(query: Record<string, unknown>): RangeCheck {
  const details: Record<string, string> = {};
  const days: { from?: Date; to?: Date } = {};
  for (const key of ["from", "to"] as const) {
    const raw = query[key];
    if (raw === undefined || raw === "") {
      details[key] = key === "from" ? "From is required" : "To is required";
      continue;
    }
    const d = typeof raw === "string" ? bangkokMidnight(raw) : null;
    if (!d) details[key] = DATE_ERROR;
    else days[key] = d;
  }
  if (days.from && days.to) {
    if (days.from > days.to) details.from = "From must be before or equal to To";
    else if ((days.to.getTime() - days.from.getTime()) / DAY_MS + 1 > MAX_DAYS) details.to = "The period can be at most 92 days";
  }
  if (Object.keys(details).length > 0) return { ok: false, details };
  return {
    ok: true,
    range: { from: query.from as string, to: query.to as string, startsFrom: days.from!, startsBefore: new Date(days.to!.getTime() + DAY_MS) },
  };
}
