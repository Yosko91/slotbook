import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { OTHER_STUDENT, TUTOR, fmtDate, login, startText } from "./helpers";

const SHOTS = "docs/sprints/sprint-3/evidence/screenshots";

test("TEST-83 tutor records attendance of a past session (AC-55, AC-56)", async ({ page }) => {
  const out = execSync("npx tsx scripts/e2e-past-session.ts", { cwd: "server" }).toString().trim().split("\n").pop()!;
  const { bookingId, startsAt } = JSON.parse(out) as { bookingId: number; startsAt: string };
  const start = new Date(startsAt);

  await login(page, TUTOR.email);
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await page.getByRole("button", { name: "Past sessions" }).click();
  const row = page.locator("tr", { hasText: fmtDate(start) }).filter({ hasText: startText(start) }).filter({ hasText: OTHER_STUDENT.name });
  await expect(row.getByRole("button", { name: "Attended" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-past-sessions.png`, fullPage: true });

  await row.getByRole("button", { name: "Attended" }).click();
  await expect(page.locator(".success")).toHaveText(`Attendance recorded for ${OTHER_STUDENT.name}.`);
  await expect(row).toContainText("Attended");
  await expect(row.getByRole("button", { name: "No-show" })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/02-attendance-recorded.png`, fullPage: true });

  // saved: still there after a reload, and the booking detail shows it
  await page.reload();
  await page.getByLabel("Schedule").selectOption({ label: "Calculus I" });
  await page.getByRole("button", { name: "Past sessions" }).click();
  await expect(row).toContainText("Attended");
  await page.goto(`/bookings/${bookingId}`);
  await expect(page.locator(".attendance")).toHaveText("Attended");

  // backend: a second record is refused (BR-17)
  const again = await page.request.post(`${process.env.E2E_API_URL ?? "http://localhost:3100"}/api/staff/bookings/${bookingId}/attendance`, {
    data: { status: "NO_SHOW" },
  });
  expect(again.status()).toBe(409);
});
