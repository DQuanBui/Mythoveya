import type { Profile } from "../../packages/shared/types";
import {
  HAVEN_HOUSES,
  HAVEN_CACHES,
  CACHE_COMPLETION_DIAMONDS,
} from "../../packages/shared/haven";
import { gainXp } from "../../packages/shared/economy";
import { track } from "../../packages/shared/events";
import { BUFFS, SHOPS, shopStock, type ShopId } from "../../packages/shared/shops";
import { addGear } from "./adventure-game";
import { RARITIES, gearName } from "../../packages/shared/adventure";
import { fishWeights, weatherAt, RAIN_GROWTH } from "../../packages/shared/weather";
import {
  NPCS,
  ITEMS,
  ensureTown,
  dailyStock,
  missionProgress,
  utcDay,
  utcWeek,
  GARDEN_GROW_MS,
  FISH,
  FISHING_CASTS_PER_DAY,
  ACCESSORIES,
  type ItemId,
  type TownReward,
} from "../../packages/shared/town";

function grant(p: Profile, reward: TownReward) {
  const t = p.town!;
  p.gold += reward.gold || 0;
  p.diamonds += reward.diamonds || 0;
  p.tokens += reward.tokens || 0;
  for (const item of ["sunseed", "treat"] as const)
    t.inventory[item] = (t.inventory[item] || 0) + (reward[item] || 0);
  if (reward.xp) gainXp(p, reward.xp);
}
export function townMutation(
  p: Profile,
  kind: string,
  v: any,
  now = Date.now(),
  random = Math.random,
) {
  const t = ensureTown(p, now),
    today = utcDay(now);
  const bump = (stat: string) => (t.stats[stat] = (t.stats[stat] || 0) + 1);
  const npc = () => {
    const n = NPCS.find((n) => n.id === v.npc);
    if (!n) throw Error("Unknown villager.");
    return n;
  };
  const item = () => {
    if (!Object.hasOwn(ITEMS, v.item)) throw Error("Unknown item.");
    return v.item as ItemId;
  };
  const companion = () => {
    const o = p.owned.find((o) => o.id === v.id);
    if (!o) throw Error("Choose an owned companion.");
    return o;
  };
  switch (kind) {
    case "town-visit": {
      const house = HAVEN_HOUSES.find((h) => h.id === v.id);
      if (!house || p.region !== "haven")
        throw Error("Visit a house in Havenreach.");
      if (t.stamps!.includes(house.id))
        throw Error("This visitor stamp is already collected.");
      t.stamps!.push(house.id);
      const complete = HAVEN_HOUSES.every((h) => t.stamps!.includes(h.id));
      grant(p, { gold: 15, xp: 10, diamonds: complete ? 50 : 0 });
      return {
        message: complete
          ? "All six stamps! Your visitor book earned 50 Diamonds."
          : `${house.name}: visitor stamp, 15 Gold and 10 keeper XP.`,
      };
    }
    case "town-shop": {
      if (!Object.hasOwn(SHOPS, v.quest)) throw Error("Unknown shop.");
      const shop = v.quest as ShopId,
        offer = shopStock(shop, now).find((o) => o.id === v.item);
      if (!offer) throw Error("That item is not in today's stock.");
      if (t.shopDay !== today) {
        t.shopDay = today;
        t.shopBought = {};
      }
      const key = `${shop}:${offer.id}`,
        bought = t.shopBought![key] || 0;
      if (bought >= offer.limit) throw Error("Sold out for today. New stock arrives at 00:00 UTC.");
      if (p.gold < offer.gold) throw Error("Not enough Gold.");
      for (const [item, n] of Object.entries(offer.needs || {}))
        if ((t.inventory[item] || 0) < n)
          throw Error(`Needs ${n} ${ITEMS[item as ItemId]?.name || item}.`);
      p.gold -= offer.gold;
      for (const [item, n] of Object.entries(offer.needs || {})) t.inventory[item] -= n;
      t.shopBought![key] = bought + 1;
      const g = offer.gives;
      if (g.item) t.inventory[g.item] = (t.inventory[g.item] || 0) + (g.count || 1);
      if (g.buff) {
        t.buffs ||= {};
        t.buffs[g.buff] = (t.buffs[g.buff] || 0) + 1;
      }
      let name = offer.name;
      if (g.gear) {
        const piece = addGear(p, g.gear.slot, g.gear.rarity);
        name = `${RARITIES[piece.rarity]} ${gearName(piece)}`;
      }
      return {
        message: g.buff
          ? `${name} ready: ${BUFFS[g.buff].text}.`
          : `Bought ${name}.`,
      };
    }
    case "town-cache": {
      const cache = HAVEN_CACHES.find((c) => c.id === v.id);
      if (!cache || p.region !== "haven")
        throw Error("Search for Skyglass caches in Havenreach.");
      if (t.caches!.includes(cache.id))
        throw Error("This cache is already open.");
      t.caches!.push(cache.id);
      track(p, "caches");
      const complete = HAVEN_CACHES.every((c) => t.caches!.includes(c.id));
      grant(p, {
        ...cache.reward,
        diamonds:
          (cache.reward.diamonds || 0) +
          (complete ? CACHE_COMPLETION_DIAMONDS : 0),
      });
      const found = Object.entries(cache.reward)
        .map(([k, n]) =>
          k === "sunseed"
            ? `${n} Sunseed`
            : k === "treat"
              ? `${n} treat${n === 1 ? "" : "s"}`
              : k === "tokens"
                ? `${n} bond token${n === 1 ? "" : "s"}`
                : k === "xp"
                  ? `${n} keeper XP`
                  : `${n} ${k[0].toUpperCase()}${k.slice(1)}`,
        )
        .join(", ");
      return {
        message: complete
          ? `Every Skyglass cache found! ${found}, plus ${CACHE_COMPLETION_DIAMONDS} bonus Diamonds.`
          : `${cache.name}: ${found}. (${t.caches!.length}/${HAVEN_CACHES.length})`,
      };
    }
    case "town-fish": {
      if (p.region !== "haven")
        throw Error("Fish from the Willowmere dock in Havenreach.");
      if (t.fishing?.date !== today)
        t.fishing = { date: today, casts: 0, caught: 0 };
      if (t.fishing.casts >= FISHING_CASTS_PER_DAY)
        throw Error("The fish are resting. Come back after 00:00 UTC.");
      t.fishing.casts++;
      if (!v.success)
        return { message: "The fish slipped away. Try again!", fish: null };
      // Rain brings rare fish closer to the surface.
      const weights = fishWeights(weatherAt(now).weather);
      let roll = random(),
        fish: (typeof FISH)[number] = "minnow";
      for (const id of FISH) {
        roll -= weights[id];
        if (roll < 0) {
          fish = id;
          break;
        }
      }
      t.fishing.caught++;
      track(p, "fish");
      t.inventory[fish] = (t.inventory[fish] || 0) + 1;
      bump("fish");
      return {
        message: `You caught a ${ITEMS[fish].name}!${weatherAt(now).weather === "rain" && fish === "skyfin" ? " The rain drew it up." : ""}`,
        fish,
      };
    }
    case "town-talk": {
      const n = npc();
      if (!t.met.includes(n.id)) t.met.push(n.id);
      return { message: `You met ${n.name}.` };
    }
    case "town-track": {
      const n = npc();
      t.trackedNpc = n.id;
      return { message: `Following ${n.name}'s story.` };
    }
    case "town-claim": {
      const n = npc(),
        m = n.missions.find((m) => m.id === v.quest);
      if (!m) throw Error("Unknown village mission.");
      if (t.claims.includes(m.id))
        throw Error("Mission reward already claimed.");
      const next = n.missions.find((m) => !t.claims.includes(m.id));
      if (next?.id !== m.id || missionProgress(p, m) < m.goal)
        throw Error("Complete the current mission first.");
      t.claims.push(m.id);
      grant(p, m.reward);
      const joined = n.missions.every((m) => t.claims.includes(m.id));
      if (joined && !t.helpers.includes(n.id)) t.helpers.push(n.id);
      return {
        message: joined
          ? `${n.name} joined your circle of helpers!`
          : `${m.title} completed.`,
        joined,
      };
    }
    case "town-helper": {
      const n = npc();
      if (!t.helpers.includes(n.id))
        throw Error("Complete this villager's mission line first.");
      if (t.helperDays[n.id] === today)
        throw Error("Today's helper gift is already collected.");
      t.helperDays[n.id] = today;
      grant(p, n.daily);
      return { message: `${n.name}'s daily help is ready.` };
    }
    case "town-buy": {
      const id = item(),
        offer = ITEMS[id];
      if (!dailyStock(now).includes(id))
        throw Error("That item is not in today's stock.");
      if ((t.stock.bought[id] || 0) >= offer.stock)
        throw Error("Today's stock is sold out.");
      if (p.gold < offer.buy) throw Error("Not enough Gold.");
      p.gold -= offer.buy;
      t.inventory[id] = (t.inventory[id] || 0) + 1;
      t.stock.bought[id] = (t.stock.bought[id] || 0) + 1;
      bump("bought");
      return { message: `Bought ${offer.name}.` };
    }
    case "town-sell": {
      const id = item();
      if (!ITEMS[id].sell) throw Error("This item cannot be sold.");
      if (!(t.inventory[id] > 0)) throw Error("No item available to sell.");
      t.inventory[id]--;
      p.gold += ITEMS[id].sell;
      bump("sold");
      return { message: `Sold ${ITEMS[id].name} for ${ITEMS[id].sell} Gold.` };
    }
    case "town-plant": {
      if (t.garden) throw Error("Harvest the current crop first.");
      if (!(t.inventory.sunseed > 0)) throw Error("You need one Sunseed.");
      t.inventory.sunseed--;
      const rain = weatherAt(now).weather === "rain",
        grow = Math.round(GARDEN_GROW_MS * (rain ? RAIN_GROWTH : 1));
      t.garden = { plantedAt: now, readyAt: now + grow };
      return {
        message: rain
          ? "Planted a Sunseed in the rain. It will be ready in about a minute."
          : "Planted a Sunseed. Your crop will be ready in two minutes.",
      };
    }
    case "town-harvest": {
      if (!t.garden) throw Error("Plant a seed first.");
      if (t.garden.readyAt > now) throw Error("This crop is still growing.");
      t.inventory.sunseed = (t.inventory.sunseed || 0) + 3;
      t.garden = null;
      bump("harvests");
      return { message: "Harvested 3 Sunseed." };
    }
    case "town-craft": {
      if (t.inventory.sunseed < 2 || p.gold < 10)
        throw Error("Crafting needs 2 Sunseed and 10 Gold.");
      t.inventory.sunseed -= 2;
      p.gold -= 10;
      t.inventory.treat = (t.inventory.treat || 0) + 1;
      bump("crafts");
      return { message: "Crafted a companion treat." };
    }
    case "town-feed": {
      const o = companion();
      if ((o.friendship || 0) >= 100)
        throw Error("This companion's friendship is already full.");
      if (!(t.inventory.treat > 0))
        throw Error("Craft or buy a companion treat first.");
      t.inventory.treat--;
      o.friendship = Math.min(100, (o.friendship || 0) + 10);
      o.xp += 30;
      gainXp(p, 0);
      return {
        message: "A happy little moment. +10 friendship and +30 creature XP.",
      };
    }
    case "town-rename": {
      const o = companion(),
        name = String(v.nickname ?? "").trim();
      if (name.length > 20 || (name && !/^[\p{L}\p{N} _'-]+$/u.test(name)))
        throw Error(
          "Use up to 20 letters, numbers, spaces, apostrophes or hyphens.",
        );
      if (name) o.nickname = name;
      else delete o.nickname;
      return {
        message: name
          ? `Your companion is now called ${name}.`
          : "The species name is restored.",
      };
    }
    case "town-equip": {
      const o = companion(),
        accessory = v.item;
      if (accessory !== "none" && !ACCESSORIES.includes(accessory))
        throw Error("Choose a companion accessory.");
      if (o.accessory === accessory || (!o.accessory && accessory === "none"))
        return { message: "Already wearing that look." };
      if (accessory !== "none" && !(t.inventory[accessory] > 0))
        throw Error("You do not own this accessory.");
      if (o.accessory)
        t.inventory[o.accessory] = (t.inventory[o.accessory] || 0) + 1;
      if (accessory === "none") delete o.accessory;
      else {
        t.inventory[accessory]--;
        o.accessory = accessory;
      }
      return { message: "Companion accessory updated." };
    }
    case "town-spar": {
      if (t.sparWon !== today)
        throw Error("Win a practice battle today first.");
      if (t.sparClaimed === today)
        throw Error("Today's sparring reward is already claimed.");
      t.sparClaimed = today;
      grant(p, { gold: 40, diamonds: 10 });
      return { message: "Daily sparring: +40 Gold and +10 Diamonds." };
    }
    case "town-weekly": {
      const week = utcWeek(now);
      if (t.guardianWeek !== week)
        throw Error("Defeat a region guardian this week first.");
      if (t.guardianClaimed === week)
        throw Error("This week's bounty is already claimed.");
      t.guardianClaimed = week;
      grant(p, { gold: 70, diamonds: 120 });
      return { message: "Weekly guardian bounty: +70 Gold and +120 Diamonds." };
    }
    default:
      throw Error("Unknown village request.");
  }
}
