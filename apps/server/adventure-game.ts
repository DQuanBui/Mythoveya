import type { Profile } from "../../packages/shared/types";
import { gainXp } from "../../packages/shared/economy";
import { ensureTown, utcDay } from "../../packages/shared/town";
import { byId } from "../../packages/shared/content";
import {
  CHAPTERS,
  CHAPTER_MASTERY,
  ELIXIR_XP,
  evolution,
  GEAR_MAX_LEVEL,
  SKILL_MAX,
  gearName,
  gearSalvage,
  gearUpgradeCost,
  rewardText,
  skillCost,
  type Gear,
  type GearSlot,
  type Reward,
} from "../../packages/shared/adventure";

export function ensureAdventure(p: Profile, now = Date.now()) {
  p.gear ||= [];
  p.adventure ||= {
    stages: {},
    chests: [],
    best: {},
    dungeonDay: utcDay(now),
    runs: {},
    gearSeq: 0,
  };
  if (p.adventure.dungeonDay !== utcDay(now)) {
    p.adventure.dungeonDay = utcDay(now);
    p.adventure.runs = {};
  }
  return p.adventure;
}
export function grantReward(p: Profile, r: Reward) {
  const t = ensureTown(p);
  p.gold += r.gold || 0;
  p.diamonds += r.diamonds || 0;
  p.tokens += r.tokens || 0;
  for (const item of ["tome", "dust", "elixir", "crystal"] as const)
    if (r[item]) t.inventory[item] = (t.inventory[item] || 0) + r[item]!;
  if (r.xp) gainXp(p, r.xp);
}
export function addGear(p: Profile, slot: GearSlot, rarity: number): Gear {
  const a = ensureAdventure(p),
    g: Gear = { id: `g${++a.gearSeq}`, slot, rarity, level: 0 };
  p.gear!.push(g);
  return g;
}
export function adventureMutation(p: Profile, kind: string, v: any) {
  ensureAdventure(p);
  const t = ensureTown(p);
  const companion = () => {
    const o = p.owned.find((o) => o.id === v.id);
    if (!o) throw Error("Choose an owned companion.");
    return o;
  };
  const gear = () => {
    const g = p.gear!.find((g) => g.id === v.item);
    if (!g) throw Error("That equipment is not in your bag.");
    return g;
  };
  switch (kind) {
    case "skill-up": {
      const o = companion(),
        slot = v.slot === 2 ? 1 : 0,
        levels: [number, number] = [...(o.skills || [1, 1])] as [number, number];
      if (levels[slot] >= SKILL_MAX) throw Error("This skill is already mastered.");
      const cost = skillCost(levels[slot]);
      if ((t.inventory.tome || 0) < cost.tome || p.gold < cost.gold)
        throw Error(`Needs ${cost.tome} skill tome${cost.tome === 1 ? "" : "s"} and ${cost.gold} Gold.`);
      t.inventory.tome -= cost.tome;
      p.gold -= cost.gold;
      levels[slot]++;
      o.skills = levels;
      return { message: `Skill improved to level ${levels[slot]}.` };
    }
    case "gear-equip": {
      const o = companion(),
        g = gear();
      for (const other of p.gear!)
        if (other.owner === o.id && other.slot === g.slot) delete other.owner;
      g.owner = o.id;
      return { message: `Equipped ${gearName(g)}.` };
    }
    case "gear-remove": {
      const g = gear();
      delete g.owner;
      return { message: `${gearName(g)} returned to your bag.` };
    }
    case "gear-upgrade": {
      const g = gear();
      if (g.level >= GEAR_MAX_LEVEL) throw Error("This equipment is fully forged.");
      const cost = gearUpgradeCost(g);
      if ((t.inventory.dust || 0) < cost.dust || p.gold < cost.gold)
        throw Error(`Forging needs ${cost.dust} forge dust and ${cost.gold} Gold.`);
      t.inventory.dust -= cost.dust;
      p.gold -= cost.gold;
      g.level++;
      return { message: `Forged ${gearName(g)}.` };
    }
    case "gear-salvage": {
      const g = gear();
      if (g.owner) throw Error("Unequip it before salvaging.");
      p.gear = p.gear!.filter((x) => x.id !== g.id);
      t.inventory.dust = (t.inventory.dust || 0) + gearSalvage(g);
      return { message: `Salvaged into ${gearSalvage(g)} forge dust.` };
    }
    case "elixir": {
      const o = companion();
      if (!(t.inventory.elixir > 0)) throw Error("You have no growth elixir.");
      if (o.level >= p.level) throw Error("Raise your keeper level first.");
      t.inventory.elixir--;
      o.xp += ELIXIR_XP;
      gainXp(p, 0);
      return { message: `+${ELIXIR_XP} creature XP. Level ${o.level}.` };
    }
    case "evolve": {
      const o = companion(),
        e = evolution(o.species);
      if (!e) throw Error("This companion has no evolution.");
      const name = byId[e.to].name;
      if (p.owned.some((x) => x.species === e.to))
        throw Error(`You already have ${name}.`);
      if (o.level < e.level) throw Error(`Reach level ${e.level} to evolve.`);
      if ((t.inventory.crystal || 0) < e.crystal || p.gold < e.gold)
        throw Error(`Evolving needs ${e.crystal} Rift crystals and ${e.gold} Gold.`);
      t.inventory.crystal -= e.crystal;
      p.gold -= e.gold;
      const from = byId[o.species].name;
      o.species = e.to;
      t.stats.evolutions = (t.stats.evolutions || 0) + 1;
      return { message: `${o.nickname || from} evolved into ${name}!`, species: e.to };
    }
    case "chapter-chest": {
      const c = CHAPTERS.find((c) => c.id === v.quest),
        a = p.adventure!;
      if (!c) throw Error("Unknown chapter.");
      if (a.chests.includes(c.id)) throw Error("Mastery chest already opened.");
      if (!c.stages.every((s) => (a.stages[s.id] || 0) >= 3))
        throw Error("Earn three stars on every stage first.");
      a.chests.push(c.id);
      grantReward(p, CHAPTER_MASTERY);
      return { message: `Mastery chest: ${rewardText(CHAPTER_MASTERY)}.` };
    }
    default:
      throw Error("Unknown request.");
  }
}
