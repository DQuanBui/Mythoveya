import { useRef } from "react";
import { ModelLighting } from "./ModelLighting";
import { Canvas, useFrame } from "@react-three/fiber";
import * as T from "three";
import { byId } from "../../../packages/shared/content";
import { Creature } from "./Scene";
import { settings } from "./audio";

function Entrance({ id, shimmer = false }: { id: string; shimmer?: boolean }) {
  const creature = useRef<T.Group>(null);
  const halo = useRef<T.Group>(null);
  const started = useRef<number | null>(null);
  const burst = useRef<T.Group>(null);
  const species = byId[id];
  const rare = species.tier === "S" || species.tier === "A";
  useFrame(({ clock, camera }) => {
    started.current ??= clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - started.current) / 1.8);
    const ease = 1 - (1 - t) ** 3;
    if (creature.current) {
      creature.current.scale.setScalar(
        settings.reduced ? 1 : 0.05 + ease * 0.95,
      );
      creature.current.position.y = settings.reduced ? 0 : (1 - ease) * 0.7;
      creature.current.rotation.y = settings.reduced
        ? 0.35
        : 0.35 + (1 - ease) * Math.PI * 2;
    }
    // A shimmer's arrival ends in a prismatic starburst, and the shrine's
    // halo keeps cycling through the rainbow while it stands there.
    const since = clock.elapsedTime - started.current;
    if (burst.current) {
      const b = (since - 1.5) / 0.9;
      burst.current.visible = shimmer && !settings.reduced && b > 0 && b < 1;
      if (burst.current.visible) {
        const fade = 1 - b;
        burst.current.quaternion.copy(camera.quaternion);
        burst.current.children.forEach((m, i) => {
          const mat = (m as T.Mesh).material as T.MeshBasicMaterial;
          mat.opacity = fade;
          mat.color.setHSL((i / 9 + since * 0.4) % 1, 0.95, 0.62);
          if (i === 0) m.scale.setScalar(0.3 + b * 2.4);
          else m.scale.set(1, 0.2 + Math.sin(b * Math.PI) * 1.2, 1);
        });
      }
    }
    if (shimmer && halo.current)
      halo.current.children.forEach((m, i) =>
        ((m as T.Mesh).material as T.MeshBasicMaterial).color.setHSL((i * 0.07 + (settings.reduced ? 0 : clock.elapsedTime * 0.15)) % 1, 0.7, 0.72),
      );
    if (halo.current) {
      halo.current.rotation.y = settings.reduced ? 0 : clock.elapsedTime * 0.3;
      halo.current.scale.setScalar(
        0.9 + (settings.reduced ? 0 : Math.sin(clock.elapsedTime * 2) * 0.05),
      );
    }
  });
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 6, 5]} intensity={3} color="#fff0d5" />
      <pointLight position={[0, 2, -2]} color={species.color} intensity={12} />
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.7, 2, 0.3, 48]} />
        <meshStandardMaterial
          color="#324e58"
          metalness={0.3}
          roughness={0.45}
        />
      </mesh>
      <group ref={creature}>
        <Creature id={id} shimmer={shimmer} state="victory" scale={0.9} />
      </group>
      {shimmer && (
        <group ref={burst} name="shimmer-burst" position={[0, 0.7, 0]} visible={false}>
          <mesh>
            <torusGeometry args={[0.6, 0.05, 6, 48]} />
            <meshBasicMaterial transparent depthWrite={false} blending={T.AdditiveBlending} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} position={[-Math.sin(a) * 1.1, Math.cos(a) * 1.1, 0]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.08, 1.2, 0.02]} />
                <meshBasicMaterial transparent depthWrite={false} blending={T.AdditiveBlending} />
              </mesh>
            );
          })}
        </group>
      )}
      <group ref={halo}>
        {[0, 1].map((i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.025 + i * 0.02, 0]}
          >
            <torusGeometry args={[1.4 + i * 0.27, 0.018, 5, 64]} />
            <meshBasicMaterial color={rare ? "#f7d28e" : species.color} />
          </mesh>
        ))}
        {Array.from({ length: settings.quality === "Low" ? 8 : 18 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * 2.4) * 1.5,
              0.4 + (i % 5) * 0.37,
              Math.cos(i * 2.4) * 1.5,
            ]}
          >
            <octahedronGeometry args={[rare ? 0.045 : 0.025]} />
            <meshBasicMaterial color={rare ? "#f7d28e" : species.color} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export function RecruitmentStage({ id, shimmer = false }: { id: string; shimmer?: boolean }) {
  return (
    <div
      className="recruitment-stage"
      role="img"
      aria-label={`${shimmer ? "Shimmering " : ""}${byId[id].name} arrives at the bond shrine`}
    >
      <Canvas camera={{ position: [3.5, 2.3, 5.5], fov: 36 }} dpr={[1, 1.5]}>
        <ModelLighting intensity={0.7} />
        <Entrance key={`${id}:${shimmer}`} id={id} shimmer={shimmer} />
      </Canvas>
    </div>
  );
}
