import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, hoursFromNow, inDays, insertBooking, insertSlot } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U, student: U;
let schedule: { id: number }, otherSchedule: { id: number };

const remove = (user: U | null, slotId: number) => {
  const req = request(app).delete(`/api/staff/slots/${slotId}`);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};
const removedAt = async (id: number) => (await prisma.slot.findUniqueOrThrow({ where: { id } })).removedAt;

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

describe("F-06 remove an open slot", () => {
  it("TEST-47 tutor removes an open slot: it is in no list and cannot be booked (AC-34)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, inDays(2, "10:00"));

    const res = await remove(tutor, slot.id);
    expect(res.status).toBe(204);
    expect(await removedAt(slot.id)).toBeInstanceOf(Date);

    const staffList = await request(app).get(`/api/staff/schedules/${schedule.id}/slots`).set("Cookie", cookieFor(tutor));
    expect(staffList.body.map((s: { id: number }) => s.id)).not.toContain(slot.id);
    const available = await request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(student));
    expect(available.body.map((s: { id: number }) => s.id)).not.toContain(slot.id);

    const book = await request(app).post("/api/bookings").set("Cookie", cookieFor(student)).send({ slotId: slot.id, topic: "Removed slot" });
    expect(book.status).toBe(404);
    expect(await prisma.booking.count({ where: { slotId: slot.id } })).toBe(0);
  });

  it("TEST-48 a slot with an active booking cannot be removed, a cancelled booking does not block (AC-35)", async () => {
    const booked = await insertSlot(schedule.id, tutor.id, inDays(2, "11:00"));
    await insertBooking(booked.id, student.id);
    const res = await remove(tutor, booked.id);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "This slot has an active booking. Cancel the booking first.", code: "SLOT_HAS_BOOKING" });
    expect(await removedAt(booked.id)).toBeNull();

    const wasCancelled = await insertSlot(schedule.id, tutor.id, inDays(2, "12:00"));
    const cancelled = await insertBooking(wasCancelled.id, student.id, "CANCELLED");
    expect((await remove(tutor, wasCancelled.id)).status).toBe(204);
    // soft delete: the cancelled booking is still there for the history
    expect(await prisma.booking.findUnique({ where: { id: cancelled.id } })).not.toBeNull();
  });

  it("TEST-49 a slot that has started gives 422 (AC-36)", async () => {
    const started = await insertSlot(schedule.id, tutor.id, hoursFromNow(-10 / 60));
    const res = await remove(tutor, started.id);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("SLOT_STARTED");
    expect(await removedAt(started.id)).toBeNull();
  });

  it("TEST-50 other tutor 403, student 403, anonymous 401, unknown or removed 404 (AC-37)", async () => {
    const slot = await insertSlot(schedule.id, tutor.id, inDays(3, "10:00"));

    expect((await remove(otherTutor, slot.id)).status).toBe(403);
    expect((await remove(student, slot.id)).status).toBe(403);
    expect((await remove(null, slot.id)).status).toBe(401);
    expect((await remove(tutor, 999999)).status).toBe(404);
    expect(await removedAt(slot.id)).toBeNull();

    expect((await remove(tutor, slot.id)).status).toBe(204);
    const again = await remove(tutor, slot.id);
    expect(again.status).toBe(404);
    expect(again.body).toEqual({ error: "Slot not found" });
  });

  it("TEST-51 after a remove the tutor can create a slot at the same time (AC-37)", async () => {
    const start = inDays(4, "10:00");
    const slot = await insertSlot(schedule.id, tutor.id, start);
    expect((await remove(tutor, slot.id)).status).toBe(204);

    const res = await request(app)
      .post(`/api/staff/schedules/${schedule.id}/slots`)
      .set("Cookie", cookieFor(tutor))
      .send({ startsAt: start.toISOString(), durationMinutes: 30 });
    expect(res.status).toBe(201);
  });
});
