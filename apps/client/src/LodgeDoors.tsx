import { useEffect, useMemo } from "react";
import { LODGES } from "../../../packages/shared/lodges";
import { groundHeight } from "../../../packages/shared/haven";
import { meadowHeight } from "../../../packages/shared/meadow";
import { canyonHeight } from "../../../packages/shared/canyon";
import { hollowHeight } from "../../../packages/shared/hollow";
import { Kit } from "./village-kit";
import { WorldInteraction } from "./WorldInteraction";
export function LodgeDoors({
  region,
  onInteract,
  disabled,
}: {
  region: string;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const site = LODGES.find((s) => s.region === region);
  const geometry = useMemo(() => {
    if (!site) return null;
    const k = new Kit(),
      height =
        region === "haven"
          ? groundHeight
          : region === "meadow"
            ? meadowHeight
            : region === "canyon"
              ? canyonHeight
              : hollowHeight;
    // A flat doorstep and a wall-mounted sign add no new walking obstacles.
    const [x, z] = site.point,
      y = height(x, z);
    k.box(site.color, [x, y + 0.025, z], [1.7, 0.04, 1]);
    k.box("#e9d2a2", [x, y + 0.05, z], [1.3, 0.015, 0.06]);
    const direction = region === "haven" ? -1 : 1;
    k.box("#755941", [x, y + 2, z + direction * 1.8], [1.6, 0.7, 0.08]);
    k.box(site.color, [x, y + 2, z + direction * 1.74], [1.35, 0.46, 0.035]);
    k.box("#efdba9", [x, y + 2, z + direction * 1.7], [0.16, 0.3, 0.03]);
    return k.build();
  }, [site, region]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!site || !geometry) return null;
  return (
    <WorldInteraction
      name={site.id}
      approach={site.point}
      title={site.name}
      hint="Enter the lodge"
      reach={2}
      activate={() => onInteract(site.id)}
      disabled={disabled}
    >
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </mesh>
    </WorldInteraction>
  );
}
