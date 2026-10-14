import {expect,it} from "vitest";
import {RESCUES,RESCUE_PATHS,rescueProp,rescueBlocked} from "../packages/shared/rescue";
import {atlasBlocked} from "../packages/shared/atlas";
import {conservancyBlocked} from "../packages/shared/conservancy";
import {rallyBlocked} from "../packages/shared/rally";
import {havenWalkable,groundHeight,HAVEN_PATHS} from "../packages/shared/haven";
import {meadowWalkable,meadowHeight,MEADOW_PATHS} from "../packages/shared/meadow";
import {canyonWalkable,canyonHeight,CANYON_PATHS} from "../packages/shared/canyon";
import {hollowWalkable,hollowHeight,HOLLOW_PATHS} from "../packages/shared/hollow";
import {buildGrid,findPath} from "../packages/shared/pathfind";
const rules=[[havenWalkable,groundHeight,HAVEN_PATHS,78],[meadowWalkable,meadowHeight,MEADOW_PATHS,46],[canyonWalkable,canyonHeight,CANYON_PATHS,52],[hollowWalkable,hollowHeight,HOLLOW_PATHS,52]] as const;
it("connects four rescue clearings with walkable paths and stable foundations",()=>{
 for(const [i,s] of RESCUES.entries()) {
  const [base,height,,extent]=rules[i],walk=(x:number,z:number)=>base(x,z)&&!atlasBlocked(s.region,x,z)&&!rallyBlocked(s.region,x,z)&&!conservancyBlocked(s.region,x,z)&&!rescueBlocked(s.region,x,z);
  expect(walk(...s.point),s.name+" approach").toBe(true);
  expect(findPath(buildGrid(walk,extent),[0,5],s.point,walk),s.name+" route").not.toBeNull();
  for(const path of RESCUE_PATHS[s.region])for(let n=1;n<path.length;n++)for(let t=0;t<=1;t+=.025){const a=path[n-1],b=path[n];expect(walk(a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t),s.name+" trail at "+t).toBe(true);}
  const [x,z]=rescueProp(s);
  for(let n=0;n<8;n++){const a=n*Math.PI/4;expect(base(x+1.3*Math.cos(a),z+1.3*Math.sin(a)),s.name+" foundation edge "+n).toBe(true);}
  expect(Math.abs(height(x-1,z)-height(x+1,z)),s.name+" slope").toBeLessThan(1);
 }
});
it("keeps every old and new trail clear of rescue structures",()=>{
 for(const [i,s] of RESCUES.entries())for(const path of rules[i][2])for(let n=1;n<path.length;n++)for(let t=0;t<=1;t+=.025)for(let k=0;k<8;k++) {
  const a=path[n-1],b=path[n],x=a[0]*(1-t)+b[0]*t+.45*Math.cos(k*Math.PI/4),z=a[1]*(1-t)+b[1]*t+.45*Math.sin(k*Math.PI/4);
  expect(rescueBlocked(s.region,x,z),s.name+" corridor "+x+","+z).toBe(false);
 }
});
