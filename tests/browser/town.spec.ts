import { test, expect, type Page } from "@playwright/test";
import { RAIN_GROWTH, weatherAt } from "../../packages/shared/weather";
async function profile(page: Page) {
  return page.evaluate(async () =>
    fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("mythoveya-session")}`,
      },
    }).then((r) => r.json()),
  );
}
async function directory(page: Page) {
  if (
    await page.getByRole("button", { name: "Meet the other villagers" }).count()
  )
    await page
      .getByRole("button", { name: "Meet the other villagers" })
      .click();
  else {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "People of the reaches" }).click();
  }
}
async function villager(page: Page, name: string, tab = "Services") {
  await page
    .locator(".town-directory")
    .getByRole("button", { name: new RegExp(name) })
    .click();
  await page.getByRole("tab", { name: tab, exact: tab !== "Missions" }).click();
}
test("village missions, market, gardening and companion care persist", async ({
  page,
}) => {
  test.setTimeout(300000);
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
    const g = await post("guest", { name: "Village Gardener", avatar: 3 });
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [
      { kind: "starter", species: "emberfox" },
      { kind: "guide" },
    ])
      await post(
        "mutate",
        { ...data, requestId: crypto.randomUUID() },
        g.token,
      );
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await directory(page);
  await expect(page.locator(".town-directory > button")).toHaveCount(8);
  await page.screenshot({ path: "artifacts/village-directory.png" });
  await villager(page, "Gardener Wren");
  await page
    .getByRole("button", { name: "Plant Sunseed", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Growing", exact: false }),
  ).toBeDisabled();
  const planted = (await profile(page)).town.garden;
  // Rain grows crops faster, so the expected time follows the weather at planting.
  const rain = weatherAt(planted.plantedAt).weather === "rain";
  expect(planted.readyAt - planted.plantedAt).toBe(
    Math.round(120000 * (rain ? RAIN_GROWTH : 1)),
  );
  await directory(page);
  await villager(page, "Pip the Trader");
  await page.getByRole("button", { name: "Buy Sunseed", exact: true }).click();
  await page
    .getByRole("button", { name: "Sell 1 Sunseed", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText("Sold Sunseed");
  await page
    .getByRole("button", { name: "Sell 1 Sunseed", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Sell 1 Sunseed", exact: false }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Missions" }).click();
  for (const index of [0, 1]) {
    const mission = page.locator(".village-missions article").nth(index);
    await mission
      .getByRole("button", { name: "Claim mission reward", exact: true })
      .click();
    await expect(
      mission.getByRole("button", { name: "Reward collected", exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator(".helper-badge")).toBeVisible();
  await page
    .getByRole("button", { name: "Collect daily help", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Today's help collected" }),
  ).toBeDisabled();
  await page.screenshot({ path: "artifacts/village-helper.png" });
  await page.getByRole("tab", { name: "Services", exact: true }).click();
  const accessory = page.getByRole("button", {
    name: /Buy (Meadow ribbon|Wayfarer's bell)/,
  });
  await accessory.click();
  const equip = page
    .locator(".companion-care button:not([disabled])")
    .filter({ hasText: /Equip/ });
  await equip.click();
  await expect(page.locator(".companion-care")).toContainText("Wearing");
  await page.screenshot({ path: "artifacts/village-market.png" });
  await directory(page);
  await villager(page, "Keeper Sella");
  await page.getByLabel("Companion nickname").fill("Little Ember");
  await page.getByRole("button", { name: "Save nickname" }).click();
  await expect(page.locator(".care-detail strong")).toHaveText("Little Ember");
  await directory(page);
  await villager(page, "Gardener Wren");
  await page.getByRole("button", { name: "Feed 1 treat" }).click();
  await expect(page.getByLabel("Companion friendship")).toHaveAttribute(
    "value",
    "10",
  );
  await page.getByRole("tab", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Teach me to garden" }).click();
  await expect(page.locator(".dialogue-reply")).toContainText(
    "Growth continues while you are away",
  );
  await page.getByRole("tab", { name: "Missions", exact: true }).click();
  await page.getByRole("button", { name: "Track this story" }).click();
  await expect(page.locator(".quest-tracker")).toContainText(
    "Something takes root",
  );
  const before = await profile(page);
  expect(before.town.helpers).toContain("pip");
  expect(before.owned[0].accessory).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  const after = await profile(page);
  expect(after).toEqual(before);
  const visibleWorld = await page.evaluate(async () => {
    const moduleUrl = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((name) => name.includes("@react-three_fiber.js"));
    if (!moduleUrl) throw Error("World renderer module missing");
    const { _roots } = await import(/* @vite-ignore */ moduleUrl);
    const canvas = document.querySelector(".scene canvas");
    const scene = _roots.get(canvas).store.getState().scene;
    return {
      villagers: scene.children.filter((o: { name: string }) =>
        o.name.startsWith("npc-"),
      ).length,
      accessory: !!scene.getObjectByName("companion-accessory"),
      garden: !!scene.getObjectByName("village-garden"),
      market: !!scene.getObjectByName("village-market"),
    };
  });
  expect(visibleWorld).toEqual({
    villagers: 8,
    accessory: true,
    garden: true,
    market: true,
  });
  await expect(
    page.locator('.companion-strip [title="Little Ember"]'),
  ).toBeVisible();
  await directory(page);
  await villager(page, "Gardener Wren");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/village-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  // Exercise a real two-minute crop while the preceding services are reviewed.
  await expect(
    page.getByRole("button", { name: "Harvest crop", exact: true }),
  ).toBeEnabled({ timeout: 130000 });
  await page.getByRole("button", { name: "Harvest crop", exact: true }).click();
  await page.getByRole("button", { name: "Craft treat", exact: true }).click();
  await page.getByRole("tab", { name: "Missions" }).click();
  for (const index of [0, 1]) {
    const mission = page.locator(".village-missions article").nth(index);
    await mission
      .getByRole("button", { name: "Claim mission reward", exact: true })
      .click();
    await expect(
      mission.getByRole("button", { name: "Reward collected", exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator(".helper-badge")).toBeVisible();
  const final = await profile(page);
  expect(final.town.helpers).toEqual(expect.arrayContaining(["pip", "wren"]));
  expect(final.town.garden).toBeNull();
  expect(errors).toEqual([]);
});
