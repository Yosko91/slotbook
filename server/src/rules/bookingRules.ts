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
