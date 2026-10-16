import type { Profile } from "../../../packages/shared/types";
import {
  LODGES,
  lodgeCount,
  lodgeRecord,
  lodgeOf,
} from "../../../packages/shared/lodges";
import { REGIONS } from "../../../packages/shared/content";
import "./lodges.css";
export function LodgePanel({
  profile,
  track,
  travel,
}: {
  profile: Profile;
  track: (id: string) => void;
  travel: () => void;
}) {
  return (
    <div>
      <p className="eyebrow">WAYFARER LODGES</p>
      <h2>A place at every table</h2>
      <p>
        Step inside four regional lodges. Meet the hosts, make a local supper,
        and let a companion help. Finish each gathering with a permanent
        decoration.
      </p>
      <p>
        {lodgeCount(profile)} / 4 gatherings hosted. Welcome Lumeswallow after
        two, and Velvetmoth after all four, from any lodge's gathering book.
      </p>
      <div className="lodge-entry-grid">
        {LODGES.map((s) => {
          const r = lodgeRecord(profile, s.region),
            local = profile.region === s.region && !profile.island;
          return (
            <article key={s.id}>
              <p className="eyebrow">
                {REGIONS.find((r) => r.id === s.region)?.name}
              </p>
              <h3>{s.name}</h3>
              <p>
                {s.host}: {r.keepsake ? s.ending : s.story}
              </p>
              <p>
                {r.keepsake
                  ? `Gathering complete / ${r.keepsake}`
                  : `${r.met ? "Host met" : "Meet the host"} / ${r.meal ? "Supper ready" : "Prepare supper"} / ${r.helper ? "Companion helped" : "Help with a companion"}`}
              </p>
              <button onClick={() => (local ? track(s.id) : travel())}>
                {local ? `Walk to ${s.name}` : "Travel to this region"}
              </button>
            </article>
          );
        })}
      </div>
      <p>
        Recipes use ingredients supplied by the hosts. Each gathering grants its
        reward once. Your activities and decoration survive reloads; a new
        session begins outdoors.
      </p>
      <p>
        Companions welcomed: {lodgeOf(profile).claims.length} / 2. Emberglass
        opens after two battle wins; Moonfrost after five.
      </p>
    </div>
  );
}
