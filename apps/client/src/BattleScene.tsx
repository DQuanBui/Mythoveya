import { WildwoodEffect } from "./WildwoodEffects";
import { BattleArena } from "./BattleArena";
import { ChargeAura, Confetti, HitBurst, LandingDust, SupportGlow, SupportLink } from "./HitBurst";
import { skillPath } from "./skill-path";
import { StatusAura } from "./StatusAura";
import { ModelLighting } from "./ModelLighting";
import { rumble } from "./gamepad";
import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as T from "three";
import { byId } from "../../../packages/shared/content";
import type { Battle, Unit } from "../../../packages/shared/types";
import { type Motion } from "./models";
import { settings } from "./audio";
import { UltimateEffect } from "./UltimateEffects";
import { useContextRecovery } from "./context-recovery";
import { unitLabel } from "./battle-labels";
import { elementMultiplier, matchupWord } from "../../../packages/shared/elements";

import { Creature } from "./Scene";
// The battle stage: creatures, skills and effects for a Battle, loaded with the battle screens.
/** The selected target's ring: gold, or tinted by the next attacker's matchup. */
function targetRing(battle: Battle, u: Unit) {
  const actor = battle.units.find((x) => x.id === battle.queue[0]);
  if (!actor || actor.side === u.side) return "#f5d38a";
  const word = matchupWord(byId[actor.species].element, byId[u.species].element);
  return word === "strong" ? "#9fe6a0" : word === "resisted" ? "#f2b39a" : "#f5d38a";
}
/** "Strong!" or "Resisted" under a damage number, when elements decide it. */
function FloatWord({ attacker, target }: { attacker?: Unit; target: Unit }) {
  if (!attacker || attacker.side === target.side) return null;
  const word = matchupWord(byId[attacker.species].element, byId[target.species].element);
  return word ? <small className={`float-word ${word}`}>{word === "strong" ? "Strong!" : "Resisted"}</small> : null;
}
/** A yaw `k` of the way from `base` toward facing `to` from `from`, turning the short way. */
function turnToward(from: number[], to: number[], base: number, k: number) {
  const yaw = Math.atan2(to[0] - from[0], to[2] - from[2]);
  return base + Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base)) * k;
}
export function unitPosition(
  side: number,
  slot: number,
): [number, number, number] {
  // Two well-spaced rows per side, seen from behind your own team.
  return [
    ((slot % 3) - 1) * 2.9,
    0,
    (side === 0 ? 1 : -1) * (Math.floor(slot / 3) * 2.5 + 2.4),
  ];
}
function BattleCamera({
  battle,
  preview = false,
  phase,
}: {
  battle: Battle;
  preview?: boolean;
  phase?: number;
}) {
  const { camera, size } = useThree();
  const saved = useRef<{ pos: T.Vector3; look: T.Vector3 } | null>(null);
  const rumbled = useRef("");
  useFrame(() => {
    const cam = camera as T.PerspectiveCamera;
    const e = battle.event;
    const p = phase ?? (e ? (Date.now() - e.at) / e.duration : 2);
    const ultimate = e?.action.endsWith("-2");
    // Ultimates get a camera moment: a push in on the caster, then back out.
    if (!preview && ultimate && !settings.reduced && p >= 0 && p < 1) {
      const actor = battle.units.find((u) => u.id === e!.actor);
      if (actor) {
        if (!saved.current) saved.current = { pos: cam.position.clone(), look: new T.Vector3(0, 0, 1.2) };
        const at = new T.Vector3(...unitPosition(actor.side, actor.slot)),
          toward = actor.side === 0 ? -1 : 1,
          close = at.clone().add(new T.Vector3(2.6, 2.4, toward * 4.6)),
          ease = (v: number) => v * v * (3 - 2 * v),
          k = p < 0.25 ? ease(p / 0.25) : p > 0.7 ? ease(Math.max(0, (1 - p) / 0.3)) : 1;
        cam.position.lerpVectors(saved.current.pos, close, k);
        cam.lookAt(new T.Vector3().lerpVectors(saved.current.look, at.add(new T.Vector3(0, 0.9, 0)), k));
      }
    } else if (saved.current) {
      cam.position.copy(saved.current.pos);
      cam.lookAt(saved.current.look);
      saved.current = null;
    }
    const amount =
      !settings.reduced && ultimate && p >= 0 && p < 1
        ? Math.sin(p * Math.PI) *
          (2 +
            (byId[battle.units.find((u) => u.id === e!.actor)!.species].index %
              3))
        : 0;
    // Portrait screens widen the view so both teams' outer columns fit.
    const base = preview ? 38 : 42,
      aspect = size.width / size.height,
      fit =
        aspect < 1
          ? Math.min(78, (2 * Math.atan(Math.tan((base * Math.PI) / 360) * 0.62 / aspect) * 180) / Math.PI)
          : base;
    cam.fov = Math.max(base, fit) - amount;
    // A knock-out lands with a short jolt as the creature topples.
    const knockout = !preview && !!e && p > 0.78 && p < 0.9 && e.amounts.some((a) => a.amount > 0 && battle.units.find((u) => u.id === a.id)?.hp === 0);
    // A controller buzzes with the jolts: ultimates hit hard, knock-outs thud.
    const jolt = !preview && settings.shake && !settings.reduced && e ? (ultimate && p > 0.43 && p < 0.57 ? "ultimate" : knockout ? "knockout" : "") : "";
    if (jolt && rumbled.current !== `${e!.id}-${jolt}`) {
      rumbled.current = `${e!.id}-${jolt}`;
      rumble(jolt === "ultimate" ? 0.9 : 0.5, jolt === "ultimate" ? 260 : 140);
    }
    cam.setViewOffset(
      size.width,
      size.height,
      settings.shake && !settings.reduced && p > 0.43 && p < 0.57
        ? Math.sin(p * 100) * 2
        : settings.shake && !settings.reduced && knockout
          ? Math.sin(p * 160) * 3 * (0.9 - p) * 8
          : 0,
      0,
      size.width,
      size.height,
    );
    cam.updateProjectionMatrix();
  });
  return null;
}
const TRAIL = 7;
function SkillEffect({ battle, phase }: { battle: Battle; phase?: number }) {
  const ref = useRef<T.Group>(null),
    trail = useRef<T.InstancedMesh>(null),
    dot = useMemo(() => new T.Object3D(), []);
  useFrame(() => {
    if (!ref.current || !battle.event) return;
    const p = phase ?? (Date.now() - battle.event.at) / battle.event.duration;
    ref.current.visible = p >= 0 && p < 1;
    if (trail.current) trail.current.visible = ref.current.visible && p < 0.55 && settings.quality !== "Low";
    if (p >= 1) return;
    const actor = battle.units.find((u) => u.id === battle.event!.actor)!,
      target = battle.units.find((u) => u.id === battle.event!.target)!;
    const from = new T.Vector3(...unitPosition(actor.side, actor.slot)).add(
        new T.Vector3(0, 1, 0),
      ),
      to = new T.Vector3(...unitPosition(target.side, target.slot)).add(
        new T.Vector3(0, 0.6, 0),
      );
    const element = byId[actor.species].element,
      k = Math.min(1, p * 2);
    // Each element travels its own path, leaving a fading trail behind it.
    skillPath(settings.reduced ? "" : element, from, to, k, ref.current.position);
    if (trail.current?.visible) {
      for (let i = 0; i < TRAIL; i++) {
        skillPath(settings.reduced ? "" : element, from, to, Math.max(0, k - (i + 1) * 0.035), dot.position);
        dot.scale.setScalar((1 - i / TRAIL) * Math.min(1, k * 6));
        dot.updateMatrix();
        trail.current.setMatrixAt(i, dot.matrix);
      }
      trail.current.instanceMatrix.needsUpdate = true;
    }
    ref.current.rotation.y = settings.reduced ? 0 : p * 5;
    const scale = p < 0.5 ? 0.25 + p : 1 + Math.sin((p - 0.5) * Math.PI) * 1.5;
    ref.current.scale.setScalar(settings.reduced ? 0.8 : scale);
    ref.current.children.forEach((m, i) => {
      if (m instanceof T.Mesh && !settings.reduced) m.rotation.z = p * (i % 2 ? 1 : -1) * 6;
    });
  });
  const e = battle.event;
  if (!e) return null;
  const s = byId[battle.units.find((u) => u.id === e.actor)!.species],
    ult = e.action.endsWith("-2"),
    v = s.index % 10;
  return (
    <>
    <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[0.13, 8, 6]} />
      <meshBasicMaterial color={s.color} transparent opacity={0.45} depthWrite={false} blending={T.AdditiveBlending} />
    </instancedMesh>
    <group ref={ref} name="skill-effect">
      {!e.action.endsWith("-0") && <WildwoodEffect id={s.id} />}
      {ult && s.tier === "S" && (
        <UltimateEffect
          id={s.id}
          at={e.at}
          duration={e.duration}
          phase={phase}
        />
      )}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.055, 6, 32]} />
        <meshBasicMaterial color={s.color} transparent opacity={0.75} />
      </mesh>
      {Array.from(
        { length: settings.quality === "Low" ? 4 : ult ? 14 : 8 },
        (_, i) => {
          const a = i * 2.399;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(a) * 0.6,
                Math.sin(a * 2) * 0.35,
                Math.sin(a) * 0.6,
              ]}
              rotation={[i, a, 0]}
            >
              {s.element === "Stone" || s.element === "Frost" ? (
                <octahedronGeometry args={[0.18, 0]} />
              ) : s.element === "Grove" ? (
                <coneGeometry args={[0.1, 0.5, 4]} />
              ) : s.element === "Storm" ? (
                <boxGeometry args={[0.035, 0.8, 0.035]} />
              ) : (
                <sphereGeometry args={[0.09, 6, 4]} />
              )}
              <meshBasicMaterial color={s.color} />
            </mesh>
          );
        },
      )}
      {ult &&
        s.tier === "S" &&
        Array.from({ length: 3 + (v % 4) }, (_, i) => (
          <mesh
            key={`u${i}`}
            position={[0, i * 0.3, 0]}
            rotation={[v * 0.2, i * 0.6, Math.PI / 2]}
          >
            <torusGeometry
              args={[0.7 + i * 0.25, 0.035 + (v % 3) * 0.02, 5, 32]}
            />
            <meshBasicMaterial
              color={i % 2 ? s.color : "#fff1bd"}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
    </group>
    </>
  );
}
export function BattleScene({
  battle: sourceBattle,
  target,
  onTarget,
  preview = false,
  paused = false,
  previewPhase = 0.55,
  side = 0,
}: {
  battle: Battle;
  target: string;
  onTarget: (id: string) => void;
  preview?: boolean;
  paused?: boolean;
  previewPhase?: number;
  /** The viewer's team, which gets confetti when it wins. */
  side?: number;
}) {
  const recover = useContextRecovery("battle");
  const [, tick] = useState(0);
  // When a battle opens, each side's creatures drop onto their rings in turn.
  const opened = useMemo(() => Date.now(), [sourceBattle.id]);
  const phase = useRef(0);
  useEffect(() => {
    phase.current = 0;
  }, [sourceBattle.event?.at]);
  useEffect(() => {
    let previous = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      if (!paused) phase.current += now - previous;
      previous = now;
      tick((x) => x + 1);
    }, 50);
    return () => clearInterval(t);
  }, [paused]);
  const battle =
    preview && sourceBattle.event
      ? {
          ...sourceBattle,
          event: {
            ...sourceBattle.event,
            at:
              Date.now() -
              (paused
                ? previewPhase * sourceBattle.event.duration
                : phase.current % (sourceBattle.event.duration + 650)),
          },
          units: sourceBattle.units
            .filter(
              (u) => u.id === "0:0" || u.id === sourceBattle.event?.target,
            )
            .map((u) => ({ ...u, slot: 1 })),
        }
      : sourceBattle;
  return (
    <Canvas
      key={recover.key}
      onCreated={recover.onCreated}
      shadows
      camera={{ position: preview ? [7, 6, 10] : [0, 13.5, 17.5], fov: 42 }}
      dpr={[1, 1.5]}
    >
      <BattleCamera
        battle={battle}
        preview={preview}
        phase={preview && paused ? previewPhase : undefined}
      />
      <BattleArena theme={battle.arena} />
      <ModelLighting intensity={0.55} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[-6, 14, 8]}
        intensity={2.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {battle.units.map((u) => {
        // During an ultimate the camera is close, so the bars step aside.
        const cinematic =
          !preview &&
          !settings.reduced &&
          !!battle.event?.action.endsWith("-2") &&
          Date.now() - battle.event.at < battle.event.duration;
        const p = unitPosition(u.side, u.slot),
          event = battle.event,
          elapsed =
            preview && paused
              ? previewPhase
              : event
                ? (Date.now() - event.at) / event.duration
                : 2,
          active = elapsed < 1;
        const outcome =
          event?.amounts
            .filter((a) => a.id === u.id)
            .reduce((sum, a) => sum + a.amount, 0) || 0;
        const shielded = !!event?.amounts.some((a) => a.id === u.id && a.shield > 0);
        const shownHp =
          active && elapsed < 0.45
            ? Math.max(0, Math.min(u.maxHp, u.hp + outcome))
            : u.hp;
        // An attacker turns to face its target through the strike.
        const base = u.side === 0 ? Math.PI : 0,
          aim = !preview && active && event?.actor === u.id && event.target !== u.id ? battle.units.find((x) => x.id === event.target) : undefined,
          facing = aim
            ? turnToward(p, unitPosition(aim.side, aim.slot), base, Math.sin(Math.min(1, elapsed) * Math.PI))
            : // Winners turn round to celebrate toward the camera.
              !preview && battle.winner === u.side && !active && shownHp > 0
              ? turnToward(p, [0, 0, 17.5], base, Math.min(1, Math.max(0, (elapsed - 1) / 0.6)))
              : base;
        const arrive = (Date.now() - opened - (u.side * 3 + (u.slot % 3)) * 110 - Math.floor(u.slot / 3) * 60) / 650;
        const state: Motion =
          !preview && !active && arrive < 1 && shownHp > 0
            ? "entrance"
            : shownHp === 0
            ? "defeat"
            : active && event?.actor === u.id
              ? event.action.endsWith("-2")
                ? "ultimate"
                : event.action.endsWith("-1")
                  ? "cast"
                  : "attack"
              : active &&
                  elapsed >= 0.45 &&
                  event?.amounts.some((a) => a.id === u.id && a.amount > 0)
                ? "hit"
                : battle.winner === u.side && !active
                  ? "victory"
                  : u.statuses.some((s) => s.kind === "stun")
                    ? "stunned"
                    : shownHp < u.maxHp * 0.25 && battle.winner === null
                      ? "weary"
                      : "idle";
        return (
          <group key={u.id} position={p} onClick={() => onTarget(u.id)}>
            <Creature
              id={u.species}
              shimmer={u.shimmer}
              rotation={facing}
              state={state}
              // Creatures knocked out earlier stay down through later turns.
              phase={state === "entrance" ? Math.max(0.001, arrive) : state === "defeat" && !event?.amounts.some((a) => a.id === u.id) ? 2 : elapsed}
              scale={0.92}
            />
            {active && event && !preview && outcome > 0 && event.actor !== u.id && (
              <HitBurst
                key={event.at}
                at={event.at}
                duration={event.duration}
                element={byId[battle.units.find((x) => x.id === event.actor)?.species || u.species].element}
                height={0.8 * byId[u.species].size}
                strong={elementMultiplier(byId[battle.units.find((x) => x.id === event.actor)?.species || u.species].element, byId[u.species].element) > 1}
              />
            )}
            {/* Dust where this creature topples, if this event knocked it out. */}
            {event && !preview && shownHp === 0 && elapsed < 1.5 && event.amounts.some((a) => a.id === u.id && a.amount > 0) && (
              // The topple lands about 78% of the way through the event.
              <LandingDust key={`k${event.at}`} start={event.at + event.duration * 0.78} length={event.duration * 0.6} size={byId[u.species].size} />
            )}
            {/* A small puff as the creature lands on its ring when the battle opens. */}
            {!preview && arrive > 0.5 && arrive < 2 && (
              <LandingDust key={`land${opened}`} start={opened + ((u.side * 3 + (u.slot % 3)) * 110 + Math.floor(u.slot / 3) * 60) + 0.72 * 650} length={500} size={byId[u.species].size * 0.7} />
            )}
            {active && event && !preview && event.actor === u.id && event.action.endsWith("-2") && (
              <ChargeAura key={`c${event.at}`} at={event.at} duration={event.duration} element={byId[u.species].element} height={0.8 * byId[u.species].size} />
            )}
            {!preview && shownHp > 0 && <StatusAura kinds={u.statuses.map((x) => x.kind)} height={0.8 * byId[u.species].size} />}
            {active && event && !preview && (outcome < 0 || shielded) && (
              <SupportGlow
                key={`s${event.at}`}
                at={event.at}
                duration={event.duration}
                heal={outcome < 0}
                shield={shielded}
                height={0.8 * byId[u.species].size}
              />
            )}
            {/* The creature about to act breathes its ring in and out. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} scale={battle.queue[0] === u.id ? 1.15 + (settings.reduced || battle.winner !== null ? 0 : Math.sin(Date.now() / 190) * 0.06) : 1}>
              <ringGeometry args={[0.65, battle.queue[0] === u.id ? 0.8 : 0.72, 32]} />
              <meshBasicMaterial
                color={
                  target === u.id
                    ? targetRing(battle, u)
                    : battle.queue[0] === u.id
                      ? "#81f8dc"
                      : u.side === 0
                        ? "#83b8ac"
                        : "#bc8986"
                }
              />
            </mesh>
            {!preview && !cinematic && (
              <Html
                position={[0, 1.75 * byId[u.species].size + 0.45, 0]}
                center
                distanceFactor={15}
                zIndexRange={[3, 0]}
              >
                {/* A slim health bar; the name shows for the acting or targeted unit and on hover. */}
                <button
                  className={`unit-bar side-${u.side} ${target === u.id ? "selected" : ""} ${battle.queue[0] === u.id ? "acting" : ""} ${shownHp === 0 ? "down" : shownHp < u.maxHp * 0.25 ? "low" : ""}`}
                  onClick={() => onTarget(u.id)}
                  aria-label={unitLabel(byId[u.species].name, shownHp, u.maxHp, u.shield, u.statuses)}
                >
                  <strong>{byId[u.species].name}</strong>
                  <span className="hp">
                    {/* A pale trail lingers where health was lost, then drains away. */}
                    <em className="trail" style={{ width: `${(shownHp / u.maxHp) * 100}%` }} />
                    <i style={{ width: `${(shownHp / u.maxHp) * 100}%` }} />
                    {u.shield > 0 && (
                      <b style={{ width: `${Math.min(100, (u.shield / u.maxHp) * 100)}%` }} />
                    )}
                  </span>
                  <small>
                    {shownHp}/{u.maxHp}
                    {u.shield > 0 ? ` · ◇${u.shield}` : ""}
                  </small>
                  {u.statuses.length > 0 && (
                    <span className="statuses">
                      {u.statuses.map((s) => (
                        <abbr key={s.kind} title={`${s.kind}: ${s.turns} round(s)`}>
                          {s.kind.slice(0, 3)} {s.turns}
                        </abbr>
                      ))}
                    </span>
                  )}
                </button>
              </Html>
            )}
            {!preview &&
              active &&
              elapsed > 0.42 &&
              event?.amounts
                .filter((a) => a.id === u.id && (a.amount !== 0 || a.shield > 0))
                .map((a) => (
                  <Html key={`${event.at}-${a.id}`} position={[0, 1.75 * byId[u.species].size + 1.1, 0]} center zIndexRange={[4, 0]}>
                    <span
                      className={`float-number ${a.amount > 0 ? "damage" : a.amount < 0 ? "healing" : "shield"} ${event.action.endsWith("-2") ? "big" : ""}`}
                    >
                      {a.amount > 0 ? a.amount : a.amount < 0 ? `+${-a.amount}` : `◇${a.shield}`}
                      {a.amount > 0 && <FloatWord attacker={battle.units.find((x) => x.id === event.actor)} target={u} />}
                    </span>
                  </Html>
                ))}
          </group>
        );
      })}
      <SkillEffect
        battle={battle}
        phase={preview && paused ? previewPhase : undefined}
      />
      {/* Links from a supporting caster to each ally it heals or shields. */}
      {!preview && battle.event && Date.now() - battle.event.at < battle.event.duration && (() => {
        const e = battle.event!,
          actor = battle.units.find((u) => u.id === e.actor);
        if (!actor) return null;
        return e.amounts
          .filter((a) => a.id !== actor.id && (a.amount < 0 || a.shield > 0))
          .map((a) => battle.units.find((u) => u.id === a.id))
          .filter((u) => u && u.side === actor.side)
          .map((u) => (
            <SupportLink
              key={`${e.at}:${u!.id}`}
              from={unitPosition(actor.side, actor.slot)}
              to={unitPosition(u!.side, u!.slot)}
              at={e.at}
              duration={e.duration}
              color={e.amounts.some((x) => x.id === u!.id && x.amount < 0) ? "#7dffa0" : "#9fdcff"}
            />
          ));
      })()}
      {/* Once the winning blow has landed, confetti rains on the viewer's team. */}
      {!preview && battle.winner === side && (!battle.event || Date.now() - battle.event.at > battle.event.duration) && (
        <Confetti key={battle.id} center={unitPosition(side, 1).map((v, i) => (i === 1 ? 1.4 : v)) as [number, number, number]} />
      )}
      <OrbitControls
        target={[0, 0, preview ? 0 : 1.2]}
        enablePan={false}
        minDistance={preview ? 7 : 15}
        maxDistance={25}
        minPolarAngle={0.5}
        maxPolarAngle={1.1}
      />
    </Canvas>
  );
}
