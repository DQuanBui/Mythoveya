import { act, makeBattle } from "../packages/shared/combat";
import { expect, it } from "vitest";
import {
  CANYON_BEACONS,
  CANYON_EXTENT,
  CANYON_PATHS,
  CANYON_SPRINGS,
  CANYON_STOPS,
  canyonHeight,
  canyonOf,
  canyonWalkable,
} from "../packages/shared/canyon";
import { buildGrid, findPath, lineClear } from "../packages/shared/pathfind";
import type { Profile } from "../packages/shared/types";
it("connects every canyon stop to camp without crossing water or solid scenery", () => {
  const grid = buildGrid(canyonWalkable, CANYON_EXTENT);
  for (const s of CANYON_STOPS) {
    expect(canyonWalkable(...s.point), s.name).toBe(true);
    const route = findPath(grid, [0, 5], s.point, canyonWalkable);
    expect(route, s.name).not.toBeNull();
    let previous: [number, number] = [0, 5];
    for (const step of route!) {
      expect(lineClear(previous, step, canyonWalkable), s.name).toBe(true);
      previous = step;
    }
    expect(
      Math.hypot(previous[0] - s.point[0], previous[1] - s.point[1]),
    ).toBeLessThan(1);
  }
});
it("keeps trails graded, springs blocked and old saves unchanged", () => {
  for (const p of CANYON_PATHS)
    for (let i = 1; i < p.length; i++)
      for (let t = 0; t <= 1; t += 0.05) {
        const x = p[i - 1][0] * (1 - t) + p[i][0] * t,
          z = p[i - 1][1] * (1 - t) + p[i][1] * t;
        expect(canyonWalkable(x, z), `${x},${z}`).toBe(true);
        expect(
          Math.abs(canyonHeight(x + 0.1, z) - canyonHeight(x - 0.1, z)) / 0.2,
        ).toBeLessThan(0.5);
      }
  for (const p of CANYON_SPRINGS) expect(canyonWalkable(p.x, p.z)).toBe(false);
  const old = {} as Profile;
  expect(canyonOf(old).beacons).toEqual([]);
  expect(old.canyon).toBeUndefined();
  expect(new Set(CANYON_STOPS.map((s) => s.id)).size).toBe(CANYON_STOPS.length);
  expect(
    CANYON_BEACONS.every(
      (n) => n.code.length === 3 && n.code.every((c) => c >= 0 && c <= 2),
    ),
  ).toBe(true);
});

it("applies sentinel shell, surge and cooling modifiers to actual combat damage",()=>{
 const owned=(species:string)=>({id:species,species,level:1,xp:0,shards:0,upgrade:0,locked:false});
 const base=makeBattle('sentinel-phases',[[owned('emberfox')],[owned('cindervane')]],'pve',17);
 const damage=(round:number,side:0|1,encounter?:'canyon')=>{
   const b=structuredClone(base);b.encounter=encounter;b.round=round;b.queue=[`${side}:0`,`${1-side}:0`];b.readyAt=0;
   const target=b.units.find(u=>u.side!==side)!;target.hp=target.maxHp=1000;
   act(b,side,0,target.id,100000,true);return 1000-target.hp;
 };
 expect(Math.abs(damage(1,0,'canyon')-damage(1,0)*.65)).toBeLessThanOrEqual(1);
 expect(Math.abs(damage(2,1,'canyon')-damage(2,1)*1.5)).toBeLessThanOrEqual(1);
 expect(Math.abs(damage(3,0,'canyon')-damage(3,0)*1.75)).toBeLessThanOrEqual(1);
 expect(damage(2,0,'canyon')).toBe(damage(2,0));
});

it("keeps the ranger shelter foundation level across its full footprint",()=>{
 for(const x of [-26.3,-24,-21.7]) for(const z of [28,30,32]) expect(canyonHeight(x,z)).toBe(2.5);
});
