import { describe, expect, it } from "vitest";
import { ALL_SPECIES, byId } from "../packages/shared/content";
import { companionChoices, recentLineups, suggestTeam, teamPower } from "../packages/shared/lineups";
import type { Owned } from "../packages/shared/types";

const owned = (species: string, level = 1): Owned => ({ id: species, species, level, xp: 0, shards: 0, upgrade: 0, locked: false });
const ofRole = (role: string) => ALL_SPECIES.filter((s) => s.role === role).map((s) => s.id);

describe("suggestTeam", () => {
  it("picks six different companions, tanks in front and healers behind", () => {
    const list = [...ofRole("striker").slice(0, 4), ...ofRole("healer").slice(0, 2), ...ofRole("tank").slice(0, 2), ...ofRole("support").slice(0, 2)].map((s) => owned(s, 5));
    const team = suggestTeam(list);
    expect(new Set(team).size).toBe(6);
    expect(byId[team[0]].role).toBe("tank");
    expect(byId[team[5]].role).toBe("healer");
  });
  it("keeps a tank and a healer even when they are the weakest", () => {
    const strong = ofRole("striker").slice(0, 8).map((s) => owned(s, 30)),
      team = suggestTeam([...strong, owned(ofRole("tank")[0]), owned(ofRole("healer")[0])]);
    expect(team.length).toBe(6);
    expect(team.map((id) => byId[id].role)).toEqual(expect.arrayContaining(["tank", "healer"]));
  });
  it("otherwise takes the most powerful, and returns all of a small collection", () => {
    const low = ofRole("striker").slice(0, 3).map((s) => owned(s)),
      high = [...ofRole("tank").slice(0, 3), ...ofRole("healer").slice(0, 3)].map((s) => owned(s, 40));
    expect(suggestTeam([...low, ...high]).sort()).toEqual(high.map((o) => o.id).sort());
    expect(suggestTeam(low).sort()).toEqual(low.map((o) => o.id).sort());
  });
});
describe("companionChoices", () => {
  const list = [owned(ofRole("tank")[0], 3), owned(ofRole("striker")[0], 30), owned(ofRole("healer")[0], 9)];
  it("keeps the save's order until asked otherwise, and leaves the save's array alone", () => {
    const before = list.map((o) => o.id);
    expect(companionChoices(list, "", "").map((o) => o.id)).toEqual(before);
    companionChoices(list, "", "level");
    expect(list.map((o) => o.id)).toEqual(before);
  });
  it("sorts by level and by name", () => {
    expect(companionChoices(list, "", "level").map((o) => o.level)).toEqual([30, 9, 3]);
    const names = companionChoices(list, "", "name").map((o) => byId[o.species].name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
  it("narrows to one element", () => {
    const element = byId[list[1].species].element;
    expect(companionChoices(list, element, "").every((o) => byId[o.species].element === element)).toBe(true);
    expect(companionChoices(list, element, "").length).toBeGreaterThan(0);
  });
});
describe("teamPower", () => {
  it("adds up the companions it can find", () => {
    const [a, b] = ofRole("tank");
    const list = [owned(a), owned(b)];
    expect(teamPower(list, [a, b, "gone"])).toBeGreaterThan(teamPower(list, [a]));
  });
});
describe("recentLineups", () => {
  const ids = ofRole("striker").slice(0, 8),
    a = ids.slice(0, 6),
    b = ids.slice(1, 7),
    c = ids.slice(2, 8);
  const owned_ = ids.map((s) => owned(s));
  it("lists the newest first and leaves out the current team", () => {
    expect(recentLineups({ owned: owned_, savedFormations: [a, b, c] }, c)).toEqual([b, a]);
  });
  it("skips teams with a companion no longer owned, and copes with old saves", () => {
    expect(recentLineups({ owned: owned_.slice(0, 6), savedFormations: [a, b] }, [])).toEqual([a]);
    expect(recentLineups({ owned: owned_ }, a)).toEqual([]);
  });
  it("keeps to the limit", () => {
    expect(recentLineups({ owned: owned_, savedFormations: [a, b, c] }, [], 2)).toEqual([c, b]);
  });
});
