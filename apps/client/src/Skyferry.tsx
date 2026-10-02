import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { Kit, SHAPES } from "./village-kit";
import { lampGlow } from "./village-materials";
import { villageMaterial } from "./HavenVillage";
import { settings } from "./audio";

// A landing deck that runs out past the cliff, with the Skyferry moored at its end.
function dockGeometry() {
  const k = new Kit(),
    glow = new Kit();
  for (let z = 0.5, i = 0; z < 8.6; z += 0.42, i++)
    k.box(i % 4 ? "#b39a74" : "#a08867", [0, 0.12, z], [2.6, 0.08, 0.38]);
  for (const s of [-1, 1]) {
    k.box("#6d5847", [s * 1.25, 0.04, 4.5], [0.14, 0.14, 8.2]);
    for (const z of [0.8, 3, 5.4, 8.2]) {
      k.add(SHAPES.CYL6, "#5d4a3a", [s * 1.3, 0.55, z], [0.08, 1, 0.08]);
      // Struts brace the overhang back into the cliff face.
      if (z > 3) k.box("#584737", [s * 1.2, -1.6, z - 1.3], [0.12, 0.12, 3.6], [-0.75, 0, 0]);
    }
    k.box("#c9b58e", [s * 1.3, 0.95, 4.5], [0.05, 0.05, 7.6]);
    glow.add(SHAPES.BALL, "#fff1c4", [s * 1.3, 1.25, 8.2], [0.16, 0.2, 0.16]);
  }
  // Gate arch with a hanging sign at the landward end.
  for (const s of [-1, 1]) k.add(SHAPES.CYL6, "#6d5847", [s * 1.5, 1.4, 0.5], [0.12, 2.8, 0.12]);
  k.box("#7b6450", [0, 2.75, 0.5], [3.4, 0.22, 0.24]);
  k.box("#d9c79f", [0, 2.25, 0.55], [1.5, 0.5, 0.08]);
  k.box("#6e8d93", [0, 2.25, 0.6], [1.1, 0.12, 0.02]);
  return { solid: k.build(), glow: glow.build() };
}
function ferryGeometry() {
  const k = new Kit(),
    glow = new Kit();
  // Hull with pointed bow and stern, along local X.
  k.box("#8a6a4c", [0, 0, 0], [4.2, 0.8, 1.8]);
  k.box("#6f543c", [0, -0.5, 0], [3.4, 0.4, 1.2]);
  for (const s of [-1, 1]) k.box("#8a6a4c", [s * 2.1, 0, 0], [1.27, 0.8, 1.27], [0, Math.PI / 4, 0]);
  k.box("#d9c39a", [0, 0.42, 0], [4, 0.06, 1.6]);
  for (const s of [-1, 1]) {
    k.box("#5d4a3a", [0, 0.62, s * 0.88], [4.1, 0.08, 0.08]);
    k.box("#4f8a90", [0, 0.05, s * 0.91], [4.1, 0.14, 0.02]);
  }
  // Mast, balloon envelope and its rigging.
  k.add(SHAPES.CYL6, "#5d4a3a", [0, 2.1, 0], [0.08, 3.4, 0.08]);
  k.add(SHAPES.BUSH, "#efe2c2", [0, 4.5, 0], [2.7, 1.25, 1.25]);
  k.add(SHAPES.CYL, "#d67b5d", [0, 4.5, 0], [1.28, 0.32, 1.28], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) {
    k.box("#7b6450", [s * 1.1, 2.6, 0], [0.04, 2.6, 0.04], [0, 0, s * 0.35]);
    k.box("#7b6450", [0, 2.6, s * 0.5], [0.04, 2.6, 0.04], [s * -0.18, 0, 0]);
    k.box("#d67b5d", [-2.85, 4.5, s * 0.5], [0.7, 0.06, 0.5], [0, 0, 0]);
  }
  k.box("#7b6450", [-2.5, 0.9, 0], [0.5, 0.5, 0.5]);
  glow.add(SHAPES.BALL, "#fff1c4", [2.6, 0.9, 0], [0.18, 0.22, 0.18]);
  return { solid: k.build(), glow: glow.build() };
}
/** The dock and ferry, with the dock's landward end at `position` and the deck along `heading`. */
export function SkyferryDock({
  position,
  heading,
}: {
  position: [number, number, number];
  heading: number;
}) {
  const dock = useMemo(dockGeometry, []),
    ferry = useMemo(ferryGeometry, []);
  useEffect(
    () => () => [dock.solid, dock.glow, ferry.solid, ferry.glow].forEach((g) => g.dispose()),
    [dock, ferry],
  );
  const boat = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (!boat.current || settings.reduced) return;
    const t = clock.elapsedTime;
    boat.current.position.y = 0.55 + Math.sin(t * 0.9) * 0.12;
    boat.current.rotation.x = Math.sin(t * 0.7) * 0.03;
    boat.current.rotation.z = Math.sin(t * 0.55) * 0.025;
  });
  return (
    <group name="skyferry-dock" position={position} rotation={[0, heading, 0]}>
      <mesh geometry={dock.solid} material={villageMaterial} castShadow receiveShadow />
      <mesh geometry={dock.glow} material={lampGlow} />
      <group ref={boat} name="skyferry" position={[0, 0.55, 10]}>
        <mesh geometry={ferry.solid} material={villageMaterial} castShadow />
        <mesh geometry={ferry.glow} material={lampGlow} />
      </group>
    </group>
  );
}
