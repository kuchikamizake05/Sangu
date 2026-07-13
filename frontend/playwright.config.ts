import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }, { name: "mobile", use: { ...devices["Pixel 5"], channel: "chrome" } }],
  webServer: { command: "npm.cmd run dev -- --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120000 },
});
