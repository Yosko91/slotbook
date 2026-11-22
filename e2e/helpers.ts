import { expect, request } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { API_URL } from "../playwright.config";

// seeded accounts (server/prisma/seed.ts), local development only
export const PASSWORD = process.env.E2E_PASSWORD ?? "SlotBook!2026";
export const TUTOR = { email: "somchai.tutor@slotbook.dev", name: "Somchai Wongsa" };
export const OTHER_TUTOR = { email: "anong.tutor@slotbook.dev", name: "Anong Kittisak" };
export const STUDENT = { email: "ploy@slotbook.dev", name: "Ploy Chaiyaporn" };
export const OTHER_STUDENT = { email: "kevin@slotbook.dev", name: "Kevin Martin" };

const TZ = "Asia/Bangkok";
export const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const bangkokDay = (daysAhead: number) => new Date(Date.now() + 7 * 3600000 + daysAhead * 86400000).toISOString().slice(0, 10);

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

export async function apiAs(email: string) {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/auth/login", { data: { email, password: PASSWORD } });
  expect(res.status()).toBe(200);
  return ctx;
}

export async function calculusId(api: APIRequestContext) {
  const list: { id: number; name: string }[] = await (await api.get("/api/schedules")).json();
  return list.find((s) => s.name === "Calculus I")!.id;
}

// first time in a day where the tutor has no slot yet, so the tests can run many times
export async function freeTime(tutorApi: APIRequestContext, scheduleId: number, daysAhead: number) {
  const slots: { startsAt: string; endsAt: string }[] = await (await tutorApi.get(`/api/staff/schedules/${scheduleId}/slots`)).json();
  const day = bangkokDay(daysAhead);
  for (let h = 8; h < 20; h++) {
    for (const m of ["00", "30"]) {
      const time = `${String(h).padStart(2, "0")}:${m}`;
      const start = new Date(`${day}T${time}:00+07:00`);
      const end = new Date(start.getTime() + 30 * 60000);
      const busy = slots.some((s) => new Date(s.startsAt) < end && start < new Date(s.endsAt));
      if (!busy) return { day, time, start };
    }
  }
  throw new Error("no free time for the tutor that day");
}

// tutor creates a 30 min slot through the API on the first free time of that day
export async function createSlot(tutorApi: APIRequestContext, scheduleId: number, daysAhead: number) {
  const free = await freeTime(tutorApi, scheduleId, daysAhead);
  const res = await tutorApi.post(`/api/staff/schedules/${scheduleId}/slots`, {
    data: { startsAt: free.start.toISOString(), durationMinutes: 30 },
  });
  expect(res.status()).toBe(201);
  return { ...(await res.json()), start: free.start } as { id: number; start: Date };
}

// Sprint 2 (F-07): a student can have only 3 upcoming bookings, so the E2E runs
// cancel the bookings of the seeded students that earlier runs left (all are days ahead).
export async function resetStudents(...emails: string[]) {
  for (const email of emails) {
    const api = await apiAs(email);
    const mine: { id: number; status: string; slot: { startsAt: string } }[] = await (await api.get("/api/bookings/mine")).json();
    for (const b of mine) {
      if (b.status === "ACTIVE" && new Date(b.slot.startsAt).getTime() - Date.now() >= 12 * 3600000) {
        await api.post(`/api/bookings/${b.id}/cancel`, { data: {} });
      }
    }
    await api.dispose();
  }
}
