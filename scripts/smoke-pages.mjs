// Plays the opening of the static GitHub Pages build in Chromium.
//   node scripts/smoke-pages.mjs                     # builds dist/pages and previews it
//   node scripts/smoke-pages.mjs https://host/path/  # checks a deployed copy
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const target = process.argv[2];
const port = 4179,
  url = target || `http://127.0.0.1:${port}/Mythoveya/`;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let preview;
if (!target) {
  const build = spawn("npm", ["run", "build:pages"], { shell: true, stdio: "inherit" });
  if (await new Promise((r) => build.on("exit", r))) throw Error("Pages build failed");
  preview = spawn("npx", ["vite", "preview", "--mode", "pages", "--port", String(port), "--strictPort"], {
    shell: true,
    windowsHide: true,
    stdio: "ignore",
  });
  for (let i = 0; i < 100 && !(await fetch(url).then((r) => r.ok, () => false)); i++) await delay(100);
}
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-gpu", ...(process.platform === "win32" ? ["--use-angle=d3d11"] : [])],
});
const problems = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => problems.push("page error: " + e.message));
  page.on("console", (m) => m.type() === "error" && problems.push("console: " + m.text()));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
  await page.goto(url);
  await page.getByRole("button", { name: "Begin your journey" }).click({ timeout: 30000 });
  await page.getByLabel("Keeper name").fill("Pages Smoke");
  await page.getByRole("button", { name: "Choose this keeper" }).click();
  await page.getByRole("button", { name: "Begin with Emberfox" }).click();
  await page.locator(".keeper-badge").getByText("Pages Smoke").waitFor({ timeout: 30000 });
  await page.waitForSelector(".world-hud canvas, canvas", { timeout: 30000 });
  await delay(3000);
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/pages-world.png" });
  // The save lives in this browser: reloading returns to the same keeper.
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click({ timeout: 30000 });
  await page.locator(".keeper-badge").getByText("Pages Smoke").waitFor({ timeout: 30000 });
  if (problems.length) throw Error(problems.join("\n"));
  console.log(`Pages smoke passed: ${url}`);
} finally {
  await browser.close();
  if (preview) spawn("taskkill", ["/pid", String(preview.pid), "/T", "/F"], { stdio: "ignore" }).on("error", () => preview.kill());
}
