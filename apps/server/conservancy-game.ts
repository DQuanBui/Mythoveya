import { own, gainXp } from "../../packages/shared/economy";
import type { Profile } from "../../packages/shared/types";
import {
  OUTPOSTS,
  outpostComplete,
  RECIPES,
  type Material,
  SUPPLY_NODES,
  conservancyOf,
} from "../../packages/shared/conservancy";
export function conservancyMutation(
  p: Profile,
  kind: string,
  v: { id?: string; item?: string; quest?: string },
  now = Date.now(),
  random = Math.random,
) {
  const h = OUTPOSTS.find((h) => h.region === p.region);
  if (!h || p.island) throw Error("Visit a mainland Conservancy outpost.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const r = conservancyOf(p, now);
  if (kind === "cons-gather") {
    const n = SUPPLY_NODES.find((n) => n.id === v.id && n.region === p.region);
    if (!n) throw Error("Choose a supply site in this region.");
    if (v.quest !== r.day)
      throw Error("The supply day changed. Reopen the Conservancy journal.");
    if (r.gathered.includes(n.id))
      throw Error("This supply site replenishes at 00:00 UTC.");
    if (r.materials[n.material] + n.amount > 999)
      throw Error("Use some materials before gathering more.");
    r.materials[n.material] += n.amount;
    r.gathered.push(n.id);
    p.conservancy = r;
    return {
      message: `Gathered ${n.amount} ${n.material}. Living habitats remain untouched.`,
    };
  }
  if (kind === "cons-craft" || kind === "cons-dismantle") {
    const recipe = RECIPES.find((k) => k.id === v.item);
    if (!recipe) throw Error("Choose a known habitat blueprint.");
    const costs = Object.entries(recipe.cost) as [Material, number][];
    if (kind === "cons-craft") {
      if (r.kits[recipe.id] >= 99)
        throw Error("Install or dismantle a kit first.");
      if (costs.some(([m, n]) => r.materials[m] < n))
        throw Error("Gather the missing materials first.");
      costs.forEach(([m, n]) => (r.materials[m] -= n));
      r.kits[recipe.id]++;
    } else {
      if (r.kits[recipe.id] < 1)
        throw Error("There is no spare kit to dismantle.");
      if (costs.some(([m, n]) => r.materials[m] + n > 999))
        throw Error("Use some materials before dismantling.");
      r.kits[recipe.id]--;
      costs.forEach(([m, n]) => (r.materials[m] += n));
    }
    p.conservancy = r;
    return {
      message:
        kind === "cons-craft"
          ? `${recipe.name} crafted.`
          : `${recipe.name} dismantled. All materials returned.`,
    };
  }
  if (kind === "cons-install") {
    if (v.id !== h.id) throw Error("Visit the outpost in this region.");
    const recipe = RECIPES.find((k) => k.id === v.item);
    if (!recipe) throw Error("Choose a known habitat blueprint.");
    if (r.installed[h.region]?.includes(recipe.id))
      throw Error("This habitat piece is already installed.");
    if (r.kits[recipe.id] < 1) throw Error("Craft this kit first.");
    r.kits[recipe.id]--;
    (r.installed[h.region] ||= []).push(recipe.id);
    const complete = outpostComplete(r, h.region);
    if (complete) {
      p.gold += 80;
      gainXp(p, 40);
    }
    p.conservancy = r;
    return {
      message: complete
        ? `${h.host}'s refuge is restored! +80 Gold and +40 XP. Wildlife can settle here.`
        : `${recipe.name} installed. The habitat is taking shape.`,
    };
  }
  if (kind === "cons-tend") {
    if (v.id !== h.id || !outpostComplete(r, h.region))
      throw Error("Restore this outpost before tending it.");
    if (v.quest !== r.day)
      throw Error("The supply day changed. Reopen the Conservancy journal.");
    if (r.tended.includes(h.region))
      throw Error("This outpost has already been tended today.");
    if (r.kits.planter < 1)
      throw Error("Craft a spare Planter kit for today's habitat care.");
    r.kits.planter--;
    r.tended.push(h.region);
    p.conservancy = r;
    p.gold += 25;
    gainXp(p, 15);
    return {
      message: "Fresh bedding and seedlings delivered. +25 Gold and +15 XP.",
    };
  }
  if (kind === "cons-claim") {
    if (h.region !== "haven")
      throw Error("Return to Juniper in Havenreach for your award.");
    const required = v.id === "mossloom" ? 2 : v.id === "astralynx" ? 4 : 0;
    if (!required) throw Error("Choose a Conservancy award.");
    if (OUTPOSTS.filter((h) => outpostComplete(r, h.region)).length < required)
      throw Error(`Restore ${required} outposts first.`);
    if (r.claims.includes(v.id!))
      throw Error("This Conservancy award is already claimed.");
    const companion = own(p, v.id!, random);
    r.claims.push(v.id!);
    p.conservancy = r;
    const diamonds = required === 2 ? 80 : 150;
    p.diamonds += diamonds;
    gainXp(p, 50);
    return {
      message: `Conservancy award: ${required === 2 ? "Mossloom" : "Astralynx"} (or a duplicate shard), ${diamonds} Diamonds and 50 XP.`,
      companion,
    };
  }
  throw Error("Unknown Conservancy action.");
}
