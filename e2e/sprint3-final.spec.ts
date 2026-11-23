import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { STUDENT, TUTOR, apiAs, bangkokDay, calculusId, createSlot, login, resetE2EData } from "./helpers";

const SHOTS = "docs/sprints/sprint-3/evidence/screenshots";

test.beforeAll(async () => {
  await resetE2EData();
});

// a start time that is free for the tutor on day D and on day D + 7 (for a 2 week series)
async function freeWeeklyTime(tutorApi: APIRequestContext, scheduleId: number) {
  const slots: { startsAt: string; endsAt: string }[] = await (await tutorApi.get(`/api/staff/schedules/${scheduleId}/slots`)).json();
  for (let days = 20; days < 40; days++) {
    for (let h = 8; h < 20; h++) {
      for (const m of ["00", "30"]) {
        const time = `${String(h).padStart(2, "0")}:${m}`;
        const starts = [days, days + 7].map((d) => new Date(`${bangkokDay(d)}T${time}:00+07:00`));
        const busy = starts.some((s) => slots.some((x) => new Date(x.startsAt) < new Date(s.getTime() + 30 * 60000) && s < new Date(x.endsAt)));
        if (!busy) return { day: bangkokDay(days), time, start: starts[0] };
      }
    }
  }
  throw new Error("no free weekly time");
}

test("F-09 UI: tutor adds the same slot for 2 weeks (AC-51)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const free = await freeWeeklyTime(tutorApi, await calculusId(tutorApi));
  const weekday = free.start.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", weekday: "long" });

  await login(page, TUTOR.email);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await page.getByLabel("Date").fill(free.day);
  await page.getByLabel("Start time").selectOption(free.time);
  await page.getByLabel("Repeat every week").selectOption({ label: "2 weeks" });
  await page.getByRole("button", { name: "Add slot" }).click();
  await expect(page.locator(".success")).toHaveText(`2 slots added, every ${weekday} at ${free.time}.`);
  await page.screenshot({ path: `${SHOTS}/03-weekly-slots-added.png`, fullPage: true });

  // the same series again overlaps both weeks: nothing is added and the weeks are listed
  await page.getByRole("button", { name: "Add slot" }).click();
  await expect(page.locator(".error")).toContainText("Some weeks overlap your slots");
  await expect(page.locator(".week-errors li")).toHaveCount(2);
  await page.screenshot({ path: `${SHOTS}/04-weekly-slots-overlap.png`, fullPage: true });
  await tutorApi.dispose();
});

test("TEST-88 tutor sees the summary of a period, same numbers as the API (AC-60)", async ({ page }) => {
  const tutorApi = await apiAs(TUTOR.email);
  const id = await calculusId(tutorApi);
  const from = bangkokDay(-7), to = bangkokDay(14);
  const expected = await (await tutorApi.get(`/api/staff/schedules/${id}/summary?from=${from}&to=${to}`)).json();

  await login(page, TUTOR.email);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await page.getByRole("button", { name: "Summary" }).click();
  await page.getByLabel("From").fill(from);
  await page.getByLabel("To").fill(to);
  for (const [label, key] of [["Open", "open"], ["Booked", "booked"], ["Cancelled", "cancelled"], ["Attended", "attended"], ["No-show", "noShow"]]) {
    await expect(page.locator(`.stat[data-label="${label}"] strong`)).toHaveText(String(expected[key]));
  }
  expect(expected.booked + expected.open).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/05-summary.png`, fullPage: true });

  // a period of more than 92 days is refused by the API and shown under the field
  await page.getByLabel("From").fill(bangkokDay(-100));
  await expect(page.locator(".field-error")).toHaveText("The period can be at most 92 days");
  await tutorApi.dispose();
});

test.describe("TEST-90 no horizontal scroll at 375 px (AC-65, NFR-09)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  async function noSideScroll(page: import("@playwright/test").Page, name: string) {
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({ path: `${SHOTS}/r03-${name}.png`, fullPage: true });
    expect(width, `${name} scrollWidth`).toBeLessThanOrEqual(375);
  }

  test("five main screens fit in 375 px", async ({ page }) => {
    // a booking for the booking detail page
    const tutorApi = await apiAs(TUTOR.email);
    const slot = await createSlot(tutorApi, await calculusId(tutorApi), 12);
    const studentApi = await apiAs(STUDENT.email);
    const booked = await studentApi.post("/api/bookings", { data: { slotId: slot.id, topic: "Mobile check of the booking page" } });
    expect(booked.status()).toBe(201);
    const bookingId = (await booked.json()).id;

    await page.goto("/login");
    await noSideScroll(page, "1-login");

    await login(page, STUDENT.email);
    await page.goto("/slots");
    await expect(page.getByRole("heading", { name: "Find a session" })).toBeVisible();
    await noSideScroll(page, "2-find-a-session");
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await noSideScroll(page, "3-my-bookings");
    await page.goto(`/bookings/${bookingId}`);
    await expect(page.getByText("Mobile check of the booking page")).toBeVisible();
    await noSideScroll(page, "4-booking-detail");

    await page.getByRole("button", { name: "Log out" }).click();
    await login(page, TUTOR.email);
    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "My schedules" })).toBeVisible();
    await noSideScroll(page, "5-my-schedules");

    await studentApi.post(`/api/bookings/${bookingId}/cancel`, { data: {} });
    await tutorApi.dispose();
    await studentApi.dispose();
  });
});
