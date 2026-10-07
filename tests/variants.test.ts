import { describe, expect, it, vi } from "vitest";
import { own, SHIMMER_CHANCE } from "../packages/shared/economy";
import type { Profile } from "../packages/shared/types";

const keeper = () => ({ id: "variant-test", owned: [] }) as unknown as Profile;

describe("persistent companion appearances", () => {
  it("rolls exactly one of fifty equally spaced outcomes on acquisition", () => {
    const rolls = Array.from({ length: 50 }, (_, i) =>
      own(keeper(), "emberfox", () => i / 50),
    );
    expect(rolls.filter((o) => o.shimmer)).toHaveLength(1);
    expect(own(keeper(), "emberfox", () => SHIMMER_CHANCE).shimmer).toBe(false);
  });

  it("keeps both normal and shimmering appearances through duplicate pulls and serialization", () => {
    for (const roll of [0, 0.5]) {
      const p = keeper();
      const first = own(p, "emberfox", () => roll);
      const restored: Profile = JSON.parse(JSON.stringify(p));
      const random = vi.fn(() => 1 - roll);
      const duplicate = own(restored, "emberfox", random);
      expect(random).not.toHaveBeenCalled();
      expect(duplicate.shimmer).toBe(first.shimmer);
      expect(duplicate.id).toBe(first.id);
      expect(duplicate.shards).toBe(1);
      expect(restored.owned).toHaveLength(1);
    }
  });

  it("does not reroll legacy companions or mutate them on load", () => {
    const p = keeper();
    const old = own(p, "emberfox", () => 0.5);
    delete old.shimmer;
    const random = vi.fn(() => 0);
    expect(own(p, "emberfox", random).shimmer).toBeUndefined();
    expect(random).not.toHaveBeenCalled();
  });
});
