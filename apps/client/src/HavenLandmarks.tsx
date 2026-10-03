import { useEffect, useMemo } from "react";
import * as T from "three";
import {
  HAVEN_PLACES,
  HAVEN_LANDMARK_OBSTACLES,
  HAVEN_BENCHES,
  PICNIC,
  groundHeight,
  signSpot,
} from "../../../packages/shared/haven";
function Bench({
  x,
  z,
  rotation = 0,
}: {
  x: number;
  z: number;
  rotation?: number;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2, 0.13, 0.6]} />
        <meshStandardMaterial color="#b4a282" />
      </mesh>
      <mesh position={[0, 0.9, -0.25]} castShadow>
        <boxGeometry args={[2, 0.5, 0.09]} />
        <meshStandardMaterial color="#b4a282" />
      </mesh>
      {[-0.7, 0.7].map((v) => (
        <mesh key={v} position={[v, 0.25, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.45]} />
          <meshStandardMaterial color="#736e59" />
        </mesh>
      ))}
    </group>
  );
}
export function HavenLandmarks() {
  return (
    <group name="haven-landmarks">
      <group name="waystone-ruins" position={[-15, 0, -28]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[2.8, 3.15, 24]} />
          <meshStandardMaterial color="#a6b4a1" />
        </mesh>
        {HAVEN_LANDMARK_OBSTACLES.filter((o) => o.kind === "stone").map(
          (o, i) => (
            <mesh
              key={i}
              position={[o.x + 15, 1.7, o.z + 28]}
              rotation={[0, i * 0.2, ((i % 2) - 0.5) * 0.07]}
              castShadow
            >
              <boxGeometry args={[0.8, 3.4, 0.85]} />
              <meshStandardMaterial color={i % 2 ? "#a9b5a3" : "#c4c8af"} />
            </mesh>
          ),
        )}
        <mesh position={[0, 3.5, -3.5]} castShadow>
          <boxGeometry args={[4.8, 0.65, 1]} />
          <meshStandardMaterial color="#ced0b8" />
        </mesh>
        <mesh position={[0, 0.6, -1.25]} castShadow>
          <coneGeometry args={[0.32, 1.1, 5]} />
          <meshStandardMaterial
            color="#b8d8c7"
            emissive="#73baa5"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
      <group name="cloudwatch-lookout" position={[19, 0, -30]}>
        <mesh position={[0, 0.025, 0]} receiveShadow>
          <cylinderGeometry args={[3.8, 4, 0.07, 12]} />
          <meshStandardMaterial color="#b9bca4" />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[-3 + i, 0.65, -3.5]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.3, 6]} />
            <meshStandardMaterial color="#a39b7c" />
          </mesh>
        ))}
        <mesh position={[0, 1.17, -3.5]}>
          <boxGeometry args={[6.3, 0.1, 0.12]} />
          <meshStandardMaterial color="#c4b690" />
        </mesh>
        <group position={[2.2, 0, 1.3]}>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.08, 0.2, 1.3, 6]} />
            <meshStandardMaterial color="#817b69" />
          </mesh>
          <mesh position={[0, 1.4, 0]} rotation={[0.9, 0, 0.3]}>
            <cylinderGeometry args={[0.17, 0.22, 1.4, 8]} />
            <meshStandardMaterial
              color="#c7b77f"
              metalness={0.45}
              roughness={0.35}
            />
          </mesh>
        </group>
      </group>
      {HAVEN_BENCHES.map((b, i) => (
        <Bench key={i} x={b.x} z={b.z} rotation={b.rotation} />
      ))}
      <group name="sunseed-orchard">
        {[
          [-27, 24],
          [-25, 27],
          [-18, 27],
          [-17, 20],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.3, 2.2, 6]} />
              <meshStandardMaterial color="#7c7156" />
            </mesh>
            <mesh position={[0, 2.8, 0]} castShadow>
              <icosahedronGeometry args={[1.6, 1]} />
              <meshStandardMaterial color={i % 2 ? "#b8c593" : "#9dbb8e"} />
            </mesh>
            {Array.from({ length: 6 }, (_, j) => (
              <mesh
                key={j}
                position={[
                  Math.sin(j) * 1.3,
                  2.5 + (j % 2) * 0.5,
                  Math.cos(j) * 1.3,
                ]}
              >
                <dodecahedronGeometry args={[0.17, 0]} />
                <meshStandardMaterial color="#e1ba77" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <group name="sunpetal-picnic" position={[PICNIC[0], 0.045, PICNIC[1]]}>
        <mesh rotation={[-Math.PI / 2, 0, 0.3]}>
          <planeGeometry args={[2.5, 2]} />
          <meshStandardMaterial color="#d4b69f" />
        </mesh>
        <mesh position={[0.7, 0.25, 0]}>
          <boxGeometry args={[0.55, 0.45, 0.45]} />
          <meshStandardMaterial color="#a58b64" />
        </mesh>
      </group>
      {HAVEN_PLACES.filter((p) => p.id !== "village").map((p) => (
        <group
          key={p.id}
          name={`trail-sign-${p.id}`}
          position={[
            signSpot(p.point)[0],
            groundHeight(...signSpot(p.point)),
            signSpot(p.point)[1],
          ]}
        >
          <mesh position={[0, 0.85, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 1.7, 5]} />
            <meshStandardMaterial color="#857960" />
          </mesh>
          <mesh position={[0, 1.5, 0]} rotation={[0, -0.2, 0.08]}>
            <boxGeometry args={[1.3, 0.3, 0.12]} />
            <meshStandardMaterial color={p.color} />
          </mesh>
          <mesh position={[0.57, 1.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.2, 0.4, 3]} />
            <meshStandardMaterial color={p.color} />
          </mesh>
        </group>
      ))}
      <Flowers />
    </group>
  );
}
function Flowers() {
  const m = useMemo(() => {
    const mesh = new T.InstancedMesh(
        new T.IcosahedronGeometry(0.11, 0),
        new T.MeshStandardMaterial({ flatShading: true }),
        180,
      ),
      o = new T.Object3D(),
      c = new T.Color();
    for (let i = 0; i < 180; i++) {
      const a = i * 2.399,
        r = 4.5 + (i % 9) * 0.32;
      const center = i % 3 === 0 ? [-22, 22] : [8, 26];
      o.position.set(
        center[0] + Math.sin(a) * r,
        0.16,
        center[1] + Math.cos(a) * r,
      );
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      c.set(["#e2baa8", "#dfd3a0", "#bdafd0"][i % 3]);
      mesh.setColorAt(i, c);
    }
    mesh.name = "wildflower-beds";
    mesh.computeBoundingSphere();
    return mesh;
  }, []);
  useEffect(
    () => () => {
      m.geometry.dispose();
      (m.material as T.Material).dispose();
      m.dispose();
    },
    [m],
  );
  return <primitive object={m} />;
}
