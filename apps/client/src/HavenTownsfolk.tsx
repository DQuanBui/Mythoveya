import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  COTTAGE_SIZE,
  HAVEN_COTTAGES,
  havenWalkable,
  type Point,
} from "../../../packages/shared/haven";
import { buildGrid, findPath, type WalkGrid } from "../../../packages/shared/pathfind";
import { animateAvatar, createAvatar } from "./models";
import { WorldInteraction } from "./WorldInteraction";
import { daylight, islandHour } from "./daytime";
import { settings } from "./audio";

// Islanders who stroll between homes and landmarks, then head home at night.
export const TOWNSFOLK = [
  {
    name: "Mira the baker",
    avatar: 0,
    home: "clover",
    lines: [
      "Sunbread is best at dawn. Come by before the lamps go out!",
      "Liora says the Riftgate hums louder every night. I bake extra, just in case.",
    ],
  },
  {
    name: "Old Tomas",
    avatar: 5,
    home: "hearth",
    lines: [
      "Sixty years on these trails, and the island still surprises me.",
      "Click the ground and your feet find the way. Clever, these young keepers.",
    ],
  },
  {
    name: "Juniper",
    avatar: 6,
    home: "fern",
    lines: [
      "Have you found the glowing caches? One is near the waterfall, I'm sure!",
      "I counted eight sparkles from the lookout. Eight! The map has clues.",
    ],
  },
  {
    name: "Rowan the fisher",
    avatar: 7,
    home: "thistle",
    lines: [
      "Patience at the dock. Skyfins bite when you least expect them.",
      "Pip pays good Gold for a glimmer carp. Better than my old boots, anyway.",
    ],
  },
  {
    name: "Ada the smith",
    avatar: 1,
    home: "moss",
    lines: [
      "Ember Forge gear needs dust to shine. Salvage what you never wear.",
      "A legendary charm makes a quick creature quicker. Worth every spark.",
    ],
  },
  {
    name: "Brother Elm",
    avatar: 3,
    home: "heron",
    lines: [
      "The Grove of Insight keeps old tomes. Read them to your companions.",
      "Every chapter boss you calm makes the whole island breathe easier.",
    ],
  },
];
const door = (id: string): Point => {
  const c = HAVEN_COTTAGES.find((c) => c.id === id)!,
    d = COTTAGE_SIZE[c.style].d / 2 + 1.3;
  return [c.point[0] + Math.sin(c.rotation) * d, c.point[1] + Math.cos(c.rotation) * d];
};
const SPOTS: Point[] = [
  [0, 8],
  [3, 2],
  [-1.5, 13.8],
  [10, 8],
  [5, 11],
  [8, 24],
  [-20, 20],
  [26, 4],
  [1.5, 20.5],
  [-12, 15],
  [6, -10],
  [-16, 9],
];
let grid: WalkGrid | null = null;

function Villager({
  index,
  onInteract,
  disabled,
}: {
  index: number;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const folk = TOWNSFOLK[index];
  const model = useMemo(() => createAvatar(folk.avatar), [folk.avatar]);
  const home = useMemo(() => door(folk.home), [folk.home]);
  const state = useRef({
    pos: new T.Vector3(),
    path: [] as Point[],
    wait: 2 + index,
    inside: false,
  });
  useEffect(() => {
    const [x, z] = SPOTS[(index * 2) % SPOTS.length];
    state.current.pos.set(x, 0, z);
    model.position.set(x, 0, z);
  }, [index, model]);
  useFrame(({ clock, camera }, dt) => {
    dt = Math.min(dt, 0.1);
    const s = state.current,
      night = daylight(islandHour()).glow > 0.65;
    const near = camera.position.distanceTo(s.pos) < 46;
    model.visible = near && !s.inside;
    if (!grid) return;
    let walking = false;
    if (s.path.length) {
      const [tx, tz] = s.path[0],
        dx = tx - s.pos.x,
        dz = tz - s.pos.z,
        d = Math.hypot(dx, dz);
      if (d < 0.2) s.path.shift();
      else {
        const step = Math.min(d, dt * 1.55);
        s.pos.x += (dx / d) * step;
        s.pos.z += (dz / d) * step;
        model.rotation.y = Math.atan2(dx, dz);
        walking = true;
      }
      if (!s.path.length && night && Math.hypot(s.pos.x - home[0], s.pos.z - home[1]) < 0.6)
        s.inside = true;
    } else if ((s.wait -= dt) <= 0) {
      if (night && s.inside) {
        s.wait = 4;
      } else {
        if (!night) s.inside = false;
        const target = night
          ? home
          : SPOTS[Math.floor((clock.elapsedTime * 7.3 + index * 3.1) % SPOTS.length)];
        s.path = findPath(grid, [s.pos.x, s.pos.z], target, havenWalkable) || [];
        s.wait = 3 + ((index * 1.7 + clock.elapsedTime) % 6);
      }
    }
    model.position.copy(s.pos);
    if (near) animateAvatar(model, clock.elapsedTime + index, walking, false, settings.reduced);
  });
  return (
    <WorldInteraction
      name={`townsfolk-${index}`}
      title={folk.name}
      hint="Islander · Click to say hello"
      reach={6}
      disabled={disabled}
      activate={() => onInteract(`folk-${index}`)}
    >
      <primitive object={model} />
    </WorldInteraction>
  );
}

export function HavenTownsfolk({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  useEffect(() => {
    // Plan routes after the first frames so entering the island stays smooth.
    const t = setTimeout(() => {
      grid ||= buildGrid(havenWalkable, 46);
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  const count = settings.quality === "Low" ? 3 : TOWNSFOLK.length;
  return (
    <group name="haven-townsfolk">
      {TOWNSFOLK.slice(0, count).map((_, i) => (
        <Villager key={i} index={i} onInteract={onInteract} disabled={disabled} />
      ))}
    </group>
  );
}
