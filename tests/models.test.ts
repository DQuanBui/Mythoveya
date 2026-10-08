import { describe, expect, it } from "vitest";
import { Box3, Mesh } from "three";
import { ALL_SPECIES } from "../packages/shared/content";
import { animateCreature, createCreature } from "../apps/client/src/models";

function colors(id: string, shimmer = false) {
  const model = createCreature(id, shimmer);
  const colors: number[] = [];
  model.traverse((child) => {
    if (child instanceof Mesh && child.geometry.attributes.color)
      colors.push(...child.geometry.attributes.color.array.slice(0, 18));
  });
  return colors;
}

describe("companion rendering recipes", () => {
  it("isolates cached shimmer colors from normal creatures in either construction order", () => {
    const before = colors("emberfox");
    const rare = colors("emberfox", true);
    expect(rare).not.toEqual(before);
    expect(colors("emberfox")).toEqual(before);
    expect(colors("emberfox", true)).toEqual(rare);
    const shimmerFirst = colors("ripplefin", true);
    expect(colors("ripplefin")).not.toEqual(shimmerFirst);
    expect(colors("ripplefin", true)).toEqual(shimmerFirst);
  });

  it("builds and animates normal and shimmering recipes for every species and evolution", () => {
    for (const species of ALL_SPECIES) {
      for (const shimmer of [false, true]) {
        const model = createCreature(species.id, shimmer);
        animateCreature(model, 2, "ultimate", 0.5);
        const box = new Box3().setFromObject(model);
        expect(box.isEmpty(), species.id).toBe(false);
        expect(Number.isFinite(box.max.y), species.id).toBe(true);
        expect(model.userData.shimmer).toBe(shimmer);
        if (shimmer) {
          animateCreature(model, 20, "idle", 0, true);
          expect(model.userData.glints.rotation.y).toBe(0);
          expect(model.userData.glints.children).toHaveLength(3);
        }
      }
    }
  });
});

it("returns from attacks cleanly and preserves authored tails during animation", () => {
  const model = createCreature("bloomanta");
  animateCreature(model, 1, "attack", .5);
  expect(model.userData.rig.position.z).toBeGreaterThan(0);
  animateCreature(model, 2, "idle");
  expect(model.userData.rig.position.z).toBe(0);
  expect(model.getObjectsByProperty("name", "bloomanta-ribbon")).toHaveLength(2);
  const sleeping = createCreature("reedlet");
  animateCreature(sleeping, 3, "sleep");
  expect(sleeping.userData.eyes.every((eye: any) => eye.scale.y < .1)).toBe(true);
  animateCreature(sleeping, 3, "idle", 0, true);
  expect(sleeping.userData.eyes.every((eye: any) => eye.scale.y === 1)).toBe(true);
});
