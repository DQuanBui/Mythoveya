import type { Profile } from "../../packages/shared/types";
import {
  OUTPOSTS,
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
  throw Error("Unknown Conservancy action.");
}
