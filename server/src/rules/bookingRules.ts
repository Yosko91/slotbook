const CLOSE_BEFORE_MS = 60 * 60 * 1000; // BR-10: booking closes 1 hour before start

export function isBookingOpen(startsAt: Date, now = new Date()) {
  return startsAt.getTime() - now.getTime() >= CLOSE_BEFORE_MS;
}

// BR-11
export function validateTopic(topic: unknown): { ok: true; topic: string } | { ok: false; error: string } {
  const value = typeof topic === "string" ? topic.trim() : "";
  if (value.length < 5 || value.length > 200) return { ok: false, error: "Topic must have 5 to 200 characters" };
  return { ok: true, topic: value };
}

const CHANGE_BEFORE_MS = 12 * 60 * 60 * 1000; // BR-15: cancel or move until 12 hours before start

export function canChangeBooking(startsAt: Date, now = new Date()) {
  return startsAt.getTime() - now.getTime() >= CHANGE_BEFORE_MS;
}

// F-04: required for a tutor (the student must know why), optional for a student
export function validateReason(
  reason: unknown,
  role: "STUDENT" | "STAFF"
): { ok: true; reason: string | null } | { ok: false; error: string } {
  if (reason !== undefined && reason !== null && typeof reason !== "string") {
    return { ok: false, error: "Reason must be a text" };
  }
  const value = typeof reason === "string" ? reason.trim() : "";
  if (role === "STAFF") {
    if (value.length < 5 || value.length > 200) return { ok: false, error: "Reason must have 5 to 200 characters" };
    return { ok: true, reason: value };
  }
  if (value.length > 200) return { ok: false, error: "Reason must have at most 200 characters" };
  return { ok: true, reason: value || null };
}
