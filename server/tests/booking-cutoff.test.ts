// CH-09 (Lab 7): BR-10 v1.2, booking closes 3 hours before the start (was 1 hour).
// Written before the code change: TEST-92 to TEST-95 must fail on the pre-change commit.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { isBookingOpen } from "../src/rules/bookingRules.js";
import { HOUR, cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, hoursFromNow, inDays, insertBooking, insertSlot } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U;
let schedule: { id: number };
const students: U[] = [];

async function newStudent() {
  const s = await createUser("STUDENT");
  students.push(s);
  return s;
}
const MIN = 60 * 1000;
const slotIn = (ms: number) => insertSlot(schedule.id, tutor.id, hoursFromNow(ms / HOUR));
const activeCount = (slotId: number) => prisma.booking.count({ where: { slotId, status: "ACTIVE" } });
const book = (user: U, slotId: number) =>
  request(app).post("/api/bookings").set("Cookie", cookieFor(user)).send({ slotId, topic: "Prepare exercise 3" });

beforeAll(async () => {
  tutor = await createUser("STAFF");
  schedule = await createSchedule([tutor.id]);
});

afterAll(async () => {
  await deleteSchedules([schedule.id]);
  await deleteUsers([tutor.id, ...students.map((s) => s.id)]);
});

describe("CH-09 booking cutoff 3 hours (BR-10 v1.2)", () => {
  it("TEST-92 isBookingOpen: exactly 3 hours is open, 2:59 is closed (AC-66)", () => {
    const NOW = new Date("2026-11-10T10:00:00+07:00");
    const later = (m: number) => new Date(NOW.getTime() + m * MIN);
    expect(isBookingOpen(later(179), NOW)).toBe(false);
    expect(isBookingOpen(later(180), NOW)).toBe(true);
    expect(isBookingOpen(later(181), NOW)).toBe(true);
    expect(isBookingOpen(later(60), NOW)).toBe(false);
    expect(isBookingOpen(later(120), NOW)).toBe(false);
  });

  it("TEST-93 POST /api/bookings: slot in less than 3 hours gives 422, 3 h 05 gives 201 (AC-18, AC-66)", async () => {
    const student = await newStudent();
    for (const slot of [await slotIn(3 * HOUR - 2 * MIN), await slotIn(2 * HOUR)]) {
      const res = await book(student, slot.id);
      expect(res.status).toBe(422);
      expect(res.body).toEqual({
        error: "Booking is closed for this slot (less than 3 hours before the start)",
        code: "BOOKING_CLOSED",
      });
      expect(await activeCount(slot.id)).toBe(0);
    }
    const ok = await slotIn(3 * HOUR + 5 * MIN);
    const res = await book(student, ok.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "ACTIVE", slot: { id: ok.id }, student: { id: student.id } });
  });

  it("TEST-94 available slots hide slots that start in less than 3 hours (AC-14)", async () => {
    const student = await newStudent();
    const soon = await slotIn(2 * HOUR);
    const ok = await slotIn(3 * HOUR + 5 * MIN);
    const later = await insertSlot(schedule.id, tutor.id, inDays(2, "10:00"));

    const res = await request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(student));
    expect(res.status).toBe(200);
    const ids = res.body.map((s: { id: number }) => s.id);
    expect(ids).not.toContain(soon.id);
    expect(ids).toContain(ok.id);
    expect(ids).toContain(later.id);
    expect(ids.indexOf(ok.id)).toBeLessThan(ids.indexOf(later.id));
  });

  it("TEST-95 move: new slot in less than 3 hours gives 422 and nothing changes (AC-30)", async () => {
    const student = await newStudent();
    const old = await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(2, "15:00"))).id, student.id);
    const soon = await slotIn(2 * HOUR + 30 * MIN);
    const ok = await slotIn(3 * HOUR + 35 * MIN);

    const refused = await request(app).post(`/api/bookings/${old.id}/move`).set("Cookie", cookieFor(student)).send({ slotId: soon.id });
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe("BOOKING_CLOSED");
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({ status: "ACTIVE" });
    expect(await activeCount(soon.id)).toBe(0);

    const moved = await request(app).post(`/api/bookings/${old.id}/move`).set("Cookie", cookieFor(student)).send({ slotId: ok.id });
    expect(moved.status).toBe(201);
    expect(moved.body.slot.id).toBe(ok.id);
  });
});
