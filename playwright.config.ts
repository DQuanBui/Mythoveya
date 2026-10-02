import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    video: "on",
    trace: "retain-on-failure",
    // Render with the real GPU when one is available; software WebGL is far
    // slower than any player's machine and makes 3D checks unrepresentative.
    launchOptions: {
      args: [
        "--ignore-gpu-blocklist",
        "--enable-gpu",
        ...(process.platform === "win32" ? ["--use-angle=d3d11"] : []),
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5174/api/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      CLIENT_PORT: "5174",
      SERVER_PORT: "2568",
      DB_PATH: "data/browser-tests.sqlite",
    },
  },
});
