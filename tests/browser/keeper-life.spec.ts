import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { activeSeason } from "../../packages/shared/seasons";
import { clickWorld, walkRoute } from "./world-helpers";

test("photo mode, the seasonal festival and stepping inside a home", async ({ page }) => {
  test.setTimeout(360000);
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
    const g = await post({ name: "Cosy Keeper", avatar: 1 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [{ kind: "starter", species: "emberfox" }, { kind: "guide" }])
      await post({ ...data, requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Cosy Keeper");

  // Photo mode hides the HUD and saves a framed, filtered picture.
  await page.keyboard.press("KeyP");
  await expect(page.getByRole("toolbar", { name: "Photo mode" })).toBeVisible();
  await expect(page.locator(".keeper-badge")).toHaveCount(0);
  await page.getByRole("radio", { name: "Ink" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Take photo/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^mythoveya-\d{8}-\d{6}\.png$/);
  expect(readFileSync((await download.path())!).length).toBeGreaterThan(20000);
  await page.screenshot({ path: "artifacts/photo-mode.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".keeper-badge")).toContainText("Cosy Keeper");
  await expect(page.locator(".modal")).toHaveCount(0);

  const season = activeSeason();
  if (season) {
    await page.getByRole("button", { name: "Events and missions" }).click();
    await expect(page.getByRole("tab", { name: new RegExp(season.season.name) })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".season-clues li")).toHaveCount(season.season.spots.length);
    await page.keyboard.press("Escape");
  }

  // Arrive from the east so the trailing companion stays clear of the lantern.
  await walkRoute(page, [
    [0, 11],
    [-12, 15],
    [-11.5, 9.5],
    [-14, 8.8],
  ]);
  if (season?.season.id === "lantern-night") {
    await clickWorld(page, [-15.6, 0.35, 7.7]);
    await expect(page.getByRole("status")).toContainText("Lantern Night lantern");
  }
  await clickWorld(page, [-14, 1.6, 5]);
  await expect(page.getByRole("heading", { name: "Maplewick Workshop", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step inside →" }).click();
  await expect(page.getByRole("heading", { name: "Maplewick Workshop", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Workbench" }).click();
  await page.getByRole("button", { name: "Accept today's gift" }).click({ timeout: 30000 });
  await expect(page.getByRole("status")).toContainText("Tobin Maple");
  await expect(page.getByRole("button", { name: "Gift taken today" })).toBeDisabled();
  await page.screenshot({ path: "artifacts/home-workshop.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Talk to Tobin Maple" }).click();
  await expect(page.getByRole("heading", { name: "Tobin Maple" })).toBeVisible({ timeout: 30000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Step outside" }).first().click();
  await expect(page.locator(".keeper-badge")).toContainText("Cosy Keeper");
  expect(errors).toEqual([]);
});
