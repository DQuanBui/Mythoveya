import { useEffect, useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { byId } from "../../../packages/shared/content";
import {
  DISCOVERIES,
  EXPEDITION_STOPS,
  FIELD_HOUSES,
  FIELD_NODES,
  discoveryWindow,
  expeditionObjective,
  expeditionOf,
  fieldCompanions,
} from "../../../packages/shared/wildwood";
import { worldHour } from "../../../packages/shared/world-time";
import { weatherAt } from "../../../packages/shared/weather";
import { Portrait } from "./portraits";

export function ExpeditionPanel({
  profile,
  position,
  focus,
  run,
  track,
  begin,
  busy,
}: {
  profile: Profile;
  position: number[];
  focus: string;
  busy: boolean;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  track: (id: string) => void;
  begin: () => void;
}) {
  const [selected, select] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const e = expeditionOf(profile),
    objective = expeditionObjective(profile);
  const near = (id: string) => {
    const p = EXPEDITION_STOPS.find((s) => s.id === `exp-${id}`)!.point;
    return (
      profile.region === "haven" &&
      !profile.island &&
      Math.hypot(position[0] - p[0], position[1] - p[1]) <= 5.8
    );
  };
  const ready = FIELD_NODES.every((n) => e.repaired.includes(n.id));
  const travel = (id: string) => (
    <button onClick={() => track(`exp-${id}`)}>Track route</button>
  );
  const visible = (id: string) => focus === "journal" || focus === id;
  return (
    <div className="expedition-panel">
      <p className="eyebrow">WESTERN HAVENREACH · A COMPANION JOURNEY</p>
      <h2>{e.restored ? "A wind worth remembering" : "The Silent Windmill"}</h2>
      <p>
        The village windmill has fallen quiet. Explore Reedwater with your
        companions, recover its missing pieces, and calm the keeper of the
        western winds.
      </p>
      <div className="expedition-objective">
        <strong>{objective.title}</strong>
        <p>{objective.text}</p>
        {travel(objective.id)}
      </div>
      {focus !== "journal" && (
        <p className="muted">
          Your journal also opens from the Adventure board or pause menu.
        </p>
      )}
      <div className="expedition-grid">
        {visible("mill") && (
          <article>
            <h3>The windmill notice</h3>
            <p>
              “A warm lens, a waterwheel pin, a wooden spindle. Bring them home,
              and the sails will sing again.”
            </p>
            <p>
              {e.repaired.length}/3 pieces · Guardian{" "}
              {e.guardian ? "calmed" : "restless"}
            </p>
            {e.restored ? (
              <strong>
                The sails are turning. Galehart remembers your kindness.
              </strong>
            ) : (
              <button
                className="primary"
                disabled={
                  busy ||
                  !near("mill") ||
                  (e.started && (!ready || !e.guardian))
                }
                onClick={() => run(e.started ? "exp-restore" : "exp-start")}
              >
                {e.started
                  ? "Restore the windmill"
                  : "Begin the windmill journey"}
              </button>
            )}
            {!near("mill") && (
              <p className="muted">Walk to the windmill to read its notice.</p>
            )}
            {travel("mill")}
            <p className="muted">
              Restoration: Galehart companion, 200 gold and 50 diamonds. An
              already owned Galehart grants a shard.
            </p>
          </article>
        )}
        {FIELD_NODES.filter((n) => visible(n.id)).map((n) => {
          const choices = fieldCompanions(profile, n.element),
            companion =
              choices.find((o) => o.id === selected[n.id]) || choices[0],
            done = e.repaired.includes(n.id);
          return (
            <article key={n.id}>
              <p className="eyebrow">
                {n.element.toUpperCase()} · {n.ability.toUpperCase()}
              </p>
              <h3>{n.name}</h3>
              <p>{n.text}</p>
              {done ? (
                <strong>Piece recovered · +5 friendship earned</strong>
              ) : (
                <>
                  {companion && (
                    <div className="field-partner">
                      <Portrait
                        id={companion.species}
                        shimmer={companion.shimmer}
                      />
                      <label>
                        Field companion
                        <select
                          aria-label={`${n.name} companion`}
                          value={companion.id}
                          onChange={(ev) =>
                            select({ ...selected, [n.id]: ev.target.value })
                          }
                        >
                          {choices.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.nickname || byId[o.species].name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  <button
                    className="primary"
                    disabled={busy || !e.started || !companion || !near(n.id)}
                    onClick={() =>
                      run("exp-field", { quest: n.id, id: companion.id })
                    }
                  >
                    Use {n.ability}
                  </button>
                  <p className="muted">
                    {!e.started
                      ? "Begin at the windmill first."
                      : !choices.length
                        ? `Bond with a ${n.element} companion first.`
                        : !near(n.id)
                          ? "Walk to this site to use your companion's ability."
                          : "Any owned companion can help, even outside your team."}
                  </p>
                </>
              )}
              {travel(n.id)}
            </article>
          );
        })}
        {visible("guardian") && (
          <article>
            <Portrait id="galehart" />
            <h3>The Windrest guardian</h3>
            <p>
              Its wind mantle halves damage on odd rounds; its open core takes
              double damage on even rounds. Build energy, then strike together.
            </p>
            {e.guardian ? (
              <strong>The guardian is at peace. Return to the mill.</strong>
            ) : (
              <button
                className="primary"
                disabled={busy || !ready || !e.started || !near("guardian")}
                onClick={begin}
              >
                Calm the guardian
              </button>
            )}
            {!ready && <p className="muted">Recover all three pieces first.</p>}
            {travel("guardian")}
          </article>
        )}
        {FIELD_HOUSES.filter((h) => visible(h.id)).map((h) => (
          <article key={h.id}>
            <h3>{h.name}</h3>
            <p>{h.story}</p>
            <button
              disabled={busy || !near(h.id) || e.visits.includes(h.id)}
              onClick={() => run("exp-visit", { id: h.id })}
            >
              {e.visits.includes(h.id)
                ? "Story recorded"
                : "Record house story · +20 gold"}
            </button>
            {travel(h.id)}
          </article>
        ))}
        {DISCOVERIES.filter(
          (d) =>
            visible(d.id) || (focus === "astronomer" && d.id === "starglass"),
        ).map((d) => (
          <article key={d.id}>
            <p className="eyebrow">A CHANGE IN THE WORLD</p>
            <h3>{d.name}</h3>
            <p>{d.clue}</p>
            <p className="muted">
              Actual island time:{" "}
              {String(Math.floor(worldHour(now))).padStart(2, "0")}:00 ·{" "}
              {weatherAt(now).weather}. Visual day/night settings do not change
              discovery times.
            </p>
            <button
              disabled={
                busy ||
                !near(d.id) ||
                !discoveryWindow(d.id, now) ||
                e.discoveries.includes(d.id)
              }
              onClick={() => run("exp-discover", { id: d.id })}
            >
              {e.discoveries.includes(d.id)
                ? "Discovery recorded"
                : "Record discovery · +15 diamonds"}
            </button>
            {travel(d.id)}
          </article>
        ))}
      </div>
    </div>
  );
}
