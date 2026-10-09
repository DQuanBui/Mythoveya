import { test, expect, type Page } from "@playwright/test";

async function travel(page: Page, name: string, panel: string) {
  if (await page.getByLabel("Close panel").count())
    await page.getByLabel("Close panel").click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page
    .locator(".haven-destinations")
    .getByRole("button", { name, exact: true })
    .click();
  await page.getByRole("button", { name: "Set walking waypoint" }).click();
  await page
    .getByRole("button", { name: "Walk to waypoint", exact: true })
    .click();
  await expect(page.locator(`section[aria-label="${panel}"]`)).toBeVisible({
    timeout: 90000,
  });
}
async function sails(page: Page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const scene = _roots
      .get(document.querySelector(".scene canvas"))
      ?.store.getState().scene;
    return scene?.getObjectByName("windmill-sails")?.rotation.z ?? null;
  });
}
test("walk the windmill journey, use companions, calm guardian and persist restoration", async ({
  page,
}) => {
  test.setTimeout(600000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = async (path: string, data: unknown, token = "") => {
      const response = await fetch("/api/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) throw Error(JSON.stringify(body));
      return body;
    };
    const g = await post("guest", { name: "Windmill Keeper", avatar: 1 });
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
    // Prepare through normal encounters and paid training. An untouched
    // level-one team can legitimately lose this guardian on an unlucky seed.
    for (let win = 0; win < 2; win++) {
      let b = await post("battle/start", {}, g.token);
      for (let turn = 0; turn < 360 && b.winner === null; turn++) {
        await new Promise((r) =>
          setTimeout(r, Math.max(0, b.readyAt - Date.now()) + 15),
        );
        b = await post(
          "battle/act",
          {
            auto: true,
            fast: true,
            sequence: b.sequence,
          },
          g.token,
        );
      }
      if (b.winner !== 0) throw Error("Could not prepare the windmill team");
    }
    const profile = await fetch("/api/profile", {
      headers: { Authorization: "Bearer " + g.token },
    }).then((r) => r.json());
    for (const id of profile.team.slice(0, 3)) {
      const result = await post(
        "mutate",
        {
          kind: "train",
          id,
          requestId: crypto.randomUUID(),
        },
        g.token,
      );
      if (result.error) throw Error(result.error);
    }
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Windmill Keeper");
  await expect.poll(() => sails(page)).not.toBeNull();
  const stopped = await sails(page);
  await page.waitForTimeout(500);
  expect(await sails(page)).toBe(stopped);
  await travel(page, "The Silent Windmill", "exp-mill");
  await page
    .getByRole("button", { name: "Begin the windmill journey" })
    .click();
  for (const [name, id, ability] of [
    ["Emberlight beacon", "brazier", "Kindle"],
    ["Reedwater sluice", "sluice", "Flow"],
    ["Rootbound spindle", "roots", "Bloom"],
  ]) {
    await travel(page, name, `exp-${id}`);
    await page
      .getByRole("button", { name: `Use ${ability}`, exact: true })
      .click();
    await expect(page.locator(".expedition-grid")).toContainText(
      "Piece recovered",
    );
  }
  await travel(page, "Mira's Field Station", "exp-naturalist");
  await page.getByRole("button", { name: "Record house story" }).click();
  await expect(
    page.getByRole("button", { name: "Story recorded" }),
  ).toBeDisabled();
  await page.getByLabel("Close panel").click();
  await page.screenshot({ path: "artifacts/wildwood-field-station.png" });
  await travel(page, "Orrin's Star Shelter", "exp-astronomer");
  await page.getByRole("button", { name: "Record house story" }).click();
  await page.getByLabel("Close panel").click();
  await page.screenshot({ path: "artifacts/wildwood-lookout.png" });
  await travel(page, "Windrest guardian", "exp-guardian");
  await page.getByLabel("Close panel").click();
  await page.screenshot({ path: "artifacts/wildwood-lake.png" });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "The Silent Windmill journal" })
    .click();
  await page.screenshot({ path: "artifacts/wildwood-journal.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/wildwood-journal-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Calm the guardian" }).click();
  await expect(page.locator(".guardian-intent")).toContainText("Wind mantle");
  await page.screenshot({ path: "artifacts/wildwood-guardian.png" });
  await page.getByRole("button", { name: "Fast OFF" }).click();
  await page.getByRole("button", { name: "Auto OFF" }).click();
  await expect(
    page.getByRole("heading", { name: "Victory", exact: true }),
  ).toBeVisible({ timeout: 150000 });
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await travel(page, "The Silent Windmill", "exp-mill");
  await page.getByRole("button", { name: "Restore the windmill" }).click();
  await expect(page.locator(".expedition-grid")).toContainText(
    "The sails are turning",
  );
  await page.getByLabel("Close panel").click();
  const turning = await sails(page);
  await page.waitForTimeout(500);
  expect(await sails(page)).toBeLessThan(turning!);
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: "Adventure" })
    .click();
  await page
    .getByRole("button", {
      name: /The Silent Windmill.*Explore western Havenreach/,
    })
    .click();
  await expect(page.locator(".expedition-grid")).toContainText(
    "The sails are turning",
  );
  const saved = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(saved.expedition.restored).toBe(true);
  expect(saved.expedition.visits).toHaveLength(2);
  expect(saved.owned.some((o: any) => o.species === "galehart")).toBe(true);
  expect(errors).toEqual([]);
});
