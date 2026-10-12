import { useEffect, useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { byId, REGIONS } from "../../../packages/shared/content";
import {
  RALLY_HOSTS,
  rallyOf,
  rallyActivity,
  SIGNAL_NAMES,
} from "../../../packages/shared/rally";
import { Portrait } from "./portraits";
export function RallyPanel({
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
  const [now, setNow] = useState(Date.now()),
    [answers, setAnswers] = useState<Record<string, number[]>>({}),
    [companions, setCompanions] = useState<Record<string, string>>({});
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const r = rallyOf(profile, now);
  const near = (region: string) => {
    const h = RALLY_HOSTS.find((h) => h.region === region)!;
    return (
      profile.region === region &&
      !profile.island &&
      Math.hypot(position[0] - h.point[0], position[1] - h.point[1]) <= 5.8
    );
  };
  return (
    <div className="expedition-panel rally-journal">
      <p className="eyebrow">FOUR ROADS / ONE WELCOME</p>
      <h2>The Wayfarer Rally</h2>
      <p>
        Meet four hosts, help migrating companions and collect a permanent
        travel passport. Each regional activity changes daily; your stamps never
        expire.
      </p>
      <article className="expedition-objective">
        <h3>Wayfarer passport</h3>
        <div className="rally-stamps">
          {RALLY_HOSTS.map((h) => (
            <span key={h.region} data-earned={r.stamps.includes(h.region)}>
              {REGIONS.find((g) => g.id === h.region)!.name}:{" "}
              {r.stamps.includes(h.region) ? "Stamped" : "Not visited"}
            </span>
          ))}
        </div>
        <p>
          {r.stamps.length}/4 regional stamps. First successful activity in each
          region grants its new companion (or a duplicate shard).
        </p>
        {r.finished ? (
          <strong>
            Wayfarer passport complete. Keep visiting for daily activities.
          </strong>
        ) : (
          <button
            className="primary"
            disabled={busy || !near("haven") || r.stamps.length !== 4}
            onClick={() => run("rally-finish")}
          >
            Complete passport with Piper
          </button>
        )}
        <p className="muted">
          Passport reward: 200 Gold, 100 Diamonds, 150 XP and the Wayfarer
          badge. Return to Piper in Havenreach after collecting all four stamps.
        </p>
      </article>
      <p className="rally-date">
        Activity day: {r.day} UTC. One activity per region per day. Resets at
        00:00 UTC; there is no missed-day penalty.
      </p>
      <div className="expedition-grid">
        {RALLY_HOSTS.filter(
          (h) => focus === "journal" || focus === h.region,
        ).map((h) => {
          const event = rallyActivity(h.region, now),
            key = h.region + event.day,
            answer = answers[key] || [],
            done = r.completed.includes(h.region),
            owned = profile.owned.filter(
              (o) => byId[o.species].element === h.element,
            ),
            o = owned.find((o) => o.id === companions[h.region]) || owned[0],
            active = near(h.region) && !busy;
          const ready =
            event.kind === "care"
              ? !!o
              : answer.length === (event.kind === "signal" ? 3 : 1);
          return (
            <article key={h.region} aria-label={h.id}>
              <Portrait id={h.species} className="canyon-portrait" />
              <p className="eyebrow">{h.role}</p>
              <h3>{h.name}</h3>
              <p>{h.description}</p>
              <p>
                <strong>Featured companion: {byId[h.species].name}</strong>
              </p>
              <details>
                <summary>Talk with {h.host}</summary>
                <p>{h.story}</p>
              </details>
              <h4>{event.name}</h4>
              {done ? (
                <strong>Today's regional activity is complete.</strong>
              ) : (
                <>
                  {event.kind === "care" ? (
                    <>
                      <p>
                        Bring an owned {h.element} companion to help the camp.
                        Your starting team includes this element. Helping grants
                        up to 5 friendship.
                      </p>
                      <label>
                        Helping companion
                        <select
                          aria-label={`${h.host} companion`}
                          value={o?.id || ""}
                          disabled={!active || !owned.length}
                          onChange={(e) =>
                            setCompanions({
                              ...companions,
                              [h.region]: e.target.value,
                            })
                          }
                        >
                          {!owned.length && (
                            <option value="">No eligible companion</option>
                          )}
                          {owned.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nickname || byId[c.species].name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : event.kind === "survey" ? (
                    <fieldset disabled={!active}>
                      <legend>{h.clue}</legend>
                      {h.options.map((option, i) => (
                        <label className="rally-option" key={option}>
                          <input
                            type="radio"
                            name={key}
                            checked={answer[0] === i}
                            onChange={() =>
                              setAnswers({ ...answers, [key]: [i] })
                            }
                          />
                          {option}
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <>
                      <p>
                        Repeat the welcome signal in this order:{" "}
                        <strong>
                          {event.signal.map((n) => SIGNAL_NAMES[n]).join(" / ")}
                        </strong>
                        . No timer.
                      </p>
                      <fieldset disabled={!active}>
                        <legend>Welcome signal</legend>
                        {SIGNAL_NAMES.map((name, i) => (
                          <button
                            key={name}
                            disabled={answer.length >= 3}
                            onClick={() =>
                              setAnswers({ ...answers, [key]: [...answer, i] })
                            }
                          >
                            Signal {name}
                          </button>
                        ))}
                      </fieldset>
                      <p role="status">
                        {answer.length
                          ? answer.map((n) => SIGNAL_NAMES[n]).join(" / ")
                          : "No signals selected"}{" "}
                        ({answer.length}/3)
                      </p>
                      <button
                        disabled={!active || !answer.length}
                        onClick={() => setAnswers({ ...answers, [key]: [] })}
                      >
                        Clear signal
                      </button>
                    </>
                  )}
                  <button
                    className="primary"
                    disabled={!active || !ready}
                    onClick={() =>
                      run("rally-complete", {
                        quest: event.day,
                        item: event.kind,
                        id: o?.id,
                        inputs: answer,
                      })
                    }
                  >
                    Help {h.host}
                  </button>
                  {!near(h.region) && (
                    <p>Walk to this regional stop to take part.</p>
                  )}
                  <p className="muted">
                    Daily reward: 40 Gold, 10 Diamonds and 25 XP. Wrong answers
                    spend nothing.
                  </p>
                </>
              )}
              <div className="row">
                <button
                  disabled={profile.region !== h.region || !!profile.island}
                  onClick={() => track(h.id)}
                >
                  Track {h.host}
                </button>
                <button onClick={travel}>Regional waystones</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
