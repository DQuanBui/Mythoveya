// Reproducible compiled-build timings, using a disposable save and a fresh browser.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const port = 27864, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["dist/server/index.js"], {
  env: { ...process.env, SERVER_PORT: String(port), DB_PATH: join(mkdtempSync(join(tmpdir(), "mythoveya-timing-")), "save.sqlite") },
  windowsHide: true, stdio: "ignore",
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(base + "/api/health")).ok; } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw Error("Timing server failed to start");
  browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-gpu", ...(process.platform === "win32" ? ["--use-angle=d3d11"] : [])] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.longTasks = [];
    new PerformanceObserver((list) => window.longTasks.push(...list.getEntries().map((e) => ({ start: e.startTime, duration: e.duration })))).observe({ type: "longtask", buffered: true });
  });
  const started = performance.now();
  await page.goto(base);
  await page.getByRole("button", { name: "Begin your journey" }).waitFor();
  const titleMs = performance.now() - started;
  const titleJsBytes = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.name.endsWith(".js")).reduce((sum, r) => sum + r.decodedBodySize, 0));
  await page.getByRole("button", { name: "Begin your journey" }).click();
  await page.getByLabel("Keeper name").fill("Timing Keeper");
  await page.getByRole("button", { name: "Choose this keeper" }).click();
  const worldStart = performance.now();
  await page.getByRole("button", { name: "Begin with Emberfox" }).click();
  await page.locator(".keeper-badge").waitFor();
  const worldMs = performance.now() - worldStart;
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.longTasks = []; });
  const journalStart = performance.now();
  await page.locator(".world-nav").getByRole("button", { name: "Journal" }).click();
  await page.locator(".creature-card").first().waitFor();
  const journalMs = performance.now() - journalStart;
  await page.waitForTimeout(2000);
  const journal = await page.evaluate(() => ({
    cards: document.querySelectorAll(".creature-card").length,
    renderedPortraits: [...document.querySelectorAll(".creature-card img")].filter((img) => img.src.startsWith("data:")).length,
    longTasks: window.longTasks,
  }));
  const report = { titleMs, titleJsBytes, worldMs, journalMs, journal, errors };
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(`artifacts/loading-${process.argv[2] || "current"}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
