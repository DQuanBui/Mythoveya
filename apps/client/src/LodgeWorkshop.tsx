import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { type Lodge, lodgeRecord } from "../../../packages/shared/lodges";
import { LODGE_WORKSHOPS } from "../../../packages/shared/lodge-workshops";
import { conservancyOf, MATERIALS, type Material } from "../../../packages/shared/conservancy";

export function LodgeWorkshop({ site, profile, busy, act }: {
  site: Lodge; profile: Profile; busy: boolean;
  act: (kind: string, data?: Record<string, unknown>) => Promise<any>;
}) {
  const [story, setStory] = useState(0);
  const recipe = LODGE_WORKSHOPS[site.region], record = lodgeRecord(profile, site.region);
  const supplies = conservancyOf(profile).materials;
  const costs = Object.entries(recipe.cost) as [Material, number][];
  const affordable = costs.every(([m, n]) => supplies[m] >= n);
  return <section className="lodge-workshop" aria-label="Lodge workshop">
    <p className="eyebrow">THE HOST'S WORKSHOP</p>
    <h3>{recipe.name}</h3>
    <p>{recipe.description}</p>
    {record.workshop ? <>
      <p role="status">Display built. Three stories from {site.host} are ready to read.</p>
      <div className="lodge-story-tabs" role="group" aria-label="Choose a lodge story">
        {recipe.stories.map((_, i) => <button key={i} aria-pressed={story === i} onClick={() => setStory(i)}>Story {i + 1}</button>)}
      </div>
      <p className="lodge-story" aria-live="polite">{recipe.stories[story]}</p>
    </> : <>
      <ul className="lodge-materials">
        {costs.map(([m, n]) => <li key={m}>{MATERIALS[m]}: {supplies[m]} owned / {n} needed</li>)}
      </ul>
      <p>Gather materials at Conservancy supply sites on your regional map. Building consumes the listed materials once and unlocks three host stories.</p>
      {!record.keepsake && <p>Host this lodge's gathering to open the workshop.</p>}
      {record.keepsake && !affordable && <p>More supplies are needed before you can build.</p>}
      <button disabled={busy || !record.keepsake || !affordable} onClick={() => act("lodge-workshop")}>Build {recipe.name}</button>
    </>}
  </section>;
}
