import type { Material } from "./conservancy";
import type { Profile } from "./types";
import { LODGES, lodgeRecord } from "./lodges";

export type LodgeWorkshop = {
  name: string;
  description: string;
  cost: Partial<Record<Material, number>>;
  stories: [string, string, string];
};
export const LODGE_WORKSHOPS: Record<string, LodgeWorkshop> = {
  haven: {
    name: "Skychart stand",
    description: "Mount a brass compass and the rangers' painted island chart.",
    cost: { timber: 2, fiber: 1 },
    stories: [
      "Perrin marks the ridge trail in gold. Lumeswallows return to the same warm rafters every season; their flight tells the rangers when the mountain wind is turning.",
      "A ranger once followed a silver feather to Driftshore during a fog. The lighthouse keeper still leaves a little tea beneath the lantern for that unexpected guide.",
      "The chart leaves space beyond the last island. Perrin says a map should remember where you have been without deciding where you can go next.",
    ],
  },
  meadow: {
    name: "Seedling cradle",
    description:
      "Weave a planter for glowing herbs and tiny woodland seedlings.",
    cost: { timber: 1, fiber: 2 },
    stories: [
      "Junie gathers fallen seeds after the choir rehearses. She thinks the quietest notes help the smallest roots find their way through the soil.",
      "A Lumeswallow carried the first dewleaf sprig into this kitchen. Junie still leaves the window open, though the bird now prefers stealing ribbons to finding herbs.",
      "The seedlings lean toward the serving table. Junie laughs that they are learning how to join a gathering before they have even grown their second leaves.",
    ],
  },
  canyon: {
    name: "Fossil cabinet",
    description: "Frame a spiral fossil beside gleamstone survey samples.",
    cost: { timber: 2, crystal: 1 },
    stories: [
      "Saff turns a spiral fossil in the light. Long before the canyon held hot springs, this stone rested beneath a sea full of drifting, luminous shells.",
      "The surveyors name every new terrace after a shared meal. Pepperstep is the steep one; Second Helping is the trail that always brings them safely home.",
      "Velvetmoth lands on the coolest specimen. Its wings carry frost even here, a reminder that the islands trade more than travelers with one another.",
    ],
  },
  hollow: {
    name: "Constellation mobile",
    description: "Hang a circle of crystal stars above the reading nook.",
    cost: { fiber: 1, crystal: 2 },
    stories: [
      "Nell calls the smallest constellation the Lost Mitten. Every winter the readers invent a new ending for the keeper who went looking for its other half.",
      "Velvetmoths gather near quiet stories. Nell pauses at the end of each chapter so their antennae can settle before anyone turns another page.",
      "When snow hides the observatory, the mobile catches the hearthlight. The readers use its little stars to remember that the sky is still there above the clouds.",
    ],
  },
};
export const lodgeWorkshopCount = (p: Profile) =>
  LODGES.filter((s) => lodgeRecord(p, s.region).workshop).length;
