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
