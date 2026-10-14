import { test, expect, type Page } from "@playwright/test";
import {
  CONSERVANCY_STOPS,
  OUTPOSTS,
  SUPPLY_NODES,
  MATERIALS,
  RECIPES,
} from "../../packages/shared/conservancy";
import { REGIONS } from "../../packages/shared/content";
async function stop(page: Page, id: string) {
  const h = CONSERVANCY_STOPS.find((s) => s.id === id)!;
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
test("gather craft dismantle and restore all four Conservancy habitats with saved rewards", async ({
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
    const g = await post("guest", { name: "Conservancy Keeper", avatar: 2 });
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

  for (const h of OUTPOSTS) {
    await stop(page, h.id);
    await page.getByText(`Talk with ${h.host}`, { exact: true }).click();
    await expect(page.locator(".conservancy-journal")).toContainText(h.story);
    await expect(
      page.getByRole("button", { name: "Craft Shelter kit", exact: true }),
    ).toBeDisabled();
    for (const n of SUPPLY_NODES.filter((n) => n.region === h.region)) {
      await stop(page, n.id);
      await page
        .getByRole("button", {
          name: `Gather ${MATERIALS[n.material]}`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: "Gathered today", exact: true }),
      ).toBeDisabled();
    }
    await stop(page, h.id);
    if (h.region === "haven") {
      await page
        .getByRole("button", { name: "Craft Shelter kit", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Dismantle Shelter kit",
          exact: true,
        }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Dismantle Shelter kit", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Dismantle Shelter kit",
          exact: true,
        }),
      ).toBeDisabled();
    }
    for (const k of RECIPES) {
      await page
        .getByRole("button", { name: `Craft ${k.name}`, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: `Install ${k.name}`, exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: `Install ${k.name}`, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: `${k.name} installed`, exact: true }),
      ).toBeDisabled();
    }
    await expect(page.locator(".conservancy-journal")).toContainText(
      "Refuge restored. Wildlife has returned.",
    );
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
            .scene.getObjectByName(`conservancy-${region}`)
            ?.getObjectByName("habitat-pieces-shelter,planter,lantern");
        }, h.region),
      )
      .toBe(true);
    if (h.region === "meadow") {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: "artifacts/conservancy-mobile.png" });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.getByLabel("Close panel").click();
    await page.keyboard.press("KeyR");
    await page.mouse.move(720, 450);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/conservancy-${h.region}.png` });
  }
  await stop(page, OUTPOSTS[0].id);
  for (const name of ["Mossloom", "Astralynx"]) {
    await page
      .getByRole("button", { name: `Claim ${name}`, exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(name);
  }
  await expect(page.locator(".conservancy-journal")).toContainText(
    "Conservator award complete.",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: /Adventure$/ })
    .click();
  await page
    .getByRole("button", {
      name: "Wildhaven Conservancy / Craft and restore habitats",
      exact: true,
    })
    .click();
  await expect(page.locator(".conservancy-journal")).toContainText(
    "4/4 refuges restored",
  );
  const p = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(p.conservancy.gathered).toHaveLength(12);
  expect(p.conservancy.claims).toHaveLength(2);
  for (const h of OUTPOSTS)
    expect(p.conservancy.installed[h.region]).toHaveLength(3);
  for (const id of ["mossloom", "astralynx"])
    expect(p.owned.some((o: any) => o.species === id)).toBe(true);
  await page.screenshot({ path: "artifacts/conservancy-journal.png" });
  expect(errors).toEqual([]);
});
