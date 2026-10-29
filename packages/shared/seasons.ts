import type { Profile } from "./types";
import type { Point } from "./haven";
import type { TownReward } from "./town";

// Seasonal festivals: for a few weeks each year, lanterns are hidden around
// Havenreach. Each one found pays a small reward; finding them all pays a
// bigger one and adds the festival to the keeper's seasonal record.
export type SeasonSpot = { id: string; point: Point; clue: string };
export type Season = {
  id: string;
  name: string;
  prop: "gourd" | "star";
  /** Inclusive UTC [month (1-12), day] window; it may run past New Year. */
  from: [number, number];
  to: [number, number];
  blurb: string;
  find: TownReward;
  complete: TownReward;
  spots: SeasonSpot[];
};
export type SeasonState = { key: string; found: string[]; done: string[] };

export const SEASONS: Season[] = [
  {
    id: "lantern-night",
    name: "Lantern Night",
    prop: "gourd",
    from: [10, 24],
    to: [11, 7],
    blurb:
      "When the evenings draw in, Havenreach carves glowgourds and hides them around the island. Find all eight before the lanterns go out.",
    find: { gold: 25, treat: 1 },
    complete: { diamonds: 120, tokens: 2, xp: 60 },
    spots: [
      { id: "ln-bakery", point: [-8.4, -8.3], clue: "Beside the bakery door, where the oven keeps the step warm." },
      { id: "ln-workshop", point: [-15.6, 7.7], clue: "On the toymaker's porch, to the left of the door." },
      { id: "ln-glasshouse", point: [14.6, 17.7], clue: "Near the glasshouse door, among the seedlings." },
      { id: "ln-orchard", point: [-26.4, 29.7], clue: "Where the apple cottage keeps its preserves." },
      { id: "ln-ranger", point: [27.4, -20.3], clue: "At the rangers' lodge, for anyone who walks the long path." },
      { id: "ln-refuge", point: [-32.4, -11.3], clue: "By the kettle at the woodland refuge." },
      { id: "ln-well", point: [-0.2, 15.5], clue: "Peeking over the village well." },
      { id: "ln-campfire", point: [5.7, 29.5], clue: "Keeping the meadow campfire company." },
    ],
  },
  {
    id: "frostlight",
    name: "Frostlight",
    prop: "star",
    from: [12, 18],
    to: [1, 6],
    blurb:
      "At the turn of the year, star lanterns made of frost-glass are hung around Havenreach. Find all eight to light the longest night.",
    find: { gold: 25, sunseed: 1 },
    complete: { diamonds: 120, tokens: 2, xp: 60 },
    spots: [
      { id: "fl-bakery", point: [-11.6, -8.3], clue: "Left of the bakery door, out of the snow." },
      { id: "fl-workshop", point: [-12.4, 7.7], clue: "To the right of the workshop door." },
      { id: "fl-glasshouse", point: [11.4, 17.7], clue: "Glinting beside the glasshouse." },
      { id: "fl-orchard", point: [-29.6, 29.7], clue: "Hung by the apple cottage door." },
      { id: "fl-ranger", point: [30.6, -20.3], clue: "On the rangers' porch, right of the door." },
      { id: "fl-refuge", point: [-35.6, -11.3], clue: "In the moss beside the woodland refuge." },
      { id: "fl-windmill", point: [2.5, 25], clue: "In the windmill's lee, out of the wind." },
      { id: "fl-apothecary", point: [-16.6, 1.4], clue: "Outside the apothecary, beside its sign." },
    ],
  },
];

const md = (m: number, d: number) => m * 100 + d;
/** The festival running at `now` (UTC), with a key unique to that year's run. */
export function activeSeason(now = Date.now()) {
  const date = new Date(now),
    year = date.getUTCFullYear(),
    today = md(date.getUTCMonth() + 1, date.getUTCDate());
  for (const s of SEASONS) {
    const from = md(...s.from),
      to = md(...s.to),
      wraps = from > to;
    if (wraps ? today >= from || today <= to : today >= from && today <= to)
      return { season: s, key: `${s.id}-${wraps && today <= to ? year - 1 : year}` };
  }
  return null;
}
/** This keeper's progress, reset when a new festival (or a new year's run) starts. */
export function seasonOf(p: Profile, now = Date.now()): SeasonState {
  const s = (p.seasons ||= { key: "", found: [], done: [] }),
    active = activeSeason(now);
  if (active && s.key !== active.key) {
    s.key = active.key;
    s.found = [];
  }
  return s;
}
