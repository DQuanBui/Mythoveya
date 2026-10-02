import { useMemo } from "react";
import * as T from "three";
import { HavenNature } from "./HavenNature";
import { HavenWater } from "./HavenWater";
import { HavenLandmarks } from "./HavenLandmarks";
import {
  HAVEN_PATHS,
  HAVEN_PLACES,
  edgeRadius,
  inPond,
  groundHeight,
  slopeAt,
  lagoonDistance,
  pathDistance,
} from "../../../packages/shared/haven";

// A polar height field that follows the coastline exactly. Colours come from
// height and slope: beach and lagoon bed, meadow grass, alpine grass, rock and snow.
function terrainGeometry() {
  const A = 160,
    R = 76,
    positions = new Float32Array((A * R + 1) * 3),
    colors = new Float32Array((A * R + 1) * 3),
    c = new T.Color(),
    tone = (hex: string) => c.set(hex);
  const sand = new T.Color("#e2d3a6"),
    bed = new T.Color("#8fb3a6"),
    grassA = new T.Color("#9ab389"),
    grassB = new T.Color("#8eae82"),
    alpine = new T.Color("#86a383"),
    rock = new T.Color("#8a8f84"),
    rockDark = new T.Color("#757b72"),
    snow = new T.Color("#eef2f0"),
    trail = new T.Color("#c9c6a3");
  const put = (i: number, x: number, z: number) => {
    const y = groundHeight(x, z),
      e = lagoonDistance(x, z),
      slope = Math.hypot(x, z) >= 43 ? slopeAt(x, z) : 0,
      n = Math.sin(x * 0.7) * Math.cos(z * 0.6);
    positions.set([x, y - 0.01, z], i * 3);
    if (e < 1) c.copy(bed).lerp(sand, Math.max(0, (e - 0.75) * 4));
    else if (e < 1.45) c.copy(sand).lerp(grassA, Math.max(0, (e - 1.3) / 0.15));
    else {
      c.copy(n > 0 ? grassA : grassB);
      if (y > 2) c.lerp(alpine, Math.min(1, (y - 2) / 4));
      if (slope > 0.55) c.lerp(n > 0 ? rock : rockDark, Math.min(1, (slope - 0.55) * 2.2));
      if (y > 10.5) c.lerp(snow, Math.min(1, (y - 10.5) / 2));
      if (y > 0.3 && pathDistance(x, z) < 1.4) c.lerp(trail, 0.85);
    }
    colors.set([c.r, c.g, c.b], i * 3);
  };
  put(0, 0, 0);
  for (let i = 0; i < A; i++) {
    const a = (i / A) * Math.PI * 2,
      edge = edgeRadius(a);
    for (let j = 1; j <= R; j++) {
      // Rings bunch slightly toward the coast, where the mountains rise.
      const r = edge * Math.pow(j / R, 0.85);
      put(1 + i * R + (j - 1), Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  tone("#000");
  const index: number[] = [];
  for (let i = 0; i < A; i++) {
    const next = (i + 1) % A,
      v = (a: number, j: number) => 1 + a * R + (j - 1);
    index.push(0, v(next, 1), v(i, 1));
    for (let j = 1; j < R; j++) {
      index.push(v(i, j), v(next, j), v(i, j + 1));
      index.push(v(next, j), v(next, j + 1), v(i, j + 1));
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(positions, 3));
  geo.setAttribute("color", new T.BufferAttribute(colors, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

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
    // The cliff starts at the terrain's height so mountain faces meet the skirt.
    const ha = groundHeight(ax * 0.995, az * 0.995) - 0.04,
      hb = groundHeight(bx * 0.995, bz * 0.995) - 0.04;
    if (!cliff) {
      vertex(0, -0.01, 0, "#9eb88c");
      vertex(bx, -0.01, bz, i % 4 === 0 ? "#8eae82" : "#9ab389");
      vertex(ax, -0.01, az, "#96b083");
    } else {
      const shade = i % 3 === 0 ? "#788c7a" : "#647d72";
      vertex(ax, ha, az, shade);
      vertex(bx, hb, bz, shade);
      vertex(ax * 0.7, -10, az * 0.7, "#536d65");
      vertex(bx, hb, bz, shade);
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
  const ground = useMemo(() => terrainGeometry(), []),
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
      ).filter(([x, z]) => !inPond(x, z) && groundHeight(x, z) < 0.05),
    [],
  );
  // Trail discs overlap gently, making curved joins without blocking movement.
  return (
    <group name="haven-terrain">
      <HavenNature />
      <HavenWater />
      <HavenLandmarks />
      <mesh geometry={ground} receiveShadow name="haven-ground">
        <meshStandardMaterial vertexColors roughness={1} flatShading />
      </mesh>
      <mesh geometry={cliff}>
        <meshStandardMaterial vertexColors flatShading />
      </mesh>
      <TrailSurface points={strips} />
      {HAVEN_PLACES.filter(
        (p) => !["village", "driftshore", "summit"].includes(p.id),
      ).map((p) => (
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
