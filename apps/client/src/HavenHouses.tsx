import { HAVEN_HOUSES } from "../../../packages/shared/haven";
import type { Profile } from "../../../packages/shared/types";
import { WorldInteraction } from "./WorldInteraction";

function Box({
  at,
  size,
  color,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
export function HavenHouses({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <group name="haven-houses">
      {HAVEN_HOUSES.map((h, i) => (
        <WorldInteraction
          key={h.id}
          name={`house-${h.id}`}
          position={[h.point[0], 0, h.point[1]]}
          disabled={disabled}
          activate={() => onInteract(`porch-${h.id}`)}
        >
          <Box at={[0, 0.13, 0]} size={[3.9, 0.26, 3.7]} color="#a8a58a" />
          <Box at={[0, 1.45, 0]} size={[3.2, 2.65, 2.9]} color={h.wall} />
          <mesh
            position={[0, 3.1, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[2.85, 1.7, 4]} />
            <meshStandardMaterial
              color={h.roof}
              metalness={h.id === "glasshouse" ? 0.3 : 0}
              roughness={0.65}
            />
          </mesh>
          <Box at={[1, 3.15, -0.6]} size={[0.45, 1.6, 0.5]} color="#9c9281" />
          <Box at={[0, 0.9, 1.49]} size={[0.7, 1.65, 0.12]} color="#6b6151" />
          <Box
            at={[0.24, 0.85, 1.58]}
            size={[0.07, 0.07, 0.08]}
            color="#edd49b"
          />
          <Box at={[0, 0.1, 2]} size={[1.4, 0.2, 1.1]} color="#b9b095" />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Box
                at={[side, 1.55, 1.48]}
                size={[0.72, 0.9, 0.15]}
                color="#6c817b"
              />
              <mesh position={[side, 1.55, 1.57]}>
                <planeGeometry args={[0.52, 0.68]} />
                <meshStandardMaterial
                  color="#f5d997"
                  emissive="#e6b86c"
                  emissiveIntensity={0.35}
                />
              </mesh>
              <Box
                at={[side, 1.55, 1.59]}
                size={[0.045, 0.75, 0.03]}
                color="#efe0bb"
              />
              <Box
                at={[side, 1.55, 1.59]}
                size={[0.58, 0.045, 0.03]}
                color="#efe0bb"
              />
              <Box
                at={[side, 0.85, 1.65]}
                size={[0.85, 0.28, 0.4]}
                color="#a67c60"
              />
              {[0, 1, 2].map((f) => (
                <mesh key={f} position={[side + (f - 1) * 0.22, 1.05, 1.67]}>
                  <icosahedronGeometry args={[0.15, 0]} />
                  <meshStandardMaterial
                    color={["#e0b9a8", "#d8cb89", "#9db68b"][(i + f) % 3]}
                  />
                </mesh>
              ))}
            </group>
          ))}
          <Box at={[-2, 0.65, -0.4]} size={[0.12, 1.3, 3.8]} color="#b5a582" />
          <Box at={[2, 0.65, -0.4]} size={[0.12, 1.3, 3.8]} color="#b5a582" />
          <Box at={[-1.85, 1.05, 2]} size={[0.13, 2.1, 0.13]} color="#786e56" />
          <mesh position={[-1.85, 2.15, 2]}>
            <boxGeometry args={[0.28, 0.36, 0.28]} />
            <meshStandardMaterial
              color="#efd297"
              emissive="#f0c66e"
              emissiveIntensity={0.5}
            />
          </mesh>
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
