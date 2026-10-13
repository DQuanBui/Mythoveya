import type { Profile } from "../../packages/shared/types";
import { ATLAS_CHAPTERS, atlasOf, atlasEcho } from "../../packages/shared/atlas";
import { own, gainXp } from "../../packages/shared/economy";
export function atlasMutation(p:Profile,kind:string,v:{id?:string;inputs?:number[];quest?:string},now=Date.now(),random=Math.random){
 const c=ATLAS_CHAPTERS.find(c=>c.region===p.region);
 if(!c||p.island)throw Error("Visit a mainland archive first.");
 if(p.team.length!==6)throw Error("Form a team of six first.");
 const r=atlasOf(p,now),index=ATLAS_CHAPTERS.indexOf(c);
 if(kind==="atlas-start"){
  if(c.region!=="haven"||v.id!==c.id)throw Error("Meet Aster in Havenreach first.");
  if(r.started)throw Error("Your atlas journey has already begun.");
  r.started=true;p.atlas=r;return {message:"Aster gives you an empty atlas. Read the river tablet to find its first memory."};
 }
 if(!r.started)throw Error("Begin the atlas journey with Aster first.");
 if(kind==="atlas-read"){
  if(v.id!==c.id+"-tablet")throw Error("Visit the inscription in this region.");
  if(!ATLAS_CHAPTERS.slice(0,index).every(c=>r.chapters.includes(c.region)))throw Error("Restore the earlier chapters first.");
  if(r.read.includes(c.region))throw Error("This memory is already recorded.");
  r.read.push(c.region);p.atlas=r;return {message:"Memory recorded. Return to the archivist to arrange its glyphs."};
 }
 throw Error("Unknown atlas action.");
}
