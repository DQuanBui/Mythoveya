import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { FIELD_HOUSES, FIELD_NODES, WILDWOOD_LAKE, GUARDIAN_POINT } from "../../../packages/shared/wildwood";
import { groundHeight } from "../../../packages/shared/haven";
import { Kit, SHAPES } from "./village-kit";
import { ChimneySmoke, villageMaterial } from "./HavenVillage";
import { lampGlow } from "./village-materials";
import { settings } from "./audio";

function buildDistrict(repaired: string[], restored: boolean) {
  const k = new Kit(), glow = new Kit(), chimneys: T.Vector3[] = [];
  for (const h of FIELD_HOUSES) {
    const y = groundHeight(...h.point), rot = h.id === "astronomer" ? Math.PI / 2 : 0;
    k.push([h.point[0], y, h.point[1]], rot); glow.push([h.point[0], y, h.point[1]], rot);
    k.box("#858879", [0, .1, 0], [3.6, .4, 3.6]);
    k.box("#eddbc0", [0, 1.25, 0], [3.5, 2.3, 3.5]);
    k.add(SHAPES.GABLE, h.roof, [0, 2.4, 0], [4, 1.5, 4]);
    k.box("#665646", [0, .9, 1.78], [.85, 1.65, .08]);
    for (const x of [-1.15, 1.15]) {
      k.box("#5b766e", [x, 1.35, 1.79], [.8, .85, .08]);
      glow.box("#ffe4a7", [x, 1.35, 1.84], [.55, .61, .04]);
      k.box("#705641", [x, .85, 1.9], [.8, .2, .3]);
      for (let i = 0; i < 3; i++) k.add(SHAPES.BALL, ["#cd7e94", "#eee4ad", "#a3bd85"][i], [x - .23 + i * .23, 1.02, 1.9], [.15, .17, .14]);
    }
    k.box("#8d8173", [1, 3.3, -.7], [.48, 1.25, .48]);
    chimneys.push(k.point([1, 3.95, -.7]));
    // Field maps and a small hanging lantern beside each doorway.
    k.box("#755e49", [-.65, 1.5, 1.82], [.12, .7, .12]);
    glow.add(SHAPES.BALL, "#ffcf7a", [-.65, 1.55, 1.98], [.15, .23, .15]);
    k.pop(); glow.pop();
  }
  // Reeds, lily pads and flower banks follow the lake's actual collision ellipse.
  const l = WILDWOOD_LAKE;
  for (let i = 0; i < 64; i++) {
    const a = i * 2.39996, x = l.x + Math.cos(a) * (l.rx + .6), z = l.z + Math.sin(a) * (l.rz + .6), y = groundHeight(x, z);
    k.add(SHAPES.CYL6, "#6f9063", [x, y + .38, z], [.035, .76, .035], [.12 * Math.sin(i), 0, .1 * Math.cos(i)]);
    k.add(SHAPES.CYL6, i % 3 ? "#a98864" : "#d9bc98", [x, y + .82, z], [.075, .24, .075]);
    if (i % 4 === 0) {
      const px = l.x + Math.cos(a) * l.rx * .72, pz = l.z + Math.sin(a) * l.rz * .72;
      k.add(SHAPES.CYL6, "#71a184", [px, .08, pz], [.38, .02, .3]);
      k.add(SHAPES.BALL, "#efbfcd", [px, .18, pz], [.13, .1, .13]);
    }
  }
  // Every field tool sits to the side of its walkable interaction anchor.
  FIELD_NODES.forEach((n, i) => {
    const x = n.point[0] + 1.1, z = n.point[1], y = groundHeight(x, z), done = repaired.includes(n.id);
    k.push([x, y, z]); glow.push([x, y, z]);
    k.add(SHAPES.CYL, "#8c927c", [0, .25, 0], [.48, .5, .48]);
    if (i === 0) {
      k.add(SHAPES.CYL, "#ad8256", [0, .7, 0], [.36, .45, .36]);
      (done ? glow : k).add(SHAPES.BALL, done ? "#ffcb6b" : "#685b53", [0, 1, 0], [.28, .45, .28]);
    } else if (i === 1) {
      k.box("#846e54", [0, .75, 0], [.75, .2, .18]);
      k.box("#846e54", [0, .75, 0], [.18, .75, .18]);
      glow.add(SHAPES.BALL, done ? "#a4eadb" : "#73948e", [0, .75, .12], [.12, .12, .1]);
    } else {
      k.add(SHAPES.CYL6, "#897154", [0, .75, 0], [.14, .7, .14], [0, 0, .6]);
      for (let j = 0; j < 4; j++) k.add(SHAPES.BUSH, done ? "#afcd86" : "#56775e", [Math.cos(j * 1.6) * .35, .65, Math.sin(j * 1.6) * .35], [.3, .18, .25]);
    }
    k.pop(); glow.pop();
  });
  const [gx, gz] = GUARDIAN_POINT;
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5, x = gx + Math.cos(a) * 2.8, z = gz + Math.sin(a) * 2.8;
    k.add(SHAPES.ROCK, restored ? "#a5baa0" : "#829399", [x, groundHeight(x, z) + .23, z], [.3, .4, .26]);
  }
  // Orrin's telescope faces the northern mountain ridge.
  const tx = -62.8, tz = -1.1, ty = groundHeight(tx, tz);
  for (let i = 0; i < 3; i++) k.add(SHAPES.CYL6, "#77634f", [tx + Math.cos(i * 2.1) * .18, ty + .65, tz + Math.sin(i * 2.1) * .18], [.045, 1.3, .045], [.18, i * 2.1, .2]);
  k.add(SHAPES.CYL, "#bf9e62", [tx, ty + 1.4, tz], [.17, 1.25, .17], [.9, .3, 0]);
  return { solid: k.build(), glow: glow.build(), chimneys };
}

export function WildwoodScenery({ repaired, restored }: { repaired: string[]; restored: boolean }) {
  const key = repaired.join("|");
  const built = useMemo(() => buildDistrict(repaired, restored), [key, restored]);
  const ripples = useRef<T.Group>(null);
  const insects = useMemo(() => {
    const k = new Kit();
    k.add(SHAPES.BALL, "#5c9daf", [0, 0, 0], [.035, .035, .21]);
    for (const side of [-1, 1]) k.add(SHAPES.BALL, "#d6eae4", [side * .18, .015, 0], [.23, .013, .07], [0, side * .3, 0]);
    const m = new T.InstancedMesh(k.build(), villageMaterial, settings.quality === "Low" ? 4 : 10);
    m.name = "reedwater-dragonflies"; m.frustumCulled = false;
    return m;
  }, []);
  const dummy = useMemo(() => new T.Object3D(), []);
  useEffect(() => () => { built.solid.dispose(); built.glow.dispose(); }, [built]);
  useEffect(() => () => { insects.geometry.dispose(); insects.dispose(); }, [insects]);
  useFrame(({ clock }) => {
    const t = settings.reduced ? 0 : clock.elapsedTime;
    ripples.current?.children.forEach((r, i) => { const s = 1 + Math.sin(t * .65 + i) * .05; r.scale.set(s, s, 1); });
    for (let i = 0; i < insects.count; i++) {
      const a = t * .3 + i * 2.4;
      dummy.position.set(-49 + Math.cos(a) * (5 + i % 2), .8 + Math.sin(t * 2 + i) * .12, 12 + Math.sin(a) * 4);
      dummy.rotation.set(0, -a, Math.sin(t * 14 + i) * .05); dummy.updateMatrix(); insects.setMatrixAt(i, dummy.matrix);
    }
    insects.instanceMatrix.needsUpdate = true;
  });
  return <group name="western-wildwood">
    <mesh geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
    <mesh geometry={built.glow} material={lampGlow} />
    <ChimneySmoke points={built.chimneys} />
    <mesh name="reedwater-lake" position={[-49, .035, 12]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 6, 1]}>
      <circleGeometry args={[1, 80]} /><meshStandardMaterial color="#66aeb0" roughness={.28} metalness={.12} />
    </mesh>
    <group ref={ripples} position={[-49, .045, 12]} rotation={[-Math.PI / 2, 0, 0]}>
      {[2, 3.5, 5].map((r) => <mesh key={r} scale={[1, .7, 1]}><ringGeometry args={[r, r + .035, 48]} /><meshBasicMaterial color="#c9e5d6" transparent opacity={.3} depthWrite={false} /></mesh>)}
    </group>
    <primitive object={insects} />
  </group>;
}
