// Story chapters, daily Rift dungeons, companion equipment and skill growth.
import type { Owned, Profile } from "./types";
import { byId } from "./content";

export type Reward = {
  gold?: number;
  diamonds?: number;
  xp?: number;
  tokens?: number;
  tome?: number;
  dust?: number;
  elixir?: number;
};
export type Stage = {
  id: string;
  name: string;
  /** Base enemy level; rarer species appear lower (see enemyLevel). */
  level: number;
  /** Team level where an unupgraded starter six usually wins on auto. */
  recommended: number;
  /** Enemy HP and attack multiplier for gentle opening stages. */
  ease?: number;
  enemies: string[];
  boss?: { species: string; title: string };
};
export type Chapter = {
  id: string;
  name: string;
  place: string;
  story: string;
  color: string;
  stages: Stage[];
};
// Calibrated by simulated auto-battles of the starter six (about 75% wins, 60% for bosses).
const RECOMMENDED = [
  [1, 2, 3, 4],
  [6, 7, 8, 10],
  [12, 13, 14, 16],
  [18, 19, 20, 22],
  [24, 25, 27, 29],
];
const chapter = (
  n: number,
  name: string,
  place: string,
  story: string,
  color: string,
  levels: number[],
  names: string[],
  rosters: string[][],
  boss: { species: string; title: string },
): Chapter => ({
  id: `c${n}`,
  name,
  place,
  story,
  color,
  stages: names.map((stageName, i) => ({
    id: `c${n}-${i + 1}`,
    name: stageName,
    level: levels[i],
    recommended: RECOMMENDED[n - 1][i],
    ...(n === 1 && i < 2 ? { ease: i === 0 ? 0.65 : 0.85 } : {}),
    enemies: rosters[i],
    ...(i === 3 ? { boss } : {}),
  })),
});
export const CHAPTERS: Chapter[] = [
  chapter(
    1,
    "The Restless Grove",
    "Oldleaf woods",
    "The grove's oldest guardian has woken angry. Something in the rift is calling the woods to fight.",
    "#7da995",
    [1, 2, 1, 3],
    ["Rustling paths", "Mossbound hollow", "Roots of unrest", "The Thornwarden"],
    [
      ["mossprig", "pebblit", "thornhare", "cindermite", "zippinch", "puddlepip"],
      ["fernibble", "mossprig", "cragpup", "thornhare", "glimlet", "bubbloom"],
      ["thornhare", "floraclaw", "pebblit", "fernibble", "voltwing", "mossprig"],
      ["cragpup", "briarhart", "floraclaw", "fernibble", "thornhare", "dawnfawn"],
    ],
    { species: "briarhart", title: "Thornwarden Briarhart" },
  ),
  chapter(
    2,
    "Embers Beneath",
    "Emberglass canyon",
    "Heat pours out of a crack in the canyon floor. A flame queen guards the fissure where the rift is widening.",
    "#d48a5c",
    [4, 3, 7, 5],
    ["Cinder steps", "Glassfire ravine", "The molten gate", "Queen of Cinders"],
    [
      ["cindermite", "emberfox", "magmole", "flintuff", "wickwaddle", "cragpup"],
      ["magmole", "flintuff", "basalhorn", "emberfox", "voltwing", "cindermite"],
      ["basalhorn", "pyroclast", "magmole", "flintuff", "emberfox", "nimbuskit"],
      ["magmole", "ignivara", "basalhorn", "pyroclast", "flintuff", "emberfox"],
    ],
    { species: "ignivara", title: "Ignivara, Queen of Cinders" },
  ),
  chapter(
    3,
    "Tides of the Sky",
    "The cloud sea",
    "The waters around the floating isles are rising into the air. Follow the falling rain to the crest of the storm.",
    "#7fb3c4",
    [13, 12, 14, 12],
    ["Raining upward", "Coral cloudbanks", "Eye of the swell", "The Leviathan Crest"],
    [
      ["puddlepip", "ripplefin", "bubbloom", "coralisk", "zippinch", "nimbuskit"],
      ["coralisk", "abysshell", "ripplefin", "chimewing", "bubbloom", "voltwing"],
      ["abysshell", "tempestrix", "coralisk", "ripplefin", "chimewing", "nimbuskit"],
      ["abysshell", "leviacrest", "tempestrix", "coralisk", "ripplefin", "chimewing"],
    ],
    { species: "leviacrest", title: "Leviacrest of the Crest" },
  ),
  chapter(
    4,
    "The Frozen Choir",
    "Moonfrost hollow",
    "A song of ice is freezing the waystones one by one. Its singer waits in a cathedral of frost.",
    "#a3c7df",
    [19, 19, 18, 23],
    ["Silent snowfall", "Hall of icicles", "The choir loft", "Iskavelle's Aria"],
    [
      ["snowmew", "frostwhisk", "rimeowl", "glimlet", "velvetrime", "dawnfawn"],
      ["rimeowl", "velvetrime", "glaciermaw", "prismoth", "frostwhisk", "solmane"],
      ["glaciermaw", "crysalune", "velvetrime", "halovelle", "rimeowl", "solmane"],
      ["glaciermaw", "iskavelle", "crysalune", "halovelle", "velvetrime", "auroriel"],
    ],
    { species: "iskavelle", title: "Iskavelle, the Frozen Choir" },
  ),
  chapter(
    5,
    "Heart of the Rift",
    "Beyond the waystones",
    "Every path led here. The rift's heart beats in the dark, and the shadow that opened it is waiting.",
    "#9a86c4",
    [21, 19, 26, 23],
    ["Edge of the void", "Ink and starlight", "The last waystone", "Nyxavorn Unbound"],
    [
      ["duskblob", "shadecko", "murkfang", "inkmantle", "nocturnyx", "glimlet"],
      ["inkmantle", "nocturnyx", "obsidrake", "umbrawyrm", "murkfang", "halovelle"],
      ["umbrawyrm", "obsidrake", "raijora", "nocturnyx", "auroriel", "inkmantle"],
      ["titanusk", "nyxavorn", "umbrawyrm", "vortalyx", "nocturnyx", "auroriel"],
    ],
    { species: "nyxavorn", title: "Nyxavorn Unbound" },
  ),
];
// Rarer species appear at lower levels so every stage stays fair for a growing team.
const TIER_OFFSET: Record<string, number> = { E: 0, D: 1, C: 3, B: 5, A: 7, S: 9 };
export function enemyLevel(level: number, species: string) {
  return Math.max(1, level - (TIER_OFFSET[byId[species]?.tier] ?? 0));
}
export const BOSS_SCALE = { hp: 2, attack: 1.15, shield: 0.08 };
export const stageById = Object.fromEntries(
  CHAPTERS.flatMap((c, ci) => c.stages.map((s, si) => [s.id, { ...s, ci, si }])),
);
export function stageFirstReward(ci: number, boss: boolean): Reward {
  return boss
    ? { diamonds: 200 + ci * 60, gold: 250 + ci * 80, xp: 140 + ci * 30, tome: 2 + ci, dust: 6 + ci * 3 }
    : { diamonds: 40 + ci * 15, gold: 120 + ci * 40, xp: 80 + ci * 20, dust: 2 + ci };
}
export function stageReplayReward(ci: number): Reward {
  return { gold: 60 + ci * 25, xp: 50 + ci * 12, dust: 1 + Math.floor(ci / 2) };
}
export const CHAPTER_MASTERY: Reward = { diamonds: 120, tome: 2, elixir: 2 };
/** Stars from allies still standing: none fainted earns three. */
export function stageStars(fainted: number) {
  return fainted === 0 ? 3 : fainted <= 2 ? 2 : 1;
}
export function stageUnlocked(p: Profile, stageId: string) {
  const s = stageById[stageId];
  if (!s) return false;
  const cleared = p.adventure?.stages || {};
  if (s.si > 0) return !!cleared[CHAPTERS[s.ci].stages[s.si - 1].id];
  return s.ci === 0 || !!cleared[CHAPTERS[s.ci - 1].stages[3].id];
}

export const DUNGEON_RUNS_PER_DAY = 3;
/** Recommended team level per tier; each dungeon sets its own enemy levels. */
export const DUNGEON_LEVELS = [5, 11, 17, 23, 29];
export const DUNGEON_KEEPER_LEVEL = [1, 6, 12, 18, 24];
export const DUNGEONS = [
  {
    id: "vault",
    name: "Crystal Vault",
    reward: "Diamonds for recruiting",
    description:
      "Glittering halls where stone sentinels guard raw Skyglass. The richest source of Diamonds.",
    color: "#8fd0d8",
    levels: [3, 8, 13, 17, 21],
    enemies: ["pebblit", "cragpup", "glimlet", "basalhorn", "prismoth", "titanusk"],
  },
  {
    id: "forge",
    name: "Ember Forge",
    reward: "Equipment and forge dust",
    description:
      "A burning workshop of the first keepers. Its fire spirits drop weapons, armor and charms.",
    color: "#e6a067",
    levels: [2, 9, 14, 20, 27],
    enemies: ["cindermite", "emberfox", "flintuff", "magmole", "pyroclast", "cindervault"],
  },
  {
    id: "grove",
    name: "Grove of Insight",
    reward: "Skill tomes and elixirs",
    description:
      "A library grown from living trees. Its keepers guard tomes that teach companions stronger skills.",
    color: "#a6c98a",
    levels: [6, 12, 19, 26, 32],
    enemies: ["mossprig", "fernibble", "thornhare", "floraclaw", "solmane", "orchivyra"],
  },
] as const;
export type DungeonId = (typeof DUNGEONS)[number]["id"];
export function dungeonReward(id: DungeonId, tier: number): Reward {
  if (id === "vault")
    return { diamonds: [30, 45, 60, 80, 100][tier], gold: 40 + tier * 20 };
  if (id === "forge") return { dust: [3, 5, 8, 12, 16][tier], gold: 80 + tier * 40 };
  return { tome: [1, 2, 2, 3, 4][tier], elixir: [1, 1, 2, 2, 3][tier] };
}
export function dungeonTierOpen(p: Profile, tier: number, id: string) {
  return (
    tier >= 0 &&
    tier < 5 &&
    p.level >= DUNGEON_KEEPER_LEVEL[tier] &&
    (tier === 0 || (p.adventure?.best?.[id] ?? -1) >= tier - 1)
  );
}

export type GearSlot = "weapon" | "armor" | "charm";
export const GEAR_SLOTS: GearSlot[] = ["weapon", "armor", "charm"];
export type Gear = {
  id: string;
  slot: GearSlot;
  rarity: number;
  level: number;
  owner?: string;
};
export const RARITIES = ["Common", "Rare", "Epic", "Legendary"];
export const RARITY_COLORS = ["#c9d1bd", "#7fc0dc", "#c49ae0", "#f2c46b"];
export const GEAR_NAMES: Record<GearSlot, string[]> = {
  weapon: ["Driftwood Claws", "Ironbark Talons", "Emberforged Fang", "Skyglass Edge"],
  armor: ["Moss Weave", "Riverstone Plate", "Warden's Mantle", "Aurora Carapace"],
  charm: ["Pebble Charm", "Lantern Bell", "Comet Feather", "Heart of the Rift"],
};
export const GEAR_ICONS: Record<GearSlot, string> = { weapon: "⚔", armor: "⛨", charm: "✶" };
export const GEAR_MAX_LEVEL = 10;
export const gearName = (g: Gear) =>
  `${GEAR_NAMES[g.slot][g.rarity]}${g.level ? ` +${g.level}` : ""}`;
export type Bonus = { hp: number; attack: number; defense: number; speed: number; crit: number };
export function gearBonus(g: Gear): Bonus {
  const scale = 1 + g.level * 0.1;
  const b: Bonus = { hp: 0, attack: 0, defense: 0, speed: 0, crit: 0 };
  if (g.slot === "weapon") b.attack = [0.06, 0.1, 0.15, 0.22][g.rarity] * scale;
  if (g.slot === "armor") {
    b.hp = [0.05, 0.08, 0.12, 0.18][g.rarity] * scale;
    b.defense = [0.04, 0.07, 0.1, 0.15][g.rarity] * scale;
  }
  if (g.slot === "charm") {
    b.speed = [1, 2, 3, 5][g.rarity] + Math.floor(g.level / 2);
    b.crit = [0.03, 0.05, 0.08, 0.12][g.rarity] * (1 + g.level * 0.05);
  }
  return b;
}
export function companionBonus(p: Profile, o: Owned): Bonus {
  const total: Bonus = { hp: 0, attack: 0, defense: 0, speed: 0, crit: 0 };
  for (const g of p.gear || [])
    if (g.owner === o.id) {
      const b = gearBonus(g);
      for (const k of Object.keys(total) as (keyof Bonus)[]) total[k] += b[k];
    }
  return total;
}
export function describeBonus(b: Bonus) {
  return [
    b.attack && `+${Math.round(b.attack * 100)}% ATK`,
    b.hp && `+${Math.round(b.hp * 100)}% HP`,
    b.defense && `+${Math.round(b.defense * 100)}% DEF`,
    b.speed && `+${b.speed} SPD`,
    b.crit && `+${Math.round(b.crit * 100)}% crit`,
  ]
    .filter(Boolean)
    .join(" · ");
}
export const gearUpgradeCost = (g: Gear) => ({
  gold: 30 * (g.level + 1) * (g.rarity + 1),
  dust: (g.level + 1) * (g.rarity + 1),
});
export const gearSalvage = (g: Gear) => (g.rarity + 1) * 4 + g.level * 2;
const RARITY_WEIGHTS = [
  [0.7, 0.27, 0.03, 0],
  [0.5, 0.38, 0.11, 0.01],
  [0.3, 0.45, 0.21, 0.04],
  [0.15, 0.45, 0.32, 0.08],
  [0.05, 0.4, 0.4, 0.15],
];
export function rollGear(random: () => number, tier: number, minRarity = 0) {
  let roll = random(),
    rarity = 0;
  for (const [i, w] of RARITY_WEIGHTS[Math.max(0, Math.min(4, tier))].entries()) {
    roll -= w;
    if (roll < 0) {
      rarity = i;
      break;
    }
  }
  return {
    slot: GEAR_SLOTS[Math.min(2, Math.floor(random() * 3))],
    rarity: Math.max(minRarity, rarity),
  };
}

// Skills (action II) and ultimates (action III) level from 1 to 5.
export const SKILL_MAX = 5;
export const skillLevels = (o: Owned) => o.skills || [1, 1];
export const skillPower = (level: number) => 1 + (level - 1) * 0.1;
export const skillCost = (level: number) => ({ tome: level, gold: 100 * level });
export const ELIXIR_XP = 250;
export const rewardText = (r: Reward) =>
  [
    r.diamonds && `${r.diamonds} Diamonds`,
    r.gold && `${r.gold} Gold`,
    r.xp && `${r.xp} XP`,
    r.tokens && `${r.tokens} bond token${r.tokens === 1 ? "" : "s"}`,
    r.tome && `${r.tome} skill tome${r.tome === 1 ? "" : "s"}`,
    r.dust && `${r.dust} forge dust`,
    r.elixir && `${r.elixir} elixir${r.elixir === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
