export type SlotErrors = { startsAt?: string; durationMinutes?: string };

export type SlotCheck =
  | { ok: true; startsAt: Date; endsAt: Date }
  | { ok: false; errors: SlotErrors };

export function validateSlot(_input: { startsAt: unknown; durationMinutes: unknown }, _now = new Date()): SlotCheck {
  throw new Error("not implemented");
}

export function overlaps(_aStart: Date, _aEnd: Date, _bStart: Date, _bEnd: Date): boolean {
  throw new Error("not implemented");
}
