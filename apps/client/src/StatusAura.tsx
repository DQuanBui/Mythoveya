import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";

// Shared by every unit in every battle, like the village materials.
const glow = (color: string, opacity = 0.9) =>
  new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending });
const GEO = { star: new T.OctahedronGeometry(0.1, 0), mote: new T.SphereGeometry(0.07, 6, 4), ring: new T.RingGeometry(0.5, 0.62, 28).rotateX(-Math.PI / 2), shard: new T.ConeGeometry(0.05, 0.2, 4) };
const MAT = { stun: glow("#ffe066"), burn: glow("#ff8a3d"), slow: glow("#9fdcff", 0.55), regen: glow("#8dff9a"), mark: glow("#ff5f6d") };
const SHOWN = ["stun", "burn", "slow", "regen", "mark"] as const;

/** Lasting statuses drawn on a battle creature: stars circle a stunned head,
 * embers rise from a burn, frost rings a slowed creature, green motes drift
 * up during regeneration and a red marker hovers over a marked target. */
export function StatusAura({ kinds, height }: { kinds: string[]; height: number }) {
  const on = useMemo(() => new Set(kinds.filter((k) => (SHOWN as readonly string[]).includes(k))), [kinds.join()]);
  const group = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = settings.reduced ? 0 : clock.elapsedTime;
    g.children.forEach((part) => {
      const { kind, i } = part.userData as { kind: string; i: number };
      if (kind === "stun") {
        const a = t * 3 + (i / 3) * Math.PI * 2;
        part.position.set(Math.cos(a) * 0.32, height * 1.55 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.32);
        part.rotation.y = t * 4;
      } else if (kind === "burn" || kind === "regen") {
        const k = (t * (kind === "burn" ? 0.9 : 0.5) + i / 4) % 1,
          a = i * 2.4;
        part.position.set(Math.cos(a) * 0.35, height * (0.3 + k * 1.3), Math.sin(a) * 0.35);
        part.scale.setScalar(settings.reduced ? 0.8 : Math.sin(k * Math.PI));
      } else if (kind === "slow") {
        if (i) {
          const a = (i / 4) * Math.PI * 2;
          part.position.set(Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5);
        } else part.position.y = 0.05;
      } else if (kind === "mark") {
        part.position.y = height * 1.75 + Math.sin(t * 3) * 0.05;
        part.rotation.set(Math.PI, t * 2, 0);
      }
    });
  });
  if (!on.size) return null;
  return (
    <group ref={group} name="status-aura">
      {on.has("stun") && [0, 1, 2].map((i) => <mesh key={`s${i}`} geometry={GEO.star} material={MAT.stun} userData={{ kind: "stun", i }} />)}
      {on.has("burn") && [0, 1, 2, 3].map((i) => <mesh key={`b${i}`} geometry={GEO.mote} material={MAT.burn} userData={{ kind: "burn", i }} />)}
      {on.has("regen") && [0, 1, 2, 3].map((i) => <mesh key={`r${i}`} geometry={GEO.mote} material={MAT.regen} userData={{ kind: "regen", i }} />)}
      {on.has("slow") && [0, 1, 2, 3, 4].map((i) => <mesh key={`f${i}`} geometry={i ? GEO.shard : GEO.ring} material={MAT.slow} userData={{ kind: "slow", i }} />)}
      {on.has("mark") && <mesh geometry={GEO.shard} material={MAT.mark} scale={[1.6, 1.2, 1.6]} userData={{ kind: "mark", i: 0 }} />}
    </group>
  );
}
