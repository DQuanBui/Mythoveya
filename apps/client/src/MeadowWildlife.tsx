import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  MEADOW_WILDLIFE,
  MEADOW_LODGE,
  meadowHeight,
  meadowWalkable,
} from "../../../packages/shared/meadow";
import { HabitatResident } from "./HavenWildlife";
import { animateAvatar, createAvatar } from "./models";
import { WorldInteraction } from "./WorldInteraction";
import { settings } from "./audio";
export function MeadowWildlife({
  onInteract,
  disabled,
}: {
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const rowan = useMemo(() => {
    const m = createAvatar(3);
    m.position.set(20.5, meadowHeight(20.5, 12), 12);
    m.userData.groundY = m.position.y;
    m.rotation.y = -Math.PI / 3;
    return m;
  }, []);
  useFrame(({ clock }) =>
    animateAvatar(rowan, clock.elapsedTime, false, false, settings.reduced),
  );
  return (
    <group name="whisperleaf-wildlife">
      {MEADOW_WILDLIFE.map((site, i) => (
        <HabitatResident
          key={i}
          site={site}
          index={i}
          ground={meadowHeight}
          allowed={meadowWalkable}
          onInteract={onInteract}
          disabled={disabled}
        />
      ))}
      <WorldInteraction
        name="woodland-guide-rowan"
        title="Rowan"
        hint="Woodland guide"
        approach={MEADOW_LODGE}
        reach={4}
        disabled={disabled}
        activate={() => onInteract("mea-lodge")}
      >
        <primitive object={rowan} />
      </WorldInteraction>
    </group>
  );
}
