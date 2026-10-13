import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ATLAS_CHAPTERS, atlasOf, atlasEcho } from "../packages/shared/atlas";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-atlas-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const { mutate } = await import("../apps/server/game");
afterAll(() => db.close());
const now = Date.parse("2026-10-13T12:00:00Z");
function keeper() {
  const { token } = createProfile("Atlas Keeper", 0);
  operation(token, crypto.randomUUID(), (p) => {
    mutate(p, "starter", { species: "emberfox" });
    mutate(p, "guide", {});
  });
  return token;
}
const op = (
  t: string,
  kind: string,
  v: object = {},
  time = now,
  id = crypto.randomUUID(),
) => operation(t, id, (p) => mutate(p, kind, v, time));
function region(t: string, region: string) {
  const p = authenticate(t);
  p.region = region;
  save(p);
}
function complete(t: string) {
  op(t, "atlas-start", { id: "atlas-haven" });
  for (const c of ATLAS_CHAPTERS) {
    region(t, c.region);
    op(t, "atlas-read", { id: c.id + "-tablet" });
    op(t, "atlas-solve", { id: c.id, inputs: c.code });
  }
  region(t, "haven");
  op(t, "atlas-finish", { id: "atlas-haven" });
}
it("preserves old saves and enforces chapter order, local sites and cost-free puzzle retries", () => {
  const t = keeper();
  expect(atlasOf(authenticate(t), now).started).toBe(false);
  expect(() => op(t, "atlas-read", { id: "atlas-haven-tablet" })).toThrow(
    "Begin",
  );
  region(t, "meadow");
  expect(() => op(t, "atlas-start", { id: "atlas-meadow" })).toThrow("Aster");
  region(t, "haven");
  op(t, "atlas-start", { id: "atlas-haven" });
  expect(() =>
    op(t, "atlas-solve", { id: "atlas-haven", inputs: [0, 1, 2] }),
  ).toThrow("Record");
  region(t, "meadow");
  expect(() => op(t, "atlas-read", { id: "atlas-meadow-tablet" })).toThrow(
    "earlier",
  );
  region(t, "haven");
  expect(() => op(t, "atlas-read", { id: "atlas-meadow-tablet" })).toThrow(
    "region",
  );
  op(t, "atlas-read", { id: "atlas-haven-tablet" });
  const before = authenticate(t);
  expect(() =>
    op(t, "atlas-solve", { id: "atlas-haven", inputs: [0, 0, 0] }),
  ).toThrow("glyphs");
  expect(authenticate(t)).toEqual(before);
  const p = authenticate(t);
  p.island = "home";
  save(p);
  expect(() =>
    op(t, "atlas-solve", { id: "atlas-haven", inputs: [0, 1, 2] }),
  ).toThrow("mainland");
});
it("saves the full story, rewards companions once and protects final and chapter operation replays", () => {
  const t = keeper();
  op(t, "atlas-start", { id: "atlas-haven" });
  expect(() => op(t, "atlas-finish", { id: "atlas-haven" })).toThrow("four");
  for (const c of ATLAS_CHAPTERS) {
    region(t, c.region);
    op(t, "atlas-read", { id: c.id + "-tablet" });
    expect(() => op(t, "atlas-read", { id: c.id + "-tablet" })).toThrow(
      "already",
    );
    const req = crypto.randomUUID();
    op(t, "atlas-solve", { id: c.id, inputs: c.code }, now, req);
    const saved = authenticate(t);
    op(t, "atlas-solve", { id: c.id, inputs: c.code }, now, req);
    expect(authenticate(t)).toEqual(saved);
    expect(() => op(t, "atlas-solve", { id: c.id, inputs: c.code })).toThrow(
      "already",
    );
  }
  expect(() => op(t, "atlas-finish", { id: "atlas-hollow" })).toThrow("Aster");
  region(t, "haven");
  const req = crypto.randomUUID();
  op(t, "atlas-finish", { id: "atlas-haven" }, now, req);
  const p = authenticate(t);
  op(t, "atlas-finish", { id: "atlas-haven" }, now, req);
  expect(authenticate(t)).toEqual(p);
  expect(() => op(t, "atlas-finish", { id: "atlas-haven" })).toThrow("already");
  expect(p.atlas!.finished).toBe(true);
  expect(p.atlas!.chapters).toHaveLength(4);
  for (const id of ["cairnfin", "inkwisp"])
    expect(p.owned.filter((o) => o.species === id)).toHaveLength(1);
});

it("rotates post-story echoes without resetting chapters and rejects stale, wrong and duplicate readings", () => {
  const t = keeper();
  op(t, "atlas-start", { id: "atlas-haven" });
  expect(() => op(t, "atlas-echo", { id: "atlas-haven" })).toThrow("Finish");
  const t2 = keeper();
  complete(t2);
  for (const time of [now, now + 86400000, now + 172800000])
    for (const c of ATLAS_CHAPTERS) {
      region(t2, c.region);
      const e = atlasEcho(c.region, time),
        v = { id: c.id, quest: e.day, inputs: [e.answer] };
      expect(() =>
        op(t2, "atlas-echo", { ...v, quest: "2000-01-01" }, time),
      ).toThrow("day changed");
      const before = authenticate(t2);
      expect(() =>
        op(t2, "atlas-echo", { ...v, inputs: [(e.answer + 1) % 4] }, time),
      ).toThrow("glyph");
      expect(authenticate(t2)).toEqual(before);
      const req = crypto.randomUUID();
      op(t2, "atlas-echo", v, time, req);
      const after = authenticate(t2);
      op(t2, "atlas-echo", v, time, req);
      expect(authenticate(t2)).toEqual(after);
      expect(after.gold - before.gold).toBe(20);
      expect(after.atlas!.chapters).toHaveLength(4);
      expect(() => op(t2, "atlas-echo", v, time)).toThrow("already");
    }
});
