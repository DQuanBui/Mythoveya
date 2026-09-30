import { useState } from "react";
import {
  HAVEN_PLACES,
  HAVEN_HOUSES,
  houseDoor,
  HAVEN_PATHS,
  HAVEN_TREES,
  HAVEN_POND,
  edgeRadius,
  placeAt,
} from "../../../packages/shared/haven";
import { Portrait } from "./portraits";
const destinations = [
  ...HAVEN_PLACES,
  ...HAVEN_HOUSES.map((h) => ({
    ...h,
    id: `porch-${h.id}`,
    short: h.name,
    point: houseDoor(h),
    species: [] as string[],
  })),
];
export function HavenMap({
  position,
  trail,
  choose,
  regions,
}: {
  position: number[];
  trail: string | null;
  choose: (id: string | null) => void;
  regions: () => void;
}) {
  const [selected, setSelected] = useState(
    trail || placeAt(position[0], position[1]).id,
  );
  const place = destinations.find((p) => p.id === selected) || HAVEN_PLACES[0];
  const coast = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2;
    return `${Math.cos(a) * edgeRadius(a)},${Math.sin(a) * edgeRadius(a)}`;
  }).join(" ");
  return (
    <div className="haven-map">
      <p className="eyebrow">HAVENREACH · THE STARTING ISLAND</p>
      <h2>A little further from home.</h2>
      <p className="muted">
        Follow the pale trails. Cross Willowmere by its bridge. Every path leads
        back to the village.
      </p>
      <div className="haven-map-layout">
        <div className="haven-chart">
          <svg
            viewBox="-50 -50 100 100"
            role="group"
            aria-label="Havenreach trail map"
          >
            <polygon
              points={coast}
              fill="#8fae8a"
              stroke="#c4d2a7"
              strokeWidth=".7"
            />
            {HAVEN_TREES.map((t, i) => (
              <circle
                key={i}
                cx={t.x}
                cy={t.z}
                r={t.scale * 0.8}
                fill={t.pine ? "#547e71" : "#789a7b"}
              />
            ))}
            {HAVEN_PATHS.map((p, i) => (
              <polyline
                key={i}
                points={p.map((v) => v.join(",")).join(" ")}
                fill="none"
                stroke="#e6d5ad"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            ))}
            <ellipse
              cx={HAVEN_POND.x}
              cy={HAVEN_POND.z}
              rx={HAVEN_POND.rx}
              ry={HAVEN_POND.rz}
              fill="#88bec4"
            />
            <path d="M12 -5 H30" stroke="#ba9872" strokeWidth="1.5" />
            {destinations.map((p) => (
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${p.name}`}
                aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(p.id);
                  }
                }}
              >
                <circle
                  cx={p.point[0]}
                  cy={p.point[1]}
                  r={selected === p.id ? 3.1 : 2.3}
                  fill={selected === p.id ? "#f4deb0" : "#294d4b"}
                  stroke="#f4e2ba"
                  strokeWidth=".5"
                />
                <text x={p.point[0]} y={p.point[1] - 4.4} textAnchor="middle">
                  {p.id.startsWith("porch-") ? "House" : p.short}
                </text>
              </g>
            ))}
            <g transform={`translate(${position[0]} ${position[1]})`}>
              <circle r="1.2" fill="#fff9e8" />
              <circle r="2" fill="none" stroke="#fff9e8" strokeWidth=".3" />
            </g>
            <text x="-43" y="-43" className="chart-north">
              N ↑
            </text>
          </svg>
          <div className="chart-legend">
            <span>● You</span>
            <span>━ Walking trail</span>
            <span>○ Destination</span>
          </div>
        </div>
        <div className="haven-map-detail">
          <p className="eyebrow">A PLACE TO EXPLORE</p>
          <h3>{place.name}</h3>
          <p>{place.description}</p>
          <small>
            {Math.round(
              Math.hypot(
                position[0] - place.point[0],
                position[1] - place.point[1],
              ),
            )}{" "}
            m straight-line distance · follow the trails around water
          </small>
          <div className="habitat-portraits">
            {place.species.map((id) => (
              <Portrait key={id} id={id} />
            ))}
          </div>
          <p className="muted">
            {place.species.length
              ? "Wildbound you may see here"
              : "A porch to visit and a stamp for your visitor book"}
          </p>
          <button className="primary" onClick={() => choose(place.id)}>
            Set walking waypoint →
          </button>
          {trail && (
            <button onClick={() => choose(null)}>Clear walking waypoint</button>
          )}
          <div className="haven-destinations">
            {destinations.map((p) => (
              <button
                key={p.id}
                className={selected === p.id ? "selected" : ""}
                onClick={() => setSelected(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className="text-button" onClick={regions}>
        Travel to another region →
      </button>
    </div>
  );
}
