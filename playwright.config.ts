import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:4100",
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npx next start -p 4100",
        url: "http://localhost:4100/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 90000,
      },
});
