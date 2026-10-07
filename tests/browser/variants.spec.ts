import { test, expect, type Page } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import type { Profile } from "../../packages/shared/types";

async function shimmeringModels(page: Page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map((r) => r.name).find((n) => n.includes("@react-three_fiber.js"));
    if (!url) return 0;
    const { _roots } = await import(/* @vite-ignore */ url);
    let count = 0;
    for (const canvas of document.querySelectorAll("canvas")) {
      _roots.get(canvas)?.store.getState().scene.traverse((object: any) => {
        if (object.userData.shimmer === true && object.userData.glints?.children.length === 3) count++;
      });
    }
    return count;
  });
}

test("saved shimmer survives Journal, following, habitats, battles and reload", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const guest = await (await request.post("/api/guest", { data: { name: "Shimmer Keeper", avatar: 0 } })).json();
  const headers = { Authorization: `Bearer ${guest.token}` };
  const mutate = async (kind: string, data = {}) => {
    const response = await request.post("/api/mutate", { headers, data: { requestId: crypto.randomUUID(), kind, ...data } });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  await mutate("starter", { species: "emberfox" });
  await mutate("guide");
  // Seed a guaranteed rare fixture in the isolated browser-test save, never the player database.
  const db = new DatabaseSync("data/browser-tests.sqlite");
  const row = db.prepare("SELECT data FROM profiles WHERE id=?").get(guest.profile.id) as { data: string };
  const profile: Profile = JSON.parse(row.data);
  profile.owned.forEach((o, i) => { o.shimmer = i === 0; });
  profile.gold = 2000;
  db.prepare("UPDATE profiles SET data=? WHERE id=?").run(JSON.stringify(profile), profile.id);
  db.close();
  await page.addInitScript((token) => localStorage.setItem("mythoveya-session", token), guest.token);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect.poll(() => shimmeringModels(page)).toBe(1);
  await expect(page.locator('.companion-strip img[data-shimmer="true"]')).toHaveAttribute("alt", "Shimmering Emberfox");
  await page.screenshot({ path: "artifacts/shimmer-following.png" });

  await page.locator(".world-nav").getByRole("button", { name: "Journal" }).click();
  const card = page.locator(".creature-card").filter({ has: page.getByAltText("Shimmering Emberfox", { exact: true }) });
  await expect(card).toContainText("Shimmering");
  await expect(card.locator("img")).toHaveAttribute("src", /^data:image/);
  await card.click();
  await expect(page.getByText("Shimmering companion", { exact: true })).toBeVisible();
  await expect.poll(() => shimmeringModels(page)).toBe(2);
  await page.screenshot({ path: "artifacts/shimmer-journal.png" });
  await page.getByLabel("Close panel").click();

  await mutate("island-travel", { region: "home" });
  const placed = await mutate("home-place", { item: "habitat-flame", x: -6, z: -7, rot: 0 });
  await mutate("home-assign", { quest: placed.value.uid, id: profile.owned[0].id });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".location")).toContainText("Hearthfall");
  await expect.poll(() => shimmeringModels(page)).toBe(2);
  await page.screenshot({ path: "artifacts/shimmer-habitat.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sail back to Havenreach" }).click();

  const battle = await request.post("/api/battle/start", { headers, data: {} });
  expect(battle.ok()).toBe(true);
  expect((await battle.json()).units.find((u: any) => u.id === "0:0").shimmer).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.getByRole("button", { name: "Auto OFF" })).toBeVisible();
  await expect.poll(() => shimmeringModels(page)).toBe(1);
  await page.screenshot({ path: "artifacts/shimmer-battle.png" });
  const saved = await (await request.get("/api/profile", { headers })).json();
  expect(saved.owned.map((o: any) => o.shimmer)).toEqual([true, false, false, false, false, false]);
  expect(errors).toEqual([]);
});

test("Journal defers offscreen portraits and renders them after scrolling", async ({ page, request }) => {
  const g = await (await request.post("/api/guest", { data: { name: "Portrait Keeper", avatar: 1 } })).json();
  await request.post("/api/mutate", { headers: { Authorization: `Bearer ${g.token}` }, data: { kind: "starter", species: "emberfox", requestId: crypto.randomUUID() } });
  await page.addInitScript((token) => localStorage.setItem("mythoveya-session", token), g.token);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator(".world-nav").getByRole("button", { name: "Journal" }).click();
  await expect(page.locator(".creature-card").first().locator("img")).toHaveAttribute("src", /^data:image/);
  const last = page.locator(".creature-card").last().locator("img");
  await expect(last).toHaveAttribute("src", "/emblem.svg");
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute("src", /^data:image/);
});
