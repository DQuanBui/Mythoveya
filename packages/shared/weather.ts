// Deterministic island weather: every client and the server agree without syncing.
export type Weather = "clear" | "mist" | "rain";
export const WEATHER_SPELL_MS = 6 * 60 * 1000;

function hash(n: number) {
  let h = Math.imul(n | 0, 2654435761) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 2246822507) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967296;
}
/** Weather for a spell index; rain never follows rain, so dry spells stay common. */
function spellWeather(spell: number): Weather {
  const roll = hash(spell);
  if (roll < 0.24 && hash(spell - 1) >= 0.24) return "rain";
  if (roll < 0.42) return "mist";
  return "clear";
}
export function weatherAt(now = Date.now()) {
  const spell = Math.floor(now / WEATHER_SPELL_MS),
    into = (now % WEATHER_SPELL_MS) / WEATHER_SPELL_MS;
  return {
    weather: spellWeather(spell),
    next: spellWeather(spell + 1),
    /** 0..1 progress through the current spell, for smooth client blending. */
    into,
    endsAt: (spell + 1) * WEATHER_SPELL_MS,
  };
}
/** Regions translate the shared weather into their own climate. */
export function regionWeather(weather: Weather, region: string) {
  if (region === "canyon") return weather === "rain" ? "mist" : weather;
  return weather;
}
export const WEATHER_INFO: Record<Weather, { name: string; icon: string; perk: string }> = {
  clear: { name: "Clear", icon: "☀", perk: "Calm skies" },
  mist: {
    name: "Mist",
    icon: "≋",
    perk: "Skyglass caches glimmer from farther away",
  },
  rain: {
    name: "Rain",
    icon: "☂",
    perk: "Rare fish bite more often · garden crops grow faster",
  },
};
/** Rain makes rare fish likelier; mist favours the glimmer carp. */
export function fishWeights(weather: Weather) {
  if (weather === "rain") return { minnow: 0.38, carp: 0.37, skyfin: 0.25 };
  if (weather === "mist") return { minnow: 0.47, carp: 0.41, skyfin: 0.12 };
  return { minnow: 0.55, carp: 0.33, skyfin: 0.12 };
}
export const RAIN_GROWTH = 0.6;
