import { describe, expect, it } from "vitest";
import { act, damageEstimate, makeBattle, targets } from "../packages/shared/combat";
import { SPECIES, byId } from "../packages/shared/content";
import type { Owned } from "../packages/shared/types";

const owned = (species: string, level = 5): Owned => ({ id: species, species, level, xp: 0, shards: 0, upgrade: 0, locked: false });
const battle = (seed: number) =>
  makeBattle("x", [SPECIES.slice(0, 6).map((s) => owned(s.id)), SPECIES.slice(10, 16).map((s) => owned(s.id))], "pve", seed);

describe("damageEstimate", () => {
  it("lands within the battle's roll of what the first action really deals", () => {
    let checked = 0;
    for (let seed = 1; seed < 60; seed++) {
      const b = battle(seed),
        actor = b.units.find((u) => u.id === b.queue[0])!,
        target = targets(b, actor, 0).find((t) => t.side !== actor.side)!,
        estimate = damageEstimate(b, actor, target, 0)!,
        before = target.hp + target.shield;
      expect(estimate).toBeGreaterThan(0);
      act(b, actor.side, 0, target.id, 0, true);
      const dealt = before - target.hp - target.shield,
        crit = dealt > estimate * 1.07;
      expect(dealt / estimate / (crit ? 1.5 : 1)).toBeGreaterThan(0.92);
      expect(dealt / estimate / (crit ? 1.5 : 1)).toBeLessThan(1.08);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });
  it("leaves the battle untouched, seed included", () => {
    const b = battle(7),
      before = JSON.stringify(b),
      actor = b.units.find((u) => u.id === b.queue[0])!,
      target = b.units.find((u) => u.side !== actor.side)!;
    damageEstimate(b, actor, target, 0);
    expect(JSON.stringify(b)).toBe(before);
  });
  it("is null for abilities that do not hit straight away", () => {
    const b = battle(3);
    for (const actor of b.units)
      byId[actor.species].actions.forEach((a, n) => {
        if (!a.effects.includes("damage") || a.effects.includes("delay"))
          expect(damageEstimate(b, actor, b.units[0], n)).toBeNull();
      });
  });
});
describe("credit for what a companion did", () => {
  it("adds up damage dealt to foes, shields included, for the one who acted", () => {
    const b = battle(11),
      actor = b.units.find((u) => u.id === b.queue[0])!,
      target = targets(b, actor, 0).find((t) => t.side !== actor.side)!,
      before = target.hp + target.shield;
    expect(actor.dealt).toBeUndefined();
    act(b, actor.side, 0, target.id, 0, true);
    expect(actor.dealt).toBe(before - target.hp - target.shield);
    expect(b.units.filter((u) => u.id !== actor.id).every((u) => !u.dealt)).toBe(true);
  });
});
