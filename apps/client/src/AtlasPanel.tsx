import { useEffect, useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { REGIONS } from "../../../packages/shared/content";
import {
  ATLAS_CHAPTERS,
  GLYPHS,
  atlasOf,
  atlasEcho,
  type AtlasChapter,
} from "../../../packages/shared/atlas";
import { Portrait } from "./portraits";
type Props = {
  profile: Profile;
  position: number[];
  focus: string;
  busy: boolean;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  track: (id: string) => void;
  travel: () => void;
};
function Chapter({
  c,
  now,
  ...props
}: Props & { c: AtlasChapter; now: number }) {
  const { profile, position, busy, run, track, travel, focus } = props,
    r = atlasOf(profile, now),
    index = ATLAS_CHAPTERS.indexOf(c),
    [inputs, setInputs] = useState([-1, -1, -1]),
    [echo, setEcho] = useState(-1),
    event = atlasEcho(c.region, now);
  const local = profile.region === c.region && !profile.island,
    near = (point: [number, number]) =>
      local &&
      Math.hypot(position[0] - point[0], position[1] - point[1]) <= 4.5;
  const ready = !busy && profile.team.length === 6,
    host = near(c.point),
    tablet = near(c.field),
    unlocked = ATLAS_CHAPTERS.slice(0, index).every((c) =>
      r.chapters.includes(c.region),
    ),
    read = r.read.includes(c.region),
    done = r.chapters.includes(c.region);
  const trackButton = (id: string, label: string) =>
    local ? (
      <button onClick={() => track(id)}>{label}</button>
    ) : (
      <button onClick={travel}>
        Travel to {REGIONS.find((r) => r.id === c.region)?.name}
      </button>
    );
  return (
    <article className="atlas-chapter">
      <p className="eyebrow">
        CHAPTER {index + 1} / {REGIONS.find((r) => r.id === c.region)?.name}
      </p>
      <h3>{c.title}</h3>
      <p>
        <strong>{c.host}:</strong> {c.story}
      </p>
      {!unlocked && (
        <p className="atlas-notice">
          Restore the earlier chapter before recording this page. Emberglass
          opens after two battle wins; Moonfrost opens after five.
        </p>
      )}
      {!r.started && index === 0 && (
        <>
          <button
            disabled={!ready || !host}
            onClick={() => run("atlas-start", { id: c.id })}
          >
            Begin the atlas journey
          </button>
          <p>Meet Aster at the map pavilion to begin.</p>
        </>
      )}
      <div className="atlas-navigation">
        {trackButton(c.id, `Walk to ${c.host}`)}
        {trackButton(c.id + "-tablet", "Track the inscription")}
      </div>
      <section className="atlas-inscription" aria-label="Recorded memory">
        <h4>{c.fieldName}</h4>
        {read || focus === c.id + "-tablet" ? (
          <blockquote>{c.inscription}</blockquote>
        ) : (
          <p>
            Visit the tablet to discover this region's memory. Recorded text
            stays available here.
          </p>
        )}
        {read ? (
          <p className="atlas-notice">Memory recorded in your atlas.</p>
        ) : (
          <button
            disabled={!ready || !r.started || !unlocked || !tablet}
            onClick={() => run("atlas-read", { id: c.id + "-tablet" })}
          >
            Record this memory
          </button>
        )}
      </section>
      {read && !done && (
        <section aria-label="Arrange the memory">
          <h4>Arrange the memory</h4>
          <p>
            Put the three glyphs in the order described by the inscription, then
            show {c.host}. Wrong answers cost nothing.
          </p>
          <div className="atlas-glyphs">
            {inputs.map((value, i) => (
              <label key={i}>
                Glyph {i + 1}
                <select
                  aria-label={`Memory glyph ${i + 1}`}
                  value={value}
                  onChange={(e) =>
                    setInputs((values) =>
                      values.map((v, j) =>
                        i === j ? Number(e.target.value) : v,
                      ),
                    )
                  }
                >
                  <option value={-1}>Choose a glyph</option>
                  {GLYPHS.map((g, j) => (
                    <option key={g} value={j}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <details>
            <summary>Read a hint</summary>
            <p>{c.hint}</p>
          </details>
          <button
            disabled={!ready || !host || inputs.includes(-1)}
            onClick={() => run("atlas-solve", { id: c.id, inputs })}
          >
            Restore this chapter
          </button>
          {!host && <p>Return to {c.host} to restore the page.</p>}
        </section>
      )}
      {done && (
        <section className="atlas-ending">
          <h4>Chapter restored</h4>
          <p>{c.ending}</p>
          <p>80 Gold, 25 Diamonds and 40 XP awarded.</p>
          {(index === 1 || index === 3) && (
            <div className="atlas-companion">
              <Portrait id={index === 1 ? "cairnfin" : "inkwisp"} size={72} />
              <span>
                {index === 1 ? "Cairnfin" : "Inkwisp"} joined your collection
                (or granted a duplicate shard).
              </span>
            </div>
          )}
        </section>
      )}
      {index === 0 && r.chapters.length === 4 && !r.finished && (
        <section>
          <h4>Carry the atlas home</h4>
          <p>
            Return to Aster for 80 Diamonds, 80 XP and the Lorekeeper badge.
          </p>
          <button
            disabled={!ready || !host}
            onClick={() => run("atlas-finish", { id: c.id })}
          >
            Complete the Atlas of Echoes
          </button>
        </section>
      )}
      {r.finished && (
        <section className="atlas-echo">
          <h4>Daily echo reading</h4>
          <p>{event.prompt} Consult the recorded inscription above.</p>
          <label>
            Memory glyph
            <select
              aria-label="Daily echo glyph"
              value={echo}
              onChange={(e) => setEcho(Number(e.target.value))}
            >
              <option value={-1}>Choose a glyph</option>
              {GLYPHS.map((g, i) => (
                <option key={g} value={i}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={
              !ready || !host || echo < 0 || r.echoes.includes(c.region)
            }
            onClick={() =>
              run("atlas-echo", { id: c.id, quest: event.day, inputs: [echo] })
            }
          >
            {r.echoes.includes(c.region)
              ? "Echo read today"
              : "Read today's echo"}
          </button>
          <p>
            20 Gold and 10 XP, once per region per UTC day. No cost or
            missed-day penalty.
          </p>
        </section>
      )}
    </article>
  );
}
export function AtlasPanel(props: Props) {
  const [now, setNow] = useState(Date.now()),
    r = atlasOf(props.profile, now);
  const initial = ATLAS_CHAPTERS.findIndex((c) => props.focus.startsWith(c.id));
  const [selected, setSelected] = useState(
    initial >= 0 ? initial : Math.min(r.chapters.length, 3),
  );
  useEffect(() => {
    const i = ATLAS_CHAPTERS.findIndex((c) => props.focus.startsWith(c.id));
    if (i >= 0) setSelected(i);
  }, [props.focus]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="atlas-journal">
      <p className="eyebrow">FOUR PAGES / ONE SHARED SKY</p>
      <h2>The Atlas of Echoes</h2>
      <p>
        Follow memories across four regions. Read each inscription, restore its
        page with the archivist, then carry the complete atlas home.
      </p>
      {props.profile.team.length !== 6 && (
        <p>Meet Warden Liora and form your first six before beginning.</p>
      )}
      <p className="atlas-progress">
        {r.chapters.length}/4 chapters restored{" "}
        {r.finished ? " / Lorekeeper journey complete" : ""}
      </p>
      <div className="atlas-tabs" aria-label="Atlas chapters">
        {ATLAS_CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            {i + 1}. {c.host}
            {r.chapters.includes(c.region) ? " / Restored" : ""}
          </button>
        ))}
      </div>
      <Chapter
        key={ATLAS_CHAPTERS[selected].region + ":" + r.day}
        {...props}
        c={ATLAS_CHAPTERS[selected]}
        now={now}
      />
      {r.chapters.length === 4 && !r.finished && selected !== 0 && (
        <button onClick={() => setSelected(0)}>
          Return to Aster for the finale
        </button>
      )}
      <p className="rally-date">
        Progress and rewards are saved permanently. Daily echoes reset at 00:00
        UTC. Current day: {r.day}.
      </p>
    </div>
  );
}
