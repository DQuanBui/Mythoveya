import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  MEADOW_BUILDINGS,
  MEADOW_TREES,
  MEADOW_POND,
  MEADOW_HEART,
  MEADOW_SHRINES,
  MEADOW_NOTES,
  meadowHeight,
  meadowPropPoint,
  meadowWalkable,
  meadowPathDistance,
  type MeadowJourney,
} from "../../../packages/shared/meadow";
import { Kit, SHAPES } from "./village-kit";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";
function woodland() {
  const k = new Kit();
  MEADOW_TREES.forEach((p, i) => {
    const y = meadowHeight(p.x, p.z),
      s = p.scale;
    k.add(
      SHAPES.CYL6,
      i % 3 ? "#867965" : "#dad2b7",
      [p.x, y + 1.8 * s, p.z],
      [0.22, 3.6 * s, 0.22],
    );
    for (let j = 0; j < 3; j++)
      k.add(
        SHAPES.BUSH,
        ["#618b70", "#8aa271", "#b3b27e"][i % 3],
        [
          p.x + Math.sin(j * 2.1) * s,
          y + (3 + j * 0.4) * s,
          p.z + Math.cos(j * 2.1) * s,
        ],
        [1.4 * s, 1.2 * s, 1.4 * s],
      );
  });
  for (const b of MEADOW_BUILDINGS) {
    const y = meadowHeight(b.x, b.z);
    k.push([b.x, y, b.z]);
    k.box("#a89b7f", [0, 0.15, 0], [b.width, 0.3, b.depth]);
    k.box("#d6ccaa", [0, 1.3, 0], [b.width - 0.2, 2.4, b.depth - 0.2]);
    k.add(
      SHAPES.GABLE,
      b.roof,
      [0, 2.55, 0],
      [b.width + 0.6, 1.5, b.depth + 0.6],
    );
    k.box("#6c7763", [0, 1, -b.depth / 2], [1, 1.9, 0.1]);
    for (const x of [-b.width * 0.32, b.width * 0.32]) {
      k.box("#746f60", [x, 1.4, -b.depth / 2], [0.9, 0.9, 0.12]);
      k.box("#ffe2a1", [x, 1.4, -b.depth / 2 - 0.08], [0.65, 0.65, 0.06]);
      k.box("#987658", [x, 0.85, -b.depth / 2 - 0.3], [1, 0.25, 0.5]);
      k.add(
        SHAPES.BUSH,
        "#769777",
        [x, 1, -b.depth / 2 - 0.3],
        [0.6, 0.25, 0.4],
      );
    }
    k.pop();
  }
  const [x, z] = MEADOW_HEART,
    y = meadowHeight(x, z);
  k.add(SHAPES.CYL6, "#746957", [x, y + 3, z], [1.65, 6, 1.65]);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    k.add(
      SHAPES.BUSH,
      "#739878",
      [x + Math.cos(a) * 2.1, y + 6 + Math.sin(a), z + Math.sin(a) * 2.1],
      [2.6, 2, 2.6],
    );
  }
  for (let i = 0; i < 170; i++) {
    const a = i * 2.39996,
      r = 12 + (i % 24),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      y = meadowHeight(x, z);
    if (!meadowWalkable(x, z) || meadowPathDistance(x, z) < 1.5) continue;
    k.add(SHAPES.CYL6, "#648765", [x, y + 0.15, z], [0.025, 0.3, 0.025]);
    k.add(
      i % 3 ? SHAPES.BALL : SHAPES.BUSH,
      ["#e7bbad", "#dacc83", "#b4a3d0"][i % 3],
      [x, y + 0.35, z],
      [0.18, 0.12, 0.18],
    );
    if (i % 4 === 0) {
      k.add(SHAPES.CYL6, "#e0cdb3", [x + 0.3, y + 0.17, z], [0.07, 0.34, 0.07]);
      k.add(SHAPES.BALL, "#aa777d", [x + 0.3, y + 0.37, z], [0.28, 0.14, 0.28]);
    }
  }
  for (const n of MEADOW_NOTES) {
    const [x, z] = meadowPropPoint(n),
      y = meadowHeight(x, z);
    k.box("#856e58", [x, y + 0.5, z], [0.12, 1, 0.12]);
    k.box("#decda4", [x, y + 1, z], [0.8, 0.5, 0.1]);
  }
  return k.build();
}
export function MeadowScenery({
  journey,
  onInteract,
  disabled,
}: {
  journey: MeadowJourney;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const geometry = useMemo(woodland, []),
    fireflies = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (fireflies.current)
      fireflies.current.children.forEach((o, i) => {
        o.position.y =
          3.8 +
          (settings.reduced ? 0 : Math.sin(clock.elapsedTime * 0.7 + i) * 0.3);
      });
  });
  return (
    <group name="whisperleaf-scenery">
      <mesh geometry={geometry} dispose={null} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <group
        name="whisperleaf-pond"
        position={[MEADOW_POND.x, 0.05, MEADOW_POND.z]}
      >
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[MEADOW_POND.rx, MEADOW_POND.rz, 1]}
        >
          <circleGeometry args={[1, 80]} />
          <meshPhysicalMaterial
            color="#70b3ad"
            roughness={0.2}
            metalness={0.12}
            clearcoat={0.8}
          />
        </mesh>
        {[0.65, 0.9, 1].map((s) => (
          <mesh
            key={s}
            position={[0, 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[MEADOW_POND.rx * s, MEADOW_POND.rz * s, 1]}
          >
            <ringGeometry args={[0.99, 1, 64]} />
            <meshBasicMaterial color="#cde4c7" transparent opacity={0.5} />
          </mesh>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 2) * 4, 0.025, Math.cos(i * 2) * 3]}
            rotation={[-Math.PI / 2, 0, i]}
          >
            <circleGeometry args={[0.4, 12, 0, Math.PI * 1.8]} />
            <meshStandardMaterial color="#8ba874" side={T.DoubleSide} />
          </mesh>
        ))}
      </group>
      {MEADOW_SHRINES.map((n) => {
        const [x, z] = meadowPropPoint(n),
          lit = journey.choirs.includes(n.id);
        return (
          <WorldInteraction
            key={n.id}
            name={`choir-${n.id}`}
            title={n.name}
            hint="Read the woodland verse"
            approach={n.point}
            reach={4}
            disabled={disabled}
            activate={() => onInteract(`mea-${n.id}`)}
          >
            <group
              position={[x, meadowHeight(x, z), z]}
              name={`meadow-choir-${n.id}`}
              userData={{ restored: lit }}
            >
              <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.65, 0.7, 0.3, 8]} />
                <meshStandardMaterial color="#a8b19b" />
              </mesh>
              {[-0.45, 0.45].map((x) => (
                <mesh key={x} position={[x, 1.15, 0]}>
                  <cylinderGeometry args={[0.08, 0.1, 2, 6]} />
                  <meshStandardMaterial color="#83765e" />
                </mesh>
              ))}
              <mesh position={[0, 2.15, 0]}>
                <boxGeometry args={[1.2, 0.15, 0.15]} />
                <meshStandardMaterial color="#83765e" />
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh key={i} position={[(i - 1) * 0.32, 1.5 - i * 0.15, 0]}>
                  <cylinderGeometry args={[0.085, 0.085, 0.8 + i * 0.2, 8]} />
                  <meshStandardMaterial
                    color={["#a5c391", "#89c9d0", "#ceb0d8"][i]}
                    metalness={0.45}
                    roughness={0.3}
                    emissive={lit ? "#9ddea2" : "#000000"}
                    emissiveIntensity={lit ? 0.5 : 0}
                  />
                </mesh>
              ))}
            </group>
          </WorldInteraction>
        );
      })}
      <group
        name="heartroot-blossoms"
        visible={journey.finished}
        position={[
          MEADOW_HEART[0],
          meadowHeight(...MEADOW_HEART) + 6,
          MEADOW_HEART[1],
        ]}
      >
        {Array.from({ length: 18 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * 2.4) * 3,
              Math.sin(i) * 1.2,
              Math.cos(i * 2.4) * 3,
            ]}
          >
            <icosahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial
              color={i % 2 ? "#efceb1" : "#e8b7cc"}
              emissive="#c8939d"
              emissiveIntensity={0.25}
            />
          </mesh>
        ))}
      </group>
      <group
        ref={fireflies}
        name="woodland-fireflies"
        visible={journey.finished}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 2.4) * 6, 3.8, -27 + Math.cos(i * 2.4) * 3]}
          >
            <sphereGeometry args={[0.055, 6, 4]} />
            <meshBasicMaterial color="#fff3af" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
