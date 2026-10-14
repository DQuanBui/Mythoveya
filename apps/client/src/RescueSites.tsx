import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { Profile } from "../../../packages/shared/types";
import {
  RESCUES,
  rescueRecord,
  rescueProp,
  rescueBlocked,
} from "../../../packages/shared/rescue";
import { groundHeight, havenWalkable } from "../../../packages/shared/haven";
import { meadowHeight, meadowWalkable } from "../../../packages/shared/meadow";
import { canyonHeight, canyonWalkable } from "../../../packages/shared/canyon";
import { hollowHeight, hollowWalkable } from "../../../packages/shared/hollow";
import { atlasBlocked } from "../../../packages/shared/atlas";
import { conservancyBlocked } from "../../../packages/shared/conservancy";
import { rallyBlocked } from "../../../packages/shared/rally";
import { Kit, SHAPES } from "./village-kit";
import { createAvatar, animateAvatar, part } from "./models";
import { WorldInteraction } from "./WorldInteraction";
import { HabitatResident } from "./HavenWildlife";
import { settings } from "./audio";
type Props = {
  profile: Profile;
  onInteract: (id: string) => void;
  disabled: boolean;
};
const RULES = [
  [groundHeight, havenWalkable],
  [meadowHeight, meadowWalkable],
  [canyonHeight, canyonWalkable],
  [hollowHeight, hollowWalkable],
] as const;
function Site({ profile, onInteract, disabled }: Props) {
  const index = RESCUES.findIndex((s) => s.region === profile.region),
    s = RESCUES[index],
    record = rescueRecord(profile, s.region),
    count = record.helpers.length,
    [height, walk] = RULES[index],
    [x, z] = rescueProp(s),
    signal = useRef<Group>(null);
  const geometry = useMemo(() => {
    const k = new Kit(),
      braced = record.helpers.some((h) => h.ability === "brace"),
      nurtured = record.helpers.some((h) => h.ability === "nurture");
    k.push([x, height(x, z), z]);
    k.add(
      SHAPES.CYL6,
      index === 3 ? "#c1d3dc" : "#ad9473",
      [0, 0.1, 0],
      [1.25, 0.2, 1.25],
    );
    if (index === 0) {
      for (const side of [-1, 1])
        k.box(
          "#8e7050",
          [side * 0.7, 1, 0],
          [0.14, 1.8, 0.14],
          [0, 0, braced ? 0 : side * 0.25],
        );
      k.box("#bda078", [0, 1.8, 0], [1.6, 0.12, 0.15]);
      k.add(SHAPES.CYL6, "#c49b6a", [0, 0.4, 0], [0.55, 0.45, 0.55]);
      for (let i = 0; i < 3; i++)
        k.add(
          SHAPES.BALL,
          "#f5e9c9",
          [(i - 1) * 0.18, 0.65, 0],
          [0.12, 0.17, 0.12],
        );
    } else if (index === 1) {
      for (const side of [-1, 1])
        k.add(SHAPES.ROCK, "#849083", [side * 0.7, 0.35, 0], [0.35, 0.35, 0.4]);
      k.box(
        "#86664c",
        [0, braced ? 0.62 : 0.4, 0],
        [1.6, 0.2, 0.55],
        [0, 0, braced ? 0 : 0.28],
      );
      for (let i = 0; i < 4; i++)
        k.box("#c7ae83", [-0.6 + i * 0.4, 0.75, 0], [0.11, 0.1, 0.6]);
    } else if (index === 2) {
      for (const side of [-1, 1])
        k.add(SHAPES.ROCK, "#b88969", [side * 0.6, 0.65, 0], [0.34, 0.7, 0.48]);
      k.box("#d8ae7c", [0, 1.25, 0], [1.6, 0.3, 1], [0, 0, braced ? 0 : 0.2]);
      k.add(SHAPES.BALL, "#514c61", [0, 0.36, 0.42], [0.38, 0.33, 0.1]);
      k.add(
        SHAPES.CYL6,
        nurtured ? "#7fc9cc" : "#b4967b",
        [0.75, 0.25, 0.55],
        [0.25, 0.1, 0.25],
      );
    } else {
      for (let i = 0; i < 4; i++)
        k.box(
          "#a7c0d6",
          [-0.65 + i * 0.43, 0.6, -0.3],
          [0.37, 1.1, 0.3],
          [0, 0, (i - 1.5) * 0.06],
        );
      k.add(SHAPES.GABLE, "#e1ebee", [0, 1.2, -0.3], [1.6, 0.3, 0.65]);
      k.add(
        SHAPES.BUSH,
        nurtured ? "#8dbbb3" : "#b2bbc8",
        [0, 0.3, 0.35],
        [0.65, 0.15, 0.4],
      );
    }
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5,
        px = Math.cos(a) * 0.95,
        pz = Math.sin(a) * 0.95;
      k.add(
        SHAPES.CONE4,
        nurtured ? s.color : "#9d977f",
        [px, 0.35, pz],
        [0.12, nurtured ? 0.6 : 0.25, 0.12],
      );
      if (nurtured)
        k.add(
          SHAPES.BALL,
          i % 2 ? "#f1d38d" : "#e7aebc",
          [px, 0.65, pz],
          [0.13, 0.1, 0.13],
        );
    }
    if (record.outcome === "shelter") {
      for (const side of [-1, 1])
        k.box("#8a7a69", [side * 0.85, 1, 0], [0.1, 2, 0.1]);
      k.add(SHAPES.GABLE, s.color, [0, 2.05, 0], [1.9, 0.45, 1.5]);
    } else if (record.outcome === "wild") {
      for (const side of [-1, 1]) {
        k.box("#8a7a69", [side * 0.85, 1, 0], [0.08, 1.8, 0.08]);
        k.box(s.color, [side * 0.85, 1.75, 0], [0.36, 0.3, 0.05]);
      }
    }
    k.pop();
    return k.build();
  }, [s, index, count, record.outcome, height, x, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const host = useMemo(() => {
    const m = createAvatar(s.avatar);
    m.position.set(
      s.point[0] + 0.7,
      height(s.point[0] + 0.7, s.point[1]),
      s.point[1],
    );
    m.userData.groundY = m.position.y;
    part(m, "box", s.color, [0, 1.22, 0.21], [0.4, 0.12, 0.08]);
    part(m, "box", "#d6bd88", [-0.25, 0.85, 0.18], [0.17, 0.23, 0.1]);
    return m;
  }, [s, height]);
  useFrame(({ clock }) => {
    animateAvatar(host, clock.elapsedTime, false, false, settings.reduced);
    if (signal.current)
      signal.current.rotation.y = settings.reduced
        ? 0
        : clock.elapsedTime * 0.35;
  });
  const wildlife = useMemo(
    () => ({
      species: s.species,
      point: [s.point[0] - 0.6, s.point[1] + 1.2] as [number, number],
      radius: record.outcome === "wild" ? 1.1 : record.outcome ? 0.4 : 0.2,
    }),
    [s, record.outcome],
  );
  return (
    <group name={`rescue-site-${s.region}`}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        name={`rescue-stage-${count}-${record.outcome || "waiting"}`}
      >
        <meshStandardMaterial vertexColors roughness={0.85} />
      </mesh>
      <WorldInteraction
        name={s.id}
        title={s.host}
        hint="Companion rescue keeper"
        approach={s.point}
        reach={4}
        disabled={disabled}
        activate={() => onInteract(s.id)}
      >
        <primitive object={host} />
      </WorldInteraction>
      {record.helpers.some((h) => h.ability === "beacon") && (
        <group
          ref={signal}
          position={[x, height(x, z) + 1.65, z]}
          name="rescue-beacon"
        >
          <mesh>
            <octahedronGeometry args={[0.17]} />
            <meshStandardMaterial
              color="#f6ce7d"
              emissive="#efb663"
              emissiveIntensity={0.7}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.025, 5, 24]} />
            <meshStandardMaterial color={s.color} />
          </mesh>
        </group>
      )}
      <HabitatResident
        site={wildlife}
        index={12 + index}
        ground={height}
        allowed={(x, z) =>
          walk(x, z) &&
          !rescueBlocked(s.region, x, z) &&
          !atlasBlocked(s.region, x, z) &&
          !conservancyBlocked(s.region, x, z) &&
          !rallyBlocked(s.region, x, z)
        }
        onInteract={onInteract}
        interactId={s.id}
        disabled={disabled}
      />
    </group>
  );
}
export function RescueSites(props: Props) {
  return RESCUES.some((s) => s.region === props.profile.region) ? (
    <Site key={props.profile.region} {...props} />
  ) : null;
}
