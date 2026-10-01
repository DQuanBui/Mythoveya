import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import {
  FISH,
  FISHING_CASTS_PER_DAY,
  ITEMS,
  townOf,
  utcDay,
} from "../../../packages/shared/town";
import { audio, settings } from "./audio";

type Phase = "ready" | "waiting" | "bite" | "result";

// Cast, wait for a bite, then reel while the marker is inside the gold zone.
export function FishingPanel({
  profile,
  run,
}: {
  profile: Profile;
  run: (kind: string, value?: any) => Promise<any>;
}) {
  const t = townOf(profile),
    today = t.fishing?.date === utcDay() ? t.fishing : null,
    left = FISHING_CASTS_PER_DAY - (today?.casts || 0);
  const [phase, setPhase] = useState<Phase>("ready"),
    [zone, setZone] = useState({ start: 0.4, width: 0.22 }),
    [marker, setMarker] = useState(0),
    [result, setResult] = useState<{ fish: string | null; text: string } | null>(null);
  const markerRef = useRef(0),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    frame = useRef(0);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(frame.current);
  };
  useEffect(() => clear, []);
  async function finish(success: boolean) {
    clear();
    setPhase("result");
    audio.cue(success ? "collect" : "back");
    const value = await run("town-fish", { success });
    setResult(
      value
        ? { fish: value.fish, text: value.message }
        : { fish: null, text: "The line went slack." },
    );
  }
  function cast() {
    clear();
    setResult(null);
    setPhase("waiting");
    audio.cue("interact");
    timers.current.push(
      setTimeout(
        () => {
          const width = 0.16 + Math.random() * 0.12;
          setZone({ start: 0.08 + Math.random() * (0.84 - width), width });
          setPhase("bite");
          audio.cue("confirm");
          const started = performance.now(),
            speed = settings.reduced ? 0.45 : 0.75;
          const tick = (now: number) => {
            const p = (((now - started) / 1000) * speed) % 2;
            markerRef.current = p < 1 ? p : 2 - p;
            setMarker(markerRef.current);
            frame.current = requestAnimationFrame(tick);
          };
          frame.current = requestAnimationFrame(tick);
          timers.current.push(setTimeout(() => finish(false), 4500));
        },
        1200 + Math.random() * 2200,
      ),
    );
  }
  function reel() {
    if (phase !== "bite") return;
    const m = markerRef.current;
    void finish(m >= zone.start && m <= zone.start + zone.width);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "bite") reel();
        else if ((phase === "ready" || phase === "result") && left > 0) cast();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div className="fishing">
      <p className="eyebrow">WILLOWMERE DOCK · A QUIET PASTIME</p>
      <h2>Cast a line.</h2>
      <p className="muted">
        Wait for a bite, then reel in while the marker crosses the gold zone.
        Sell your catch at Pip's market. {left} of {FISHING_CASTS_PER_DAY}{" "}
        casts left today.
      </p>
      <div className={`fishing-water ${phase}`} aria-live="polite">
        <span className="bobber" aria-hidden="true" />
        <strong>
          {phase === "ready" && "The water is calm."}
          {phase === "waiting" && "Watching the float…"}
          {phase === "bite" && "A bite! Reel in!"}
          {phase === "result" && (result?.text || "Reeling in…")}
        </strong>
        {phase === "result" && result?.fish && (
          <span className="catch">
            {ITEMS[result.fish as (typeof FISH)[number]].icon}{" "}
            {ITEMS[result.fish as (typeof FISH)[number]].name} · sells for{" "}
            {ITEMS[result.fish as (typeof FISH)[number]].sell} Gold
          </span>
        )}
      </div>
      <div
        className="reel-meter"
        role="meter"
        aria-label="Reel timing"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(marker * 100)}
        onClick={reel}
      >
        <i
          className="reel-zone"
          style={{ left: `${zone.start * 100}%`, width: `${zone.width * 100}%` }}
          hidden={phase !== "bite"}
        />
        <b style={{ left: `${marker * 100}%` }} hidden={phase !== "bite"} />
      </div>
      <div className="button-row">
        {phase === "bite" ? (
          <button className="primary" onClick={reel}>
            Reel in! (Space)
          </button>
        ) : (
          <button
            className="primary"
            disabled={phase === "waiting" || left <= 0}
            onClick={cast}
          >
            {left <= 0
              ? "The fish are resting until 00:00 UTC"
              : phase === "result"
                ? "Cast again (Space)"
                : "Cast your line (Space)"}
          </button>
        )}
      </div>
      <div className="fish-log">
        {FISH.map((id) => (
          <span key={id} title={ITEMS[id].description}>
            {ITEMS[id].icon} {ITEMS[id].name} <b>{t.inventory[id] || 0}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
