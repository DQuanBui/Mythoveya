import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { HAVEN_SHOPS, shopFront } from "../../../packages/shared/haven";
import { SHOPS, type ShopId } from "../../../packages/shared/shops";
import { Kit, SHAPES } from "./village-kit";
import { villageGlow } from "./village-materials";
import { villageMaterial, ChimneySmoke } from "./HavenVillage";
import { WorldInteraction } from "./WorldInteraction";
import { Avatar } from "./Scene";
import { settings } from "./audio";

const coals = new T.MeshStandardMaterial({
  color: "#ff9a4a",
  emissive: "#ff6a1f",
  emissiveIntensity: 1.6,
  flatShading: true,
});
type V3 = [number, number, number];

function smithy(k: Kit, g: Kit, hot: Kit, smoke: T.Vector3[]) {
  const stone = "#8f877a",
    timber = "#5d4a3a",
    slate = "#4f5d66";
  k.box(stone, [0, 0.2, 0], [4.8, 0.4, 3.9]);
  k.box(stone, [0, 0.95, -0.3], [4.2, 1.3, 3]);
  k.box("#c9b89a", [0, 2.25, -0.3], [4.2, 1.3, 3]);
  for (const x of [-2.1, 2.1]) for (const z of [-1.8, 1.2]) k.box(timber, [x, 1.6, z], [0.18, 2.6, 0.18]);
  k.box(timber, [0, 2.95, 1.21], [4.3, 0.14, 0.08]);
  k.add(SHAPES.GABLE, "#c9b89a", [0, 2.9, -0.3], [4.2, 1.4, 3]);
  const a = Math.atan2(1.4, 1.5);
  for (const s of [-1, 1])
    k.box(slate, [0, 3.62 + 0.1, -0.3 + s * 0.85], [4.7, 0.16, 2.1], [s * a, 0, 0]);
  // Chimney and an open forge under a lean-to awning.
  k.box(stone, [1.4, 3.3, -1.2], [0.75, 3.2, 0.75]);
  k.box("#6f675b", [1.4, 4.95, -1.2], [0.9, 0.14, 0.9]);
  smoke.push(k.point([1.4, 5.1, -1.2]));
  k.box(timber, [-1.6, 1.2, 2.6], [0.14, 2.4, 0.14]);
  k.box(timber, [1.6, 1.2, 2.6], [0.14, 2.4, 0.14]);
  k.box(slate, [0, 2.45, 2], [3.6, 0.1, 1.6], [0.22, 0, 0]);
  k.box("#7d4a3a", [-1.1, 0.55, 1.7], [1.2, 0.7, 0.9]);
  hot.add(SHAPES.ROCK, "#ff9a4a", [-1.1, 0.95, 1.7], [0.42, 0.12, 0.3]);
  // Anvil, quench barrel and a rack of blades.
  k.box("#3d4245", [0.6, 0.35, 2.05], [0.35, 0.5, 0.3]);
  k.box("#4a5054", [0.6, 0.66, 2.05], [0.8, 0.16, 0.36]);
  k.add(SHAPES.CONE, "#4a5054", [1.08, 0.66, 2.05], [0.1, 0.25, 0.1], [0, 0, -Math.PI / 2]);
  k.add(SHAPES.CYL, "#7a5a3f", [1.75, 0.35, 1.6], [0.3, 0.7, 0.3]);
  k.add(SHAPES.CYL, "#4b7c84", [1.75, 0.71, 1.6], [0.26, 0.02, 0.26]);
  k.box(timber, [-2.6, 0.9, 0.4], [0.12, 1.8, 1.6]);
  for (let i = 0; i < 4; i++) k.box("#b8c2c6", [-2.5, 1.05, -0.2 + i * 0.4], [0.05, 1.1, 0.08]);
  // Door, windows and a hanging sign with a hammer.
  k.box(timber, [1, 0.95, 1.21], [0.8, 1.5, 0.08]);
  g.box("#f6c56f", [-0.4, 2.2, 1.22], [0.6, 0.55, 0.04]);
  g.box("#f6c56f", [1.2, 2.2, 1.22], [0.6, 0.55, 0.04]);
  k.box(timber, [-2.4, 2.4, 2.3], [0.08, 0.08, 1]);
  k.box("#7a6044", [-2.4, 2.05, 2.75], [0.08, 0.55, 0.75]);
  k.box("#c7cdd0", [-2.35, 2.08, 2.75], [0.04, 0.12, 0.45]);
  k.box("#6b5545", [-2.35, 2.08, 2.92], [0.05, 0.36, 0.06]);
}
function apothecary(k: Kit, g: Kit, smoke: T.Vector3[]) {
  const wall = "#e6dcc2",
    roof = "#6e8a6a";
  k.add(SHAPES.CYL, "#aaa591", [0, 0.2, 0], [2.1, 0.4, 2.1]);
  k.add(SHAPES.CYL, wall, [0, 1.75, 0], [1.75, 2.7, 1.75]);
  k.add(SHAPES.CYL, "#7d6650", [0, 3.15, 0], [1.85, 0.14, 1.85]);
  k.add(SHAPES.CONE, roof, [0, 4.2, 0], [2.15, 2, 2.15]);
  k.add(SHAPES.CONE, "#5a7457", [0, 5.4, 0], [0.18, 0.6, 0.18]);
  k.add(SHAPES.CYL, "#9c9281", [-0.9, 4.1, -0.7], [0.22, 1.4, 0.22]);
  smoke.push(k.point([-0.9, 4.9, -0.7]));
  // Shopfront: striped awning, counter and bottle shelves.
  for (let i = 0; i < 6; i++)
    k.box(i % 2 ? "#f1e8d4" : "#8a5d8a", [-1.25 + i * 0.5, 2.25, 2.05], [0.5, 0.08, 0.95], [0.32, 0, 0]);
  k.box("#7d6650", [0, 0.6, 1.95], [2.6, 0.8, 0.5]);
  k.box("#8f6f53", [0, 1.02, 1.95], [2.8, 0.08, 0.6]);
  const bottles = ["#7fc6b8", "#e39ab0", "#b6a2e6", "#f0cf7a", "#9fd27f"];
  for (let i = 0; i < 7; i++)
    g.add(SHAPES.CYL, bottles[i % 5], [-1.05 + i * 0.35, 1.2, 1.95], [0.07, 0.24, 0.07]);
  for (let i = 0; i < 5; i++) g.add(SHAPES.BALL, bottles[(i + 2) % 5], [-0.7 + i * 0.35, 1.68, 1.72], [0.1, 0.12, 0.1]);
  k.box("#6b5a48", [0, 1.55, 1.7], [2.2, 0.06, 0.25]);
  // Herb planters and a sign shaped like a mortar.
  for (const s of [-1, 1]) {
    k.box("#8a6a4c", [s * 2.1, 0.32, 0.9], [0.6, 0.4, 1.2]);
    for (let i = 0; i < 4; i++)
      k.add(SHAPES.BUSH, ["#7fae6f", "#a2c27f", "#c9a7d8", "#e7c46a"][i], [s * 2.1, 0.62, 0.45 + i * 0.3], [0.17, 0.2, 0.17]);
  }
  k.box("#7a6044", [1.9, 2.6, 1.4], [0.08, 0.08, 0.9]);
  k.add(SHAPES.CYL, "#e6dcc2", [1.9, 2.25, 1.8], [0.24, 0.3, 0.24]);
  k.add(SHAPES.CYL, "#6b5545", [2.02, 2.5, 1.8], [0.04, 0.4, 0.04], [0, 0, 0.6]);
  g.box("#f6d89a", [-1.2, 2, 1.4], [0.4, 0.5, 0.05], [0, 0.6, 0]);
}

export function HavenShops({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const built = useMemo(() => {
    const out = HAVEN_SHOPS.map((s) => {
      const k = new Kit(),
        g = new Kit(),
        hot = new Kit(),
        smoke: T.Vector3[] = [];
      k.push([s.point[0], 0, s.point[1]], s.rotation);
      g.push([s.point[0], 0, s.point[1]], s.rotation);
      hot.push([s.point[0], 0, s.point[1]], s.rotation);
      if (s.id === "smith") smithy(k, g, hot, smoke);
      else apothecary(k, g, smoke);
      return { id: s.id as ShopId, body: k.build(), glass: g.build(), hot: hot.build(), smoke };
    });
    return out;
  }, []);
  useEffect(
    () => () => built.forEach((b) => [b.body, b.glass, b.hot].forEach((geo) => geo.dispose())),
    [built],
  );
  const smoke = useMemo(() => built.flatMap((b) => b.smoke), [built]);
  const glow = useRef(0);
  useFrame(({ clock }) => {
    if (settings.reduced) return;
    glow.current = 1.4 + Math.sin(clock.elapsedTime * 3) * 0.25 + Math.sin(clock.elapsedTime * 7.3) * 0.12;
    coals.emissiveIntensity = glow.current;
  });
  return (
    <group name="haven-shops">
      {built.map((b) => {
        const s = HAVEN_SHOPS.find((x) => x.id === b.id)!,
          front = shopFront(b.id),
          keeper: V3 = [front[0] - Math.cos(s.rotation) * 0.9, 0, front[1] + Math.sin(s.rotation) * 0.9];
        return (
          <group key={b.id}>
            <WorldInteraction
              name={`shop-${b.id}`}
              title={SHOPS[b.id].name}
              hint={b.id === "smith" ? "Gear, forge dust · Click to shop" : "Elixirs, tomes, tonics · Click to shop"}
              approach={front}
              disabled={disabled}
              activate={() => onInteract(b.id)}
            >
              <mesh geometry={b.body} material={villageMaterial} castShadow receiveShadow />
              <mesh geometry={b.glass} material={villageGlow} />
              <mesh geometry={b.hot} material={coals} />
            </WorldInteraction>
            <WorldInteraction
              name={`shopkeeper-${b.id}`}
              title={SHOPS[b.id].keeper}
              hint="Shopkeeper · Click to browse"
              disabled={disabled}
              activate={() => onInteract(b.id)}
            >
              <group position={keeper} rotation={[0, s.rotation, 0]}>
                <Avatar index={b.id === "smith" ? 4 : 5} />
              </group>
            </WorldInteraction>
          </group>
        );
      })}
      <ChimneySmoke points={smoke} />
    </group>
  );
}
