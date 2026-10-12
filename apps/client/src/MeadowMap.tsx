import { rallyHost } from "../../../packages/shared/rally";
import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import {
  MEADOW_BUILDINGS,
  MEADOW_TREES,
  MEADOW_HEART,
  MEADOW_POND,
  MEADOW_PATHS,
  MEADOW_STOPS as REGION_STOPS,
  meadowEdge,
  meadowObjective,
  meadowOf,
} from "../../../packages/shared/meadow";
const MEADOW_STOPS=[...REGION_STOPS,rallyHost("meadow")!];
export function MeadowMap({
  profile,
  position,
  trail,
  choose,
  regions,
  journal,
}: {
  profile: Profile;
  position: number[];
  trail: string | null;
  choose: (id: string | null) => void;
  regions: () => void;
  journal: () => void;
}) {
  const [selected, select] = useState(trail || meadowObjective(profile).id),
    h = meadowOf(profile);
  const stop = MEADOW_STOPS.find((s) => s.id === selected) || MEADOW_STOPS[0],
    lake = MEADOW_POND;
  const coast = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2,
      r = meadowEdge(a);
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
  const complete = (id: string) =>
    (id.startsWith("rally-") && !!profile.rally?.stamps.includes("meadow")) ||
    h.choirs.includes(id.slice(4)) ||
    h.notes.includes(id.slice(4)) ||
    (id === "mea-lodge" && h.finished);
  return (
    <div className="haven-map meadow-map">
      <p className="eyebrow">WHISPERLEAF MEADOW</p>
      <h2>The Forest Choir</h2>
      <p>
        Walk around Reedglass Pond, follow the woodland trail to the canopy, and
        climb to the old heartroot. Rowan waits at the eastern lodge.
      </p>
      <div className="haven-map-layout">
        <div className="haven-chart">
          <svg
            viewBox="-46 -46 92 92"
            role="group"
            aria-label="Whisperleaf trail map"
          >
            <polygon points={coast} fill="#8fa879" stroke="#d4dcb6" />
            <path
              d="M-24 -24 Q0 -37 25 -24 M-20 -20 Q0 -31 21 -20"
              fill="none"
              stroke="#cad0a1"
              strokeWidth=".65"
            />
            {MEADOW_TREES.map((t, i) => (
              <circle
                key={i}
                cx={t.x}
                cy={t.z}
                r={t.scale * 1.4}
                fill={i % 2 ? "#567c61" : "#65886a"}
                opacity=".75"
              />
            ))}
            <circle
              cx={MEADOW_HEART[0]}
              cy={MEADOW_HEART[1]}
              r="3"
              fill={h.finished ? "#dfb8cb" : "#55775e"}
              stroke="#d4dcb6"
              strokeWidth=".4"
            />
            <text
              x={MEADOW_HEART[0]}
              y={MEADOW_HEART[1] - 4.3}
              textAnchor="middle"
              fontSize="2.3"
              fill="#304c3d"
            >
              Heartroot
            </text>
            <ellipse
              cx={lake.x}
              cy={lake.z}
              rx={lake.rx}
              ry={lake.rz}
              fill="#5e9fbb"
              stroke="#e0f1ee"
            />
            {MEADOW_PATHS.map((p, i) => (
              <polyline
                key={i}
                points={p.map((v) => v.join(",")).join(" ")}
                fill="none"
                stroke="#f1dfb5"
                strokeWidth="1.4"
              />
            ))}
            {MEADOW_BUILDINGS.map((b, i) => (
              <rect
                key={i}
                x={b.x - b.width / 2}
                y={b.z - b.depth / 2}
                width={b.width}
                height={b.depth}
                fill={b.roof}
              />
            ))}
            <text
              x="0"
              y="10"
              fontSize="2.4"
              textAnchor="middle"
              fill="#354a60"
            >
              Trailhead
            </text>
            {MEADOW_STOPS.map((s) => (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${s.name}`}
                onClick={() => select(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(s.id);
                  }
                }}
              >
                <circle
                  cx={s.point[0]}
                  cy={s.point[1]}
                  r={selected === s.id ? 2.2 : 1.6}
                  fill={
                    selected === s.id
                      ? "#ffe098"
                      : complete(s.id)
                        ? "#8ef0c6"
                        : "#f0f5ef"
                  }
                  stroke="#556a85"
                  strokeWidth=".4"
                />
              </g>
            ))}
            <circle
              cx={position[0]}
              cy={position[1]}
              r="1.2"
              fill="#344657"
              stroke="white"
              strokeWidth=".5"
            />
          </svg>
        </div>
        <div className="canyon-map-detail">
          <div className="haven-destinations">
            {MEADOW_STOPS.map((s) => (
              <button
                key={s.id}
                className={selected === s.id ? "selected" : ""}
                onClick={() => select(s.id)}
              >
                {s.name}
                {complete(s.id) && <span aria-hidden="true"> ✓</span>}
              </button>
            ))}
          </div>
          <article className="expedition-objective">
            <h3>{stop.name}</h3>
            <p>{stop.description}</p>
            <p>
              {h.choirs.length}/3 choirs restored
              {h.finished ? " / Forest restored" : ""}
            </p>
            <button className="primary" onClick={() => choose(stop.id)}>
              Set walking waypoint
            </button>{" "}
            <button onClick={() => choose(null)}>Clear waypoint</button>
          </article>
          <div className="row">
            <button onClick={journal}>Open forest journal</button>
            <button onClick={regions}>Travel to another region</button>
          </div>
        </div>
      </div>
    </div>
  );
}
