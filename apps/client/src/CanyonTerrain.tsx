import { useMemo } from "react";
import * as T from "three";
import {
  CANYON_PATHS,
  canyonEdge,
  canyonHeight,
} from "../../../packages/shared/canyon";

function terrain() {
  const pos: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const slices = 96,
    rings = 32,
    color = new T.Color();
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= slices; i++) {
      const a = (i / slices) * Math.PI * 2,
        r = (canyonEdge(a) * j) / rings,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        y = canyonHeight(x, z);
      pos.push(x, y, z);
      color.set(y > 2.5 ? "#987b79" : "#bc8b6c");
      color.multiplyScalar(0.96 + 0.04 * Math.sin(x * 0.8) * Math.cos(z * 0.7));
      colors.push(color.r, color.g, color.b);
    }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < slices; i++) {
      const a = j * (slices + 1) + i,
        b = a + slices + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const edgeBase = pos.length / 3;
  for (let i = 0; i <= slices; i++) {
    const a = (i / slices) * Math.PI * 2,
      r = canyonEdge(a),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    for (const y of [canyonHeight(x, z), -1]) {
      pos.push(x, y, z);
      color.set(y < 0 ? "#735c5a" : "#987b79");
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < slices; i++) {
    const a = edgeBase + i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function trails() {
  const pos: number[] = [],
    indices: number[] = [];
  for (const path of CANYON_PATHS)
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1],
        [bx, bz] = path[i],
        len = Math.hypot(bx - ax, bz - az),
        nx = ((bz - az) / len) * 0.9,
        nz = (-(bx - ax) / len) * 0.9,
        steps = Math.ceil(len * 2),
        base = pos.length / 3;
      for (let j = 0; j <= steps; j++)
        for (const side of [-1, 1]) {
          const t = j / steps,
            x = ax + (bx - ax) * t + nx * side,
            z = az + (bz - az) * t + nz * side;
          pos.push(x, canyonHeight(x, z) + 0.045, z);
        }
      for (let j = 0; j < steps; j++) {
        const a = base + j * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
// Module caches are shared across region visits; no per-frame allocations.
let ground: T.BufferGeometry | undefined, paths: T.BufferGeometry | undefined;
export function CanyonTerrain() {
  const g = useMemo(() => (ground ||= terrain()), []),
    p = useMemo(() => (paths ||= trails()), []);
  return (
    <group name="emberglass-terrain">
      <mesh geometry={g} receiveShadow dispose={null}>
        <meshStandardMaterial vertexColors roughness={1} side={T.DoubleSide} />
      </mesh>
      <mesh geometry={p} receiveShadow dispose={null}>
        <meshStandardMaterial
          color="#e0b991"
          roughness={1}
          side={T.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[45, 10, 16]} />
        <meshStandardMaterial color="#735c5a" flatShading />
      </mesh>
    </group>
  );
}
