import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { regionWeather, weatherAt, type Weather } from "../../../packages/shared/weather";
import { audio, settings } from "./audio";
import { worldFocus } from "./village-materials";

/** Smoothly blended weather amounts shared by lighting, effects and audio. */
export const weatherFx = { rain: 0, mist: 0, snow: false };
export function currentWeather(region: string, now = Date.now()): Weather {
  const pinned = (globalThis as { __weather?: Weather }).__weather;
  if (import.meta.env.DEV && pinned) return pinned;
  return regionWeather(weatherAt(now).weather, region);
}
function softDot() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!,
    gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

export function WeatherEffects({ region, ground }: { region: string; ground?: (x: number, z: number) => number }) {
  const snow = region === "hollow";
  const drops = settings.quality === "Low" ? 500 : settings.quality === "High" ? 1800 : 1100;
  const rain = useMemo(() => {
    const seeds = new Float32Array(drops * 3);
    for (let i = 0; i < drops; i++)
      seeds.set([Math.random() * 36 - 18, Math.random() * 18, Math.random() * 36 - 18], i * 3);
    // Thin instanced streaks: WebGL lines are always one pixel wide.
    const line = new T.InstancedMesh(
      new T.BoxGeometry(0.022, 0.75, 0.022),
      new T.MeshBasicMaterial({ color: "#dcecf2", transparent: true, opacity: 0, depthWrite: false }),
      drops,
    );
    line.frustumCulled = false;
    line.name = "weather-rain";
    const flakes = new T.Points(
      new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(new Float32Array(drops * 3), 3)),
      new T.PointsMaterial({ color: "#ffffff", size: 0.12, map: softDot(), transparent: true, opacity: 0, depthWrite: false }),
    );
    flakes.frustumCulled = false;
    flakes.name = "weather-snow";
    return { line, flakes, seeds };
  }, [drops]);
  const splashes = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.RingGeometry(0.06, 0.1, 12).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({ color: "#e6f4f6", transparent: true, opacity: 0.5, depthWrite: false }),
      48,
    );
    m.frustumCulled = false;
    m.name = "weather-splashes";
    return m;
  }, []);
  // Each splash's ground height, looked up once per drop rather than every frame.
  const splashY = useMemo(() => ({ cycle: new Float64Array(48).fill(-1), y: new Float32Array(48) }), []);
  const mist = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: softDot(), color: "#eef3f1", transparent: true, opacity: 0, depthWrite: false }),
      settings.quality === "Low" ? 8 : 16,
    );
    m.frustumCulled = false;
    m.name = "weather-mist";
    return m;
  }, []);
  useEffect(
    () => () => {
      for (const o of [rain.line, rain.flakes, splashes, mist]) {
        o.geometry.dispose();
        const mat = o.material as T.Material & { map?: T.Texture };
        mat.map?.dispose();
        mat.dispose();
      }
    },
    [rain, splashes, mist],
  );
  const o = useMemo(() => new T.Object3D(), []);
  // Thunderstorms: in full rain, lightning lights the scene now and then and
  // thunder rolls in a moment later. Reduced Motion keeps the thunder only.
  const flash = useRef<T.AmbientLight>(null),
    bolt = useRef({ next: 8 + Math.random() * 10, at: -10 });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      b = bolt.current,
      storm = !snow && weatherFx.rain > 0.75;
    if (storm && t > b.next) {
      b.at = t;
      b.next = t + 14 + Math.random() * 22;
      setTimeout(() => audio.thunder(), 500 + Math.random() * 1500);
    }
    if (!storm) b.next = Math.max(b.next, t + 6);
    if (flash.current) {
      const since = t - b.at;
      // Two quick pulses, the second a little brighter, gone in a quarter second.
      flash.current.intensity =
        settings.reduced || since > 0.26 ? 0 : since < 0.07 ? 1.6 : since < 0.12 ? 0.2 : 2.4 * (1 - (since - 0.12) / 0.14);
    }
  });
  useFrame(({ clock, camera }, delta) => {
    // Blend on real elapsed time so slow frames don't stall the transition.
    const dt = Math.min(delta, 1);
    // Ease toward the current weather, and start turning early as a spell ends.
    const w = currentWeather(region),
      spell = weatherAt(),
      upcoming = spell.into > 0.94 ? regionWeather(spell.next, region) : w,
      blend = spell.into > 0.94 ? (spell.into - 0.94) / 0.06 : 0;
    const want = (k: Weather) => (w === k ? 1 - blend : 0) + (upcoming === k ? blend : 0);
    const ease = 1 - Math.exp(-dt / 4);
    weatherFx.rain += (want("rain") - weatherFx.rain) * ease;
    weatherFx.mist += (want("mist") - weatherFx.mist) * ease;
    weatherFx.snow = snow;
    const time = clock.elapsedTime,
      calm = settings.reduced,
      fx = worldFocus,
      r = weatherFx.rain;
    // Rain streaks (or snowflakes) live in a box that follows the keeper.
    const active = r > 0.02;
    rain.line.visible = active && !snow;
    rain.flakes.visible = active && snow;
    if (active) {
      const count = Math.floor(drops * Math.min(1, r * 1.1)),
        fall = snow ? 1.4 : calm ? 9 : 17,
        s = rain.seeds;
      if (snow) {
        const attr = rain.flakes.geometry.attributes.position as T.BufferAttribute,
          arr = attr.array as Float32Array;
        for (let i = 0; i < drops; i++) {
          const y = i < count ? 18 - ((s[i * 3 + 1] + time * fall) % 18) : -50;
          arr.set([fx.x + s[i * 3] + Math.sin(time * 0.7 + i) * 0.6, y, fx.z + s[i * 3 + 2]], i * 3);
        }
        attr.needsUpdate = true;
        (rain.flakes.material as T.PointsMaterial).opacity = 0.85 * r;
      } else {
        o.rotation.set(0, 0, 0.08);
        o.scale.setScalar(1);
        for (let i = 0; i < drops; i++) {
          const y = i < count ? 18 - ((s[i * 3 + 1] + time * fall) % 18) : -50;
          o.position.set(fx.x + s[i * 3] + y * 0.08, y, fx.z + s[i * 3 + 2]);
          o.updateMatrix();
          rain.line.setMatrixAt(i, o.matrix);
        }
        rain.line.instanceMatrix.needsUpdate = true;
        (rain.line.material as T.MeshBasicMaterial).opacity = 0.5 * r;
      }
    }
    splashes.visible = active && !snow && !calm;
    if (splashes.visible) {
      for (let i = 0; i < splashes.count; i++) {
        const p = (time * 1.6 + i * 0.37) % 1,
          cycle = Math.floor(time * 1.6 + i * 0.37),
          a = i * 2.39996 + cycle * 1.7,
          d = 1.5 + ((i * 7.3) % 9),
          x = fx.x + Math.cos(a) * d,
          z = fx.z + Math.sin(a) * d;
        // Splashes land on the terrain, so they show on hills and slopes too.
        if (splashY.cycle[i] !== cycle) {
          splashY.cycle[i] = cycle;
          splashY.y[i] = ground ? ground(x, z) : 0;
        }
        o.position.set(x, splashY.y[i] + 0.04, z);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(0.4 + p * 2.2);
        o.updateMatrix();
        splashes.setMatrixAt(i, o.matrix);
      }
      splashes.instanceMatrix.needsUpdate = true;
      (splashes.material as T.MeshBasicMaterial).opacity = 0.45 * r;
    }
    // Low drifting mist sheets always face the camera.
    const m = weatherFx.mist;
    mist.visible = m > 0.02;
    if (mist.visible) {
      for (let i = 0; i < mist.count; i++) {
        const a = (i / mist.count) * Math.PI * 2 + (calm ? 0 : time * 0.02),
          d = 6 + (i % 4) * 4;
        o.position.set(fx.x + Math.cos(a) * d, 0.9 + (i % 3) * 0.6, fx.z + Math.sin(a) * d);
        o.quaternion.copy(camera.quaternion);
        o.scale.set(11 + (i % 3) * 4, 4.2, 1);
        o.updateMatrix();
        mist.setMatrixAt(i, o.matrix);
      }
      mist.instanceMatrix.needsUpdate = true;
      (mist.material as T.MeshBasicMaterial).opacity = 0.3 * m;
    }
  });
  return (
    <>
      <primitive object={rain.line} />
      <primitive object={rain.flakes} />
      <primitive object={splashes} />
      <primitive object={mist} />
      <ambientLight ref={flash} color="#dfe9ff" intensity={0} />
    </>
  );
}
