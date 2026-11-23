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

const record = (user: U | null, bookingId: number, body: object) => {
  const req = request(app).post(`/api/staff/bookings/${bookingId}/attendance`).send(body);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};
const attendanceOf = async (id: number) => (await prisma.booking.findUniqueOrThrow({ where: { id } })).attendance;
// a booking on a slot that started some hours ago
const pastBooking = async (hoursAgo: number, status: "ACTIVE" | "CANCELLED" = "ACTIVE") =>
  insertBooking((await insertSlot(schedule.id, tutor.id, hoursFromNow(-hoursAgo))).id, student.id, status);

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

describe("F-10 attendance", () => {
  it("TEST-78 past sessions list: started in the last 30 days, newest first (AC-55)", async () => {
    const recent = await pastBooking(2);
    const older = await insertSlot(schedule.id, tutor.id, hoursFromNow(-5));
    await insertSlot(schedule.id, tutor.id, hoursFromNow(-40 * 24));
    const future = await insertSlot(schedule.id, tutor.id, inDays(2, "10:00"));

    const res = await request(app).get(`/api/staff/schedules/${schedule.id}/slots?period=past`).set("Cookie", cookieFor(tutor));
    expect(res.status).toBe(200);
    const ids = res.body.map((s: { id: number }) => s.id);
    expect(ids).toEqual([recent.slotId, older.id]);
    expect(ids).not.toContain(future.id);
    expect(res.body[0].booking).toMatchObject({ id: recent.id, attendance: null });

    const bad = await request(app).get(`/api/staff/schedules/${schedule.id}/slots?period=abc`).set("Cookie", cookieFor(tutor));
    expect(bad.status).toBe(400);
    expect(bad.body.details.period).toBeDefined();
  });

  it("TEST-79 tutor records ATTENDED and the student sees it (AC-56)", async () => {
    const booking = await pastBooking(1);

    const res = await record(tutor, booking.id, { status: "ATTENDED" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: booking.id, attendance: "ATTENDED" });
    expect(res.body.attendanceAt).toBeTruthy();

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row.attendance).toBe("ATTENDED");
    expect(row.attendanceAt).toBeInstanceOf(Date);

    const asStudent = await request(app).get(`/api/bookings/${booking.id}`).set("Cookie", cookieFor(student));
    expect(asStudent.body.attendance).toBe("ATTENDED");
  });

  it("TEST-80 before the start 422, bad value 400, nothing stored (AC-57)", async () => {
    const future = await insertBooking((await insertSlot(schedule.id, tutor.id, hoursFromNow(2))).id, student.id);
    const early = await record(tutor, future.id, { status: "ATTENDED" });
    expect(early.status).toBe(422);
    expect(early.body.code).toBe("ATTENDANCE_TOO_EARLY");
    expect(await attendanceOf(future.id)).toBeNull();

    const started = await pastBooking(1);
    const bad = await record(tutor, started.id, { status: "attended" });
    expect(bad.status).toBe(400);
    expect(bad.body.details.status).toBe("Status must be ATTENDED or NO_SHOW");
    expect(await attendanceOf(started.id)).toBeNull();
  });

  it("TEST-81 only once, also at the same time, not for a cancelled booking (AC-58)", async () => {
    const booking = await pastBooking(3);
    expect((await record(tutor, booking.id, { status: "NO_SHOW" })).status).toBe(200);
    const again = await record(tutor, booking.id, { status: "ATTENDED" });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ATTENDANCE_RECORDED");
    expect(await attendanceOf(booking.id)).toBe("NO_SHOW");

    const race = await pastBooking(4);
    const results = await Promise.all([
      record(tutor, race.id, { status: "ATTENDED" }),
      record(tutor, race.id, { status: "NO_SHOW" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);

    const cancelled = await pastBooking(6, "CANCELLED");
    const res = await record(tutor, cancelled.id, { status: "ATTENDED" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("BOOKING_NOT_ACTIVE");
  });

  it("TEST-82 other tutor 404, student 403, anonymous 401 (AC-59)", async () => {
    const booking = await pastBooking(2);
    expect((await record(otherTutor, booking.id, { status: "ATTENDED" })).status).toBe(404);
    expect((await record(student, booking.id, { status: "ATTENDED" })).status).toBe(403);
    expect((await record(null, booking.id, { status: "ATTENDED" })).status).toBe(401);
    expect((await record(tutor, 999999, { status: "ATTENDED" })).status).toBe(404);
    expect(await attendanceOf(booking.id)).toBeNull();
  });
});
