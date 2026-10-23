import type { Profile } from "../../packages/shared/types";
import { byId } from "../../packages/shared/content";
import { gainXp, own } from "../../packages/shared/economy";
import { LODGES, lodgeCount, lodgeOf } from "../../packages/shared/lodges";
import { fieldAbility } from "../../packages/shared/rescue";
import { conservancyOf, MATERIALS, type Material } from "../../packages/shared/conservancy";
import { LODGE_WORKSHOPS } from "../../packages/shared/lodge-workshops";
export function lodgeMutation(
  p: Profile,
  kind: string,
  v: {
    id?: string;
    inputs?: number[];
    companion?: string;
    quest?: string;
    species?: string;
  },
  random = Math.random,
) {
  const lodge = LODGES.find((s) => s.id === v.id && s.region === p.region);
  if (!lodge || p.island || !p.owned.length)
    throw Error("Visit this lodge in its mainland region with a companion.");
  const state = structuredClone(lodgeOf(p)),
    r = state.rooms[lodge.region] || { met: false };
  if (kind === "lodge-workshop" || kind === "lodge-decorate") {
    if (!r.keepsake) throw Error("Host this lodge's gathering first.");
    let message: string;
    if (kind === "lodge-workshop") {
      const recipe = LODGE_WORKSHOPS[lodge.region];
      if (r.workshop) throw Error("This workshop display is already built.");
      const supplies = structuredClone(conservancyOf(p));
      const costs = Object.entries(recipe.cost) as [Material, number][];
      const missing = costs.filter(([material, amount]) => supplies.materials[material] < amount);
      if (missing.length)
        throw Error("Gather more supplies: " + missing.map(([m]) => MATERIALS[m]).join(", ") + ".");
      costs.forEach(([material, amount]) => { supplies.materials[material] -= amount; });
      r.workshop = true;
      p.conservancy = supplies;
      message = recipe.name + " built. The host's three stories are now available.";
    } else {
      if (v.quest !== "lantern" && v.quest !== "banner")
        throw Error("Choose a lantern or a woven banner.");
      if (r.keepsake === v.quest) throw Error("This decoration is already displayed.");
      r.keepsake = v.quest;
      message = "Decoration changed. Your gathering and workshop are preserved.";
    }
    state.rooms[lodge.region] = r;
    p.lodges = state;
    return { message };
  }
  if (kind === "lodge-claim") {
    const required =
      v.species === "lumeswallow" ? 2 : v.species === "velvetmoth" ? 4 : 0;
    if (!required) throw Error("Unknown lodge companion.");
    if (lodgeCount(p) < required)
      throw Error(`Host ${required} gatherings first.`);
    if (state.claims.includes(v.species!))
      throw Error("This companion has already been welcomed.");
    const companion = own(p, v.species!, random);
    state.claims.push(v.species!);
    p.lodges = state;
    return {
      companion,
      message:
        byId[v.species!].name + " joins you (or grants a duplicate shard).",
    };
  }
  let message = "";
  if (kind === "lodge-meet") {
    if (r.met) throw Error("You have already met this host.");
    r.met = true;
    message = lodge.story;
  } else {
    if (!r.met) throw Error("Meet the host first.");
    if (r.keepsake) throw Error("This gathering is already complete.");
    if (kind === "lodge-cook") {
      if (r.meal) throw Error("Supper is already prepared.");
      if (v.inputs?.length !== 1 || v.inputs[0] !== lodge.answer)
        throw Error(
          "Those ingredients do not match the recipe. Nothing was spent.",
        );
      r.meal = lodge.recipe;
      message = lodge.recipe + " is ready. The host provided the ingredients.";
    } else if (kind === "lodge-help") {
      if (r.helper) throw Error("The companion task is already complete.");
      const o = p.owned.find(
        (o) => o.id === v.companion && p.team.includes(o.id),
      );
      if (!o || fieldAbility(byId[o.species].element) !== lodge.ability)
        throw Error(
          "Choose an active companion with the requested field ability.",
        );
      r.helper = { id: o.id, species: o.species };
      o.friendship = Math.min(100, (o.friendship || 0) + 3);
      message =
        byId[o.species].name + " helped the host and gained 3 friendship.";
    } else if (kind === "lodge-finish") {
      if (!r.meal || !r.helper)
        throw Error("Prepare supper and help the host before gathering.");
      if (v.quest !== "lantern" && v.quest !== "banner")
        throw Error("Choose a lantern or a woven banner.");
      r.keepsake = v.quest;
      p.gold += 50;
      p.diamonds += 15;
      gainXp(p, 20);
      message =
        lodge.ending +
        " +50 Gold, 15 Diamonds and 20 XP. Your decoration is saved.";
    } else throw Error("Unknown lodge action.");
  }
  state.rooms[lodge.region] = r;
  p.lodges = state;
  return { message };
}
