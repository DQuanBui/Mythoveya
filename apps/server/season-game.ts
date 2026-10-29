import type { Profile } from "../../packages/shared/types";
import type { TownReward } from "../../packages/shared/town";
import { activeSeason, seasonOf } from "../../packages/shared/seasons";
import { ensureTown } from "../../packages/shared/town";
import { grant } from "./town-game";

const describe = (r: TownReward) =>
  Object.entries(r)
    .map(([k, n]) =>
      k === "treat"
        ? `${n} treat${n === 1 ? "" : "s"}`
        : k === "tokens"
          ? `${n} bond token${n === 1 ? "" : "s"}`
          : k === "xp"
            ? `${n} keeper XP`
            : k === "sunseed"
              ? `${n} Sunseed`
              : `${n} ${k[0].toUpperCase()}${k.slice(1)}`,
    )
    .join(", ");

export function seasonMutation(p: Profile, kind: string, v: any, now = Date.now()) {
  if (kind !== "season-find") throw Error("Unknown seasonal action.");
  const active = activeSeason(now);
  if (!active) throw Error("No seasonal festival is running right now.");
  if (p.region !== "haven" || p.island)
    throw Error(`${active.season.name} lanterns are hidden around Havenreach.`);
  const { season } = active,
    spot = season.spots.find((s) => s.id === v.id);
  if (!spot) throw Error(`That isn't one of this year's ${season.name} lanterns.`);
  ensureTown(p, now);
  const s = seasonOf(p, now);
  if (s.found.includes(spot.id)) throw Error("You already found this lantern.");
  s.found.push(spot.id);
  grant(p, season.find);
  const complete = s.found.length === season.spots.length;
  if (complete) {
    grant(p, season.complete);
    if (!s.done.includes(active.key)) s.done.push(active.key);
  }
  return {
    message: complete
      ? `Every ${season.name} lantern is lit! ${describe(season.find)}, plus ${describe(season.complete)}.`
      : `A ${season.name} lantern! ${describe(season.find)}. (${s.found.length}/${season.spots.length})`,
  };
}
