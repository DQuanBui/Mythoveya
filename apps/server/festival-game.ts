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

export const FESTIVAL_KINDS = ["fest-greet", "fest-hunt", "fest-buy", "fest-outfit"];
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
    case "fest-outfit": {
      if (v.item === "none") delete f.outfit;
      else if (f.outfits.includes(v.item)) f.outfit = v.item;
      else throw Error("Buy this outfit at the ticket booth first.");
      return { message: v.item === "none" ? "Outfit put away." : "Looking festive!" };
    }
  }
  throw Error("Unknown festival action.");
}
