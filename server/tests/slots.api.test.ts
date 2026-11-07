import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, inDays } from "./helpers.js";

const app = createApp();
const prisma = getPrisma();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, otherTutor: U, student: U;
let schedule: { id: number }, otherSchedule: { id: number };

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

const postSlot = (user: U | null, scheduleId: number, body: object) => {
  const req = request(app).post(`/api/staff/schedules/${scheduleId}/slots`).send(body);
  return user ? req.set("Cookie", cookieFor(user)) : req;
};

describe("F-02 tutor slots API", () => {
  it("GET /api/staff/schedules lists only the managed schedules", async () => {
    const res = await request(app).get("/api/staff/schedules").set("Cookie", cookieFor(tutor));
    expect(res.status).toBe(200);
    expect(res.body.map((s: { id: number }) => s.id)).toEqual([schedule.id]);
  });

  it("TEST-13 tutor creates a valid slot in his schedule", async () => {
    const startsAt = inDays(3, "10:00");
    const res = await postSlot(tutor, schedule.id, { startsAt: startsAt.toISOString(), durationMinutes: 30 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ scheduleId: schedule.id, durationMinutes: 30, status: "OPEN", booking: null });
    expect(res.body.tutor).toEqual({ id: tutor.id, name: tutor.name });

    const row = await prisma.slot.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row.tutorId).toBe(tutor.id);
    expect(row.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(row.endsAt.getTime() - row.startsAt.getTime()).toBe(30 * 60 * 1000);
  });

  it("TEST-14 invalid slots give 400 and nothing is stored", async () => {
    const before = await prisma.slot.count({ where: { tutorId: tutor.id } });

    const badLength = await postSlot(tutor, schedule.id, { startsAt: inDays(4, "10:00").toISOString(), durationMinutes: 45 });
    expect(badLength.status).toBe(400);
    expect(badLength.body.details.durationMinutes).toBe("Length must be 30 or 60 minutes");

    const past = await postSlot(tutor, schedule.id, { startsAt: inDays(-1, "10:00").toISOString(), durationMinutes: 30 });
    expect(past.status).toBe(400);
    expect(past.body.details.startsAt).toBe("Start time must be in the future");

    const early = await postSlot(tutor, schedule.id, { startsAt: inDays(4, "07:30").toISOString(), durationMinutes: 30 });
    expect(early.status).toBe(400);
    expect(early.body.details.startsAt).toBe("The slot must be between 08:00 and 20:00 (Bangkok time)");

    expect(await prisma.slot.count({ where: { tutorId: tutor.id } })).toBe(before);
  });

  it("TEST-15 overlapping slot gives 409, touching slot is ok", async () => {
    const first = await postSlot(tutor, schedule.id, { startsAt: inDays(5, "10:00").toISOString(), durationMinutes: 60 });
    expect(first.status).toBe(201);

    const overlap = await postSlot(tutor, schedule.id, { startsAt: inDays(5, "10:30").toISOString(), durationMinutes: 30 });
    expect(overlap.status).toBe(409);
    expect(overlap.body).toEqual({ error: "You already have a slot at this time", code: "SLOT_OVERLAP" });

    const touching = await postSlot(tutor, schedule.id, { startsAt: inDays(5, "11:00").toISOString(), durationMinutes: 30 });
    expect(touching.status).toBe(201);
  });

  it("TEST-16 tutor cannot use a schedule he does not manage", async () => {
    const create = await postSlot(tutor, otherSchedule.id, { startsAt: inDays(6, "10:00").toISOString(), durationMinutes: 30 });
    expect(create.status).toBe(403);
    expect(create.body).toEqual({ error: "You do not manage this schedule" });

    const list = await request(app).get(`/api/staff/schedules/${otherSchedule.id}/slots`).set("Cookie", cookieFor(tutor));
    expect(list.status).toBe(403);
    expect(await prisma.slot.count({ where: { scheduleId: otherSchedule.id } })).toBe(0);
  });

  it("unknown schedule gives 404", async () => {
    const res = await postSlot(tutor, 99999999, { startsAt: inDays(6, "10:00").toISOString(), durationMinutes: 30 });
    expect(res.status).toBe(404);
  });

  it("TEST-17 student gets 403 and anonymous gets 401", async () => {
    const body = { startsAt: inDays(6, "11:00").toISOString(), durationMinutes: 30 };
    expect((await postSlot(student, schedule.id, body)).status).toBe(403);
    expect((await postSlot(null, schedule.id, body)).status).toBe(401);
    const list = await request(app).get("/api/staff/schedules").set("Cookie", cookieFor(student));
    expect(list.status).toBe(403);
  });

  it("slots list shows the upcoming slots of the schedule, sorted", async () => {
    const res = await request(app).get(`/api/staff/schedules/${schedule.id}/slots`).set("Cookie", cookieFor(tutor));
    expect(res.status).toBe(200);
    const starts = res.body.map((s: { startsAt: string }) => s.startsAt);
    expect(starts.length).toBe(3);
    expect([...starts].sort()).toEqual(starts);
    expect(res.body.every((s: { status: string }) => s.status === "OPEN")).toBe(true);
  });
});
