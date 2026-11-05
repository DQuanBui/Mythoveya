import { describe, expect, it } from "vitest";
import { AWAY, birdPose, FLIGHT, flock } from "../apps/client/src/bird-flock";

describe("ground birds", () => {
  it("peck about on the ground while the keeper is away", () => {
    const [b] = flock(0, 5, 1, 1);
    const pose = birdPose(b, 10, 20, 20);
    expect(pose).toMatchObject({ flying: false, visible: true });
    expect(pose.lift).toBeLessThan(0.1);
  });
  it("burst up and away from a keeper who comes close, then return later", () => {
    const [b] = flock(0, 5, 1, 1);
    const up = birdPose(b, 10, b.x - 1, b.z),
      later = birdPose(b, 10 + FLIGHT * 0.75, b.x - 1, b.z);
    expect(up.flying).toBe(true);
    expect(later.lift).toBeGreaterThan(4);
    expect(later.x).toBeGreaterThan(b.x + 4);
    expect(birdPose(b, 10 + FLIGHT + 1, 30, 30).visible).toBe(false);
    expect(birdPose(b, 10 + AWAY + 1, 30, 30)).toMatchObject({ visible: true, flying: false });
  });
});
