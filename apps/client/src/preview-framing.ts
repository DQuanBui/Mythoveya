import * as T from "three";

/** Fit the bounding sphere at any viewport aspect, including a rotated turntable. */
export function previewFrame(model: T.Object3D, aspect: number, fov = 37) {
  const sphere = new T.Box3().setFromObject(model).getBoundingSphere(new T.Sphere());
  const halfVertical = T.MathUtils.degToRad(fov / 2);
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(.1, aspect));
  const distance = Math.max(2.5, sphere.radius * 1.15 / Math.sin(Math.min(halfVertical, halfHorizontal)));
  return {
    center: sphere.center,
    distance,
    position: new T.Vector3(3, 1.7, 4.5).normalize().multiplyScalar(distance).add(sphere.center),
  };
}
