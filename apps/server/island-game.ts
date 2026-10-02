import type { Profile } from "../../packages/shared/types";
import { utcDay } from "../../packages/shared/town";
import {
  HABITAT_CAPACITY,
  HOME_EXPANSIONS,
  HOUSE_LEVELS,
  OPEN_ISLANDS,
  catalogEntry,
  defaultHome,
  habitatStored,
  islandUnlocked,
  placementError,
  unlockHint,
  type HomeState,
  type IslandId,
} from "../../packages/shared/islands";

export const ensureHome = (p: Profile) => (p.home ||= defaultHome());
const snap = (n: unknown) => {
  if (typeof n !== "number" || !Number.isFinite(n)) throw Error("Choose a spot on your island.");
  return Math.round(n * 2) / 2;
};
/** Pays out what a habitat has stored and restarts its timer. */
function empty(p: Profile, home: HomeState, uid: string, now: number) {
  const item = home.items.find((i) => i.uid === uid);
  const gold = item ? habitatStored(p, home, item, now) : 0;
  p.gold += gold;
  home.collected[uid] = now;
  return gold;
}
function release(p: Profile, home: HomeState, id: string, now: number) {
  for (const [uid, ids] of Object.entries(home.residents))
    if (ids.includes(id)) {
      empty(p, home, uid, now);
      home.residents[uid] = ids.filter((x) => x !== id);
    }
}

export function islandMutation(p: Profile, kind: string, v: any, now = Date.now()) {
  if (kind === "island-travel") {
    if (v.region === "haven") {
      delete p.island;
      p.region = "haven";
      return { message: "The Skyferry sets you down on Havenreach." };
    }
    const id = v.region as IslandId;
    if (!OPEN_ISLANDS.includes(id)) throw Error("The Skyferry does not sail there.");
    if (!islandUnlocked(p, id)) throw Error(unlockHint(id));
    p.island = id;
    if (id === "home") ensureHome(p);
    return {};
  }
  if (!p.owned.length) throw Error("Choose your first companion.");
  const home = ensureHome(p);
  const owned = (uid: unknown) => {
    const item = home.items.find((i) => i.uid === uid);
    if (!item) throw Error("That piece is no longer on your island.");
    return item;
  };
  switch (kind) {
    case "home-place": {
      const entry = catalogEntry(String(v.item));
      if (!entry) throw Error("Choose something from the builder's catalog.");
      if (entry.tickets && !((home.stash?.[entry.kind] || 0) > 0))
        throw Error("Win this piece with festival tickets at Lanternfair first.");
      const house = HOUSE_LEVELS[home.house];
      if (home.house < entry.house)
        throw Error(`Upgrade your house to the ${HOUSE_LEVELS[entry.house].name} first.`);
      const count = home.items.filter((i) => catalogEntry(i.kind)?.type === entry.type).length;
      if (entry.type === "habitat" && count >= house.habitats)
        throw Error("Your house supports no more habitats yet. Upgrade it for more.");
      if (entry.type === "decor" && count >= house.decor)
        throw Error("You have placed all the decorations your house allows. Upgrade it for more.");
      if (p.gold < entry.gold) throw Error("Not enough Gold.");
      const x = snap(v.x),
        z = snap(v.z),
        rot = v.rot ?? 0,
        problem = placementError(home, entry, x, z, rot);
      if (problem) throw Error(problem);
      p.gold -= entry.gold;
      if (entry.tickets) home.stash![entry.kind]--;
      const uid = `h${++home.seq}`;
      home.items.push({ uid, kind: entry.kind, x, z, rot });
      if (entry.type === "habitat") {
        home.residents[uid] = [];
        home.collected[uid] = now;
      }
      return { message: `${entry.name} placed.`, uid };
    }
    case "home-move": {
      const item = owned(v.id),
        entry = catalogEntry(item.kind)!;
      const x = snap(v.x),
        z = snap(v.z),
        rot = v.rot ?? item.rot,
        problem = placementError(home, entry, x, z, rot, item.uid);
      if (problem) throw Error(problem);
      Object.assign(item, { x, z, rot });
      return { message: `${entry.name} moved.` };
    }
    case "home-remove": {
      const item = owned(v.id),
        entry = catalogEntry(item.kind)!;
      let gold = 0;
      if (entry.type === "habitat") {
        gold += empty(p, home, item.uid, now);
        delete home.residents[item.uid];
        delete home.collected[item.uid];
      }
      const refund = Math.floor(entry.gold / 2);
      p.gold += refund;
      home.items = home.items.filter((i) => i !== item);
      if (entry.tickets) {
        home.stash ||= {};
        home.stash[entry.kind] = (home.stash[entry.kind] || 0) + 1;
        return { message: `${entry.name} packed away. You can place it again any time.` };
      }
      return {
        message: `${entry.name} packed away. ${refund + gold} Gold returned${gold ? " with its stored income" : ""}.`,
      };
    }
    case "home-expand": {
      const next = HOME_EXPANSIONS[home.expansion + 1];
      if (!next) throw Error("Your island has reached its full size.");
      if (p.level < next.level) throw Error(`Reach keeper level ${next.level} to expand again.`);
      if (p.gold < next.gold || p.diamonds < next.diamonds) throw Error("Not enough Gold or Diamonds.");
      p.gold -= next.gold;
      p.diamonds -= next.diamonds;
      home.expansion++;
      return { message: `New land rises from the clouds. Your island now reaches ${next.radius} m.` };
    }
    case "home-house": {
      const next = HOUSE_LEVELS[home.house + 1];
      if (!next) throw Error("Your house is already a manor.");
      if (p.level < next.level) throw Error(`Reach keeper level ${next.level} to build the ${next.name}.`);
      if (p.gold < next.gold) throw Error("Not enough Gold.");
      p.gold -= next.gold;
      home.house++;
      return {
        message: `Your ${next.name} is finished: room for ${next.habitats} habitats and ${next.decor} decorations.`,
      };
    }
    case "home-assign": {
      const item = owned(v.quest),
        entry = catalogEntry(item.kind)!;
      if (entry.type !== "habitat") throw Error("Companions can only live in habitats.");
      const o = p.owned.find((o) => o.id === v.id);
      if (!o) throw Error("Choose an owned companion.");
      const list = (home.residents[item.uid] ||= []);
      if (list.includes(o.id)) throw Error("That companion already lives here.");
      if (list.length >= HABITAT_CAPACITY) throw Error(`A habitat holds ${HABITAT_CAPACITY} companions.`);
      release(p, home, o.id, now);
      empty(p, home, item.uid, now);
      home.residents[item.uid].push(o.id);
      return { message: `${o.nickname || o.species} moved into the ${entry.name}.` };
    }
    case "home-unassign": {
      if (!Object.values(home.residents).some((ids) => ids.includes(v.id)))
        throw Error("That companion does not live in a habitat.");
      release(p, home, v.id, now);
      return { message: "Your companion moved back in with the team." };
    }
    case "home-collect": {
      let gold = 0;
      for (const item of home.items)
        if (catalogEntry(item.kind)?.type === "habitat") gold += empty(p, home, item.uid, now);
      if (!gold) throw Error("Your habitats have nothing stored yet. Companions earn Gold while they live there.");
      return { message: `Collected ${gold} Gold from your habitats.`, gold };
    }
    case "home-pet": {
      const lives = Object.values(home.residents).some((ids) => ids.includes(v.id));
      const o = p.owned.find((o) => o.id === v.id);
      if (!o || !lives) throw Error("Only companions living on your island can be greeted here.");
      const today = utcDay(now);
      if (home.petted?.day !== today) home.petted = { day: today, ids: [] };
      if (home.petted.ids.includes(o.id)) return { message: "They are still glowing from your last visit." };
      home.petted.ids.push(o.id);
      o.friendship = Math.min(100, (o.friendship || 0) + 2);
      return { message: "A happy greeting. +2 friendship.", friendship: o.friendship };
    }
  }
  throw Error("Unknown island action.");
}
export const ISLAND_KINDS = [
  "island-travel",
  "home-place",
  "home-move",
  "home-remove",
  "home-expand",
  "home-house",
  "home-assign",
  "home-unassign",
  "home-collect",
  "home-pet",
];
