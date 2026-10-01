import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { HAVEN_RIFTGATE } from "../../../packages/shared/haven";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";

const stone = new T.MeshStandardMaterial({ color: "#b9b6a6", flatShading: true, roughness: 0.95 }),
  darkStone = new T.MeshStandardMaterial({ color: "#8e8b80", flatShading: true }),
  rune = new T.MeshStandardMaterial({
    color: "#9ff2df",
    emissive: "#5fd8c2",
    emissiveIntensity: 1.4,
  }),
  amethyst = new T.MeshStandardMaterial({
    color: "#c5a8f0",
    emissive: "#9a6fe0",
    emissiveIntensity: 1.1,
    flatShading: true,
  });
const portalMaterial = new T.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: T.DoubleSide,
  uniforms: { t: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float t;
    void main(){
      vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
      float swirl = sin(a * 3.0 + r * 9.0 - t * 2.2) * 0.5 + 0.5;
      float glow = pow(1.0 - r, 1.5);
      vec3 col = mix(vec3(0.36, 0.22, 0.62), vec3(0.5, 0.97, 0.86), swirl * 0.8 + glow * 0.35);
      col += vec3(1.0, 0.95, 0.85) * pow(glow, 4.0) * 0.8;
      gl_FragColor = vec4(col, smoothstep(1.0, 0.86, r) * 0.92);
    }`,
});

/** The Riftgate: a standing portal leading to story chapters and daily dungeons. */
export function Riftgate({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const [x, z] = HAVEN_RIFTGATE.point,
    r = HAVEN_RIFTGATE.rotation;
  const orbit = useRef<T.Group>(null),
    rings = useRef<T.Group>(null);
  const stones = useMemo(
    () => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2),
    [],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    portalMaterial.uniforms.t.value = settings.reduced ? 0 : time;
    if (settings.reduced) return;
    if (orbit.current) {
      orbit.current.rotation.y = time * 0.35;
      orbit.current.children.forEach((s, i) => {
        s.position.y = 2.4 + Math.sin(time * 1.3 + i) * 0.35;
        s.rotation.x = time + i;
      });
    }
    rings.current?.children.forEach((ring, i) => {
      ring.rotation.z = time * (i % 2 ? -0.6 : 0.45);
    });
  });
  // Front of the gate faces the village trail; approach from there.
  const front: [number, number] = [x + Math.sin(r) * 2.4, z + Math.cos(r) * 2.4];
  return (
    <WorldInteraction
      name="riftgate"
      position={[x, 0, z]}
      title="The Riftgate"
      hint="Story chapters & daily dungeons · Click to enter"
      approach={front}
      reach={6}
      disabled={disabled}
      activate={() => onInteract("riftgate")}
    >
      <group rotation={[0, r, 0]}>
        <mesh material={darkStone} position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[2.6, 2.8, 0.24, 10]} />
        </mesh>
        <mesh material={stone} position={[0, 0.32, 0]} receiveShadow>
          <cylinderGeometry args={[2.1, 2.3, 0.18, 10]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.75, 0, 0]}>
            <mesh material={stone} position={[0, 2.35, 0]} castShadow>
              <boxGeometry args={[0.7, 4.1, 0.8]} />
            </mesh>
            <mesh material={darkStone} position={[0, 4.45, 0]} castShadow>
              <boxGeometry args={[0.9, 0.22, 1]} />
            </mesh>
            {[1.2, 2.1, 3, 3.9].map((y) => (
              <mesh key={y} material={rune} position={[0, y, 0.41]}>
                <boxGeometry args={[0.16, 0.36, 0.02]} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh material={stone} position={[0, 4.55, 0]} rotation={[0, 0, 0]} castShadow>
          <torusGeometry args={[1.75, 0.3, 6, 18, Math.PI]} />
        </mesh>
        <mesh material={amethyst} position={[0, 6.35, 0]}>
          <octahedronGeometry args={[0.38, 0]} />
        </mesh>
        <mesh material={portalMaterial} position={[0, 2.75, 0]} scale={[1.35, 1.9, 1]}>
          <circleGeometry args={[1, 48]} />
        </mesh>
        <group ref={rings} position={[0, 2.75, 0]} scale={[1.35, 1.9, 1]}>
          {[1.02, 0.86].map((radius) => (
            <mesh key={radius} material={rune}>
              <torusGeometry args={[radius, 0.018, 4, 40, Math.PI * 1.4]} />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={orbit}>
        {stones.map((a, i) => (
          <mesh
            key={i}
            material={i % 2 ? amethyst : rune}
            position={[Math.cos(a) * 3, 2.4, Math.sin(a) * 3]}
            scale={i % 2 ? 0.16 : 0.12}
          >
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        ))}
      </group>
    </WorldInteraction>
  );
}
