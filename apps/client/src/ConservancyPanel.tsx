import { useEffect, useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { REGIONS } from "../../../packages/shared/content";
import {
  OUTPOSTS,
  SUPPLY_NODES,
  MATERIALS,
  RECIPES,
  conservancyOf,
  outpostComplete,
  type Material,
} from "../../../packages/shared/conservancy";
import { Portrait } from "./portraits";
export function ConservancyPanel({
  profile,
  position,
  focus,
  busy,
  run,
  track,
  travel,
}: {
  profile: Profile;
  position: number[];
  focus: string;
  busy: boolean;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  track: (id: string) => void;
  travel: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const r = conservancyOf(profile, now),
    all = focus === "cons-journal",
    h = OUTPOSTS.find((h) => h.region === profile.region)!,
    count = OUTPOSTS.filter((h) => outpostComplete(r, h.region)).length;
  const near = (s: { region: string; point: [number, number] }) =>
    !profile.island &&
    profile.region === s.region &&
    Math.hypot(position[0] - s.point[0], position[1] - s.point[1]) <= 4.5;
  const workshop = !!h && near(h),
    ready = !busy && profile.team.length === 6;
  return (
    <div className="expedition-panel conservancy-journal">
      <p className="eyebrow">BUILD A WELCOME / LET THE WILD RETURN</p>
      <h2>Wildhaven Conservancy</h2>
      <p>
        Gather fallen supplies, craft a shelter, planter and lantern, then
        restore one refuge in each region. Spare kits can be dismantled for a
        full material refund.
      </p>
      {profile.team.length !== 6 && (
        <p>
          Meet Warden Liora and form your first six before joining the
          Conservancy.
        </p>
      )}
      <div className="conservancy-bag" aria-label="Conservancy supplies">
        <h3>Your supply bag</h3>
        <div>
          {(Object.keys(MATERIALS) as Material[]).map((m) => (
            <span key={m}>
              {MATERIALS[m]}: <strong>{r.materials[m]}</strong>
            </span>
          ))}
        </div>
        <div>
          {RECIPES.map((k) => (
            <span key={k.id}>
              {k.name}: <strong>{r.kits[k.id]}</strong>
            </span>
          ))}
        </div>
      </div>
      <p className="rally-date">
        {count}/4 refuges restored. Supply day: {r.day} UTC. Gathering and
        habitat care reset at 00:00 UTC; materials, kits and restoration never
        expire.
      </p>
      {SUPPLY_NODES.filter((n) => (all && n.region === profile.region) || n.id === focus).length > 0 && (
        <div className="expedition-grid">
          {SUPPLY_NODES.filter((n) => (all && n.region === profile.region) || n.id === focus).map((n) => (
            <article key={n.id} aria-label={n.id}>
              <h3>{n.name}</h3>
              <p>{n.description}</p>
              <p>{REGIONS.find((g) => g.id === n.region)!.name}</p>
              <button
                className="primary"
                disabled={!ready || !near(n) || r.gathered.includes(n.id)}
                onClick={() => run("cons-gather", { id: n.id, quest: r.day })}
              >
                {r.gathered.includes(n.id)
                  ? "Gathered today"
                  : `Gather ${MATERIALS[n.material]}`}
              </button>
              {!near(n) && <p>Walk to this supply site to gather.</p>}
              <button
                disabled={profile.region !== n.region || !!profile.island}
                onClick={() => track(n.id)}
              >
                Track supply site
              </button>
            </article>
          ))}
        </div>
      )}
      {(all || OUTPOSTS.some((o) => o.id === focus)) && (
        <>
          <article className="expedition-objective">
            <h3>Habitat workshop</h3>
            <p>
              Craft at any Conservancy outpost. Each restored refuge needs one
              of each kit. Dismantling refunds every ingredient; installed
              pieces cannot be dismantled.
            </p>
            {!workshop && (
              <p>Walk to your regional steward to use the workshop.</p>
            )}
            <div className="conservancy-recipes">
              {RECIPES.map((k) => (
                <div key={k.id}>
                  <h4>{k.name}</h4>
                  <p>{k.description}</p>
                  <p>
                    {Object.entries(k.cost)
                      .map(([m, n]) => `${n} ${MATERIALS[m as Material]}`)
                      .join(" + ")}
                  </p>
                  <button
                    disabled={
                      !ready ||
                      !workshop ||
                      r.kits[k.id] >= 99 ||
                      Object.entries(k.cost).some(
                        ([m, n]) => r.materials[m as Material] < n!,
                      )
                    }
                    onClick={() => run("cons-craft", { item: k.id })}
                  >
                    Craft {k.name}
                  </button>
                  <button
                    disabled={
                      !ready ||
                      !workshop ||
                      !r.kits[k.id] ||
                      Object.entries(k.cost).some(
                        ([m, n]) => r.materials[m as Material] + n! > 999,
                      )
                    }
                    onClick={() => run("cons-dismantle", { item: k.id })}
                  >
                    Dismantle {k.name}
                  </button>
                </div>
              ))}
            </div>
          </article>
          <div className="expedition-grid">
            {OUTPOSTS.filter((o) => all || o.id === focus).map((o) => (
              <article key={o.id} aria-label={o.id}>
                <p className="eyebrow">
                  {REGIONS.find((g) => g.id === o.region)!.name}
                </p>
                <h3>{o.name}</h3>
                <details>
                  <summary>Talk with {o.host}</summary>
                  <p>{o.story}</p>
                </details>
                <p>
                  {(r.installed[o.region] || []).length}/3 habitat pieces
                  installed.
                </p>
                <div className="conservancy-install">
                  {RECIPES.map((k) => (
                    <button
                      key={k.id}
                      disabled={
                        !ready ||
                        !near(o) ||
                        !r.kits[k.id] ||
                        r.installed[o.region]?.includes(k.id)
                      }
                      onClick={() =>
                        run("cons-install", { id: o.id, item: k.id })
                      }
                    >
                      {r.installed[o.region]?.includes(k.id)
                        ? `${k.name} installed`
                        : `Install ${k.name}`}
                    </button>
                  ))}
                </div>
                {outpostComplete(r, o.region) ? (
                  <>
                    <strong>Refuge restored. Wildlife has returned.</strong>
                    <p>
                      Daily habitat care uses one spare Planter kit and grants
                      25 Gold and 15 XP.
                    </p>
                    <button
                      disabled={
                        !ready ||
                        !near(o) ||
                        !r.kits.planter ||
                        r.tended.includes(o.region)
                      }
                      onClick={() =>
                        run("cons-tend", { id: o.id, quest: r.day })
                      }
                    >
                      {r.tended.includes(o.region)
                        ? "Habitat tended today"
                        : "Tend habitat"}
                    </button>
                  </>
                ) : (
                  <p>Restoration reward: 80 Gold and 40 XP, once per refuge.</p>
                )}
                <button
                  disabled={profile.region !== o.region || !!profile.island}
                  onClick={() => track(o.id)}
                >
                  Track {o.host}
                </button>
              </article>
            ))}
          </div>
          <article className="expedition-objective">
            <h3>Conservancy awards</h3>
            <p>
              Return to Juniper in Havenreach after restoring two or four
              refuges. Each companion is awarded once; if already owned, it
              grants a shard.
            </p>
            <div className="conservancy-awards">
              {["mossloom", "astralynx"].map((id, i) => (
                <div key={id}>
                  <Portrait id={id} />
                  <h4>{i ? "Astralynx" : "Mossloom"}</h4>
                  <p>
                    {i ? 4 : 2} refuges / {i ? 150 : 80} Diamonds / 50 XP
                  </p>
                  <button
                    disabled={
                      !ready ||
                      !near(OUTPOSTS[0]) ||
                      count < (i ? 4 : 2) ||
                      r.claims.includes(id)
                    }
                    onClick={() => run("cons-claim", { id })}
                  >
                    {r.claims.includes(id)
                      ? "Award claimed"
                      : `Claim ${i ? "Astralynx" : "Mossloom"}`}
                  </button>
                </div>
              ))}
            </div>
            {r.claims.includes("astralynx") && (
              <strong>
                Conservator award complete. Keep tending your refuges.
              </strong>
            )}
          </article>
        </>
      )}
      <button onClick={travel}>Regional waystones</button>
    </div>
  );
}
