import { test, expect, type Page } from "@playwright/test";
import {
  MEADOW_SHRINES,
  MEADOW_NOTES,
  MEADOW_VERSES,
  MEADOW_TONES,
} from "../../packages/shared/meadow";
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
  await expect(page.locator(`section[aria-label="mea-${id}"]`)).toBeVisible({
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
      name: "The Forest Choir / Explore Whisperleaf Meadow",
      exact: true,
    })
    .click();
}
test("restore woodland choirs, retry melodies, explore Whisperleaf and preserve rewards", async ({
  page,
}) => {
  test.setTimeout(600000);
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
      const b = await r.json();
      if (!r.ok) throw Error(JSON.stringify(b));
      return b;
    };
    const g = await post("guest", { name: "Woodland Keeper", avatar: 3 });
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
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page.getByRole("button", { name: "Travel to another region" }).click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "Whisperleaf Meadow",
        exact: true,
      }),
    })
    .click();
  await expect(page.locator(".location")).toContainText("Whisperleaf Meadow");
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await expect(page.getByLabel("Whisperleaf trail map")).toBeVisible();
  await expect(page.locator(".haven-destinations button")).toHaveCount(15);
  await page.screenshot({ path: "artifacts/meadow-map.png" });
  await travel(page, "Rowan's woodland lodge", "lodge");
  await page
    .getByRole("button", { name: "Begin the forest journey", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore the Forest Choir", exact: true }),
  ).toBeDisabled();
  await shot(page, "artifacts/meadow-lodge.png");
  for (const s of MEADOW_SHRINES) {
    await travel(page, s.name, s.id);
    if (s.id === "brook") {
      for (let i = 0; i < 3; i++)
        await page
          .getByRole("button", { name: "Play Root", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Answer the choir", exact: true })
        .click();
      await expect(
        page.getByText("The chimes are not in harmony yet.", { exact: false }),
      ).toBeVisible();
      await expect(page.locator(".meadow-journal")).toContainText(
        "0/3 choirs restored",
      );
      await page
        .getByRole("button", { name: "Clear melody", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Play Wing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Undo last chime", exact: true })
        .click();
      await expect(page.getByLabel("Brook choir answer")).toContainText(
        "No chimes selected",
      );
      await expect(
        page.getByText("The chimes are not in harmony yet.", { exact: false }),
      ).toBeHidden({ timeout: 10000 });
      await expect(
        page
          .getByRole("button", { name: "Play Root", exact: true })
          .locator("span"),
      ).toHaveText("\u25c6");
      await expect(
        page
          .getByRole("button", { name: "Play Rain", exact: true })
          .locator("span"),
      ).toHaveText("\u25cf");
      await expect(
        page
          .getByRole("button", { name: "Play Wing", exact: true })
          .locator("span"),
      ).toHaveText("\u25b2");
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("group", { name: "Choose your chimes" })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: "artifacts/meadow-mobile.png" });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    for (const n of MEADOW_VERSES[s.id].answer)
      await page
        .getByRole("button", {
          name: `Play ${MEADOW_TONES[n].name}`,
          exact: true,
        })
        .click();
    await expect(page.getByLabel(`${s.name} answer`)).toContainText(
      MEADOW_VERSES[s.id].answer
        .map((n) => MEADOW_TONES[n].name)
        .join("\u0020\u2192\u0020"),
    );
    await page
      .getByRole("button", { name: "Replay selected melody", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Answer the choir", exact: true })
      .click();
    await expect(page.locator(".meadow-journal")).toContainText(
      "This choir is singing again.",
    );
    await shot(page, `artifacts/meadow-${s.id}.png`);
    if (s.id === "brook") {
      await page.reload();
      await page.getByRole("button", { name: "Continue your journey" }).click();
      await journal(page);
      await expect(page.locator(".meadow-journal")).toContainText(
        "1/3 choirs restored",
      );
    }
  }
  for (const n of MEADOW_NOTES) {
    await travel(page, n.name, n.id);
    await page
      .getByRole("button", { name: "Record woodland note", exact: true })
      .click();
    await expect(page.locator(".meadow-journal")).toContainText(
      "Recorded in your field journal.",
    );
  }
  await travel(page, "Rowan's woodland lodge", "lodge");
  await page
    .getByRole("button", { name: "Restore the Forest Choir", exact: true })
    .click();
  await expect(page.locator(".meadow-journal")).toContainText(
    "The Forest Choir is restored.",
  );
  await shot(page, "artifacts/meadow-restored.png");
  await expect(page.locator(".lantern-badge")).toHaveText("GROVE LISTENER");
  await travel(page, "Heartroot choir", "root");
  await shot(page, "artifacts/meadow-heartroot.png");
  // Step back from the tall tree so its flowering crown fits in the view.
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(1100);
  await page.keyboard.up("KeyS");
  await page.keyboard.press("KeyR");
  await page.mouse.move(760, 570);
  await page.mouse.down();
  await page.mouse.move(760, 390, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/meadow-heartroot-crown.png" });
  const visual = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const scene = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState().scene;
    return {
      choirs: ["brook", "canopy", "root"].filter(
        (id) => scene.getObjectByName(`meadow-choir-${id}`).userData.restored,
      ).length,
      blossoms: scene.getObjectByName("heartroot-blossoms").visible,
    };
  });
  expect(visual).toEqual({ choirs: 3, blossoms: true });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Return to Whisperleaf trailhead",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page
        .locator(".map-ring b")
        .evaluate((dot: HTMLElement) =>
          Math.hypot(
            ((parseFloat(dot.style.left) - 50) * 46) / 50,
            ((parseFloat(dot.style.top) - 50) * 46) / 50 - 5,
          ),
        ),
    )
    .toBeLessThan(1);
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await journal(page);
  await expect(page.locator(".meadow-journal")).toContainText(
    "The Forest Choir is restored.",
  );
  const saved = await page.evaluate(() =>
    fetch("/api/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("mythoveya-session"),
      },
    }).then((r) => r.json()),
  );
  expect(saved.meadow.choirs).toHaveLength(3);
  expect(saved.meadow.notes).toHaveLength(2);
  expect(saved.meadow.finished).toBe(true);
  expect(saved.owned.some((o: any) => o.species === "fernibble")).toBe(true);
  expect(errors).toEqual([]);
});
