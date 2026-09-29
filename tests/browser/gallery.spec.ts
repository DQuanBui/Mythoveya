import { test, expect } from "@playwright/test";
import { SPECIES, AVATARS } from "../../packages/shared/content";
test("all models, eight keepers, ten mythic effects, and bounded audio", async ({
  page,
}) => {
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
  await expect(page.locator(".gallery-list button")).toHaveCount(60);
  const hashes = await page.evaluate(
    async (ids) => {
      const path = "/src/portraits.tsx";
      const portraits = await import(/* @vite-ignore */ path);
      return ids.map((id) => portraits.renderPortrait(id));
    },
    SPECIES.map((s) => s.id),
  );
  expect(hashes).toHaveLength(60);
  expect(new Set(hashes).size).toBe(60);
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
  for (const s of SPECIES.filter((s) => s.tier === "S")) {
    await page
      .locator(".gallery-list")
      .getByRole("button", { name: `S · ${s.name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preview ultimate", exact: true })
      .click();
    await page.waitForTimeout(700);
    await page
      .locator(".gallery-preview")
      .screenshot({ path: `artifacts/ultimate-${s.id}.png` });
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
