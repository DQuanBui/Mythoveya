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
  shopFront,
  HAVEN_CACHES,
  HAVEN_COTTAGES,
  HAVEN_DOCK,
  HAVEN_WINDMILL,
  LAGOON,
  PIER,
  LIGHTHOUSE,
  COTTAGE_SIZE,
} from "../../../packages/shared/haven";
import { Portrait } from "./portraits";
import { SHOPS } from "../../../packages/shared/shops";
export const MAP_DESTINATIONS = [
  ...HAVEN_PLACES,
  ...(["smith", "apothecary"] as const).map((id) => ({
    id,
    name: SHOPS[id].name,
    short: id === "smith" ? "Smithy" : "Apothecary",
    point: shopFront(id),
    color: "#e6cf95",
    description: SHOPS[id].greeting,
    species: [] as string[],
  })),
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
  caches,
  trail,
  choose,
  regions,
}: {
  position: number[];
  caches: string[];
  trail: string | null;
  choose: (id: string | null) => void;
  regions: () => void;
}) {
  const [selected, setSelected] = useState(
    trail || placeAt(position[0], position[1]).id,
  );
  const place = MAP_DESTINATIONS.find((p) => p.id === selected) || HAVEN_PLACES[0];
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
            viewBox="-78 -78 156 156"
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
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            ))}
            {/* Highcrag peaks and the Driftshore lagoon, pier and lighthouse. */}
            {[
              [-42, -50, 6],
              [-48, -34, 4.5],
              [-28, -56, 4],
              [-56, -50, 3.5],
            ].map(([x, y, r]) => (
              <path
                key={`${x}`}
                d={`M${x - r} ${y + r * 0.7} L${x} ${y - r} L${x + r} ${y + r * 0.7} Z`}
                fill="#9aa39a"
                stroke="#e8ece6"
                strokeWidth=".5"
              />
            ))}
            <ellipse
              cx={LAGOON.x}
              cy={LAGOON.z}
              rx={LAGOON.rx}
              ry={LAGOON.rz}
              fill="#7cc0c4"
              stroke="#e8d6a6"
              strokeWidth="2.4"
            />
            <rect x={PIER.x - 0.9} y={PIER.z0} width="1.8" height={PIER.z1 - PIER.z0} fill="#ba9872" />
            <circle cx={LIGHTHOUSE.point[0]} cy={LIGHTHOUSE.point[1]} r="1.6" fill="#d4614f" stroke="#f1ece0" strokeWidth=".5" />
            <ellipse
              cx={HAVEN_POND.x}
              cy={HAVEN_POND.z}
              rx={HAVEN_POND.rx}
              ry={HAVEN_POND.rz}
              fill="#88bec4"
            />
            <path d="M12 -5 H30" stroke="#ba9872" strokeWidth="1.5" />
            <rect
              x={HAVEN_DOCK.x - HAVEN_DOCK.halfWidth}
              y={HAVEN_DOCK.z0}
              width={HAVEN_DOCK.halfWidth * 2}
              height={HAVEN_DOCK.z1 - HAVEN_DOCK.z0}
              fill="#ba9872"
            />
            {HAVEN_COTTAGES.map((c) => (
              <rect
                key={c.id}
                x={-COTTAGE_SIZE[c.style].w / 2}
                y={-COTTAGE_SIZE[c.style].d / 2}
                width={COTTAGE_SIZE[c.style].w}
                height={COTTAGE_SIZE[c.style].d}
                fill={c.roof}
                stroke="#f1e6c8"
                strokeWidth=".3"
                transform={`translate(${c.point[0]} ${c.point[1]}) rotate(${(-c.rotation * 180) / Math.PI})`}
              />
            ))}
            <g
              transform={`translate(${HAVEN_WINDMILL.point[0]} ${HAVEN_WINDMILL.point[1]})`}
              stroke="#f1e6c8"
              strokeWidth=".6"
            >
              <circle r="1.4" fill="#e6dccb" />
              <path d="M-2.6 -2.6 L2.6 2.6 M2.6 -2.6 L-2.6 2.6" />
            </g>
            {MAP_DESTINATIONS.map((p) => (
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
                  r={selected === p.id ? 4.4 : 3.2}
                  fill={selected === p.id ? "#f4deb0" : "#294d4b"}
                  stroke="#f4e2ba"
                  strokeWidth=".5"
                />
                <text x={p.point[0]} y={p.point[1] - 5.6} textAnchor="middle">
                  {p.id.startsWith("porch-") ? "House" : p.short}
                </text>
              </g>
            ))}
            <g transform={`translate(${position[0]} ${position[1]})`}>
              <circle r="1.7" fill="#fff9e8" />
              <circle r="2.9" fill="none" stroke="#fff9e8" strokeWidth=".45" />
            </g>
            <text x="-70" y="-70" className="chart-north">
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
            {MAP_DESTINATIONS.map((p) => (
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
      <section className="cache-notes" aria-label="Skyglass caches">
        <h3>
          Skyglass caches · {caches.length}/{HAVEN_CACHES.length} found
        </h3>
        <p className="muted">
          Eight glowing caches are hidden away from the trails. Follow the
          notes, look for a sparkle, and click a cache to open it. Find them
          all for 100 bonus Diamonds.
        </p>
        <ul>
          {HAVEN_CACHES.map((c) => (
            <li key={c.id} className={caches.includes(c.id) ? "found" : ""}>
              <span aria-hidden="true">
                {caches.includes(c.id) ? "✦" : "?"}
              </span>
              {caches.includes(c.id) ? c.name : c.clue}
            </li>
          ))}
        </ul>
      </section>
      <button className="text-button" onClick={regions}>
        Travel to another region →
      </button>
    </div>
  );
}
