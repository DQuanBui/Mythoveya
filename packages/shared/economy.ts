import { SPECIES, TIERS } from "./content";
import type { Profile, Owned } from "./types";
export const RATES = [0.3, 0.3, 0.22, 0.12, 0.05, 0.01];
export function pull(pity: { as: number; s: number }, random: () => number) {
  let tier: number;
  const r = random();
  if (pity.s >= 89) tier = 5;
  else if (pity.as >= 29) tier = r < 5 / 6 ? 4 : 5;
  else {
    let sum = 0;
    tier = RATES.findIndex((v) => (sum += v) > r);
    if (tier < 0) tier = 5;
  }
  const species = SPECIES.filter((s) => s.tier === TIERS[tier])[
    Math.min(9, Math.floor(random() * 10))
  ];
  pity.as = tier >= 4 ? 0 : pity.as + 1;
  pity.s = tier === 5 ? 0 : pity.s + 1;
  return species.id;
}
export function own(p: Profile, species: string): Owned {
  const found = p.owned.find((o) => o.species === species);
  if (found) {
    found.shards++;
    return found;
  }
  // An evolved companion keeps its original id, so a new bond needs a fresh one.
  let id = `${p.id}:${species}`;
  for (let n = 2; p.owned.some((o) => o.id === id); n++)
    id = `${p.id}:${species}:${n}`;
  const o = {
    id,
    species,
    level: 1,
    xp: 0,
    shards: 0,
    upgrade: 0,
    locked: false,
  };
  p.owned.push(o);
  return o;
}
export const LEVEL_CAP = 40;
export function xpNeeded(level: number) {
  return 60 + level * 30;
}
export function gainXp(p: Profile, xp: number) {
  p.xp += xp;
  while (p.level < LEVEL_CAP && p.xp >= xpNeeded(p.level)) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    p.diamonds += 50;
  }
  for (const o of p.owned) {
    if (p.team.includes(o.id)) o.xp += xp;
    while (o.level < p.level && o.xp >= xpNeeded(o.level)) {
      o.xp -= xpNeeded(o.level);
      o.level++;
    }
  }
}
export const day = () => new Date().toISOString().slice(0, 10);
export function resetDaily(p: Profile) {
  if (p.daily.date !== day()) {
    p.daily = { date: day(), wins: 0, train: 0, resources: 0, claimed: false };
    p.resources = [];
  }
}
export function formation(p: Profile, ids: string[]) {
  if (
    ids.length !== 6 ||
    new Set(ids).size !== 6 ||
    ids.some((id) => !p.owned.some((o) => o.id === id))
  )
    throw Error("Choose six different owned companions.");
  p.team = ids;
  p.savedFormations ||= [];
  if (!p.savedFormations.some((t) => t.join("|") === ids.join("|")))
    p.savedFormations.push([...ids]);
  p.quests.formation = 1;
}
