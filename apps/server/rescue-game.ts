import type { Profile } from "../../packages/shared/types";
import { byId } from "../../packages/shared/content";
import { RESCUES, rescueOf, fieldAbility } from "../../packages/shared/rescue";
export function rescueMutation(p:Profile,kind:string,v:{id?:string; companion?:string; inputs?:number[]; quest?:string}) {
  const site=RESCUES.find(s=>s.id===v.id && s.region===p.region);
  if(!site || p.island) throw Error("Visit the rescue site in this mainland region.");
  if(p.team.length!==6) throw Error("Form a team of six first.");
  const state=structuredClone(rescueOf(p));
  const record=state.sites[site.region] || {surveyed:false,helpers:[]};
  if(kind==="rescue-survey") {
    if(record.surveyed) throw Error("This site is already surveyed.");
    record.surveyed=true;
    state.sites[site.region]=record;p.rescue=state;
    return {message:site.observation};
  }
  if(!record.surveyed) throw Error("Survey the site with its keeper first.");
  if(kind==="rescue-help") {
    const index=record.helpers.length,step=site.steps[index];
    if(!step || record.outcome) throw Error("All field tasks are already complete.");
    if(v.inputs?.length!==1 || v.inputs[0]!==index) throw Error("The task changed. Review the current field task.");
    const helper=p.owned.find(o=>o.id===v.companion && p.team.includes(o.id));
    if(!helper) throw Error("Choose a companion from your active team.");
    if(fieldAbility(byId[helper.species].element)!==step.ability) throw Error("This companion has a different field ability. Nothing was spent.");
    record.helpers.push({companion:helper.id,species:helper.species,ability:step.ability});
    helper.friendship=Math.min(100,(helper.friendship||0)+2);
    state.sites[site.region]=record;p.rescue=state;
    return {message:step.result+" +2 friendship for "+byId[helper.species].name+"."};
  }
  throw Error("Unknown rescue action.");
}
