import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { cookieFor, createSchedule, createUser, deleteSchedules, deleteUsers, inDays } from "./helpers.js";

const app = createApp();
type U = Awaited<ReturnType<typeof createUser>>;
let tutor: U, student: U;
let schedule: { id: number };

beforeAll(async () => {
  tutor = await createUser("STAFF");
  student = await createUser("STUDENT");
  schedule = await createSchedule([tutor.id]);
  // 500 future open slots: 50 days x 10 slots of 30 min (08:00 to 12:30 Bangkok)
  const data = [];
  for (let d = 2; d < 52; d++) {
    for (let k = 0; k < 10; k++) {
      const start = new Date(inDays(d, "08:00").getTime() + k * 30 * 60000);
      data.push({ scheduleId: schedule.id, tutorId: tutor.id, startsAt: start, endsAt: new Date(start.getTime() + 30 * 60000) });
    }
  }
  await getPrisma().slot.createMany({ data });
});

afterAll(async () => {
  await deleteSchedules([schedule.id]);
  await deleteUsers([tutor.id, student.id]);
});

describe("R-03 performance (NFR-08)", () => {
  it("TEST-89 with 500 slots the median time of available-slots is below 500 ms (AC-64)", async () => {
    const call = () => request(app).get(`/api/schedules/${schedule.id}/available-slots`).set("Cookie", cookieFor(student));
    const warm = await call();
    expect(warm.status).toBe(200);
    expect(warm.body).toHaveLength(500);

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const res = await call();
      times.push(performance.now() - t0);
      expect(res.status).toBe(200);
    }
    times.sort((a, b) => a - b);
    const median = times[2]!;
    console.log(`TEST-89 available-slots with 500 slots: ${times.map((t) => t.toFixed(1)).join(", ")} ms, median ${median.toFixed(1)} ms`);
    expect(median).toBeLessThan(500);
  });
});
