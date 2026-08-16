import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: 1,
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:4173/hurry-go-round/",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "VITE_E2E=1 npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/hurry-go-round/",
    reuseExistingServer: false,
  },
});
