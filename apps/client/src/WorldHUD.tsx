import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { byId, REGIONS } from "../../../packages/shared/content";
import type { Profile } from "../../../packages/shared/types";
import { getInteractables } from "./Scene";
import {
  mapPercent,
  placeAt,
  HAVEN_PATHS,
} from "../../../packages/shared/haven";
import { Portrait } from "./portraits";
import { useHover } from "./hover";
import { currentWeather } from "./Weather";
import { WEATHER_INFO } from "../../../packages/shared/weather";
import { eventsReady } from "../../../packages/shared/events";
import { utcDay } from "../../../packages/shared/town";
import { islandHour, timeLabel } from "./daytime";
import { homeInteractables } from "./HomeIsland";
import { festivalInteractables } from "./FestivalIsland";
import {
  FESTIVAL_RADIUS,
  FESTIVAL_TRACK,
  FESTIVAL_POND,
  HUNT_DAILY,
} from "../../../packages/shared/festival";
import {
  HOUSE_LEVELS,
  ISLANDS,
  catalogEntry,
  defaultHome,
  habitatStored,
  homeRadius,
} from "../../../packages/shared/islands";
import { settings } from "./audio";
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
  placing = false,
}: {
  placing?: boolean;
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
  const home = profile.island === "home" ? profile.home || defaultHome() : null;
  const fair = profile.island === "festival";
  const INTERACTABLES = home
    ? homeInteractables(home)
    : fair
      ? festivalInteractables(profile)
      : getInteractables(profile.region);
  // Island minimaps span the land plus a little sky around it.
  const span = home ? homeRadius(home) + 3 : fair ? FESTIVAL_RADIUS + 3 : 0;
  const pct = (v: number) =>
    span ? 50 + (v / span) * 50 : mapPercent(v, profile.region);
  const tickets = profile.festival?.tickets || 0,
    lanterns =
      profile.festival?.day === utcDay() ? profile.festival.hunt.length : 0;
  const placeName = home
    ? ISLANDS.home.name
    : fair
      ? ISLANDS.festival.name
      : region.name;
  const stored = home
    ? home.items.reduce(
        (n, i) =>
          n +
          (catalogEntry(i.kind)?.type === "habitat"
            ? habitatStored(profile, home, i)
            : 0),
        0,
      )
    : 0;
  const target = INTERACTABLES.find((o) => o.id === objective.target);
  const distance = target
    ? Math.round(
        Math.hypot(position[0] - target.p[0], position[1] - target.p[2]),
      )
    : 0;
  const nearest = INTERACTABLES.find((o) => o.id === near);
  const touch = useCoarsePointer();
  const time = timeLabel(islandHour());
  const weather = currentWeather(profile.region);
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
    <div
      className="world-hud"
      aria-label="Exploration interface"
      data-near={near}
    >
      <header className="hud-top">
        <div className="keeper-badge">
          <img src="/emblem.svg" alt="" />
          <div>
            <strong>{profile.name}</strong>
            <small>RIFTKEEPER · LEVEL {profile.level}</small>
          </div>
        </div>
        <div className="location">
          <span>{placeName}</span>
          <small>
            {home
              ? HOUSE_LEVELS[home.house].name
              : fair
                ? `${tickets} festival tickets`
                : profile.region === "haven"
              ? placeAt(position[0], position[1]).name
              : region.subtitle}
          </small>
          {settings.daynight && (
            <em className="time-chip" title="Island time">
              <span aria-hidden="true">{time.icon}</span> {time.phase} ·{" "}
              {time.clock}
            </em>
          )}
          <em
            className="time-chip weather-chip"
            title={WEATHER_INFO[weather].perk}
            data-weather={weather}
          >
            <span aria-hidden="true">{WEATHER_INFO[weather].icon}</span>{" "}
            {profile.region === "hollow" && weather === "rain"
              ? "Snow"
              : WEATHER_INFO[weather].name}
          </em>
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
          <button
            className="events-button"
            aria-label="Events and missions"
            title="Events: login gifts, weekly and monthly missions"
            onClick={() => open("events")}
          >
            ❖{eventsReady(profile, utcDay()) && <i className="ready-dot" />}
          </button>
          <button aria-label="Open settings" onClick={() => open("settings")}>
            ☷
          </button>
        </div>
      </header>
      {home && (
        <aside className="quest-tracker island-card" hidden={placing}>
          <div className="quest-heading">
            <span className="eyebrow">YOUR ISLAND</span>
          </div>
          <strong>{ISLANDS.home.name}</strong>
          <p>
            {home.items.length
              ? `${plural(home.items.length, "piece")} placed · ${plural(Object.values(home.residents).flat().length, "companion")} living here.`
              : "Open the house ledger to place your first habitat or decoration."}
          </p>
          {stored > 0 && (
            <div className="objective-distance">
              <span>◉</span> Habitats <b>{stored} Gold ready</b>
            </div>
          )}
          <button className="text-button" onClick={() => open("home")}>
            Build & manage →
          </button>
          <button className="text-button" onClick={() => open("skyferry")}>
            Skyferry to Havenreach →
          </button>
        </aside>
      )}
      {fair && (
        <aside className="quest-tracker island-card">
          <div className="quest-heading">
            <span className="eyebrow">THE FESTIVAL</span>
          </div>
          <strong>{ISLANDS.festival.name}</strong>
          <p>
            Find today's hidden lanterns, try the attractions and spend your
            tickets at the booth.
          </p>
          <div className="objective-distance">
            <span>✦</span> {tickets} tickets{" "}
            <b>
              {lanterns}/{HUNT_DAILY} lanterns
            </b>
          </div>
          <button className="text-button" onClick={() => open("festival")}>
            Festival board →
          </button>
          <button className="text-button" onClick={() => open("skyferry")}>
            Skyferry to Havenreach →
          </button>
        </aside>
      )}
      <aside className="quest-tracker" hidden={!!home || fair}>
        <div className="quest-heading">
          <span className="eyebrow">
            {objective.waypoint
              ? "WALKING WAYPOINT"
              : "YOUR NEXT CHAPTER"}
          </span>
          {!objective.waypoint && (
              <span className="quest-count">
                {Math.min(3, objective.completed)}/3 steps complete
              </span>
            )}
        </div>
        <strong>{objective.title}</strong>
        <p>{objective.text}</p>
        {!objective.waypoint && (
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
          )}
        {target && (
          <div className="objective-distance">
            <span>◆</span> {target.name}{" "}
            <b>{distance <= 3 ? "Arrived" : `${distance} m`}</b>
          </div>
        )}
        <button className="text-button" onClick={() => open(objective.action)}>
          {objective.button} →
        </button>
      </aside>
      <div className="minimap" title="Area map">
        <div className="map-ring">
          {home && (
            <svg
              className="map-terrain"
              viewBox={`${-span} ${-span} ${span * 2} ${span * 2}`}
              aria-hidden="true"
            >
              <circle r={homeRadius(home)} fill="#8fb48766" />
              <rect x={-homeRadius(home)} y="-1" width={homeRadius(home) - 3} height="2" fill="#e1d3a3" />
              <rect x="-3" y="-3" width="6" height="6" fill="#e9d8b8" />
              {home.items.map((i) => (
                <rect
                  key={i.uid}
                  x={i.x - 1}
                  y={i.z - 1}
                  width="2"
                  height="2"
                  fill={catalogEntry(i.kind)?.type === "habitat" ? "#e1c38a" : "#86a96f"}
                />
              ))}
            </svg>
          )}
          {fair && (
            <svg
              className="map-terrain"
              viewBox={`${-span} ${-span} ${span * 2} ${span * 2}`}
              aria-hidden="true"
            >
              <circle r={FESTIVAL_RADIUS} fill="#a9c98f66" />
              <ellipse
                cx={FESTIVAL_TRACK.x}
                cy={FESTIVAL_TRACK.z}
                rx={FESTIVAL_TRACK.rx}
                ry={FESTIVAL_TRACK.rz}
                fill="none"
                stroke="#c99a72"
                strokeWidth="2"
              />
              <ellipse
                cx={FESTIVAL_POND.x}
                cy={FESTIVAL_POND.z}
                rx={FESTIVAL_POND.rx}
                ry={FESTIVAL_POND.rz}
                fill="#94ccd0"
              />
              <circle r="6" fill="#e3d5b0" />
              <rect x={-FESTIVAL_RADIUS} y="-1" width={FESTIVAL_RADIUS - 6} height="2" fill="#e3d5b0" />
            </svg>
          )}
          {profile.region === "haven" && !home && !fair && (
            <svg
              className="map-terrain"
              viewBox="-78 -78 156 156"
              aria-hidden="true"
            >
              {HAVEN_PATHS.map((p, i) => (
                <polyline
                  key={i}
                  points={p.map((v) => v.join(",")).join(" ")}
                  fill="none"
                  stroke="#e1d3a3"
                  strokeWidth="1"
                />
              ))}
              <ellipse cx="21" cy="-5" rx="8" ry="6" fill="#94ccd0" />
              <ellipse cx="36.5" cy="41" rx="12" ry="9" fill="#94ccd0" />
              <path d="M-48 -42 L-42 -56 L-36 -42 Z M-53 -29 L-48 -38 L-43 -29 Z" fill="#9aa39a" />
            </svg>
          )}
          {INTERACTABLES.filter((o) => !o.id.startsWith("resource")).map(
            (o) => (
              <i
                key={o.id}
                className={o.id === objective.target ? "map-objective" : ""}
                style={{
                  left: `${pct(o.p[0])}%`,
                  top: `${pct(o.p[2])}%`,
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
              left: `${pct(position[0])}%`,
              top: `${pct(position[1])}%`,
            }}
            title="Your position"
          >
            ▲
          </b>
        </div>
        <span>N · {placeName.toUpperCase()}</span>
        <button onClick={() => open(span ? "skyferry" : "map")}>
          {span ? "Skyferry" : "Travel map"}
        </button>
      </div>
      {touch && nearest && (
        <div className="interaction-zone">
          <button className="interact" onClick={() => interact(near)}>
            <kbd>Tap</kbd>
            <span>
              {nearest.name}
              <small>{nearest.hint}</small>
            </span>
          </button>
        </div>
      )}
      {!touch && <HoverTip blocked={blocked} />}
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
            ["adventure", "✧", "Adventure"],
            ["collection", "✦", "Journal"],
            ["formation", "⚑", "Team"],
            ["recruit", "◇", "Recruit"],
            ["arena", "⚔", "Arena"],
            ["leaderboard", "♜", "Rankings"],
            ["map", "⌖", "World"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => open(span && id === "map" ? "skyferry" : id)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
function useCoarsePointer() {
  const query = "(pointer: coarse)";
  const [coarse, setCoarse] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query),
      change = () => setCoarse(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return coarse;
}
// A small label that follows the mouse over clickable things in the world.
function HoverTip({ blocked }: { blocked: boolean }) {
  const hover = useHover(),
    tip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (tip.current)
        tip.current.style.transform = `translate(${Math.min(e.clientX + 18, innerWidth - 240)}px, ${e.clientY + 20}px)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div
      ref={tip}
      className="hover-tip"
      hidden={!hover || blocked}
      aria-hidden="true"
    >
      <strong>{hover?.title}</strong>
      <small>{hover?.hint}</small>
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
    input.current = { ...input.current, x: 0, z: 0, sprint: false };
    setStick({ x: 0, z: 0 });
  };
  useEffect(() => {
    if (blocked) reset();
  }, [blocked]);
  useEffect(() => {
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("blur", reset);
      input.current = { ...input.current, x: 0, z: 0, sprint: false };
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
          input.current = {
            ...input.current,
            x: x / length,
            z: z / length,
            sprint: Math.hypot(x, z) > 0.92,
          };
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
      <small>DRAG / RUN</small>
    </div>
  );
}
