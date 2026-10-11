import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  HOLLOW_BUILDINGS,
  HOLLOW_FIRS,
  HOLLOW_GATHER,
  HOLLOW_LAKE,
  HOLLOW_LANTERNS,
  HOLLOW_MOUNTAINS,
  HOLLOW_NOTES,
  hollowHeight,
  hollowPropPoint,
  type HollowJourney,
} from "../../../packages/shared/hollow";
import { Kit, SHAPES } from "./village-kit";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";

function build() {
  const k = new Kit();
  for (const p of HOLLOW_FIRS) {
    const y = hollowHeight(p.x, p.z),
      s = p.scale;
    k.add(SHAPES.CYL6, "#6c6b79", [p.x, y + s, p.z], [0.23, s * 2, 0.23]);
    for (let j = 0; j < 3; j++) {
      k.add(
        SHAPES.CONE,
        j % 2 ? "#6e969a" : "#557a87",
        [p.x, y + (1.7 + j * 0.85) * s, p.z],
        [(1.4 - j * 0.3) * s, 2 * s, (1.4 - j * 0.3) * s],
      );
      k.add(
        SHAPES.CONE,
        "#dfebee",
        [p.x, y + (2.13 + j * 0.85) * s, p.z],
        [(1.07 - j * 0.23) * s, 1.3 * s, (1.07 - j * 0.23) * s],
      );
    }
  }
  for (const [x, z, r, h] of HOLLOW_MOUNTAINS) {
    const y = hollowHeight(x, z);
    k.add(SHAPES.CONE, "#718398", [x, y + h / 2, z], [r, h, r]);
    k.add(
      SHAPES.CONE,
      "#e6edef",
      [x, y + h * 0.82, z],
      [r * 0.38, h * 0.38, r * 0.38],
    );
  }
  for (const [i, b] of HOLLOW_BUILDINGS.entries()) {
    k.push(
      [b.x, hollowHeight(b.x, b.z), b.z],
      i === 0 ? Math.PI : i === 2 ? -Math.PI / 2 : 0,
    );
    k.box("#748195", [0, 0.15, 0], [b.width, 0.3, b.depth]);
    k.box("#b5ced1", [0, 1.35, 0], [b.width - 0.2, 2.4, b.depth - 0.2]);
    k.add(
      SHAPES.GABLE,
      b.roof,
      [0, 2.65, 0],
      [b.width + 0.4, 1.5, b.depth + 0.4],
    );
    k.add(
      SHAPES.GABLE,
      "#e6eeea",
      [0, 2.85, 0],
      [b.width + 0.5, 1.35, b.depth + 0.5],
    );
    k.box("#5e677f", [0, 1, b.depth / 2], [1.05, 1.9, 0.08]);
    for (const x of [-b.width * 0.3, b.width * 0.3]) {
      k.box("#576b81", [x, 1.55, b.depth / 2], [0.8, 0.8, 0.09]);
      k.box("#ffe1a4", [x, 1.55, b.depth / 2 + 0.05], [0.6, 0.6, 0.04]);
    }
    if (i === 1) {
      k.add(SHAPES.CYL6, "#a0afbe", [0, 3.3, 0], [1.4, 0.4, 1.4]);
      k.add(SHAPES.BALL, "#7c92a8", [0, 3.6, 0], [1.3, 0.8, 1.3]);
      k.add(
        SHAPES.CYL6,
        "#b9d2d8",
        [0, 3.9, 1],
        [0.25, 2, 0.25],
        [Math.PI / 3, 0, 0],
      );
    }
    k.pop();
  }
  // Small survey markers occupy exactly the blocked prop footprints.
  for (const n of HOLLOW_NOTES) {
    const [x, z] = hollowPropPoint(n),
      y = hollowHeight(x, z);
    k.box("#667e91", [x, y + 0.45, z], [0.14, 0.9, 0.14]);
    k.box("#d9e4da", [x, y + 0.95, z], [0.8, 0.45, 0.12]);
  }
  return k.build();
}
function ribbon(i: number) {
  const pos: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= 48; j++) {
    const x = -21 + j * 0.85,
      z = -52 + Math.sin(j * 0.17 + i) * 1.3 - i * 1.8,
      y = 11.5 + Math.sin(j * 0.12 + i) * 0.8;
    pos.push(x, y, z, x, y + 1.2 + Math.sin(j * 0.2) * 0.4, z);
    if (j < 48) {
      const a = j * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
let scenery: T.BufferGeometry | undefined;
const ribbons = [ribbon(0), ribbon(1), ribbon(2)];
export function HollowScenery({
  journey,
  onInteract,
  disabled,
}: {
  journey: HollowJourney;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const geometry = useMemo(() => (scenery ||= build()), []),
    aurora = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    aurora.current?.children.forEach((o, i) => {
      const m = o as T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>;
      m.material.opacity =
        (journey.finished ? 0.3 : 0.1) +
        (settings.reduced ? 0 : Math.sin(clock.elapsedTime * 0.3 + i) * 0.025);
    });
  });
  const lake = HOLLOW_LAKE;
  return (
    <group name="moonfrost-scenery">
      <mesh geometry={geometry} dispose={null} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <group name="moonfrost-lake" position={[lake.x, 0.05, lake.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[lake.rx, lake.rz, 1]}>
          <circleGeometry args={[1, 80]} />
          <meshPhysicalMaterial
            color="#78b6cb"
            roughness={0.22}
            metalness={0.15}
            clearcoat={0.8}
          />
        </mesh>
        {[0.84, 1].map((s, i) => (
          <mesh
            key={s}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02 + i * 0.002, 0]}
            scale={[lake.rx * s, lake.rz * s, 1]}
          >
            <ringGeometry args={[0.975, 1, 80]} />
            <meshBasicMaterial color="#d8f1ed" transparent opacity={0.6} />
          </mesh>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, i * 0.9]}
            position={[Math.sin(i * 2) * 4, 0.04, Math.cos(i * 2) * 2]}
          >
            <planeGeometry args={[1.1, 0.035]} />
            <meshBasicMaterial color="#d8eeee" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
      <group name="moonfrost-aurora" ref={aurora}>
        {ribbons.map((g, i) => (
          <mesh key={i} geometry={g} dispose={null}>
            <meshBasicMaterial
              color={["#87e7d4", "#b0a4ee", "#afdaf2"][i]}
              side={T.DoubleSide}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {HOLLOW_LANTERNS.map((n) => {
        const [x, z] = hollowPropPoint(n),
          lit = journey.installed.includes(n.id);
        return (
          <WorldInteraction
            key={n.id}
            name={`lantern-${n.id}`}
            title={n.name}
            hint={lit ? "A safe trail" : "Install a crafted lantern"}
            approach={n.point}
            reach={4}
            disabled={disabled}
            activate={() => onInteract(`hol-${n.id}`)}
          >
            <group
              position={[x, hollowHeight(x, z), z]}
              name={`moonfrost-lantern-${n.id}`}
              userData={{ lit }}
            >
              <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.15, 2, 6]} />
                <meshStandardMaterial color="#677b8c" />
              </mesh>
              <mesh position={[0, 2.05, 0]}>
                <boxGeometry args={[0.6, 0.8, 0.6]} />
                <meshStandardMaterial
                  color={lit ? "#ffe5a1" : "#8296a4"}
                  emissive="#eabb70"
                  emissiveIntensity={lit ? 1.3 : 0}
                />
              </mesh>
              <mesh
                position={[0, 2.6, 0]}
                rotation={[0, Math.PI / 4, 0]}
                castShadow
              >
                <coneGeometry args={[0.5, 0.4, 4]} />
                <meshStandardMaterial color="#617989" />
              </mesh>
              {lit && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
                  <circleGeometry args={[1.5, 24]} />
                  <meshBasicMaterial
                    color="#f7d99b"
                    transparent
                    opacity={0.16}
                    depthWrite={false}
                  />
                </mesh>
              )}
            </group>
          </WorldInteraction>
        );
      })}
      {HOLLOW_GATHER.map((n) => {
        const [x, z] = hollowPropPoint(n),
          done = journey.gathered.includes(n.id);
        return (
          <WorldInteraction
            key={n.id}
            name={`hollow-material-${n.id}`}
            title={n.name}
            hint={done ? "Materials gathered" : n.description}
            approach={n.point}
            reach={4}
            disabled={disabled}
            activate={() => onInteract(`hol-${n.id}`)}
          >
            <group position={[x, hollowHeight(x, z), z]}>
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[(i - 1) * 0.25, 0.4 + i * 0.15, 0]}
                  rotation={[0, i, 0.15 * (i - 1)]}
                  castShadow
                >
                  {n.id === "ember" ? (
                    <icosahedronGeometry args={[0.3, 1]} />
                  ) : (
                    <coneGeometry
                      args={[n.id === "reed" ? 0.09 : 0.23, 0.9 + i * 0.15, 5]}
                    />
                  )}
                  <meshStandardMaterial
                    color={
                      done
                        ? "#9aafba"
                        : n.id === "glass"
                          ? "#b7a5e3"
                          : n.id === "reed"
                            ? "#cad7a7"
                            : "#ffc18b"
                    }
                    emissive={n.id === "ember" ? "#ee9b69" : "#85c4d5"}
                    emissiveIntensity={done ? 0 : 0.2}
                  />
                </mesh>
              ))}
            </group>
          </WorldInteraction>
        );
      })}
      {HOLLOW_NOTES.map((n) => (
        <WorldInteraction
          key={n.id}
          name={`hollow-note-${n.id}`}
          title={n.name}
          hint="Read the field note"
          approach={n.point}
          reach={4}
          disabled={disabled}
          activate={() => onInteract(`hol-${n.id}`)}
        >
          <mesh
            position={[
              hollowPropPoint(n)[0],
              hollowHeight(...hollowPropPoint(n)) + 0.8,
              hollowPropPoint(n)[1],
            ]}
          >
            <boxGeometry args={[0.85, 1.2, 0.3]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </WorldInteraction>
      ))}
    </group>
  );
}
