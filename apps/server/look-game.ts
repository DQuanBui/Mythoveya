import type { Profile } from "../../packages/shared/types";
import { HAIR_DYES } from "../../packages/shared/looks";

/** Keeper looks: free, any time. */
export function lookMutation(p: Profile, kind: string, v: { item?: string }) {
  if (kind !== "look-hair") throw Error("Unknown look.");
  const dye = HAIR_DYES.find((d) => d.id === v.item);
  if (!dye) throw Error("Choose one of the hair dyes.");
  if (dye.id === "natural") delete p.hair;
  else p.hair = dye.id;
  return { message: dye.id === "natural" ? "Back to your natural hair." : `${dye.name} hair suits you!` };
}
