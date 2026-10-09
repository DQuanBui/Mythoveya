import { expect, it } from "vitest";
import { HOLLOW_EXTENT, HOLLOW_STOPS, HOLLOW_PATHS, HOLLOW_LAKE, hollowWalkable, hollowHeight } from "../packages/shared/hollow";
import { buildGrid, findPath, lineClear } from "../packages/shared/pathfind";
it("connects every Moonfrost stop around the lake and mountain obstacles",()=>{
 const grid=buildGrid(hollowWalkable,HOLLOW_EXTENT);
 for(const s of HOLLOW_STOPS){
  expect(hollowWalkable(...s.point),s.name).toBe(true);
  const path=findPath(grid,[0,5],s.point,hollowWalkable);
  expect(path,s.name).not.toBeNull();
  let prev:[number,number]=[0,5];
  for(const p of path!){expect(lineClear(prev,p,hollowWalkable),s.name).toBe(true);prev=p;}
  expect(Math.hypot(prev[0]-s.point[0],prev[1]-s.point[1])).toBeLessThan(1);
 }
});
it("keeps signed trails clear and slopes gentle, while blocking the lake",()=>{
 for(const path of HOLLOW_PATHS) for(let i=1;i<path.length;i++) for(let t=0;t<=1;t+=.025){
  const x=path[i-1][0]*(1-t)+path[i][0]*t,z=path[i-1][1]*(1-t)+path[i][1]*t;
  expect(hollowWalkable(x,z),`${x},${z}`).toBe(true);
  expect(Math.abs(hollowHeight(x,z+.1)-hollowHeight(x,z-.1))/.2).toBeLessThan(.46);
 }
 expect(hollowWalkable(HOLLOW_LAKE.x,HOLLOW_LAKE.z)).toBe(false);
 expect(hollowHeight(0,-34)).toBe(6);
 expect(new Set(HOLLOW_STOPS.map(s=>s.id)).size).toBe(HOLLOW_STOPS.length);
});
