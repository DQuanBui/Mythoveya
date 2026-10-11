import { test, expect } from "@playwright/test";
import { emptyHollow } from "../../packages/shared/hollow";

// A render-only fixture. The separate hollow.spec.ts earns the real unlock and
// verifies gathering, crafting, rewards and persistence through the server.
test("restored Moonfrost aurora is visible from the observatory lookout", async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  await page.goto("/");
  const profile = await page.evaluate(async () => {
    const r = await fetch("/api/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Aurora Visual", avatar: 2 }),
    });
    const g = await r.json();
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [
      { kind: "starter", species: "emberfox" },
      { kind: "guide" },
    ]) {
      const r = await fetch("/api/mutate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + g.token,
        },
        body: JSON.stringify({ ...data, requestId: crypto.randomUUID() }),
      });
      if (!r.ok) throw Error(await r.text());
    }
    return fetch("/api/profile", {
      headers: { Authorization: "Bearer " + g.token },
    }).then((r) => r.json());
  });
  profile.region = "hollow";
  profile.hollow = {
    ...emptyHollow(),
    started: true,
    finished: true,
    installed: ["shore", "summit", "refuge"],
  };
  await page.route("**/api/profile", (route) =>
    route.fulfill({ json: profile }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page
    .locator(".haven-destinations")
    .getByRole("button", { name: "Observatory lantern", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Set walking waypoint", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Walk to waypoint", exact: true })
    .click();
  await expect(page.locator('section[aria-label="hol-summit"]')).toBeVisible({
    timeout: 90000,
  });
  await page.getByLabel("Close panel").click();
  await page.keyboard.press("KeyR");
  await page.mouse.move(760, 570);
  await page.mouse.down();
  await page.mouse.move(760, 350, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const projected = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const { scene, camera } = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState();
    const ribbon = scene.getObjectByName("moonfrost-aurora").children[0];
    ribbon.geometry.computeBoundingSphere();
    const center = ribbon.geometry.boundingSphere.center.clone();
    ribbon.localToWorld(center);
    center.project(camera);
    return { x: center.x, y: center.y, z: center.z };
  });
  expect(Math.abs(projected.x)).toBeLessThan(1);
  expect(Math.abs(projected.y)).toBeLessThan(0.9);
  expect(projected.z).toBeLessThan(1);
  await page.screenshot({ path: "artifacts/hollow-aurora-visible.png" });
});
