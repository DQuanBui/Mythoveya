import { test, expect, type Page } from "@playwright/test";
import {
  HOLLOW_GATHER,
  HOLLOW_LANTERNS,
  HOLLOW_NOTES,
} from "../../packages/shared/hollow";
async function travel(page: Page, name: string, id: string) {
  if (await page.getByLabel("Close panel").count())
    await page.getByLabel("Close panel").click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page
    .locator(".haven-destinations")
    .getByRole("button", { name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Set walking waypoint", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Walk to waypoint", exact: true })
    .click();
  await expect(page.locator(`section[aria-label="hol-${id}"]`)).toBeVisible({
    timeout: 90000,
  });
}
async function shot(page: Page, path: string) {
  await page.getByLabel("Close panel").click();
  await page.keyboard.press("KeyR");
  await page.mouse.move(720, 450);
  await page.waitForTimeout(600);
  await page.screenshot({ path });
}
async function journal(page: Page) {
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: "Adventure" })
    .click();
  await page
    .getByRole("button", {
      name: "The Lantern Road / Explore Moonfrost Hollow",
      exact: true,
    })
    .click();
}
test("gather with companions, craft lanterns, walk Moonfrost and persist its restored road", async ({
  page,
}) => {
  test.setTimeout(720000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = async (path: string, data: unknown, token = "") => {
      const r = await fetch("/api/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      });
      const body = await r.json();
      if (!r.ok) throw Error(JSON.stringify(body));
      return body;
    };
    const g = await post("guest", { name: "Moonfrost Keeper", avatar: 2 });
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
    // Earn the actual five-win regional unlock with ordinary battles.
    let wins = 0;
    for (let attempt = 0; attempt < 12 && wins < 5; attempt++) {
      let b = await post("battle/start", {}, g.token);
      for (let i = 0; i < 360 && b.winner === null; i++) {
        await new Promise((r) =>
          setTimeout(r, Math.max(0, b.readyAt - Date.now()) + 15),
        );
        b = await post(
          "battle/act",
          { auto: true, fast: true, sequence: b.sequence },
          g.token,
        );
      }
      if (b.winner === 0) wins++;
    }
    if (wins < 5) throw Error("Could not earn Moonfrost unlock");
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page.getByRole("button", { name: "Travel to another region" }).click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { name: "Moonfrost Hollow", exact: true }),
    })
    .click();
  await expect(page.locator(".location")).toContainText("Moonfrost Hollow");
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await expect(page.getByLabel("Moonfrost trail map")).toBeVisible();
  await expect(page.locator(".haven-destinations button")).toHaveCount(9);
  await page.screenshot({ path: "artifacts/hollow-map.png" });
  await travel(page, "Mira's lantern workshop", "workshop");
  await page
    .getByRole("button", { name: "Begin the lantern journey", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Craft trail lantern", exact: true }),
  ).toBeDisabled();
  await shot(page, "artifacts/hollow-workshop.png");
  for (const n of HOLLOW_GATHER) {
    await travel(page, n.name, n.id);
    await page
      .getByRole("button", {
        name: `Gather ${n.material === "glass" ? "Frostglass" : n.material === "reed" ? "Moonreed" : "Warmstone"}`,
        exact: true,
      })
      .click();
    await expect(page.locator(".hollow-journal")).toContainText(
      "Materials gathered:",
    );
    if (n.id === "reed") await shot(page, "artifacts/hollow-lake.png");
  }
  await travel(page, "Mira's lantern workshop", "workshop");
  for (let i = 1; i <= 3; i++) {
    await page
      .getByRole("button", { name: "Craft trail lantern", exact: true })
      .click();
    await expect(page.getByLabel("Moonfrost satchel")).toContainText(
      `${i} Trail lanterns`,
    );
  }
  await expect(
    page.getByRole("button", { name: "Craft trail lantern", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await journal(page);
  await expect(page.getByLabel("Moonfrost satchel")).toContainText(
    "3 Trail lanterns",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/hollow-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const n of HOLLOW_LANTERNS) {
    await travel(page, n.name, n.id);
    await page
      .getByRole("button", { name: `Light ${n.name}`, exact: true })
      .click();
    await expect(page.locator(".hollow-journal")).toContainText(
      "This trail lantern is lit.",
    );
    if (n.id === "summit") await shot(page, "artifacts/hollow-observatory.png");
  }
  for (const n of HOLLOW_NOTES) {
    await travel(page, n.name, n.id);
    await page
      .getByRole("button", { name: "Record Moonfrost note", exact: true })
      .click();
    await expect(page.locator(".hollow-journal")).toContainText(
      "Recorded in your field journal.",
    );
  }
  await travel(page, "Mira's lantern workshop", "workshop");
  await page
    .getByRole("button", { name: "Restore the Lantern Road", exact: true })
    .click();
  await expect(page.locator(".hollow-journal")).toContainText(
    "The Lantern Road is restored.",
  );
  await shot(page, "artifacts/hollow-restored.png");
  await expect(page.locator(".lantern-badge")).toBeVisible();
  // Inspect the rendered lights as well as saved flags.
  const lights = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const scene = _roots
      .get(document.querySelector(".scene canvas"))
      ?.store.getState().scene;
    return {
      lit: ["shore", "summit", "refuge"].filter(
        (id) => scene?.getObjectByName(`moonfrost-lantern-${id}`)?.userData.lit,
      ).length,
      aurora:
        scene?.getObjectByName("moonfrost-aurora")?.children[0].material
          .opacity,
    };
  });
  expect(lights.lit).toBe(3);
  expect(lights.aurora).toBeGreaterThan(0.2);
  await travel(page, "Observatory lantern", "summit");
  await shot(page, "artifacts/hollow-restored-observatory.png");
  // Tilt toward the horizon; the default exploration camera looks downward.
  await page.mouse.move(760, 570);
  await page.mouse.down();
  await page.mouse.move(760, 350, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/hollow-aurora.png" });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to Moonfrost trailhead", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator(".map-ring b")
        .evaluate((dot: HTMLElement) =>
          Math.hypot(
            ((parseFloat(dot.style.left) - 50) * 52) / 50,
            ((parseFloat(dot.style.top) - 50) * 52) / 50 - 5,
          ),
        ),
    )
    .toBeLessThan(1);
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await journal(page);
  await expect(page.locator(".hollow-journal")).toContainText(
    "The Lantern Road is restored.",
  );
  const saved = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(saved.hollow.installed).toHaveLength(3);
  expect(saved.hollow.notes).toHaveLength(2);
  expect(saved.hollow.materials).toEqual({ glass: 0, reed: 0, ember: 0 });
  expect(saved.hollow.lanterns).toBe(0);
  expect(saved.owned.some((o: any) => o.species === "rimeowl")).toBe(true);
  expect(errors).toEqual([]);
});
