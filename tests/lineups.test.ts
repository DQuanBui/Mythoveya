import { describe, expect, it } from "vitest";
import { ALL_SPECIES, byId } from "../packages/shared/content";
import { suggestTeam, teamPower } from "../packages/shared/lineups";
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
describe("teamPower", () => {
  it("adds up the companions it can find", () => {
    const [a, b] = ofRole("tank");
    const list = [owned(a), owned(b)];
    expect(teamPower(list, [a, b, "gone"])).toBeGreaterThan(teamPower(list, [a]));
  });
});
