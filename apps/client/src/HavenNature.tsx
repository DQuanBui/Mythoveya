import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  HAVEN_TREES as FOREST,
  type TreeSite,
  onIsland,
  inPond,
  pathDistance,
  seeded,
} from "../../../packages/shared/haven";
import { settings } from "./audio";

function makeInstances(
  geometry: T.BufferGeometry,
  sites: TreeSite[],
  part: "trunk" | "crown" | "pine" | "grass" | "stone",
) {
  const material = new T.MeshStandardMaterial({
    flatShading: true,
    roughness: 1,
  });
  const mesh = new T.InstancedMesh(geometry, material, sites.length),
    o = new T.Object3D(),
    c = new T.Color();
  sites.forEach((s, i) => {
    const tree = part === "trunk" || part === "crown" || part === "pine";
    o.position.set(
      s.x,
      part === "trunk"
        ? 1.5 * s.scale
        : tree
          ? 3.6 * s.scale
          : part === "grass"
            ? 0.16
            : 0.16,
      s.z,
    );
    o.rotation.set(0, i * 2.4, 0);
    o.scale.setScalar(s.scale);
    if (part === "grass") o.scale.set(0.16 + s.scale * 0.08, 0.3, 0.16);
    if (part === "stone") o.scale.set(0.3 + s.scale * 0.2, 0.3, 0.4);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    c.set(
      part === "trunk"
        ? "#796f54"
        : part === "grass"
          ? ["#aec391", "#bcc99d", "#8daa78"][i % 3]
          : part === "stone"
            ? "#a1aa90"
            : s.pine
              ? ["#648f80", "#739c84", "#88aa8a"][i % 3]
              : ["#8eac83", "#a9bf8e", "#b7c996", "#7fa58a"][i % 4],
    );
    mesh.setColorAt(i, c);
  });
  mesh.userData.sites = sites;
  mesh.name = `haven-${part}`;
  mesh.castShadow = part === "trunk" || part === "crown" || part === "pine";
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}
export function HavenNature() {
  const group = useRef<T.Group>(null),
    last = useRef(-1);
  const meshes = useMemo(() => {
    const trees = FOREST;
    const random = seeded(156),
      scatter: TreeSite[] = [];
    for (let i = 0; i < (settings.quality === "Low" ? 240 : 650); i++) {
      const x = (random() - 0.5) * 86,
        z = (random() - 0.5) * 86;
      if (
        onIsland(x, z, 2) &&
        Math.hypot(x, z) > 12 &&
        !inPond(x, z, 1) &&
        pathDistance(x, z) > 1.6
      )
        scatter.push({ x, z, scale: random(), pine: false });
    }
    return [
      makeInstances(new T.CylinderGeometry(0.17, 0.28, 3, 6), trees, "trunk"),
      makeInstances(
        new T.IcosahedronGeometry(1.7, settings.quality === "Low" ? 0 : 1),
        trees.filter((s) => !s.pine),
        "crown",
      ),
      makeInstances(
        new T.ConeGeometry(1.9, 4.3, 7),
        trees.filter((s) => s.pine),
        "pine",
      ),
      makeInstances(new T.ConeGeometry(1, 1, 3), scatter, "grass"),
      makeInstances(
        new T.DodecahedronGeometry(1, 0),
        scatter.filter((_, i) => i % 7 === 0),
        "stone",
      ),
    ];
  }, []);
  useEffect(
    () => () => {
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
        m.dispose();
      });
    },
    [meshes],
  );
  // Shared foliage geometry keeps hundreds of plants in a handful of draw calls.
  useFrame(({ camera, clock }) => {
    if (
      clock.elapsedTime - last.current < 0.4 &&
      clock.elapsedTime >= last.current
    )
      return;
    last.current = clock.elapsedTime;
    meshes.forEach((m) => {
      if (m.name !== "haven-crown" && m.name !== "haven-pine") return;
      const matrix = new T.Matrix4(),
        v = new T.Vector3(),
        q = new T.Quaternion(),
        s = new T.Vector3();
      for (let i = 0; i < m.count; i++) {
        m.getMatrixAt(i, matrix);
        matrix.decompose(v, q, s);
        const d = Math.hypot(camera.position.x - v.x, camera.position.z - v.z);
        // Reduce foreground crowns in every axis so foliage cannot hide the keeper.
        const visibility = 0.12 + 0.88 * Math.max(0, Math.min(1, (d - 7) / 8));
        const sites = m.userData.sites as TreeSite[];
        s.setScalar(sites[i].scale * visibility);
        q.setFromEuler(
          new T.Euler(
            0,
            i * 2.4,
            settings.reduced
              ? 0
              : Math.sin(clock.elapsedTime * 0.6 + i) * 0.015,
          ),
        );
        matrix.compose(v, q, s);
        m.setMatrixAt(i, matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <group ref={group} name="haven-woodland">
      {meshes.map((m) => (
        <primitive key={m.name} object={m} />
      ))}
    </group>
  );
}
