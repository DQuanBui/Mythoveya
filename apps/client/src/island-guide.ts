import type { Profile } from "../../../packages/shared/types";
import { homeRadius, islandDock, houseHalf, catalogEntry, type HomeState } from "../../../packages/shared/islands";
import { FESTIVAL_PLACES as P, FESTIVAL_RADIUS as R, huntSpots } from "../../../packages/shared/festival";
import { utcDay } from "../../../packages/shared/town";

/** Named points on the Home island, for the HUD, minimap and touch prompts. */
export function homeInteractables(home: HomeState) {
  const r = homeRadius(home);
  return [
    { id: "home-ferry", name: "Skyferry", hint: "Sail back to Havenreach", p: [islandDock(r)[0], 0, 0] },
    { id: "home-house", name: "Your house", hint: "Build, decorate and upgrade", p: [-(houseHalf(home) + 1.2), 0, 0] },
    ...home.items
      .filter((i) => catalogEntry(i.kind)?.type === "habitat")
      .map((i) => ({ id: `habitat-${i.uid}`, name: catalogEntry(i.kind)!.name, hint: "Manage habitat", p: [i.x, 0, i.z] })),
  ];
}
/** Named points for the HUD, minimap and nearby prompts. */
export function festivalInteractables(profile: Profile) {
  const found = profile.festival?.day === utcDay() ? profile.festival.hunt : [];
  return [
    { id: "fest-ferry", name: "Skyferry", hint: "Sail back to Havenreach", p: [islandDock(R)[0], 0, 0] },
    { id: "fest-board", name: "Festival board", hint: "Today's activities and the lantern hunt", p: [P.board[0] - 1.2, 0, P.board[1]] },
    { id: "fest-shop", name: "Ticket booth", hint: "Spend festival tickets", p: [P.shop[0] - 1.2, 0, P.shop[1]] },
    { id: "fest-race", name: "Sprint Stakes", hint: "Race your companion", p: [P.race[0], 0, P.race[1] + 1.5] },
    { id: "fest-course", name: "Hop Hollow course", hint: "Run the obstacle lane", p: [P.course[0] - 1.5, 0, P.course[1] + 1] },
    { id: "fest-fishing", name: "Pond tournament", hint: "Forty-five seconds of fishing", p: [P.fishing[0] - 1.6, 0, P.fishing[1]] },
    ...huntSpots(utcDay())
      .filter((s) => !found.includes(s.id))
      .map((s) => ({ id: `fest-lantern-${s.id}`, name: "Hidden lantern", hint: "Click to collect", p: [s.point[0], 0, s.point[1]] })),
  ];
}
