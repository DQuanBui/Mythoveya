import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";
import { daylight, islandHour } from "./daytime";
import { setNightGlow, worldFocus } from "./village-materials";
import { seeded } from "../../../packages/shared/haven";

const NIGHT_SKY = new T.Color("#22314d"),
  NIGHT_FOG = new T.Color("#2a3b57"),
  DUSK = new T.Color("#e2a487"),
  SUN = new T.Color("#fff0ce"),
  MOON = new T.Color("#a9bce8"),
  WARM_SUN = new T.Color("#ffb27a"),
  HEMI_DAY = new T.Color("#f4ead1"),
  HEMI_NIGHT = new T.Color("#5d6f9c"),
  GROUND_DAY = new T.Color("#3e6f69"),
  GROUND_NIGHT = new T.Color("#1f3436");
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sun, moon, sky and fog for the exploration world, following the keeper. */
export function DayNight({
  sky,
  fog,
  haven,
}: {
  sky: string;
  fog: string;
  haven: boolean;
}) {
  const { scene } = useThree();
  const sun = useRef<T.DirectionalLight>(null),
    ambient = useRef<T.AmbientLight>(null),
    hemi = useRef<T.HemisphereLight>(null),
    lights = useRef<T.Group>(null),
    last = useRef(-1),
    named = useRef<{ stars?: T.Object3D; orb?: T.Mesh } | null>(null);
  // Point lights cost every lit pixel, so they exist only after dark.
  const [night, setNight] = useState(false);
  const daySky = useMemo(() => new T.Color(sky), [sky]),
    dayFog = useMemo(() => new T.Color(fog), [fog]),
    c = useMemo(() => new T.Color(), []),
    dir = useMemo(() => new T.Vector3(), []);
  useEffect(() => {
    if (sun.current) scene.add(sun.current.target);
    return () => {
      if (sun.current) scene.remove(sun.current.target);
    };
  }, [scene]);
  useFrame(({ clock }) => {
    const light = sun.current;
    if (!light || !ambient.current || !hemi.current) return;
    // Keep the shadow camera centered on the keeper, snapped to avoid shimmer.
    const fx = Math.round(worldFocus.x * 2) / 2,
      fz = Math.round(worldFocus.z * 2) / 2;
    const { angle, day, twilight, glow } = daylight(islandHour());
    if (day > 0.02)
      dir.set(-Math.cos(angle) * 0.85 - 0.25, Math.max(0.12, Math.sin(angle)) * 1.1 + 0.12, 0.38);
    else dir.set(0.35, 0.95, -0.3);
    dir.normalize();
    light.position.set(fx + dir.x * 30, dir.y * 30, fz + dir.z * 30);
    light.target.position.set(fx, 0, fz);
    light.target.updateMatrixWorld();
    // Colors only need a refresh a few times per second.
    if (Math.abs(clock.elapsedTime - last.current) < 0.25) return;
    last.current = clock.elapsedTime;
    const warm = twilight * 0.65;
    light.intensity = day > 0.02 ? lerp(0.6, 2.4, day) : 0.55;
    light.color.copy(day > 0.02 ? SUN : MOON).lerp(WARM_SUN, day > 0.02 ? warm : 0);
    ambient.current.intensity = lerp(0.55, 1.1, day);
    scene.environmentIntensity = lerp(0.08, 0.35, day);
    hemi.current.intensity = lerp(0.8, 1.6, day);
    hemi.current.color.copy(HEMI_NIGHT).lerp(HEMI_DAY, day).lerp(DUSK, warm * 0.4);
    hemi.current.groundColor.copy(GROUND_NIGHT).lerp(GROUND_DAY, day);
    if (scene.background instanceof T.Color)
      scene.background.copy(c.copy(NIGHT_SKY).lerp(daySky, day).lerp(DUSK, warm * 0.55));
    if (scene.fog) scene.fog.color.copy(c.copy(NIGHT_FOG).lerp(dayFog, day).lerp(DUSK, warm * 0.5));
    setNightGlow(glow);
    named.current ||= {
      stars: scene.getObjectByName("night-stars"),
      orb: scene.getObjectByName("sky-orb") as T.Mesh | undefined,
    };
    const { stars, orb } = named.current;
    if (stars) stars.visible = glow > 0.3;
    if (orb) (orb.material as T.MeshBasicMaterial).color.set(glow > 0.6 ? "#e4ebf6" : "#f6e6bb");
    if (glow > 0.35 !== night) setNight(glow > 0.35);
    lights.current?.children.forEach((l, i) => {
      (l as T.PointLight).intensity = glow * (i === 2 ? (haven ? 14 : 0) : 9);
    });
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={1.1} />
      <hemisphereLight ref={hemi} args={["#f4ead1", "#3e6f69", 1.6]} />
      <directionalLight
        ref={sun}
        position={[-9, 18, 8]}
        color="#fff0ce"
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-far={80}
        shadow-bias={-0.001}
      />
      {night && (
        <group ref={lights} name="night-lights">
          <pointLight position={[0, 2.6, 8.7]} color="#ffcf87" distance={11} decay={1.6} intensity={0} />
          <pointLight position={[11, 2.4, 6]} color="#ffcf87" distance={9} decay={1.6} intensity={0} />
          <pointLight position={[3.5, 1.3, 29.5]} color="#ff9f4a" distance={12} decay={1.5} intensity={0} />
        </group>
      )}
      <Fireflies haven={haven} />
    </>
  );
}

// A soft round sprite so fireflies glow instead of drawing square points.
function glowDot() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const g = canvas.getContext("2d")!,
    gradient = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.75)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 32, 32);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
function Fireflies({ haven }: { haven: boolean }) {
  const count = settings.quality === "Low" ? 50 : 120;
  const { points, base } = useMemo(() => {
    const random = seeded(77),
      centers = haven
        ? [
            [8, 26, 7],
            [21, -5, 10],
            [-29, -6, 7],
            [-22, 22, 7],
            [0, 8, 9],
            [3.5, 29.5, 4],
          ]
        : [[0, 0, 15]],
      base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const [cx, cz, r] = centers[i % centers.length],
        a = random() * Math.PI * 2,
        d = Math.sqrt(random()) * r;
      base.set([cx + Math.cos(a) * d, 0.4 + random() * 1.8, cz + Math.sin(a) * d], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(base.slice(), 3));
    const points = new T.Points(
      geo,
      new T.PointsMaterial({
        color: "#f4f08c",
        size: 0.13,
        map: glowDot(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    points.name = "fireflies";
    points.frustumCulled = false;
    return { points, base };
  }, [count, haven]);
  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as T.PointsMaterial).map?.dispose();
      (points.material as T.Material).dispose();
    },
    [points],
  );
  useFrame(({ clock }) => {
    const glow = daylight(islandHour()).glow,
      material = points.material as T.PointsMaterial;
    points.visible = glow > 0.05;
    if (!points.visible) return;
    material.opacity = glow * (0.65 + Math.sin(clock.elapsedTime * 3) * 0.2);
    if (settings.reduced) return;
    const attr = points.geometry.attributes.position as T.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const t = clock.elapsedTime * 0.5 + i * 1.7;
      attr.setXYZ(
        i,
        base[i * 3] + Math.sin(t) * 0.6,
        base[i * 3 + 1] + Math.sin(t * 1.3) * 0.25,
        base[i * 3 + 2] + Math.cos(t * 0.8) * 0.6,
      );
    }
    attr.needsUpdate = true;
  });
  return <primitive object={points} />;
}

/** Cloud banks drifting around the floating island, plus a few birds. */
export function SkyLife({ radius = 52 }: { radius?: number }) {
  const ring = useRef<T.Group>(null),
    birds = useRef<T.Group>(null);
  const clouds = useMemo(() => {
    const random = seeded(4242),
      total = settings.quality === "Low" ? 16 : 30,
      puffs = 5,
      mesh = new T.InstancedMesh(
        new T.IcosahedronGeometry(1, settings.quality === "High" ? 1 : 0),
        new T.MeshStandardMaterial({
          color: "#fbfaf4",
          flatShading: true,
          roughness: 1,
          emissive: "#dfe7ef",
          emissiveIntensity: 0.18,
        }),
        total * puffs,
      ),
      o = new T.Object3D();
    for (let c = 0; c < total; c++) {
      const a = (c / total) * Math.PI * 2 + random() * 0.2,
        r = radius + random() * radius * 0.5,
        y = c % 3 === 0 ? 7 + random() * 8 : -10 + random() * 9,
        size = 2.2 + random() * 2.6;
      for (let p = 0; p < puffs; p++) {
        o.position.set(
          Math.cos(a) * r + (p - 2) * size * 0.75,
          y + Math.sin(p * 1.3) * size * 0.25,
          Math.sin(a) * r + (random() - 0.5) * size,
        );
        o.scale.set(size * (1 - Math.abs(p - 2) * 0.18), size * 0.62, size * 0.8);
        o.updateMatrix();
        mesh.setMatrixAt(c * puffs + p, o.matrix);
      }
    }
    mesh.name = "sky-clouds";
    mesh.computeBoundingSphere();
    return mesh;
  }, [radius]);
  useEffect(
    () => () => {
      clouds.geometry.dispose();
      (clouds.material as T.Material).dispose();
      clouds.dispose();
    },
    [clouds],
  );
  useFrame(({ clock }, dt) => {
    if (settings.reduced) return;
    if (ring.current) ring.current.rotation.y += Math.min(dt, 0.05) * 0.006;
    const night = daylight(islandHour()).glow;
    if (birds.current) {
      birds.current.visible = night < 0.5;
      birds.current.children.forEach((b, i) => {
        const t = clock.elapsedTime * (0.16 + (i % 3) * 0.02) + i * 1.1,
          r = 16 + (i % 3) * 5;
        b.position.set(Math.cos(t) * r, 13 + (i % 2) * 3 + Math.sin(t * 2) * 0.6, 5 + Math.sin(t) * r);
        b.rotation.y = -t;
        b.children.forEach((w, j) => {
          w.rotation.z = (j ? -1 : 1) * (0.2 + Math.sin(clock.elapsedTime * 7 + i) * 0.45);
        });
      });
    }
  });
  return (
    <>
      <group ref={ring}>
        <primitive object={clouds} />
      </group>
      <group ref={birds} name="sky-birds">
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i}>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * 0.32, 0, 0]}>
                  <boxGeometry args={[0.62, 0.03, 0.2]} />
                  <meshBasicMaterial color="#4b5b5f" />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>
    </>
  );
}
