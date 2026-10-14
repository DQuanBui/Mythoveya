import { test, expect, type Page } from "@playwright/test";
import {
  RESCUES,
  FIELD_ABILITIES,
  fieldAbility,
} from "../../packages/shared/rescue";
import { REGIONS, COMPANIONS, byId } from "../../packages/shared/content";
async function stop(page: Page, id: string) {
  const h = RESCUES.find((s) => s.id === id)!;
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
test("resolve four companion rescues choose endings and persist helpers and rewards", async ({
  page,
}) => {
  test.setTimeout(900000);
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = async (path: string, data: unknown, token = "") => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const r = await fetch("/api/" + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(data),
        });
        const body = await r.json();
        // This rejection occurs before the server changes the battle sequence.
        if (
          !r.ok &&
          path === "battle/act" &&
          body.error === "Wait for the current action." &&
          attempt < 7
        ) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          continue;
        }
        if (!r.ok) throw Error(JSON.stringify(body));
        return body;
      }
      throw Error("Battle action timing retry exhausted.");
    };
    const g = await post("guest", { name: "Rescue Keeper", avatar: 2 });
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
  for (const [siteIndex, s] of RESCUES.entries()) {
    await stop(page, s.id);
    if (previous)
      await expect
        .poll(() =>
          page.evaluate(
            (region) => (window as any).__rescueDisposed?.[region],
            previous,
          ),
        )
        .toBe(true);
    await expect(page.locator(".rescue-journal")).toContainText(s.story);
    await page
      .getByRole("button", { name: "Survey the rescue site", exact: true })
      .click();
    await expect(page.getByRole("blockquote")).toContainText(s.observation);
    await page.evaluate(async (region) => {
      const url = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((n) => n.includes("@react-three_fiber.js"))!;
      const { _roots } = await import(/* @vite-ignore */ url);
      const mesh = _roots
        .get(document.querySelector("canvas"))
        ?.store.getState()
        .scene.getObjectByName(`rescue-site-${region}`)
        ?.getObjectByName("rescue-stage-0-waiting");
      if (!mesh?.geometry) throw Error("Missing initial rescue scenery");
      (window as any).__rescueStageDisposed = false;
      mesh.geometry.addEventListener("dispose", () => {
        (window as any).__rescueStageDisposed = true;
      });
    }, s.region);
    for (const [i, step] of s.steps.entries()) {
      if (s.region === "meadow" && i === 1)
        await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByRole("heading", { name: step.title, exact: true }),
      ).toBeVisible();
      const helper = ["emberfox", ...COMPANIONS].find(
          (id) => fieldAbility(byId[id].element) === step.ability,
        )!,
        wrong = ["emberfox", ...COMPANIONS].find(
          (id) => fieldAbility(byId[id].element) !== step.ability,
        )!;
      await page
        .getByRole("button", {
          name: `${byId[wrong].name} / ${FIELD_ABILITIES[fieldAbility(byId[wrong].element)].name}`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: `Help with ${FIELD_ABILITIES[step.ability].name}`,
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .getByRole("button", {
          name: `${byId[helper].name} / ${FIELD_ABILITIES[step.ability].name}`,
          exact: true,
        })
        .click();
      if (s.region === "meadow" && i === 1) {
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({ path: "artifacts/rescue-mobile.png" });
      }
      await page
        .getByRole("button", {
          name: `Help with ${FIELD_ABILITIES[step.ability].name}`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("list", { name: "Completed field tasks" }),
      ).toContainText(step.result);
      if (i === 0)
        await expect
          .poll(() =>
            page.evaluate(() => (window as any).__rescueStageDisposed),
          )
          .toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    const outcome = siteIndex % 2 ? "wild" : "shelter";
    await page
      .getByRole("button", {
        name:
          outcome === "wild"
            ? /Keep an open wildlife route/
            : /Build a sheltered rest/,
      })
      .click();
    await expect(page.locator(".rescue-ending")).toContainText(s.ending);
    if (siteIndex === 1)
      await page
        .getByRole("button", { name: "Welcome Reedrake", exact: true })
        .click();
    if (siteIndex === 3)
      await page
        .getByRole("button", { name: "Welcome Solmole", exact: true })
        .click();
    await expect
      .poll(() =>
        page.evaluate(
          async ({ region, outcome }) => {
            const url = performance
              .getEntriesByType("resource")
              .map((r) => r.name)
              .find((n) => n.includes("@react-three_fiber.js"))!;
            const { _roots } = await import(/* @vite-ignore */ url);
            return !!_roots
              .get(document.querySelector("canvas"))
              ?.store.getState()
              .scene.getObjectByName(`rescue-site-${region}`)
              ?.getObjectByName(`rescue-stage-3-${outcome}`);
          },
          { region: s.region, outcome },
        ),
      )
      .toBe(true);
    await page.evaluate(
      async ({ region, outcome }) => {
        const url = performance
          .getEntriesByType("resource")
          .map((r) => r.name)
          .find((n) => n.includes("@react-three_fiber.js"))!;
        const { _roots } = await import(/* @vite-ignore */ url);
        const mesh = _roots
          .get(document.querySelector("canvas"))
          ?.store.getState()
          .scene.getObjectByName(`rescue-site-${region}`)
          ?.getObjectByName(`rescue-stage-3-${outcome}`);
        (window as any).__rescueDisposed ||= {};
        mesh.geometry.addEventListener("dispose", () => {
          (window as any).__rescueDisposed[region] = true;
        });
      },
      { region: s.region, outcome },
    );
    previous = s.region;
    await page.getByLabel("Close panel").click();
    await page.keyboard.press("KeyR");
    await page.mouse.move(720, 450);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/rescue-${s.region}.png` });
  }
  await stop(page, RESCUES[0].id);
  await expect
    .poll(() => page.evaluate(() => (window as any).__rescueDisposed?.hollow))
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("TRAILKEEPER");
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: /Adventure$/ })
    .click();
  await page
    .getByRole("button", {
      name: "Wildbound Rescues / Help wildlife with your companions",
      exact: true,
    })
    .click();
  await expect(page.locator(".rescue-progress")).toContainText(
    "4/4 rescues complete",
  );
  await expect(
    page.getByRole("button", { name: "Mira / Complete", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Reedrake welcomed", exact: true }),
  ).toBeDisabled();
  const p = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(p.rescue.claims).toEqual(["reedrake", "solmole"]);
  for (const [i, s] of RESCUES.entries()) {
    expect(p.rescue.sites[s.region].helpers).toHaveLength(3);
    expect(p.rescue.sites[s.region].outcome).toBe(i % 2 ? "wild" : "shelter");
  }
  for (const id of ["reedrake", "solmole"])
    expect(p.owned.some((o: any) => o.species === id)).toBe(true);
  await page.screenshot({ path: "artifacts/rescue-journal.png" });
  expect(errors).toEqual([]);
});
