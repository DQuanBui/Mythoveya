import { describe, expect, it } from "vitest";
import { DURATION, activityPose, outingTarget, pickActivity, type Activity } from "../apps/client/src/companion-idle";

const keeper = { x: 0, z: 0 },
  from = { x: 1.5, z: 0 };
const kinds = Object.keys(DURATION) as Activity[];

describe("pickActivity", () => {
  it("never does the same thing twice in a row", () => {
    for (let index = 0; index < 8; index++)
      for (let n = 0; n < 40; n++) expect(pickActivity(n + 1, index)).not.toBe(pickActivity(n, index));
  });
  it("gets round to everything, and creatures start at different places", () => {
    expect(new Set(Array.from({ length: 8 }, (_, n) => pickActivity(n, 0)))).toEqual(new Set(kinds));
    expect(pickActivity(0, 0)).not.toBe(pickActivity(0, 1));
  });
});
describe("activityPose", () => {
  const target = outingTarget(from, keeper, 0.3);
  it("starts and ends every activity where the companion stood", () => {
    for (const kind of kinds) {
      for (const p of [0, 1]) {
        const pose = activityPose(kind, p, from, keeper, target);
        expect(pose.x).toBeCloseTo(from.x);
        expect(pose.z).toBeCloseTo(from.z);
      }
    }
  });
  it("goes out to sniff, then comes back", () => {
    const mid = activityPose("explore", 0.5, from, keeper, target);
    expect(mid.motion).toBe("sniff");
    expect(Math.hypot(mid.x - from.x, mid.z - from.z)).toBeCloseTo(2.2);
    expect(activityPose("explore", 0.15, from, keeper, target).motion).toBe("walk");
    expect(activityPose("explore", 0.85, from, keeper, target).motion).toBe("walk");
  });
  it("runs a lap at the distance it was standing", () => {
    for (const p of [0.2, 0.5, 0.8]) {
      const pose = activityPose("circle", p, from, keeper, target);
      expect(Math.hypot(pose.x, pose.z)).toBeCloseTo(1.5);
      expect(pose.motion).toBe("walk");
    }
  });
  it("digs, plays and looks about on the spot", () => {
    for (const kind of ["dig", "play", "look"] as const) {
      const pose = activityPose(kind, 0.5, from, keeper, target);
      expect(pose).toEqual({ ...from, motion: kind, phase: 0.5 });
    }
  });
});
describe("outingTarget", () => {
  it("wanders away from the keeper, not into them", () => {
    for (let seed = 0; seed < 1; seed += 0.05) {
      const t = outingTarget(from, keeper, seed);
      expect(Math.hypot(t.x, t.z)).toBeGreaterThan(Math.hypot(from.x, from.z));
    }
  });
  it("heads for something worth a sniff, stopping just short of it", () => {
    const t = outingTarget(from, keeper, 0, { x: 4.5, z: 4 });
    expect(Math.hypot(4.5 - t.x, 4 - t.z)).toBeCloseTo(0.8);
  });
});
