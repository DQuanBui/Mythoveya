import type { Profile } from "../../packages/shared/types";
import {
  emptyMeadow,
  MEADOW_SHRINES,
  MEADOW_VERSES,
} from "../../packages/shared/meadow";
export function meadowMutation(
  p: Profile,
  kind: string,
  v: { id?: string; inputs?: number[] },
) {
  if (p.region !== "meadow" || p.island)
    throw Error("Travel to Whisperleaf Meadow first.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const m = (p.meadow ||= emptyMeadow());
  if (kind === "mea-start") {
    if (m.started) throw Error("The woodland journey has already begun.");
    m.started = true;
    return {
      message:
        "The Forest Choir: read each verse and answer it with the shrine's chimes.",
    };
  }
  if (!m.started) throw Error("Meet Rowan at the woodland lodge first.");
  if (kind === "mea-sing") {
    const s = MEADOW_SHRINES.find((s) => s.id === v.id);
    if (!s) throw Error("Choose a woodland choir.");
    if (m.choirs.includes(s.id)) throw Error("This choir is already restored.");
    const verse = MEADOW_VERSES[s.id];
    if (
      !Array.isArray(v.inputs) ||
      v.inputs.length !== verse.answer.length ||
      !verse.answer.every((n, i) => n === v.inputs![i])
    )
      throw Error(
        "The chimes are not in harmony yet. Read the verse from left to right and try again; nothing is spent.",
      );
    m.choirs.push(s.id);
    p.gold += 35;
    return { message: `${s.name} is singing again. +35 Gold.` };
  }
  throw Error("Unknown Whisperleaf action.");
}
