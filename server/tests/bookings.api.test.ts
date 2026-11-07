import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, inDays } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U, studentA: U, studentB: U;
let schedule: { id: number }, otherSchedule: { id: number };

// slots are inserted directly, so a test can also make a slot that starts soon or in the past
function makeSlot(startsAt: Date, minutes = 30) {
  return prisma.slot.create({
    data: { scheduleId: schedule.id, tutorId: tutor.id, startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60000) },
  });
}

const book = (user: U | null, body: object) => {
  const req = request(app).post("/api/bookings").send(body);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};

const activeCount = (slotId: number) => prisma.booking.count({ where: { slotId, status: "ACTIVE" } });

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

describe("F-03 booking API", () => {
  let openSlot: { id: number }, bookingId: number;

  it("GET /api/schedules lists the schedules for a student", async () => {
    const res = await request(app).get("/api/schedules").set("Cookie", cookieFor(studentA));
    expect(res.status).toBe(200);
    expect(res.body.some((s: { id: number }) => s.id === schedule.id)).toBe(true);
  });

  it("TEST-22 available slots: only open slots that start in 1 hour or more", async () => {
    openSlot = await makeSlot(inDays(2, "10:00"));
    const booked = await makeSlot(inDays(2, "11:00"));
    await prisma.booking.create({ data: { slotId: booked.id, studentId: studentB.id, topic: "Already booked" } });
    await makeSlot(new Date(Date.now() + 30 * 60000));

    const res = await request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(studentA));
    expect(res.status).toBe(200);
    expect(res.body.map((s: { id: number }) => s.id)).toEqual([openSlot.id]);
    expect(res.body[0].tutor).toEqual({ id: tutor.id, name: tutor.name });
  });

  it("TEST-23 student books an open slot and sees it in his bookings", async () => {
    const res = await book(studentA, { slotId: openSlot.id, topic: "Integration by parts, exercise 3" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "ACTIVE", topic: "Integration by parts, exercise 3", student: { id: studentA.id } });
    expect(res.body.slot.id).toBe(openSlot.id);
    bookingId = res.body.id;

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(row).toMatchObject({ studentId: studentA.id, slotId: openSlot.id, status: "ACTIVE" });

    const mine = await request(app).get("/api/bookings/mine").set("Cookie", cookieFor(studentA));
    expect(mine.body.map((b: { id: number }) => b.id)).toContain(bookingId);

    const available = await request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(studentA));
    expect(available.body.map((s: { id: number }) => s.id)).not.toContain(openSlot.id);
  });

  it("TEST-24 booking a booked slot gives 409 and still one booking", async () => {
    const res = await book(studentB, { slotId: openSlot.id, topic: "Can I join too?" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "This slot is already booked", code: "SLOT_TAKEN" });
    expect(await activeCount(openSlot.id)).toBe(1);
  });

  it("TEST-25 two students at the same time: one 201, one 409", async () => {
    const slot = await makeSlot(inDays(3, "15:00"));
    const results = await Promise.all([
      book(studentA, { slotId: slot.id, topic: "Derivatives" }),
      book(studentB, { slotId: slot.id, topic: "Chain rule" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await activeCount(slot.id)).toBe(1);
  });

  it("TEST-26 slot starting in less than 1 hour or in the past gives 422", async () => {
    const soon = await makeSlot(new Date(Date.now() + 30 * 60000));
    const past = await makeSlot(new Date(Date.now() - 2 * 3600000));

    for (const slot of [soon, past]) {
      const res = await book(studentA, { slotId: slot.id, topic: "Last minute question" });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("BOOKING_CLOSED");
      expect(await activeCount(slot.id)).toBe(0);
    }
  });

  it("TEST-27 bad topic gives 400, unknown slot gives 404", async () => {
    const slot = await makeSlot(inDays(4, "09:00"));
    const short = await book(studentA, { slotId: slot.id, topic: "abc" });
    expect(short.status).toBe(400);
    expect(short.body.details.topic).toBe("Topic must have 5 to 200 characters");
    expect(await activeCount(slot.id)).toBe(0);

    const noSlot = await book(studentA, { topic: "Some topic" });
    expect(noSlot.status).toBe(400);
    expect(noSlot.body.details.slotId).toBe("slotId is required");

    const unknown = await book(studentA, { slotId: 99999999, topic: "Some topic" });
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({ error: "Slot not found" });
  });

  it("TEST-28 a booking is visible only to its student and the tutors of the schedule", async () => {
    const asOther = await request(app).get(`/api/bookings/${bookingId}`).set("Cookie", cookieFor(studentB));
    expect(asOther.status).toBe(404);
    expect(asOther.body).toEqual({ error: "Booking not found" });

    const asOwner = await request(app).get(`/api/bookings/${bookingId}`).set("Cookie", cookieFor(studentA));
    expect(asOwner.status).toBe(200);

    const asTutor = await request(app).get(`/api/bookings/${bookingId}`).set("Cookie", cookieFor(tutor));
    expect(asTutor.status).toBe(200);
    expect(asTutor.body.student.name).toBe("Student A");

    const asOtherTutor = await request(app).get(`/api/bookings/${bookingId}`).set("Cookie", cookieFor(otherTutor));
    expect(asOtherTutor.status).toBe(404);

    const mineB = await request(app).get("/api/bookings/mine").set("Cookie", cookieFor(studentB));
    expect(mineB.body.map((b: { id: number }) => b.id)).not.toContain(bookingId);
  });

  it("TEST-29 tutor cannot book (403) and anonymous gets 401", async () => {
    const slot = await makeSlot(inDays(4, "11:00"));
    expect((await book(tutor, { slotId: slot.id, topic: "Tutor trying" })).status).toBe(403);
    expect((await book(null, { slotId: slot.id, topic: "Nobody trying" })).status).toBe(401);
    expect(await activeCount(slot.id)).toBe(0);

    const mine = await request(app).get("/api/bookings/mine").set("Cookie", cookieFor(tutor));
    expect(mine.status).toBe(403);
  });

  it("TEST-18 tutor list shows Booked with the student and topic", async () => {
    const res = await request(app).get(`/api/staff/schedules/${schedule.id}/slots`).set("Cookie", cookieFor(tutor));
    const booked = res.body.find((s: { id: number }) => s.id === openSlot.id);
    expect(booked.status).toBe("BOOKED");
    expect(booked.booking).toMatchObject({ id: bookingId, topic: "Integration by parts, exercise 3", student: { name: "Student A" } });
    expect(res.body.some((s: { status: string }) => s.status === "OPEN")).toBe(true);
  });
});
