import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Profile } from "../../../packages/shared/types";
import {
  OUTPOSTS,
  SUPPLY_NODES,
  conservancyOf,
  conservancyProp,
  supplyProp,
  outpostComplete,
  conservancyBlocked,
} from "../../../packages/shared/conservancy";
import { groundHeight, havenWalkable } from "../../../packages/shared/haven";
import { meadowHeight, meadowWalkable } from "../../../packages/shared/meadow";
import { canyonHeight, canyonWalkable } from "../../../packages/shared/canyon";
import { hollowHeight, hollowWalkable } from "../../../packages/shared/hollow";
import { Kit, SHAPES } from "./village-kit";
import { createAvatar, animateAvatar, part } from "./models";
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
function Site({
  profile,
  onInteract,
  disabled,
}: {
  profile: Profile;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const h = OUTPOSTS.find((h) => h.region === profile.region)!,
    [ground, walk] = rules[h.region];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const r = conservancyOf(profile, now),
    installed = (r.installed[h.region] || []).join(","),
    finished = outpostComplete(r, h.region);
  const geometry = useMemo(() => {
    const k = new Kit(),
      [x, z] = conservancyProp(h),
      y = ground(x, z);
    k.push([x, y, z]);
    k.box("#867f70", [0, -0.15, 0], [2.2, 0.7, 1.6]);
    if (installed.includes("shelter")) {
      k.box("#bca98b", [0, 0.6, -0.2], [1.7, 1.2, 1.1]);
      k.box("#465e59", [0, 0.35, 0.36], [0.55, 0.7, 0.04]);
      k.add(SHAPES.GABLE, h.color, [0, 1.18, -0.2], [2, 0.6, 1.5]);
      for (const side of [-1, 1])
        k.box("#e6c486", [side * 0.54, 0.7, 0.37], [0.27, 0.28, 0.05]);
    } else
      for (let i = 0; i < 3; i++)
        k.box("#a19172", [-0.6 + i * 0.6, 0.25, -0.2], [0.24, 0.22, 1]);
    if (installed.includes("planter")) {
      k.box("#96765e", [-0.65, 0.25, 0.59], [0.65, 0.3, 0.45]);
      for (let i = 0; i < 4; i++) {
        k.add(
          SHAPES.BUSH,
          "#83af88",
          [-0.87 + i * 0.15, 0.48, 0.58],
          [0.12, 0.18, 0.13],
        );
        k.add(
          SHAPES.BALL,
          h.color,
          [-0.87 + i * 0.15, 0.65, 0.58],
          [0.1, 0.1, 0.1],
        );
      }
    }
    if (installed.includes("lantern")) {
      k.add(SHAPES.CYL6, "#8d745d", [0.8, 1, 0.55], [0.05, 2, 0.05]);
      k.box("#f3d89a", [0.8, 1.7, 0.55], [0.27, 0.38, 0.27]);
      k.add(SHAPES.CONE, h.color, [0.8, 1.97, 0.55], [0.24, 0.18, 0.24]);
    }
    k.pop();
    // Flowers appear around a fully restored refuge, following the actual terrain.
    if (finished)
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          x = h.point[0] + Math.cos(a) * 3.8,
          z = h.point[1] + Math.sin(a) * 3.8;
        if (walk(x, z)) {
          k.add(
            SHAPES.CYL6,
            "#698c70",
            [x, ground(x, z) + 0.15, z],
            [0.025, 0.3, 0.025],
          );
          k.add(
            SHAPES.BALL,
            i % 2 ? h.color : "#eed39b",
            [x, ground(x, z) + 0.32, z],
            [0.12, 0.1, 0.12],
          );
        }
      }
    return k.build();
  }, [h, installed, finished]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const host = useMemo(() => {
    const m = createAvatar(h.avatar);
    m.position.set(
      h.point[0] + 1.1,
      ground(h.point[0] + 1.1, h.point[1]),
      h.point[1],
    );
    m.userData.groundY = m.position.y;
    part(m, "orb", h.color, [0, 1.3, 0.2], [0.16, 0.13, 0.09]);
    return m;
  }, [h]);
  useFrame(({ clock }) =>
    animateAvatar(host, clock.elapsedTime, false, false, settings.reduced),
  );
  const site = useMemo(
    () => ({
      species: h.species,
      point: [h.point[0], h.point[1] + 2] as [number, number],
      radius: 0.55,
    }),
    [h],
  );
  return (
    <group name={`conservancy-${h.region}`}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        name={`habitat-pieces-${installed || "empty"}`}
      >
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>
      <WorldInteraction
        name={h.id}
        title={h.host}
        hint="Conservancy steward"
        approach={h.point}
        reach={4}
        disabled={disabled}
        activate={() => onInteract(h.id)}
      >
        <primitive object={host} />
      </WorldInteraction>
      {finished && (
        <HabitatResident
          site={site}
          index={4}
          ground={ground}
          allowed={(x, z) => walk(x, z) && !conservancyBlocked(h.region, x, z)}
          onInteract={onInteract}
          disabled={disabled}
        />
      )}
      {SUPPLY_NODES.filter((n) => n.region === h.region).map((n) => {
        const [x, z] = supplyProp(n),
          spent = r.gathered.includes(n.id);
        return (
          <WorldInteraction
            key={n.id}
            name={n.id}
            title={n.name}
            hint={
              spent
                ? "Replenishes at 00:00 UTC"
                : "Gather Conservancy materials"
            }
            approach={n.point}
            reach={3}
            disabled={disabled}
            activate={() => onInteract(n.id)}
          >
            <group
              position={[x, ground(x, z), z]}
              name={`supply-${n.material}-${spent ? "gathered" : "ready"}`}
            >
              <mesh position={[0, 0.12, 0]} receiveShadow>
                <cylinderGeometry args={[0.44, 0.4, 0.24, 8]} />
                <meshStandardMaterial color="#9b876c" />
              </mesh>
              {!spent &&
                [0, 1, 2].map((i) => (
                  <mesh
                    key={i}
                    position={[(i - 1) * 0.2, 0.4 + i * 0.04, 0]}
                    rotation={[
                      0,
                      0,
                      n.material === "timber" ? Math.PI / 2 : (i - 1) * 0.3,
                    ]}
                    castShadow
                  >
                    {n.material === "timber" ? (
                      <cylinderGeometry args={[0.09, 0.1, 0.6, 6]} />
                    ) : n.material === "fiber" ? (
                      <sphereGeometry args={[0.17, 7, 5]} />
                    ) : (
                      <octahedronGeometry args={[0.22]} />
                    )}
                    <meshStandardMaterial
                      color={
                        n.material === "timber"
                          ? "#b99a71"
                          : n.material === "fiber"
                            ? "#a5c795"
                            : "#a8dfe7"
                      }
                      roughness={0.7}
                    />
                  </mesh>
                ))}
            </group>
          </WorldInteraction>
        );
      })}
    </group>
  );
}
export function ConservancySites(props: {
  profile: Profile;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  return OUTPOSTS.some((h) => h.region === props.profile.region) ? (
    <Site key={props.profile.region} {...props} />
  ) : null;
}
