import { test, expect, type Page } from "@playwright/test";
async function walkTo(page: Page, key: string, label: string) {
  await expect(page.locator(".interact")).toBeVisible();
  // Stop inside the browser when the marker appears. Repeated driver round trips
  // can hold a key too long on a busy GPU and walk past a valid interaction.
  await page.evaluate(
    ({ key, label }) =>
      new Promise<void>((resolve, reject) => {
        const started = performance.now();
        document.body.dispatchEvent(
          new KeyboardEvent("keydown", { code: key, bubbles: true }),
        );
        const timer = setInterval(() => {
          const arrived = document
            .querySelector(".interact")
            ?.textContent?.includes(label);
          if (arrived || performance.now() - started > 20000) {
            document.body.dispatchEvent(
              new KeyboardEvent("keyup", { code: key, bubbles: true }),
            );
            clearInterval(timer);
            if (arrived) resolve();
            else reject(new Error(`Did not reach ${label}`));
          }
        }, 30);
      }),
    { key, label },
  );
  await expect(page.locator(".interact")).toContainText(label);
}
async function newKeeper(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin your journey" }).click();
  await page.getByLabel("Keeper name").fill(name);
  await page.getByRole("button", { name: "Choose this keeper" }).click();
  await page.getByRole("button", { name: "Begin with Emberfox" }).click();
  await expect(page.locator(".keeper-badge")).toContainText(name);
  await walkTo(page, "KeyW", "Warden Liora");
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Accept companions & quest" }).click();
  await expect(page.locator(".companion-strip .portrait")).toHaveCount(6);
}
test("first journey, battle, recruitment, formation, reload and settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await newKeeper(page, "Meadow Keeper");
  await page.screenshot({ path: "artifacts/world.png" });
  await walkTo(page, "KeyA", "Wild encounter");
  await page.keyboard.press("KeyE");
  await page.getByRole("tab", { name: "Services", exact: true }).click();
  await page.getByRole("button", { name: "Begin a wild encounter" }).click();
  await expect(page.getByRole("button", { name: "Auto OFF" })).toBeVisible();
  await page.screenshot({ path: "artifacts/battle.png" });
  await page.getByRole("button", { name: "Fast OFF" }).click();
  await page.getByRole("button", { name: "Auto OFF" }).click();
  await expect(
    page.getByRole("heading", { name: "Victory", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await page.getByRole("button", { name: "Continue your journey" }).click();
  if (await page.getByRole("button", { name: "Let it wander" }).count())
    await page.getByRole("button", { name: "Let it wander" }).click();
  await page
    .getByRole("button", { name: "Claim reward", exact: true })
    .first()
    .click();
  await page.getByLabel("Close panel").click();
  await page
    .locator(".world-nav")
    .getByRole("button", { name: "Recruit" })
    .click();
  await page.getByRole("button", { name: "Bond once" }).click();
  await expect(page.locator(".reveal-card")).toHaveCount(1);
  await expect(page.locator(".recruitment-stage canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/recruitment.png" });
  await page.getByLabel("Close panel").click();
  await page
    .locator(".world-nav")
    .getByRole("button", { name: "Team", exact: false })
    .click();
  await page.locator(".owned-strip button").first().click();
  await page.locator(".formation-slot").nth(1).click();
  await expect(page.locator(".formation-slot").nth(1)).toContainText(
    "Emberfox",
  );
  await page.getByRole("button", { name: "Save formation" }).click();
  await expect(page.getByRole("status")).toContainText("Formation saved");
  await page.getByLabel("Close panel").click();
  await page
    .locator(".world-nav")
    .getByRole("button", { name: "Journal" })
    .click();
  await expect(page.locator(".creature-card")).toHaveCount(60);
  await page.screenshot({ path: "artifacts/collection.png" });
  await page.getByLabel("Close panel").click();
  const before = await page.evaluate(async () =>
    fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("mythoveya-session")}`,
      },
    }).then((r) => r.json()),
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".keeper-badge")).toContainText("Meadow Keeper");
  const after = await page.evaluate(async () =>
    fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("mythoveya-session")}`,
      },
    }).then((r) => r.json()),
  );
  expect(after).toEqual(before);
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Mute all sound").check();
  await page.getByLabel("Reduced motion").check();
  await page.getByRole("button", { name: "Play sound test" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Sound & settings" }).click();
  await expect(page.getByLabel("Mute all sound")).toBeChecked();
  await expect(page.getByLabel("Reduced motion")).toBeChecked();
  expect(errors).toEqual([]);
});
test("two isolated keepers share an authoritative arena result", async ({
  browser,
}) => {
  const one = await browser.newContext(),
    two = await browser.newContext();
  const a = await one.newPage(),
    b = await two.newPage();
  // The preceding journey test covers onboarding UI. Set up arena opponents through
  // the same authenticated public endpoints so this test isolates synchronization.
  for (const [page, name] of [
    [a, "First Rival"],
    [b, "Second Rival"],
  ] as const) {
    await page.goto("/");
    await page.evaluate(async (name) => {
      const post = async (path: string, data: any, token = "") =>
        fetch("/api/" + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(data),
        }).then((r) => r.json());
      const guest = await post("guest", { name, avatar: 0 });
      localStorage.setItem("mythoveya-session", guest.token);
      await post(
        "mutate",
        {
          kind: "starter",
          species: "emberfox",
          requestId: crypto.randomUUID(),
        },
        guest.token,
      );
      await post(
        "mutate",
        { kind: "guide", requestId: crypto.randomUUID() },
        guest.token,
      );
    }, name);
    await page.reload();
    await page.getByRole("button", { name: "Continue your journey" }).click();
  }
  await a.bringToFront();
  await a.locator(".world-nav").getByRole("button", { name: "Arena" }).click();
  await b.locator(".world-nav").getByRole("button", { name: "Arena" }).click();
  await a.getByRole("button", { name: "Create friendly room" }).click();
  const code = await a.locator(".room-code strong").innerText();
  await b.getByLabel("Room code").fill(code);
  await b.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(a.locator(".opponents")).toContainText("Second Rival");
  await a.getByRole("button", { name: "Ready to battle" }).click();
  await b.getByRole("button", { name: "Ready to battle" }).click();
  await expect(a.locator(".battle-screen")).toBeVisible();
  await expect(b.locator(".battle-screen")).toBeVisible();
  for (let i = 0; i < 4; i++) {
    const active = await a.locator(".actor-copy .eyebrow").innerText();
    const page = active === "YOUR TURN" ? a : b;
    await page.getByRole("button", { name: "Use ability" }).click();
    await page.waitForTimeout(850);
  }
  await a.screenshot({ path: "artifacts/pvp.png" });
  b.on("dialog", (d) => d.accept());
  await b.getByRole("button", { name: "Forfeit", exact: true }).click();
  await expect(
    a.getByRole("heading", { name: "Victory", exact: true }),
  ).toBeVisible();
  await expect(
    b.getByRole("heading", { name: "Until next time", exact: true }),
  ).toBeVisible();
  const result = await a.evaluate(async () =>
    fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("mythoveya-session")}`,
      },
    }).then((r) => r.json()),
  );
  expect(result.ratings.tactical).toBe(1000);
  expect(result.ranked.tactical).toBe(0);
  await one.close();
  await two.close();
});
