import type { Profile } from "../../packages/shared/types";
import {
  CANYON_BEACONS,
  CANYON_NOTES,
  emptyCanyon,
} from "../../packages/shared/canyon";
import { byId } from "../../packages/shared/content";
import { own } from "../../packages/shared/economy";

export function canyonMutation(
  p: Profile,
  kind: string,
  v: { id?: string; quest?: string; inputs?: number[] },
  random = Math.random,
) {
  if (p.region !== "canyon" || p.island)
    throw Error("Travel to Emberglass Canyon first.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const c = (p.canyon ||= emptyCanyon());
  if (kind === "can-start") {
    if (c.started) throw Error("The beacon journey has already begun.");
    c.started = true;
    return {
      message:
        "Signals in the Stone: tune the three beacons, then calm the Glass Sentinel.",
    };
  }
  if (kind === "can-tune") {
    if (!c.started)
      throw Error("Speak with Ranger Senna at Ashkeeper Camp first.");
    const n = CANYON_BEACONS.find((n) => n.id === v.quest);
    if (!n) throw Error("Choose a canyon beacon.");
    if (c.beacons.includes(n.id)) throw Error("This beacon is already tuned.");
    const o = p.owned.find(
      (o) => o.id === v.id && byId[o.species]?.element === n.element,
    );
    if (!o) throw Error(`Choose an owned ${n.element} companion.`);
    if (
      v.inputs?.length !== 3 ||
      n.code.some((color, i) => v.inputs![i] !== color)
    )
      throw Error(
        "The shutters do not match the inscription. Read its colors from left to right.",
      );
    c.beacons.push(n.id);
    p.gold += 40;
    o.friendship = Math.min(100, (o.friendship || 0) + 5);
    return {
      message: `${n.name} answers! +40 gold; your companion gains up to 5 friendship.`,
    };
  }
  if (kind === "can-finish") {
    if (
      !c.started ||
      CANYON_BEACONS.some((n) => !c.beacons.includes(n.id)) ||
      !c.guardian
    )
      throw Error("Tune all three beacons and calm the sentinel first.");
    if (c.restored) throw Error("The canyon signals are already restored.");
    c.restored = true;
    p.gold += 220;
    p.diamonds += 60;
    const companion = own(p, "thermala", random);
    return {
      message:
        "The canyon signals shine again. Thermala joins you! +220 gold and +60 diamonds.",
      companion,
    };
  }
  if (kind === "can-note") {
    const n = CANYON_NOTES.find((n) => n.id === v.id);
    if (!n) throw Error("Choose a canyon field note.");
    if (c.notes.includes(n.id))
      throw Error("This field note is already recorded.");
    c.notes.push(n.id);
    p.gold += 15;
    return { message: `${n.name} recorded. +15 gold.` };
  }
  if (kind === "can-field-reward") {
    if (CANYON_NOTES.some((n) => !c.notes.includes(n.id)))
      throw Error("Record all three canyon field notes first.");
    if (c.fieldReward) throw Error("Your survey reward is already claimed.");
    c.fieldReward = true;
    p.diamonds += 35;
    return {
      message:
        "Canyon Naturalist earned. +35 diamonds; your field badge is now displayed in Emberglass.",
    };
  }
  throw Error("Unknown canyon action.");
}
