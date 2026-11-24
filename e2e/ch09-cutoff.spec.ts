// CH-09 (Lab 7): BR-10 v1.2, booking closes 3 hours before the start (was 1 hour).
// TEST-96 (E2E, AC-14/AC-66) and TEST-97 (E2E, preserved Sprint 1 access rules).
// Screenshots go to CH09_SHOTS (default docs/maintenance/lab-7/evidence/screenshots), so the
// same test gives the "before" pictures on the pre-change code and the "after" pictures on the fix.
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "../playwright.config";
import { OTHER_STUDENT, STUDENT, TUTOR, apiAs, calculusId, createSlot, fmtDate, login, resetE2EData, startText } from "./helpers";

const SHOTS = process.env.CH09_SHOTS ?? "docs/maintenance/lab-7/evidence/screenshots";
const HOUR = 3600000;
const BKK = 7 * HOUR;

// starts on :00 or :30, 30 min slot inside 08:00-20:00 Bangkok (BR-05, BR-06), tutor free (BR-08)
async function firstStart(tutorApi: APIRequestContext, scheduleId: number, fromMs: number, toMs: number) {
  const slots: { startsAt: string; endsAt: string }[] = await (await tutorApi.get(`/api/staff/schedules/${scheduleId}/slots`)).json();
  let t = Math.ceil(fromMs / (30 * 60000)) * 30 * 60000;
  for (; t < toMs; t += 30 * 60000) {
    const local = new Date(t + BKK);
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    if (minutes < 8 * 60 || minutes + 30 > 20 * 60) continue;
    const start = new Date(t);
    const end = new Date(t + 30 * 60000);
    if (!slots.some((s) => new Date(s.startsAt) < end && start < new Date(s.endsAt))) return start;
  }
  return null;
}

test.beforeAll(resetE2EData);

test("TEST-96 a slot in less than 3 hours is not offered, a slot in 3 hours or more is (AC-14, AC-66)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const now = Date.now();
  // a start that the old rule (1 hour) accepted and the new rule (3 hours) refuses
  const closed = await firstStart(tutorApi, scheduleId, now + 70 * 60000, now + 3 * HOUR - 5 * 60000);
  test.skip(!closed, "Run between 09:00 and 18:30 Bangkok time: no start between now + 1 h 10 and now + 2 h 55 inside opening hours");
  const open = (await firstStart(tutorApi, scheduleId, now + 3 * HOUR + 5 * 60000, now + 3 * 24 * HOUR))!;

  for (const start of [closed!, open]) {
    const res = await tutorApi.post(`/api/staff/schedules/${scheduleId}/slots`, { data: { startsAt: start.toISOString(), durationMinutes: 30 } });
    expect(res.status()).toBe(201);
  }
  const closedRow = page.locator("tr", { hasText: fmtDate(closed!) }).filter({ hasText: startText(closed!) }).filter({ hasText: TUTOR.name });
  const openRow = page.locator("tr", { hasText: fmtDate(open) }).filter({ hasText: startText(open) }).filter({ hasText: TUTOR.name });

  // the tutor sees both slots as Open in his schedule
  await login(page, TUTOR.email);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await expect(page.locator("tr", { hasText: fmtDate(closed!) }).filter({ hasText: startText(closed!) })).toContainText("Open");
  await page.screenshot({ path: `${SHOTS}/CH09-01-tutor-two-slots.png`, fullPage: true });
  await page.getByRole("button", { name: "Log out" }).click();

  // the student sees only the slot that starts in 3 hours or more
  await login(page, OTHER_STUDENT.email);
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  await expect(openRow).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/CH09-02-student-available-slots.png`, fullPage: true });
  await expect(closedRow).toHaveCount(0);

  // the backend refuses the closed slot even if the client sends it (BR-10 is checked on the API)
  const closedSlots: { id: number; startsAt: string }[] = await (await tutorApi.get(`/api/staff/schedules/${scheduleId}/slots`)).json();
  const closedId = closedSlots.find((s) => new Date(s.startsAt).getTime() === closed!.getTime())!.id;
  const refused = await page.request.post(`${API_URL}/api/bookings`, { data: { slotId: closedId, topic: "Last minute question" } });
  const body = await refused.json();
  await page.setContent(
    `<pre style="font:16px monospace;padding:16px">POST ${API_URL}/api/bookings  { slotId: ${closedId} }\nslot starts ${closed!.toISOString()} (in ${Math.round((closed!.getTime() - Date.now()) / 60000)} min)\n\nHTTP ${refused.status()}\n${JSON.stringify(body, null, 2)}</pre>`
  );
  await page.screenshot({ path: `${SHOTS}/CH09-03-api-booking-refused.png` });
  expect(refused.status()).toBe(422);
  expect(body).toEqual({ error: "Booking is closed for this slot (less than 3 hours before the start)", code: "BOOKING_CLOSED" });

  // the open slot can be booked as before
  await page.goto("/slots");
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  await openRow.getByRole("button", { name: "Book" }).click();
  await page.getByLabel(/What do you need help with/).fill("Integration by parts, exercise 3");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.locator(".success")).toHaveText("Your session is booked.");
  await page.screenshot({ path: `${SHOTS}/CH09-04-open-slot-booked.png` });
  await tutorApi.dispose();
});

test("TEST-97 preserved Sprint 1 access: other student gets not found, tutor cannot book (BR-12, AC-20, AC-21)", async ({ page }) => {
  // own data: Kevin books a slot 5 days ahead
  const tutorApi = await apiAs(TUTOR.email);
  const slot = await createSlot(tutorApi, await calculusId(tutorApi), 5);
  const kevin = await apiAs(OTHER_STUDENT.email);
  const booked = await kevin.post("/api/bookings", { data: { slotId: slot.id, topic: "Limits and continuity" } });
  expect(booked.status()).toBe(201);
  const bookingId = (await booked.json()).id;

  await login(page, STUDENT.email);
  await page.goto(`/bookings/${bookingId}`);
  await expect(page.locator(".error")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/CH09-05-other-student-booking-not-found.png` });
  const res = await page.request.get(`${API_URL}/api/bookings/${bookingId}`);
  expect(res.status()).toBe(404);
  await page.getByRole("button", { name: "Log out" }).click();

  await login(page, TUTOR.email);
  const asTutor = await page.request.post(`${API_URL}/api/bookings`, { data: { slotId: 1, topic: "Tutor tries to book" } });
  expect(asTutor.status()).toBe(403);
  await kevin.dispose();
  await tutorApi.dispose();
});
