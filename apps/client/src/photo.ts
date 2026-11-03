// Photo mode state shared with the always-loaded world scene; the toolbar
// itself (PhotoMode.tsx) is a lazy chunk.
/** The live world canvas registers here (see Explorer) so a photo can be
 * rendered and read in the same task, without preserveDrawingBuffer. */
export const photo: { grab: (() => string) | null } = { grab: null };

export const PHOTO_FILTERS = [
  { id: "natural", name: "Natural", css: "none" },
  { id: "golden", name: "Golden hour", css: "sepia(0.22) saturate(1.25) brightness(1.05) hue-rotate(-8deg)" },
  { id: "dawn", name: "Cool dawn", css: "saturate(0.9) hue-rotate(12deg) brightness(1.06) contrast(1.05)" },
  { id: "storybook", name: "Storybook", css: "saturate(1.4) contrast(1.08)" },
  { id: "vintage", name: "Keepsake", css: "sepia(0.55) contrast(0.95) brightness(1.05)" },
  { id: "mono", name: "Ink", css: "grayscale(1) contrast(1.12)" },
  { id: "moonlit", name: "Moonlit", css: "sepia(0.4) hue-rotate(175deg) saturate(0.85) brightness(0.86) contrast(1.12)" },
] as const;
export type PhotoFilter = (typeof PHOTO_FILTERS)[number]["id"];
export const photoCss = (id: PhotoFilter) => PHOTO_FILTERS.find((f) => f.id === id)!.css;

