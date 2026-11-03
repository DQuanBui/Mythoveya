import { useEffect, useMemo } from "react";
import type * as T from "three";
import { disposeLantern } from "./models";

/** Something a keeper model holds (a lantern, a leaf umbrella): made once,
 * attached to the given limb (1 left arm, 3 right arm) and disposed with the
 * model. Show it and hang it with `swingLantern` each frame. */
export function useCarried(model: T.Object3D, limb: 1 | 3, create: () => T.Object3D) {
  // `create` runs once; later renders keep the same item.
  const item = useMemo(create, []);
  useEffect(() => {
    (model.userData.limbs as T.Object3D[])[limb].add(item);
    return () => disposeLantern(item);
  }, [model, item, limb]);
  return item;
}
