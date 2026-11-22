import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import {
  cookieFor,
  createSchedule,
  createUser,
  deleteSchedules,
  deleteUsers,
  hoursFromNow,
  inDays,
  insertBooking,
  insertSlot,
} from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U, studentA: U, studentB: U;
let schedule: { id: number }, otherSchedule: { id: number };

const cancel = (user: U | null, bookingId: number, body: object = {}) => {
  const req = request(app).post(`/api/bookings/${bookingId}/cancel`).send(body);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};
const status = async (id: number) => (await prisma.booking.findUniqueOrThrow({ where: { id } })).status;

beforeAll(async () => {
  tutor = await createUser("STAFF");
  otherTutor = await createUser("STAFF");
  studentA = await createUser("STUDENT", "Student A");
  studentB = await createUser("STUDENT", "Student B");
  schedule = await createSchedule([tutor.id]);
  otherSchedule = await createSchedule([otherTutor.id]);
});

afterAll(async () => {
  await deleteSchedules([schedule.id, otherSchedule.id]);
  await deleteUsers([tutor.id, otherTutor.id, studentA.id, studentB.id]);
});

describe("F-04 cancel a booking", () => {
  it("TEST-34 student cancels his booking 12 hours or more before the start (AC-22)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, inDays(2, "10:00"));
    const booking = await insertBooking(slot.id, studentA.id);

    const res = await cancel(studentA, booking.id, { reason: "I have an exam" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: booking.id, status: "CANCELLED", cancelledBy: "STUDENT", cancelReason: "I have an exam" });

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row.status).toBe("CANCELLED");
    expect(row.cancelledByRole).toBe("STUDENT");
    expect(row.cancelledAt).toBeInstanceOf(Date);

    const available = await request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(studentA));
    expect(available.body.map((s: { id: number }) => s.id)).toContain(slot.id);

    const mine = await request(app).get("/api/bookings/mine").set("Cookie", cookieFor(studentA));
    expect(mine.body.find((b: { id: number }) => b.id === booking.id)?.status).toBe("CANCELLED");
  });

  it("TEST-35 student cancel less than 12 hours before the start gives 422 (AC-23)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, hoursFromNow(11));
    const booking = await insertBooking(slot.id, studentA.id);

    const res = await cancel(studentA, booking.id);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("CANCEL_CLOSED");
    expect(await status(booking.id)).toBe("ACTIVE");
  });

  it("TEST-36 tutor cancels with a required reason, not after the start (AC-24)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, hoursFromNow(5));
    const booking = await insertBooking(slot.id, studentA.id);

    const noReason = await cancel(tutor, booking.id, {});
    expect(noReason.status).toBe(400);
    expect(noReason.body.details.reason).toBeDefined();
    expect(await status(booking.id)).toBe("ACTIVE");

    // 5 hours before the start: too late for a student, still ok for the tutor
    const ok = await cancel(tutor, booking.id, { reason: "Tutor is sick" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: "CANCELLED", cancelledBy: "STAFF", cancelReason: "Tutor is sick" });

    const started = await insertSlot(schedule.id, tutor.id, hoursFromNow(-10 / 60));
    const startedBooking = await insertBooking(started.id, studentB.id);
    const late = await cancel(tutor, startedBooking.id, { reason: "Tutor is sick" });
    expect(late.status).toBe(422);
    expect(late.body.code).toBe("SLOT_STARTED");
    expect(await status(startedBooking.id)).toBe("ACTIVE");
  });

  it("TEST-37 a booking that is already cancelled gives 409 (AC-25)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, inDays(3, "10:00"));
    const booking = await insertBooking(slot.id, studentA.id, "CANCELLED");

    const res = await cancel(studentA, booking.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("BOOKING_NOT_ACTIVE");
  });

  it("TEST-38 other student and tutor of another schedule get 404, anonymous 401 (AC-26)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, inDays(3, "11:00"));
    const booking = await insertBooking(slot.id, studentA.id);

    const asB = await cancel(studentB, booking.id);
    expect(asB.status).toBe(404);
    expect(asB.body).toEqual({ error: "Booking not found" });
    expect((await cancel(otherTutor, booking.id, { reason: "Not my schedule" })).status).toBe(404);
    expect((await cancel(null, booking.id)).status).toBe(401);
    expect((await cancel(studentA, 999999)).status).toBe(404);
    expect(await status(booking.id)).toBe("ACTIVE");
  });

  it("TEST-39 after a cancel another student can book the same slot (AC-27)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, inDays(4, "10:00"));
    const booking = await insertBooking(slot.id, studentA.id);
    expect((await cancel(studentA, booking.id)).status).toBe(200);

    const res = await request(app)
      .post("/api/bookings")
      .set("Cookie", cookieFor(studentB))
      .send({ slotId: slot.id, topic: "Limits and continuity" });
    expect(res.status).toBe(201);
    expect(await prisma.booking.count({ where: { slotId: slot.id, status: "ACTIVE" } })).toBe(1);
  });
});
