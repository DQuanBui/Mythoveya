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
});
