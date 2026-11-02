import type { Profile } from "./types";

/** Hair dyes a keeper can try at any time, free. "natural" is the keeper's own colour. */
export const HAIR_DYES = [
  { id: "natural", name: "Natural", color: "" },
  { id: "ember", name: "Ember red", color: "#a8442c" },
  { id: "honey", name: "Honey gold", color: "#c99a45" },
  { id: "frost", name: "Frost white", color: "#e3e7ea" },
  { id: "moss", name: "Moss green", color: "#5d7d4a" },
  { id: "tide", name: "Tide blue", color: "#3f6f9a" },
  { id: "dusk", name: "Dusk violet", color: "#6a4a80" },
  { id: "petal", name: "Petal pink", color: "#d98aa3" },
] as const;
export type HairDye = (typeof HAIR_DYES)[number]["id"];

/** The keeper's hair colour, or undefined for their natural one. */
export const hairColor = (p: Pick<Profile, "hair">) => HAIR_DYES.find((d) => d.id === p.hair)?.color || undefined;
