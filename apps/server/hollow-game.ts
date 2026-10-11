import type { Profile } from "../../packages/shared/types";
import { byId } from "../../packages/shared/content";
import {
  HOLLOW_GATHER,
  HOLLOW_LANTERNS,
  HOLLOW_NOTES,
  HOLLOW_MATERIALS,
  LANTERN_RECIPE,
  emptyHollow,
  canCraftLantern,
  type HollowMaterial,
} from "../../packages/shared/hollow";
import { own, gainXp } from "../../packages/shared/economy";

export function hollowMutation(
  p: Profile,
  kind: string,
  v: { id?: string; quest?: string },
  random = Math.random,
) {
  if (p.region !== "hollow" || p.island)
    throw Error("Travel to Moonfrost Hollow first.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const h = (p.hollow ||= emptyHollow());
  if (kind === "hol-start") {
    if (h.started) throw Error("The lantern journey has already begun.");
    h.started = true;
    return {
      message:
        "The Lantern Road: gather materials, craft three lanterns at Mira's workshop, and light the trail.",
    };
  }
  if (!h.started) throw Error("Meet Mira at the lantern workshop first.");
  if (kind === "hol-gather") {
    const n = HOLLOW_GATHER.find((n) => n.id === v.quest);
    if (!n) throw Error("Choose a Moonfrost gathering site.");
    if (h.gathered.includes(n.id))
      throw Error("This site's materials are already in your satchel.");
    const o = p.owned.find(
      (o) => o.id === v.id && byId[o.species]?.element === n.element,
    );
    if (!o) throw Error(`Choose an owned ${n.element} companion.`);
    h.gathered.push(n.id);
    h.materials[n.material] += n.amount;
    o.friendship = Math.min(100, (o.friendship || 0) + 5);
    return {
      message: `Gathered ${n.amount} ${HOLLOW_MATERIALS[n.material]}. Your companion gains up to 5 friendship.`,
    };
  }
  if (kind === "hol-craft") {
    if (h.lanterns + h.installed.length >= 3)
      throw Error("All three lanterns have already been crafted.");
    if (!canCraftLantern(h))
      throw Error(
        "Each lantern needs 2 Frostglass, 1 Moonreed and 1 Warmstone.",
      );
    for (const k of Object.keys(LANTERN_RECIPE) as HollowMaterial[])
      h.materials[k] -= LANTERN_RECIPE[k];
    h.lanterns++;
    return {
      message: "A trail lantern is ready. Carry it to an unlit trail post.",
    };
  }
  if (kind === "hol-install") {
    const n = HOLLOW_LANTERNS.find((n) => n.id === v.id);
    if (!n) throw Error("Choose a lantern post.");
    if (h.installed.includes(n.id))
      throw Error("This trail lantern is already lit.");
    if (h.lanterns < 1)
      throw Error("Craft a lantern at Mira's workshop first.");
    h.lanterns--;
    h.installed.push(n.id);
    p.gold += 25;
    return { message: `${n.name} is lit. +25 gold.` };
  }
  if (kind === "hol-finish") {
    if (HOLLOW_LANTERNS.some((n) => !h.installed.includes(n.id)))
      throw Error("Light all three trail lanterns first.");
    if (h.finished) throw Error("The Lantern Road is already restored.");
    h.finished = true;
    p.gold += 200;
    p.diamonds += 70;
    gainXp(p, 120);
    const companion = own(p, "rimeowl", random);
    return {
      message:
        "The Lantern Road shines again! Rimeowl joins you. +200 gold, +70 diamonds, +120 XP and the Lantern Keeper badge.",
      companion,
    };
  }
  if (kind === "hol-note") {
    const n = HOLLOW_NOTES.find((n) => n.id === v.id);
    if (!n) throw Error("Choose a Moonfrost field note.");
    if (h.notes.includes(n.id))
      throw Error("This field note is already recorded.");
    h.notes.push(n.id);
    p.gold += 20;
    return { message: `${n.name} recorded. +20 gold.` };
  }
  throw Error("Unknown Moonfrost action.");
}
