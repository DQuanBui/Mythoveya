import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { TownState } from "../../../packages/shared/types";
import type { Accessory } from "../../../packages/shared/town";
import { settings } from "./audio";

const ACCESSORY_COLORS: Record<Accessory, string> = {
  ribbon: "#77b4a1",
  bell: "#e1bb67",
  crown: "#e8c45e",
  scarf: "#d9674f",
  flower: "#f09ab4",
};
export function dressCompanion(model: T.Group, accessory?: Accessory) {
  if (!accessory) return model;
  const adornment = new T.Group();
  adornment.name = "companion-accessory";
  const material = new T.MeshStandardMaterial({
    color: ACCESSORY_COLORS[accessory],
    roughness: 0.45,
    metalness: accessory === "bell" || accessory === "crown" ? 0.5 : 0,
  });
  // Neck pieces sit at the chest; head pieces sit on top of the head.
  const [headY, headZ] = (model.userData.headAt as [number, number]) || [1.12, 0.48];
  if (accessory === "bell") {
    const bell = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), material);
    adornment.add(bell);
    const loop = new T.Mesh(new T.TorusGeometry(0.07, 0.018, 5, 12), material);
    loop.position.y = 0.13;
    adornment.add(loop);
    adornment.position.set(0, 0.65, 0.55);
  } else if (accessory === "ribbon") {
    for (const side of [-1, 1]) {
      const wing = new T.Mesh(new T.ConeGeometry(0.15, 0.22, 4), material);
      wing.rotation.z = (side * Math.PI) / 2;
      wing.position.x = side * 0.11;
      adornment.add(wing);
    }
    adornment.position.set(0, 0.65, 0.55);
  } else if (accessory === "scarf") {
    const wrap = new T.Mesh(new T.TorusGeometry(0.26, 0.07, 6, 16), material);
    wrap.rotation.x = Math.PI / 2 - 0.25;
    adornment.add(wrap);
    const stripe = new T.Mesh(
      new T.TorusGeometry(0.26, 0.074, 6, 16, Math.PI / 3),
      new T.MeshStandardMaterial({ color: "#f3e3b5", roughness: 0.6 }),
    );
    stripe.rotation.copy(wrap.rotation);
    adornment.add(stripe);
    const tail = new T.Mesh(new T.BoxGeometry(0.12, 0.3, 0.05), material);
    tail.position.set(0.14, -0.16, 0.2);
    tail.rotation.z = 0.3;
    adornment.add(tail);
    adornment.position.set(0, headY - 0.3, headZ - 0.1);
  } else if (accessory === "crown") {
    const band = new T.Mesh(new T.CylinderGeometry(0.15, 0.17, 0.09, 10, 1, true), material);
    band.material.side = T.DoubleSide;
    adornment.add(band);
    for (let i = 0; i < 5; i++) {
      const point = new T.Mesh(new T.ConeGeometry(0.035, 0.11, 4), material);
      const a = (i / 5) * Math.PI * 2;
      point.position.set(Math.cos(a) * 0.15, 0.09, Math.sin(a) * 0.15);
      adornment.add(point);
    }
    adornment.position.set(0, headY + 0.33, headZ - 0.02);
    adornment.rotation.x = -0.12;
  } else {
    for (let i = 0; i < 5; i++) {
      const petal = new T.Mesh(new T.SphereGeometry(0.07, 7, 5), material);
      const a = (i / 5) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0);
      petal.scale.set(1, 1, 0.45);
      adornment.add(petal);
    }
    const middle = new T.Mesh(
      new T.SphereGeometry(0.045, 7, 5),
      new T.MeshStandardMaterial({ color: "#f4cf5d", roughness: 0.6 }),
    );
    middle.position.z = 0.03;
    adornment.add(middle);
    adornment.position.set(0.22, headY + 0.25, headZ + 0.05);
    adornment.rotation.y = 0.5;
  }
  (model.userData.rig as T.Group).add(adornment);
  return model;
}
/** Festival outfits for the keeper: hats on the head, a cape across the back. */
export function dressKeeper(model: T.Group, outfit?: string) {
  if (!outfit) return model;
  const head = model.userData.head as T.Group | undefined;
  const piece = new T.Group();
  piece.name = "keeper-outfit";
  const mat = (color: string, extra: Partial<T.MeshStandardMaterialParameters> = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  if (outfit === "lantern-hat") {
    const shade = new T.Mesh(
      new T.CylinderGeometry(0.17, 0.2, 0.2, 10),
      mat("#f6d58a", { emissive: "#f3b45a", emissiveIntensity: 0.6 }),
    );
    shade.position.y = 0.3;
    piece.add(shade);
    for (const y of [0.19, 0.41]) {
      const rim = new T.Mesh(new T.CylinderGeometry(0.21, 0.21, 0.03, 10), mat("#c5573f"));
      rim.position.y = y;
      piece.add(rim);
    }
    const tassel = new T.Mesh(new T.ConeGeometry(0.04, 0.12, 5), mat("#c5573f"));
    tassel.position.y = 0.48;
    piece.add(tassel);
    head?.add(piece);
  } else if (outfit === "wreath" || outfit === "star-crown") {
    const crown = outfit === "star-crown";
    const ring = new T.Mesh(
      new T.TorusGeometry(0.19, crown ? 0.025 : 0.04, 6, 18),
      mat(crown ? "#e3bd56" : "#6f9c5f", crown ? { metalness: 0.5 } : {}),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.17;
    piece.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bit = new T.Mesh(
        crown ? new T.OctahedronGeometry(0.05, 0) : new T.SphereGeometry(0.045, 6, 5),
        mat(crown ? "#f4d673" : ["#f09ab4", "#f4cf5d", "#fff3e6"][i % 3], crown ? { metalness: 0.4, emissive: "#a8822a", emissiveIntensity: 0.25 } : {}),
      );
      bit.position.set(Math.cos(a) * 0.19, crown ? 0.24 : 0.19, Math.sin(a) * 0.19);
      piece.add(bit);
    }
    head?.add(piece);
  } else if (outfit === "festival-cape") {
    const cape = new T.Mesh(new T.BoxGeometry(0.5, 0.62, 0.04), mat("#c5573f"));
    cape.position.set(0, 1.12, -0.2);
    cape.rotation.x = 0.12;
    piece.add(cape);
    for (const x of [-0.12, 0.12]) {
      const stripe = new T.Mesh(new T.BoxGeometry(0.07, 0.62, 0.045), mat("#f3e3b5"));
      stripe.position.set(x, 1.12, -0.2);
      stripe.rotation.x = 0.12;
      piece.add(stripe);
    }
    const clasp = new T.Mesh(new T.TorusGeometry(0.16, 0.03, 5, 14, Math.PI), mat("#e3bd56", { metalness: 0.4 }));
    clasp.position.set(0, 1.42, -0.05);
    clasp.rotation.x = -Math.PI / 2;
    piece.add(clasp);
    model.add(piece);
  }
  return model;
}
export function TownScenery({ garden }: { garden: TownState["garden"] }) {
  const plants = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (plants.current) {
      const growth = garden
        ? Math.min(
            1,
            Math.max(
              0.2,
              (Date.now() - garden.plantedAt) /
                (garden.readyAt - garden.plantedAt),
            ),
          )
        : 0.04;
      plants.current.scale.y = growth;
      plants.current.rotation.z = settings.reduced
        ? 0
        : Math.sin(clock.elapsedTime * 1.4) * 0.025;
    }
  });
  return (
    <>
      <group name="village-market" position={[11, 0, 4.4]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[2.5, 1.3, 1.1]} />
          <meshStandardMaterial color="#897359" />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <boxGeometry args={[2.8, 0.13, 1.3]} />
          <meshStandardMaterial color="#e6d4ad" />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 1.55, -0.35]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 3.1, 6]} />
            <meshStandardMaterial color="#655d50" />
          </mesh>
        ))}
        {[-1, 0, 1].map((x, i) => (
          <mesh
            key={x}
            position={[x * 0.87, 2.9, 0]}
            rotation={[0.1, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.87, 0.13, 1.9]} />
            <meshStandardMaterial color={i % 2 ? "#e2d8b8" : "#719d8b"} />
          </mesh>
        ))}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
          <mesh key={x} position={[x, 1.58, 0.15]} castShadow>
            <dodecahedronGeometry args={[0.19, 0]} />
            <meshStandardMaterial color={i % 2 ? "#c9a17a" : "#bdd29a"} />
          </mesh>
        ))}
      </group>
      <group name="village-garden" position={[-9.6, 0, 11.8]}>
        <mesh position={[0, 0.09, 0]} receiveShadow>
          <boxGeometry args={[3.2, 0.18, 2.2]} />
          <meshStandardMaterial color="#796958" />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 1.65, 0.2, 0]} castShadow>
              <boxGeometry args={[0.15, 0.3, 2.5]} />
              <meshStandardMaterial color="#b8ab88" />
            </mesh>
            <mesh position={[0, 0.2, s * 1.2]} castShadow>
              <boxGeometry args={[3.4, 0.3, 0.15]} />
              <meshStandardMaterial color="#b8ab88" />
            </mesh>
          </group>
        ))}
        <group ref={plants} position={[0, 0.19, 0]}>
          {Array.from({ length: 6 }, (_, i) => (
            <group
              key={i}
              position={[((i % 3) - 1) * 0.9, 0, Math.floor(i / 3) * 0.8 - 0.4]}
            >
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.03, 0.05, 0.7, 5]} />
                <meshStandardMaterial color="#668f67" />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh
                  key={s}
                  position={[s * 0.14, 0.38, 0]}
                  rotation={[0, 0, s * 0.7]}
                >
                  <octahedronGeometry args={[0.23]} />
                  <meshStandardMaterial color="#a7c183" />
                </mesh>
              ))}
              <mesh position={[0, 0.74, 0]}>
                <dodecahedronGeometry args={[0.14]} />
                <meshStandardMaterial color="#edcf89" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </>
  );
}
