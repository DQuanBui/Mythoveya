import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";
import { HAVEN_POND, edgeRadius } from "../../../packages/shared/haven";

export function HavenWater() {
  const ripples = useRef<T.Group>(null),
    falls = useRef<T.Group>(null),
    fish = useRef<T.Group>(null),
    splash = useRef<T.Mesh<T.RingGeometry, T.MeshBasicMaterial>>(null),
    p = HAVEN_POND;
  const pads = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: 21 + Math.sin(i * 2.4) * 5.7,
        z: -5 + Math.cos(i * 2.4) * 4.2,
      })).filter((p) => Math.abs(p.z + 5) > 1.8),
    [],
  );
  useFrame(({ clock }) => {
    if (settings.reduced) return;
    ripples.current?.children.forEach((r, i) => {
      const phase = (clock.elapsedTime * 0.17 + i * 0.23) % 1;
      r.scale.setScalar(0.7 + phase * 1.5);
      (r as T.Mesh<T.RingGeometry, T.MeshBasicMaterial>).material.opacity =
        (1 - phase) * 0.3;
    });
    falls.current?.children.forEach((r, i) => {
      r.position.y = -((clock.elapsedTime * 2 + i * 0.6) % 7);
    });
    // Every few seconds a fish leaps somewhere new and leaves a ring.
    const cycle = clock.elapsedTime / 4.5,
      n = Math.floor(cycle),
      t = cycle - n,
      a = n * 2.4,
      x = p.x + Math.cos(a) * 4.2,
      z = p.z + Math.sin(a) * 3 + (Math.abs(Math.sin(a) * 3) < 1.6 ? 2.4 : 0);
    if (fish.current) {
      fish.current.visible = t < 0.22;
      const u = t / 0.22;
      fish.current.position.set(x + (u - 0.5) * 1.1, 0.05 + Math.sin(u * Math.PI) * 0.75, z);
      fish.current.rotation.z = (0.5 - u) * 2.2;
    }
    if (splash.current) {
      const s = t < 0.22 ? 0 : (t - 0.22) / 0.5;
      splash.current.visible = s > 0 && s < 1;
      splash.current.position.set(x + 0.55, 0.045, z);
      splash.current.scale.setScalar(0.3 + s * 1.6);
      splash.current.material.opacity = (1 - s) * 0.55;
    }
  });
  return (
    <group name="willowmere-water">
      <mesh
        position={[p.x, 0.021, p.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[p.rx + 0.65, p.rz + 0.65, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#c5caab" />
      </mesh>
      <mesh
        name="pond-surface"
        position={[p.x, 0.03, p.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[p.rx, p.rz, 1]}
      >
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color="#77b1b0"
          roughness={0.24}
          metalness={0.18}
        />
      </mesh>
      <group ref={ripples}>
        {[
          [18, -8],
          [25, -2],
          [24, -9],
          [17, -2],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            position={[x, 0.043, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.6, 0.63, 36]} />
            <meshBasicMaterial
              color="#d1ece0"
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {pads.map((v, i) => (
        <group key={i} position={[v.x, 0.05, v.z]}>
          <mesh rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[0.32, 7]} />
            <meshStandardMaterial color={i % 2 ? "#95b68a" : "#83a584"} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0, 0.09, 0]}>
              <icosahedronGeometry args={[0.13, 0]} />
              <meshStandardMaterial color="#e8b6b5" />
            </mesh>
          )}
        </group>
      ))}
      <group ref={fish} name="leaping-fish" visible={false}>
        <mesh scale={[0.32, 0.12, 0.09]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#e3a35c" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.12, 0.1, 0.02]}>
          <coneGeometry args={[1, 1, 3]} />
          <meshStandardMaterial color="#d48a4c" />
        </mesh>
      </group>
      <mesh ref={splash} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.5, 0.6, 28]} />
        <meshBasicMaterial color="#e6f6ef" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <group name="willowmere-bridge" position={[21, 0, -5]}>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh key={i} position={[-8.7 + i * 0.6, 0.065, 0]} receiveShadow>
            <boxGeometry args={[0.56, 0.12, 2.45]} />
            <meshStandardMaterial color={i % 3 ? "#af9977" : "#bea584"} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={side}>
            {[-8, -4, 0, 4, 8].map((x) => (
              <mesh key={x} position={[x, 0.65, side * 1.4]} castShadow>
                <boxGeometry args={[0.16, 1.3, 0.16]} />
                <meshStandardMaterial color="#8c795e" />
              </mesh>
            ))}
            <mesh position={[0, 1.15, side * 1.4]}>
              <boxGeometry args={[17, 0.12, 0.12]} />
              <meshStandardMaterial color="#b7a481" />
            </mesh>
          </group>
        ))}
      </group>
      <group
        name="cloudfall"
        position={[Math.cos(0.2) * (edgeRadius(0.2) + 0.6), 0, Math.sin(0.2) * (edgeRadius(0.2) + 0.6)]}
        rotation={[0, 0.2, 0]}
      >
        <mesh position={[0, -4, 0]}>
          <boxGeometry args={[2.8, 8, 0.2]} />
          <meshStandardMaterial
            color="#add5cd"
            transparent
            opacity={0.64}
            emissive="#7daaa4"
            emissiveIntensity={0.15}
          />
        </mesh>
        <group ref={falls}>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} position={[((i % 3) - 1) * 0.7, -i * 0.7, 0.13]}>
              <boxGeometry args={[0.06, 0.65, 0.03]} />
              <meshBasicMaterial color="#e0f3e5" transparent opacity={0.55} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
