import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { Profile } from "../../../packages/shared/types";
import {
  ATLAS_CHAPTERS,
  atlasOf,
  atlasProp,
  tabletProp,
  atlasBlocked,
} from "../../../packages/shared/atlas";
import { groundHeight, havenWalkable } from "../../../packages/shared/haven";
import { meadowHeight, meadowWalkable } from "../../../packages/shared/meadow";
import { canyonHeight, canyonWalkable } from "../../../packages/shared/canyon";
import { hollowHeight, hollowWalkable } from "../../../packages/shared/hollow";
import { Kit, SHAPES } from "./village-kit";
import { createAvatar, animateAvatar, part } from "./models";
import { WorldInteraction } from "./WorldInteraction";
import { HabitatResident } from "./HavenWildlife";
import { settings } from "./audio";
const RULES = [
  [groundHeight, havenWalkable],
  [meadowHeight, meadowWalkable],
  [canyonHeight, canyonWalkable],
  [hollowHeight, hollowWalkable],
] as const;
function Site({
  profile,
  onInteract,
  disabled,
}: {
  profile: Profile;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const index = ATLAS_CHAPTERS.findIndex((c) => c.region === profile.region),
    c = ATLAS_CHAPTERS[index],
    r = atlasOf(profile),
    complete = r.chapters.includes(c.region),
    [ground, walk] = RULES[index],
    [x, z] = atlasProp(c),
    [tx, tz] = tabletProp(c),
    orb = useRef<Group>(null);
  const geometry = useMemo(() => {
    const k = new Kit();
    k.push([x, ground(x, z), z]);
    k.add(SHAPES.CYL6, "#9c9181", [0, 0.14, 0], [1.15, 0.28, 1.15]);
    if (index === 0) {
      for (const a of [-0.7, 0.7])
        for (const b of [-0.7, 0.7])
          k.box("#967d61", [a, 1.05, b], [0.13, 1.9, 0.13]);
      k.add(SHAPES.GABLE, c.color, [0, 2, 0], [1.9, 0.7, 1.9]);
      k.box("#80694f", [0, 0.7, 0], [1.3, 0.15, 0.8]);
      for (let i = 0; i < 3; i++)
        k.box(
          [c.color, "#799ead", "#b194b3"][i],
          [-0.35 + i * 0.32, 0.85, 0],
          [0.25, 0.18, 0.42],
        );
    } else if (index === 1) {
      for (const side of [-1, 1]) {
        k.add(SHAPES.CYL6, "#86765c", [side * 0.7, 1, 0], [0.15, 1.8, 0.15]);
        for (let j = 0; j < 4; j++)
          k.add(
            SHAPES.BUSH,
            j % 2 ? c.color : "#698d79",
            [side * (0.75 - j * 0.15), 1.7 + j * 0.2, 0],
            [0.36, 0.3, 0.35],
          );
      }
      k.box("#b69c75", [0, 0.55, 0], [0.95, 0.12, 0.65]);
    } else if (index === 2) {
      k.add(SHAPES.CYL6, "#9a795f", [0, 0.75, 0], [0.32, 1.3, 0.32]);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        k.add(
          SHAPES.ROCK,
          i % 2 ? c.color : "#d2bd91",
          [Math.cos(a) * 0.85, 1.75 + Math.sin(a) * 0.7, 0],
          [0.22, 0.26, 0.2],
        );
      }
    } else {
      for (const side of [-1, 1])
        k.add(SHAPES.CONE4, "#a7c5db", [side * 0.7, 1.1, 0], [0.25, 2, 0.3]);
      k.add(SHAPES.GABLE, c.color, [0, 2.15, 0], [1.7, 0.35, 0.6]);
      k.box("#72869b", [0, 0.6, 0], [1.1, 0.18, 0.7]);
    }
    k.pop();
    k.push([tx, ground(tx, tz), tz]);
    k.add(SHAPES.ROCK, "#9c9488", [0, 0.35, 0], [0.6, 0.55, 0.45]);
    k.box(
      complete ? c.color : "#d4c5a4",
      [0, 0.7, 0.04],
      [0.72, 0.13, 0.6],
      [0.3, 0, 0],
    );
    for (let i = 0; i < 3; i++)
      k.add(
        SHAPES.BALL,
        c.color,
        [-0.2 + i * 0.2, 0.8, 0.12],
        [0.05, 0.05, 0.05],
      );
    k.pop();
    return k.build();
  }, [c, index, complete, ground, x, z, tx, tz]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const host = useMemo(() => {
    const m = createAvatar(c.avatar);
    m.position.set(
      c.point[0] + 0.6,
      ground(c.point[0] + 0.6, c.point[1]),
      c.point[1],
    );
    m.userData.groundY = m.position.y;
    part(m, "box", c.color, [0.24, 0.95, 0.16], [0.16, 0.23, 0.09]);
    return m;
  }, [c, ground]);
  useFrame(({ clock }) => {
    animateAvatar(host, clock.elapsedTime, false, false, settings.reduced);
    if (orb.current) {
      orb.current.rotation.y = settings.reduced ? 0 : clock.elapsedTime * 0.2;
      orb.current.position.y =
        ground(x, z) +
        1.35 +
        (settings.reduced ? 0 : Math.sin(clock.elapsedTime) * 0.07);
    }
  });
  const site = useMemo(
    () => ({
      species: c.species,
      point: [c.point[0], c.point[1] + 2] as [number, number],
      radius: 0.4,
    }),
    [c],
  );
  return (
    <group name={`atlas-site-${c.region}`}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        name={`atlas-monument-${complete ? "restored" : "waiting"}`}
      >
        <meshStandardMaterial vertexColors roughness={0.85} />
      </mesh>
      <WorldInteraction
        name={c.id}
        title={c.host}
        hint="Atlas archivist"
        approach={c.point}
        reach={4}
        disabled={disabled}
        activate={() => onInteract(c.id)}
      >
        <primitive object={host} />
      </WorldInteraction>
      <WorldInteraction
        name={c.id + "-tablet"}
        title={c.fieldName}
        hint="Read the memory inscription"
        approach={c.field}
        reach={3}
        disabled={disabled}
        activate={() => onInteract(c.id + "-tablet")}
      >
        <mesh position={[tx, ground(tx, tz) + 0.92, tz]}>
          <octahedronGeometry args={[0.13]} />
          <meshStandardMaterial
            color={c.color}
            emissive={c.color}
            emissiveIntensity={0.25}
          />
        </mesh>
      </WorldInteraction>
      {complete && (
        <group
          ref={orb}
          position={[x, ground(x, z) + 1.35, z]}
          name="atlas-memory-light"
        >
          <mesh>
            <octahedronGeometry args={[0.26]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={0.6}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.025, 5, 28]} />
            <meshStandardMaterial color="#efd396" />
          </mesh>
        </group>
      )}
      {complete && (
        <HabitatResident
          site={site}
          index={5}
          ground={ground}
          allowed={(x, z) => walk(x, z) && !atlasBlocked(c.region, x, z)}
          onInteract={onInteract}
          disabled={disabled}
        />
      )}
    </group>
  );
}
export function AtlasSites(props: {
  profile: Profile;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  return ATLAS_CHAPTERS.some((c) => c.region === props.profile.region) ? (
    <Site key={props.profile.region} {...props} />
  ) : null;
}
