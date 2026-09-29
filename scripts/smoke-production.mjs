import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@colyseus/sdk";
const port = 27862,
  base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["dist/server/index.js"], {
  env: {
    ...process.env,
    SERVER_PORT: String(port),
    DB_PATH: join(
      mkdtempSync(join(tmpdir(), "mythoveya-build-")),
      "save.sqlite",
    ),
  },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let logs = "";
child.stdout.on("data", (d) => (logs += d));
child.stderr.on("data", (d) => (logs += d));
const rooms = [];
try {
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try {
      healthy = (await fetch(base + "/api/health")).ok;
      if (healthy) break;
    } catch {}
    await delay(100);
  }
  if (!healthy) throw Error(logs);
  const html = await fetch(base).then((r) => r.text());
  if (!html.includes("Mythoveya")) throw Error("Compiled title missing");
  for (const asset of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g))
    if (!(await fetch(base + asset[1])).ok)
      throw Error("Missing compiled asset " + asset[1]);
  const post = (path, data, token = "") =>
    fetch(base + "/api/" + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(data),
    }).then((r) => r.json());
  const guests = [];
  for (const name of ["Compiled One", "Compiled Two"]) {
    const p = await post("guest", { name, avatar: 0 });
    for (const body of [
      { kind: "starter", species: "emberfox" },
      { kind: "guide" },
    ])
      await post(
        "mutate",
        { ...body, requestId: crypto.randomUUID() },
        p.token,
      );
    guests.push(p);
  }
  const a = await new Client(base).create("arena", {
    token: guests[0].token,
    mode: "power",
    ranked: false,
  });
  rooms.push(a);
  const b = await new Client(base).joinById(a.roomId, {
    token: guests[1].token,
  });
  rooms.push(b);
  let resultA, resultB;
  a.onMessage("snapshot", (s) => (resultA = s));
  b.onMessage("snapshot", (s) => (resultB = s));
  a.send("ready");
  b.send("ready");
  for (let i = 0; i < 50 && !resultA?.battle; i++) await delay(40);
  if (!resultA?.battle) throw Error("Compiled arena did not start");
  b.send("forfeit");
  await delay(150);
  if (resultA.battle.winner !== 0 || resultB.battle.winner !== 0)
    throw Error("Compiled outcomes disagree");
  console.log("Compiled game, local assets, guest flow and human arena: PASS");
} finally {
  for (const room of rooms) await room.leave();
  child.kill();
}
