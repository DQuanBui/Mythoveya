import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  LAGOON,
  LIGHTHOUSE,
  PIER,
  groundHeight,
} from "../../../packages/shared/haven";
import { Kit, SHAPES } from "./village-kit";
import { lampGlow } from "./village-materials";
import { villageMaterial } from "./HavenVillage";
import { daylight, islandHour } from "./daytime";
import { settings } from "./audio";

// The Driftshore lagoon: rolling swells, a deeper centre and foam at the sand.
const lagoonMaterial = new T.ShaderMaterial({
  uniforms: { t: { value: 0 }, night: { value: 0 } },
  vertexShader: `uniform float t; varying vec2 vUv; varying float vWave;
    void main(){
      vUv = uv;
      vec3 p = position;
      float w = sin(p.x * 3.1 + t * 1.3) * 0.5 + sin(p.y * 4.3 - t * 1.7) * 0.5;
      vWave = w;
      p.z += w * 0.012;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `uniform float t; uniform float night; varying vec2 vUv; varying float vWave;
    void main(){
      float r = length(vUv - 0.5) * 2.0;
      vec3 deep = vec3(0.16, 0.47, 0.55), shallow = vec3(0.47, 0.78, 0.76);
      vec3 col = mix(deep, shallow, smoothstep(0.2, 0.95, r));
      col += vWave * 0.035;
      float foam = smoothstep(0.86, 0.95, r + sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 9.0 + t * 1.4) * 0.025);
      col = mix(col, vec3(0.94, 0.97, 0.95), foam * 0.85);
      col *= mix(1.0, 0.42, night);
      gl_FragColor = vec4(col, 1.0);
    }`,
});

function frontierGeometry() {
  const k = new Kit(),
    glow = new Kit();
  // Pier planks and posts out over the lagoon.
  for (let z = PIER.z0 + 0.2, i = 0; z < PIER.z1; z += 0.43, i++)
    k.box(i % 3 ? "#b49c78" : "#a68f6c", [PIER.x, 0.16, z], [1.7, 0.08, 0.39]);
  for (const s of [-1, 1]) {
    k.box("#6d5847", [PIER.x + s * 0.8, 0.08, (PIER.z0 + PIER.z1) / 2], [0.12, 0.12, PIER.z1 - PIER.z0]);
    for (const z of [PIER.z0 + 0.6, (PIER.z0 + PIER.z1) / 2, PIER.z1 - 0.2])
      k.add(SHAPES.CYL6, "#584737", [PIER.x + s * 0.82, -0.3, z], [0.09, 1.2, 0.09]);
  }
  k.box("#8f7556", [PIER.x + 0.5, 0.34, PIER.z1 - 0.5], [0.4, 0.32, 0.4]);
  // Lighthouse: striped tower, gallery and lantern room on a rocky base.
  const [lx, lz] = LIGHTHOUSE.point,
    ly = groundHeight(lx, lz);
  k.push([lx, ly, lz]);
  glow.push([lx, ly, lz]);
  for (let i = 0; i < 7; i++)
    k.add(SHAPES.ROCK, i % 2 ? "#9c9a8c" : "#878478", [Math.cos(i * 0.9) * 1.6, 0.3, Math.sin(i * 0.9) * 1.6], [0.6, 0.45, 0.5]);
  for (let i = 0; i < 6; i++)
    k.add(SHAPES.CYL, i % 2 ? "#c9574c" : "#f1ece0", [0, 0.8 + i * 1.05, 0], [1.05 - i * 0.07, 1.05, 1.05 - i * 0.07]);
  k.add(SHAPES.CYL, "#4f5552", [0, 7.25, 0], [1.05, 0.15, 1.05]);
  for (let i = 0; i < 10; i++)
    k.add(SHAPES.CYL6, "#4f5552", [Math.cos(i * 0.63) * 0.95, 7.6, Math.sin(i * 0.63) * 0.95], [0.03, 0.55, 0.03]);
  glow.add(SHAPES.CYL, "#fff1c4", [0, 7.85, 0], [0.55, 1, 0.55]);
  k.add(SHAPES.CONE, "#c9574c", [0, 8.85, 0], [0.8, 0.95, 0.8]);
  k.box("#6d5847", [0, 0.75, 1.05], [0.6, 1.1, 0.12]);
  k.pop();
  glow.pop();
  // Summit lookout: a stone ring, cairn, banner and a brass telescope.
  const [sx, sz] = [-42, -50],
    sy = groundHeight(sx, sz);
  k.push([sx, sy, sz]);
  k.add(SHAPES.CYL, "#a9a796", [0, 0.06, 0], [3, 0.14, 3]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.add(SHAPES.ROCK, i % 2 ? "#bdb8a6" : "#9c9a8c", [Math.cos(a) * 3, 0.25, Math.sin(a) * 3], [0.35, 0.3, 0.32]);
  }
  for (let i = 0; i < 5; i++) k.add(SHAPES.ROCK, "#a8a494", [1.6, 0.25 + i * 0.32, -1.4], [0.42 - i * 0.06, 0.2, 0.38 - i * 0.05]);
  k.add(SHAPES.CYL6, "#6d5847", [-1.6, 1.6, -1.2], [0.06, 3.2, 0.06]);
  k.add(SHAPES.CYL6, "#584737", [1.2, 0.5, 1.4], [0.05, 1, 0.05]);
  k.add(SHAPES.CYL, "#c7b77f", [1.2, 1.1, 1.4], [0.12, 0.8, 0.12], [1, 0, 0.4]);
  k.pop();
  return { solid: k.build(), glow: glow.build() };
}

export function HavenFrontier() {
  const built = useMemo(frontierGeometry, []);
  useEffect(() => () => [built.solid, built.glow].forEach((g) => g.dispose()), [built]);
  const beam = useRef<T.Group>(null),
    flag = useRef<T.Mesh>(null),
    falls = useRef<T.Group>(null);
  const [lx, lz] = LIGHTHOUSE.point,
    ly = groundHeight(lx, lz),
    sy = groundHeight(-42, -50),
    fx = -45,
    fz = -30.5,
    fy = groundHeight(fx, fz);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime,
      glow = daylight(islandHour()).glow;
    lagoonMaterial.uniforms.t.value = settings.reduced ? 0 : time;
    lagoonMaterial.uniforms.night.value = glow * 0.85;
    if (beam.current) {
      beam.current.visible = glow > 0.25;
      if (!settings.reduced) beam.current.rotation.y = time * 0.6;
    }
    if (flag.current && !settings.reduced)
      flag.current.rotation.y = Math.sin(time * 2.2) * 0.25;
    falls.current?.children.forEach((r, i) => {
      if (!settings.reduced) r.position.y = -((time * 3 + i * 0.7) % 6);
    });
  });
  return (
    <group name="haven-frontier">
      <mesh
        name="driftshore-lagoon"
        position={[LAGOON.x, -0.06, LAGOON.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[LAGOON.rx * 1.03, LAGOON.rz * 1.03, 1]}
        material={lagoonMaterial}
      >
        <circleGeometry args={[1, 72]} />
      </mesh>
      <mesh name="frontier-structures" geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
      <mesh geometry={built.glow} material={lampGlow} />
      <group ref={beam} position={[lx, ly + 7.85, lz]}>
        <mesh position={[6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[1.6, 12, 16, 1, true]} />
          <meshBasicMaterial color="#fff2c4" transparent opacity={0.13} depthWrite={false} side={T.DoubleSide} blending={T.AdditiveBlending} />
        </mesh>
      </group>
      <mesh ref={flag} position={[-42 - 1.6, sy + 3, -50 - 1.2]}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshStandardMaterial color="#d4614f" side={T.DoubleSide} />
      </mesh>
      <group name="highcrag-falls" position={[fx, fy, fz]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 3, 0]}>
          <planeGeometry args={[1.4, 6]} />
          <meshStandardMaterial color="#b8e0dc" transparent opacity={0.62} emissive="#7daaa4" emissiveIntensity={0.2} side={T.DoubleSide} />
        </mesh>
        <group ref={falls} position={[0, 6, 0.05]}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[((i % 3) - 1) * 0.35, -i * 0.75, 0]}>
              <boxGeometry args={[0.05, 0.6, 0.02]} />
              <meshBasicMaterial color="#eef8f2" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
