import { useCallback, useState } from "react";
import type * as T from "three";

/** Lets a 3D view survive a lost graphics context (common on phones when the
 * tab is backgrounded or the GPU is busy): the loss is marked recoverable,
 * and once the browser restores the context the Canvas is rebuilt from
 * scratch. Pass `key` and `onCreated` to the Canvas. */
export function useContextRecovery(name: string) {
  const [key, setKey] = useState(0);
  const onCreated = useCallback(
    ({ gl }: { gl: T.WebGLRenderer }) => {
      const canvas = gl.domElement;
      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        console.warn(`Mythoveya: the ${name} view lost its graphics context; it will rebuild when the browser restores it.`);
      });
      canvas.addEventListener("webglcontextrestored", () => setKey((k) => k + 1), { once: true });
    },
    [name],
  );
  return { key, onCreated };
}
