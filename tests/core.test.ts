import { describe, it, expect } from "vitest";
import { SPECIES, TIERS } from "../packages/shared/content";
import { pull, RATES } from "../packages/shared/economy";
import {
  makeBattle,
  act,
  autoAction,
  elo,
  elementMultiplier,
  legal,
} from "../packages/shared/combat";
const team = (start = 0) =>
  SPECIES.slice(start, start + 6).map((s) => ({
    id: s.id,
    species: s.id,
    level: 1,
    xp: 0,
    shards: 0,
    upgrade: 0,
    locked: false,
  }));
describe("content and economy", () => {
  it("has complete, stable content with executable actions", () => {
    // Ten species per tier, plus six newer A-tier and six newer S-tier.
    expect(SPECIES).toHaveLength(72);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(72);
    for (const tier of TIERS)
      expect(SPECIES.filter((s) => s.tier === tier)).toHaveLength(
        tier === "A" || tier === "S" ? 16 : 10,
      );
    expect(
      new Set(SPECIES.flatMap((s) => s.actions.map((a) => a.id))).size,
    ).toBe(216);
    expect(new Set(SPECIES.map((s) => s.passive.id)).size).toBe(72);
    expect(new Set(SPECIES.map((s) => s.family)).size).toBe(12);
    for (const s of SPECIES) {
      expect(
        s.actions.every(
          (a) => a.effects.length > 0 && a.audio && a.presentation,
        ),
      ).toBe(true);
      expect(s.portrait).toContain(s.id);
    }
  });
  it("preserves base rates and pity boundaries", () => {
    expect(RATES.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const p = { as: 29, s: 89 };
    const first = pull(p, () => 0);
    expect(SPECIES.find((s) => s.id === first)!.tier).toBe("S");
    expect(p).toEqual({ as: 0, s: 0 });
    const q = { as: 29, s: 70 };
    const second = pull(q, () => 0);
    expect(SPECIES.find((s) => s.id === second)!.tier).toBe("A");
    expect(q).toEqual({ as: 0, s: 71 });
    const r = { as: 20, s: 80 };
    for (let i = 0; i < 10; i++) pull(r, () => 0.1);
    expect(r).toEqual({ as: 0, s: 0 });
  });
});
describe("combat", () => {
  it("is deterministic and terminates", () => {
    const play = () => {
      const b = makeBattle("test", [team(), team(10)], "pve", 444);
      let turns = 0;
      while (b.winner === null && turns++ < 320) {
        const choice = autoAction(b);
        act(
          b,
          b.units.find((u) => u.id === b.queue[0])!.side,
          choice.action,
          choice.target,
          turns * 3000,
        );
      }
      expect(b.winner).not.toBeNull();
      return b;
    };
    expect(play()).toEqual(play());
  });
  it("rejects illegal actions and screens the rear", () => {
    const b = makeBattle("x", [team(), team()]);
    const a = b.units.find((u) => u.id === b.queue[0])!;
    expect(() => legal(b, 1 - a.side, 0, "0:0")).toThrow();
    expect(() => legal(b, a.side, 0, `${1 - a.side}:3`)).toThrow();
    expect(() => legal(b, a.side, 2, `${1 - a.side}:0`)).toThrow();
  });
  it("uses mutual light/shadow advantages and zero-sum Elo", () => {
    expect(elementMultiplier("Light", "Shadow")).toBe(1.2);
    expect(elementMultiplier("Shadow", "Light")).toBe(1.2);
    expect(elementMultiplier("Grove", "Flame")).toBe(0.85);
    expect(elo(1000, 1000, 1)).toEqual([1012, 988]);
    expect(elo(1000, 1000, 0.5)).toEqual([1000, 1000]);
  });
  it("runs all 180 action definitions", () => {
    for (const s of SPECIES)
      for (let action = 0; action < 3; action++) {
        const b = makeBattle(s.id, [
          [...team().slice(0, 5), { ...team()[0], species: s.id }],
          team(10),
        ]);
        const actor = b.units[5];
        b.queue = [actor.id, ...b.queue.filter((id) => id !== actor.id)];
        b.energy[0] = 10;
        const a = s.actions[action];
        const ally = ["ally", "allies", "self"].includes(a.target);
        const target =
          a.target === "self"
            ? actor.id
            : ally
              ? "0:0"
              : a.target === "rear"
                ? "1:3"
                : "1:0";
        expect(() => act(b, 0, action, target, 0)).not.toThrow();
      }
  });
});
