// F-08: filters of the available slots. Days are Bangkok days (NFR-07, UTC+7 all year, A-02).
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_ERROR = "Date must be in the format YYYY-MM-DD";

export interface AvailabilityFilter {
  startsFrom?: Date;
  startsBefore?: Date;
  tutorId?: number;
}

export type FilterCheck =
  | { ok: true; filter: AvailabilityFilter }
  | { ok: false; details: Record<string, string> };

// "2026-12-01" -> 2026-12-01 00:00 in Bangkok, or null when it is not a real date
export function bangkokMidnight(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00+07:00`);
  if (isNaN(d.getTime())) return null;
  // refuses 2026-02-30 (JavaScript would make it 2 March)
  const back = new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return back === value ? d : null;
}

export function parseAvailabilityFilter(query: Record<string, unknown>): FilterCheck {
  const details: Record<string, string> = {};
  const filter: AvailabilityFilter = {};

  for (const key of ["from", "to"] as const) {
    const raw = query[key];
    if (raw === undefined || raw === "") continue;
    const day = typeof raw === "string" ? bangkokMidnight(raw) : null;
    if (!day) details[key] = DATE_ERROR;
    else if (key === "from") filter.startsFrom = day;
    else filter.startsBefore = new Date(day.getTime() + DAY_MS); // "to" is inclusive
  }

  if (filter.startsFrom && filter.startsBefore && filter.startsFrom.getTime() >= filter.startsBefore.getTime()) {
    details.from = "From must be before or equal to To";
  }

  const rawTutor = query.tutorId;
  if (rawTutor !== undefined && rawTutor !== "") {
    const n = typeof rawTutor === "string" && /^\d+$/.test(rawTutor) ? Number(rawTutor) : NaN;
    if (!Number.isSafeInteger(n) || n <= 0) details.tutorId = "tutorId must be a positive integer";
    else filter.tutorId = n;
  }

  return Object.keys(details).length > 0 ? { ok: false, details } : { ok: true, filter };
}
