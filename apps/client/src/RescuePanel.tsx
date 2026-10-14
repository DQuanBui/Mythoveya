import {useEffect,useState} from "react";
import type {Profile} from "../../../packages/shared/types";
import {byId,REGIONS} from "../../../packages/shared/content";
import {RESCUES,FIELD_ABILITIES,fieldAbility,rescueOf,rescueRecord,rescueCount,type Rescue} from "../../../packages/shared/rescue";
import {Portrait} from "./portraits";
type Props={profile:Profile;position:number[];focus:string;busy:boolean;run:(kind:string,data?:Record<string,unknown>)=>Promise<any>;track:(id:string)=>void;travel:()=>void;formation:()=>void};
function Incident({site:s,...props}:Props&{site:Rescue}){
 const {profile,position,busy,run,track,travel,formation}=props,r=rescueRecord(profile,s.region),index=r.helpers.length,step=s.steps[index],
  [chosen,setChosen]=useState(""),local=profile.region===s.region&&!profile.island,
  near=local&&Math.hypot(position[0]-s.point[0],position[1]-s.point[1])<=4.5,
  ready=near&&!busy&&profile.team.length===6,
  six=profile.team.map(id=>profile.owned.find(o=>o.id===id)).filter(o=>!!o),helper=six.find(o=>o.id===chosen),
  eligible=helper&&step&&fieldAbility(byId[helper.species].element)===step.ability;
 useEffect(()=>setChosen(""),[index]);
 return <article className="rescue-incident">
  <p className="eyebrow">{REGIONS.find(r=>r.id===s.region)?.name}</p><h3>{s.name}</h3><p><strong>{s.host}:</strong> {s.story}</p>
  {local?<button onClick={()=>track(s.id)}>Walk to {s.host}</button>:<button onClick={travel}>Travel to {REGIONS.find(r=>r.id===s.region)?.name}</button>}
  {!near&&<p className="rescue-hint">Meet {s.host} at the site to survey, help, or claim a reward. Emberglass opens after two battle wins; Moonfrost after five.</p>}
  {!r.surveyed?<section><h4>Look before you help</h4><p>Survey the site together. No items, energy or currency are consumed.</p><button disabled={!ready} onClick={()=>run("rescue-survey",{id:s.id})}>Survey the rescue site</button></section>:<>
   <blockquote>{s.observation}</blockquote>
   <ol className="rescue-history" aria-label="Completed field tasks">{r.helpers.map((h,i)=><li key={i}><strong>{s.steps[i].title}</strong><span>{byId[h.species].name} used {FIELD_ABILITIES[h.ability].name}. {s.steps[i].result}</span></li>)}</ol>
   {step&&!r.outcome&&<section aria-label="Current field task"><p className="eyebrow">FIELD TASK {index+1} / 3</p><h4>{step.title}</h4><p>{step.detail}</p>
    <p>Choose an active companion. Each successful task gives that companion 2 friendship, up to 100.</p>
    <div className="rescue-team" aria-label="Field companions">{six.map(o=>{const species=byId[o.species],ability=fieldAbility(species.element),matches=ability===step.ability;return <button key={o.id} aria-pressed={chosen===o.id} onClick={()=>setChosen(o.id)} disabled={busy} className={matches?"rescue-match":""} aria-label={`${species.name} / ${FIELD_ABILITIES[ability].name}`}><Portrait id={o.species} shimmer={o.shimmer} className="rescue-portrait"/><span><strong>{o.nickname||species.name}</strong><small>{FIELD_ABILITIES[ability].name} / {species.element}</small><small>{matches?"Can help with this task":"A different field ability"}</small></span></button>;})}</div>
    <button disabled={!ready||!eligible} onClick={()=>run("rescue-help",{id:s.id,companion:chosen,inputs:[index]})}>Help with {FIELD_ABILITIES[step.ability].name}</button>
    {!six.some(o=>fieldAbility(byId[o.species].element)===step.ability)&&<p>Your active team needs {FIELD_ABILITIES[step.ability].elements.join(" or ")}. Your first six companions cover every field ability.</p>}
    <button disabled={busy} onClick={formation}>Change active team</button>
   </section>}
   {!step&&!r.outcome&&<section aria-label="Rescue ending"><h4>Leave a welcome behind</h4><p>Both choices give the same one-time reward: 70 Gold, 20 Diamonds and 25 XP. Your choice changes this site's scenery and is saved permanently.</p><div className="rescue-outcomes"><button disabled={!ready} onClick={()=>run("rescue-finish",{id:s.id,quest:"shelter"})}><strong>Build a sheltered rest</strong><span>Add a canopy; wildlife stays close to the keeper.</span></button><button disabled={!ready} onClick={()=>run("rescue-finish",{id:s.id,quest:"wild"})}><strong>Keep an open wildlife route</strong><span>Add trail flags; wildlife roams the clearing.</span></button></div></section>}
   {r.outcome&&<section className="rescue-ending"><h4>Rescue complete / {r.outcome==="shelter"?"Sheltered rest":"Open wildlife route"}</h4><p>{s.ending}</p><p>The three helpers and your ending are saved. This site has no daily reset.</p></section>}
  </>}
  <section><h4>Companions who choose to follow</h4>{([['reedrake',2],['solmole',4]] as const).map(([id,n])=><div className="rescue-reward" key={id}><Portrait id={id} className="rescue-portrait"/><span><strong>{byId[id].name}</strong><small>Complete {n} rescues in any order.</small></span><button disabled={!ready||rescueCount(profile)<n||rescueOf(profile).claims.includes(id)} onClick={()=>run("rescue-claim",{id:s.id,species:id})}>{rescueOf(profile).claims.includes(id)?`${byId[id].name} welcomed`:`Welcome ${byId[id].name}`}</button></div>)}</section>
 </article>;
}
export function RescuePanel(props:Props){
 const initial=RESCUES.findIndex(s=>s.id===props.focus),[selected,setSelected]=useState(initial>=0?initial:Math.max(0,RESCUES.findIndex(s=>s.region===props.profile.region)));
 useEffect(()=>{const i=RESCUES.findIndex(s=>s.id===props.focus);if(i>=0)setSelected(i);},[props.focus]);
 return <div className="rescue-journal"><p className="eyebrow">SMALL PAWS / SHARED PATHS</p><h2>Wildbound Rescues</h2><p>Your companions can change the world beyond battle. Meet the keepers, observe each incident, then choose a suitable helper for three field tasks.</p><p className="rescue-progress">{rescueCount(props.profile)}/4 rescues complete{rescueCount(props.profile)===4?" / Trailkeeper award earned":""}</p>{props.profile.team.length!==6&&<p>Meet Warden Liora and form your first six companions to begin.</p>}
 <div className="rescue-tabs" aria-label="Rescue regions">{RESCUES.map((s,i)=><button key={s.id} aria-pressed={i===selected} onClick={()=>setSelected(i)}>{s.host}{rescueRecord(props.profile,s.region).outcome?" / Complete":""}</button>)}</div>
 <Incident key={RESCUES[selected].id} {...props} site={RESCUES[selected]}/>
 <details><summary>Companion field abilities</summary>{Object.values(FIELD_ABILITIES).map(a=><p key={a.name}><strong>{a.name} ({a.elements.join(" / ")})</strong> {a.description}</p>)}</details></div>;
}
