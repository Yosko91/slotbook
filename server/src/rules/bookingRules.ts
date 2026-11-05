export function isBookingOpen(_startsAt: Date, _now = new Date()): boolean {
  throw new Error("not implemented");
}

export function validateTopic(_topic: unknown): { ok: true; topic: string } | { ok: false; error: string } {
  throw new Error("not implemented");
}
