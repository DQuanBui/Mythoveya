import { WorldInteraction } from "./WorldInteraction";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  HAVEN_WILDLIFE,
  havenWalkable,
  groundHeight,
} from "../../../packages/shared/haven";
import { createCreature, animateCreature } from "./models";
import { audio, settings } from "./audio";
import { daylight, islandHour } from "./daytime";
import { worldFocus } from "./village-materials";
import { glyphSprite } from "./glyphs";
import { byId } from "../../../packages/shared/content";

export function HabitatResident({
  site,
  index,
  onInteract,
  disabled,
  ground = groundHeight,
  allowed = havenWalkable,
  interactId,
}: {
  site: { species: string; point: [number, number]; radius: number; water?: boolean };
  ground?: (x: number, z: number) => number;
  allowed?: (x: number, z: number) => boolean;
  interactId?: string;
  index: number;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const model = useMemo(() => createCreature(site.species), [site.species]),
    lastVoice = useRef(0),
    time = useRef(index * 3.7),
    // A thought bubble: "!" or "?" on noticing the keeper, a heart at play.
    bubble = useRef({ since: -9, glyph: "" }),
    sprites = useMemo(() => {
      const group = new T.Group(),
        list = (["!", "?", "♥"] as const).map((g) => glyphSprite(g, g === "♥" ? "#ff8fa8" : "#fff6d8", 0.42));
      group.name = "wildlife-bubble";
      group.position.y = model.userData.headAt[0] + 0.55;
      for (const s of list) if (s) ((s.visible = false), group.add(s));
      model.add(group);
      return list;
    }, [model]);
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
    model.visible =
      distance <
      (settings.quality === "Low" ? 26 : settings.quality === "High" ? 43 : 36);
    if (!model.visible) return;
    time.current += Math.min(dt, 0.05);
    // Wildlife settles down to sleep after dark. Awake, it stops to watch a
    // keeper who comes close, and hops about when they are right beside it.
    const t = time.current,
      asleep = daylight(islandHour()).glow > 0.6,
      kx = worldFocus.x - model.position.x,
      kz = worldFocus.z - model.position.z,
      near = Math.hypot(kx, kz),
      curious = !asleep && near < 5,
      walking = !settings.reduced && !asleep && !curious && t % 12 < 7;
    let face = model.rotation.y;
    if (walking) {
      const x = site.point[0] + Math.sin(t * 0.23) * site.radius,
        z = site.point[1] + Math.cos(t * 0.17) * site.radius;
      // Steer toward the wander point, so a pause never ends in a jump.
      const dx = x - model.position.x,
        dz = z - model.position.z,
        gap = Math.hypot(dx, dz),
        step = Math.min(1, (1.6 * Math.min(dt, 0.05)) / Math.max(gap, 1e-6)),
        nx = model.position.x + dx * step,
        nz = model.position.z + dz * step;
      if (gap > 0.001 && (site.water || allowed(nx, nz))) {
        face = Math.atan2(dx, dz);
        model.position.x = nx;
        model.position.z = nz;
      }
    } else if (curious) face = Math.atan2(kx, kz);
    const turn = Math.atan2(Math.sin(face - model.rotation.y), Math.cos(face - model.rotation.y));
    model.rotation.y += turn * Math.min(1, Math.min(dt, 0.05) * 6);
    model.position.y = site.water
      ? 0.08
      : ground(model.position.x, model.position.z);
    const playing = curious && near < 2.4 && !settings.reduced,
      b = bubble.current;
    if (curious && !b.glyph) ((b.glyph = index % 3 === 1 ? "?" : "!"), (b.since = t));
    else if (!curious && (asleep || near > 7)) b.glyph = "";
    else if (playing && t - b.since > 4) ((b.glyph = "♥"), (b.since = t));
    // Pop in past full size, settle, then fade after about a second and a half.
    const age = t - b.since,
      shown = b.glyph && age < 1.8 ? b.glyph : "";
    sprites.forEach((s, i) => {
      if (!s) return;
      s.visible = shown === ["!", "?", "♥"][i];
      if (!s.visible) return;
      s.scale.setScalar(0.42 * (settings.reduced ? 1 : Math.min(1.15, age * 6) - Math.max(0, age - 0.2) * 0.1));
      s.position.y = settings.reduced ? 0 : Math.min(age, 0.3) * 0.4;
      s.material.opacity = Math.min(1, (1.8 - age) / 0.4);
    });
    animateCreature(model, t, walking ? "walk" : asleep && !site.water ? "sleep" : playing ? "play" : "idle", 0, settings.reduced);
    if (!asleep && t - lastVoice.current > 24 + index && distance < 14) {
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
      title={byId[site.species].name}
      hint="Wild companion · Click to observe"
      reach={7}
      activate={() => onInteract(interactId || `observe-${site.species}`)}
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
        <HabitatResident
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
