import { describe, expect, it } from "vitest";
import { byId } from "../packages/shared/content";
import { WEATHER_SPELL_MS, weatherAt } from "../packages/shared/weather";
import { DAY_CYCLE_MS, worldHour } from "../packages/shared/world-time";
import {
  BASE_WILD,
  SPECIAL_SPECIES,
  SPECIAL_WILD,
  bondCandidate,
  specialsNow,
  wildHints,
  wildLineup,
  wildTimes,
} from "../packages/shared/wild";

const rand = () => 0.42;
describe("wild times", () => {
  it("names night and dawn from the island clock, and rain or mist from the weather", () => {
    for (let now = 0; now < DAY_CYCLE_MS * 3; now += 37000) {
      const times = wildTimes("haven", now),
        hour = worldHour(now),
        w = weatherAt(now).weather;
      expect(times.includes("night")).toBe(hour >= 19.5 || hour < 5);
      expect(times.includes("dawn")).toBe(hour >= 5 && hour < 8);
      expect(times.includes("rain")).toBe(w === "rain");
      expect(times.includes("mist")).toBe(w === "mist");
    }
  });
  it("turns Emberglass rain into mist, as its weather does", () => {
    for (let spell = 0; spell < 400; spell++) {
      const now = spell * WEATHER_SPELL_MS + 1000;
      if (weatherAt(now).weather === "rain") {
        expect(wildTimes("canyon", now)).not.toContain("rain");
        expect(wildTimes("canyon", now)).toContain("mist");
        return;
      }
    }
    throw Error("no rain found");
  });
});
describe("wild lineups", () => {
  it("keeps a keeper's first battle to the familiar six", () => {
    expect(wildLineup("haven", ["night", "rain"], 0, rand)).toEqual({ species: BASE_WILD.haven, specials: [] });
  });
  it("brings up to two creatures who are out only now, still six in all", () => {
    const { species, specials } = wildLineup("haven", ["night", "rain"], 5, rand);
    expect(species).toHaveLength(6);
    expect(new Set(species).size).toBe(6);
    expect(specials).toHaveLength(2);
    for (const s of specials) expect(specialsNow("haven", ["night", "rain"])).toContain(s);
  });
  it("is the familiar six on an ordinary clear day", () => {
    expect(wildLineup("haven", [], 5, rand).species).toEqual(BASE_WILD.haven);
  });
  it("uses Havenreach's familiar six in Whisperleaf, as before", () => {
    expect(wildLineup("meadow", [], 5, rand).species).toEqual(BASE_WILD.haven);
  });
  it("lists only real creatures humble enough to bond", () => {
    for (const s of SPECIAL_SPECIES) {
      expect(byId[s], s).toBeDefined();
      expect(["E", "D", "C"]).toContain(byId[s].tier);
    }
    for (const region of Object.keys(SPECIAL_WILD))
      for (const list of Object.values(SPECIAL_WILD[region])) for (const s of list!) expect(BASE_WILD[region]?.includes(s) ?? false).toBe(false);
  });
});
describe("bond offers", () => {
  it("prefer a creature out only now, then the first humble one", () => {
    expect(bondCandidate(["pebblit", "duskblob"], ["duskblob"])).toBe("duskblob");
    expect(bondCandidate(BASE_WILD.haven, [])).toBe("mossprig");
  });
});
describe("wildHints", () => {
  it("say where and when to look", () => {
    expect(wildHints("duskblob")).toEqual(expect.arrayContaining(["Moonfrost, any time", "Havenreach, at night"]));
    expect(wildHints("mossprig")).toContain("Havenreach, any time");
    expect(wildHints("astralynx")).toEqual([]);
  });
});
