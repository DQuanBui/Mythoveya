import type { Profile, TownState } from "./types";

export type TownReward = {
  gold?: number;
  diamonds?: number;
  xp?: number;
  tokens?: number;
  sunseed?: number;
  treat?: number;
};
type Metric =
  | "guide"
  | "wins"
  | "recruit"
  | "formation"
  | "trained"
  | "ranked"
  | "species"
  | "resources"
  | "regions"
  | "bought"
  | "sold"
  | "harvests"
  | "crafts";
export type TownMission = {
  id: string;
  title: string;
  description: string;
  metric: Metric;
  goal: number;
  reward: TownReward;
};
export type TownNPC = {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: number;
  position: [number, number, number];
  greeting: string;
  topics: { title: string; lines: string[] }[];
  missions: TownMission[];
  helper: string;
  daily: TownReward;
};
export const NPCS: TownNPC[] = [
  {
    id: "liora",
    name: "Warden Liora",
    role: "Warden of Havenreach",
    location: "guide",
    avatar: 2,
    position: [-3, 0, 1],
    greeting:
      "No keeper walks alone. Let this place be the beginning of your story.",
    topics: [
      {
        title: "What is a Riftkeeper?",
        lines: [
          "We care for the paths between the floating reaches.",
          "Wildbound travel beside us because they choose to.",
          "A strong team begins with patience, not power.",
        ],
      },
      {
        title: "Where should I go?",
        lines: [
          "Meet your first six, then visit Ranger Tali.",
          "Your first victory opens a quest reward for the Bond shrine.",
          "Two victories reveal the canyon; five reveal the hollow.",
        ],
      },
      {
        title: "Tell me about Havenreach",
        lines: [
          "This waystone once guided travelers home through the fog.",
          "The villagers kept its light alive when the paths went quiet.",
          "Every friend you help brings a little more life back.",
        ],
      },
    ],
    missions: [
      {
        id: "liora-six",
        title: "No keeper walks alone",
        description:
          "Accept Liora's five companions to complete your first team.",
        metric: "guide",
        goal: 1,
        reward: { gold: 60 },
      },
      {
        id: "liora-trail",
        title: "A light on the trail",
        description: "Win three wild encounters.",
        metric: "wins",
        goal: 3,
        reward: { diamonds: 100, xp: 40 },
      },
    ],
    helper: "Liora shares a daily keeper's stipend.",
    daily: { gold: 40, xp: 20 },
  },
  {
    id: "sella",
    name: "Keeper Sella",
    role: "Tender of the Bond shrine",
    location: "recruit",
    avatar: 4,
    position: [-5.1, 0, -1.4],
    greeting:
      "The shrine is listening. Perhaps someone out there is listening for you, too.",
    topics: [
      {
        title: "How do bonds work?",
        lines: [
          "Diamonds call a Wildbound through the shrine.",
          "Every result is kept, and repeated species grant training shards.",
          "After a wild victory, a bond token can offer another chance to connect.",
        ],
      },
      {
        title: "Can I name my companion?",
        lines: [
          "A nickname is a little promise between friends.",
          "Choose an owned companion below and give it a name.",
          "The field journal keeps its species name so you can always recognize it.",
        ],
      },
      {
        title: "How should I arrange my team?",
        lines: [
          "Six friends travel as one team.",
          "Front companions protect the rear position behind them.",
          "Save a formation that gives healers and fragile strikers room to work.",
        ],
      },
    ],
    missions: [
      {
        id: "sella-bond",
        title: "Answering the call",
        description: "Recruit once at the Bond shrine.",
        metric: "recruit",
        goal: 1,
        reward: { tokens: 1, gold: 50 },
      },
      {
        id: "sella-team",
        title: "A place for everyone",
        description: "Save your own six-companion formation.",
        metric: "formation",
        goal: 1,
        reward: { diamonds: 70, treat: 1 },
      },
    ],
    helper: "Sella prepares one bond token each day.",
    daily: { tokens: 1 },
  },
  {
    id: "bram",
    name: "Coach Bram",
    role: "Companion combat tutor",
    location: "training",
    avatar: 5,
    position: [6, 0, 4],
    greeting:
      "Feet steady. Breath easy. Even a tiny companion can make a very brave choice.",
    topics: [
      {
        title: "Teach me the basics",
        lines: [
          "Basic attacks are free and restore team energy.",
          "Skills cost two energy; ultimates cost five.",
          "Watch cooldowns and protect your back line before spending everything.",
        ],
      },
      {
        title: "What is daily sparring?",
        lines: [
          "Practice lets you learn against a clearly labeled computer team.",
          "Win a practice match, then return here for today's sparring reward.",
          "Sparring never changes competitive ratings.",
        ],
      },
      {
        title: "Will training be wasted?",
        lines: [
          "Training gives a companion sixty XP for fifty Gold.",
          "Your keeper level limits creature levels, but earned XP is stored.",
          "When your keeper grows, that saved experience can help the team catch up.",
        ],
      },
    ],
    missions: [
      {
        id: "bram-basics",
        title: "A little practice",
        description: "Train any owned companion once.",
        metric: "trained",
        goal: 1,
        reward: { gold: 60, treat: 1 },
      },
      {
        id: "bram-routine",
        title: "A steady routine",
        description: "Complete three companion training sessions.",
        metric: "trained",
        goal: 3,
        reward: { gold: 100, xp: 40 },
      },
    ],
    helper: "Bram funds a daily training session.",
    daily: { gold: 50 },
  },
  {
    id: "kael",
    name: "Arena Master Kael",
    role: "Keeper of the Rift arena",
    location: "arena",
    avatar: 6,
    position: [-0.6, 0, -4.6],
    greeting:
      "Courage brings you to the gate. Courtesy makes you welcome on the other side.",
    topics: [
      {
        title: "Who will I fight?",
        lines: [
          "Friendly codes and ranked queues connect real keepers.",
          "Power honors your progression; Tactical uses normalized creature stats.",
          "The practice option always identifies its computer opponent.",
        ],
      },
      {
        title: "How does the ladder work?",
        lines: [
          "A rating below 1100 is the Wayfarer tier.",
          "At 1100 you become a Challenger; 1250 earns Riftwarden status.",
          "Power and Tactical each keep their own rating.",
        ],
      },
      {
        title: "What is the weekly bounty?",
        lines: [
          "Defeat any region guardian during the current UTC week.",
          "Return here to claim the weekly guardian bounty once.",
          "The guardian still grants its normal victory rewards.",
        ],
      },
    ],
    missions: [
      {
        id: "kael-ready",
        title: "Ready for the rift",
        description: "Win two wild encounters to prepare your team.",
        metric: "wins",
        goal: 2,
        reward: { diamonds: 50 },
      },
      {
        id: "kael-rival",
        title: "A worthy rival",
        description: "Complete one ranked match against another keeper.",
        metric: "ranked",
        goal: 1,
        reward: { diamonds: 100, xp: 40 },
      },
    ],
    helper: "Kael shares a daily arena allowance.",
    daily: { diamonds: 20 },
  },
  {
    id: "oren",
    name: "Archivist Oren",
    role: "Keeper of the field journal",
    location: "collection",
    avatar: 7,
    position: [6, 0, -0.8],
    greeting:
      "Every creature is a story with feet. Or fins. Occasionally, far too many wings.",
    topics: [
      {
        title: "What belongs in my journal?",
        lines: [
          "All sixty species have a place in these pages.",
          "Owned entries show the companions you have bonded with.",
          "Filters can help you compare elements, roles, and rarity.",
        ],
      },
      {
        title: "What should I look for?",
        lines: [
          "Read a creature's passive as carefully as its ultimate.",
          "A modest healer can change a whole battle.",
          "Collection is about possibilities, not only the rarest tier.",
        ],
      },
      {
        title: "Tell me a local story",
        lines: [
          "The old archive was carried here stone by stone.",
          "Liora rescued the records; Wren rescued the seeds pressed between them.",
          "Now every new bond adds another living footnote.",
        ],
      },
    ],
    missions: [
      {
        id: "oren-five",
        title: "Five living stories",
        description: "Bond with five different species.",
        metric: "species",
        goal: 5,
        reward: { gold: 60, xp: 20 },
      },
      {
        id: "oren-ten",
        title: "A growing field guide",
        description: "Collect ten different species.",
        metric: "species",
        goal: 10,
        reward: { diamonds: 100, xp: 40 },
      },
    ],
    helper: "Oren shares a daily field lesson with your team.",
    daily: { xp: 30 },
  },
  {
    id: "tali",
    name: "Ranger Tali",
    role: "Wildbound habitat guide",
    location: "encounter",
    avatar: 1,
    position: [-4.3, 0, 6.6],
    greeting:
      "Slow down and look closely. The reaches usually leave a clue before they leave a surprise.",
    topics: [
      {
        title: "Help me find an encounter",
        lines: [
          "The nearby Wildbound are ready for a friendly challenge.",
          "Begin a wild encounter below when your six are prepared.",
          "A victory may leave one creature curious enough to offer a wild bond.",
        ],
      },
      {
        title: "Where do resources grow?",
        lines: [
          "Look for small golden sparkles near the ground.",
          "Each Sunseed node can be gathered once per UTC day.",
          "Different reaches have their own gathering spots.",
        ],
      },
      {
        title: "How do habitats differ?",
        lines: [
          "Leafy companions favor Whisperleaf Meadow.",
          "Heat and stone shape the creatures of Emberglass Canyon.",
          "Moonfrost Hollow shelters frost and shadow species.",
        ],
      },
    ],
    missions: [
      {
        id: "tali-tracks",
        title: "Reading the ground",
        description: "Gather three resource nodes.",
        metric: "resources",
        goal: 3,
        reward: { sunseed: 2, gold: 30 },
      },
      {
        id: "tali-reaches",
        title: "Beyond the familiar",
        description: "Visit two different regions.",
        metric: "regions",
        goal: 2,
        reward: { treat: 2, xp: 30 },
      },
    ],
    helper: "Tali leaves a daily bundle of gathered Sunseed.",
    daily: { sunseed: 2 },
  },
  {
    id: "pip",
    name: "Pip the Trader",
    role: "Traveling market keeper",
    location: "market",
    avatar: 0,
    position: [11, 0, 6],
    greeting:
      "Useful things, fair prices, and one very fine bell. Have a look!",
    topics: [
      {
        title: "What is in stock?",
        lines: [
          "Sunseed and treats are stocked every day.",
          "A ribbon or a little bell rotates with the UTC date.",
          "The stock counter belongs to your save, so reloading cannot refill it.",
        ],
      },
      {
        title: "Can I sell supplies?",
        lines: [
          "I buy spare Sunseed and treats at the prices listed below.",
          "Choose one item at a time so you can see exactly what you receive.",
          "Your companions themselves are never merchandise.",
        ],
      },
      {
        title: "What do accessories do?",
        lines: [
          "Ribbons and bells decorate the companion following you.",
          "They carry no combat advantage.",
          "Switching an accessory returns the old one to your bag.",
        ],
      },
    ],
    missions: [
      {
        id: "pip-trade",
        title: "A fair exchange",
        description: "Buy one item from the market.",
        metric: "bought",
        goal: 1,
        reward: { gold: 25 },
      },
      {
        id: "pip-supplies",
        title: "Traveling light",
        description: "Sell two spare supplies to Pip.",
        metric: "sold",
        goal: 2,
        reward: { gold: 60, treat: 1 },
      },
    ],
    helper: "Pip sets aside a daily travel purse.",
    daily: { gold: 40 },
  },
  {
    id: "wren",
    name: "Gardener Wren",
    role: "Tender of the village garden",
    location: "garden",
    avatar: 3,
    position: [-9, 0, 10],
    greeting: "A seed needs a place to rest. So do we, sometimes.",
    topics: [
      {
        title: "Teach me to garden",
        lines: [
          "Plant one Sunseed in the plot.",
          "After two minutes, harvest three Sunseed. Growth continues while you are away.",
          "Your first garden kit includes two seeds.",
        ],
      },
      {
        title: "What can I craft?",
        lines: [
          "Two Sunseed and ten Gold make one companion treat.",
          "Feeding a treat gives thirty creature XP and ten friendship.",
          "Friendship is a bond to nurture; it does not alter arena balance.",
        ],
      },
      {
        title: "Will you help my journey?",
        lines: [
          "Harvest your first crop and learn to make a treat.",
          "Complete my missions and I will join your circle of helpers.",
          "Then I can prepare a fresh treat for you each day.",
        ],
      },
    ],
    missions: [
      {
        id: "wren-first",
        title: "Something takes root",
        description: "Harvest one garden crop.",
        metric: "harvests",
        goal: 1,
        reward: { sunseed: 2, gold: 30 },
      },
      {
        id: "wren-kindness",
        title: "A small kindness",
        description: "Craft one companion treat.",
        metric: "crafts",
        goal: 1,
        reward: { treat: 2, xp: 30 },
      },
    ],
    helper: "Wren prepares a daily garden treat.",
    daily: { treat: 1 },
  },
];
export const ITEMS = {
  sunseed: {
    name: "Sunseed",
    icon: "✧",
    description: "Plant in the garden or craft into treats.",
    buy: 12,
    sell: 6,
    stock: 8,
  },
  treat: {
    name: "Companion treat",
    icon: "♡",
    description: "Feed for 30 creature XP and 10 friendship.",
    buy: 30,
    sell: 12,
    stock: 5,
  },
  ribbon: {
    name: "Meadow ribbon",
    icon: "⋈",
    description: "A sage ribbon for your following companion.",
    buy: 90,
    sell: 0,
    stock: 1,
  },
  bell: {
    name: "Wayfarer's bell",
    icon: "♧",
    description: "A little golden bell for your following companion.",
    buy: 90,
    sell: 0,
    stock: 1,
  },
  minnow: {
    name: "Willow minnow",
    icon: "≈",
    description: "A quick silver fish from Willowmere. Pip buys it.",
    buy: 0,
    sell: 8,
    stock: 0,
  },
  carp: {
    name: "Glimmer carp",
    icon: "◒",
    description: "A golden-scaled carp that shines in the shallows.",
    buy: 0,
    sell: 18,
    stock: 0,
  },
  tome: {
    name: "Skill tome",
    icon: "❖",
    description: "Teaches a companion to strengthen a skill or ultimate.",
    buy: 0,
    sell: 0,
    stock: 0,
  },
  dust: {
    name: "Forge dust",
    icon: "⁂",
    description: "Glittering ash from the Ember Forge, used to forge equipment.",
    buy: 0,
    sell: 0,
    stock: 0,
  },
  crystal: {
    name: "Rift crystal",
    icon: "✧",
    description: "A shard of the rift. Companions use them to evolve.",
    buy: 0,
    sell: 0,
    stock: 0,
  },
  elixir: {
    name: "Growth elixir",
    icon: "⚱",
    description: "Gives a companion 250 creature XP.",
    buy: 0,
    sell: 0,
    stock: 0,
  },
  skyfin: {
    name: "Skyfin",
    icon: "✶",
    description: "A rare fish that leaps toward the clouds. Worth a lot.",
    buy: 0,
    sell: 45,
    stock: 0,
  },
};
export const FISH = ["minnow", "carp", "skyfin"] as const;
export const FISH_WEIGHTS = { minnow: 0.55, carp: 0.33, skyfin: 0.12 };
export const FISHING_CASTS_PER_DAY = 8;
export type ItemId = keyof typeof ITEMS;
export const GARDEN_GROW_MS = 120000;
export const utcDay = (now = Date.now()) =>
  new Date(now).toISOString().slice(0, 10);
export function utcWeek(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function defaultTown(region = "haven", now = Date.now()): TownState {
  return {
    stamps: [],
    caches: [],
    inventory: { sunseed: 2, treat: 0, ribbon: 0, bell: 0 },
    met: [],
    claims: [],
    helpers: [],
    helperDays: {},
    stock: { date: utcDay(now), bought: {} },
    garden: null,
    stats: {},
    visited: [region],
  };
}
export const townOf = (p: Profile) => p.town || defaultTown(p.region);
export function ensureTown(p: Profile, now = Date.now()) {
  p.town ||= defaultTown(p.region, now);
  p.town.stamps ||= [];
  p.town.caches ||= [];
  p.version = Math.max(p.version, 2);
  if (p.town.stock.date !== utcDay(now))
    p.town.stock = { date: utcDay(now), bought: {} };
  if (!p.town.visited.includes(p.region)) p.town.visited.push(p.region);
  return p.town;
}
export function dailyStock(now = Date.now()): ItemId[] {
  return [
    "sunseed",
    "treat",
    Math.floor(now / 86400000) % 2 ? "ribbon" : "bell",
  ];
}
export function missionProgress(p: Profile, m: TownMission) {
  const t = townOf(p);
  const values: Record<Metric, number> = {
    guide: p.quests.guide || 0,
    wins: p.wins,
    recruit: p.quests.recruit || 0,
    formation: p.quests.formation || 0,
    trained: Math.max(t.stats.trained || 0, p.daily.train),
    ranked: p.ranked.power + p.ranked.tactical,
    species: new Set(p.owned.map((o) => o.species)).size,
    resources: p.quests.resources || 0,
    regions: new Set([...t.visited, p.region]).size,
    bought: t.stats.bought || 0,
    sold: t.stats.sold || 0,
    harvests: t.stats.harvests || 0,
    crafts: t.stats.crafts || 0,
  };
  return Math.min(m.goal, values[m.metric]);
}
export function npcSignal(p: Profile, npc: TownNPC) {
  const t = townOf(p);
  const mission = npc.missions.find((m) => !t.claims.includes(m.id));
  return mission
    ? missionProgress(p, mission) >= mission.goal
      ? "?"
      : "!"
    : "…";
}
export const arenaTier = (rating: number) =>
  rating >= 1250 ? "Riftwarden" : rating >= 1100 ? "Challenger" : "Wayfarer";
