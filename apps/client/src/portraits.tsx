import { useEffect, useState } from "react";
import * as T from "three";
import { createCreature } from "./models";
import { environmentFor } from "./ModelLighting";
import { byId } from "../../../packages/shared/content";
const cache = new Map<string, string>();
/** The three-quarter view every portrait is taken from. */
const VIEW = new T.Vector3(2.6, 1.6, 3.5).normalize();
let renderer: T.WebGLRenderer | undefined;
let scene: T.Scene, camera: T.PerspectiveCamera;
export function renderPortrait(id: string) {
  if (cache.has(id)) return cache.get(id)!;
  if (!renderer) {
    renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(192, 192);
    renderer.setPixelRatio(1);
    scene = new T.Scene();
    scene.environment = environmentFor(renderer);
    scene.environmentIntensity = 0.7;
    scene.add(new T.AmbientLight("#fff6dc", 1.7));
    const light = new T.DirectionalLight("#fff1d7", 3);
    light.position.set(3, 4, 5);
    scene.add(light);
    const rim = new T.DirectionalLight("#b0e8dc", 2);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    camera = new T.PerspectiveCamera(33, 1, 0.1, 30);
    camera.position.set(2.6, 2.1, 3.5);
    camera.lookAt(0, 0.85, 0);
  }
  const model = createCreature(id);
  scene.add(model);
  // Frame every creature by its own size, so tall mythics fit like small pups.
  const box = new T.Box3().setFromObject(model),
    center = box.getCenter(new T.Vector3()),
    radius = box.getBoundingSphere(new T.Sphere()).radius;
  const distance = Math.max(3.9, (radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2))) * 1.02);
  camera.position.copy(center).add(VIEW.clone().multiplyScalar(distance));
  camera.lookAt(center.x, center.y - radius * 0.05, center.z);
  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL("image/png");
  scene.remove(model);
  cache.set(id, image);
  return image;
}
export function Portrait({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const [src, setSrc] = useState(cache.get(id));
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) setSrc(renderPortrait(id));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id]);
  return (
    <img
      className={`portrait ${className}`}
      src={src || "/emblem.svg"}
      alt={byId[id].name}
      style={{
        background: `radial-gradient(ellipse,${byId[id].color}30,transparent 70%)`,
      }}
    />
  );
}
