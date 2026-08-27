import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "./back",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: { CORS_ORIGIN: "http://localhost:5173" },
    },
    {
      command: "npm run dev",
      cwd: "./front",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      env: { VITE_BACKEND_URL: "http://localhost:3000" },
    },
  ],
});
