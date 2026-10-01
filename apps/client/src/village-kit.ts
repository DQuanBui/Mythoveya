import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type V3 = [number, number, number];
const BOX = new T.BoxGeometry(1, 1, 1),
  CYL = new T.CylinderGeometry(1, 1, 1, 8),
  CYL6 = new T.CylinderGeometry(1, 1, 1, 6),
  PRISM = new T.CylinderGeometry(1, 1, 1, 3),
  CONE = new T.ConeGeometry(1, 1, 8),
  CONE4 = new T.ConeGeometry(1, 1, 4),
  ROCK = new T.DodecahedronGeometry(1, 0),
  BALL = new T.IcosahedronGeometry(1, 0),
  BUSH = new T.IcosahedronGeometry(1, 1);
// Turns the 3-sided cylinder into a gable: extruded along X, apex up, base at y=0.
const GABLE = PRISM.clone()
  .applyMatrix4(
    new T.Matrix4().makeBasis(
      new T.Vector3(0, 0, 1),
      new T.Vector3(1, 0, 0),
      new T.Vector3(0, 1, 0),
    ),
  )
  .scale(1, 1 / 1.5, 1 / Math.sqrt(3))
  .translate(0, 0.5 / 1.5, 0);
export const SHAPES = { BOX, CYL, CYL6, CONE, CONE4, ROCK, BALL, BUSH, GABLE };

/** Collects many colored parts into one merged, vertex-colored geometry. */
export class Kit {
  private parts: T.BufferGeometry[] = [];
  private stack: T.Matrix4[] = [new T.Matrix4()];
  private color = new T.Color();
  push(position: V3, rotationY = 0) {
    const m = new T.Matrix4()
      .makeRotationY(rotationY)
      .setPosition(...position)
      .premultiply(this.stack.at(-1)!);
    this.stack.push(m);
    return this;
  }
  pop() {
    this.stack.pop();
    return this;
  }
  add(
    shape: T.BufferGeometry,
    color: string,
    position: V3,
    scale: V3 = [1, 1, 1],
    rotation: V3 = [0, 0, 0],
  ) {
    const g = shape.index ? shape.toNonIndexed() : shape.clone();
    g.deleteAttribute("uv");
    g.applyMatrix4(
      new T.Matrix4()
        .compose(
          new T.Vector3(...position),
          new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
          new T.Vector3(...scale),
        )
        .premultiply(this.stack.at(-1)!),
    );
    this.color.set(color);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3)
      colors.set([this.color.r, this.color.g, this.color.b], i);
    g.setAttribute("color", new T.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }
  box(color: string, position: V3, size: V3, rotation?: V3) {
    return this.add(BOX, color, position, size, rotation);
  }
  /** World-space point under the current transform. */
  point(local: V3) {
    return new T.Vector3(...local).applyMatrix4(this.stack.at(-1)!);
  }
  build() {
    if (!this.parts.length) return new T.BufferGeometry();
    const merged = mergeGeometries(this.parts, false)!;
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    merged.computeBoundingSphere();
    return merged;
  }
}
