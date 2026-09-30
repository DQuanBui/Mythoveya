import { useState, type ReactNode } from "react";
import { useCursor } from "@react-three/drei";

// A click activates; a camera drag never does. The HUD provides a keyboard-focusable alternative.
export function WorldInteraction({
  children,
  activate,
  disabled = false,
  name,
  position,
}: {
  children: ReactNode;
  activate: () => void;
  disabled?: boolean;
  name?: string;
  position?: [number, number, number];
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !disabled);
  return (
    <group
      name={name}
      position={position}
      onPointerOver={(e) => {
        if (!disabled) {
          e.stopPropagation();
          setHovered(true);
        }
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!disabled && e.delta < 6) {
          e.stopPropagation();
          setHovered(false);
          activate();
        }
      }}
    >
      {children}
    </group>
  );
}
