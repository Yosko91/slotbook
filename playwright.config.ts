import { defineConfig, devices } from "@playwright/test";

// own ports, so it does not collide with another app on 3000 or 5173
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3100";
const CLIENT_URL = process.env.E2E_CLIENT_URL ?? "http://localhost:5181";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: CLIENT_URL,
    locale: "en-GB",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run start",
      cwd: "server",
      url: `${API_URL}/api/health`,
      reuseExistingServer: true,
      env: { PORT: new URL(API_URL).port, CLIENT_ORIGIN: CLIENT_URL },
    },
    {
      command: `npx vite --port ${new URL(CLIENT_URL).port} --strictPort`,
      cwd: "client",
      url: CLIENT_URL,
      reuseExistingServer: true,
      env: { VITE_API_URL: API_URL },
    },
  ],
});
