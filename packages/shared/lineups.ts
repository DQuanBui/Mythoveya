import { power } from "./combat";
import { byId } from "./content";
import type { Owned, Profile } from "./types";

// Front to rear: tanks soak hits and screen the slot behind them.
const FRONTNESS: Record<string, number> = { tank: 0, striker: 1, controller: 2, support: 3, healer: 4 };

/** A strong starting six: the most powerful companions, keeping one tank and
 * one healer when any are owned, ordered with the sturdy ones in front. */
export function suggestTeam(owned: Owned[]): string[] {
  const ranked = [...owned].sort((a, b) => power(b) - power(a)),
    team = ranked.slice(0, 6);
  for (const role of ["tank", "healer"]) {
    if (team.some((o) => byId[o.species].role === role)) continue;
    const best = ranked.find((o) => byId[o.species].role === role);
    if (!best) continue;
    // Give up the weakest companion whose role has another in the team.
    const spare = team
      .map((o) => team.filter((x) => byId[x.species].role === byId[o.species].role).length > 1)
      .lastIndexOf(true);
    if (spare >= 0) team[spare] = best;
    else if (team.length < 6) team.push(best);
  }
  return team
    .sort((a, b) => FRONTNESS[byId[a.species].role] - FRONTNESS[byId[b.species].role] || power(b) - power(a))
    .map((o) => o.id);
}

/** The companions to choose from, narrowed to one element and in the asked-for order. */
export function companionChoices(owned: Owned[], element: string, sort: string) {
  const list = owned.filter((o) => !element || byId[o.species].element === element);
  if (sort === "power") list.sort((a, b) => power(b) - power(a));
  else if (sort === "level") list.sort((a, b) => b.level - a.level || power(b) - power(a));
  else if (sort === "name") list.sort((a, b) => byId[a.species].name.localeCompare(byId[b.species].name));
  return list;
}

export function teamPower(owned: Owned[], ids: string[]) {
  return ids.reduce((sum, id) => {
    const o = owned.find((o) => o.id === id);
    return sum + (o ? power(o) : 0);
  }, 0);
}

/** Earlier saved teams, newest first, skipping any with a companion no longer owned. */
export function recentLineups(p: Pick<Profile, "owned" | "savedFormations">, current: string[], limit = 3) {
  const same = (a: string[], b: string[]) => a.join("|") === b.join("|");
  return [...(p.savedFormations || [])]
    .reverse()
    .filter((t) => t.length === 6 && !same(t, current) && t.every((id) => p.owned.some((o) => o.id === id)))
    .slice(0, limit);
}
