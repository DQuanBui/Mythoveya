import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";

// A small extruded heart, shared by every burst.
const heart = (() => {
  const s = new T.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.3, -0.55, -0.1, -0.5, 0.2);
  s.bezierCurveTo(-0.45, 0.5, -0.05, 0.55, 0, 0.25);
  s.bezierCurveTo(0.05, 0.55, 0.45, 0.5, 0.5, 0.2);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.3, 0, -0.5);
  return new T.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.09);
})();
const COUNT = 5;

/** Hearts that float up from a companion while it is being greeted. */
export function Hearts({ active, target }: { active: boolean; target: T.Object3D }) {
  const material = useMemo(() => new T.MeshStandardMaterial({ color: "#ff7a9c", emissive: "#ff4f7f", emissiveIntensity: 0.45, transparent: true, roughness: 0.4 }), []);
  useEffect(() => () => material.dispose(), [material]);
  const group = useRef<T.Group>(null),
    started = useRef(-1);
  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g) return;
    if (active && started.current < 0) started.current = clock.elapsedTime;
    if (!active) started.current = -1;
    g.visible = active && !settings.reduced;
    if (!g.visible) return;
    const t = clock.elapsedTime - started.current,
      height = new T.Box3().setFromObject(target).max.y;
    g.position.set(target.position.x, height + 0.1, target.position.z);
    g.children.forEach((h, i) => {
      // Staggered hearts rise and sway for 1.4 s each, then start again.
      const life = (t - i * 0.32) % 1.4,
        on = t >= i * 0.32;
      h.visible = on;
      if (!on) return;
      h.position.set(Math.sin(i * 2.4 + life * 3) * 0.25, life * 0.9, Math.cos(i * 2.4) * 0.15);
      h.scale.setScalar(0.26 * Math.sin(Math.min(1, life / 1.4) * Math.PI) + 0.02);
      h.quaternion.copy(camera.quaternion);
    });
    material.opacity = 0.95;
  });
  return (
    <group ref={group} name="greet-hearts" visible={false}>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh key={i} geometry={heart} material={material} />
      ))}
    </group>
  );
}
