import { HAVEN_HOUSES, houseDoor } from "../../../packages/shared/haven";
import { useEffect, useMemo } from "react";
import { villageGlow } from "./village-materials";
import { Kit, SHAPES } from "./village-kit";
import { villageMaterial } from "./HavenVillage";
import type { Profile } from "../../../packages/shared/types";
import { WorldInteraction } from "./WorldInteraction";

// Each home is two merged meshes (body and lit glass) inside one clickable group.
function houseGeometry(h: (typeof HAVEN_HOUSES)[number], i: number) {
  const k = new Kit(),
    g = new Kit();
  k.box("#a8a58a", [0, 0.13, 0], [3.9, 0.26, 3.7]);
  k.box(h.wall, [0, 1.45, 0], [3.2, 2.65, 2.9]);
  k.add(SHAPES.CONE4, h.roof, [0, 3.1, 0], [2.85, 1.7, 2.85], [0, Math.PI / 4, 0]);
  k.box("#9c9281", [1, 3.15, -0.6], [0.45, 1.6, 0.5]);
  k.box("#6b6151", [0, 0.9, 1.49], [0.7, 1.65, 0.12]);
  g.box("#edd49b", [0.24, 0.85, 1.58], [0.07, 0.07, 0.08]);
  k.box("#b9b095", [0, 0.1, 2], [1.4, 0.2, 1.1]);
  for (const side of [-1, 1]) {
    k.box("#6c817b", [side, 1.55, 1.48], [0.72, 0.9, 0.15]);
    g.box("#f5d997", [side, 1.55, 1.56], [0.52, 0.68, 0.02]);
    k.box("#efe0bb", [side, 1.55, 1.59], [0.045, 0.75, 0.03]);
    k.box("#efe0bb", [side, 1.55, 1.59], [0.58, 0.045, 0.03]);
    k.box("#a67c60", [side, 0.85, 1.65], [0.85, 0.28, 0.4]);
    for (let f = 0; f < 3; f++)
      k.add(SHAPES.BALL, ["#e0b9a8", "#d8cb89", "#9db68b"][(i + f) % 3], [side + (f - 1) * 0.22, 1.05, 1.67], [0.15, 0.15, 0.15]);
  }
  k.box("#b5a582", [-2, 0.65, -0.4], [0.12, 1.3, 3.8]);
  k.box("#b5a582", [2, 0.65, -0.4], [0.12, 1.3, 3.8]);
  k.box("#786e56", [-1.85, 1.05, 2], [0.13, 2.1, 0.13]);
  g.box("#efd297", [-1.85, 2.15, 2], [0.28, 0.36, 0.28]);
  return { body: k.build(), glass: g.build() };
}
export function HavenHouses({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const houses = useMemo(() => HAVEN_HOUSES.map(houseGeometry), []);
  useEffect(
    () => () =>
      houses.forEach((h) => {
        h.body.dispose();
        h.glass.dispose();
      }),
    [houses],
  );
  return (
    <group name="haven-houses">
      {HAVEN_HOUSES.map((h, i) => (
        <WorldInteraction
          key={h.id}
          name={`house-${h.id}`}
          position={[h.point[0], 0, h.point[1]]}
          disabled={disabled}
          title={h.name}
          hint="Click to visit the porch & visitor book"
          approach={houseDoor(h)}
          activate={() => onInteract(`porch-${h.id}`)}
        >
          <mesh geometry={houses[i].body} material={villageMaterial} castShadow receiveShadow />
          <mesh geometry={houses[i].glass} material={villageGlow} />
        </WorldInteraction>
      ))}
    </group>
  );
}

export function HouseVisit({
  id,
  profile,
  run,
}: {
  id: string;
  profile: Profile;
  run: (kind: string, value?: any) => Promise<any>;
}) {
  const house = HAVEN_HOUSES.find((h) => h.id === id);
  if (!house) return null;
  const stamps = profile.town?.stamps || [];
  return (
    <div className="house-visit">
      <p className="eyebrow">HAVENREACH · A WELCOME ON THE PORCH</p>
      <div
        className="house-illustration"
        style={
          { "--roof": house.roof, "--wall": house.wall } as React.CSSProperties
        }
      >
        <i />
        <b />
        <span>✦</span>
      </div>
      <h2>{house.name}</h2>
      <p>{house.description}</p>
      <p className="muted">
        Sign each home's visitor book once for 15 Gold and 10 keeper XP. Collect
        all six stamps for an extra 50 Diamonds.
      </p>
      <button
        className="primary"
        disabled={stamps.includes(id)}
        onClick={() => run("town-visit", { id })}
      >
        {stamps.includes(id) ? "Visitor book signed" : "Sign the visitor book"}
      </button>
      <h3>Your island visitor book · {stamps.length}/6</h3>
      <div className="visitor-stamps">
        {HAVEN_HOUSES.map((h) => (
          <div key={h.id} className={stamps.includes(h.id) ? "stamped" : ""}>
            <span>{stamps.includes(h.id) ? "✦" : "○"}</span>
            {h.name}
          </div>
        ))}
      </div>
    </div>
  );
}
