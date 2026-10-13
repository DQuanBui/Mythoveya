import { test, expect, type Page } from "@playwright/test";
import {
  RALLY_HOSTS,
  rallyActivity,
  SIGNAL_NAMES,
} from "../../packages/shared/rally";
import { REGIONS } from "../../packages/shared/content";
async function stop(page: Page, region: string) {
  if (await page.getByLabel("Close panel").count())
    await page.getByLabel("Close panel").click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  const h = RALLY_HOSTS.find((h) => h.region === region)!;
  if (
    !(await page.locator(".location").textContent())?.includes(
      REGIONS.find((r) => r.id === region)!.name,
    )
  ) {
    await page
      .getByRole("button", { name: /^Travel to another region/ })
      .click();
    await page
      .getByRole("button")
      .filter({
        has: page.getByRole("heading", {
          name: REGIONS.find((r) => r.id === region)!.name,
          exact: true,
        }),
      })
      .click();
    await page.getByRole("button", { name: "Travel map", exact: true }).click();
  }
  await page
    .locator(".haven-destinations")
    .getByRole("button", { name: h.name, exact: true })
    .click();
  await page.getByRole("button", { name: /^Set walking waypoint/ }).click();
  await page
    .getByRole("button", { name: "Walk to waypoint", exact: true })
    .click();
  await expect(page.locator(`section[aria-label="${h.id}"]`)).toBeVisible({
    timeout: 90000,
  });
}
async function watchCampDisposal(page: Page, region: string) {
  await page.evaluate(async (region) => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const scene = _roots
      .get(document.querySelector("canvas"))
      ?.store.getState().scene;
    const camp = scene?.getObjectByName(`wayfarer-camp-${region}`);
    const mesh = camp?.children.find((o: any) => o.isMesh);
    if (!mesh?.geometry) throw Error(`Missing rendered camp for ${region}`);
    (window as any).__rallyDisposed ||= {};
    mesh.geometry.addEventListener("dispose", () => {
      (window as any).__rallyDisposed[region] = true;
    });
  }, region);
}
async function expectCampDisposed(page: Page, region: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (region) => (window as any).__rallyDisposed?.[region] === true,
        region,
      ),
    )
    .toBe(true);
}
test("visit four rally hosts, complete daily activities and persist a full passport", async ({
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
    const g = await post("guest", { name: "Wayfarer Keeper", avatar: 2 });
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
  let previousRegion = "";
  for (const h of RALLY_HOSTS) {
    await stop(page, h.region);
    if (previousRegion) await expectCampDisposed(page, previousRegion);
    await watchCampDisposal(page, h.region);
    previousRegion = h.region;
    await page.getByText(`Talk with ${h.host}`, { exact: true }).click();
    await expect(page.locator(".rally-journal")).toContainText(h.story);
    const event = rallyActivity(h.region);
    if (event.kind === "survey") {
      await page
        .getByLabel(h.options[(h.answer + 1) % 3], { exact: true })
        .check();
      await page
        .getByRole("button", { name: `Help ${h.host}`, exact: true })
        .click();
      await expect(
        page.getByText("Try again using the host's clue. Nothing is spent.", {
          exact: true,
        }),
      ).toBeVisible();
      await page.getByLabel(h.options[h.answer], { exact: true }).check();
    } else if (event.kind === "signal") {
      for (let i = 0; i < 3; i++)
        await page
          .getByRole("button", { name: "Signal Sun", exact: true })
          .click();
      await page
        .getByRole("button", { name: `Help ${h.host}`, exact: true })
        .click();
      await expect(
        page.getByText("Try again using the host's clue. Nothing is spent.", {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Clear signal", exact: true })
        .click();
      for (const n of event.signal)
        await page
          .getByRole("button", {
            name: `Signal ${SIGNAL_NAMES[n]}`,
            exact: true,
          })
          .click();
    }
    await page
      .getByRole("button", { name: `Help ${h.host}`, exact: true })
      .click();
    await expect(page.locator(".rally-journal")).toContainText(
      "Today's regional activity is complete.",
    );
    if (h.region === "meadow") {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: "artifacts/rally-mobile.png" });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.getByLabel("Close panel").click();
    await page.keyboard.press("KeyR");
    await page.mouse.move(720, 450);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/rally-${h.region}.png` });
  }
  await stop(page, "haven");
  await expectCampDisposed(page, "hollow");
  await page
    .getByRole("button", { name: "Complete passport with Piper", exact: true })
    .click();
  await expect(page.locator(".rally-journal")).toContainText(
    "Wayfarer passport complete.",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: /Adventure$/ })
    .click();
  await page
    .getByRole("button", {
      name: "The Wayfarer Rally / Daily regional activities",
      exact: true,
    })
    .click();
  await expect(page.locator(".rally-journal")).toContainText(
    "Wayfarer passport complete.",
  );
  const p = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(p.rally.stamps).toHaveLength(4);
  expect(p.rally.completed).toHaveLength(4);
  for (const h of RALLY_HOSTS)
    expect(p.owned.some((o: any) => o.species === h.species)).toBe(true);
  await page.screenshot({ path: "artifacts/rally-passport.png" });
  expect(errors).toEqual([]);
});
