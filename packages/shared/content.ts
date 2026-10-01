import roster from "./roster.json" with { type: "json" };
export const TIERS = ["E", "D", "C", "B", "A", "S"] as const;
export const ELEMENTS = [
  "Flame",
  "Tide",
  "Grove",
  "Stone",
  "Storm",
  "Frost",
  "Light",
  "Shadow",
] as const;
export const COLORS: Record<string, string> = {
  Flame: "#f59362",
  Tide: "#65cbd5",
  Grove: "#98c574",
  Stone: "#b4a58c",
  Storm: "#aeb6ff",
  Frost: "#badfec",
  Light: "#f3d78b",
  Shadow: "#af8ccc",
};
export const FAMILIES = [
  "insect",
  "amphibian",
  "quadruped",
  "shell",
  "bird",
  "fox",
  "insect",
  "spirit",
  "bird",
  "aquatic",
  "fox",
  "aquatic",
  "antler",
  "fox",
  "bird",
  "quadruped",
  "antler",
  "amphibian",
  "quadruped",
  "quadruped",
  "quadruped",
  "serpent",
  "quadruped",
  "antler",
  "fox",
  "bird",
  "insect",
  "fox",
  "bird",
  "quadruped",
  "amphibian",
  "shell",
  "antler",
  "dragon",
  "bird",
  "quadruped",
  "quadruped",
  "fox",
  "antler",
  "aquatic",
  "bird",
  "serpent",
  "antler",
  "quadruped",
  "fox",
  "fox",
  "bird",
  "serpent",
  "shell",
  "insect",
  "dragon",
  "aquatic",
  "antler",
  "golem",
  "dragon",
  "antler",
  "quadruped",
  "dragon",
  "aquatic",
  "fox",
] as const;
export type Effect =
  | "damage"
  | "heal"
  | "shield"
  | "burn"
  | "slow"
  | "cleanse"
  | "weaken"
  | "mark"
  | "regen"
  | "haste"
  | "guard"
  | "reflect"
  | "silence"
  | "revive"
  | "thorns"
  | "boost"
  | "bank"
  | "delay"
  | "stun"
  | "pierce";
export type Action = {
  id: string;
  name: string;
  cost: number;
  cooldown: number;
  power: number;
  effects: Effect[];
  target: "enemy" | "ally" | "row" | "allies" | "self" | "rear";
  presentation: string;
  audio: string;
  duration: number;
};
const mechanics: Effect[][] = [
  ["damage", "burn"],
  ["heal"],
  ["shield"],
  ["guard"],
  ["damage", "haste"],
  ["damage", "slow"],
  ["cleanse", "shield"],
  ["damage", "weaken"],
  ["shield", "cleanse"],
  ["damage", "slow"],
  ["damage", "pierce"],
  ["heal"],
  ["damage", "slow"],
  ["shield", "guard"],
  ["damage"],
  ["shield"],
  ["heal", "cleanse"],
  ["damage", "mark"],
  ["regen", "heal"],
  ["damage"],
  ["guard", "thorns"],
  ["damage", "slow"],
  ["regen", "heal"],
  ["shield"],
  ["haste"],
  ["damage", "silence"],
  ["shield", "cleanse"],
  ["damage", "pierce"],
  ["haste", "boost"],
  ["damage", "weaken", "slow"],
  ["damage", "burn"],
  ["shield", "guard"],
  ["regen", "thorns"],
  ["damage", "pierce"],
  ["damage"],
  ["guard", "shield"],
  ["regen", "heal"],
  ["weaken", "damage"],
  ["shield", "reflect"],
  ["silence", "damage"],
  ["damage", "revive"],
  ["damage", "slow"],
  ["regen", "heal"],
  ["guard", "shield"],
  ["damage", "boost"],
  ["shield", "slow"],
  ["boost", "haste"],
  ["damage", "pierce"],
  ["guard", "bank"],
  ["mark", "delay", "stun"],
  ["delay", "damage", "burn"],
  ["guard", "shield"],
  ["heal", "cleanse"],
  ["shield", "guard"],
  ["mark", "delay", "damage"],
  ["stun", "slow"],
  ["revive", "heal"],
  ["weaken", "delay", "damage"],
  ["heal", "cleanse", "regen"],
  ["mark", "delay", "slow"],
];
const targets: Record<number, Action["target"]> = {
  3: "self",
  20: "self",
  11: "allies",
  15: "allies",
  19: "row",
  23: "allies",
  24: "allies",
  30: "row",
  31: "allies",
  32: "allies",
  34: "row",
  35: "allies",
  36: "allies",
  37: "row",
  40: "enemy",
  41: "row",
  42: "allies",
  43: "allies",
  45: "allies",
  48: "self",
  49: "rear",
  50: "row",
  51: "allies",
  52: "allies",
  53: "allies",
  57: "row",
  58: "allies",
};
export type Species = (typeof roster)[number] & {
  index: number;
  lore: string;
  family: string;
  color: string;
  size: number;
  variant: number;
  stats: { hp: number; attack: number; defense: number; speed: number };
  growth: number;
  portrait: string;
  animation: string;
  voice: string;
  passive: { id: string; name: string; effect: Effect; value: number };
  actions: Action[];
  /** Evolved forms name their base species; bases name their evolution. */
  evolvedFrom?: string;
  evolvesTo?: string;
};
export const SPECIES: Species[] = roster.map((r, i) => {
  const rank = TIERS.indexOf(r.tier as (typeof TIERS)[number]);
  const budget = 1 + rank * 0.05;
  const tank = r.role === "tank",
    healer = r.role === "healer";
  const fx = mechanics[i];
  const support = !fx.includes("damage") && !fx.includes("delay");
  const signature = r.signature.split(
    / (?:applies|heals|grants|reduces|gains|temporarily|cleanses|briefly|shields|removes|lowers|deals|protects|chains|makes|plants|hits|burns|delays|provides|raises|interrupts|advances|damages|absorbs|breaks|reflects|suppresses|sweeps|intercepts|follows|slows|boosts|partially|banks|marks|charges|distributes|restores|erects|revives|weakens|sends)/,
  )[0];
  const action = (
    n: number,
    effects: Effect[],
    target: Action["target"],
    name: string,
  ): Action => ({
    id: `${r.id}-${n}`,
    name,
    cost: [0, 2, 5][n],
    cooldown: [0, 2, 4][n],
    power: [1, 1.35, 2.1][n],
    effects,
    target,
    presentation: `${r.element.toLowerCase()}-${n === 2 && rank === 5 ? r.id : n}`,
    audio: r.element.toLowerCase(),
    duration: [700, 1200, 2200][n],
  });
  return {
    ...r,
    lore: `${r.appearance}. ${r.name} is drawn to keepers who share its ${r.role === "healer" ? "gentleness" : r.role === "tank" ? "courage" : "curiosity"}.`,
    index: i,
    family: FAMILIES[i],
    color: COLORS[r.element],
    size: 0.72 + rank * 0.09,
    variant: i % 5,
    stats: {
      hp: Math.round((tank ? 155 : healer ? 112 : 122) * budget),
      attack: Math.round((r.role === "striker" ? 39 : 30) * budget),
      defense: Math.round((tank ? 40 : 24) * budget),
      speed: Math.round(
        (r.role === "controller" ? 35 : tank ? 19 : 29) + (i % 7),
      ),
    },
    growth: 0.075,
    portrait: `model-render:${r.id}`,
    animation: FAMILIES[i],
    voice: `${FAMILIES[i]}:${i}`,
    passive: {
      id: `${r.id}-passive`,
      name: `${r.name}'s instinct`,
      effect: tank
        ? "guard"
        : healer
          ? "regen"
          : r.role === "support"
            ? "shield"
            : r.role === "controller"
              ? "haste"
              : "boost",
      value: 0.05,
    },
    actions: [
      action(
        0,
        ["damage"],
        "enemy",
        `${r.name} · ${r.element === "Tide" ? "Splash" : r.element === "Light" ? "Gleam" : "Strike"}`,
      ),
      action(1, fx, targets[i] || (support ? "ally" : "enemy"), signature),
      action(
        2,
        fx,
        targets[i] || (support ? "allies" : "row"),
        rank === 5 ? signature : `${r.name} · Wild ${r.element}`,
      ),
    ],
  };
});
// Evolved forms are reached only by evolving a companion; they never appear
// in recruitment, so the sixty-species roster and its odds are unchanged.
export const EVOLUTIONS = [
  ["cindermite", "forgebeetle", "Forgebeetle", "Armored furnace beetle with a glowing horn and basalt plates", "Furnace Bite applies a lasting burn"],
  ["puddlepip", "lilyreign", "Lilyreign", "Crowned pond amphibian with a lily-petal crown and an orbit of droplets", "Rainfall Dew heals the weakest ally"],
  ["mossprig", "bramblehop", "Bramblehop", "Fern-maned rabbit with blooming leaf ears and a canopy tail", "Thicket Guard grants a sturdy shield"],
  ["pebblit", "boulderune", "Boulderune", "Mountain-backed tortoise with crystal ridges and slate plates", "Bastion Shell reduces incoming damage"],
  ["zippinch", "thunderkite", "Thunderkite", "Storm falcon with a forked lightning crown and long tail plumes", "Thunder Dive gains a strong speed bonus"],
  ["snowmew", "glacielynx", "Glacielynx", "Crystal-tufted lynx with icicle ears and frost-plated paws", "Frostbound Pounce temporarily slows"],
  ["glimlet", "luminmoth", "Luminmoth", "Radiant moth with a halo above its lantern wings", "Lantern Veil cleanses one debuff"],
  ["duskblob", "gloomwraith", "Gloomwraith", "Hooded shadow spirit trailing an orbit of ink", "Nightfall Touch briefly reduces attack"],
  ["wickwaddle", "hearthwaddle", "Hearthwaddle", "Crested ember penguin with a candle crown and a warm feather cloak", "Kindled Light shields the weakest ally and removes one burn"],
  ["bubbloom", "pearlbloom", "Pearlbloom", "Blooming jellyfish with petal fins and a glowing pearl crown", "Pearl Tether lowers one target's speed for one round"],
  ["emberfox", "pyrevale", "Pyrevale", "Winged ember fox with a crown of candle flames", "Blaze Dash deals extra damage to shields"],
  ["ripplefin", "tidecrest", "Tidecrest", "Crested river otter with a sweeping fin tail and orbiting droplets", "Tidal Current heals two injured allies"],
  ["thornhare", "thornstag", "Thornstag", "Tall stag-hare with blooming bramble antlers and leaf garlands", "Bramble Bind lowers target speed"],
  ["cragpup", "cragmaw", "Cragmaw", "Broad guardian hound in layered basalt armor with stone horns", "Bulwark Guard protects one ally"],
  ["voltwing", "tempestwing", "Tempestwing", "Great storm bat with crackling wing membranes and a lightning halo", "Arc Storm chains to a second target"],
  ["dawnfawn", "solstag", "Solstag", "Radiant young stag with a sun-disc crest and a petal mane", "Dawn Grace heals and cleanses"],
] as const;
export const EVOLVED: Species[] = EVOLUTIONS.map(
  ([from, id, name, appearance, signature], k) => {
    const base = SPECIES.find((x) => x.id === from)!,
      rank = TIERS.indexOf(base.tier as (typeof TIERS)[number]) + 1,
      lift = (1 + rank * 0.05 + 0.04) / (1 + (rank - 1) * 0.05);
    const move = signature.split(
      / (?:applies|heals|grants|reduces|gains|temporarily|cleanses|briefly|shields|lowers|deals|chains|protects)/,
    )[0];
    base.evolvesTo = id;
    return {
      ...base,
      id,
      name,
      tier: TIERS[rank],
      appearance,
      signature,
      evolvedFrom: from,
      evolvesTo: undefined,
      lore: `${appearance}. ${name} is what ${base.name} becomes when a keeper's bond runs deep.`,
      index: SPECIES.length + k,
      size: base.size + 0.13,
      variant: (base.variant + 2) % 5,
      stats: {
        hp: Math.round(base.stats.hp * lift),
        attack: Math.round(base.stats.attack * lift),
        defense: Math.round(base.stats.defense * lift),
        speed: base.stats.speed + 3,
      },
      portrait: `model-render:${id}`,
      voice: `${base.family}:${SPECIES.length + k}`,
      passive: { ...base.passive, id: `${id}-passive`, name: `${name}'s instinct`, value: 0.06 },
      actions: base.actions.map((a, n) => ({
        ...a,
        id: `${id}-${n}`,
        name:
          n === 0
            ? `${name} · ${base.element === "Tide" ? "Splash" : base.element === "Light" ? "Gleam" : "Strike"}`
            : n === 1
              ? move
              : `${name} · Wild ${base.element}`,
      })),
    } as Species;
  },
);
export const ALL_SPECIES = [...SPECIES, ...EVOLVED];
export const byId = Object.fromEntries(ALL_SPECIES.map((s) => [s.id, s]));
/** Base species whose authored signature an evolved form keeps in battle. */
export const signatureId = (id: string) => byId[id]?.evolvedFrom ?? id;
export const STARTERS = ["emberfox", "ripplefin", "thornhare"];
export const COMPANIONS = [
  "cindermite",
  "puddlepip",
  "mossprig",
  "pebblit",
  "zippinch",
];
export const AVATARS = [
  {
    name: "Kael Ashford",
    skin: "#bb825e",
    hair: "#302822",
    coat: "#dd824c",
    desc: "Confident adventurer · orange travel jacket",
  },
  {
    name: "Mira Tidevale",
    skin: "#865a41",
    hair: "#172f3a",
    coat: "#409f96",
    desc: "Calm wildlife researcher · flowing braid",
  },
  {
    name: "Rowan Fernstep",
    skin: "#e6b69c",
    hair: "#854a32",
    coat: "#72925a",
    desc: "Patient forest guide · green poncho",
  },
  {
    name: "Sora Galecrest",
    skin: "#d5a380",
    hair: "#e1e4e8",
    coat: "#71accc",
    desc: "Energetic scout · sky-blue scarf",
  },
  {
    name: "Dax Stoneward",
    skin: "#624433",
    hair: "#28231f",
    coat: "#829195",
    desc: "Gentle protector · stone armor",
  },
  {
    name: "Nyra Moonveil",
    skin: "#bb9e73",
    hair: "#674674",
    coat: "#7b537c",
    desc: "Curious ruins scholar · plum cape",
  },
  {
    name: "Elian Dawnspire",
    skin: "#c58e62",
    hair: "#d4b35e",
    coat: "#e0ddc4",
    desc: "Optimistic healer · ivory coat",
  },
  {
    name: "Vesper Quill",
    skin: "#664333",
    hair: "#ece5d7",
    coat: "#374759",
    desc: "Playful inventor · brass goggles",
  },
];
export const REGIONS = [
  {
    id: "haven",
    name: "Havenreach",
    subtitle: "A home between the clouds",
    color: "#84a983",
    ground: "#729575",
    unlock: 0,
  },
  {
    id: "meadow",
    name: "Whisperleaf Meadow",
    subtitle: "Where the old roots remember",
    color: "#9abc84",
    ground: "#8da575",
    unlock: 0,
  },
  {
    id: "canyon",
    name: "Emberglass Canyon",
    subtitle: "The mountain still has a heartbeat",
    color: "#c58c75",
    ground: "#9b6a58",
    unlock: 2,
  },
  {
    id: "hollow",
    name: "Moonfrost Hollow",
    subtitle: "Follow the light beneath the ice",
    color: "#a0c6d2",
    ground: "#b5cbd1",
    unlock: 5,
  },
];
