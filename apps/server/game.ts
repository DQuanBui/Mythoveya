import { randomInt, randomUUID } from "node:crypto";
import {
  byId,
  COMPANIONS,
  REGIONS,
  STARTERS,
} from "../../packages/shared/content";
import { formation, gainXp, own, pull } from "../../packages/shared/economy";
import {
  act,
  autoAction,
  makeBattle,
  power,
} from "../../packages/shared/combat";
import type { Battle, Owned, Profile } from "../../packages/shared/types";
import { atomic, db, getProfile, save } from "./store";
import { ensureTown, utcDay, utcWeek } from "../../packages/shared/town";
import { townMutation } from "./town-game";
export const pve = new Map<string, Battle>();
export const activeHuman = new Set<string>();
export const battleMeta = new Map<string, { region: string; boss: boolean }>();
const random = () => randomInt(0, 0x100000000) / 0x100000000;
export function team(p: Profile) {
  formation({ ...p }, p.team);
  return p.team.map((id) => structuredClone(p.owned.find((o) => o.id === id)!));
}
export function mutate(p: Profile, kind: string, v: any) {
  const town = ensureTown(p);
  if (kind.startsWith("town-")) return townMutation(p, kind, v);
  switch (kind) {
    case "starter":
      if (p.owned.length) throw Error("You already chose a starter.");
      if (!STARTERS.includes(v.species)) throw Error("Choose a starter.");
      p.team = [own(p, v.species).id];
      break;
    case "guide":
      if (!p.owned.length) throw Error("Choose your first companion.");
      if (!p.quests.guide) {
        for (const s of COMPANIONS) p.team.push(own(p, s).id);
        p.quests.guide = 1;
      }
      break;
    case "recruit": {
      const count = v.count === 10 ? 10 : 1;
      if (p.diamonds < count * 100)
        throw Error("Not enough diamonds. Complete quests to earn more.");
      p.diamonds -= count * 100;
      const result = [];
      for (let i = 0; i < count; i++) {
        const species = pull(p.pity, random);
        const duplicate = p.owned.some((o) => o.species === species);
        own(p, species);
        result.push({ species, duplicate });
      }
      p.quests.recruit = 1;
      return result;
    }
    case "formation":
      formation(p, v.team);
      break;
    case "claim": {
      const id = v.quest;
      if (p.claims.includes(id)) throw Error("Reward already claimed.");
      const available: Record<string, boolean> = {
        tutorial: p.wins >= 1,
        recruit: !!p.quests.recruit,
        formation: !!p.quests.formation,
        explorer: p.wins >= 3,
        arena: !!p.quests.arena,
      };
      if (!available[id]) throw Error("Complete the objective first.");
      p.claims.push(id);
      p.diamonds += id === "tutorial" ? 600 : 100;
      p.gold += 100;
      gainXp(p, 60);
      break;
    }
    case "resource":
      if (!/^resource-[0-2]$/.test(v.resource))
        throw Error("Unknown resource.");
      {
        const key = `${p.region}:${v.resource}`;
        if (p.resources.includes(key)) throw Error("Already gathered today.");
        p.resources.push(key);
        p.daily.resources++;
        p.gold += 25;
        p.quests.resources = (p.quests.resources || 0) + 1;
        town.inventory.sunseed = (town.inventory.sunseed || 0) + 1;
      }
      break;
    case "train": {
      const o = p.owned.find((o) => o.id === v.id);
      if (!o) throw Error("Companion not owned.");
      if (p.gold < 50) throw Error("Training costs 50 gold.");
      p.gold -= 50;
      o.xp += 60;
      gainXp(p, 10);
      p.daily.train++;
      town.stats.trained = (town.stats.trained || 0) + 1;
      break;
    }
    case "upgrade": {
      const o = p.owned.find((o) => o.id === v.id);
      if (!o || o.shards < 3 || o.upgrade >= 5)
        throw Error("Need 3 shards; maximum upgrade is 5.");
      o.shards -= 3;
      o.upgrade++;
      break;
    }
    case "lock": {
      const o = p.owned.find((o) => o.id === v.id);
      if (o) o.locked = !o.locked;
      break;
    }
    case "avatar":
      if (!Number.isInteger(v.avatar) || v.avatar < 0 || v.avatar > 7)
        throw Error("Choose one of the eight keepers.");
      p.avatar = v.avatar;
      break;
    case "travel": {
      const r = REGIONS.find((r) => r.id === v.region);
      if (!r || p.wins < r.unlock)
        throw Error("Win more encounters to unlock this region.");
      p.region = r.id;
      if (!town.visited.includes(r.id)) town.visited.push(r.id);
      break;
    }
    case "daily":
      if (
        p.daily.claimed ||
        p.daily.wins < 3 ||
        p.daily.train < 1 ||
        p.daily.resources < 3
      )
        throw Error("Complete all daily objectives.");
      p.daily.claimed = true;
      p.diamonds += 100;
      p.gold += 150;
      gainXp(p, 80);
      break;
    case "bond": {
      if (!p.bond || p.bond.used) throw Error("No wild bond is available.");
      if (p.tokens < 1) throw Error("You need a bond token.");
      p.tokens--;
      p.bond.used = true;
      const success = random() < p.bond.chance;
      if (success) own(p, p.bond.species);
      return { success, species: p.bond.species };
    }
    default:
      throw Error("Unknown request.");
  }
  return null;
}
export function startPve(p: Profile, boss: boolean, practice = false) {
  if (activeHuman.has(p.id)) throw Error("Finish your arena match first.");
  const existing = pve.get(p.id);
  if (existing && existing.winner === null) return existing;
  const ids =
    p.region === "canyon"
      ? ["magmole", "cragpup", "voltwing", "flintuff", "cindermite", "emberfox"]
      : p.region === "hollow"
        ? [
            "snowmew",
            "shadecko",
            "glimlet",
            "frostwhisk",
            "duskblob",
            "rimeowl",
          ]
        : [
            "mossprig",
            "pebblit",
            "puddlepip",
            "cindermite",
            "zippinch",
            "thornhare",
          ];
  const enemy: Owned[] = ids.map((species, i) => ({
    id: `enemy-${i}`,
    species,
    level: Math.max(1, p.level - (p.wins === 0 ? 2 : 1) + (boss ? 2 : 0)),
    xp: 0,
    shards: 0,
    upgrade: 0,
    locked: false,
  }));
  const b = makeBattle(
    randomUUID(),
    [team(p), enemy],
    practice ? "practice" : "pve",
    randomInt(0, 10000000),
  );
  b.title = practice
    ? "Practice vs computer"
    : boss
      ? p.region === "canyon"
        ? "Cinder Regent"
        : p.region === "hollow"
          ? "Hollow Sentinel"
          : "Thorncrown"
      : "Wild encounter";
  if (p.wins === 0 && !boss)
    for (const u of b.units.filter((u) => u.side === 1)) {
      u.hp = u.maxHp = Math.round(u.maxHp * 0.5);
      u.attack = Math.round(u.attack * 0.6);
    }
  if (boss) {
    const s =
      p.region === "canyon"
        ? "pyroclast"
        : p.region === "hollow"
          ? "glaciermaw"
          : "briarhart";
    b.units[6].species = s;
    b.units[6].hp = b.units[6].maxHp = Math.round(b.units[6].maxHp * 1.7);
  }
  pve.set(p.id, b);
  battleMeta.set(b.id, { region: practice ? "practice" : p.region, boss });
  return b;
}
export function finishPve(profileId: string, b: Battle) {
  if (b.winner === null) return;
  atomic(() => {
    if (db.prepare("SELECT id FROM matches WHERE id=?").get(b.id)) return;
    const p = getProfile(profileId);
    const before = {
      gold: p.gold,
      diamonds: p.diamonds,
      tokens: p.tokens,
      species: p.owned.map((o) => o.species),
    };
    const meta = battleMeta.get(b.id);
    const town = ensureTown(p);
    if (meta?.region === "practice" && b.winner === 0) town.sparWon = utcDay();
    if (meta?.boss && meta.region !== "practice" && b.winner === 0)
      town.guardianWeek = utcWeek();
    if (meta?.region !== "practice" && b.winner === 0) {
      p.wins++;
      p.daily.wins++;
      p.gold += 80;
      p.tokens++;
      gainXp(p, 90);
      const candidate = b.units.find(
        (u) => u.side === 1 && ["E", "D", "C"].includes(byId[u.species].tier),
      );
      if (candidate)
        p.bond = { species: candidate.species, chance: 0.8, used: false };
      if (meta?.boss && !p.bosses.includes(meta.region)) {
        p.bosses.push(meta.region);
        own(
          p,
          meta.region === "canyon"
            ? "ignivara"
            : meta.region === "hollow"
              ? "crysalune"
              : "sylvarion",
        );
        p.diamonds += 150;
      }
    }
    b.rewards = {
      gold: p.gold - before.gold,
      diamonds: p.diamonds - before.diamonds,
      tokens: p.tokens - before.tokens,
      xp: meta?.region !== "practice" && b.winner === 0 ? 90 : 0,
      newSpecies: p.owned
        .filter((o) => !before.species.includes(o.species))
        .map((o) => o.species),
    };
    db.prepare("INSERT INTO matches VALUES(?,?)").run(
      b.id,
      JSON.stringify({ winner: b.winner, kind: "pve", profileId }),
    );
    save(p);
  });
}
export function pveAction(
  p: Profile,
  choice?: { action: number; target: string },
  fast = false,
) {
  const b = pve.get(p.id);
  if (!b || b.winner !== null) throw Error("No active battle.");
  if (Date.now() < b.readyAt) throw Error("Wait for the current action.");
  const u = b.units.find((u) => u.id === b.queue[0])!;
  if (choice && u.side !== 0) throw Error("The opponent is deciding.");
  const a = choice || autoAction(b);
  act(b, u.side, a.action, a.target, Date.now(), fast);
  finishPve(p.id, b);
  return b;
}
export function ranking(p: Profile) {
  return Math.max(
    0,
    ...[p.team, ...(p.savedFormations || [])]
      .filter(
        (t) =>
          t.length === 6 &&
          new Set(t).size === 6 &&
          t.every((id) => p.owned.some((o) => o.id === id)),
      )
      .map((t) =>
        t.reduce((n, id) => n + power(p.owned.find((o) => o.id === id)!), 0),
      ),
  );
}
