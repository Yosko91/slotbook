// F-10, BR-17: attendance can be recorded only after the slot started, once
export function canRecordAttendance(startsAt: Date, now = new Date()) {
  return startsAt.getTime() <= now.getTime();
}

export function parseAttendance(value: unknown): { ok: true; value: "ATTENDED" | "NO_SHOW" } | { ok: false; error: string } {
  if (value === "ATTENDED" || value === "NO_SHOW") return { ok: true, value };
  return { ok: false, error: "Status must be ATTENDED or NO_SHOW" };
}
