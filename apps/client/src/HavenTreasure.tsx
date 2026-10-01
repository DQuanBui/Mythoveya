import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { HAVEN_CACHES } from "../../../packages/shared/haven";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";
import { weatherFx } from "./Weather";

const wood = new T.MeshStandardMaterial({ color: "#8b6542", flatShading: true }),
  trim = new T.MeshStandardMaterial({
    color: "#d9b56a",
    metalness: 0.55,
    roughness: 0.35,
  }),
  crystal = new T.MeshStandardMaterial({
    color: "#a9ece0",
    emissive: "#61c7b6",
    emissiveIntensity: 1.1,
    roughness: 0.2,
  }),
  spent = new T.MeshStandardMaterial({ color: "#8fa8a2", roughness: 0.5 }),
  glint = new T.MeshBasicMaterial({ color: "#e9fff8" });

function Cache({
  id,
  name,
  point,
  open,
  disabled,
  onInteract,
}: {
  id: string;
  name: string;
  point: [number, number];
  open: boolean;
  disabled: boolean;
  onInteract: (id: string) => void;
}) {
  const lid = useRef<T.Group>(null),
    sparkle = useRef<T.Group>(null);
  useFrame(({ clock, camera }) => {
    if (lid.current) {
      const target = open ? -1.95 : 0;
      lid.current.rotation.x += (target - lid.current.rotation.x) * 0.12;
    }
    if (sparkle.current) {
      // Mist makes the caches' glimmer carry farther.
      const near =
        Math.hypot(camera.position.x - point[0], camera.position.z - point[1]) <
        26 + weatherFx.mist * 22;
      sparkle.current.visible = !open && near;
      if (sparkle.current.visible && !settings.reduced) {
        sparkle.current.rotation.y = clock.elapsedTime * 1.4;
        sparkle.current.position.y = 1.05 + Math.sin(clock.elapsedTime * 2.2) * 0.1;
        const s = 0.75 + Math.abs(Math.sin(clock.elapsedTime * 1.7)) * 0.5;
        sparkle.current.scale.setScalar(s);
      }
    }
  });
  return (
    <WorldInteraction
      name={`cache-${id}`}
      position={[point[0], 0, point[1]]}
      title={open ? `${name} · opened` : "Skyglass cache"}
      hint={open ? "Already found" : "Click to open the cache"}
      reach={2.6}
      disabled={disabled}
      activate={() => onInteract(`cache-${id}`)}
    >
      <group rotation={[0, (id.length * 0.7) % Math.PI, 0]}>
        <mesh material={wood} position={[0, 0.24, 0]} castShadow>
          <boxGeometry args={[0.8, 0.44, 0.52]} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} material={trim} position={[x, 0.25, 0]}>
            <boxGeometry args={[0.07, 0.47, 0.55]} />
          </mesh>
        ))}
        <mesh material={trim} position={[0, 0.3, 0.27]}>
          <boxGeometry args={[0.14, 0.16, 0.04]} />
        </mesh>
        <mesh material={open ? spent : crystal} position={[0, 0.5, 0]}>
          <octahedronGeometry args={[0.17, 0]} />
        </mesh>
        <group ref={lid} position={[0, 0.46, -0.26]}>
          <mesh material={wood} position={[0, 0, 0.26]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.8, 8, 1, false, 0, Math.PI]} />
          </mesh>
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} material={trim} position={[x, 0, 0.26]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.275, 0.275, 0.07, 8, 1, false, 0, Math.PI]} />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={sparkle} position={[0, 1.05, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={glint} position={[Math.cos(i * 2.1) * 0.22, i * 0.12, Math.sin(i * 2.1) * 0.22]} scale={i ? 0.55 : 1}>
            <octahedronGeometry args={[0.08, 0]} />
          </mesh>
        ))}
      </group>
    </WorldInteraction>
  );
}

export function HavenTreasure({
  found,
  disabled,
  onInteract,
}: {
  found: string[];
  disabled: boolean;
  onInteract: (id: string) => void;
}) {
  return (
    <group name="skyglass-caches">
      {HAVEN_CACHES.map((c) => (
        <Cache
          key={c.id}
          {...c}
          open={found.includes(c.id)}
          disabled={disabled}
          onInteract={onInteract}
        />
      ))}
    </group>
  );
}
