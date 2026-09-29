import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const port = 27863,
  url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["dist/server/index.js"], {
  env: {
    ...process.env,
    SERVER_PORT: String(port),
    DB_PATH: join(
      mkdtempSync(join(tmpdir(), "mythoveya-layout-")),
      "save.sqlite",
    ),
  },
  stdio: "ignore",
  windowsHide: true,
});
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url + "/api/health")).ok) break;
    } catch {}
    await delay(100);
  }
  browser = await chromium.launch();
  mkdirSync("artifacts", { recursive: true });
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage();
    const errors = [],
      outside = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith(url) && !r.url().startsWith("data:"))
        outside.push(r.url());
    });
    await page.goto(url);
    await page.getByRole("button", { name: "Begin your journey" }).waitFor();
    await delay(1200);
    await page.screenshot({ path: `artifacts/title-${width}.png` });
    await page.evaluate(async () => {
      const post = (path, data, token = "") =>
        fetch("/api/" + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(data),
        }).then((r) => r.json());
      const g = await post("guest", { name: "Layout Keeper", avatar: 1 });
      localStorage.setItem("mythoveya-session", g.token);
      await post(
        "mutate",
        {
          kind: "starter",
          species: "ripplefin",
          requestId: crypto.randomUUID(),
        },
        g.token,
      );
      await post(
        "mutate",
        { kind: "guide", requestId: crypto.randomUUID() },
        g.token,
      );
    });
    await page.reload();
    await page.getByRole("button", { name: "Continue your journey" }).click();
    await page.locator(".world-nav").waitFor();
    await delay(1300);
    await page.screenshot({ path: `artifacts/world-${width}.png` });
    for (const selector of [".world-nav", ".companion-strip", ".currencies"]) {
      const box = await page.locator(selector).boundingBox();
      assert(
        box &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= width &&
          box.y + box.height <= height,
        `${selector} clipped at ${width}`,
      );
    }
    await page
      .locator(".world-nav")
      .getByRole("button", { name: "Journal" })
      .click();
    await page.locator(".creature-card").last().waitFor();
    await delay(1000);
    await page.screenshot({ path: `artifacts/journal-${width}.png` });
    assert.equal(await page.locator(".creature-card").count(), 60);
    if (width === 1440) {
      // Visual fixtures only: inspect each region without changing the saved profile.
      for (const region of ["meadow", "canyon", "hollow"]) {
        await page.route("**/api/profile", async (route) => {
          const response = await route.fetch();
          const profile = await response.json();
          await route.fulfill({ response, json: { ...profile, region } });
        });
        await page.reload();
        await page
          .getByRole("button", { name: "Continue your journey" })
          .click();
        await page.locator(".world-nav").waitFor();
        await delay(1500);
        await page.screenshot({ path: `artifacts/region-${region}.png` });
        await page.unroute("**/api/profile");
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(outside, []);
    await context.close();
    console.log(
      `${width} x ${height}: compiled title, world, journal, controls and offline assets PASS`,
    );
  }
} finally {
  await browser?.close();
  server.kill();
}
