import { gainXp, own } from "../../packages/shared/economy";
import type { Profile } from "../../packages/shared/types";
import { byId } from "../../packages/shared/content";
import {
  RESCUES,
  rescueOf,
  rescueCount,
  fieldAbility,
} from "../../packages/shared/rescue";
export function rescueMutation(
  p: Profile,
  kind: string,
  v: {
    id?: string;
    companion?: string;
    inputs?: number[];
    quest?: string;
    species?: string;
  },
  random = Math.random,
) {
  const site = RESCUES.find((s) => s.id === v.id && s.region === p.region);
  if (!site || p.island)
    throw Error("Visit the rescue site in this mainland region.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const state = structuredClone(rescueOf(p));
  const record = state.sites[site.region] || { surveyed: false, helpers: [] };
  if (kind === "rescue-survey") {
    if (record.surveyed) throw Error("This site is already surveyed.");
    record.surveyed = true;
    state.sites[site.region] = record;
    p.rescue = state;
    return { message: site.observation };
  }
  if (kind === "rescue-claim") {
    const needed =
      v.species === "reedrake" ? 2 : v.species === "solmole" ? 4 : 0;
    if (!needed) throw Error("Unknown rescue companion.");
    if (rescueCount(p) < needed)
      throw Error(`Complete ${needed} rescues first.`);
    if (state.claims.includes(v.species!))
      throw Error("This rescue companion has already been welcomed.");
    const companion = own(p, v.species!, random);
    state.claims.push(v.species!);
    p.rescue = state;
    return {
      companion,
      message:
        byId[v.species!].name +
        " joins your journey (or grants a duplicate shard).",
    };
  }
  if (!record.surveyed) throw Error("Survey the site with its keeper first.");
  if (kind === "rescue-help") {
    const index = record.helpers.length,
      step = site.steps[index];
    if (!step || record.outcome)
      throw Error("All field tasks are already complete.");
    if (v.inputs?.length !== 1 || v.inputs[0] !== index)
      throw Error("The task changed. Review the current field task.");
    const helper = p.owned.find(
      (o) => o.id === v.companion && p.team.includes(o.id),
    );
    if (!helper) throw Error("Choose a companion from your active team.");
    if (fieldAbility(byId[helper.species].element) !== step.ability)
      throw Error(
        "This companion has a different field ability. Nothing was spent.",
      );
    record.helpers.push({
      companion: helper.id,
      species: helper.species,
      ability: step.ability,
    });
    helper.friendship = Math.min(100, (helper.friendship || 0) + 2);
    state.sites[site.region] = record;
    p.rescue = state;
    return {
      message:
        step.result + " +2 friendship for " + byId[helper.species].name + ".",
    };
  }
  if (kind === "rescue-finish") {
    if (record.outcome) throw Error("This rescue is already complete.");
    if (record.helpers.length !== site.steps.length)
      throw Error("Finish all three field tasks first.");
    if (v.quest !== "shelter" && v.quest !== "wild")
      throw Error("Choose a sheltered rest or an open wildlife route.");
    record.outcome = v.quest;
    state.sites[site.region] = record;
    p.rescue = state;
    p.gold += 70;
    p.diamonds += 20;
    gainXp(p, 25);
    return {
      message:
        site.ending + " +70 Gold, 20 Diamonds and 25 XP. Your choice is saved.",
    };
  }
  throw Error("Unknown rescue action.");
}
