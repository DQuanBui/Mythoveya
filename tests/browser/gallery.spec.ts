import { test, expect, type Page } from "@playwright/test";
import { SPECIES, AVATARS } from "../../packages/shared/content";
async function openGallery(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = async (path: string, data: any, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post("guest", { name: "Gallery Reviewer", avatar: 0 });
    localStorage.setItem("mythoveya-session", g.token);
    await post(
      "mutate",
      { kind: "starter", species: "emberfox", requestId: crypto.randomUUID() },
      g.token,
    );
    await post(
      "mutate",
      { kind: "guide", requestId: crypto.randomUUID() },
      g.token,
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Gallery Reviewer");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Asset gallery" }).click();
  await expect(page.locator(".gallery-list button")).toHaveCount(SPECIES.length);
  return errors;
}

test("all models, eight keepers, and bounded audio", async ({ page }) => {
  test.setTimeout(360000);
  const errors = await openGallery(page);
  const hashes = await page.evaluate(
    async (ids) => {
      const path = "/src/portraits.tsx";
      const portraits = await import(/* @vite-ignore */ path);
      return ids.map((id) => portraits.renderPortrait(id));
    },
    SPECIES.map((s) => s.id),
  );
  expect(hashes).toHaveLength(SPECIES.length);
  expect(new Set(hashes).size).toBe(SPECIES.length);
  expect(hashes.every((h) => h.startsWith("data:image/png;base64,"))).toBe(
    true,
  );
  // Render the journal's actual model portraits, then inspect all families in turntable view.
  for (const species of SPECIES.filter(
    (s, i, list) => list.findIndex((x) => x.family === s.family) === i,
  )) {
    await page
      .locator(".gallery-list")
      .getByRole("button", {
        name: `${species.tier} · ${species.name}`,
        exact: true,
      })
      .click();
    await page.waitForTimeout(180);
    await page
      .locator(".gallery-preview")
      .screenshot({ path: `artifacts/family-${species.family}.png` });
  }
  for (let i = 0; i < AVATARS.length; i++) {
    await page.getByLabel("Preview avatar").selectOption(String(i));
    await page.waitForTimeout(150);
    await page
      .locator(".gallery-preview")
      .screenshot({ path: `artifacts/avatar-${i}.png` });
  }
  const audio = await page.evaluate(async () => {
    const path = "/src/audio.ts";
    const m = await import(/* @vite-ignore */ path);
    await m.audio.unlock();
    for (const scene of [
      "title",
      "haven",
      "meadow",
      "canyon",
      "hollow",
      "battle",
      "arena",
      "boss",
    ])
      m.audio.location(scene);
    for (let i = 0; i < 80; i++) m.audio.cue("storm");
    return { state: m.audio.ctx.state, voices: m.audio.voices };
  });
  expect(audio.state).toBe("running");
  expect(audio.voices).toBeLessThanOrEqual(40);
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});

test("ten mythic effects remain visible at paused impact", async ({ page }) => {
  test.setTimeout(360000);
  const errors = await openGallery(page);
  for (const s of SPECIES.filter((s) => s.tier === "S")) {
    await page
      .locator(".gallery-list")
      .getByRole("button", { name: `S · ${s.name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preview ultimate", exact: true })
      .click();
    await page.waitForTimeout(950);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const visible = await page.evaluate(async (id) => {
      const moduleUrl = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((url) => url.includes("@react-three_fiber.js"));
      if (!moduleUrl) throw new Error("Renderer module not loaded");
      const { _roots } = await import(/* @vite-ignore */ moduleUrl);
      const canvas = document.querySelector(".gallery-preview canvas");
      const scene = _roots.get(canvas).store.getState().scene;
      const effect = scene.getObjectByName("skill-effect");
      const mythic = scene.getObjectByName("mythic-" + id);
      return Boolean(
        effect?.visible &&
          mythic?.visible &&
          mythic.children.length > 0 &&
          effect.scale.x > 0.1,
      );
    }, s.id);
    expect(visible, s.name + " paused impact is visible").toBe(true);
    await page
      .locator(".gallery-preview")
      .screenshot({ path: `artifacts/ultimate-${s.id}.png` });
    await page.getByRole("button", { name: "Play", exact: true }).click();
  }
  expect(errors).toEqual([]);
});
