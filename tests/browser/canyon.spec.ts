import { test, expect, type Page } from "@playwright/test";
import { CANYON_BEACONS, CANYON_NOTES } from "../../packages/shared/canyon";
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
  await expect(page.locator(`section[aria-label="can-${id}"]`)).toBeVisible({
    timeout: 90000,
  });
}
async function worldScreenshot(page: Page, path: string) {
  await page.getByLabel("Close panel").click();
  await page.keyboard.press("KeyR");
  await page.mouse.move(720, 450);
  await page.waitForTimeout(500);
  await page.screenshot({ path });
}
test("walk canyon routes, solve inscriptions, calm sentinel and save restoration", async ({
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
    const g = await post("guest", { name: "Canyon Ranger", avatar: 1 });
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
    // Earn the actual two-win unlock through ordinary server battles.
    for (let win = 0; win < 2; win++) {
      let b = await post("battle/start", {}, g.token);
      for (let turn = 0; turn < 360 && b.winner === null; turn++) {
        await new Promise((r) =>
          setTimeout(r, Math.max(0, b.readyAt - Date.now()) + 15),
        );
        b = await post(
          "battle/act",
          { auto: true, fast: true, sequence: b.sequence },
          g.token,
        );
      }
      if (b.winner !== 0) throw Error("Could not earn canyon unlock");
    }
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page.getByRole("button", { name: "Travel to another region" }).click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "Emberglass Canyon",
        exact: true,
      }),
    })
    .click();
  await expect(page.locator(".location")).toContainText("Emberglass Canyon");
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await expect(page.getByLabel("Emberglass trail map")).toBeVisible();
  await expect(page.locator(".haven-destinations button")).toHaveCount(13);
  await page.screenshot({ path: "artifacts/canyon-map.png" });
  await page.getByLabel("Close panel").click();
  await travel(page, "Ashkeeper Camp", "camp");
  await page.getByRole("button", { name: "Begin the canyon journey" }).click();
  await expect(page.locator(".canyon-journal")).toContainText(
    "0/3 beacons tuned",
  );
  await worldScreenshot(page, "artifacts/canyon-camp.png");
  for (const n of CANYON_BEACONS) {
    await travel(page, n.name, n.id);
    if (n.id === "kiln") {
      await page
        .getByRole("button", { name: `Tune ${n.name}`, exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("inscription");
    }
    for (let i = 0; i < 3; i++)
      await page
        .getByLabel(`${n.name} shutter ${i + 1}`)
        .selectOption(String(n.code[i]));
    await page
      .getByRole("button", { name: `Tune ${n.name}`, exact: true })
      .click();
    await expect(page.locator(".canyon-journal")).toContainText(
      "Signal tuned.",
    );
    await worldScreenshot(page, `artifacts/canyon-${n.id}.png`);
  }
  for (const n of CANYON_NOTES) {
    await travel(page, n.name, n.id);
    await page
      .getByRole("button", { name: "Record field note", exact: true })
      .click();
    await expect(page.locator(".canyon-journal")).toContainText(
      "Recorded in your field journal.",
    );
    if (n.id === "spring")
      await worldScreenshot(page, "artifacts/canyon-springs.png");
  }
  await travel(page, "The Glass Sentinel", "guardian");
  await page.screenshot({ path: "artifacts/canyon-guardian-journal.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/canyon-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "Calm the Glass Sentinel", exact: true })
    .click();
  await expect(page.locator(".guardian-intent")).toContainText(
    "Glass carapace",
  );
  await page.getByRole("button", { name: "Fast OFF", exact: true }).click();
  await page.getByRole("button", { name: "Auto OFF", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Victory", exact: true }),
  ).toBeVisible({ timeout: 180000 });
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await travel(page, "Ashkeeper Camp", "camp");
  await page
    .getByRole("button", { name: "Restore the canyon signals", exact: true })
    .click();
  await expect(page.locator(".canyon-journal")).toContainText(
    "The canyon signals are restored.",
  );
  await page
    .getByRole("button", { name: "Claim survey reward", exact: true })
    .click();
  await expect(page.locator(".canyon-journal")).toContainText(
    "Naturalist badge earned.",
  );
  await worldScreenshot(page, "artifacts/canyon-restored.png");
  await expect(page.locator(".naturalist-badge")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to canyon trailhead", exact: true })
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
  // Wait for the rendered world navigation after reload; a raw key press can
  // arrive before React has installed the world's Escape handler.
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: "Adventure" })
    .click();
  await page
    .getByRole("button", {
      name: "Signals in the Stone / Explore Emberglass Canyon",
      exact: true,
    })
    .click();
  await expect(page.locator(".canyon-journal")).toContainText(
    "The canyon signals are restored.",
  );
  await expect(page.locator(".canyon-journal")).toContainText(
    "Naturalist badge earned.",
  );
  const saved = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(saved.canyon.beacons).toHaveLength(3);
  expect(saved.canyon.notes).toHaveLength(3);
  expect(saved.owned.some((o: any) => o.species === "thermala")).toBe(true);
  expect(errors).toEqual([]);
});
