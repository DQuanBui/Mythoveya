// Places the Havenreach trail map can guide to. Kept apart from the map itself,
// which loads only when opened, because the world reads these to draw a route.
import { lodgeStops } from "../../../packages/shared/lodges";
import { rescueStops } from "../../../packages/shared/rescue";
import { atlasStops } from "../../../packages/shared/atlas";
import { conservancyStops } from "../../../packages/shared/conservancy";
import { rallyHost } from "../../../packages/shared/rally";
import { EXPEDITION_STOPS } from "../../../packages/shared/wildwood";
import { HAVEN_PLACES, HAVEN_HOUSES, houseDoor, shopFront, SKYFERRY } from "../../../packages/shared/haven";
import { SHOPS } from "../../../packages/shared/shops";
export const MAP_DESTINATIONS = [
  ...lodgeStops("haven").map(s=>({...s,short:s.name,species:[s.species]})),
  ...rescueStops("haven").map(s=>({...s,short:s.name,color:s.color,species:[s.species]})),
  ...atlasStops("haven").map(s=>({...s,short:s.name,color:"#dec190",species:[] as string[]})),
  ...conservancyStops("haven").map(s=>({...s,short:s.name,color:"#acd4a0",species:[] as string[]})),
  {...rallyHost("haven")!,short:"Sky-post",species:[] as string[]},
  ...HAVEN_PLACES,
  ...EXPEDITION_STOPS.map((s) => ({ ...s, short: s.name, description: s.text, color: "#c9a4d9", species: [] as string[] })),
  ...(["smith", "apothecary"] as const).map((id) => ({
    id,
    name: SHOPS[id].name,
    short: id === "smith" ? "Smithy" : "Apothecary",
    point: shopFront(id),
    color: "#e6cf95",
    description: SHOPS[id].greeting,
    species: [] as string[],
  })),
  {
    id: "skyferry",
    name: "Skyferry dock",
    short: "Skyferry",
    point: SKYFERRY.point,
    color: "#b7d4dc",
    description: "Ferries leave for your home island whenever you are ready, and always bring you back here.",
    species: [] as string[],
  },
  ...HAVEN_HOUSES.map((h) => ({
    ...h,
    id: `porch-${h.id}`,
    short: h.name,
    point: houseDoor(h),
    species: [] as string[],
  })),
];
