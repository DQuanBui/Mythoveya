export type Owned = {
  id: string;
  species: string;
  level: number;
  xp: number;
  shards: number;
  upgrade: number;
  locked: boolean;
  nickname?: string;
  friendship?: number;
  accessory?: "ribbon" | "bell";
  skills?: [number, number];
  /** Battle-only equipment bonus resolved by the server; never saved. */
  bonus?: { hp: number; attack: number; defense: number; speed: number; crit: number };
};
export type AdventureState = {
  stages: Record<string, number>;
  chests: string[];
  best: Record<string, number>;
  dungeonDay: string;
  runs: Record<string, number>;
  gearSeq: number;
  /** Highest Rift Tower floor cleared. */
  tower?: number;
};
export type TownState = {
  stamps?: string[];
  caches?: string[];
  shopDay?: string;
  shopBought?: Record<string, number>;
  /** Pending one-battle tonics from the Apothecary. */
  buffs?: Record<string, number>;
  fishing?: { date: string; casts: number; caught: number };
  trackedNpc?: string;
  inventory: Record<string, number>;
  met: string[];
  claims: string[];
  helpers: string[];
  helperDays: Record<string, string>;
  stock: { date: string; bought: Record<string, number> };
  garden: { plantedAt: number; readyAt: number } | null;
  stats: Record<string, number>;
  visited: string[];
  sparWon?: string;
  sparClaimed?: string;
  guardianWeek?: string;
  guardianClaimed?: string;
};
export type Profile = {
  id: string;
  name: string;
  avatar: number;
  version: number;
  level: number;
  xp: number;
  gold: number;
  diamonds: number;
  tokens: number;
  owned: Owned[];
  team: string[];
  savedFormations?: string[][];
  pity: { as: number; s: number };
  quests: Record<string, number>;
  claims: string[];
  daily: {
    date: string;
    wins: number;
    train: number;
    resources: number;
    claimed: boolean;
  };
  ratings: { power: number; tactical: number };
  ranked: { power: number; tactical: number };
  wins: number;
  region: string;
  resources: string[];
  bond?: { species: string; chance: number; used: boolean };
  bosses: string[];
  town?: TownState;
  adventure?: AdventureState;
  events?: import("./events").EventState;
  gear?: import("./adventure").Gear[];
  /** Set while visiting an island by Skyferry; the home region stays in `region`. */
  island?: import("./islands").IslandId;
  home?: import("./islands").HomeState;
};
export type Status = {
  kind: string;
  turns: number;
  value: number;
  source?: string;
};
export type Unit = {
  id: string;
  species: string;
  side: number;
  slot: number;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  shield: number;
  statuses: Status[];
  cooldowns: number[];
  revived: boolean;
  controlledLast: boolean;
  bank: number;
  skill?: number[];
  crit?: number;
};
export type BattleEvent = {
  id: number;
  actor: string;
  target: string;
  action: string;
  name: string;
  amounts: { id: string; amount: number; shield: number }[];
  duration: number;
  at: number;
  message: string;
};
export type Battle = {
  id: string;
  units: Unit[];
  round: number;
  queue: string[];
  energy: number[];
  seed: number;
  event: BattleEvent | null;
  sequence: number;
  winner: number | null;
  log: string[];
  readyAt: number;
  deadline: number;
  delayed: { actor: string; target: string; action: number; round: number }[];
  mode: string;
  title?: string;
  rewards?: {
    gold: number;
    diamonds: number;
    xp: number;
    tokens: number;
    newSpecies: string[];
    items?: string[];
    stars?: number;
  };
};
