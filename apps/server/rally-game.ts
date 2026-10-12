import type { Profile } from "../../packages/shared/types";
import { byId } from "../../packages/shared/content";
import { own, gainXp } from "../../packages/shared/economy";
import {
  rallyHost,
  rallyOf,
  rallyActivity,
  RALLY_HOSTS,
} from "../../packages/shared/rally";
export function rallyMutation(
  p: Profile,
  kind: string,
  v: { id?: string; quest?: string; item?: string; inputs?: number[] },
  now = Date.now(),
  random = Math.random,
) {
  const host = rallyHost(p.region);
  if (!host || p.island) throw Error("Visit a regional wayfarer stop first.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const r = rallyOf(p, now),
    event = rallyActivity(p.region, now);
  if (kind !== "rally-complete") throw Error("Unknown rally action.");
  if (v.quest !== event.day || v.item !== event.kind)
    throw Error(
      "The daily activity changed. Reopen the rally journal for today's activity.",
    );
  if (r.completed.includes(p.region))
    throw Error("This region's rally activity is already complete today.");
  if (event.kind === "care") {
    const o = p.owned.find(
      (o) => o.id === v.id && byId[o.species].element === host.element,
    );
    if (!o) throw Error(`Choose an owned ${host.element} companion.`);
    o.friendship = Math.min(100, (o.friendship || 0) + 5);
  } else {
    const answer = event.kind === "survey" ? [host.answer] : event.signal;
    if (
      !Array.isArray(v.inputs) ||
      v.inputs.length !== answer.length ||
      !answer.every((n, i) => n === v.inputs![i])
    )
      throw Error("Try again using the host's clue. Nothing is spent.");
  }
  r.completed.push(p.region);
  p.gold += 40;
  p.diamonds += 10;
  gainXp(p, 25);
  let companion;
  if (!r.stamps.includes(p.region)) {
    r.stamps.push(p.region);
    companion = own(p, host.species, random);
  }
  p.rally = r;
  return {
    message: `${host.host} thanks you! +40 Gold, +10 Diamonds and +25 XP.${companion ? " First visit: passport stamp and " + byId[host.species].name + " (or a duplicate shard)." : " Come back after the next UTC reset."}`,
    companion,
  };
}
