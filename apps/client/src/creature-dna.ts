import * as T from "three";
import type { Species } from "../../../packages/shared/content";

// Every species gets its own look: a palette, proportions, ears, tail and
// markings derived from its id and its written description. The same species
// always builds the same way, and no two share every trait.

export type Ears = "pointed" | "tufted" | "long" | "round" | "floppy" | "none";
export type Tail = "fluffy" | "flame" | "fin" | "leaf" | "cyclone" | "crystal" | "bolt" | "tuft" | "stub" | "plume";
export type Marking = "none" | "stripes" | "spots" | "mask" | "socks" | "saddle";
export type Dna = {
  base: string;
  light: string;
  cream: string;
  dark: string;
  mid: string;
  accent: string;
  iris: string;
  blush: string;
  body: [number, number, number];
  head: number;
  legs: number;
  neck: number;
  ears: Ears;
  earSize: number;
  tail: Tail;
  marking: Marking;
  eye: number;
  slant: number;
  glowEyes: boolean;
  /** Anatomy named in the description. */
  features: {
    mane: boolean;
    trunk: boolean;
    snout: boolean;
    ram: boolean;
    claws: boolean;
    sail: boolean;
    owl: boolean;
    tallBird: boolean;
    needleBeak: boolean;
    bat: boolean;
    bigTail: boolean;
    molten: boolean;
    /** Tusks at the mouth (boars, mammoths) instead of horns on the head. */
    mouthTusks: boolean;
    tailCount: number;
  };
};

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function random(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}
/** Colour words in a description tint the species toward that colour. */
const COLOR_WORDS: [RegExp, string][] = [
  [/russet|rust/, "#c0603a"],
  [/golden|gold|gilded|sun-gold/, "#e8b84a"],
  [/amber|honey/, "#e8a040"],
  [/copper/, "#c07a4a"],
  [/bronze|brass/, "#b0864a"],
  [/silver|steel|chrome/, "#c4cad4"],
  [/plum|mulberry/, "#8e5a9a"],
  [/violet|amethyst|lavender/, "#a586d8"],
  [/ink|inky/, "#4a4a6a"],
  [/coral/, "#f08070"],
  [/rose|pink|blossom/, "#e88aa0"],
  [/jade|emerald/, "#4fae7a"],
  [/obsidian|onyx|soot/, "#3e3b48"],
  [/basalt|slate|granite/, "#6a6660"],
  [/crimson|scarlet|ruby/, "#c44050"],
  [/azure|cobalt|sapphire/, "#4a7fd8"],
  [/teal|lagoon/, "#3fa6a6"],
  [/snow|white|ivory|pearl/, "#f2f1ec"],
  [/moss|olive/, "#7a9a5a"],
  [/sand|dune/, "#d8c08a"],
  [/ash|smoke|grey|gray/, "#9a9690"],
  [/midnight|night|dusk/, "#3e3f70"],
  [/mint/, "#9ae0c0"],
  [/peach|apricot/, "#f4b090"],
  [/storm-blue|sky-blue|sky/, "#8ac8f0"],
];
const has = (s: Species, re: RegExp) => re.test(`${s.appearance} ${s.name}`.toLowerCase());
const tiers = ["E", "D", "C", "B", "A", "S"];

export function dnaOf(s: Species): Dna {
  const r = random(hash(s.id)),
    rank = tiers.indexOf(s.tier),
    text = s.appearance.toLowerCase();
  // Palette: start from the element, shift hue per species, then pull toward any named colour.
  const base = new T.Color(s.color),
    hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  // Bolder than the element swatch so pale elements still read clearly.
  base.setHSL(
    (hsl.h + (r() - 0.5) * 0.2 + 1) % 1,
    Math.min(1, Math.max(0.42, hsl.s * (0.85 + r() * 0.5))),
    Math.min(0.68, Math.max(0.4, hsl.l - 0.06 + (r() - 0.5) * 0.2)),
  );
  const named = COLOR_WORDS.find(([re]) => re.test(text));
  if (named) base.lerp(new T.Color(named[1]), 0.68);
  base.getHSL(hsl);
  // The accent sits across the colour wheel, bright enough to read as markings.
  const accent = new T.Color().setHSL(
    (hsl.h + (r() < 0.5 ? 0.5 : 0.12 + r() * 0.1)) % 1,
    Math.min(1, 0.45 + r() * 0.4),
    0.55 + r() * 0.15,
  );
  const c = base.getStyle(),
    mix = (to: string, t: number) => base.clone().lerp(new T.Color(to), t).getStyle();
  const iris = new T.Color()
    .setHSL((hsl.h + 0.08 + r() * 0.5) % 1, 0.55, rank >= 4 ? 0.45 : 0.28)
    .getStyle();
  // Proportions: low tiers are rounder with bigger heads; high tiers are rangier and regal.
  const long = has(s, /long-legged|stag|deer|fawn|lanky|stilt|crane|lynx|elk|gazelle|kirin/),
    stout = has(s, /stout|stubby|squat|round|chubby|tortoise|toad|mole|beetle|ferret|crocodile|squirrel/),
    lengthy = has(s, /ferret|weasel|crocodile|salamander|gecko/),
    huge = has(s, /mammoth|colossal|towering|heavy/);
  const ears: Ears = has(s, /hare|rabbit|bunny/)
    ? "long"
    : has(s, /lynx|tuft/)
      ? "tufted"
      : has(s, /fox|wolf|jackal|cat|mew|kit|hound|fang/)
        ? "pointed"
        : has(s, /puppy|pup\b|hound/)
          ? "floppy"
          : has(s, /otter|mouse|bear|cub|hamster|mole|seal|panda|chinchilla|squirrel|mammoth/)
            ? "round"
          : has(s, /drake|dragon|wyrm|serpent|horn/)
            ? "none"
            : (["pointed", "round", "floppy", "tufted"] as Ears[])[Math.floor(r() * 4)];
  const tail: Tail = has(s, /candle|flame|ember|fire|cinder|blaze|pyre/)
    ? "flame"
    : has(s, /fin|fish|otter|tide|wave|ripple/)
      ? "fin"
      : has(s, /leaf|fern|petal|bloom|vine|moss|bramble|flower/)
        ? "leaf"
        : has(s, /cyclone|swirl|vortex|gale|wind/)
          ? "cyclone"
          : has(s, /crystal|ice|icicle|shard|prism|glass/)
            ? "crystal"
            : has(s, /lightning|thunder|volt|spark|bolt/)
              ? "bolt"
              : has(s, /lion|lynx|mane|tuft/)
                ? "tuft"
                : has(s, /plume|feather|comet|streamer|peacock/)
                  ? "plume"
                  : has(s, /hare|rabbit|bunny|pup/)
                    ? "stub"
                    : (["fluffy", "tuft", "plume", "fluffy"] as Tail[])[Math.floor(r() * 4)];
  const marking: Marking = has(s, /stripe|banded|tiger/)
    ? "stripes"
    : has(s, /spot|dapple|speckle|freckle/)
      ? "spots"
      : has(s, /mask|bandit/)
        ? "mask"
        : (["none", "stripes", "spots", "mask", "socks", "saddle", "socks"] as Marking[])[Math.floor(r() * 7)];
  return {
    base: c,
    light: mix("#fff3cd", 0.42),
    cream: mix("#fff8ea", 0.74),
    dark: mix("#1d2a2e", 0.52),
    mid: mix("#2b3a3c", 0.24),
    accent: accent.getStyle(),
    iris,
    blush: mix("#ff8d86", 0.55),
    body: [
      (huge ? 1.25 : 0.88) + r() * 0.24,
      (huge ? 1.2 : 0.88) + r() * 0.22,
      (lengthy ? 1.42 : long ? 1.08 : stout ? 0.86 : 0.92) + r() * 0.2,
    ],
    head: (rank <= 1 ? 1.16 : rank <= 3 ? 1.05 : 0.95) + r() * 0.1,
    legs: long ? 1.4 : stout ? 0.72 : 0.9 + r() * 0.25,
    neck: rank >= 4 ? 0.12 + r() * 0.1 : 0,
    ears,
    earSize: 0.85 + r() * 0.35,
    tail,
    marking,
    eye: (rank <= 1 ? 1.15 : rank >= 4 ? 0.92 : 1) * (0.92 + r() * 0.16),
    slant: s.role === "striker" || s.element === "Shadow" ? 0.25 : s.role === "healer" ? -0.08 : 0,
    glowEyes: rank === 5,
    features: {
      mane: has(s, /lion|leonine|mane/),
      trunk: has(s, /mammoth|elephant/),
      snout: has(s, /crocodile|gator|jaw/),
      ram: has(s, /\bram\b/),
      claws: has(s, /claw|talon|digging/),
      sail: has(s, /sail|dorsal|vents/),
      owl: has(s, /\bowl\b/),
      tallBird: has(s, /crane|heron|stork|tall/),
      needleBeak: has(s, /hummingbird/),
      bat: has(s, /\bbat\b/),
      bigTail: has(s, /squirrel|fan-shaped|ring tail|peacock/),
      molten: has(s, /molten|kiln|lava|volcanic/),
      mouthTusks: has(s, /boar|mammoth/),
      tailCount: has(s, /nine-tailed/) ? 9 : has(s, /three-tailed/) ? 3 : has(s, /twin-tailed/) ? 2 : 1,
    },
  };
}
