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
  blockedByStructure,
  groundHeight,
  inLagoon,
  slopeAt,
  HAVEN_HOUSES,
  HAVEN_PLACES,
  RESOURCE_NODES,
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
      groundHeight(s.x, s.z) +
      (part === "trunk"
        ? 1.5 * s.scale
        : tree
          ? 3.6 * s.scale
          : part === "grass"
            ? 0.16
            : 0.16),
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
    for (let i = 0; i < (settings.quality === "Low" ? 480 : 1300); i++) {
      const x = (random() - 0.5) * 152,
        z = (random() - 0.5) * 152;
      if (
        onIsland(x, z, 2) &&
        Math.hypot(x, z) > 12 &&
        !inPond(x, z, 1) &&
        !inLagoon(x, z, 4) &&
        groundHeight(x, z) < 10.5 &&
        (Math.hypot(x, z) < 44 || slopeAt(x, z) < 1) &&
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
  const extras = useMemo(() => undergrowth(), []);
  useEffect(
    () => () => {
      [...meshes, ...extras].forEach((m) => {
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
      {[...meshes, ...extras].map((m) => (
        <primitive key={m.name} object={m} />
      ))}
    </group>
  );
}
// Bushes soften trail edges and yards; mushrooms dot the shaded grove.
function undergrowth() {
  const random = seeded(913),
    bushes: { x: number; z: number; s: number }[] = [],
    shrooms: { x: number; z: number; s: number }[] = [];
  const target = settings.quality === "Low" ? 110 : 260;
  for (let i = 0; i < 8000 && bushes.length < target; i++) {
    const x = (random() - 0.5) * 150,
      z = (random() - 0.5) * 150,
      d = pathDistance(x, z);
    if (
      inLagoon(x, z, 3) ||
      groundHeight(x, z) > 9 ||
      d < 1.75 ||
      d > 3.4 ||
      !onIsland(x, z, 2.5) ||
      inPond(x, z, 0.8) ||
      Math.hypot(x, z - 2) < 9 ||
      blockedByStructure(x, z, 0.5) ||
      HAVEN_HOUSES.some((h) => Math.hypot(x - h.point[0], z - h.point[1]) < 3.6) ||
      HAVEN_PLACES.some((p) => Math.hypot(x - p.point[0], z - p.point[1]) < 3) ||
      RESOURCE_NODES.some((p) => Math.hypot(x - p.point[0], z - p.point[1]) < 1.8) ||
      bushes.some((b) => Math.hypot(b.x - x, b.z - z) < 1.6)
    )
      continue;
    bushes.push({ x, z, s: 0.45 + random() * 0.45 });
  }
  for (let i = 0; i < 600 && shrooms.length < 46; i++) {
    const x = -40 + random() * 26,
      z = -26 + random() * 36;
    if (!onIsland(x, z, 2.5) || pathDistance(x, z) < 1.6) continue;
    shrooms.push({ x, z, s: 0.6 + random() * 0.7 });
  }
  const o = new T.Object3D(),
    c = new T.Color();
  const make = (
    geometry: T.BufferGeometry,
    sites: { x: number; z: number; s: number }[],
    name: string,
    place: (site: { x: number; z: number; s: number }, i: number) => string,
  ) => {
    const mesh = new T.InstancedMesh(
      geometry,
      new T.MeshStandardMaterial({ flatShading: true, roughness: 1 }),
      sites.length,
    );
    sites.forEach((site, i) => {
      c.set(place(site, i));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c);
    });
    mesh.name = name;
    mesh.castShadow = name === "haven-bush" && settings.quality === "High";
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  };
  return [
    make(new T.IcosahedronGeometry(1, settings.quality === "High" ? 1 : 0), bushes, "haven-bush", (b, i) => {
      o.position.set(b.x, groundHeight(b.x, b.z) + b.s * 0.55, b.z);
      o.rotation.set(0, i, 0);
      o.scale.set(b.s * 1.15, b.s * 0.8, b.s);
      return ["#86a77b", "#94b384", "#7a9d78", "#a2b98a"][i % 4];
    }),
    make(new T.CylinderGeometry(0.05, 0.07, 0.28, 5), shrooms, "haven-mushroom-stem", (m) => {
      o.position.set(m.x, groundHeight(m.x, m.z) + 0.14 * m.s, m.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(m.s);
      return "#efe6d2";
    }),
    make(
      new T.SphereGeometry(0.16, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      shrooms,
      "haven-mushroom-cap",
      (m, i) => {
        o.position.set(m.x, groundHeight(m.x, m.z) + 0.26 * m.s, m.z);
        o.scale.set(m.s, m.s * 0.8, m.s);
        return i % 3 ? "#c8645a" : "#c9a06a";
      },
    ),
  ];
}
