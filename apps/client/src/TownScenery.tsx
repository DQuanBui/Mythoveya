import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { TownState } from "../../../packages/shared/types";
import { settings } from "./audio";

export function dressCompanion(model: T.Group, accessory?: "ribbon" | "bell") {
  if (!accessory) return model;
  const adornment = new T.Group();
  adornment.name = "companion-accessory";
  const material = new T.MeshStandardMaterial({
    color: accessory === "bell" ? "#e1bb67" : "#77b4a1",
    roughness: 0.45,
    metalness: accessory === "bell" ? 0.5 : 0,
  });
  if (accessory === "bell") {
    const bell = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), material);
    adornment.add(bell);
    const loop = new T.Mesh(new T.TorusGeometry(0.07, 0.018, 5, 12), material);
    loop.position.y = 0.13;
    adornment.add(loop);
  } else {
    for (const side of [-1, 1]) {
      const wing = new T.Mesh(new T.ConeGeometry(0.15, 0.22, 4), material);
      wing.rotation.z = (side * Math.PI) / 2;
      wing.position.x = side * 0.11;
      adornment.add(wing);
    }
  }
  adornment.position.set(0, 0.65, 0.55);
  (model.userData.rig as T.Group).add(adornment);
  return model;
}
export function TownScenery({ garden }: { garden: TownState["garden"] }) {
  const plants = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (plants.current) {
      const growth = garden
        ? Math.min(
            1,
            Math.max(
              0.2,
              (Date.now() - garden.plantedAt) /
                (garden.readyAt - garden.plantedAt),
            ),
          )
        : 0.04;
      plants.current.scale.y = growth;
      plants.current.rotation.z = settings.reduced
        ? 0
        : Math.sin(clock.elapsedTime * 1.4) * 0.025;
    }
  });
  return (
    <>
      <group name="village-market" position={[11, 0, 4.4]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[2.5, 1.3, 1.1]} />
          <meshStandardMaterial color="#897359" />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <boxGeometry args={[2.8, 0.13, 1.3]} />
          <meshStandardMaterial color="#e6d4ad" />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 1.55, -0.35]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 3.1, 6]} />
            <meshStandardMaterial color="#655d50" />
          </mesh>
        ))}
        {[-1, 0, 1].map((x, i) => (
          <mesh
            key={x}
            position={[x * 0.87, 2.9, 0]}
            rotation={[0.1, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.87, 0.13, 1.9]} />
            <meshStandardMaterial color={i % 2 ? "#e2d8b8" : "#719d8b"} />
          </mesh>
        ))}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
          <mesh key={x} position={[x, 1.58, 0.15]} castShadow>
            <dodecahedronGeometry args={[0.19, 0]} />
            <meshStandardMaterial color={i % 2 ? "#c9a17a" : "#bdd29a"} />
          </mesh>
        ))}
      </group>
      <group name="village-garden" position={[-9.6, 0, 11.8]}>
        <mesh position={[0, 0.09, 0]} receiveShadow>
          <boxGeometry args={[3.2, 0.18, 2.2]} />
          <meshStandardMaterial color="#796958" />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 1.65, 0.2, 0]} castShadow>
              <boxGeometry args={[0.15, 0.3, 2.5]} />
              <meshStandardMaterial color="#b8ab88" />
            </mesh>
            <mesh position={[0, 0.2, s * 1.2]} castShadow>
              <boxGeometry args={[3.4, 0.3, 0.15]} />
              <meshStandardMaterial color="#b8ab88" />
            </mesh>
          </group>
        ))}
        <group ref={plants} position={[0, 0.19, 0]}>
          {Array.from({ length: 6 }, (_, i) => (
            <group
              key={i}
              position={[((i % 3) - 1) * 0.9, 0, Math.floor(i / 3) * 0.8 - 0.4]}
            >
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.03, 0.05, 0.7, 5]} />
                <meshStandardMaterial color="#668f67" />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh
                  key={s}
                  position={[s * 0.14, 0.38, 0]}
                  rotation={[0, 0, s * 0.7]}
                >
                  <octahedronGeometry args={[0.23]} />
                  <meshStandardMaterial color="#a7c183" />
                </mesh>
              ))}
              <mesh position={[0, 0.74, 0]}>
                <dodecahedronGeometry args={[0.14]} />
                <meshStandardMaterial color="#edcf89" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </>
  );
}
