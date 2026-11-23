export type SlotErrors = { startsAt?: string; durationMinutes?: string };

export type SlotCheck =
  | { ok: true; startsAt: Date; endsAt: Date }
  | { ok: false; errors: SlotErrors };

const LENGTHS = [30, 60]; // BR-05
const OPEN_MIN = 8 * 60; // BR-06, 08:00
const CLOSE_MIN = 20 * 60; // BR-06, 20:00
const MAX_DAYS = 60; // BR-07
const BANGKOK_OFFSET_MS = 7 * 3600 * 1000; // no daylight saving in Thailand (A-02)
const MINUTE = 60 * 1000;

// minutes since midnight in Bangkok time
function bangkokMinutes(d: Date) {
  const local = new Date(d.getTime() + BANGKOK_OFFSET_MS);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

export function validateSlot(input: { startsAt: unknown; durationMinutes: unknown }, now = new Date()): SlotCheck {
  const errors: SlotErrors = {};
  const length = input.durationMinutes;
  const lengthOk = typeof length === "number" && LENGTHS.includes(length);
  if (!lengthOk) errors.durationMinutes = "Length must be 30 or 60 minutes";

  const start = typeof input.startsAt === "string" && input.startsAt ? new Date(input.startsAt) : null;

  if (!start || isNaN(start.getTime())) {
    errors.startsAt = "Start time is required";
  } else if (start.getTime() % (30 * MINUTE) !== 0) {
    errors.startsAt = "Start time must be on the hour or half hour";
  } else if (start.getTime() <= now.getTime()) {
    errors.startsAt = "Start time must be in the future";
  } else if (start.getTime() - now.getTime() > MAX_DAYS * 24 * 60 * MINUTE) {
    errors.startsAt = "Start time must be within the next 60 days";
  } else if (lengthOk) {
    const from = bangkokMinutes(start);
    if (from < OPEN_MIN || from + (length as number) > CLOSE_MIN) {
      errors.startsAt = "The slot must be between 08:00 and 20:00 (Bangkok time)";
    }
  }

  if (errors.startsAt || errors.durationMinutes) return { ok: false, errors };
  return { ok: true, startsAt: start!, endsAt: new Date(start!.getTime() + (length as number) * MINUTE) };
}

// BR-08: two ranges overlap when each one starts before the other ends (touching is ok)
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

// F-09: weekly series (FR-13). Thailand has no daylight saving (A-02), so +7 days keeps the same local time.
const WEEK_MS = 7 * 24 * 60 * MINUTE;
const WEEKS_ERROR = "Weeks must be a whole number from 2 to 8";

export function parseWeeks(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 2 && value <= 8 ? value : null;
}

export function weeklyStarts(start: Date, weeks: number): Date[] {
  return Array.from({ length: weeks }, (_, k) => new Date(start.getTime() + k * WEEK_MS));
}

export type WeekError = { week: number; startsAt: string; error: string };
export type WeeklyPlan =
  | { ok: true; slots: { startsAt: Date; endsAt: Date }[] }
  | { ok: false; details: Record<string, string> }
  | { ok: false; weeks: WeekError[] };

// every week is checked with the same rules as one slot (BR-05 to BR-07); all or nothing
export function planWeeklySlots(input: { startsAt: unknown; durationMinutes: unknown; weeks: unknown }, now = new Date()): WeeklyPlan {
  const weeks = parseWeeks(input.weeks);
  const first = validateSlot({ startsAt: input.startsAt, durationMinutes: input.durationMinutes }, now);
  // a later week can only fail on the date limit, so the format errors come from the first slot
  const firstFormat = !first.ok && first.errors.startsAt === "Start time must be within the next 60 days" && !first.errors.durationMinutes;
  if (weeks === null || (!first.ok && !firstFormat)) {
    const details: Record<string, string> = {};
    if (weeks === null) details.weeks = WEEKS_ERROR;
    if (!first.ok) Object.assign(details, first.errors);
    return { ok: false, details };
  }

  const start = new Date(input.startsAt as string);
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  const failed: WeekError[] = [];
  weeklyStarts(start, weeks).forEach((d, k) => {
    const check = validateSlot({ startsAt: d.toISOString(), durationMinutes: input.durationMinutes }, now);
    if (check.ok) slots.push({ startsAt: check.startsAt, endsAt: check.endsAt });
    else failed.push({ week: k + 1, startsAt: d.toISOString(), error: check.errors.startsAt ?? check.errors.durationMinutes ?? "Not valid" });
  });
  return failed.length > 0 ? { ok: false, weeks: failed } : { ok: true, slots };
}
