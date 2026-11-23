import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, inDays, insertBooking, insertSlot } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U, student: U;
let schedule: { id: number }, otherSchedule: { id: number };

// a Bangkok day as YYYY-MM-DD, some days from today
const day = (days: number) => new Date(Date.now() + 7 * 3600 * 1000 + days * 24 * 3600 * 1000).toISOString().slice(0, 10);

beforeAll(async () => {
  tutor = await createUser("STAFF");
  otherTutor = await createUser("STAFF");
  student = await createUser("STUDENT");
  schedule = await createSchedule([tutor.id]);
  otherSchedule = await createSchedule([otherTutor.id]);
});

afterAll(async () => {
  await deleteSchedules([schedule.id, otherSchedule.id]);
  await deleteUsers([tutor.id, otherTutor.id, student.id]);
});

const getSummary = (user: U | null, scheduleId: number, query: string) => {
  const req = request(app).get(`/api/staff/schedules/${scheduleId}/summary${query}`);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};

describe("F-11 appointment summary API", () => {
  it("TEST-85 known data gives the expected numbers; removed slot not counted; a move is 1 cancelled + 1 booked (AC-60, AC-61)", async () => {
    const s = schedule.id, t = tutor.id;
    await insertSlot(s, t, inDays(2, "08:00")); // A open
    await insertBooking((await insertSlot(s, t, inDays(2, "09:00"))).id, student.id); // B booked
    const c = await insertBooking((await insertSlot(s, t, inDays(-1, "10:00"))).id, student.id); // C past, attended
    const d = await insertBooking((await insertSlot(s, t, inDays(-1, "11:00"))).id, student.id); // D past, no-show
    await prisma.booking.update({ where: { id: c.id }, data: { attendance: "ATTENDED", attendanceAt: new Date() } });
    await prisma.booking.update({ where: { id: d.id }, data: { attendance: "NO_SHOW", attendanceAt: new Date() } });
    await insertBooking((await insertSlot(s, t, inDays(2, "10:00"))).id, student.id, "CANCELLED"); // E open again, 1 cancelled
    // F removed slot with a cancelled booking: not counted at all
    const removed = await insertSlot(s, t, inDays(2, "11:00"));
    await insertBooking(removed.id, student.id, "CANCELLED");
    await prisma.slot.update({ where: { id: removed.id }, data: { removedAt: new Date() } });
    // G -> H: a real move through the API
    const g = await insertBooking((await insertSlot(s, t, inDays(3, "10:00"))).id, student.id);
    const h = await insertSlot(s, t, inDays(3, "11:00"));
    const moved = await request(app).post(`/api/bookings/${g.id}/move`).set("Cookie", cookieFor(student)).send({ slotId: h.id });
    expect(moved.status).toBe(201);
    // X outside the period
    await insertBooking((await insertSlot(s, t, inDays(10, "10:00"))).id, student.id);

    const res = await getSummary(tutor, s, `?from=${day(-3)}&to=${day(5)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ from: day(-3), to: day(5), open: 3, booked: 4, cancelled: 2, attended: 1, noShow: 1 });
  });

  it("TEST-86 missing from, bad date, from after to, 93 days give 400 (AC-62)", async () => {
    for (const q of [`?to=${day(1)}`, `?from=2026-13-01&to=${day(1)}`, `?from=${day(5)}&to=${day(1)}`, `?from=${day(0)}&to=${day(92)}`]) {
      const res = await getSummary(tutor, schedule.id, q);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    }
    expect((await getSummary(tutor, schedule.id, `?from=${day(0)}&to=${day(91)}`)).status).toBe(200);
  });

  it("TEST-87 other tutor 403, student 403, anonymous 401 (AC-63)", async () => {
    const q = `?from=${day(-3)}&to=${day(5)}`;
    expect((await getSummary(otherTutor, schedule.id, q)).status).toBe(403);
    expect((await getSummary(student, schedule.id, q)).status).toBe(403);
    expect((await getSummary(null, schedule.id, q)).status).toBe(401);
  });
});
