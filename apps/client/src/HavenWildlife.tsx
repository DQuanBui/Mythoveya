import { WorldInteraction } from "./WorldInteraction";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { HAVEN_WILDLIFE, havenWalkable } from "../../../packages/shared/haven";
import { createCreature, animateCreature } from "./models";
import { audio, settings } from "./audio";

function Resident({
  site,
  index,
  onInteract,
  disabled,
}: {
  site: (typeof HAVEN_WILDLIFE)[number];
  index: number;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const model = useMemo(() => createCreature(site.species), [site.species]),
    lastVoice = useRef(0),
    time = useRef(index * 3.7);
  const anchor = useMemo(
    () => new T.Vector3(site.point[0], 0, site.point[1]),
    [site],
  );
  // Creature geometry and materials belong to the shared model factory.
  useEffect(() => {
    model.position.copy(anchor);
  }, [model, anchor]);
  useFrame(({ camera }, dt) => {
    const distance = camera.position.distanceTo(anchor);
    model.visible = distance < (settings.quality === "Low" ? 30 : 43);
    if (!model.visible) return;
    time.current += Math.min(dt, 0.05);
    const t = time.current,
      walking = !settings.reduced && t % 12 < 7;
    if (walking) {
      const x = site.point[0] + Math.sin(t * 0.23) * site.radius,
        z = site.point[1] + Math.cos(t * 0.17) * site.radius;
      if (site.water || havenWalkable(x, z)) {
        const dx = x - model.position.x,
          dz = z - model.position.z;
        if (Math.hypot(dx, dz) > 0.001) model.rotation.y = Math.atan2(dx, dz);
        model.position.x = x;
        model.position.z = z;
      }
    }
    model.position.y = site.water ? 0.08 : 0;
    animateCreature(model, t, walking ? "walk" : "idle", 0, settings.reduced);
    if (t - lastVoice.current > 24 + index && distance < 14) {
      audio.voice(
        site.species,
        "call",
        (anchor.x - camera.position.x) / 18,
        0.25,
      );
      lastVoice.current = t;
    }
  });
  return (
    <WorldInteraction
      name={`habitat-${site.species}-${index}`}
      disabled={disabled}
      activate={() => onInteract(`observe-${site.species}`)}
    >
      <primitive object={model} />
    </WorldInteraction>
  );
}
export function HavenWildlife({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <group name="haven-wildlife">
      {HAVEN_WILDLIFE.map((site, i) => (
        <Resident
          key={i}
          site={site}
          index={i}
          onInteract={onInteract}
          disabled={disabled}
        />
      ))}
      <Butterflies />
    </group>
  );
}
function Butterflies() {
  const flock = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (settings.reduced) return;
    flock.current?.children.forEach((g, i) => {
      const t = clock.elapsedTime * 0.6 + i;
      g.position.set(
        8 + Math.sin(t) * 5,
        1.1 + Math.sin(t * 2) * 0.4,
        26 + Math.cos(t * 0.8) * 4,
      );
      g.rotation.y = -t;
      g.children.forEach(
        (w, j) =>
          (w.rotation.z =
            (j ? -1 : 1) * (0.25 + Math.abs(Math.sin(t * 14)) * 0.9)),
      );
    });
  });
  return (
    <group ref={flock} name="clearing-butterflies">
      {Array.from({ length: settings.quality === "Low" ? 4 : 9 }, (_, i) => (
        <group
          key={i}
          position={[8 + Math.sin(i) * 4, 1.2, 26 + Math.cos(i) * 3]}
        >
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.09, 0, 0]}>
              <planeGeometry args={[0.17, 0.23]} />
              <meshBasicMaterial
                color={["#e2c38e", "#dfbdb2", "#b8c5de"][i % 3]}
                side={T.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
