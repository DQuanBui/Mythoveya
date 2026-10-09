import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { byId } from "../../../packages/shared/content";
import {
  CANYON_BEACONS,
  CANYON_NOTES,
  CANYON_STOPS,
  canyonOf,
  canyonObjective,
} from "../../../packages/shared/canyon";
import { Portrait } from "./portraits";
export function CanyonPanel({
  profile,
  position,
  focus,
  run,
  track,
  begin,
  travel,
  busy,
}: {
  profile: Profile;
  position: number[];
  focus: string;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  track: (id: string) => void;
  begin: () => void;
  travel: () => void;
  busy: boolean;
}) {
  const c = canyonOf(profile),
    goal = canyonObjective(profile),
    inCanyon = profile.region === "canyon" && !profile.island;
  const [chosen, select] = useState<Record<string, string>>({}),
    [codes, setCodes] = useState<Record<string, number[]>>({});
  const near = (id: string) => {
    const stop = CANYON_STOPS.find((s) => s.id === `can-${id}`)!;
    return (
      inCanyon &&
      Math.hypot(position[0] - stop.point[0], position[1] - stop.point[1]) <=
        5.8
    );
  };
  const visible = (id: string) => focus === "journal" || focus === id;
  const route = (id: string) => (
    <button disabled={!inCanyon} onClick={() => track(`can-${id}`)}>
      Track route
    </button>
  );
  return (
    <div className="expedition-panel canyon-journal">
      <p className="eyebrow">EMBERGLASS CANYON / A RANGER JOURNEY</p>
      <h2>Signals in the Stone</h2>
      <p>
        The canyon's warning lights have fallen silent. Ranger Senna asks you to
        follow the old signal trail, read its inscriptions and restore a safe
        passage for the migrating Wildbound.
      </p>
      {!inCanyon && (
        <div className="expedition-objective">
          <p>
            Emberglass opens after two battle victories. Travel there to begin;
            your journal keeps the route and every discovery.
          </p>
          <button onClick={travel}>Open regional waystones</button>
        </div>
      )}
      <div className="expedition-objective">
        <strong>{c.restored ? "The signals shine again" : goal.name}</strong>
        <p>
          {c.restored
            ? "Thermala remembers your help. Record the three field notes to earn your Canyon Naturalist badge."
            : goal.description}
        </p>
        <p>
          {c.beacons.length}/3 beacons tuned / Sentinel{" "}
          {c.guardian ? "calmed" : "restless"}
        </p>
        {route(goal.id.slice(4))}
      </div>
      <div className="expedition-grid">
        {visible("camp") && (
          <article aria-label="can-camp">
            <h3>Ranger Senna's request</h3>
            <p>
              "A warm lens, a steady tower, a singing crystal. Your companions
              can bring all three back to life. Read each inscription from left
              to right."
            </p>
            {c.restored ? (
              <strong>The canyon signals are restored.</strong>
            ) : (
              <button
                className="primary"
                disabled={
                  busy ||
                  !near("camp") ||
                  (c.started && (!c.guardian || c.beacons.length < 3))
                }
                onClick={() => run(c.started ? "can-finish" : "can-start")}
              >
                {c.started
                  ? "Restore the canyon signals"
                  : "Begin the canyon journey"}
              </button>
            )}
            {!near("camp") && (
              <p className="muted">Speak with Senna at Ashkeeper Camp.</p>
            )}
            {route("camp")}
            <p className="muted">
              Restoration: Thermala (or a duplicate shard), 220 gold and 60
              diamonds.
            </p>
          </article>
        )}
        {CANYON_BEACONS.filter((n) => visible(n.id)).map((n) => {
          const owned = profile.owned.filter(
              (o) => byId[o.species].element === n.element,
            ),
            o = owned.find((o) => o.id === chosen[n.id]) || owned[0],
            code = codes[n.id] || [0, 0, 0],
            done = c.beacons.includes(n.id);
          return (
            <article key={n.id} aria-label={`can-${n.id}`}>
              <h3>{n.name}</h3>
              <p>{n.text}</p>
              <blockquote>{n.clue}</blockquote>
              {done ? (
                <strong>Signal tuned. The lens is glowing.</strong>
              ) : (
                <>
                  {o && (
                    <Portrait
                      id={o.species}
                      shimmer={o.shimmer}
                      className="canyon-portrait"
                    />
                  )}
                  <label>
                    {n.ability} companion
                    <select
                      aria-label={`${n.name} companion`}
                      value={o?.id || ""}
                      disabled={busy || !owned.length}
                      onChange={(e) =>
                        select({ ...chosen, [n.id]: e.target.value })
                      }
                    >
                      {!owned.length && (
                        <option value="">
                          A {n.element} companion is needed
                        </option>
                      )}
                      {owned.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nickname || byId[v.species].name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset className="beacon-shutters">
                    <legend>Shutters, left to right</legend>
                    {code.map((value, i) => (
                      <label key={i}>
                        Shutter {i + 1}
                        <select
                          aria-label={`${n.name} shutter ${i + 1}`}
                          value={value}
                          disabled={busy}
                          onChange={(e) => {
                            const next = [...code];
                            next[i] = Number(e.target.value);
                            setCodes({ ...codes, [n.id]: next });
                          }}
                        >
                          {["Amber", "Violet", "Teal"].map((name, j) => (
                            <option key={name} value={j}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </fieldset>
                  <button
                    className="primary"
                    disabled={busy || !near(n.id) || !c.started || !o}
                    onClick={() =>
                      run("can-tune", { id: o?.id, quest: n.id, inputs: code })
                    }
                  >
                    Tune {n.name}
                  </button>
                  <p className="muted">
                    {!c.started
                      ? "Begin with Senna first."
                      : !near(n.id)
                        ? "Walk to this beacon to tune it."
                        : "A wrong pattern costs nothing. Use the inscription above."}{" "}
                    Reward: 40 gold and up to 5 friendship.
                  </p>
                </>
              )}
              {route(n.id)}
            </article>
          );
        })}
        {visible("guardian") && (
          <article aria-label="can-guardian">
            <h3>The Glass Sentinel</h3>
            <p>
              A Cindervane matriarch watches the arch. Its shell absorbs damage,
              then it releases a heat surge. Shield your team before attacking
              the cooling fractures.
            </p>
            {c.guardian ? (
              <strong>The sentinel is at peace.</strong>
            ) : (
              <button
                className="primary"
                disabled={busy || !near("guardian") || c.beacons.length !== 3}
                onClick={begin}
              >
                Calm the Glass Sentinel
              </button>
            )}
            <p className="muted">
              Victory: 90 gold and 100 XP, once. Losing allows another attempt.
            </p>
            {route("guardian")}
          </article>
        )}
        {CANYON_NOTES.filter((n) => visible(n.id)).map((n) => (
          <article key={n.id} aria-label={`can-${n.id}`}>
            <h3>{n.name}</h3>
            <Portrait id={n.species} className="canyon-portrait" />
            <p>{n.text}</p>
            {c.notes.includes(n.id) ? (
              <strong>Recorded in your field journal.</strong>
            ) : (
              <button
                disabled={busy || !near(n.id)}
                onClick={() => run("can-note", { id: n.id })}
              >
                Record field note
              </button>
            )}
            {route(n.id)}
            <p className="muted">15 gold for each new note.</p>
          </article>
        ))}
      </div>
      <article className="expedition-objective">
        <h3>Canyon Naturalist</h3>
        <p>
          {c.notes.length}/3 field notes recorded. Return to Senna for your
          survey badge and 35 diamonds.
        </p>
        {c.fieldReward ? (
          <strong>Naturalist badge earned.</strong>
        ) : (
          <button
            disabled={busy || c.notes.length !== 3 || !near("camp")}
            onClick={() => run("can-field-reward")}
          >
            Claim survey reward
          </button>
        )}
        {route("camp")}
      </article>
      {focus !== "journal" && (
        <p className="muted">
          Open the complete canyon journal from Adventure or the pause menu.
        </p>
      )}
    </div>
  );
}
