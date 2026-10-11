import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  HOLLOW_WILDLIFE,
  HOLLOW_WORKSHOP,
  hollowHeight,
  hollowWalkable,
} from "../../../packages/shared/hollow";
import { HabitatResident } from "./HavenWildlife";
import { animateAvatar, createAvatar } from "./models";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";
export function HollowWildlife({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const mira = useMemo(() => {
    const m = createAvatar(4);
    m.position.set(20.5, hollowHeight(20.5, 12), 12);
    m.userData.groundY = m.position.y;
    m.rotation.y = -Math.PI / 3;
    return m;
  }, []);
  useFrame(({ clock }) =>
    animateAvatar(mira, clock.elapsedTime, false, false, settings.reduced),
  );
  return (
    <group name="moonfrost-wildlife">
      {HOLLOW_WILDLIFE.map((site, i) => (
        <HabitatResident
          key={i}
          site={site}
          index={i}
          ground={hollowHeight}
          allowed={hollowWalkable}
          onInteract={onInteract}
          disabled={disabled}
        />
      ))}
      <WorldInteraction
        name="lantern-maker-mira"
        title="Mira"
        hint="Lantern maker"
        approach={HOLLOW_WORKSHOP}
        reach={4}
        disabled={disabled}
        activate={() => onInteract("hol-workshop")}
      >
        <primitive object={mira} />
      </WorldInteraction>
    </group>
  );
}
