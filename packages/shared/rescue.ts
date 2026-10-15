import type { Profile } from "./types";
export type FieldAbility = "brace" | "nurture" | "beacon" | "scout";
export const FIELD_ABILITIES: Record<
  FieldAbility,
  { name: string; elements: string[]; description: string }
> = {
  brace: {
    name: "Brace",
    elements: ["Stone", "Frost"],
    description: "Steady unstable objects and protect a safe crossing.",
  },
  nurture: {
    name: "Nurture",
    elements: ["Tide", "Grove"],
    description: "Refresh tired wildlife and help living roots recover.",
  },
  beacon: {
    name: "Beacon",
    elements: ["Flame", "Light"],
    description: "Warm a shelter and light a welcoming route.",
  },
  scout: {
    name: "Scout",
    elements: ["Storm", "Shadow"],
    description: "Follow faint calls and find a sheltered way through.",
  },
};
export const fieldAbility = (element: string): FieldAbility =>
  (Object.keys(FIELD_ABILITIES) as FieldAbility[]).find((k) =>
    FIELD_ABILITIES[k].elements.includes(element),
  )!;
type Step = {
  ability: FieldAbility;
  title: string;
  detail: string;
  result: string;
};
export const RESCUES: {
  id: string;
  region: string;
  name: string;
  host: string;
  avatar: number;
  color: string;
  point: [number, number];
  join: [number, number];
  species: string;
  story: string;
  observation: string;
  steps: Step[];
  ending: string;
}[] = [
  {
    id: "rescue-haven",
    region: "haven",
    name: "Willowrun nursery",
    host: "Mira",
    avatar: 1,
    color: "#83c8bd",
    point: [15, 24],
    join: [8, 26],
    species: "reedrake",
    story:
      "The wind scattered our nursery baskets. A little Reedrake is guarding the last dry nest. We can help without disturbing its eggs.",
    observation:
      "A leaning frame threatens the basket. The reeds are dry, and the nest needs a gentle light after sunset.",
    steps: [
      {
        ability: "brace",
        title: "Steady the nursery frame",
        detail: "Stone or Frost can hold the frame while Mira ties it.",
        result: "The frame stands upright; the nest no longer sways.",
      },
      {
        ability: "nurture",
        title: "Refresh the reed bed",
        detail: "Tide or Grove can restore the thirsty reeds.",
        result:
          "Fresh reeds curl around the nest and catch the falling droplets.",
      },
      {
        ability: "beacon",
        title: "Warm the nesting lantern",
        detail: "Flame or Light can kindle a gentle guide light.",
        result: "The lantern glows. Reedrake settles into the warm nursery.",
      },
    ],
    ending:
      "Mira leaves a small sign: every safe journey begins with somewhere to rest.",
  },
  {
    id: "rescue-meadow",
    region: "meadow",
    name: "Bramblefall crossing",
    host: "Oren",
    avatar: 2,
    color: "#bbcf8a",
    point: [7, -20],
    join: [0, -27],
    species: "reedrake",
    story:
      "A family of Reedrakes took shelter beneath a fallen branch. They are safe, but the smallest will not cross the open clearing alone.",
    observation:
      "Quiet calls come from the fern bank. The crossing needs support before the tired family can pass.",
    steps: [
      {
        ability: "scout",
        title: "Find the hidden family",
        detail: "Storm or Shadow can follow their calls through the ferns.",
        result:
          "A tiny head rises from the ferns. The family knows you are here.",
      },
      {
        ability: "brace",
        title: "Secure the fallen branch",
        detail: "Stone or Frost can steady the branch as a low crossing.",
        result: "The branch becomes a firm, sheltered crossing.",
      },
      {
        ability: "nurture",
        title: "Refresh the travelers",
        detail: "Tide or Grove can help the family recover before moving on.",
        result:
          "The young Reedrakes stretch their wings and follow Oren's signal.",
      },
    ],
    ending:
      "Oren promises to check the crossing each morning. One curious Reedrake wants to travel with your team.",
  },
  {
    id: "rescue-canyon",
    region: "canyon",
    name: "Sunspade dig camp",
    host: "Tavi",
    avatar: 6,
    color: "#e3ac72",
    point: [-12, -7],
    join: [-23, -18],
    species: "solmole",
    story:
      "Solmole dug a new cooling burrow, then a sand gust buried its marker. Listen carefully: it is tapping beneath the stone awning.",
    observation:
      "The tapping echoes behind a loose awning. Once it is secure, a cool drink will help, and a warm marker will show the exit.",
    steps: [
      {
        ability: "brace",
        title: "Support the stone awning",
        detail:
          "Stone or Frost can secure the awning without digging near Solmole.",
        result: "The stone awning is stable. Solmole peeks out of the shade.",
      },
      {
        ability: "nurture",
        title: "Fill the cooling bowl",
        detail: "Tide or Grove can refresh the little digger.",
        result: "Solmole drinks, then brushes sand from its golden claws.",
      },
      {
        ability: "beacon",
        title: "Light the burrow marker",
        detail: "Flame or Light can reveal a safe entrance at dusk.",
        result: "An amber marker shines above the open burrow.",
      },
    ],
    ending:
      "Tavi redraws the camp map around the burrow. The creatures were here first.",
  },
  {
    id: "rescue-hollow",
    region: "hollow",
    name: "Snowbell shelter",
    host: "Edda",
    avatar: 0,
    color: "#b4cbea",
    point: [19, 2],
    join: [28, 4],
    species: "solmole",
    story:
      "A migrating Solmole followed the aurora too far north. Its lantern is dim, but its tiny trail is still visible in the snow.",
    observation:
      "Faint tracks lead behind the snow screen. The shelter needs warmth before its exhausted visitor can recover.",
    steps: [
      {
        ability: "scout",
        title: "Follow the little tracks",
        detail:
          "Storm or Shadow can find the sheltered route through the snow.",
        result:
          "The tracks lead to a curled-up Solmole beneath the snow screen.",
      },
      {
        ability: "beacon",
        title: "Warm the shelter lamp",
        detail: "Flame or Light can bring a soft warmth to the shelter.",
        result: "The lamp glows amber. Snow melts from Solmole's whiskers.",
      },
      {
        ability: "nurture",
        title: "Help the traveler recover",
        detail: "Tide or Grove can restore the visitor's strength.",
        result: "Solmole opens its eyes and draws a tiny sun in the snow.",
      },
    ],
    ending:
      "Edda hangs a bell for the next lost traveler. Solmole chooses to follow your warm footsteps.",
  },
];
export type Rescue = (typeof RESCUES)[number];
export type RescueRecord = {
  surveyed: boolean;
  helpers: { companion: string; species: string; ability: FieldAbility }[];
  outcome?: "shelter" | "wild";
};
export type RescueState = {
  sites: Record<string, RescueRecord>;
  claims: string[];
};
export const rescueOf = (p: Profile): RescueState =>
  p.rescue || { sites: {}, claims: [] };
export const rescueRecord = (p: Profile, region: string): RescueRecord =>
  rescueOf(p).sites[region] || { surveyed: false, helpers: [] };
export const rescueCount = (p: Profile) =>
  RESCUES.filter((s) => rescueRecord(p, s.region).outcome).length;
export const rescueStops = (region: string) =>
  RESCUES.filter((s) => s.region === region).map((s) => ({
    ...s,
    description:
      "Meet the field keeper and help wildlife with your companions' abilities.",
  }));
export const RESCUE_PATHS: Record<string, [number, number][][]> =
  Object.fromEntries(RESCUES.map((s) => [s.region, [[s.join, s.point]]]));
export const rescueProp = (s: Rescue): [number, number] => {
  const offset: Record<string, [number, number]> = {
    haven: [0, 3],
    meadow: [-3, 1],
    canyon: [1.5, -3],
    hollow: [-3, -1],
  };
  const [x, z] = offset[s.region];
  return [s.point[0] + x, s.point[1] + z];
};
export const rescueBlocked = (region: string, x: number, z: number) =>
  RESCUES.some(
    (s) =>
      s.region === region &&
      Math.hypot(x - rescueProp(s)[0], z - rescueProp(s)[1]) < 1.55,
  );

/** Keep the initial resident away from props even before its first walking frame. */
export function rescueWildlifePoint(s: Rescue): [number, number] {
  const offsets: Record<string, [number, number]> = {
    haven: [-2, 0],
    meadow: [2, 1],
    canyon: [3, 1.5],
    hollow: [1.5, 1.5],
  };
  const [x, z] = offsets[s.region];
  return [s.point[0] + x, s.point[1] + z];
}
