import { describe, expect, it } from "vitest";
import { byId } from "../packages/shared/content";
import { WEATHER_SPELL_MS, weatherAt } from "../packages/shared/weather";
import { DAY_CYCLE_MS, worldHour } from "../packages/shared/world-time";
import {
  BASE_WILD,
  SPECIAL_SPECIES,
  SPECIAL_WILD,
  bondCandidate,
  matchesWildFilter,
  noteSeen,
  seenOrOwned,
  specialLevel,
  wildEase,
  wildLevelGap,
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
  it("keeps a keeper's first battles to the familiar six, until other regions open", () => {
    for (const wins of [0, 1, 4]) expect(wildLineup("haven", ["night", "rain"], wins, rand)).toEqual({ species: BASE_WILD.haven, specials: [] });
    expect(wildLineup("haven", ["night", "rain"], 5, rand).specials.length).toBe(2);
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
describe("the Journal's when-to-meet filter", () => {
  it("shows everyone with no filter, and who is out now with 'now'", () => {
    expect(matchesWildFilter("astralynx", "", "haven", [])).toBe(true);
    expect(matchesWildFilter("duskblob", "now", "haven", ["night"])).toBe(true);
    expect(matchesWildFilter("duskblob", "now", "haven", ["rain"])).toBe(false);
  });
  it("finds a creature by its time in any region", () => {
    expect(matchesWildFilter("murkfang", "night", "haven", [])).toBe(true);
    expect(matchesWildFilter("mossprig", "night", "haven", [])).toBe(false);
  });
});
describe("specialLevel", () => {
  it("brings newcomers in a little below the usual level, never below 1", () => {
    expect(specialLevel(1)).toBe(1);
    expect(specialLevel(10)).toBe(6);
    expect(specialLevel(30)).toBeLessThan(30);
  });
});
describe("the Journal's seen list", () => {
  it("adds new creatures once, and leaves an untouched save alone", () => {
    const p: { seen?: string[]; owned: { species: string }[] } = { owned: [{ species: "emberfox" }] };
    noteSeen(p, []);
    expect(p.seen).toBeUndefined();
    noteSeen(p, ["mossprig", "duskblob", "mossprig"]);
    expect(p.seen).toEqual(["mossprig", "duskblob"]);
    expect(seenOrOwned(p)).toEqual(new Set(["mossprig", "duskblob", "emberfox"]));
  });
});
describe("new keepers' first wild battles", () => {
  it("keep the very first at half strength, as before", () => {
    expect(wildEase(0)).toEqual({ hp: 0.5, attack: 0.6 });
  });
  it("go a little easy for two more, then not at all until the margin narrows", () => {
    expect(wildEase(1)).toEqual({ hp: 0.8, attack: 0.85 });
    expect(wildEase(3)).toBeNull();
    expect(wildEase(9)).toBeNull();
  });
  it("widen the level margin for the first ten wins, then taper the ease off by the twentieth", () => {
    expect(wildLevelGap(9)).toBe(2);
    expect(wildLevelGap(10)).toBe(1);
    const eases = Array.from({ length: 10 }, (_, i) => wildEase(10 + i)!.hp);
    for (let i = 1; i < eases.length; i++) expect(eases[i]).toBeGreaterThan(eases[i - 1]);
    expect(eases.at(-1)).toBeLessThan(1);
    expect(wildEase(20)).toBeNull();
  });
});
