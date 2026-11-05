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
