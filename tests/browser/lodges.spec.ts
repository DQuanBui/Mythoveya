import { test, expect, type Page } from "@playwright/test";
import { LODGES, roomLayout } from "../../packages/shared/lodges";
import { REGIONS, COMPANIONS, byId } from "../../packages/shared/content";
import { SUPPLY_NODES } from "../../packages/shared/conservancy";
import { LODGE_WORKSHOPS } from "../../packages/shared/lodge-workshops";
import { FIELD_ABILITIES, fieldAbility } from "../../packages/shared/rescue";
async function stop(page: Page, id: string) {
  const h = LODGES.find((s) => s.id === id)!;
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
  await expect(
    page.locator(`.lodge-visit[aria-label="${h.name}"]`),
  ).toBeVisible({
    timeout: 90000,
  });
}
async function playerPoint(page: Page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const scene = _roots
      .get(document.querySelector("canvas"))
      ?.store.getState().scene;
    const player = scene.children.find(
      (c: any) => c.userData.head && c.userData.limbs,
    );
    if (!player) throw Error("Player model missing from room");
    return [player.position.x, player.position.z];
  });
}
async function station(page: Page, id: string) {
  const name = await page.locator(".lodge-visit").getAttribute("aria-label");
  const site = LODGES.find((s) => s.name === name)!;
  const s = roomLayout(site.region).stations.find((s) => s.id === id)!;
  await page
    .getByRole("navigation", { name: "Walk around the lodge" })
    .getByRole("button", { name: s.name, exact: true })
    .click();
  await expect(page.locator(`section[aria-label="lodge-${id}"]`)).toBeVisible({
    timeout: 30000,
  });
  const p = await playerPoint(page);
  expect(Math.hypot(p[0] - s.point[0], p[1] - s.point[1])).toBeLessThan(1.1);
}
test("walk inside four lodges host gatherings and preserve rooms and creature rewards", async ({
  page,
}) => {
  test.setTimeout(900000);
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async (supplyNodes) => {
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
    const g = await post("guest", { name: "Lodge Keeper", avatar: 2 });
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
    // Gather real supplies through validated region travel, not injected balances.
    for (const region of ["haven", "meadow", "canyon", "hollow"]) {
      await post(
        "mutate",
        { kind: "travel", region, requestId: crypto.randomUUID() },
        g.token,
      );
      for (const node of supplyNodes.filter((n) => n.region === region))
        await post(
          "mutate",
          {
            kind: "cons-gather",
            id: node.id,
            quest: new Date().toISOString().slice(0, 10),
            requestId: crypto.randomUUID(),
          },
          g.token,
        );
    }
    await post(
      "mutate",
      { kind: "travel", region: "haven", requestId: crypto.randomUUID() },
      g.token,
    );
  }, SUPPLY_NODES);

  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();

  for (const [i, s] of LODGES.entries()) {
    await stop(page, s.id);
    if (i === 0) {
      const before = await playerPoint(page);
      await page.keyboard.down("KeyW");
      await page.waitForTimeout(550);
      await page.keyboard.up("KeyW");
      const after = await playerPoint(page);
      expect(
        Math.hypot(after[0] - before[0], after[1] - before[1]),
      ).toBeGreaterThan(0.5);
    }
    if (i === 0) {
      const point = await page.evaluate(async () => {
        const url = performance
          .getEntriesByType("resource")
          .map((r) => r.name)
          .find((n) => n.includes("@react-three_fiber.js"))!;
        const { _roots } = await import(/* @vite-ignore */ url);
        const canvas = document.querySelector("canvas")!,
          camera = _roots.get(canvas).store.getState().camera;
        const p = camera.position.clone().set(2, 0.01, 5).project(camera),
          r = canvas.getBoundingClientRect();
        return {
          x: r.x + ((p.x + 1) * r.width) / 2,
          y: r.y + ((1 - p.y) * r.height) / 2,
        };
      });
      await page.mouse.click(point.x, point.y);
      await expect
        .poll(async () => {
          const p = await playerPoint(page);
          return Math.hypot(p[0] - 2, p[1] - 5);
        })
        .toBeLessThan(0.6);
    }
    await page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((n) => n.includes("@react-three_fiber.js"))!;
      const { _roots } = await import(/* @vite-ignore */ url);
      const m = _roots
        .get(document.querySelector("canvas"))
        ?.store.getState()
        .scene.getObjectByName("lodge-furnishings-waiting");
      (window as any).__roomDisposed = false;
      m.geometry.addEventListener("dispose", () => {
        (window as any).__roomDisposed = true;
      });
    });
    await station(page, "host");
    await expect(
      page.getByRole("button", {
        name: `Build ${LODGE_WORKSHOPS[s.region].name}`,
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.locator(".lodge-dialog")).toContainText(s.story);
    await page
      .getByRole("button", { name: "Offer to help", exact: true })
      .click();
    await expect(page.locator(".lodge-dialog")).toContainText(
      `You have met ${s.host}`,
    );
    await page.getByLabel("Close lodge panel").click();
    await station(page, "kitchen");
    await page
      .getByRole("button", {
        name: s.ingredients[(s.answer + 1) % 3],
        exact: true,
      })
      .click();
    await expect(page.locator(".toast")).toContainText("Nothing was spent");
    await page
      .getByRole("button", { name: s.ingredients[s.answer], exact: true })
      .click();
    await expect(page.locator(".lodge-dialog")).toContainText(
      "Supper prepared",
    );
    await expect
      .poll(() => page.evaluate(() => (window as any).__roomDisposed))
      .toBe(true);
    await page.getByLabel("Close lodge panel").click();
    if (i === 1) await page.setViewportSize({ width: 390, height: 844 });
    await station(page, "companion");
    const helper = ["emberfox", ...COMPANIONS].find(
      (id) => fieldAbility(byId[id].element) === s.ability,
    )!;
    const wrong = ["emberfox", ...COMPANIONS].find(
      (id) => fieldAbility(byId[id].element) !== s.ability,
    )!;
    await page.getByLabel("Lodge companion").selectOption({
      label: `${byId[wrong].name} / ${FIELD_ABILITIES[fieldAbility(byId[wrong].element)].name}`,
    });
    await expect(
      page.getByRole("button", { name: `Help ${s.host}`, exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Lodge companion").selectOption({
      label: `${byId[helper].name} / ${FIELD_ABILITIES[s.ability].name}`,
    });
    await page
      .getByRole("button", { name: `Help ${s.host}`, exact: true })
      .click();
    await expect(page.locator(".lodge-dialog")).toContainText(
      "gained 3 friendship",
    );
    await page.getByLabel("Close lodge panel").click();
    await station(page, "guestbook");
    await page
      .getByRole("button", {
        name: `Host the gathering / ${i % 2 ? "Weave a banner" : "Hang a lantern"}`,
        exact: true,
      })
      .click();
    await expect(page.locator(".lodge-dialog")).toContainText(
      `Saved decoration: ${i % 2 ? "banner" : "lantern"}`,
    );
    if (i === 1)
      await page
        .getByRole("button", {
          name: "Welcome Lumeswallow / 2 gatherings",
          exact: true,
        })
        .click();
    if (i === 3)
      await page
        .getByRole("button", {
          name: "Welcome Velvetmoth / 4 gatherings",
          exact: true,
        })
        .click();
    const original = i % 2 ? "banner" : "lantern",
      alternate = i % 2 ? "lantern" : "banner";
    await page
      .getByRole("button", { name: `Display ${alternate}`, exact: true })
      .click();
    await expect(page.locator(".lodge-dialog")).toContainText(
      `Saved decoration: ${alternate}`,
    );
    await page
      .getByRole("button", { name: `Display ${original}`, exact: true })
      .click();
    await page.getByLabel("Close lodge panel").click();
    await station(page, "host");
    const workshop = LODGE_WORKSHOPS[s.region];
    await page
      .getByRole("button", { name: `Build ${workshop.name}`, exact: true })
      .click();
    await expect(page.getByLabel("Lodge workshop")).toContainText(
      "Display built",
    );
    for (let story = 0; story < 3; story++) {
      await page
        .getByRole("button", { name: `Story ${story + 1}`, exact: true })
        .click();
      await expect(page.locator(".lodge-story")).toHaveText(
        workshop.stories[story],
      );
    }
    await page.screenshot({ path: `artifacts/workshop-story-${s.region}.png` });
    await page.getByLabel("Close lodge panel").click();
    if (i === 0) {
      const resident = () =>
        page.evaluate(async () => {
          const url = performance
            .getEntriesByType("resource")
            .map((r) => r.name)
            .find((n) => n.includes("@react-three_fiber.js"))!;
          const { _roots } = await import(/* @vite-ignore */ url);
          const m = _roots
            .get(document.querySelector("canvas"))
            .store.getState()
            .scene.getObjectByName("lodge-resident");
          return [m.position.x, m.position.z];
        });
      const initial = await resident();
      await expect
        .poll(async () => {
          const p = await resident();
          return Math.hypot(p[0] - initial[0], p[1] - initial[1]);
        })
        .toBeGreaterThan(0.3);
    }
    await page.keyboard.press("KeyR");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `artifacts/lodge-${s.region}.png` });
    if (i === 1) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((n) => n.includes("@react-three_fiber.js"))!;
      const { _roots } = await import(/* @vite-ignore */ url);
      const scene = _roots
        .get(document.querySelector("canvas"))
        ?.store.getState().scene;
      const m =
        scene.getObjectByName("lodge-furnishings-lantern") ||
        scene.getObjectByName("lodge-furnishings-banner");
      (window as any).__exitDisposed = false;
      m.geometry.addEventListener("dispose", () => {
        (window as any).__exitDisposed = true;
      });
    });
    await page
      .getByRole("navigation", { name: "Walk around the lodge" })
      .getByRole("button", { name: "Return outdoors", exact: true })
      .click();
    await expect(page.getByLabel("Exploration interface")).toBeVisible({
      timeout: 30000,
    });
    const outside = await playerPoint(page);
    expect(
      Math.hypot(outside[0] - s.point[0], outside[1] - s.point[1]),
    ).toBeLessThan(0.5);
    await expect
      .poll(() => page.evaluate(() => (window as any).__exitDisposed))
      .toBe(true);
  }
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("navigation", { name: "Game menu" })
    .getByRole("button", { name: /Adventure$/ })
    .click();
  await page
    .getByRole("button", {
      name: "Wayfarer Lodges / Step inside and host a gathering",
      exact: true,
    })
    .click();
  await expect(page.locator("section[aria-label=lodges]")).toContainText(
    "4 / 4 gatherings hosted",
  );
  await expect(page.locator("section[aria-label=lodges]")).toContainText(
    "Companions welcomed: 2 / 2",
  );
  await expect(page.locator("section[aria-label=lodges]")).toContainText(
    "4 / 4 workshop displays built",
  );
  await stop(page, LODGES[3].id);
  await station(page, "guestbook");
  await expect(page.locator(".lodge-dialog")).toContainText(
    "Saved decoration: banner",
  );
  await expect(
    page.getByRole("button", { name: "Welcomed / 4 gatherings", exact: true }),
  ).toBeDisabled();
  const p = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(p.lodges.claims).toEqual(["lumeswallow", "velvetmoth"]);
  for (const s of LODGES) {
    expect(p.lodges.rooms[s.region].meal).toBe(s.recipe);
    expect(p.lodges.rooms[s.region].workshop).toBe(true);
  }
  expect(p.conservancy.materials).toEqual({ timber: 7, fiber: 8, crystal: 9 });
  expect(errors).toEqual([]);
});
