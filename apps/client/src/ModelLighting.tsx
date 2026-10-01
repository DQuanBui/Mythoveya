import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** A locally generated studio environment for soft, believable reflections. */
export function environmentFor(gl: T.WebGLRenderer) {
  const pmrem = new T.PMREMGenerator(gl),
    room = new RoomEnvironment(),
    texture = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return texture;
}
export function ModelLighting({ intensity = 0.4 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const texture = environmentFor(gl);
    scene.environment = texture;
    scene.environmentIntensity = intensity;
    return () => {
      if (scene.environment === texture) scene.environment = null;
      texture.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return null;
}
