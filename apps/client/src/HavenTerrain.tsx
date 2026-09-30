import { useMemo } from "react";
import * as T from "three";
import { HavenNature } from "./HavenNature";
import { HavenWater } from "./HavenWater";
import {
  HAVEN_PATHS,
  HAVEN_PLACES,
  edgeRadius,
  inPond,
} from "../../../packages/shared/haven";

function islandGeometry(cliff = false) {
  const positions: number[] = [],
    colors: number[] = [],
    c = new T.Color();
  const vertex = (x: number, y: number, z: number, color: string) => {
    positions.push(x, y, z);
    c.set(color);
    colors.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < 128; i++) {
    const a = (i / 128) * Math.PI * 2,
      b = ((i + 1) / 128) * Math.PI * 2,
      ra = edgeRadius(a),
      rb = edgeRadius(b);
    const ax = Math.cos(a) * ra,
      az = Math.sin(a) * ra,
      bx = Math.cos(b) * rb,
      bz = Math.sin(b) * rb;
    if (!cliff) {
      vertex(0, -0.01, 0, "#9eb88c");
      vertex(bx, -0.01, bz, i % 4 === 0 ? "#8eae82" : "#9ab389");
      vertex(ax, -0.01, az, "#96b083");
    } else {
      const shade = i % 3 === 0 ? "#788c7a" : "#647d72";
      vertex(ax, -0.04, az, shade);
      vertex(bx, -0.04, bz, shade);
      vertex(ax * 0.7, -10, az * 0.7, "#536d65");
      vertex(bx, -0.04, bz, shade);
      vertex(bx * 0.7, -10, bz * 0.7, "#536d65");
      vertex(ax * 0.7, -10, az * 0.7, "#536d65");
      vertex(ax * 0.7, -10, az * 0.7, "#536d65");
      vertex(bx * 0.7, -10, bz * 0.7, "#536d65");
      vertex(-3, -21, 1, "#405f5c");
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
export function HavenTerrain() {
  const ground = useMemo(() => islandGeometry(), []),
    cliff = useMemo(() => islandGeometry(true), []);
  const strips = useMemo(
    () =>
      HAVEN_PATHS.flatMap((path) =>
        path.slice(1).flatMap((b, i) => {
          const a = path[i],
            length = Math.hypot(b[0] - a[0], b[1] - a[1]),
            steps = Math.ceil(length / 0.8);
          return Array.from({ length: steps }, (_, j) => {
            const t = j / steps;
            return [
              a[0] * (1 - t) + b[0] * t,
              a[1] * (1 - t) + b[1] * t,
            ] as const;
          });
        }),
      ).filter(([x, z]) => !inPond(x, z)),
    [],
  );
  // Trail discs overlap gently, making curved joins without blocking movement.
  return (
    <group name="haven-terrain">
      <HavenNature />
      <HavenWater />
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <mesh geometry={cliff}>
        <meshStandardMaterial vertexColors flatShading />
      </mesh>
      <TrailSurface points={strips} />
      {HAVEN_PLACES.filter((p) => p.id !== "village").map((p) => (
        <mesh
          key={p.id}
          position={[p.point[0], 0.012, p.point[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[p.id === "meadow" ? 5 : 3.4, 20]} />
          <meshStandardMaterial
            color={p.id === "meadow" ? "#b9c69c" : "#bdc09b"}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}
function TrailSurface({
  points,
}: {
  points: readonly (readonly [number, number])[];
}) {
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
        new T.CircleGeometry(1.35, 10),
        new T.MeshStandardMaterial({ color: "#c9c6a3", roughness: 1 }),
        points.length,
      ),
      o = new T.Object3D();
    points.forEach(([x, z], i) => {
      o.position.set(x, 0.017 + (i % 3) * 0.0001, z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.receiveShadow = true;
    m.name = "haven-trails";
    m.computeBoundingSphere();
    return m;
  }, [points]);
  return <primitive object={mesh} />;
}
