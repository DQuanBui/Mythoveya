import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { regionWeather, weatherAt, type Weather } from "../../../packages/shared/weather";
import { settings } from "./audio";
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

export function WeatherEffects({ region }: { region: string }) {
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
          a = i * 2.39996 + Math.floor(time * 1.6 + i * 0.37) * 1.7,
          d = 1.5 + ((i * 7.3) % 9);
        o.position.set(fx.x + Math.cos(a) * d, 0.04, fx.z + Math.sin(a) * d);
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
    </>
  );
}
