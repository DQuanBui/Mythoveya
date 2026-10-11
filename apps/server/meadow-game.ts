import { own, gainXp } from "../../packages/shared/economy";
import type { Profile } from "../../packages/shared/types";
import {
  emptyMeadow,
  MEADOW_SHRINES,
  MEADOW_VERSES,
  MEADOW_NOTES,
} from "../../packages/shared/meadow";
export function meadowMutation(
  p: Profile,
  kind: string,
  v: { id?: string; inputs?: number[] },
  random = Math.random,
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
  if (kind === "mea-note") {
    const n = MEADOW_NOTES.find((n) => n.id === v.id);
    if (!n) throw Error("Choose a woodland field note.");
    if (m.notes.includes(n.id))
      throw Error("This field note is already recorded.");
    m.notes.push(n.id);
    p.gold += 20;
    return { message: `${n.name} recorded. +20 Gold.` };
  }
  if (kind === "mea-finish") {
    if (MEADOW_SHRINES.some((s) => !m.choirs.includes(s.id)))
      throw Error("Restore all three choirs first.");
    if (m.finished) throw Error("The forest is already restored.");
    m.finished = true;
    p.gold += 150;
    p.diamonds += 50;
    gainXp(p, 100);
    const companion = own(p, "fernibble", random);
    return {
      message:
        "The Forest Choir returns! Fernibble joins you. +150 Gold, +50 Diamonds, +100 XP and the Grove Listener badge.",
      companion,
    };
  }
  throw Error("Unknown Whisperleaf action.");
}
