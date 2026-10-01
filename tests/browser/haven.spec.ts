import { test, expect, type Page } from "@playwright/test";

async function walkRoute(page: Page, points: number[][]) {
  await page.evaluate(async (points) => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"));
    if (!url) throw Error("Renderer missing");
    const { _roots } = await import(/* @vite-ignore */ url);
    const root = _roots.get(document.querySelector(".scene canvas")).store;
    const held = new Set<string>();
    const setKeys = (next: string[]) => {
      for (const key of held)
        if (!next.includes(key)) {
          window.dispatchEvent(new KeyboardEvent("keyup", { code: key }));
          held.delete(key);
        }
      for (const key of next)
        if (!held.has(key)) {
          window.dispatchEvent(new KeyboardEvent("keydown", { code: key }));
          held.add(key);
        }
    };
    await new Promise<void>((resolve, reject) => {
      let index = 0;
      const start = performance.now();
      const timer = setInterval(() => {
        const dot = document.querySelector(".map-ring b") as HTMLElement;
        const x = parseFloat(dot.style.left) - 50,
          z = parseFloat(dot.style.top) - 50;
        const [tx, tz] = points[index],
          dx = tx - x,
          dz = tz - z,
          length = Math.hypot(dx, dz);
        if (length < 1.15) {
          index++;
          if (index === points.length) {
            clearInterval(timer);
            setKeys([]);
            resolve();
            return;
          }
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
test("explore the expanded island, cross the bridge and return safely", async ({
  page,
}) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (path: string, data: unknown, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post("guest", { name: "Haven Trailkeeper", avatar: 1 });
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
  await expect(page.locator(".keeper-badge")).toContainText(
    "Haven Trailkeeper",
  );
  await page.screenshot({ path: "artifacts/haven-village.png" });
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await expect(page.getByLabel("Havenreach trail map")).toBeVisible();
  await expect(page.locator(".haven-destinations button")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Select Sunpetal Clearing", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/haven-map.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/haven-map-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Set walking waypoint" }).click();
  await expect(page.locator(".quest-tracker")).toContainText(
    "Sunpetal Clearing",
  );
  await walkRoute(page, [
    [0, 11],
    [8, 26],
    [10, 24],
  ]);
  await expect(page.locator(".location small")).toHaveText("Sunpetal Clearing");
  await page.screenshot({ path: "artifacts/haven-clearing.png" });
  await expect(page.locator(".interact")).toContainText("Sunseed");
  await page.locator(".interact").click();
  await expect(page.getByRole("status")).toContainText("+1 Sunseed");
  await walkRoute(page, [
    [22, 17],
    [29, 4],
    [30, -5],
    [21, -5],
  ]);
  await page.screenshot({ path: "artifacts/haven-bridge.png" });
  await page.keyboard.down("KeyA");
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(1100);
  await page.keyboard.up("KeyA");
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(300);
  const z = await page
    .locator(".map-ring b")
    .evaluate((dot: HTMLElement) => parseFloat(dot.style.top) - 50);
  expect(z).toBeLessThan(-3.6);
  await walkRoute(page, [
    [30, -5],
    [29, -17],
    [19, -30],
  ]);
  await page.screenshot({ path: "artifacts/haven-lookout.png" });
  await walkRoute(page, [
    [2, -33],
    [-15, -28],
  ]);
  await page.screenshot({ path: "artifacts/haven-ruins.png" });
  await walkRoute(page, [
    [-23, -19],
    [-29, -6],
  ]);
  await page.screenshot({ path: "artifacts/haven-grove.png" });
  const scene = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => n.includes("@react-three_fiber.js"))!;
    const { _roots } = await import(/* @vite-ignore */ url);
    const { scene, gl } = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState();
    return {
      trees: scene.getObjectByName("haven-trunk").count,
      wildlife: scene
        .getObjectByName("haven-wildlife")
        .children.filter((o: any) => o.name.startsWith("habitat-")).length,
      bridge: !!scene.getObjectByName("willowmere-bridge"),
      calls: gl.info.render.calls,
    };
  });
  expect(scene.trees).toBeGreaterThan(100);
  expect(scene.wildlife).toBe(17);
  expect(scene.bridge).toBe(true);
  expect(scene.calls).toBeLessThan(1000);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to Havenreach village" })
    .click();
  await expect
    .poll(() => page.locator(".map-ring b").getAttribute("style"))
    .toBe("left: 50%; top: 55%;");
  await page.keyboard.press("KeyR");
  await expect(page.locator(".location small")).toHaveText(
    "Havenreach Village",
  );
  await page.getByRole("button", { name: "Travel map", exact: true }).click();
  await page.getByRole("button", { name: "Travel to another region" }).click();
  await expect(page.locator(".region-card")).toHaveCount(4);
  expect(errors).toEqual([]);
});
async function clickWorld(page: Page, point: number[], drag = false) {
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

test("mouse picking opens villagers, gathers seeds, and saves a house visitor stamp", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const post = (data: unknown, path: string, token = "") =>
      fetch("/api/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    const g = await post({ name: "Porch Explorer", avatar: 0 }, "guest");
    localStorage.setItem("mythoveya-session", g.token);
    for (const data of [
      { kind: "starter", species: "emberfox" },
      { kind: "guide" },
    ])
      await post(
        { ...data, requestId: crypto.randomUUID() },
        "mutate",
        g.token,
      );
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Porch Explorer");
  await page.keyboard.press("KeyE");
  await expect(page.locator(".modal")).toHaveCount(0);
  await clickWorld(page, [-3, 1, 1], true);
  await expect(page.locator(".modal")).toHaveCount(0);
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(300);
  await clickWorld(page, [0, 0.25, 6]);
  await expect(page.getByRole("status")).toContainText("+1 Sunseed");
  await clickWorld(page, [-3, 1, 1]);
  await expect(
    page.getByRole("heading", { name: "Warden Liora", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await walkRoute(page, [
    [0, 11],
    [-12, 15],
    [-18, 8],
    [-14, 7.5],
  ]);
  await page.screenshot({ path: "artifacts/haven-workshop.png" });
  await clickWorld(page, [-14, 1.6, 5]);
  await expect(
    page.getByRole("heading", { name: "Maplewick Workshop", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign the visitor book" }).click();
  await expect(
    page.getByRole("button", { name: "Visitor book signed" }),
  ).toBeDisabled();
  await expect(page.locator(".visitor-stamps .stamped")).toHaveCount(1);
  await page.screenshot({ path: "artifacts/haven-visitor-book.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/haven-visitor-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  const stamps = await page.evaluate(
    async () =>
      (
        await fetch("/api/profile", {
          headers: {
            Authorization:
              "Bearer " + localStorage.getItem("mythoveya-session"),
          },
        }).then((r) => r.json())
      ).town.stamps,
  );
  expect(stamps).toEqual(["workshop"]);
  expect(errors).toEqual([]);
});
