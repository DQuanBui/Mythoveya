import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { groundHeight, HAVEN_HOUSES } from "../../../packages/shared/haven";
import { worldFocus } from "./village-materials";
import type { Season } from "../../../packages/shared/seasons";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";

// Shared materials for every seasonal lantern.
const gourd = new T.MeshStandardMaterial({ color: "#e0782e", roughness: 0.55, emissive: "#7a2c06", emissiveIntensity: 0.35 }),
  stem = new T.MeshStandardMaterial({ color: "#5e7a3a", roughness: 0.8 }),
  flame = new T.MeshBasicMaterial({ color: "#ffd77a" }),
  frost = new T.MeshStandardMaterial({ color: "#d8f3ff", roughness: 0.15, emissive: "#7cc8ff", emissiveIntensity: 0.9, transparent: true, opacity: 0.92 }),
  post = new T.MeshStandardMaterial({ color: "#7a5a3c", roughness: 0.9 }),
  glint = new T.MeshBasicMaterial({ color: "#fff4d6" });
// A soft round glow that always faces the camera.
let halo: T.CanvasTexture | undefined;
const haloTexture = () => {
  if (halo) return halo;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,0.9)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  return (halo = new T.CanvasTexture(c));
};
const haloMaterial = (color: string) =>
  new T.SpriteMaterial({ map: haloTexture(), color, transparent: true, depthWrite: false, blending: T.AdditiveBlending });

function Gourd() {
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} material={gourd} position={[Math.sin(i * 1.047) * 0.11, 0.24, Math.cos(i * 1.047) * 0.11]} rotation={[0, i * 1.047, 0]} scale={[0.17, 0.24, 0.27]} castShadow>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
      ))}
      <mesh material={stem} position={[0, 0.5, 0]} rotation={[0.2, 0, 0.25]}>
        <cylinderGeometry args={[0.03, 0.045, 0.14, 6]} />
      </mesh>
      {/* A carved, candle-lit face. */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={flame} position={[s * 0.1, 0.3, 0.36]} rotation={[0, 0, Math.PI]} scale={[0.05, 0.06, 0.02]}>
          <coneGeometry args={[1, 1, 3]} />
        </mesh>
      ))}
      <mesh material={flame} position={[0, 0.17, 0.355]} scale={[0.17, 0.035, 0.02]}>
        <boxGeometry />
      </mesh>
    </group>
  );
}
function Star() {
  return (
    <group>
      <mesh material={post} position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.9, 6]} />
      </mesh>
      <mesh material={post} position={[0.13, 0.88, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 5]} />
      </mesh>
      <mesh material={frost} position={[0.26, 0.66, 0]} scale={[0.15, 0.24, 0.15]} castShadow>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh material={frost} position={[0.26, 0.66, 0]} rotation={[0, Math.PI / 4, Math.PI / 2]} scale={[0.1, 0.2, 0.1]}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
    </group>
  );
}

function Lantern({
  id,
  point,
  prop,
  found,
  name,
  disabled,
  onInteract,
}: {
  id: string;
  point: [number, number];
  prop: Season["prop"];
  found: boolean;
  name: string;
  disabled: boolean;
  onInteract: (id: string) => void;
}) {
  const glow = useMemo(() => haloMaterial(prop === "gourd" ? "#ffb24a" : "#9fdcff"), [prop]),
    sprite = useRef<T.Sprite>(null),
    sparkle = useRef<T.Group>(null),
    y = groundHeight(point[0], point[1]);
  useEffect(() => () => glow.dispose(), [glow]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      flicker = settings.reduced ? 1 : 0.85 + Math.sin(t * 9 + point[0]) * 0.06 + Math.sin(t * 23 + point[1]) * 0.05;
    if (sprite.current) sprite.current.material.opacity = (found ? 0.45 : 0.75) * flicker;
    if (sparkle.current) {
      sparkle.current.visible = !found;
      if (!found && !settings.reduced) {
        sparkle.current.rotation.y = t * 1.3;
        sparkle.current.position.y = 1.05 + Math.sin(t * 2) * 0.08;
      }
    }
  });
  return (
    <WorldInteraction
      name={`season-${id}`}
      position={[point[0], y, point[1]]}
      title={found ? `${name} lantern · found` : `${name} lantern`}
      hint={found ? "Already found" : "Click to collect the lantern"}
      reach={2.4}
      disabled={disabled || found}
      activate={() => onInteract(`season-${id}`)}
    >
      <group rotation={[0, (point[0] * 0.37) % Math.PI, 0]}>{prop === "gourd" ? <Gourd /> : <Star />}</group>
      <sprite ref={sprite} material={glow} position={[prop === "gourd" ? 0 : 0.2, prop === "gourd" ? 0.5 : 0.66, 0]} scale={prop === "gourd" ? 1 : 1.3} />
      <group ref={sparkle} position={[0, 1.05, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={glint} position={[Math.cos(i * 2.1) * 0.22, i * 0.1, Math.sin(i * 2.1) * 0.22]} scale={i ? 0.5 : 0.8}>
            <octahedronGeometry args={[0.08, 0]} />
          </mesh>
        ))}
      </group>
    </WorldInteraction>
  );
}

/** Autumn leaves (or snowflakes) drifting down around the keeper. */
function SeasonAir({ prop }: { prop: Season["prop"] }) {
  const count = settings.quality === "Low" ? 50 : settings.quality === "High" ? 160 : 100;
  const air = useMemo(() => {
    const leaf = prop === "gourd",
      m = new T.InstancedMesh(
        leaf ? new T.PlaneGeometry(0.16, 0.11) : new T.CircleGeometry(0.045, 6),
        new T.MeshBasicMaterial({ side: T.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }),
        count,
      ),
      palette = leaf ? ["#d9752f", "#c4452f", "#e8b440", "#a8582c"] : ["#ffffff", "#eaf6ff"],
      seeds = Array.from({ length: count }, (_, i) => [Math.random() * 30 - 15, Math.random() * 14, Math.random() * 30 - 15, Math.random() * 6.28, i % palette.length]);
    seeds.forEach((s, i) => m.setColorAt(i, new T.Color(palette[s[4]])));
    m.frustumCulled = false;
    m.name = leaf ? "season-leaves" : "season-snow";
    return { m, seeds, leaf };
  }, [prop, count]);
  useEffect(() => () => {
    air.m.geometry.dispose();
    (air.m.material as T.Material).dispose();
  }, [air]);
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ clock }) => {
    air.m.visible = !settings.reduced;
    if (settings.reduced) return;
    const t = clock.elapsedTime;
    air.seeds.forEach(([sx, sy, sz, ph], i) => {
      // Each one falls through a 14 m column above the keeper, swaying as it goes.
      const fall = air.leaf ? 0.9 : 0.6,
        y = 14 - ((t * fall + sy) % 14);
      o.position.set(
        worldFocus.x + sx + Math.sin(t * 0.8 + ph) * 0.8,
        worldFocus.y + y,
        worldFocus.z + sz + Math.cos(t * 0.6 + ph) * 0.6,
      );
      o.rotation.set(t * 1.3 + ph, t * 0.9 + ph, Math.sin(t * 2 + ph) * 0.8);
      o.updateMatrix();
      air.m.setMatrixAt(i, o.matrix);
    });
    air.m.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={air.m} />;
}
/** Small festival decorations: a pair of gourds or star lanterns at each home's steps. */
function PorchDecor({ prop }: { prop: Season["prop"] }) {
  return (
    <group name="season-porches">
      {HAVEN_HOUSES.flatMap((h) =>
        [-1, 1].map((side) => (
          <group key={h.id + side} position={[h.point[0] + side * 0.55, groundHeight(h.point[0], h.point[1] + 2.4) + 0.2, h.point[1] + 2.4]} scale={prop === "gourd" ? 0.55 : 0.4}>
            {prop === "gourd" ? <Gourd /> : <Star />}
          </group>
        )),
      )}
    </group>
  );
}

/** The current festival's hidden lanterns around Havenreach. */
export function SeasonalLanterns({
  season,
  found,
  disabled,
  onInteract,
}: {
  season: Season;
  found: string[];
  disabled: boolean;
  onInteract: (id: string) => void;
}) {
  return (
    <group name={`season-${season.id}`}>
      <SeasonAir prop={season.prop} />
      <PorchDecor prop={season.prop} />
      {season.spots.map((s) => (
        <Lantern key={s.id} {...s} prop={season.prop} name={season.name} found={found.includes(s.id)} disabled={disabled} onInteract={onInteract} />
      ))}
    </group>
  );
}
