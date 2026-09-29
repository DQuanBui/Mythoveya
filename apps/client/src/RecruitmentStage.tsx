import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as T from "three";
import { byId } from "../../../packages/shared/content";
import { Creature } from "./Scene";
import { settings } from "./audio";

function Entrance({ id }: { id: string }) {
  const creature = useRef<T.Group>(null);
  const halo = useRef<T.Group>(null);
  const started = useRef<number | null>(null);
  const species = byId[id];
  const rare = species.tier === "S" || species.tier === "A";
  useFrame(({ clock }) => {
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
        <Creature id={id} state="victory" scale={0.9} />
      </group>
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

export function RecruitmentStage({ id }: { id: string }) {
  return (
    <div
      className="recruitment-stage"
      role="img"
      aria-label={`${byId[id].name} arrives at the bond shrine`}
    >
      <Canvas camera={{ position: [3.5, 2.3, 5.5], fov: 36 }} dpr={[1, 1.5]}>
        <Entrance key={id} id={id} />
      </Canvas>
    </div>
  );
}
