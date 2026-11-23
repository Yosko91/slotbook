import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, hoursFromNow, inDays, insertBooking, insertSlot } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U;
let schedule: { id: number }, otherSchedule: { id: number };
const students: U[] = [];

async function newStudent() {
  const s = await createUser("STUDENT");
  students.push(s);
  return s;
}

const book = (user: U, slotId: number) =>
  request(app).post("/api/bookings").set("Cookie", cookieFor(user)).send({ slotId, topic: "Help with exercises" });
const activeOf = (studentId: number) => prisma.booking.count({ where: { studentId, status: "ACTIVE" } });

beforeAll(async () => {
  tutor = await createUser("STAFF");
  otherTutor = await createUser("STAFF");
  schedule = await createSchedule([tutor.id]);
  otherSchedule = await createSchedule([otherTutor.id]);
});

afterAll(async () => {
  await deleteSchedules([schedule.id, otherSchedule.id]);
  await deleteUsers([tutor.id, otherTutor.id, ...students.map((s) => s.id)]);
});

describe("F-07 booking limits", () => {
  it("TEST-54 a 4th active upcoming booking gives 422, after a cancel it works (AC-38)", async () => {
    const student = await newStudent();
    const first = await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(2, "08:00"))).id, student.id);
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(2, "09:00"))).id, student.id);
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(2, "10:00"))).id, student.id);
    const fourth = await insertSlot(schedule.id, tutor.id, inDays(2, "11:00"));

    const refused = await book(student, fourth.id);
    expect(refused.status).toBe(422);
    expect(refused.body).toEqual({
      error: "You already have 3 upcoming bookings. Cancel one before you book another.",
      code: "BOOKING_LIMIT",
    });
    expect(await prisma.booking.count({ where: { slotId: fourth.id } })).toBe(0);

    const cancelled = await request(app).post(`/api/bookings/${first.id}/cancel`).set("Cookie", cookieFor(student)).send({});
    expect(cancelled.status).toBe(200);
    expect((await book(student, fourth.id)).status).toBe(201);
    expect(await activeOf(student.id)).toBe(3);
  });

  it("TEST-55 cancelled and past bookings do not count (AC-39)", async () => {
    const student = await newStudent();
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(3, "08:00"))).id, student.id);
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(3, "09:00"))).id, student.id);
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(3, "10:00"))).id, student.id, "CANCELLED");
    await insertBooking((await insertSlot(schedule.id, tutor.id, hoursFromNow(-3))).id, student.id);
    const slot = await insertSlot(schedule.id, tutor.id, inDays(3, "11:00"));

    expect((await book(student, slot.id)).status).toBe(201);
  });

  it("TEST-56 overlap with an own booking in another schedule gives 409, touching is ok (AC-40)", async () => {
    const student = await newStudent();
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(4, "10:00"), 60)).id, student.id);
    const overlapping = await insertSlot(otherSchedule.id, otherTutor.id, inDays(4, "10:30"));
    const touching = await insertSlot(otherSchedule.id, otherTutor.id, inDays(4, "11:00"));

    const refused = await book(student, overlapping.id);
    expect(refused.status).toBe(409);
    expect(refused.body).toEqual({ error: "You already have a booking at this time", code: "BOOKING_OVERLAP" });
    expect(await prisma.booking.count({ where: { slotId: overlapping.id } })).toBe(0);

    expect((await book(student, touching.id)).status).toBe(201);
  });

  it("TEST-57 two bookings at the same time cannot pass the limit together (AC-41)", async () => {
    const student = await newStudent();
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(5, "08:00"))).id, student.id);
    await insertBooking((await insertSlot(schedule.id, tutor.id, inDays(5, "09:00"))).id, student.id);
    const a = await insertSlot(schedule.id, tutor.id, inDays(5, "10:00"));
    const b = await insertSlot(schedule.id, tutor.id, inDays(5, "11:00"));

    const results = await Promise.all([book(student, a.id), book(student, b.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(await activeOf(student.id)).toBe(3);
  });
});
