import { expect, request, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { API_URL } from "../playwright.config";

// seeded accounts (server/prisma/seed.ts), local development only
const PASSWORD = "SlotBook!2026";
const TUTOR = { email: "somchai.tutor@slotbook.dev", name: "Somchai Wongsa" };
const STUDENT = { email: "ploy@slotbook.dev", name: "Ploy Chaiyaporn" };
const OTHER_STUDENT = { email: "kevin@slotbook.dev", name: "Kevin Martin" };
const SHOTS = "docs/sprints/sprint-1/evidence/screenshots";

const TZ = "Asia/Bangkok";
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

async function apiAs(email: string) {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/auth/login", { data: { email, password: PASSWORD } });
  expect(res.status()).toBe(200);
  return ctx;
}

// first time in a day where the tutor has no slot yet, so the tests can run many times
async function freeTime(tutorApi: APIRequestContext, scheduleId: number, daysAhead: number) {
  const slots: { startsAt: string; endsAt: string }[] = await (await tutorApi.get(`/api/staff/schedules/${scheduleId}/slots`)).json();
  const day = new Date(Date.now() + 7 * 3600000 + daysAhead * 86400000).toISOString().slice(0, 10);
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

async function calculusId(api: APIRequestContext) {
  const list: { id: number; name: string }[] = await (await api.get("/api/schedules")).json();
  return list.find((s) => s.name === "Calculus I")!.id;
}

test("TEST-08 login, header and logout (AC-01, AC-04)", async ({ page }) => {
  await page.goto("/login");
  await page.screenshot({ path: `${SHOTS}/01-login.png` });

  await login(page, STUDENT.email);
  await expect(page).toHaveURL(/\/slots$/);
  await expect(page.locator("header")).toContainText(`${STUDENT.name} (Student)`);
  await page.screenshot({ path: `${SHOTS}/02-student-logged-in.png` });

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  // the session is really gone on the server
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong password shows the error (AC-02)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(STUDENT.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".error")).toHaveText("Invalid email or password");
  await page.screenshot({ path: `${SHOTS}/03-login-wrong-password.png` });
});

test("TEST-19, TEST-30 tutor adds a slot, student books it, tutor sees the booking", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const free = await freeTime(tutorApi, scheduleId, 6);
  const timeText = `${fmtTime(free.start)} - ${fmtTime(new Date(free.start.getTime() + 30 * 60000))}`;

  // tutor adds the slot in the UI (AC-07)
  await login(page, TUTOR.email);
  await expect(page).toHaveURL(/\/staff$/);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await page.getByLabel("Date").fill(free.day);
  await page.getByLabel("Start time").selectOption(free.time);
  await page.getByLabel("Length").selectOption("30");
  await page.getByRole("button", { name: "Add slot" }).click();
  await expect(page.locator(".success")).toContainText("Slot added");
  const row = page.locator("tr", { hasText: fmtDate(free.start) }).filter({ hasText: timeText });
  await expect(row).toContainText("Open");
  await page.screenshot({ path: `${SHOTS}/04-tutor-slot-added.png`, fullPage: true });

  // same time again is refused by BR-08 (AC-11)
  await page.getByRole("button", { name: "Add slot" }).click();
  await expect(page.locator(".error")).toHaveText("You already have a slot at this time");
  await page.screenshot({ path: `${SHOTS}/05-tutor-overlap-refused.png` });
  await page.getByRole("button", { name: "Log out" }).click();

  // student books it (AC-14, AC-15)
  await login(page, STUDENT.email);
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  const slotRow = page.locator("tr", { hasText: fmtDate(free.start) }).filter({ hasText: timeText }).filter({ hasText: TUTOR.name });
  await expect(slotRow).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-student-available-slots.png`, fullPage: true });
  await slotRow.getByRole("button", { name: "Book" }).click();
  await page.getByLabel(/What do you need help with/).fill("Integration by parts, exercise 3 of the homework");
  await page.screenshot({ path: `${SHOTS}/07-student-topic-form.png` });
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.locator(".success")).toHaveText("Your session is booked.");
  await expect(page.locator("dl")).toContainText("Integration by parts, exercise 3 of the homework");
  await page.screenshot({ path: `${SHOTS}/08-booking-detail.png` });

  // retrieve the saved result after a full reload (data comes from the database)
  await page.goto("/bookings");
  await page.reload();
  const bookingRow = page.locator("tr", { hasText: fmtDate(free.start) }).filter({ hasText: fmtTime(free.start) });
  await expect(bookingRow).toContainText("Integration by parts, exercise 3");
  await expect(bookingRow).toContainText(TUTOR.name);
  await page.screenshot({ path: `${SHOTS}/09-my-bookings.png`, fullPage: true });

  // the slot is not offered anymore
  await page.goto("/slots");
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  await expect(page.locator("table")).toBeVisible();
  await expect(slotRow).toHaveCount(0);
  await page.getByRole("button", { name: "Log out" }).click();

  // tutor sees Booked with the student (AC-13)
  await login(page, TUTOR.email);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await expect(row).toContainText("Booked");
  await expect(row).toContainText(STUDENT.name);
  await page.screenshot({ path: `${SHOTS}/10-tutor-sees-booking.png`, fullPage: true });
  await tutorApi.dispose();
});

test("TEST-31 slot taken by another student while the page is open (AC-16)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const free = await freeTime(tutorApi, scheduleId, 7);
  const created = await tutorApi.post(`/api/staff/schedules/${scheduleId}/slots`, {
    data: { startsAt: free.start.toISOString(), durationMinutes: 30 },
  });
  expect(created.status()).toBe(201);
  const slot = await created.json();

  await login(page, OTHER_STUDENT.email);
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  const slotRow = page.locator("tr", { hasText: fmtDate(free.start) }).filter({ hasText: fmtTime(free.start) }).filter({ hasText: TUTOR.name });
  await slotRow.getByRole("button", { name: "Book" }).click();
  await page.getByLabel(/What do you need help with/).fill("Limits and continuity");

  // Ploy books the same slot first, through the API
  const studentApi = await apiAs(STUDENT.email);
  expect((await studentApi.post("/api/bookings", { data: { slotId: slot.id, topic: "Chain rule examples" } })).status()).toBe(201);

  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.locator(".error")).toHaveText("This slot is already booked");
  await page.screenshot({ path: `${SHOTS}/11-slot-already-booked.png`, fullPage: true });
  await tutorApi.dispose();
  await studentApi.dispose();
});

test("student cannot open the tutor page and the API refuses (AC-12, AC-21)", async ({ page }) => {
  await login(page, STUDENT.email);
  await page.goto("/staff");
  await expect(page.getByText("You are not allowed to see this page.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/12-student-on-tutor-page.png` });

  // the browser cookie of the student, used directly on the API
  const res = await page.request.get(`${API_URL}/api/staff/schedules`);
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: "You do not have permission to do this" });
});
