import type { TownReward } from "./town";

// Walk-in interiors for Havenreach's visitor-book homes. Cloudwatch Lodge is
// not listed: its door already opens the Wayfarer Lodge common room.
export type HomeFeature = "oven" | "workbench" | "planters" | "pantry" | "hearth";
export type HomeInterior = {
  host: string;
  avatar: number;
  species: string;
  floor: string;
  wall: string;
  rug: string;
  accent: string;
  feature: HomeFeature;
  /** Station label for the home's signature corner. */
  featureName: string;
  lines: string[];
  gift: TownReward;
  giftText: string;
};
export const HOME_INTERIORS: Record<string, HomeInterior> = {
  bakery: {
    host: "Hettie Crumb",
    avatar: 6,
    species: "emberfox",
    floor: "#b08a62",
    wall: "#efdcc0",
    rug: "#b4573f",
    accent: "#e9a35b",
    feature: "oven",
    featureName: "Warm oven",
    lines: [
      "Mind the flour! Emberfox keeps the oven at exactly the right heat. Don't tell the other bakers.",
      "Every traveler leaves with something warm. That's the only rule of this kitchen.",
      "The Riftgate keepers come in starving. I bake twice as much on battle days.",
    ],
    gift: { treat: 1, gold: 10 },
    giftText: "A honey bun, still warm. Share it with your companions! (1 treat, 10 Gold)",
  },
  workshop: {
    host: "Tobin Maple",
    avatar: 2,
    species: "cragpup",
    floor: "#9a7a58",
    wall: "#d9cfae",
    rug: "#5f7f7a",
    accent: "#c98d4e",
    feature: "workbench",
    featureName: "Workbench",
    lines: [
      "That lantern there? Third one this week. Trail lanterns don't fix themselves, you know.",
      "Cragpup fetches every screw I drop. Mostly the right ones.",
      "Toys first, tools second. A village that plays together stays together.",
    ],
    gift: { gold: 30 },
    giftText: "Here, I mended a few lanterns for the market. Take the proceeds. (30 Gold)",
  },
  glasshouse: {
    host: "Gardener Wren",
    avatar: 3,
    species: "mossprig",
    floor: "#8f8a6c",
    wall: "#d6e3cf",
    rug: "#6f9a63",
    accent: "#9ecf8a",
    feature: "planters",
    featureName: "Seedling bench",
    lines: [
      "Shh, the seedlings are sleeping. Mossprig sings to them in the mornings.",
      "Every Sunseed you plant in your garden started in one of these trays.",
      "Glass keeps the cold out and the light in. A bit like a good friend.",
    ],
    gift: { sunseed: 2 },
    giftText: "These sprouted early. Plant them somewhere sunny. (2 Sunseed)",
  },
  "orchard-home": {
    host: "Rosalind Applebright",
    avatar: 5,
    species: "thornhare",
    floor: "#a98463",
    wall: "#f0d9b8",
    rug: "#c0705e",
    accent: "#d8574a",
    feature: "pantry",
    featureName: "Preserve pantry",
    lines: [
      "Apple, pear, cloudberry... I label every jar, and Thornhare un-labels them.",
      "The orchard gives more than we can eat, so the rest goes to anyone who walks by.",
      "If you ever smell cinnamon on the wind, follow it. It's probably me.",
    ],
    gift: { treat: 1, xp: 10 },
    giftText: "A jar of orchard preserves for the road. (1 treat, 10 keeper XP)",
  },
  "grove-refuge": {
    host: "Elder Fen",
    avatar: 4,
    species: "dawnfawn",
    floor: "#7d6a52",
    wall: "#c9ba98",
    rug: "#6b7f5a",
    accent: "#8fb07a",
    feature: "hearth",
    featureName: "Mossy hearth",
    lines: [
      "Sit, sit. The kettle's always on for patient explorers.",
      "Dawnfawn found this refuge before I did. I only built the walls around her.",
      "The oldest trees remember the first Riftkeepers. Listen to them on a quiet day.",
    ],
    gift: { sunseed: 1, xp: 20 },
    giftText: "Moss tea and an old story. You feel wiser already. (1 Sunseed, 20 keeper XP)",
  },
};
export const HOME_SPAWN: [number, number] = [0, 2.3];
/** Rendered furniture footprints; homeWalkable adds keeper clearance. */
export const HOME_FURNITURE = [
  { id: "table", x: 0.6, z: -0.4, w: 1.8, d: 1.1 },
  { id: "feature", x: -2.9, z: -3.3, w: 2.4, d: 1 },
  { id: "shelf", x: 3.6, z: -2.6, w: 1, d: 2.2 },
  { id: "lectern", x: 3.4, z: 1.6, w: 0.6, d: 0.6 },
];
export const HOME_STATIONS = [
  { id: "host", name: "Talk", point: [-1.1, -2.3] as [number, number] },
  { id: "gift", name: "Daily gift", point: [-2.9, -2.3] as [number, number] },
  { id: "book", name: "Visitor book", point: [3.4, 0.75] as [number, number] },
  { id: "exit", name: "Step outside", point: [0, 3.4] as [number, number] },
];
export function homeWalkable(x: number, z: number) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    Math.abs(x) < 4.1 &&
    z > -3.55 &&
    z < 3.8 &&
    !HOME_FURNITURE.some(
      (f) => Math.abs(x - f.x) < f.w / 2 + 0.35 && Math.abs(z - f.z) < f.d / 2 + 0.35,
    )
  );
}
