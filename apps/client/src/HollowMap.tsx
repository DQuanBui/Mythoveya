import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import {
  HOLLOW_BUILDINGS,
  HOLLOW_LAKE,
  HOLLOW_MOUNTAINS,
  HOLLOW_PATHS,
  HOLLOW_STOPS,
  hollowEdge,
  hollowObjective,
  hollowOf,
} from "../../../packages/shared/hollow";
export function HollowMap({
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
  const [selected, select] = useState(trail || hollowObjective(profile).id),
    h = hollowOf(profile);
  const stop = HOLLOW_STOPS.find((s) => s.id === selected) || HOLLOW_STOPS[0],
    lake = HOLLOW_LAKE;
  const coast = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2,
      r = hollowEdge(a);
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
  const complete = (id: string) =>
    h.gathered.includes(id.slice(4)) ||
    h.installed.includes(id.slice(4)) ||
    h.notes.includes(id.slice(4)) ||
    (id === "hol-workshop" && h.finished);
  return (
    <div className="haven-map hollow-map">
      <p className="eyebrow">MOONFROST HOLLOW</p>
      <h2>The Lantern Road</h2>
      <p>
        Follow the shore around Moonmirror Lake. The northern trail climbs to
        the observatory; Mira's workshop shelters the eastern road.
      </p>
      <div className="haven-map-layout">
        <div className="haven-chart">
          <svg
            viewBox="-52 -52 104 104"
            role="group"
            aria-label="Moonfrost trail map"
          >
            <polygon points={coast} fill="#9fbbca" stroke="#e8eeee" />
            <ellipse
              cx={lake.x}
              cy={lake.z}
              rx={lake.rx}
              ry={lake.rz}
              fill="#5e9fbb"
              stroke="#e0f1ee"
            />
            {HOLLOW_MOUNTAINS.map(([x, z, r], i) => (
              <path
                key={i}
                d={`M${x - r} ${z + r} L${x} ${z - r} L${x + r} ${z + r}Z`}
                fill="#e5eeee"
              />
            ))}
            {HOLLOW_PATHS.map((p, i) => (
              <polyline
                key={i}
                points={p.map((v) => v.join(",")).join(" ")}
                fill="none"
                stroke="#f1dfb5"
                strokeWidth="1.4"
              />
            ))}
            {HOLLOW_BUILDINGS.map((b, i) => (
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
            {HOLLOW_STOPS.map((s) => (
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
            {HOLLOW_STOPS.map((s) => (
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
              {h.installed.length}/3 lanterns lit
              {h.finished ? " / Road restored" : ""}
            </p>
            <button className="primary" onClick={() => choose(stop.id)}>
              Set walking waypoint
            </button>{" "}
            <button onClick={() => choose(null)}>Clear waypoint</button>
          </article>
          <div className="row">
            <button onClick={journal}>Open lantern journal</button>
            <button onClick={regions}>Travel to another region</button>
          </div>
        </div>
      </div>
    </div>
  );
}
