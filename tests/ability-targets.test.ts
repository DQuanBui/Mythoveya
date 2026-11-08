import { describe, expect, it } from "vitest";
import { ALL_SPECIES, byId } from "../packages/shared/content";

const HINDER = ["stun", "slow", "silence", "weaken", "mark", "burn", "damage", "delay"],
  HELP = ["heal", "shield", "guard", "boost", "haste", "regen", "cleanse", "revive", "reflect", "thorns"];
const friendly = (target: string) => ["ally", "allies", "self"].includes(target);

describe("ability targets", () => {
  it("never aim an ability that leads with a hindrance at the user's own side", () => {
    for (const s of ALL_SPECIES)
      for (const a of s.actions) if (HINDER.includes(a.effects[0])) expect(friendly(a.target), `${s.id}: ${a.name}`).toBe(false);
  });
  it("never aim a purely helpful ability at the foes", () => {
    for (const s of ALL_SPECIES)
      for (const a of s.actions)
        if (a.effects.every((e) => HELP.includes(e))) expect(friendly(a.target), `${s.id}: ${a.name}`).toBe(true);
  });
  it("send Iskavelle's Absolute Stillness at the foes", () => {
    expect(byId.iskavelle.actions.map((a) => a.target)).toEqual(["enemy", "enemy", "row"]);
  });
});
