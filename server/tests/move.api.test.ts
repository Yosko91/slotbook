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

const move = (user: U | null, bookingId: number, body: object) => {
  const req = request(app).post(`/api/bookings/${bookingId}/move`).send(body);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};
const row = (id: number) => prisma.booking.findUniqueOrThrow({ where: { id } });
const slotAt = (day: number, time: string, minutes = 30) => insertSlot(schedule.id, tutor.id, inDays(day, time), minutes);

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

describe("F-05 move a booking", () => {
  it("TEST-40 student moves his booking to an open slot of the same schedule (AC-28)", async () => {
    const student = await newStudent();
    const s1 = await slotAt(2, "10:00");
    const s2 = await slotAt(2, "14:00");
    const old = await insertBooking(s1.id, student.id);

    const res = await move(student, old.id, { slotId: s2.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "ACTIVE", topic: old.topic, slot: { id: s2.id }, student: { id: student.id } });
    expect(res.body.id).not.toBe(old.id);

    expect(await row(old.id)).toMatchObject({ status: "CANCELLED", cancelReason: "Moved to another slot", cancelledByRole: "STUDENT" });
    expect(await row(res.body.id)).toMatchObject({ status: "ACTIVE", slotId: s2.id, studentId: student.id });

    const available = await request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(student));
    const ids = available.body.map((s: { id: number }) => s.id);
    expect(ids).toContain(s1.id);
    expect(ids).not.toContain(s2.id);
  });

  it("TEST-41 old slot in less than 12 hours gives 422 (AC-29)", async () => {
    const student = await newStudent();
    const s1 = await insertSlot(schedule.id, tutor.id, hoursFromNow(11));
    const s2 = await slotAt(3, "10:00");
    const old = await insertBooking(s1.id, student.id);

    const res = await move(student, old.id, { slotId: s2.id });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("CHANGE_CLOSED");
    expect((await row(old.id)).status).toBe("ACTIVE");
    expect(await prisma.booking.count({ where: { slotId: s2.id } })).toBe(0);
  });

  it("TEST-42 other schedule, same slot, slot too soon, unknown slot are refused (AC-30)", async () => {
    const student = await newStudent();
    const s1 = await slotAt(3, "11:00");
    const old = await insertBooking(s1.id, student.id);
    const other = await insertSlot(otherSchedule.id, otherTutor.id, inDays(3, "15:00"));
    const soon = await insertSlot(schedule.id, tutor.id, hoursFromNow(0.5));

    const cases: [number, number, string | undefined][] = [
      [other.id, 422, "DIFFERENT_SCHEDULE"],
      [s1.id, 422, "SAME_SLOT"],
      [soon.id, 422, "BOOKING_CLOSED"],
      [999999, 404, undefined],
    ];
    for (const [slotId, status, code] of cases) {
      const res = await move(student, old.id, { slotId });
      expect(res.status).toBe(status);
      expect(res.body.code).toBe(code);
    }
    expect((await move(student, old.id, {})).status).toBe(400);
    expect(await row(old.id)).toMatchObject({ status: "ACTIVE", slotId: s1.id });
  });

  it("TEST-43 target already booked gives 409 and the old booking stays (AC-31)", async () => {
    const student = await newStudent();
    const other = await newStudent();
    const s1 = await slotAt(4, "10:00");
    const s2 = await slotAt(4, "14:00");
    const old = await insertBooking(s1.id, student.id);
    const taken = await insertBooking(s2.id, other.id);

    const res = await move(student, old.id, { slotId: s2.id });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SLOT_TAKEN");
    expect(await row(old.id)).toMatchObject({ status: "ACTIVE", slotId: s1.id });
    expect(await row(taken.id)).toMatchObject({ status: "ACTIVE", studentId: other.id });
  });

  it("TEST-44 target that overlaps another own booking gives 409 (AC-32)", async () => {
    const student = await newStudent();
    const s1 = await slotAt(5, "08:00");
    const s2 = await slotAt(5, "10:30");
    const elsewhere = await insertSlot(otherSchedule.id, otherTutor.id, inDays(5, "10:00"), 60);
    const old = await insertBooking(s1.id, student.id);
    await insertBooking(elsewhere.id, student.id);

    const res = await move(student, old.id, { slotId: s2.id });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("BOOKING_OVERLAP");
    expect(await row(old.id)).toMatchObject({ status: "ACTIVE", slotId: s1.id });
  });

  it("TEST-45 a student with 3 active bookings can still move one (AC-32)", async () => {
    const student = await newStudent();
    const old = await insertBooking((await slotAt(6, "08:00")).id, student.id);
    await insertBooking((await slotAt(6, "09:00")).id, student.id);
    await insertBooking((await slotAt(6, "10:00")).id, student.id);
    const target = await slotAt(6, "15:00");

    const res = await move(student, old.id, { slotId: target.id });
    expect(res.status).toBe(201);
    expect(await prisma.booking.count({ where: { studentId: student.id, status: "ACTIVE" } })).toBe(3);
  });

  it("TEST-46 other student 404, tutor 403, anonymous 401 (AC-33)", async () => {
    const student = await newStudent();
    const other = await newStudent();
    const s1 = await slotAt(7, "10:00");
    const s2 = await slotAt(7, "11:00");
    const old = await insertBooking(s1.id, student.id);

    expect((await move(other, old.id, { slotId: s2.id })).status).toBe(404);
    expect((await move(tutor, old.id, { slotId: s2.id })).status).toBe(403);
    expect((await move(null, old.id, { slotId: s2.id })).status).toBe(401);
    expect(await row(old.id)).toMatchObject({ status: "ACTIVE", slotId: s1.id });
    expect(await prisma.booking.count({ where: { slotId: s2.id } })).toBe(0);
  });
});
