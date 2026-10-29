import { expect, type Page } from "@playwright/test";
// Shared world drivers, copied from haven.spec.ts: walk the keeper along
// waypoints with synthetic keys, and click a world point on screen.
export async function walkRoute(page: Page, points: number[][]) {
  await page.bringToFront();
  await page.evaluate(async (points) => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"));
    if (!url) throw Error("Renderer missing");
    const { _roots } = await import(/* @vite-ignore */ url);
    const root = _roots.get(document.querySelector(".scene canvas")).store;
    const player = root.getState().scene.children.find(
      (child: any) => child.userData.head && child.userData.limbs,
    );
    if (!player) throw Error("Keeper model missing");
    const held = new Set<string>();
    const setKeys = (next: string[]) => {
      for (const key of held)
        if (!next.includes(key)) {
          window.dispatchEvent(new KeyboardEvent("keyup", { code: key }));
          held.delete(key);
        }
      // Blur correctly clears the game's input. Reassert movement so a focus
      // change cannot leave this synthetic driver's held keys out of sync.
      for (const key of next) {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: key }));
        held.add(key);
      }
    };
    await new Promise<void>((resolve, reject) => {
      let index = 0;
      const start = performance.now();
      const timer = setInterval(() => {
        // Read the live keeper position; the minimap intentionally updates less
        // often and can steer a sprint past narrow bridge approach waypoints.
        const { x, z } = player.position;
        const [tx, tz] = points[index],
          dx = tx - x,
          dz = tz - z,
          length = Math.hypot(dx, dz);
        if (length < 0.45) {
          index++;
          if (index === points.length) {
            clearInterval(timer);
            setKeys([]);
            resolve();
            return;
          }
          return;
        }
        const camera = root.getState().camera,
          yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
        const ix = dx * Math.cos(yaw) - dz * Math.sin(yaw),
          iz = dx * Math.sin(yaw) + dz * Math.cos(yaw),
          keys: string[] = [];
        if (Math.abs(ix) > length * 0.24) keys.push(ix > 0 ? "KeyD" : "KeyA");
        if (Math.abs(iz) > length * 0.24) keys.push(iz > 0 ? "KeyS" : "KeyW");
        if (length > 2.8) keys.push("ShiftLeft");
        setKeys(keys);
        if (performance.now() - start > 100000) {
          clearInterval(timer);
          setKeys([]);
          reject(Error(`Route stopped near ${x},${z}, heading to ${tx},${tz}`));
        }
      }, 70);
    });
  }, points);
  await page.waitForTimeout(250);
}
export async function clickWorld(page: Page, point: number[], drag = false) {
  // Orbit damping keeps turning briefly after a drag or reset; wait until still.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const url = performance
            .getEntriesByType("resource")
            .map((r) => r.name)
            .find((n) => n.includes("@react-three_fiber.js"))!;
          const { _roots } = await import(/* @vite-ignore */ url);
          const { camera } = _roots
            .get(document.querySelector(".scene canvas"))
            .store.getState();
          const a = camera.position.clone();
          await new Promise((r) => setTimeout(r, 150));
          return a.distanceTo(camera.position);
        }),
      { timeout: 15000 },
    )
    .toBeLessThan(0.005);
  const pixel = await page.evaluate(async (point) => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const canvas = document.querySelector(".scene canvas")!;
    const { camera } = _roots.get(canvas).store.getState();
    const vector = camera.position
      .clone()
      .set(...point)
      .project(camera);
    const box = canvas.getBoundingClientRect();
    return {
      x: box.left + ((vector.x + 1) * box.width) / 2,
      y: box.top + ((1 - vector.y) * box.height) / 2,
    };
  }, point);
  if (drag) {
    await page.mouse.move(pixel.x, pixel.y);
    await page.mouse.down();
    await page.mouse.move(pixel.x + 75, pixel.y + 15, { steps: 8 });
    await page.mouse.up();
  } else await page.mouse.click(pixel.x, pixel.y);
}
