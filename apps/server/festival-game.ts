import type { Profile } from "../../packages/shared/types";
import { ensureTown } from "../../packages/shared/town";
import {
  FESTIVAL_SHOP,
  GREETING_TICKETS,
  HUNT_BONUS,
  HUNT_DAILY,
  HUNT_TICKETS,
  festivalOf,
  huntSpots,
} from "../../packages/shared/festival";
import { defaultHome } from "../../packages/shared/islands";
import {
  ACTIVITIES,
  COURSE,
  MAX_PRESSES,
  RACE,
  TICKET_PLAYS,
  courseObstacles,
  featuredActivity,
  formatScore,
  raceBonus,
  racePads,
  runTickets,
  simulateCourse,
  simulateRace,
  FISHING,
  fishingBites,
  simulateFishing,
  type Activity,
} from "../../packages/shared/festival-games";
import { fishWeights, weatherAt } from "../../packages/shared/weather";
import { recordRun, topRuns } from "./store";

/** Games played on the festival island. */
const PLAYABLE: Activity[] = ["race", "course", "fishing"];
function inputsOf(v: any, max: number) {
  const list = v.inputs;
  if (!Array.isArray(list) || list.length > MAX_PRESSES) throw Error("That run could not be read.");
  for (const n of list)
    if (!Number.isInteger(n) || Math.abs(n) > max || n === 0) throw Error("That run could not be read.");
  return list as number[];
}

export const FESTIVAL_KINDS = ["fest-greet", "fest-hunt", "fest-buy", "fest-outfit", "fest-start", "fest-run"];
export function festivalMutation(p: Profile, kind: string, v: any, now = Date.now()) {
  if (!p.owned.length) throw Error("Choose your first companion.");
  const f = festivalOf(p, now);
  switch (kind) {
    case "fest-greet": {
      if (p.island !== "festival") throw Error("Visit Lanternfair Isle first.");
      if (f.greeted) throw Error("You already collected today's welcome tickets.");
      f.greeted = true;
      f.tickets += GREETING_TICKETS;
      return { message: `Welcome to the fair! +${GREETING_TICKETS} tickets.`, tickets: GREETING_TICKETS };
    }
    case "fest-hunt": {
      if (p.island !== "festival") throw Error("The lanterns are hidden on Lanternfair Isle.");
      const spot = huntSpots(f.day).find((s) => s.id === v.id);
      if (!spot) throw Error("No lantern is hidden there today.");
      if (f.hunt.includes(spot.id)) throw Error("You already found this lantern today.");
      f.hunt.push(spot.id);
      let tickets = HUNT_TICKETS;
      if (f.hunt.length === HUNT_DAILY) tickets += HUNT_BONUS;
      f.tickets += tickets;
      return {
        message:
          f.hunt.length === HUNT_DAILY
            ? `All ${HUNT_DAILY} lanterns found! +${tickets} tickets.`
            : `Lantern ${f.hunt.length} of ${HUNT_DAILY} found. +${tickets} tickets.`,
        tickets,
      };
    }
    case "fest-buy": {
      const entry = FESTIVAL_SHOP.find((s) => s.id === v.item);
      if (!entry) throw Error("That is not sold at the ticket booth.");
      if (entry.kind === "outfit" && f.outfits.includes(entry.id)) throw Error("You already own this outfit.");
      if (entry.weekly && (f.bought[entry.id] || 0) >= entry.weekly)
        throw Error("Sold out for this week. New stock arrives on Monday (UTC).");
      if (f.tickets < entry.tickets) throw Error("Not enough festival tickets.");
      f.tickets -= entry.tickets;
      if (entry.weekly) f.bought[entry.id] = (f.bought[entry.id] || 0) + 1;
      if (entry.kind === "outfit") f.outfits.push(entry.id);
      else if (entry.kind === "decor") {
        const home = (p.home ||= defaultHome());
        home.stash ||= {};
        home.stash[entry.id] = (home.stash[entry.id] || 0) + 1;
      } else {
        const t = ensureTown(p, now),
          item = entry.gives?.item || entry.id,
          count = entry.gives?.count || 1;
        t.inventory[item] = (t.inventory[item] || 0) + count;
      }
      return {
        message:
          entry.kind === "decor"
            ? `${entry.name} is waiting in your house ledger on Hearthfall Isle.`
            : entry.kind === "outfit"
              ? `${entry.name} added to your wardrobe.`
              : entry.kind === "accessory"
                ? `${entry.name} added. Equip it from a companion's journal page.`
                : `${entry.name} added to your bag.`,
      };
    }
    case "fest-start": {
      if (p.island !== "festival") throw Error("Festival games are played on Lanternfair Isle.");
      if (!PLAYABLE.includes(v.quest)) throw Error("Choose a festival game.");
      f.started = { activity: v.quest, at: now };
      return {};
    }
    case "fest-run": {
      const activity = v.quest as Activity;
      if (!PLAYABLE.includes(activity)) throw Error("Choose a festival game.");
      if (f.started?.activity !== activity) throw Error("Start the game at its gate first.");
      let score: number,
        minTime: number,
        detail: { time?: number; misses?: number; score?: number; caught?: string[] },
        data: Record<string, unknown>;
      const keeper = { avatar: p.avatar, outfit: f.outfit };
      if (activity === "race") {
        const o = p.owned.find((o) => o.id === v.id);
        if (!o) throw Error("Choose a companion to race.");
        const inputs = inputsOf(v, RACE.maxMs),
          bonus = raceBonus(o),
          result = simulateRace(inputs, racePads(f.day), bonus);
        score = minTime = result.time;
        detail = result;
        data = { inputs, bonus, species: o.species, ...keeper };
      } else if (activity === "fishing") {
        const inputs = inputsOf(v, FISHING.round),
          weather = weatherAt(f.started.at).weather,
          result = simulateFishing(inputs, fishingBites(f.day, fishWeights(weather)));
        score = result.score;
        minTime = FISHING.round;
        detail = result;
        data = { inputs, weather, ...keeper };
      } else {
        const inputs = inputsOf(v, COURSE.maxMs),
          result = simulateCourse(inputs, courseObstacles(f.day));
        score = minTime = result.time;
        detail = result;
        data = { inputs, ...keeper };
      }
      // A run can't be scored faster than the time that has passed since its start.
      if (now - f.started.at < minTime - 2000) throw Error("That run finished faster than the clock allows.");
      delete f.started;
      let tickets = 0;
      if ((f.plays[activity] || 0) < TICKET_PLAYS) {
        f.plays[activity] = (f.plays[activity] || 0) + 1;
        tickets = runTickets(activity, detail) * (featuredActivity(f.day) === activity ? 2 : 1);
        f.tickets += tickets;
        // Tournament catches go in your bag, a few per round, to sell or brew.
        if (detail.caught) {
          const t = ensureTown(p, now);
          for (const fish of detail.caught.slice(0, FISHING.maxCatch))
            t.inventory[fish] = (t.inventory[fish] || 0) + 1;
        }
      }
      const lower = ACTIVITIES[activity].lowerIsBetter,
        best = f.best[activity],
        personal = best === undefined || (lower ? score < best : score > best);
      if (personal) f.best[activity] = score;
      recordRun(f.day, activity, p, score, lower, data);
      const rank = topRuns(f.day, activity, lower, 50).findIndex((r) => r.profile === p.id) + 1;
      return {
        message: `${ACTIVITIES[activity].name}: ${formatScore(activity, score)}${personal ? " · personal best!" : ""}${tickets ? ` · +${tickets} tickets` : ""}`,
        score,
        tickets,
        personal,
        rank,
        ...detail,
      };
    }
    case "fest-outfit": {
      if (v.item === "none") delete f.outfit;
      else if (f.outfits.includes(v.item)) f.outfit = v.item;
      else throw Error("Buy this outfit at the ticket booth first.");
      return { message: v.item === "none" ? "Outfit put away." : "Looking festive!" };
    }
  }
  throw Error("Unknown festival action.");
}
