import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, inDays, insertSlot } from "./helpers.js";

const app = createApp();
type U = Awaited<ReturnType<typeof createUser>>;
let t1: U, t2: U, student: U;
let schedule: { id: number };

// Bangkok date YYYY-MM-DD some days from today (same day as inDays)
const day = (days: number) => inDays(days, "12:00").toISOString().slice(0, 10);

const get = (query: string) =>
  request(app).get(`/api/schedules/${schedule.id}/available-slots${query}`).set("Cookie", cookieFor(student));
const ids = (body: { id: number }[]) => body.map((s) => s.id);

beforeAll(async () => {
  t1 = await createUser("STAFF", "Tutor Alpha");
  t2 = await createUser("STAFF", "Tutor Beta");
  student = await createUser("STUDENT");
  schedule = await createSchedule([t1.id, t2.id]);
});

afterAll(async () => {
  await deleteSchedules([schedule.id]);
  await deleteUsers([t1.id, t2.id, student.id]);
});

describe("F-08 filter availability", () => {
  let early: { id: number }, late: { id: number }, later: { id: number }, ofT2: { id: number };

  it("TEST-60 from and to keep only the slots of those Bangkok days (AC-42)", async () => {
    early = await insertSlot(schedule.id, t1.id, inDays(2, "08:00"));
    late = await insertSlot(schedule.id, t1.id, inDays(2, "19:30"));
    later = await insertSlot(schedule.id, t1.id, inDays(4, "10:00"));

    const res = await get(`?from=${day(2)}&to=${day(2)}`);
    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([early.id, late.id]);

    const fromOnly = await get(`?from=${day(3)}`);
    expect(ids(fromOnly.body)).toEqual([later.id]);
  });

  it("TEST-61 tutorId keeps only this tutor, tutors endpoint lists the tutors (AC-43, AC-44)", async () => {
    ofT2 = await insertSlot(schedule.id, t2.id, inDays(3, "10:00"));

    const onlyT2 = await get(`?tutorId=${t2.id}`);
    expect(ids(onlyT2.body)).toEqual([ofT2.id]);

    const onlyT1 = await get(`?tutorId=${t1.id}&from=${day(4)}&to=${day(4)}`);
    expect(ids(onlyT1.body)).toEqual([later.id]);

    const tutors = await request(app).get(`/api/schedules/${schedule.id}/tutors`).set("Cookie", cookieFor(student));
    expect(tutors.status).toBe(200);
    expect(tutors.body).toEqual([
      { id: t1.id, name: "Tutor Alpha" },
      { id: t2.id, name: "Tutor Beta" },
    ]);

    const nobody = await get("?tutorId=999999");
    expect(nobody.status).toBe(200);
    expect(nobody.body).toEqual([]);
  });

  it("TEST-62 bad query parameters give 400 with details (AC-44)", async () => {
    const badDate = await get("?from=2026-13-01");
    expect(badDate.status).toBe(400);
    expect(badDate.body.details.from).toBeDefined();

    const reversed = await get(`?from=${day(3)}&to=${day(1)}`);
    expect(reversed.status).toBe(400);
    expect(reversed.body.details.from).toBe("From must be before or equal to To");

    const badTutor = await get("?tutorId=abc");
    expect(badTutor.status).toBe(400);
    expect(badTutor.body.details.tutorId).toBeDefined();

    expect((await request(app).get(`/api/schedules/${schedule.id}/tutors`)).status).toBe(401);
    expect((await request(app).get("/api/schedules/999999/tutors").set("Cookie", cookieFor(student))).status).toBe(404);
  });
});
