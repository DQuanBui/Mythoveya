import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CANYON_WILDLIFE,
  canyonHeight,
  canyonWalkable,
} from "../../../packages/shared/canyon";
import { HabitatResident } from "./HavenWildlife";
import { animateAvatar, createAvatar } from "./models";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";
const sentinel = {
  species: "cindervane",
  point: [4, -21.3] as [number, number],
  radius: 0.2,
};
export function CanyonWildlife({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const ranger = useMemo(() => {
    const model = createAvatar(6);
    model.position.set(-25.5, canyonHeight(-25.5, 25.5), 25.5);
    model.userData.groundY = model.position.y;
    model.rotation.y = Math.PI;
    return model;
  }, []);
  useFrame(({ clock }) =>
    animateAvatar(ranger, clock.elapsedTime, false, false, settings.reduced),
  );
  return (
    <group name="canyon-wildlife">
      {CANYON_WILDLIFE.map((site, i) => (
        <HabitatResident
          key={i}
          site={site}
          index={i}
          onInteract={onInteract}
          disabled={disabled}
          ground={canyonHeight}
          allowed={canyonWalkable}
        />
      ))}
      <HabitatResident
        site={sentinel}
        index={9}
        interactId="can-guardian"
        onInteract={onInteract}
        disabled={disabled}
        ground={canyonHeight}
        allowed={canyonWalkable}
      />
      <WorldInteraction
        name="ranger-senna"
        title="Ranger Senna"
        hint="Signals in the Stone"
        approach={[-24, 25]}
        reach={4}
        disabled={disabled}
        activate={() => onInteract("can-camp")}
      >
        <primitive object={ranger} />
      </WorldInteraction>
    </group>
  );
}
