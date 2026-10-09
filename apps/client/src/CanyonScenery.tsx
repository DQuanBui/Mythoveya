import { WorldInteraction } from "./WorldInteraction";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  CANYON_BEACONS,
  CANYON_COLUMNS,
  CANYON_NOTES,
  CANYON_SPRINGS,
  canyonHeight,
  canyonPathDistance,
  canyonWalkable,
  canyonPropPoint,
} from "../../../packages/shared/canyon";
import { Kit, SHAPES } from "./village-kit";
import { settings } from "./audio";

function build() {
  const k = new Kit();
  for (const [x, z, r, h] of CANYON_COLUMNS) {
    const y = canyonHeight(x, z);
    for (let i = 0; i < 4; i++)
      k.add(
        SHAPES.CYL6,
        i % 2 ? "#836c70" : "#a98272",
        [x, y + (h * (i + 0.5)) / 4, z],
        [r * (1 - i * 0.09), h / 4, r * (1 - i * 0.09)],
      );
    k.add(
      SHAPES.CYL6,
      "#ceb4a3",
      [x, y + h + 0.08, z],
      [r * 0.75, 0.16, r * 0.75],
    );
  }
  // Ranger shelter: doorway faces the campsite; footprint matches the layout.
  k.push([-24, canyonHeight(-24, 30), 30], Math.PI);
  k.box("#766559", [0, 0.1, 0], [4.6, 0.3, 4]);
  k.box("#e3bd92", [0, 1.3, 0], [4.4, 2.4, 3.8]);
  k.add(SHAPES.GABLE, "#77698c", [0, 2.55, 0], [5, 1.3, 4.5]);
  k.box("#665b54", [0, 1, 1.94], [1.1, 1.9, 0.08]);
  for (const x of [-1.45, 1.45]) {
    k.box("#586d70", [x, 1.45, 1.96], [0.75, 0.85, 0.1]);
    k.box("#efd69b", [x, 1.45, 2.02], [0.55, 0.65, 0.03]);
  }
  k.box("#825a46", [1.6, 3.2, -0.7], [0.5, 1, 0.5]);
  k.pop();
  // Field table, rolled maps and sample boxes beside the door.
  const cy = canyonHeight(-27, 27);
  k.box("#997456", [-27, cy + 0.8, 27], [1.5, 0.16, 0.8]);
  for (const x of [-27.6, -26.4])
    k.box("#765e50", [x, cy + 0.4, 27], [0.12, 0.8, 0.12]);
  k.box("#e8d6af", [-27, cy + 0.9, 27], [1, 0.025, 0.55]);
  for (const n of CANYON_NOTES) {
    const [x, z] = canyonPropPoint(n),
      y = canyonHeight(x, z);
    k.add(SHAPES.ROCK, "#d4b398", [x, y + 0.25, z], [0.6, 0.25, 0.45]);
    for (let i = 0; i < 5; i++)
      k.add(
        SHAPES.BALL,
        n.id === "spring"
          ? "#7ec0b4"
          : n.id === "glass"
            ? "#c09cda"
            : "#f1d1a1",
        [x + Math.cos(i) * 0.2, y + 0.5, z + Math.sin(i) * 0.2],
        [0.09, 0.06, 0.1],
      );
  }
  // Soft drought plants remain clear of paths and interaction sites.
  for (let i = 0; i < 170; i++) {
    const a = i * 2.39996,
      r = 18 + (i % 17) * 1.35,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    if (!canyonWalkable(x, z) || canyonPathDistance(x, z) < 2.6) continue;
    const y = canyonHeight(x, z);
    for (let j = 0; j < 3; j++)
      k.add(
        SHAPES.CONE,
        "#88a28a",
        [x + Math.sin(j * 2) * 0.18, y + 0.27, z + Math.cos(j * 2) * 0.18],
        [0.12, 0.65, 0.1],
        [0.3, j * 2, 0],
      );
    if (i % 3 === 0)
      k.add(
        SHAPES.BALL,
        i % 2 ? "#d99594" : "#e8c376",
        [x, y + 0.57, z],
        [0.14, 0.12, 0.13],
      );
  }
  return k.build();
}
let scenery: T.BufferGeometry | undefined;
export function CanyonScenery({
  beacons,
  restored,
  onInteract,
  disabled,
}: {
  beacons: string[];
  restored: boolean;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const g = useMemo(() => (scenery ||= build()), []),
    steam = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (settings.reduced) return;
    steam.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.15 + i * 0.21) % 1;
      m.position.y = 0.35 + t * 2;
      m.scale.setScalar(0.45 + t * 0.75);
      (m as T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>).material.opacity =
        (1 - t) * 0.13;
    });
  });
  return (
    <group name="canyon-scenery">
      <mesh geometry={g} dispose={null} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {CANYON_SPRINGS.map((p, i) => (
        <group key={i} position={[p.x, 0.04, p.z]} name={`canyon-spring-${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[p.rx, p.rz, 1]}>
            <circleGeometry args={[1, 64]} />
            <meshStandardMaterial
              color="#78bdbc"
              metalness={0.15}
              roughness={0.23}
            />
          </mesh>
          {[0.65, 0.83, 1].map((s, j) => (
            <mesh
              key={s}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02 + j * 0.002, 0]}
              scale={[p.rx * s, p.rz * s, 1]}
            >
              <ringGeometry args={[0.97, 1, 64]} />
              <meshBasicMaterial color="#e0e7c3" transparent opacity={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={steam} name="spring-steam">
        {CANYON_SPRINGS.flatMap((p, j) =>
          Array.from({ length: settings.quality === "Low" ? 3 : 6 }, (_, i) => (
            <mesh
              key={`${j}-${i}`}
              position={[
                p.x + Math.sin(i) * p.rx * 0.6,
                0.4 + i * 0.2,
                p.z + Math.cos(i) * p.rz * 0.5,
              ]}
            >
              <sphereGeometry args={[0.8, 8, 6]} />
              <meshBasicMaterial
                color="#e1e5d6"
                transparent
                opacity={0.08}
                depthWrite={false}
              />
            </mesh>
          )),
        )}
      </group>
      {[...CANYON_BEACONS, ...CANYON_NOTES].map((n) => {
        const [x, z] = canyonPropPoint(n);
        return (
          <WorldInteraction
            key={n.id}
            name={`canyon-site-${n.id}`}
            position={[x, canyonHeight(x, z), z]}
            approach={[...n.point]}
            reach={4.5}
            title={n.name}
            disabled={disabled}
            activate={() => onInteract(`can-${n.id}`)}
          >
            <mesh
              position={[
                0,
                CANYON_BEACONS.some((b) => b.id === n.id) ? 1.3 : 0.4,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  1.5,
                  CANYON_BEACONS.some((b) => b.id === n.id) ? 3 : 1,
                  1.5,
                ]}
              />
              <meshBasicMaterial visible={false} />
            </mesh>
          </WorldInteraction>
        );
      })}
      {CANYON_BEACONS.map((n, i) => {
        const [x, z] = canyonPropPoint(n),
          lit = beacons.includes(n.id);
        return (
          <group
            key={n.id}
            name={`beacon-${n.id}`}
            position={[x, canyonHeight(x, z), z]}
          >
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.65, 2.2, 6]} />
              <meshStandardMaterial color="#897780" />
            </mesh>
            <mesh position={[0, 2.35, 0]}>
              <octahedronGeometry args={[0.55]} />
              <meshStandardMaterial
                color={lit ? "#f4c978" : "#8b8fa0"}
                emissive={lit ? "#e7a45a" : "#000000"}
                emissiveIntensity={lit ? 1 : 0}
              />
            </mesh>
            {lit && (
              <mesh position={[0, 3.25, 0]}>
                <cylinderGeometry args={[0.035, 0.15, 1.4, 8]} />
                <meshBasicMaterial
                  color="#ffdf92"
                  transparent
                  opacity={restored ? 0.65 : 0.3}
                />
              </mesh>
            )}
          </group>
        );
      })}
      {restored && (
        <mesh
          name="canyon-signal-halo"
          position={[-24, canyonHeight(-24, 30) + 4.6, 30]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[1.1, 0.055, 6, 48]} />
          <meshBasicMaterial color="#ffdb86" />
        </mesh>
      )}
    </group>
  );
}
