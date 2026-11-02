import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { edgeRadius, groundHeight } from "../../../packages/shared/haven";
import { settings } from "./audio";

const paint = (g: T.BufferGeometry, color: string) => {
  const c = new T.Color(color),
    n = g.attributes.position.count;
  g.setAttribute("color", new T.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
  return g.index ? g.toNonIndexed() : g;
};
const ISLETS = 9;
/** Roots and vines spilling over Havenreach's rim, and a few mossy islets
 * drifting in the air around it. */
export function IslandFringe() {
  const roots = useMemo(() => {
    const parts: T.BufferGeometry[] = [],
      m = new T.Matrix4(),
      q = new T.Quaternion(),
      e = new T.Euler();
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2 + Math.sin(i * 7.1) * 0.02,
        r = edgeRadius(a) * 0.985,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        y = groundHeight(x * 0.99, z * 0.99) - 0.1,
        vine = i % 3 !== 0,
        len = vine ? 1.8 + ((i * 37) % 10) * 0.3 : 3.2 + ((i * 53) % 10) * 0.45;
      // Hang straight down from the rim, leaning a little outward.
      e.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
      q.setFromEuler(e);
      m.compose(new T.Vector3(x, y - len / 2, z), q, new T.Vector3(1, 1, 1));
      const g = vine ? new T.CylinderGeometry(0.08, 0.05, len, 4, 1, true) : new T.ConeGeometry(0.42, len, 5, 1, true).rotateX(Math.PI);
      parts.push(paint(g, vine ? (i % 2 ? "#5f8a5a" : "#6f9a62") : "#6e5a45").applyMatrix4(m));
      // A leafy tuft caps each vine and a clump of moss each root.
      const tuft = new T.IcosahedronGeometry(vine ? 0.22 : 0.45, 0);
      m.compose(new T.Vector3(x, y - (vine ? len : 0.15), z), q, new T.Vector3(1, vine ? 0.8 : 0.6, 1));
      parts.push(paint(tuft, vine ? "#86b26e" : "#6f8f5d").applyMatrix4(m));
    }
    const geo = mergeGeometries(parts)!;
    geo.computeVertexNormals();
    return geo;
  }, []);
  const islets = useMemo(() => {
    const rock = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: "#6b7f75", flatShading: true }), ISLETS),
      moss = new T.InstancedMesh(new T.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: "#8fb07a", flatShading: true }), ISLETS);
    const seeds = Array.from({ length: ISLETS }, (_, i) => {
      const a = (i / ISLETS) * Math.PI * 2 + 0.4,
        r = edgeRadius(a) + 5 + ((i * 3) % 4) * 2.2;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: -2.5 - ((i * 5) % 4) * 1.4, s: 0.8 + ((i * 7) % 5) * 0.3, spin: i * 1.7 };
    });
    rock.frustumCulled = moss.frustumCulled = false;
    return { rock, moss, seeds };
  }, []);
  useEffect(
    () => () => {
      roots.dispose();
      for (const m of [islets.rock, islets.moss]) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      }
    },
    [roots, islets],
  );
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ clock }) => {
    const t = settings.reduced ? 0 : clock.elapsedTime;
    islets.seeds.forEach((s, i) => {
      // Each islet bobs and turns slowly on its own rhythm.
      const y = s.y + Math.sin(t * 0.4 + s.spin) * 0.35;
      o.position.set(s.x, y, s.z);
      o.rotation.set(0, s.spin + t * 0.05, 0);
      o.scale.set(s.s, s.s * 0.75, s.s);
      o.updateMatrix();
      islets.rock.setMatrixAt(i, o.matrix);
      o.position.y = y + s.s * 0.45;
      o.scale.set(s.s * 0.85, s.s * 0.3, s.s * 0.85);
      o.updateMatrix();
      islets.moss.setMatrixAt(i, o.matrix);
    });
    islets.rock.instanceMatrix.needsUpdate = islets.moss.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="island-fringe">
      <mesh geometry={roots}>
        <meshStandardMaterial vertexColors flatShading side={T.DoubleSide} />
      </mesh>
      <primitive object={islets.rock} />
      <primitive object={islets.moss} />
    </group>
  );
}
