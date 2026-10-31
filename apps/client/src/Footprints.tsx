import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";

// Recent prints left in snow or sand: a small ring buffer the Explorer writes
// on each footstep and this component draws, each print slowly filling in.
const MAX = 48,
  LIFE = 9;
type Print = { x: number; y: number; z: number; yaw: number; t: number; snow: boolean };
const prints: Print[] = [];
let side = 1;
export function leavePrint(x: number, y: number, z: number, yaw: number, t: number, snow: boolean) {
  side = -side;
  // Alternate left and right of the walking line.
  prints.push({ x: x + Math.cos(yaw) * 0.09 * side, y, z: z - Math.sin(yaw) * 0.09 * side, yaw, t, snow });
  if (prints.length > MAX) prints.shift();
}

export function Footprints() {
  const marks = useMemo(() => {
    const geo = new T.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2),
      make = (color: string) => {
        const m = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false }), MAX);
        m.frustumCulled = false;
        m.renderOrder = 1;
        return m;
      };
    return { geo, snow: make("#8aa4b6"), sand: make("#a88a5e") };
  }, []);
  useEffect(
    () => () => {
      marks.geo.dispose();
      for (const m of [marks.snow, marks.sand]) (m.material as T.Material).dispose();
    },
    [marks],
  );
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ clock }) => {
    let s = 0,
      d = 0;
    for (const p of prints) {
      const age = clock.elapsedTime - p.t;
      if (age < 0 || age > LIFE) continue;
      const fill = 1 - age / LIFE;
      o.position.set(p.x, p.y + 0.025, p.z);
      o.rotation.set(0, p.yaw, 0);
      o.scale.set(0.13 * fill, 1, 0.22 * fill);
      o.updateMatrix();
      if (p.snow) marks.snow.setMatrixAt(s++, o.matrix);
      else marks.sand.setMatrixAt(d++, o.matrix);
    }
    marks.snow.count = s;
    marks.sand.count = d;
    marks.snow.instanceMatrix.needsUpdate = marks.sand.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <primitive object={marks.snow} />
      <primitive object={marks.sand} />
    </>
  );
}
