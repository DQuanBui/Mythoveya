import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  rallyHost,
  rallyProp,
  type RallyHost,
} from "../../../packages/shared/rally";
import { groundHeight, havenWalkable } from "../../../packages/shared/haven";
import { meadowHeight, meadowWalkable } from "../../../packages/shared/meadow";
import { canyonHeight, canyonWalkable } from "../../../packages/shared/canyon";
import { hollowHeight, hollowWalkable } from "../../../packages/shared/hollow";
import { createAvatar, animateAvatar, part } from "./models";
import { Kit, SHAPES } from "./village-kit";
import { WorldInteraction } from "./WorldInteraction";
import { HabitatResident } from "./HavenWildlife";
import { settings } from "./audio";
const rules: Record<
  string,
  [(x: number, z: number) => number, (x: number, z: number) => boolean]
> = {
  haven: [groundHeight, havenWalkable],
  meadow: [meadowHeight, meadowWalkable],
  canyon: [canyonHeight, canyonWalkable],
  hollow: [hollowHeight, hollowWalkable],
};
function Camp({
  h,
  onInteract,
  disabled,
}: {
  h: RallyHost;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const [ground, walk] = rules[h.region];
  const host = useMemo(() => {
    const m = createAvatar(h.avatar);
    m.position.set(
      h.point[0] + 1.3,
      ground(h.point[0] + 1.3, h.point[1]),
      h.point[1],
    );
    m.userData.groundY = m.position.y;
    m.rotation.y = -0.5;
    part(m, "orb", h.color, [0, 1.25, 0.2], [0.15, 0.12, 0.09]);
    return m;
  }, [h]);
  const mesh = useMemo(() => {
    const k = new Kit(),
      [x, z] = rallyProp(h),
      y = ground(x, z);
    k.push([x, y, z]);
    for (const dx of [-1.6, 1.6])
      for (const dz of [-1, 1])
        k.add(SHAPES.CYL6, "#907962", [dx, 1.3, dz], [0.08, 2.6, 0.08]);
    k.add(SHAPES.GABLE, h.color, [0, 2.55, 0], [3.5, 0.65, 2.3]);
    k.box("#967f62", [0, 0.65, 0], [2.1, 0.12, 0.9]);
    for (const dx of [-0.8, 0.8])
      k.box("#7c6c5e", [dx, 0.3, 0], [0.12, 0.6, 0.6]);
    k.box("#eeddb3", [-0.45, 0.75, 0], [0.6, 0.1, 0.5]);
    k.add(SHAPES.BALL, h.color, [0.4, 0.9, 0], [0.25, 0.22, 0.25]);
    for (let i = 0; i < 5; i++)
      k.add(
        SHAPES.CONE,
        i % 2 ? h.color : "#f4d9a0",
        [-1.3 + i * 0.65, 2.1, 1.08],
        [0.14, 0.25, 0.06],
        [0, 0, Math.PI],
      );
    if (h.region === "meadow")
      for (let i = 0; i < 3; i++)
        k.add(
          SHAPES.BUSH,
          "#ad7694",
          [0.5 + i * 0.22, 0.87, 0],
          [0.1, 0.1, 0.1],
        );
    if (h.region === "canyon")
      k.add(SHAPES.CYL6, "#dfac78", [0.75, 0.9, 0], [0.2, 0.35, 0.2]);
    if (h.region === "hollow")
      k.add(SHAPES.CONE, "#d6e9eb", [0, 3, 0], [0.35, 0.35, 0.35]);
    k.pop();
    return k.build();
  }, [h]);
  useFrame(({ clock }) =>
    animateAvatar(host, clock.elapsedTime, false, false, settings.reduced),
  );
  const site = useMemo(
    () => ({
      species: h.species,
      point: [h.point[0], h.point[1] + 2] as [number, number],
      radius: 0.45,
    }),
    [h],
  );
  return (
    <group name={`wayfarer-camp-${h.region}`}>
      <mesh geometry={mesh} dispose={null} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.85} />
      </mesh>
      <WorldInteraction
        name={`wayfarer-${h.host.toLowerCase()}`}
        title={h.host}
        hint={h.role}
        approach={h.point}
        reach={4}
        disabled={disabled}
        activate={() => onInteract(h.id)}
      >
        <primitive object={host} />
      </WorldInteraction>
      <HabitatResident
        site={site}
        index={3}
        ground={ground}
        allowed={walk}
        onInteract={onInteract}
        disabled={disabled}
      />
    </group>
  );
}
export function RallyCamp({
  region,
  onInteract,
  disabled,
}: {
  region: string;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const h = rallyHost(region);
  return h ? (
    <Camp key={region} h={h} onInteract={onInteract} disabled={disabled} />
  ) : null;
}
