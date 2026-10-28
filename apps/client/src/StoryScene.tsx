import { useEffect, useState } from "react";
import { CHAPTERS } from "../../../packages/shared/adventure";
import { CHAPTER_STORY } from "../../../packages/shared/story";
import { NPCS } from "../../../packages/shared/town";
import { Preview } from "./Scene";
import { audio } from "./audio";

/** A short spoken scene before or after a Riftgate chapter. */
export function StoryScene({
  chapter,
  kind,
  onDone,
}: {
  chapter: string;
  kind: "intro" | "outro";
  onDone: () => void;
}) {
  const c = CHAPTERS.find((c) => c.id === chapter)!,
    boss = c.stages[3].boss!,
    lines = CHAPTER_STORY[chapter]?.[kind] || [];
  const [i, setI] = useState(0);
  const line = lines[i],
    npc = NPCS.find((n) => n.id === line?.speaker),
    last = i >= lines.length - 1;
  const next = () => {
    audio.cue("focus");
    if (last) onDone();
    else setI(i + 1);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        next();
      } else if (e.code === "Escape") onDone();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  if (!line) {
    onDone();
    return null;
  }
  return (
    <div
      className="story-scene"
      role="dialog"
      aria-label={`${c.name}: ${kind === "intro" ? "prologue" : "epilogue"}`}
      style={{ "--chapter": c.color } as React.CSSProperties}
    >
      <div className="story-stage" aria-hidden="true">
        {npc ? (
          <Preview key={npc.id} avatar={npc.avatar} />
        ) : (
          <Preview key={boss.species} species={boss.species} state="idle" />
        )}
      </div>
      <section className="story-card">
        <p className="eyebrow">
          CHAPTER {CHAPTERS.indexOf(c) + 1} · {c.name.toUpperCase()} ·{" "}
          {kind === "intro" ? "PROLOGUE" : "EPILOGUE"}
        </p>
        <h3>{npc ? npc.name : boss.title}</h3>
        <p className="story-line" aria-live="polite">
          {line.text}
        </p>
        <div className="story-controls">
          <span className="story-dots" aria-label={`Line ${i + 1} of ${lines.length}`}>
            {lines.map((_, n) => (
              <i key={n} className={n <= i ? "on" : ""} />
            ))}
          </span>
          <button className="text-button" onClick={onDone}>
            Skip
          </button>
          <button className="primary" onClick={next} autoFocus>
            {last ? (kind === "intro" ? "To battle →" : "Continue →") : "Next →"}
          </button>
        </div>
      </section>
    </div>
  );
}
