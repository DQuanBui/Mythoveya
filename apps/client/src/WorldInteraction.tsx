import { useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as T from "three";
import { setHover, WalkContext } from "./hover";
import { settings } from "./audio";

const ringMaterial = new T.MeshBasicMaterial({
  color: "#ffe6ad",
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
});
const ringGeometry = new T.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2);

// A click walks the keeper within reach, then activates; a camera drag never does.
export function WorldInteraction({
  children,
  activate,
  disabled = false,
  name,
  position,
  title,
  hint = "Click to interact",
  reach = 5.5,
  approach,
}: {
  children: ReactNode;
  activate: () => void;
  disabled?: boolean;
  name?: string;
  position?: [number, number, number];
  title?: string;
  hint?: string;
  reach?: number;
  approach?: [number, number];
}) {
  const [hovered, setHovered] = useState(false);
  const walk = useContext(WalkContext);
  const group = useRef<T.Group>(null),
    ring = useRef<T.Mesh>(null);
  const box = useMemo(() => new T.Box3(), []),
    v = useMemo(() => new T.Vector3(), []),
    owner = useMemo(() => ({}), []);
  useCursor(hovered && !disabled);
  useFrame(({ clock }) => {
    if (!ring.current || !group.current) return;
    ring.current.visible = hovered && !disabled;
    if (!ring.current.visible) return;
    box.makeEmpty();
    for (const child of group.current.children)
      if (child !== ring.current) box.expandByObject(child);
    if (box.isEmpty()) return;
    box.getCenter(v);
    v.y = box.min.y + 0.06;
    group.current.worldToLocal(v);
    ring.current.position.copy(v);
    const radius = Math.min(
      3.4,
      Math.max(0.55, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + 0.2),
    );
    ring.current.scale.setScalar(
      radius * (settings.reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 5) * 0.04),
    );
  });
  const leave = () => {
    setHovered(false);
    setHover(null, owner);
  };
  return (
    <group
      ref={group}
      name={name}
      position={position}
      onPointerOver={(e) => {
        if (disabled) return;
        e.stopPropagation();
        setHovered(true);
        if (title) setHover({ title, hint }, owner);
      }}
      onPointerOut={leave}
      onClick={(e) => {
        if (disabled || e.delta >= 6) return;
        e.stopPropagation();
        leave();
        const target: [number, number] = approach || [e.point.x, e.point.z];
        walk.current.go(target, reach, activate);
      }}
    >
      {children}
      <mesh
        ref={ring}
        geometry={ringGeometry}
        material={ringMaterial}
        visible={false}
        raycast={() => null}
        renderOrder={2}
      />
    </group>
  );
}
