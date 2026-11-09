import { test, expect } from "@playwright/test";
import { walkRoute } from "./world-helpers";

test("E uses whatever is within reach outdoors", async ({ page }) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Key Keeper", avatar: 2 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    await post({ kind: "starter", species: "emberfox", requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Key Keeper");
  await walkRoute(page, [
    [0, 11],
    [8, 26],
    [10, 24],
  ]);
  await expect(page.locator(".world-hud")).toHaveAttribute("data-near", "resource-8");
  // Still no prompt card on desktop: the key works on its own.
  await expect(page.locator(".interact")).toHaveCount(0);
  await page.keyboard.press("KeyE");
  await expect(page.getByRole("status")).toContainText("+1 Sunseed");
});

test("a battle can be played from the keyboard", async ({ page }) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Key Fighter", avatar: 3 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [{ kind: "starter", species: "emberfox" }, { kind: "guide" }])
      await post({ ...data, requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.getByRole("button", { name: "Arena" }).first().click();
  await page.getByRole("button", { name: /Practice vs computer/ }).click();
  await expect(page.getByRole("button", { name: /Auto (ON|OFF)/ })).toBeVisible();
  // Wait for our turn: the enemy may act first.
  await expect(page.getByText("Choose an ability, then its target.")).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".battle-announcer")).toContainText("Your turn:");
  const target = page.getByLabel("Battle target"),
    first = await target.inputValue();
  await page.keyboard.press("ArrowRight");
  await expect(target).not.toHaveValue(first);
  await page.keyboard.press("ArrowLeft");
  await expect(target).toHaveValue(first);
  await page.keyboard.press("Digit1");
  await expect(page.locator(".action-buttons button").first()).toHaveClass(/selected/);
  await page.keyboard.press("KeyF");
  await expect(page.getByRole("button", { name: "Fast ON" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Resolving action…")).toBeVisible({ timeout: 15000 });
  // Fast is remembered for the next visit.
  expect(await page.evaluate(() => localStorage.getItem("mythoveya-battle-fast"))).toBe("1");
});

test("panels hold keyboard focus like dialogs and give it back", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Tab Keeper", avatar: 2 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    await post({ kind: "starter", species: "emberfox", requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  const quests = page.getByRole("button", { name: "Quests" }).first();
  await quests.focus();
  await quests.press("Enter");
  // Named after its heading rather than its internal id.
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("h1,h2").first()).toBeVisible();
  const heading = (await dialog.locator("h1,h2").first().textContent())!;
  await expect(page.getByRole("dialog", { name: heading })).toBeVisible();
  await expect(dialog).toBeFocused();
  // Tab never leaves the dialog, however far it goes.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(quests).toBeFocused();
  // Shortcuts open the main panels, close their own, and leave others alone.
  await page.keyboard.press("KeyJ");
  await expect(page.locator('section[aria-label="collection"]')).toBeVisible();
  await page.keyboard.press("KeyT");
  await expect(page.locator('section[aria-label="collection"]')).toBeVisible();
  await page.keyboard.press("KeyJ");
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("KeyT");
  await expect(page.locator('section[aria-label="formation"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyM");
  await expect(page.locator('section[aria-label="map"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyQ");
  await expect(page.locator('section[aria-label="quests"]')).toBeVisible();
});

test("keys can be changed in settings and the game answers to them", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Rebind Keeper", avatar: 4 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    await post({ kind: "starter", species: "emberfox", requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator(".keeper-badge").waitFor();
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByText("Keyboard keys").click();
  await page.getByRole("button", { name: "Journal: J. Change" }).click();
  await expect(page.getByRole("button", { name: "Journal: press a new key" })).toBeVisible();
  await page.keyboard.press("KeyK");
  await expect(page.getByRole("button", { name: "Journal: K. Change" })).toBeVisible();
  // Waiting for a key, Esc cancels without closing the panel.
  await page.getByRole("button", { name: "Team: T. Change" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Team: T. Change" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("KeyK");
  await expect(page.locator('section[aria-label="collection"]')).toBeVisible();
  await page.keyboard.press("Escape");
  // The choice lasts, and Reset keys puts the defaults back.
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator(".keeper-badge").waitFor();
  await page.keyboard.press("KeyK");
  await expect(page.locator('section[aria-label="collection"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByText("Keyboard keys").click();
  await page.getByRole("button", { name: "Reset keys" }).click();
  await expect(page.getByRole("button", { name: "Journal: J. Change" })).toBeVisible();
});
