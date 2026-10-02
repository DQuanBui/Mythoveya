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
import { resourcesForRegion } from "../../packages/shared/haven";
import { track } from "../../packages/shared/events";
import { eventMutation } from "./events-game";
import { islandMutation, ISLAND_KINDS } from "./island-game";
import { festivalMutation, FESTIVAL_KINDS } from "./festival-game";
import {
  adventureMutation,
  addGear,
  ensureAdventure,
  grantReward,
} from "./adventure-game";
import {
  CHAPTERS,
  DUNGEONS,
  BOSS_SCALE,
  DUNGEON_RUNS_PER_DAY,
  enemyLevel,
  companionBonus,
  dungeonReward,
  dungeonTierOpen,
  gearName,
  rewardText,
  rollGear,
  stageById,
  stageFirstReward,
  stageReplayReward,
  stageStars,
  stageUnlocked,
  towerFloor,
  towerReward,
  GEAR_SLOTS,
  TOWER_FLOORS,
  RARITIES,
  type DungeonId,
  type Reward,
} from "../../packages/shared/adventure";
export const pve = new Map<string, Battle>();
export const activeHuman = new Set<string>();
export type Mission = {
  stage?: string;
  dungeon?: string;
  tier?: number;
  tower?: number;
};
export const battleMeta = new Map<
  string,
  { region: string; boss: boolean } & Mission
>();
const random = () => randomInt(0, 0x100000000) / 0x100000000;
/** Consumes pending Apothecary tonics and adds their bonus to a battle team. */
function applyBuffs(p: Profile, six: Owned[]) {
  const t = ensureTown(p),
    used: string[] = [];
  for (const buff of ["vigor", "swift"] as const) {
    if (!((t.buffs?.[buff] || 0) > 0)) continue;
    t.buffs![buff]--;
    used.push(buff);
    for (const o of six) {
      o.bonus ||= { hp: 0, attack: 0, defense: 0, speed: 0, crit: 0 };
      if (buff === "vigor") o.bonus.hp += 0.1;
      else o.bonus.speed += Math.round(byId[o.species].stats.speed * 0.08);
    }
  }
  if (used.length) save(p);
  return used;
}
export function team(p: Profile) {
  formation({ ...p }, p.team);
  return p.team.map((id) => {
    const o = structuredClone(p.owned.find((o) => o.id === id)!);
    if (p.gear?.some((g) => g.owner === o.id)) o.bonus = companionBonus(p, o);
    return o;
  });
}
const ADVENTURE_KINDS = [
  "skill-up",
  "gear-equip",
  "gear-remove",
  "gear-upgrade",
  "gear-salvage",
  "elixir",
  "chapter-chest",
  "evolve",
];
export function mutate(p: Profile, kind: string, v: any, now = Date.now()) {
  const town = ensureTown(p);
  if (kind.startsWith("town-"))
    return townMutation(p, kind, v, Date.now(), random);
  if (ADVENTURE_KINDS.includes(kind)) {
    const value = adventureMutation(p, kind, v);
    if (kind === "gear-upgrade") track(p, "forge");
    if (kind === "evolve") track(p, "evolve");
    return value;
  }
  if (ISLAND_KINDS.includes(kind)) return islandMutation(p, kind, v, now);
  if (FESTIVAL_KINDS.includes(kind)) return festivalMutation(p, kind, v, now);
  if (["login-claim", "event-claim", "event-chest"].includes(kind))
    return eventMutation(p, kind, v, Date.now(), random);
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
      track(p, "recruits", count);
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
      if (!resourcesForRegion(p.region).some((n) => n.id === v.resource))
        throw Error("Unknown resource.");
      {
        const key = `${p.region}:${v.resource}`;
        if (p.resources.includes(key)) throw Error("Already gathered today.");
        p.resources.push(key);
        p.daily.resources++;
        p.gold += 25;
        p.quests.resources = (p.quests.resources || 0) + 1;
        track(p, "resources");
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
      track(p, "train");
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
      delete p.island;
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
export function startPve(
  p: Profile,
  boss: boolean,
  practice = false,
  mission: Mission = {},
) {
  if (activeHuman.has(p.id)) throw Error("Finish your arena match first.");
  const existing = pve.get(p.id);
  if (existing && existing.winner === null) return existing;
  if (mission.stage || mission.dungeon || mission.tower)
    return startMission(p, mission);
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
    [practice ? team(p) : buffed(p), enemy],
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
const enemyTeam = (species: string[], level: number): Owned[] =>
  species.map((s, i) => ({
    id: `enemy-${i}`,
    species: s,
    level: enemyLevel(level, s),
    xp: 0,
    shards: 0,
    upgrade: 0,
    locked: false,
  }));
const buffed = (p: Profile) => {
  const six = team(p);
  applyBuffs(p, six);
  return six;
};
function startMission(p: Profile, mission: Mission) {
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const a = ensureAdventure(p);
  let b: Battle;
  if (mission.tower) {
    const floor = mission.tower,
      next = (a.tower || 0) + 1;
    if (floor > TOWER_FLOORS) throw Error("The Rift Tower has sixty floors.");
    if (floor !== next) throw Error(`Climb in order: floor ${next} is next.`);
    const t = towerFloor(floor);
    b = makeBattle(
      randomUUID(),
      [buffed(p), enemyTeam(t.enemies, t.level)],
      "pve",
      randomInt(0, 10000000),
    );
    b.title = `Rift Tower · Floor ${floor}${t.boss ? " · Warden" : ""}`;
    if (t.boss) {
      const u = b.units.find((u) => u.side === 1 && u.species === t.boss)!;
      u.hp = u.maxHp = Math.round(u.maxHp * BOSS_SCALE.hp);
      u.attack = Math.round(u.attack * BOSS_SCALE.attack);
      u.shield = Math.round(u.maxHp * BOSS_SCALE.shield);
    }
    battleMeta.set(b.id, { region: "tower", boss: !!t.boss, tower: floor });
  } else if (mission.stage) {
    const stage = stageById[mission.stage];
    if (!stage || !stageUnlocked(p, stage.id))
      throw Error("Clear the previous stage first.");
    b = makeBattle(
      randomUUID(),
      [buffed(p), enemyTeam(stage.enemies, stage.level)],
      "pve",
      randomInt(0, 10000000),
    );
    b.title = stage.boss?.title || `Chapter ${stage.ci + 1} · ${stage.name}`;
    if (stage.ease)
      for (const u of b.units.filter((u) => u.side === 1)) {
        u.hp = u.maxHp = Math.round(u.maxHp * stage.ease);
        u.attack = Math.round(u.attack * stage.ease);
      }
    if (stage.boss) {
      const u = b.units.find(
        (u) => u.side === 1 && u.species === stage.boss!.species,
      )!;
      u.hp = u.maxHp = Math.round(u.maxHp * BOSS_SCALE.hp);
      u.attack = Math.round(u.attack * BOSS_SCALE.attack);
      u.shield = Math.round(u.maxHp * BOSS_SCALE.shield);
    }
    battleMeta.set(b.id, {
      region: CHAPTERS[stage.ci].id,
      boss: !!stage.boss,
      stage: stage.id,
    });
  } else {
    const d = DUNGEONS.find((d) => d.id === mission.dungeon),
      tier = mission.tier ?? 0;
    if (!d) throw Error("Unknown dungeon.");
    if (!dungeonTierOpen(p, tier, d.id))
      throw Error("Clear the previous tier and raise your keeper level.");
    if ((a.runs[d.id] || 0) >= DUNGEON_RUNS_PER_DAY)
      throw Error("No runs left today. Dungeons reset at 00:00 UTC.");
    b = makeBattle(
      randomUUID(),
      [buffed(p), enemyTeam([...d.enemies], d.levels[tier])],
      "pve",
      randomInt(0, 10000000),
    );
    b.title = `${d.name} · Tier ${["I", "II", "III", "IV", "V"][tier]}`;
    const guardian = b.units[b.units.length - 1];
    guardian.hp = guardian.maxHp = Math.round(guardian.maxHp * 1.6);
    battleMeta.set(b.id, {
      region: "dungeon",
      boss: false,
      dungeon: d.id,
      tier,
    });
  }
  pve.set(p.id, b);
  return b;
}
function finishMission(p: Profile, b: Battle, meta: Mission) {
  const a = ensureAdventure(p),
    items: string[] = [];
  let reward: Reward,
    stars: number | undefined;
  if (meta.tower) {
    const { gear, ...rest } = towerReward(meta.tower);
    a.tower = Math.max(a.tower || 0, meta.tower);
    reward = rest;
    if (gear) {
      const g = addGear(p, GEAR_SLOTS[Math.floor(random() * 3) % 3], gear);
      items.push(`${RARITIES[g.rarity]} ${gearName(g)}`);
    }
  } else if (meta.stage) {
    const stage = stageById[meta.stage],
      first = !a.stages[stage.id];
    stars = stageStars(
      b.units.filter((u) => u.side === 0 && u.hp === 0).length,
    );
    reward = first
      ? stageFirstReward(stage.ci, !!stage.boss)
      : stageReplayReward(stage.ci);
    a.stages[stage.id] = Math.max(a.stages[stage.id] || 0, stars);
    if (first && stage.boss) {
      const roll = rollGear(random, stage.ci, stage.ci >= 3 ? 2 : 1);
      const g = addGear(p, roll.slot, roll.rarity);
      items.push(`${RARITIES[g.rarity]} ${gearName(g)}`);
    }
  } else {
    const tier = meta.tier ?? 0,
      id = meta.dungeon as DungeonId;
    a.runs[id] = (a.runs[id] || 0) + 1;
    a.best[id] = Math.max(a.best[id] ?? -1, tier);
    reward = dungeonReward(id, tier);
    if (id === "forge")
      for (let i = 0; i < (tier >= 3 ? 2 : 1); i++) {
        const roll = rollGear(random, tier);
        const g = addGear(p, roll.slot, roll.rarity);
        items.push(`${RARITIES[g.rarity]} ${gearName(g)}`);
      }
  }
  grantReward(p, reward);
  const text = rewardText({ ...reward, gold: 0, diamonds: 0, xp: 0, tokens: 0 });
  if (text) items.unshift(text);
  return { items, xp: reward.xp || 0, stars };
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
    if (meta?.stage || meta?.dungeon || meta?.tower) {
      let result: { items: string[]; xp: number; stars?: number } = {
        items: [],
        xp: 0,
      };
      if (b.winner === 0) {
        p.wins++;
        p.daily.wins++;
        track(p, "wins");
        result = finishMission(p, b, meta);
        if (meta.stage) {
          track(p, "stages");
          track(p, "stars", result.stars || 0);
        } else if (meta.dungeon) track(p, "dungeons");
      }
      b.rewards = {
        gold: p.gold - before.gold,
        diamonds: p.diamonds - before.diamonds,
        tokens: p.tokens - before.tokens,
        xp: result.xp,
        newSpecies: [],
        items: result.items,
        stars: result.stars,
      };
      db.prepare("INSERT INTO matches VALUES(?,?)").run(
        b.id,
        JSON.stringify({ winner: b.winner, kind: "mission", profileId }),
      );
      save(p);
      return;
    }
    if (meta?.region === "practice" && b.winner === 0) town.sparWon = utcDay();
    if (meta?.boss && meta.region !== "practice" && b.winner === 0)
      town.guardianWeek = utcWeek();
    if (meta?.region !== "practice" && b.winner === 0) {
      track(p, "wins");
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
