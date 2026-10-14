import { test, expect, type Page } from "@playwright/test";
import {
  ATLAS_CHAPTERS,
  ATLAS_STOPS,
  atlasEcho,
} from "../../packages/shared/atlas";
import { REGIONS } from "../../packages/shared/content";
async function stop(page: Page, id: string) {
  const h = ATLAS_STOPS.find((s) => s.id === id)!;
  const region = h.region;
  if (await page.getByLabel("Close panel").count())
    await page.getByLabel("Close panel").click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
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
test("restore all Atlas chapters read daily echoes and preserve companions after reload", async ({
  page,
}) => {
  test.setTimeout(900000);
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
    const g = await post("guest", { name: "Atlas Keeper", avatar: 2 });
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

  let previous = "";
  for (const c of ATLAS_CHAPTERS) {
    await stop(page, c.id);
    if (previous)
      await expect
        .poll(() =>
          page.evaluate(
            (region) => (window as any).__atlasDisposed?.[region] === true,
            previous,
          ),
        )
        .toBe(true);
    await expect(page.locator(".atlas-journal")).toContainText(c.story);
    if (c.region === "haven")
      await page
        .getByRole("button", { name: "Begin the atlas journey", exact: true })
        .click();
    await expect(
      page.getByRole("button", { name: "Record this memory", exact: true }),
    ).toBeDisabled();
    await stop(page, c.id + "-tablet");
    await expect(page.getByRole("blockquote")).toContainText(c.inscription);
    await page
      .getByRole("button", { name: "Record this memory", exact: true })
      .click();
    await expect(page.locator(".atlas-journal")).toContainText(
      "Memory recorded in your atlas.",
    );
    await stop(page, c.id);
    if (c.region === "meadow")
      await page.setViewportSize({ width: 390, height: 844 });
    for (let i = 0; i < 3; i++)
      await page
        .getByLabel(`Memory glyph ${i + 1}`, { exact: true })
        .selectOption("0");
    await page
      .getByRole("button", { name: "Restore this chapter", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "glyphs do not follow",
    );
    await page.getByText("Read a hint", { exact: true }).click();
    await expect(page.locator(".atlas-journal")).toContainText(c.hint);
    for (let i = 0; i < 3; i++)
      await page
        .getByLabel(`Memory glyph ${i + 1}`, { exact: true })
        .selectOption(String(c.code[i]));
    await page
      .getByRole("button", { name: "Restore this chapter", exact: true })
      .click();
    await expect(page.locator(".atlas-ending")).toContainText(c.ending);
    await expect
      .poll(() =>
        page.evaluate(async (region) => {
          const url = performance
            .getEntriesByType("resource")
            .map((r) => r.name)
            .find((n) => n.includes("@react-three_fiber.js"))!;
          const { _roots } = await import(/* @vite-ignore */ url);
          return !!_roots
            .get(document.querySelector("canvas"))
            ?.store.getState()
            .scene.getObjectByName(`atlas-site-${region}`)
            ?.getObjectByName("atlas-monument-restored");
        }, c.region),
      )
      .toBe(true);
    if (c.region === "meadow") {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .locator("section[aria-label]")
        .filter({ has: page.locator(".atlas-journal") })
        .evaluate((el) => {
          el.scrollTop = 0;
        });
      await page.screenshot({ path: "artifacts/atlas-mobile.png" });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.evaluate(async (region) => {
      const url = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((n) => n.includes("@react-three_fiber.js"))!;
      const { _roots } = await import(/* @vite-ignore */ url);
      const mesh = _roots
        .get(document.querySelector("canvas"))
        ?.store.getState()
        .scene.getObjectByName(`atlas-site-${region}`)
        ?.getObjectByName("atlas-monument-restored");
      if (!mesh?.geometry) throw Error("Missing archive geometry");
      (window as any).__atlasDisposed ||= {};
      mesh.geometry.addEventListener("dispose", () => {
        (window as any).__atlasDisposed[region] = true;
      });
    }, c.region);
    previous = c.region;
    await page.getByLabel("Close panel").click();
    await page.keyboard.press("KeyR");
    await page.mouse.move(720, 450);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/atlas-${c.region}.png` });
  }
  await stop(page, "atlas-haven");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__atlasDisposed?.hollow === true),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Complete the Atlas of Echoes", exact: true })
    .click();
  await expect(page.locator(".atlas-progress")).toContainText(
    "Lorekeeper journey complete",
  );
  const e = atlasEcho("haven");
  await page
    .getByLabel("Daily echo glyph", { exact: true })
    .selectOption(String((e.answer + 1) % 4));
  await page
    .getByRole("button", { name: "Read today's echo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "glyph belongs elsewhere",
  );
  await page
    .getByLabel("Daily echo glyph", { exact: true })
    .selectOption(String(e.answer));
  await page
    .getByRole("button", { name: "Read today's echo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Echo read today", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("LOREKEEPER");
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: /Adventure$/ })
    .click();
  await page
    .getByRole("button", {
      name: "The Atlas of Echoes / A journey through four memories",
      exact: true,
    })
    .click();
  await expect(page.locator(".atlas-progress")).toContainText(
    "4/4 chapters restored",
  );
  const p = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(p.atlas.finished).toBe(true);
  expect(p.atlas.read).toHaveLength(4);
  expect(p.atlas.echoes).toEqual(["haven"]);
  for (const id of ["cairnfin", "inkwisp"])
    expect(p.owned.some((o: any) => o.species === id)).toBe(true);
  await expect(
    page.getByRole("button", { name: "1. Aster / Restored", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "4. Niva / Restored", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Travel to Moonfrost Hollow",
      exact: true,
    }),
  ).toHaveCount(1);
  await page.screenshot({ path: "artifacts/atlas-journal.png" });
  expect(errors).toEqual([]);
});
