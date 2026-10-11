import { playMeadowMelody } from "./meadow-music";
import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import {
  MEADOW_SHRINES,
  MEADOW_NOTES,
  MEADOW_STOPS,
  MEADOW_TONES,
  MEADOW_VERSES,
  meadowOf,
  meadowObjective,
} from "../../../packages/shared/meadow";
import { Portrait } from "./portraits";
export function MeadowPanel({
  profile,
  position,
  focus,
  run,
  track,
  travel,
  busy,
}: {
  profile: Profile;
  position: number[];
  focus: string;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  track: (id: string) => void;
  travel: () => void;
  busy: boolean;
}) {
  const m = meadowOf(profile),
    goal = meadowObjective(profile),
    inMeadow = profile.region === "meadow" && !profile.island;
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const near = (id: string) => {
    const s = MEADOW_STOPS.find((s) => s.id === `mea-${id}`)!;
    return (
      inMeadow &&
      Math.hypot(position[0] - s.point[0], position[1] - s.point[1]) <= 5.8
    );
  };
  const visible = (id: string) => focus === "journal" || focus === id;
  const route = (id: string) => (
    <button disabled={!inMeadow} onClick={() => track(`mea-${id}`)}>
      Track route
    </button>
  );
  return (
    <div className="expedition-panel meadow-journal">
      <p className="eyebrow">WHISPERLEAF MEADOW / A WOODLAND JOURNEY</p>
      <h2>The Forest Choir</h2>
      <p>
        The old heartroot has fallen quiet. Help Rowan answer three woodland
        verses and bring the forest choir back to life.
      </p>
      {!inMeadow && (
        <article className="expedition-objective">
          <p>
            Whisperleaf is open as soon as your team of six is ready. No battle
            victories are needed.
          </p>
          <button onClick={travel}>Open regional waystones</button>
        </article>
      )}
      <article className="expedition-objective">
        <strong>{m.finished ? "The woodland sings again" : goal.name}</strong>
        <p>
          {m.finished
            ? "The heartroot is flowering. Your Grove Listener badge is earned; the optional field notes remain available."
            : goal.description}
        </p>
        <p>
          {m.choirs.length}/3 choirs restored / {m.notes.length}/2 field notes
        </p>
        {route(goal.id.slice(4))}
      </article>
      <div className="expedition-grid">
        {visible("lodge") && (
          <article aria-label="mea-lodge">
            <h3>Rowan's woodland lodge</h3>
            <p>
              The forest speaks in Root, Rain and Wing. Read each verse in
              order, then play its words on the chimes. A wrong answer costs
              nothing.
            </p>
            {!m.started ? (
              <button
                className="primary"
                disabled={busy || !near("lodge")}
                onClick={() => run("mea-start")}
              >
                Begin the forest journey
              </button>
            ) : m.finished ? (
              <strong>The Forest Choir is restored.</strong>
            ) : (
              <button
                className="primary"
                disabled={busy || !near("lodge") || m.choirs.length !== 3}
                onClick={() => run("mea-finish")}
              >
                Restore the Forest Choir
              </button>
            )}
            <p className="muted">
              Return here after all three choirs: Fernibble (or a duplicate
              shard), 150 Gold, 50 Diamonds, 100 XP and the Grove Listener
              badge.
            </p>
            {!near("lodge") && (
              <p>Walk to Rowan's lodge to begin or claim restoration.</p>
            )}
            {route("lodge")}
          </article>
        )}
        {MEADOW_SHRINES.filter((s) => visible(s.id)).map((s) => {
          const verse = MEADOW_VERSES[s.id],
            answer = answers[s.id] || [],
            done = m.choirs.includes(s.id),
            active = m.started && near(s.id) && !busy;
          return (
            <article key={s.id} aria-label={`mea-${s.id}`}>
              <h3>{s.name}</h3>
              <blockquote>{verse.clue}</blockquote>
              {done ? (
                <strong>This choir is singing again.</strong>
              ) : (
                <>
                  <p>
                    Play {verse.answer.length} chimes in the order named by the
                    verse. There is no timer; sound is optional.
                  </p>
                  <fieldset className="meadow-chimes" disabled={!active}>
                    <legend>Choose your chimes</legend>
                    {MEADOW_TONES.map((t) => (
                      <button
                        key={t.id}
                        aria-label={`Play ${t.name}`}
                        disabled={answer.length >= verse.answer.length}
                        onClick={() => {
                          void playMeadowMelody([t.id]);
                          setAnswers({ ...answers, [s.id]: [...answer, t.id] });
                        }}
                      >
                        <span style={{ color: t.color }} aria-hidden="true">
                          {t.symbol}
                        </span>{" "}
                        {t.name}
                      </button>
                    ))}
                  </fieldset>
                  <p
                    className="meadow-answer"
                    role="status"
                    aria-label={`${s.name} answer`}
                  >
                    {answer.length
                      ? answer.map((n) => MEADOW_TONES[n].name).join(" → ")
                      : "No chimes selected"}{" "}
                    ({answer.length}/{verse.answer.length})
                  </p>
                  <button
                    disabled={!active || !answer.length}
                    onClick={() => void playMeadowMelody(answer)}
                  >
                    Replay selected melody
                  </button>
                  <button
                    disabled={!active || !answer.length}
                    onClick={() =>
                      setAnswers({ ...answers, [s.id]: answer.slice(0, -1) })
                    }
                  >
                    Undo last chime
                  </button>
                  <button
                    disabled={!active || !answer.length}
                    onClick={() => setAnswers({ ...answers, [s.id]: [] })}
                  >
                    Clear melody
                  </button>
                  <button
                    className="primary"
                    disabled={!active || answer.length !== verse.answer.length}
                    onClick={() =>
                      run("mea-sing", { id: s.id, inputs: answer })
                    }
                  >
                    Answer the choir
                  </button>
                  <details>
                    <summary>Show a written melody hint</summary>
                    <p>
                      {verse.answer
                        .map((n) => MEADOW_TONES[n].name)
                        .join(" → ")}
                    </p>
                  </details>
                  {!m.started ? (
                    <p>Begin the journey with Rowan first.</p>
                  ) : !near(s.id) ? (
                    <p>Walk to this choir to play its chimes.</p>
                  ) : null}
                  <p className="muted">
                    Each restored choir grants 35 Gold once. Retry freely.
                  </p>
                </>
              )}
              {route(s.id)}
            </article>
          );
        })}
        {MEADOW_NOTES.filter((n) => visible(n.id)).map((n) => (
          <article key={n.id} aria-label={`mea-${n.id}`}>
            <h3>{n.name}</h3>
            <Portrait id={n.species} className="canyon-portrait" />
            <p>{n.description}</p>
            {m.notes.includes(n.id) ? (
              <strong>Recorded in your field journal.</strong>
            ) : (
              <button
                disabled={busy || !m.started || !near(n.id)}
                onClick={() => run("mea-note", { id: n.id })}
              >
                Record woodland note
              </button>
            )}
            <p className="muted">
              Each note grants 20 Gold once after starting the journey.
            </p>
            {route(n.id)}
          </article>
        ))}
      </div>
    </div>
  );
}
