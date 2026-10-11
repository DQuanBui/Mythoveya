import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { byId } from "../../../packages/shared/content";
import { HOLLOW_GATHER, HOLLOW_LANTERNS, HOLLOW_MATERIALS, HOLLOW_NOTES, HOLLOW_STOPS, LANTERN_RECIPE, canCraftLantern, hollowObjective, hollowOf, type HollowMaterial } from "../../../packages/shared/hollow";
import { Portrait } from "./portraits";
export function HollowPanel({profile,position,focus,run,track,travel,busy}:{profile:Profile;position:number[];focus:string;run:(kind:string,data?:Record<string,unknown>)=>Promise<any>;track:(id:string)=>void;travel:()=>void;busy:boolean}){
 const h=hollowOf(profile),goal=hollowObjective(profile),inHollow=profile.region==="hollow"&&!profile.island;
 const [selected,select]=useState<Record<string,string>>({});
 const near=(id:string)=>{const s=HOLLOW_STOPS.find(s=>s.id===`hol-${id}`)!;return inHollow&&Math.hypot(position[0]-s.point[0],position[1]-s.point[1])<=5.8;};
 const visible=(id:string)=>focus==="journal"||focus===id;
 const route=(id:string)=><button disabled={!inHollow} onClick={()=>track(`hol-${id}`)}>Track route</button>;
 return <div className="expedition-panel hollow-journal">
  <p className="eyebrow">MOONFROST HOLLOW / A CRAFTING JOURNEY</p><h2>The Lantern Road</h2>
  <p>Snow has swallowed the old migration lights. Help lantern maker Mira gather loose materials, craft warm trail lanterns, and guide the Wildbound home.</p>
  {!inHollow&&<article className="expedition-objective"><p>Moonfrost opens after five battle victories. Your starting companions can gather every material.</p><button onClick={travel}>Open regional waystones</button></article>}
  <article className="expedition-objective"><strong>{h.finished?"The Lantern Road shines again":goal.name}</strong><p>{h.finished?"Your lanterns light the road. Visit the field notes to learn about the creatures you helped.":goal.description}</p><p>{h.gathered.length}/3 sites gathered / {h.installed.length}/3 lanterns lit</p>{route(goal.id.slice(4))}</article>
  <section className="hollow-satchel" aria-label="Moonfrost satchel"><h3>Journey satchel</h3><div className="hollow-materials">
   {(Object.keys(HOLLOW_MATERIALS) as HollowMaterial[]).map(k=><span key={k}><strong>{h.materials[k]}</strong> {HOLLOW_MATERIALS[k]}</span>)}<span><strong>{h.lanterns}</strong> Trail lanterns</span>
  </div><p className="muted">These materials are reserved for this journey. Gather each site once; together they supply all three lanterns.</p></section>
  <div className="expedition-grid">
   {visible("workshop")&&<article aria-label="hol-workshop"><h3>Mira's lantern workshop</h3><p>“A shell of frostglass, a wick of moonreed, a heart of warmstone. Make a small light, and someone will find their way.”</p>
    {!h.started?<button className="primary" disabled={busy||!near("workshop")} onClick={()=>run("hol-start")}>Begin the lantern journey</button>:<>
     <h4>Craft a trail lantern</h4><ul className="hollow-recipe">{(Object.keys(LANTERN_RECIPE) as HollowMaterial[]).map(k=><li key={k}>{LANTERN_RECIPE[k]} {HOLLOW_MATERIALS[k]} <span>{h.materials[k]>=LANTERN_RECIPE[k]?"Ready":`Need ${LANTERN_RECIPE[k]-h.materials[k]} more`}</span></li>)}</ul>
     <button className="primary" disabled={busy||!near("workshop")||!canCraftLantern(h)} onClick={()=>run("hol-craft")}>Craft trail lantern</button>
     <p className="muted">Crafted: {h.lanterns+h.installed.length}/3. Crafting consumes the ingredients above and costs no Gold.</p>
     {h.finished?<strong>The Lantern Road is restored. Lantern Keeper badge earned.</strong>:<button disabled={busy||!near("workshop")||h.installed.length!==3} onClick={()=>run("hol-finish")}>Restore the Lantern Road</button>}
    </>}
    {!near("workshop")&&<p className="muted">Walk to Mira's workshop to begin, craft or claim restoration.</p>}
    <p className="muted">Restoration: Rimeowl (or a duplicate shard), 200 Gold, 70 Diamonds and 120 XP.</p>{route("workshop")}
   </article>}
   {HOLLOW_GATHER.filter(n=>visible(n.id)).map(n=>{const companions=profile.owned.filter(o=>byId[o.species].element===n.element),o=companions.find(o=>o.id===selected[n.id])||companions[0],done=h.gathered.includes(n.id);return <article key={n.id} aria-label={`hol-${n.id}`}>
    <h3>{n.name}</h3><p>{n.description}</p>{done?<strong>Materials gathered: {n.amount} {HOLLOW_MATERIALS[n.material]}.</strong>:<>
     {o&&<Portrait id={o.species} shimmer={o.shimmer} className="canyon-portrait"/>}
     <label>{n.ability} companion<select aria-label={`${n.name} companion`} value={o?.id||""} disabled={busy||!companions.length} onChange={e=>select({...selected,[n.id]:e.target.value})}>
      {!companions.length&&<option value="">A {n.element} companion is needed</option>}{companions.map(c=><option key={c.id} value={c.id}>{c.nickname||byId[c.species].name}</option>)}
     </select></label><button className="primary" disabled={busy||!h.started||!near(n.id)||!o} onClick={()=>run("hol-gather",{quest:n.id,id:o?.id})}>Gather {HOLLOW_MATERIALS[n.material]}</button>
     <p className="muted">{!h.started?"Begin with Mira first.":!near(n.id)?"Walk to this gathering site.":`${n.amount} materials and up to 5 companion friendship.`}</p>
    </>}{route(n.id)}
   </article>;})}
   {HOLLOW_LANTERNS.filter(n=>visible(n.id)).map(n=><article key={n.id} aria-label={`hol-${n.id}`}><h3>{n.name}</h3><p>{n.description}</p>
    {h.installed.includes(n.id)?<strong>This trail lantern is lit.</strong>:<><button className="primary" disabled={busy||!h.started||!near(n.id)||h.lanterns<1} onClick={()=>run("hol-install",{id:n.id})}>Light {n.name}</button><p className="muted">{h.lanterns<1?"Craft a lantern at Mira's workshop first.":!near(n.id)?"Walk to this lantern post.":"Uses one crafted lantern. Reward: 25 Gold."}</p></>}{route(n.id)}
   </article>)}
   {HOLLOW_NOTES.filter(n=>visible(n.id)).map(n=><article key={n.id} aria-label={`hol-${n.id}`}><h3>{n.name}</h3><Portrait id={n.species} className="canyon-portrait"/><p>{n.description}</p>
    {h.notes.includes(n.id)?<strong>Recorded in your field journal.</strong>:<button disabled={busy||!h.started||!near(n.id)} onClick={()=>run("hol-note",{id:n.id})}>Record Moonfrost note</button>}<p className="muted">Begin the journey first. Each new note grants 20 Gold.</p>{route(n.id)}
   </article>)}
  </div>
  {focus!=="journal"&&<p className="muted">Open the complete Lantern Road journal from Adventure or the pause menu.</p>}
 </div>;
}
