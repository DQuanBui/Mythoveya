import { test, expect } from "@playwright/test";

test("exploration HUD stays usable across desktop and touch layouts", async ({
  page,
  browser,
}) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (path: string, data: unknown, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post("guest", { name: "Haven Reviewer", avatar: 0 });
    localStorage.setItem("mythoveya-session", g.token);
    await post(
      "mutate",
      { kind: "starter", species: "emberfox", requestId: crypto.randomUUID() },
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
  await expect(page.locator(".quest-tracker")).toContainText("A first bond");
  await expect(page.getByLabel("Quest waypoint: Wild encounter")).toBeVisible();
  await expect(
    page.locator('.world-label[data-marker^="resource"]'),
  ).toHaveCount(0);
  await expect(page.locator('.world-label[data-marker="boss"]')).toHaveCount(0);
  await expect(page.locator(".companion-strip .portrait")).toHaveCount(6);

  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
    [390, 844],
    [360, 780],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await expect(page.locator(".quest-tracker")).toBeVisible();
    await expect(page.locator(".minimap")).toBeVisible();
    const problems = await page.evaluate(() => {
      const selectors = [
        ".keeper-badge",
        ".currencies",
        ".quest-tracker",
        ".minimap",
        ".world-nav",
        ".companion-strip",
        ".interact",
        ".touch-movement",
      ];
      const problems: string[] = [];
      const boxes: { selector: string; rect: DOMRect }[] = [];
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (!element || getComputedStyle(element).display === "none") continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (
          rect.x < 15 ||
          rect.y < 15 ||
          rect.right > innerWidth - 15 ||
          rect.bottom > innerHeight - 15
        )
          problems.push(selector + " outside safe area");
        boxes.push({ selector, rect });
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          if (
            Math.min(a.rect.right, b.rect.right) -
              Math.max(a.rect.x, b.rect.x) >
              2 &&
            Math.min(a.rect.bottom, b.rect.bottom) -
              Math.max(a.rect.y, b.rect.y) >
              2
          )
            problems.push(a.selector + " overlaps " + b.selector);
        }
      if (document.documentElement.scrollWidth > innerWidth)
        problems.push("horizontal overflow");
      return problems;
    });
    expect(problems, `${width} x ${height}`).toEqual([]);
    if ([1440, 390, 844].includes(width))
      await page.screenshot({ path: `artifacts/hud-${width}.png` });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Diamonds: 0", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toContainText("battles and quests");
  await page.getByRole("button", { name: "Gold: 200", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toContainText("train a companion");
  await page.getByRole("button", { name: "Open settings" }).focus();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("button", { name: "Travel map" }).click();
  await expect(page.locator(".modal")).toBeVisible();
  await page.getByLabel("Close panel").click();

  const before = await page.locator(".map-ring b").getAttribute("style");
  const pad = await page
    .getByRole("button", { name: "Movement joystick" })
    .boundingBox();
  if (!pad) throw Error("Touch movement missing");
  await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    pad.x + pad.width / 2 + 25,
    pad.y + pad.height / 2 - 15,
  );
  await expect
    .poll(() => page.locator(".map-ring b").getAttribute("style"))
    .not.toBe(before);
  await page.mouse.up();
  // Position is published by the world at 5 Hz; let the final movement sample settle.
  await page.waitForTimeout(350);
  const stopped = await page.locator(".map-ring b").getAttribute("style");
  await page.waitForTimeout(500);
  await expect(page.locator(".map-ring b")).toHaveAttribute("style", stopped!);
  expect(errors).toEqual([]);
  const storageState = await page.context().storageState();
  await page.close();
  const touch = await browser.newContext({
    storageState,
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const landscape = await touch.newPage();
  landscape.on("pageerror", (e) => errors.push(e.message));
  await landscape.goto("http://127.0.0.1:5174/");
  await landscape
    .getByRole("button", { name: "Continue your journey" })
    .click();
  await expect(
    landscape.getByRole("button", { name: "Movement joystick" }),
  ).toBeVisible();
  await expect(landscape.locator(".quest-tracker")).toBeVisible();
  await expect(landscape.locator(".minimap")).toBeVisible();
  const padBox = await landscape.locator(".touch-movement").boundingBox();
  const questBox = await landscape.locator(".quest-tracker").boundingBox();
  expect(padBox!.y).toBeGreaterThanOrEqual(questBox!.y + questBox!.height);
  await landscape.screenshot({ path: "artifacts/hud-touch-landscape.png" });
  await touch.close();
  expect(errors).toEqual([]);
});
