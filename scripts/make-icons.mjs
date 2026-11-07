// Renders the app icons from the game's emblem. Rerun if the emblem changes:
//   node scripts/make-icons.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const emblem = readFileSync("apps/client/public/emblem.svg", "utf8"),
  out = "apps/client/public/icons";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
// A maskable icon may be cropped to a circle, so its emblem sits well inside.
const icons = [
  ["icon-192.png", 192, 0.78],
  ["icon-512.png", 512, 0.78],
  ["maskable-512.png", 512, 0.58],
  ["apple-180.png", 180, 0.74],
];
for (const [name, size, fill] of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><body style="margin:0;display:grid;place-items:center;height:100vh;background:radial-gradient(circle at 50% 40%,#1d4a52,#112e36 72%)"><div style="width:${size * fill}px;height:${size * fill}px">${emblem}</div></body>`);
  await page.screenshot({ path: `${out}/${name}` });
  await page.close();
}
await browser.close();
