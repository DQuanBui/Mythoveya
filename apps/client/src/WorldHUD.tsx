import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { byId, REGIONS } from "../../../packages/shared/content";
import type { Profile } from "../../../packages/shared/types";
import { INTERACTABLES } from "./Scene";
import { Portrait } from "./portraits";
import {
  WORLD_GUIDE,
  type Objective,
  type ExplorationInput,
} from "./world-guide";

export function WorldHUD({
  profile,
  position,
  near,
  objective,
  open,
  interact,
  greet,
  input,
  blocked,
}: {
  profile: Profile;
  position: number[];
  near: string;
  objective: Objective;
  open: (id: string) => void;
  interact: (id: string) => void;
  greet: () => void;
  input: MutableRefObject<ExplorationInput>;
  blocked: boolean;
}) {
  const region = REGIONS.find((r) => r.id === profile.region) || REGIONS[0];
  const target = INTERACTABLES.find((o) => o.id === objective.target);
  const distance = target
    ? Math.round(
        Math.hypot(position[0] - target.p[0], position[1] - target.p[2]),
      )
    : 0;
  const nearest = INTERACTABLES.find((o) => o.id === near);
  const [currency, setCurrency] = useState("");
  const wallet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!wallet.current?.contains(e.target as Node)) setCurrency("");
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div className="world-hud" aria-label="Exploration interface">
      <header className="hud-top">
        <div className="keeper-badge">
          <img src="/emblem.svg" alt="" />
          <div>
            <strong>{profile.name}</strong>
            <small>RIFTKEEPER · LEVEL {profile.level}</small>
          </div>
        </div>
        <div className="location">
          <span>{region.name}</span>
          <small>{region.subtitle}</small>
        </div>
        <div className="currencies" ref={wallet}>
          {(["diamonds", "gold"] as const).map((key) => (
            <div
              className="currency"
              key={key}
              onMouseEnter={() => setCurrency(key)}
              onMouseLeave={() => setCurrency("")}
            >
              <button
                className="currency-button"
                aria-label={`${WORLD_GUIDE.currencies[key].name}: ${profile[key]}`}
                aria-expanded={currency === key}
                aria-describedby={
                  currency === key ? `currency-${key}` : undefined
                }
                onClick={() => setCurrency(currency === key ? "" : key)}
                onFocus={() => setCurrency(key)}
                onBlur={() => setCurrency("")}
              >
                <span aria-hidden="true">
                  {WORLD_GUIDE.currencies[key].symbol}
                </span>
                <b>{profile[key].toLocaleString()}</b>
                <small>{WORLD_GUIDE.currencies[key].name}</small>
              </button>
              {currency === key && (
                <div
                  className="currency-tooltip"
                  id={`currency-${key}`}
                  role="tooltip"
                >
                  <strong>{WORLD_GUIDE.currencies[key].name}</strong>
                  <p>{WORLD_GUIDE.currencies[key].description}</p>
                </div>
              )}
            </div>
          ))}
          <button aria-label="Open settings" onClick={() => open("settings")}>
            ☷
          </button>
        </div>
      </header>
      <aside className="quest-tracker">
        <div className="quest-heading">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <span className="quest-count">
            {Math.min(3, objective.completed)}/3 steps complete
          </span>
        </div>
        <strong>{objective.title}</strong>
        <p>{objective.text}</p>
        <div
          className="chapter-progress"
          aria-label={`${objective.completed} of 3 introductory steps complete`}
        >
          {["Meet Liora", "Win a battle", "Recruit"].map((label, i) => (
            <span
              key={label}
              className={i < objective.completed ? "done" : ""}
              title={label}
            >
              <i />
              {label}
            </span>
          ))}
        </div>
        {target && (
          <div className="objective-distance">
            <span>◆</span> {target.name} <b>{distance} m</b>
          </div>
        )}
        <button className="text-button" onClick={() => open(objective.action)}>
          {objective.button} →
        </button>
      </aside>
      <div className="minimap" title="Area map">
        <div className="map-ring">
          {INTERACTABLES.filter((o) => !o.id.startsWith("resource")).map(
            (o) => (
              <i
                key={o.id}
                className={o.id === objective.target ? "map-objective" : ""}
                style={{
                  left: `${50 + o.p[0] * 2.5}%`,
                  top: `${50 + o.p[2] * 2.5}%`,
                }}
                title={o.name}
                aria-label={
                  o.id === objective.target
                    ? `Quest waypoint: ${o.name}`
                    : o.name
                }
              >
                {o.id === objective.target ? "◆" : "◇"}
              </i>
            ),
          )}
          <b
            style={{
              left: `${50 + position[0] * 2.5}%`,
              top: `${50 + position[1] * 2.5}%`,
            }}
            title="Your position"
          >
            ▲
          </b>
        </div>
        <span>N · {region.name.toUpperCase()}</span>
        <button onClick={() => open("map")}>Travel map</button>
      </div>
      <div className="interaction-zone">
        {nearest && (
          <button className="interact" onClick={() => interact(near)}>
            <kbd>E</kbd>
            <span>
              {nearest.name}
              <small>{nearest.hint}</small>
            </span>
          </button>
        )}
        <div className="controls-hint">
          WASD / arrows · Move <span>Drag · Look</span> Scroll · Zoom{" "}
          <span>Esc · Pause</span>
        </div>
      </div>
      <TouchPad input={input} blocked={blocked} />
      <div className="world-dock">
        <div className="companion-strip" aria-label="Your six companions">
          {profile.team.map((id) => {
            const o = profile.owned.find((o) => o.id === id)!;
            return (
              <button
                key={id}
                title={o.nickname || byId[o.species].name}
                onClick={() => open("formation")}
              >
                <Portrait id={o.species} />
                <small>{o.level}</small>
              </button>
            );
          })}
          <button
            className="pet-button"
            onClick={greet}
            title="Greet your companion"
            aria-label="Greet your companion"
          >
            ♡
          </button>
        </div>
        <nav className="world-nav" aria-label="Game menu">
          {[
            ["quests", "⌑", "Quests"],
            ["collection", "✦", "Journal"],
            ["formation", "⚑", "Team"],
            ["recruit", "◇", "Recruit"],
            ["arena", "⚔", "Arena"],
            ["leaderboard", "♜", "Rankings"],
            ["map", "⌖", "World"],
          ].map(([id, icon, label]) => (
            <button key={id} onClick={() => open(id)}>
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function TouchPad({
  input,
  blocked,
}: {
  input: MutableRefObject<ExplorationInput>;
  blocked: boolean;
}) {
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const active = useRef<number | null>(null);
  const reset = () => {
    active.current = null;
    input.current = { x: 0, z: 0 };
    setStick({ x: 0, z: 0 });
  };
  useEffect(() => {
    if (blocked) reset();
  }, [blocked]);
  useEffect(() => {
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("blur", reset);
      input.current = { x: 0, z: 0 };
    };
  }, []);
  return (
    <div className="touch-movement">
      <button
        className="touch-pad"
        aria-label="Movement joystick"
        disabled={blocked}
        onPointerDown={(e) => {
          active.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (active.current !== e.pointerId || blocked) return;
          const box = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - box.x - box.width / 2) / 38,
            z = (e.clientY - box.y - box.height / 2) / 38;
          const length = Math.max(1, Math.hypot(x, z));
          input.current = { x: x / length, z: z / length };
          setStick(input.current);
        }}
        onPointerUp={reset}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <span
          aria-hidden="true"
          style={{
            transform: `translate(${stick.x * 30}px, ${stick.z * 30}px)`,
          }}
        >
          ✥
        </span>
      </button>
      <small>DRAG TO WALK</small>
    </div>
  );
}
