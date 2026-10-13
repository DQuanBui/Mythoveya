import type { Profile } from "../../packages/shared/types";
import {
  ATLAS_CHAPTERS,
  atlasOf,
  atlasEcho,
} from "../../packages/shared/atlas";
import { own, gainXp } from "../../packages/shared/economy";
export function atlasMutation(
  p: Profile,
  kind: string,
  v: { id?: string; inputs?: number[]; quest?: string },
  now = Date.now(),
  random = Math.random,
) {
  const c = ATLAS_CHAPTERS.find((c) => c.region === p.region);
  if (!c || p.island) throw Error("Visit a mainland archive first.");
  if (p.team.length !== 6) throw Error("Form a team of six first.");
  const r = atlasOf(p, now),
    index = ATLAS_CHAPTERS.indexOf(c);
  if (kind === "atlas-start") {
    if (c.region !== "haven" || v.id !== c.id)
      throw Error("Meet Aster in Havenreach first.");
    if (r.started) throw Error("Your atlas journey has already begun.");
    r.started = true;
    p.atlas = r;
    return {
      message:
        "Aster gives you an empty atlas. Read the river tablet to find its first memory.",
    };
  }
  if (!r.started) throw Error("Begin the atlas journey with Aster first.");
  if (kind === "atlas-read") {
    if (v.id !== c.id + "-tablet")
      throw Error("Visit the inscription in this region.");
    if (
      !ATLAS_CHAPTERS.slice(0, index).every((c) =>
        r.chapters.includes(c.region),
      )
    )
      throw Error("Restore the earlier chapters first.");
    if (r.read.includes(c.region))
      throw Error("This memory is already recorded.");
    r.read.push(c.region);
    p.atlas = r;
    return {
      message:
        "Memory recorded. Return to the archivist to arrange its glyphs.",
    };
  }
  if (kind === "atlas-solve") {
    if (v.id !== c.id) throw Error("Visit the archivist in this region.");
    if (
      !ATLAS_CHAPTERS.slice(0, index).every((c) =>
        r.chapters.includes(c.region),
      ) ||
      !r.read.includes(c.region)
    )
      throw Error("Record this chapter and restore the earlier pages first.");
    if (r.chapters.includes(c.region))
      throw Error("This chapter is already restored.");
    if (v.inputs?.length !== 3 || !c.code.every((n, i) => n === v.inputs![i]))
      throw Error(
        "The glyphs do not follow the memory yet. Read the inscription again.",
      );
    r.chapters.push(c.region);
    p.atlas = r;
    p.gold += 80;
    p.diamonds += 25;
    gainXp(p, 40);
    const companion =
      index === 1
        ? own(p, "cairnfin", random)
        : index === 3
          ? own(p, "inkwisp", random)
          : undefined;
    return {
      message: c.ending + " +80 Gold, 25 Diamonds and 40 XP.",
      companion,
    };
  }
  if (kind === "atlas-finish") {
    if (c.region !== "haven" || v.id !== c.id)
      throw Error("Return to Aster in Havenreach.");
    if (r.finished) throw Error("The atlas is already complete.");
    if (!ATLAS_CHAPTERS.every((c) => r.chapters.includes(c.region)))
      throw Error("Restore all four chapters first.");
    r.finished = true;
    p.atlas = r;
    p.diamonds += 80;
    gainXp(p, 80);
    return {
      message:
        "The sky-road was the welcome you carried between its people. Atlas complete! +80 Diamonds, 80 XP and the Lorekeeper badge. Daily echo readings are now available.",
    };
  }
  if (kind === "atlas-echo") {
    if (v.id !== c.id) throw Error("Visit the archivist in this region.");
    if (!r.finished)
      throw Error("Finish the atlas with Aster before reading daily echoes.");
    const echo = atlasEcho(c.region, now);
    if (v.quest !== echo.day)
      throw Error("The echo day changed. Reopen your atlas.");
    if (r.echoes.includes(c.region))
      throw Error("This echo has already been read today.");
    if (v.inputs?.length !== 1 || v.inputs[0] !== echo.answer)
      throw Error("That glyph belongs elsewhere. Read the saved memory again.");
    r.echoes.push(c.region);
    p.atlas = r;
    p.gold += 20;
    gainXp(p, 10);
    return {
      message:
        "A remembered kindness travels onward. +20 Gold and 10 XP. Return after 00:00 UTC for another echo.",
    };
  }
  throw Error("Unknown atlas action.");
}
