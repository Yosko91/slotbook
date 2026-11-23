import { expect, test } from "@playwright/test";
import {
  OTHER_TUTOR,
  STUDENT,
  TUTOR,
  apiAs,
  bangkokDay,
  calculusId,
  createSlot,
  fmtDate,
  fmtTime,
  login,
  resetE2EData,
  startText,
} from "./helpers";

const SHOTS = "docs/sprints/sprint-2/evidence/screenshots";

// own days (8 to 11), so they do not collide with the Sprint 1 E2E (days 6 and 7)
test.beforeAll(async () => {
  await resetE2EData();
});

test("TEST-67 student cancels a booking and the slot is open again (AC-22, AC-27)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const slot = await createSlot(tutorApi, scheduleId, 8);
  const studentApi = await apiAs(STUDENT.email);
  const booked = await studentApi.post("/api/bookings", { data: { slotId: slot.id, topic: "Taylor series exercises" } });
  expect(booked.status()).toBe(201);
  const booking = await booked.json();

  await login(page, STUDENT.email);
  await page.goto(`/bookings/${booking.id}`);
  await expect(page.locator(".status")).toHaveText("Active");
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByLabel("Reason (optional)").fill("I have an exam that day");
  await page.screenshot({ path: `${SHOTS}/01-cancel-form.png` });
  await page.getByRole("button", { name: "Confirm cancellation" }).click();

  await expect(page.locator(".success")).toHaveText("The booking is cancelled.");
  await expect(page.locator(".status")).toHaveText("Cancelled");
  await expect(page.locator("dl")).toContainText("I have an exam that day");
  await page.screenshot({ path: `${SHOTS}/02-booking-cancelled.png` });

  // saved in the database: still cancelled after a reload
  await page.reload();
  await expect(page.locator(".status")).toHaveText("Cancelled");

  // the slot is offered again (AC-27)
  await page.goto("/slots");
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  const row = page.locator("tr", { hasText: fmtDate(slot.start) }).filter({ hasText: startText(slot.start) }).filter({ hasText: TUTOR.name });
  await expect(row.getByRole("button", { name: "Book" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/03-slot-open-again.png`, fullPage: true });
  await tutorApi.dispose();
  await studentApi.dispose();
});

test("TEST-68 student moves a booking to another slot (AC-28)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const first = await createSlot(tutorApi, scheduleId, 9);
  const second = await createSlot(tutorApi, scheduleId, 9);
  const studentApi = await apiAs(STUDENT.email);
  const booking = await (await studentApi.post("/api/bookings", { data: { slotId: first.id, topic: "Moving my session" } })).json();

  await login(page, STUDENT.email);
  await page.goto(`/bookings/${booking.id}`);
  await page.getByRole("button", { name: "Move to another slot" }).click();
  const target = page.locator("tr", { hasText: fmtDate(second.start) }).filter({ hasText: startText(second.start) }).filter({ hasText: TUTOR.name });
  await expect(target).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/04-move-choose-slot.png`, fullPage: true });
  await target.getByRole("button", { name: "Move here" }).click();

  await expect(page.locator(".success")).toHaveText("Your booking is moved.");
  await expect(page.locator("dl")).toContainText(fmtTime(second.start));
  await expect(page.locator("dl")).toContainText("Moving my session");
  await page.screenshot({ path: `${SHOTS}/05-booking-moved.png` });

  // My bookings shows only the start time in the Time column
  await page.goto("/bookings");
  const oldRow = page.locator("tr", { hasText: fmtDate(first.start) }).filter({ hasText: fmtTime(first.start) });
  await expect(oldRow).toContainText("Cancelled");
  const newRow = page.locator("tr", { hasText: fmtDate(second.start) }).filter({ hasText: fmtTime(second.start) });
  await expect(newRow).toContainText("Active");
  await page.screenshot({ path: `${SHOTS}/06-my-bookings-after-move.png`, fullPage: true });
  await tutorApi.dispose();
  await studentApi.dispose();
});

test("TEST-69 tutor removes an open slot (AC-34)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const slot = await createSlot(tutorApi, scheduleId, 10);

  await login(page, TUTOR.email);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  const row = page.locator("tr", { hasText: fmtDate(slot.start) }).filter({ hasText: startText(slot.start) });
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).toContainText("Remove this slot?");
  await page.screenshot({ path: `${SHOTS}/07-remove-confirm.png`, fullPage: true });
  await row.getByRole("button", { name: "Yes, remove" }).click();

  await expect(page.locator(".success")).toHaveText("Slot removed.");
  await expect(row).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/08-slot-removed.png`, fullPage: true });

  // backend evidence: the slot cannot be booked anymore
  const studentApi = await apiAs(STUDENT.email);
  const res = await studentApi.post("/api/bookings", { data: { slotId: slot.id, topic: "Trying a removed slot" } });
  expect(res.status()).toBe(404);
  await tutorApi.dispose();
  await studentApi.dispose();
});

test("TEST-70 student filters by tutor and by date, then clears (AC-45)", async ({ page }) => {
  const tutorApi = await apiAs(OTHER_TUTOR.email);
  const scheduleId = await calculusId(tutorApi);
  const slot = await createSlot(tutorApi, scheduleId, 11);

  await login(page, STUDENT.email);
  await page.getByLabel("Subject").selectOption({ label: "Calculus I" });
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();

  await page.getByLabel("Tutor").selectOption({ label: OTHER_TUTOR.name });
  await expect(rows.filter({ hasText: TUTOR.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: OTHER_TUTOR.name }).first()).toBeVisible();

  await page.getByLabel("From", { exact: true }).fill(bangkokDay(11));
  await page.getByLabel("To", { exact: true }).fill(bangkokDay(11));
  await expect(rows.filter({ hasText: startText(slot.start) }).filter({ hasText: fmtDate(slot.start) })).toBeVisible();
  for (const text of await rows.allInnerTexts()) expect(text).toContain(fmtDate(slot.start));
  await page.screenshot({ path: `${SHOTS}/09-filters.png`, fullPage: true });

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(rows.filter({ hasText: TUTOR.name }).first()).toBeVisible();
  await tutorApi.dispose();
});
