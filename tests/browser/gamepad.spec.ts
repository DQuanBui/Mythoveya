import { test, expect, type Page } from "@playwright/test";
import { waitForScene } from "./world-helpers";

/** A stand-in controller the test can hold buttons and sticks on. */
async function fakePad(page: Page) {
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    (window as any).__pad = pad;
    navigator.getGamepads = () => [pad] as unknown as (Gamepad | null)[];
  });
}
const connect = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event("gamepadconnected")));
async function tap(page: Page, button: number) {
  await page.evaluate((b) => ((window as any).__pad.buttons[b].pressed = true), button);
  await page.waitForTimeout(120);
  await page.evaluate((b) => ((window as any).__pad.buttons[b].pressed = false), button);
  await page.waitForTimeout(120);
}
const axes = (page: Page, values: number[]) => page.evaluate((v) => ((window as any).__pad.axes = v), values);
/** The keeper's spot and the camera's bearing, from the live scene. */
const view = (page: Page) =>
  page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map((r) => r.name).find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const { scene, camera } = _roots.get(document.querySelector(".scene canvas")).store.getState();
    const keeper = scene.children.find((c: any) => c.userData.head && c.userData.limbs);
    return {
      x: keeper.position.x,
      z: keeper.position.z,
      bearing: Math.atan2(camera.position.x - keeper.position.x, camera.position.z - keeper.position.z),
    };
  });
const A = 0, B = 1, X = 2, START = 9, DOWN = 13;

test("a controller walks, turns the camera, works menus and fights", async ({ page }) => {
  test.setTimeout(180000);
  await fakePad(page);
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Pad Keeper", avatar: 1 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [{ kind: "starter", species: "emberfox" }, { kind: "guide" }])
      await post({ ...data, requestId: crypto.randomUUID() }, "mutate", g.token);
  });
  await page.reload();
  await connect(page);
  await expect(page.getByRole("status")).toContainText("Controller connected");

  // On the title screen D-pad and A reach the buttons.
  const start = page.getByRole("button", { name: "Continue your journey" });
  await expect(start).toBeVisible();
  for (let i = 0; i < 12 && !(await start.evaluate((e) => e === document.activeElement)); i++) await tap(page, DOWN);
  await expect(start).toBeFocused();
  await tap(page, A);
  await expect(page.locator(".keeper-badge")).toContainText("Pad Keeper");
  await waitForScene(page);
  await page.waitForTimeout(1500);

  // The left stick walks, and the right stick turns the camera.
  const from = await view(page);
  await axes(page, [0, -1, 0, 0]);
  await expect.poll(async () => {
    const now = await view(page);
    return Math.hypot(now.x - from.x, now.z - from.z);
  }).toBeGreaterThan(1);
  await axes(page, [0, 0, 1, 0]);
  await expect.poll(async () => Math.abs((await view(page)).bearing - from.bearing)).toBeGreaterThan(0.15);
  await axes(page, [0, 0, 0, 0]);

  // Start pauses, and B backs out.
  await tap(page, START);
  await expect(page.getByRole("dialog")).toBeVisible();
  await tap(page, B);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // In battle, X picks the first ability and A uses it.
  await page.getByRole("navigation", { name: "Game menu" }).getByRole("button", { name: "Arena" }).click();
  await page.getByRole("button", { name: /Practice vs computer/ }).click();
  await expect(page.getByRole("button", { name: /Auto (ON|OFF)/ })).toBeVisible();
  await expect(page.getByText("Choose an ability, then its target.")).toBeVisible({ timeout: 60000 });
  await tap(page, X);
  await tap(page, A);
  await expect(page.getByText("Resolving action…")).toBeVisible({ timeout: 15000 });
});
