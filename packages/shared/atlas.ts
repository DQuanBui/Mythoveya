import type { Profile } from "./types";
export const GLYPHS = ["Seed", "River", "Sun", "Star"];
export const ATLAS_CHAPTERS = [
  {
    region: "haven",
    id: "atlas-haven",
    name: "Aster's map pavilion",
    host: "Aster",
    avatar: 6,
    color: "#e4b96e",
    point: [8, -25] as [number, number],
    join: [2, -33] as [number, number],
    field: [16, -22] as [number, number],
    fieldName: "The river's first page",
    title: "A map that remembers",
    species: "cairnfin",
    code: [0, 1, 2],
    story:
      "The old atlas never marked borders. It marked the places where strangers helped one another. Its four pages scattered when the sky-road fell silent. Read the river tablet, then help me put the first memory in order.",
    inscription:
      "A seed slept beneath the orchard. The river carried it beyond the hill. At sunrise it opened, and the first travelers found shade.",
    hint: "Follow the seed, then its carrier, then the light that wakes it.",
    ending:
      "The first page unfolds. A painted river runs toward Whisperleaf, where a stone-winged traveler waits.",
  },
  {
    region: "meadow",
    id: "atlas-meadow",
    name: "Fenn's fern archive",
    host: "Fenn",
    avatar: 3,
    color: "#91c7a1",
    point: [-23, 25] as [number, number],
    join: [-20, 24] as [number, number],
    field: [-30, 28] as [number, number],
    fieldName: "The canopy's hidden page",
    title: "The weight of kindness",
    species: "cairnfin",
    code: [3, 0, 1],
    story:
      "Cairnfin carries stones that hold the names of forgotten paths. I thought the weight would stop it flying. It says a remembered kindness weighs nothing. The canopy tablet tells us who carried the first one.",
    inscription:
      "A star guided the lost traveler. She planted a seed to thank the forest. Beside a river, its roots made a bridge for those who followed.",
    hint: "The guide comes first, the gift second, and the water last.",
    ending:
      "Cairnfin joins your journey. Beneath its turquoise stones, the second page points to a wheel of warm sandstone in Emberglass.",
  },
  {
    region: "canyon",
    id: "atlas-canyon",
    name: "Suri's sandstone orrery",
    host: "Suri",
    avatar: 7,
    color: "#e6a37e",
    point: [10, -26] as [number, number],
    join: [4, -19] as [number, number],
    field: [18, -29] as [number, number],
    fieldName: "The kiln's sheltered page",
    title: "What the storm left behind",
    species: "cairnfin",
    code: [2, 1, 3],
    story:
      "The sky-road was never a bridge of stone. It was a promise to keep the next light burning. I found an empty ink bottle after the storm. Something inside it still remembers the way north.",
    inscription:
      "The sun warmed an empty bowl. A river filled it for a thirsty stranger. That night, a star shone in the water, and no traveler went unseen.",
    hint: "Warmth, water, then the night sky.",
    ending:
      "The third page becomes a sheltering bowl. Violet ink rises from Suri's bottle and drifts toward Moonfrost.",
  },
  {
    region: "hollow",
    id: "atlas-hollow",
    name: "Niva's aurora archive",
    host: "Niva",
    avatar: 5,
    color: "#b8a8e3",
    point: [-27, -22] as [number, number],
    join: [-24, -10] as [number, number],
    field: [-33, -25] as [number, number],
    fieldName: "The snow's unwritten page",
    title: "A light carried home",
    species: "inkwisp",
    code: [1, 3, 0],
    story:
      "Inkwisp writes with memories instead of ink. It has kept the final page blank for you. Read the snow tablet: the atlas is finished only when someone carries its promise home.",
    inscription:
      "A river became still beneath the ice. A star showed a keeper the safe crossing. On the far bank, she planted a seed for a spring she might never see.",
    hint: "Begin beneath the ice, look upward, then plant for tomorrow.",
    ending:
      "Inkwisp joins you. Four pages become one atlas. Return to Aster in Havenreach to open the sky-road's final memory.",
  },
];
export type AtlasChapter = (typeof ATLAS_CHAPTERS)[number];
export const ATLAS_STOPS = ATLAS_CHAPTERS.flatMap((c) => [
  {
    ...c,
    description:
      "Meet the archivist and restore a chapter of the Atlas of Echoes.",
  },
  {
    id: c.id + "-tablet",
    region: c.region,
    name: c.fieldName,
    point: c.field,
    description: "Read an inscription and record its memory in your atlas.",
  },
]);
export const atlasStops = (region: string) =>
  ATLAS_STOPS.filter((s) => s.region === region);
export const ATLAS_PATHS: Record<string, [number, number][][]> =
  Object.fromEntries(
    ATLAS_CHAPTERS.map((c) => [
      c.region,
      [
        [c.join, c.point],
        [c.point, c.field],
      ],
    ]),
  );
export const atlasProp = (c: AtlasChapter): [number, number] => [
  c.point[0] + 2.5,
  c.point[1] - 1.5,
];
export const tabletProp = (c: AtlasChapter): [number, number] => [
  c.field[0] + 1.2,
  c.field[1] - 0.5,
];
export function atlasBlocked(region: string, x: number, z: number) {
  const c = ATLAS_CHAPTERS.find((c) => c.region === region);
  if (!c) return false;
  return [atlasProp(c), tabletProp(c)].some(
    ([a, b], i) => Math.hypot(x - a, z - b) < (i === 0 ? 1.35 : 0.65),
  );
}
export type AtlasState = {
  started: boolean;
  read: string[];
  chapters: string[];
  finished: boolean;
  day: string;
  echoes: string[];
};
export const atlasDay = (now = Date.now()) =>
  new Date(now).toISOString().slice(0, 10);
export function atlasOf(p: Profile, now = Date.now()): AtlasState {
  const r = p.atlas,
    day = atlasDay(now);
  return r
    ? { ...r, day, echoes: r.day === day ? r.echoes : [] }
    : {
        started: false,
        read: [],
        chapters: [],
        finished: false,
        day,
        echoes: [],
      };
}
export function atlasEcho(region: string, now = Date.now()) {
  const c = ATLAS_CHAPTERS.find((c) => c.region === region)!;
  const slot = (Math.floor(now / 86400000) + ATLAS_CHAPTERS.indexOf(c)) % 3;
  return {
    day: atlasDay(now),
    slot,
    answer: c.code[slot],
    prompt: `Which glyph comes ${["first", "second", "third"][slot]} in this region's memory?`,
  };
}
