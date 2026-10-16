import { lodgeStops } from "../../../packages/shared/lodges";
import { rescueStops } from "../../../packages/shared/rescue";
import { atlasStops } from "../../../packages/shared/atlas";
import { conservancyStops } from "../../../packages/shared/conservancy";
import { rallyHost } from "../../../packages/shared/rally";
import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import {
  CANYON_BEACONS,
  CANYON_COLUMNS,
  CANYON_PATHS,
  CANYON_SPRINGS,
  CANYON_STOPS as REGION_STOPS,
  canyonEdge,
  canyonOf,
  canyonObjective,
} from "../../../packages/shared/canyon";
const CANYON_STOPS=[...lodgeStops("canyon"),...rescueStops("canyon"),...atlasStops("canyon"),...REGION_STOPS,rallyHost("canyon")!,...conservancyStops("canyon")];
export function CanyonMap({
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
  const [selected, select] = useState(trail || canyonObjective(profile).id),
    c = canyonOf(profile);
  const stop = CANYON_STOPS.find((s) => s.id === selected) || CANYON_STOPS[0];
  const coast = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2,
      r = canyonEdge(a);
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
  return (
    <div className="haven-map canyon-map">
      <p className="eyebrow">EMBERGLASS CANYON</p>
      <h2>Signals in the Stone</h2>
      <p>
        Climb the pale western trail to Basalt Crown. Follow the eastern loop
        around the hot springs. The trailhead services remain near the central
        arch.
      </p>
      <div className="haven-map-layout">
        <div className="haven-chart">
          <svg
            viewBox="-52 -52 104 104"
            role="group"
            aria-label="Emberglass trail map"
          >
            <polygon points={coast} fill="#a88173" stroke="#e1c39c" />
            {CANYON_COLUMNS.map(([x, z, r], i) => (
              <circle key={i} cx={x} cy={z} r={r} fill="#6f6777" />
            ))}
            {CANYON_SPRINGS.map((p, i) => (
              <ellipse
                key={i}
                cx={p.x}
                cy={p.z}
                rx={p.rx}
                ry={p.rz}
                fill="#77bdb8"
                stroke="#e5d5af"
              />
            ))}
            {CANYON_PATHS.map((p, i) => (
              <polyline
                key={i}
                points={p.map((v) => v.join(",")).join(" ")}
                fill="none"
                stroke="#efcc9e"
                strokeWidth="1.3"
              />
            ))}
            <rect x="-26.3" y="28" width="4.6" height="4" fill="#8c7caa" />
            <circle cx="0" cy="5" r="2" fill="#ecdab9" />
            <text
              x="0"
              y="10"
              fontSize="2.3"
              textAnchor="middle"
              fill="#fff2d5"
            >
              Trailhead
            </text>
            {CANYON_STOPS.map((s) => (
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
                  r={selected === s.id ? 2.2 : 1.5}
                  fill={selected === s.id ? "#ffdd8c" : "#f4ecda"}
                  stroke="#715f66"
                  strokeWidth=".4"
                />
              </g>
            ))}
            <circle
              cx={position[0]}
              cy={position[1]}
              r="1.2"
              fill="#354e5a"
              stroke="white"
              strokeWidth=".5"
            />
          </svg>
        </div>
        <div className="canyon-map-detail">
          <div className="haven-destinations">
            {CANYON_STOPS.map((s) => (
              <button
                key={s.id}
                className={selected === s.id ? "selected" : ""}
                onClick={() => select(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <article className="expedition-objective">
            <h3>{stop.name}</h3>
            <p>{stop.description}</p>
            <p>
              {c.beacons.length}/{CANYON_BEACONS.length} beacons tuned
              {c.restored ? " · Signals restored" : ""}
            </p>
            <button className="primary" onClick={() => choose(stop.id)}>
              Set walking waypoint
            </button>{" "}
            <button onClick={() => choose(null)}>Clear waypoint</button>
          </article>
          <div className="row">
            <button onClick={journal}>Open canyon journal</button>
            <button onClick={regions}>Travel to another region</button>
          </div>
        </div>
      </div>
    </div>
  );
}
