import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, inDays, insertSlot } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U, student: U;
let schedule: { id: number }, otherSchedule: { id: number };
const WEEK = 7 * 24 * 3600 * 1000;

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

const postWeekly = (user: U | null, scheduleId: number, body: object) => {
  const req = request(app).post(`/api/staff/schedules/${scheduleId}/slots/weekly`).send(body);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};
const slotsOf = (tutorId: number) => prisma.slot.count({ where: { tutorId, removedAt: null } });

describe("F-09 weekly slots API", () => {
  it("TEST-73 four weeks create 4 open slots, same weekday and time, 7 days apart (AC-51)", async () => {
    const start = inDays(2, "10:00");
    const res = await postWeekly(tutor, schedule.id, { startsAt: start.toISOString(), durationMinutes: 30, weeks: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(4);
    const starts = res.body.map((s: { startsAt: string }) => new Date(s.startsAt).getTime());
    expect(starts).toEqual([0, 1, 2, 3].map((k) => start.getTime() + k * WEEK));
    expect(res.body.every((s: { status: string; scheduleId: number }) => s.status === "OPEN" && s.scheduleId === schedule.id)).toBe(true);
    expect(await prisma.slot.count({ where: { scheduleId: schedule.id, startsAt: { in: starts.map((t: number) => new Date(t)) } } })).toBe(4);
  });

  it("TEST-74 one overlapping week gives 409 with the week, and no slot is created (AC-52)", async () => {
    const start = inDays(3, "14:00");
    // the tutor already has a slot in week 3 (other schedule is not needed: BR-08 is per tutor)
    await insertSlot(schedule.id, tutor.id, new Date(start.getTime() + 2 * WEEK + 30 * 60000), 30);
    const before = await slotsOf(tutor.id);

    const res = await postWeekly(tutor, schedule.id, { startsAt: start.toISOString(), durationMinutes: 60, weeks: 4 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SLOT_OVERLAP");
    expect(res.body.error).toBe("Some weeks overlap your slots");
    expect(res.body.weeks.map((w: { week: number }) => w.week)).toEqual([3]);
    expect(await slotsOf(tutor.id)).toBe(before);
  });

  it("TEST-74b a week after 60 days gives 400 with the weeks, and no slot is created (AC-52)", async () => {
    const before = await slotsOf(tutor.id);
    const res = await postWeekly(tutor, schedule.id, { startsAt: inDays(20, "09:00").toISOString(), durationMinutes: 30, weeks: 8 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Some weeks are not valid");
    expect(res.body.weeks.map((w: { week: number }) => w.week)).toEqual([7, 8]);
    expect(await slotsOf(tutor.id)).toBe(before);
  });

  it("TEST-75 weeks 1, 9 and \"4\" give 400, no slot is created (AC-53)", async () => {
    const before = await slotsOf(tutor.id);
    for (const weeks of [1, 9, "4"]) {
      const res = await postWeekly(tutor, schedule.id, { startsAt: inDays(4, "16:00").toISOString(), durationMinutes: 30, weeks });
      expect(res.status).toBe(400);
      expect(res.body.details.weeks).toBe("Weeks must be a whole number from 2 to 8");
    }
    expect(await slotsOf(tutor.id)).toBe(before);
  });

  it("TEST-76 other tutor 403, student 403, anonymous 401 (AC-54)", async () => {
    const body = { startsAt: inDays(5, "11:00").toISOString(), durationMinutes: 30, weeks: 2 };
    expect((await postWeekly(otherTutor, schedule.id, body)).status).toBe(403);
    expect((await postWeekly(student, schedule.id, body)).status).toBe(403);
    expect((await postWeekly(null, schedule.id, body)).status).toBe(401);
    expect(await slotsOf(otherTutor.id)).toBe(0);
  });
});
