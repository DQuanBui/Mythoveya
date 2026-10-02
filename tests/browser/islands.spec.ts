import { test, expect, type Page } from "@playwright/test";

/** Screen position of a world point through the live camera. */
const project = (page: Page, point: number[]) =>
  page.evaluate(async (point) => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"));
    if (!url) throw Error("Renderer missing");
    const { _roots } = await import(/* @vite-ignore */ url);
    const canvas = document.querySelector(".scene canvas")!;
    const { camera } = _roots.get(canvas).store.getState();
    const v = camera.position.clone().set(...point).project(camera);
    const box = canvas.getBoundingClientRect();
    return {
      x: box.left + ((v.x + 1) * box.width) / 2,
      y: box.top + ((1 - v.y) * box.height) / 2,
    };
  }, point);
/** Keeper position from the minimap, which spans ±span metres. */
const position = (page: Page, span: number) =>
  page
    .locator(".map-ring b")
    .evaluate(
      (dot: HTMLElement, span) => [
        ((parseFloat(dot.style.left) - 50) * span) / 50,
        ((parseFloat(dot.style.top) - 50) * span) / 50,
      ],
      span,
    );
async function walkTo(page: Page, x: number, z: number) {
  for (let i = 0; i < 30; i++) {
    const [px, pz] = await position(page, 78),
      d = Math.hypot(x - px, z - pz);
    if (d < 1.5) return;
    let step = Math.min(1, 10 / d),
      p = await project(page, [x, 0, z]);
    for (;;) {
      p = await project(page, [px + (x - px) * step, 0, pz + (z - pz) * step]);
      if ((p.x > 330 && p.x < 1240 && p.y > 140 && p.y < 760) || step * d < 1.5) break;
      step *= 0.75;
    }
    await page.mouse.click(p.x + (i % 3) * 30, p.y);
    await page.waitForTimeout(250);
    // A click that lands on a wandering creature opens its card; close it and retry.
    if (await page.locator(".modal").count()) {
      await page.keyboard.press("Escape");
      continue;
    }
    await page.waitForTimeout(Math.min(4000, 400 + (d * step * 1000) / 6));
  }
  throw Error(`Could not reach ${x},${z}`);
}

test("sail to the home island, build, reload and sail back", async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Isle Builder", avatar: 3 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [{ kind: "starter", species: "emberfox" }, { kind: "guide" }])
      await post({ ...data, requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Isle Builder");
  await page.waitForTimeout(1500);

  // The Skyferry dock sits at the end of the meadow trail.
  await walkTo(page, 1, 35.5);
  await page.locator('[data-marker="skyferry"]').click();
  await expect(page.locator(".skyferry-panel")).toBeVisible();
  await page.locator('[data-destination="home"] button').click();
  await expect(page.locator(".island-card")).toBeVisible();
  await expect(page.locator(".location")).toContainText("Hearthfall Isle");
  // The keeper steps off at the west dock of a 14 m island.
  const [ax, az] = await position(page, 17);
  expect(Math.hypot(ax + 11, az)).toBeLessThan(1.5);

  // Place a shade oak, turning it once, after a refused spot on the walkway.
  await page.getByRole("button", { name: "Build & manage →" }).click();
  await page.locator("article", { hasText: "Shade oak" }).getByRole("button").click();
  await expect(page.locator(".placement-bar")).toBeVisible();
  await page.waitForTimeout(600);
  let p = await project(page, [-8, 0, 0]);
  await page.mouse.move(p.x, p.y);
  await expect(page.locator(".placement-tip")).toContainText("dock path");
  await page.mouse.click(p.x, p.y);
  await expect(page.locator(".placement-bar")).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.locator(".placement-bar")).toBeVisible();
  p = await project(page, [-6, 0, -7]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator(".placement-bar")).toHaveCount(0);
  await expect(page.locator(".toast")).toContainText("Shade oak placed");

  // Saved layout and island visit survive a reload.
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".island-card")).toContainText("1 piece placed");
  const home = await page.evaluate(async () => {
    const r = await fetch("/api/profile", {
      headers: { Authorization: "Bearer " + localStorage.getItem("mythoveya-session") },
    });
    return (await r.json()).home;
  });
  expect(home.items).toEqual([{ uid: "h1", kind: "oak", x: -6, z: -7, rot: 1 }]);

  // The pause menu always offers the way back.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sail back to Havenreach" }).click();
  await expect(page.locator(".island-card")).toHaveCount(0);
  await expect(page.locator(".location")).toContainText("Havenreach");
  const [hx, hz] = await position(page, 78);
  expect(Math.hypot(hx + 0.95, hz - 36.6)).toBeLessThan(1.5);
  expect(errors).toEqual([]);
});
