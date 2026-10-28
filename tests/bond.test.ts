import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bondChance } from "../packages/shared/combat";
import { byId } from "../packages/shared/content";
import type { Battle } from "../packages/shared/types";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-bond-")), "save.sqlite");
const { createProfile, authenticate, operation, save, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
const routes = await import("../apps/server/routes");
afterAll(() => db.close());

function keeper(tokens = 3) {
  const g = createProfile("Bond Keeper", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.tokens = tokens;
  });
  return g.token;
}
/** Starts a wild battle and hands the next turn to the keeper's side. */
function wild(token: string) {
  const b = game.startPve(authenticate(token), false);
  playerTurn(b);
  return b;
}
function playerTurn(b: Battle) {
  const mine = b.units.find((u) => u.side === 0 && u.hp > 0)!;
  b.queue = [mine.id, ...b.queue.filter((id) => id !== mine.id)];
  b.readyAt = 0;
}
const bondable = (b: Battle) =>
  b.units.find((u) => u.side === 1 && u.hp > 0 && ["E", "D", "C"].includes(byId[u.species].tier))!;

describe("mid-battle bonds", () => {
  it("rises from 20% at full health toward 90% as a creature tires", () => {
    const u = { hp: 100, maxHp: 100 } as never;
    expect(bondChance(u)).toBe(0.2);
    expect(bondChance({ hp: 50, maxHp: 100 } as never)).toBe(0.55);
    expect(bondChance({ hp: 1, maxHp: 100 } as never)).toBe(0.89);
  });

  it("spends a token and the turn, and a success joins the collection", () => {
    const token = keeper(40);
    const b = wild(token);
    expect(b.wild).toBe(true);
    const target = bondable(b);
    target.hp = 1;
    let joined = false;
    for (let i = 0; i < 30 && !joined; i++) {
      const before = authenticate(token),
        sequence = b.sequence;
      playerTurn(b);
      game.pveBond(before, target.id);
      const after = authenticate(token);
      expect(after.tokens).toBe(before.tokens - 1);
      expect(b.sequence).toBe(sequence + 1);
      expect(b.event?.action).toBe("bond-0");
      joined = !!b.bonded?.includes(target.species);
      if (joined) {
        expect(target.hp).toBe(0);
        expect(b.queue).not.toContain(target.id);
        expect(after.owned.some((o) => o.species === target.species)).toBe(true);
      }
    }
    expect(joined).toBe(true);
  });

  it("wins and settles the battle once when the last wild creature joins", () => {
    const token = keeper(60);
    const b = wild(token),
      last = bondable(b);
    for (const u of b.units) if (u.side === 1 && u !== last) u.hp = 0;
    last.hp = 1;
    for (let i = 0; i < 40 && b.winner === null; i++) {
      playerTurn(b);
      game.pveBond(authenticate(token), last.id);
    }
    expect(b.winner).toBe(0);
    const p = authenticate(token);
    expect(p.wins).toBe(1);
    expect(() => game.pveBond(p, last.id)).toThrow("No active battle");
    game.finishPve(p.id, b);
    expect(authenticate(token).wins).toBe(1);
  });

  it("refuses practice battles, proud creatures, missing tokens and stale requests", () => {
    const token = keeper(0);
    const b = wild(token);
    const proud = b.units.find((u) => u.side === 1)!;
    const saved = proud.species;
    proud.species = "ignivara"; // An S-tier mythic.
    expect(() => game.pveBond(authenticate(token), proud.id)).toThrow("too proud");
    proud.species = saved;
    const target = bondable(b),
      sequence = b.sequence;
    expect(() => game.pveBond(authenticate(token), target.id)).toThrow("bond token");
    expect(authenticate(token).tokens).toBe(0);
    expect(b.sequence).toBe(sequence);
    expect(target.hp).toBeGreaterThan(0);
    const p = authenticate(token);
    p.tokens = 2;
    save(p);
    expect(() =>
      routes.battleBond(token, { target: target.id, sequence: b.sequence + 5 }),
    ).toThrow("Battle updated");
    expect(authenticate(token).tokens).toBe(2);
    expect(() => game.pveBond(authenticate(token), b.units.find((u) => u.side === 0)!.id)).toThrow(
      "wild creature",
    );
    // Practice battles and guardians are not wild encounters.
    b.winner = 2;
    const practice = game.startPve(authenticate(token), false, true);
    playerTurn(practice);
    expect(practice.wild).toBe(false);
    expect(() => game.pveBond(authenticate(token), bondable(practice).id)).toThrow("Only wild");
  });
});
