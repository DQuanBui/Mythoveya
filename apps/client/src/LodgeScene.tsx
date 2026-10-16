import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Profile } from "../../../packages/shared/types";
import { byId } from "../../../packages/shared/content";
import {
  ROOM_SPAWN,
  ROOM_STATIONS,
  roomWalkable,
  lodgeRecord,
  lodgeCount,
  lodgeOf,
  type Lodge,
} from "../../../packages/shared/lodges";
import { FIELD_ABILITIES, fieldAbility } from "../../../packages/shared/rescue";
import { Explorer, type WalkArea } from "./Scene";
import { WalkContext, type Walker } from "./hover";
import {
  createAvatar,
  animateAvatar,
  createCreature,
  animateCreature,
  part,
} from "./models";
import { ModelLighting } from "./ModelLighting";
import { WorldInteraction } from "./WorldInteraction";
import { TouchPad } from "./WorldHUD";
import { buildLodge } from "./lodge-art";
import type { ExplorationInput } from "./world-guide";
import { audio, settings } from "./audio";
import "./lodges.css";
const area: WalkArea = {
  key: "lodge-room-v1",
  allowed: roomWalkable,
  extent: 9,
  home: ROOM_SPAWN,
  points: ROOM_STATIONS.map((s) => ({
    id: s.id,
    p: [s.point[0], 0, s.point[1]],
  })),
};
function Room({
  site,
  profile,
  blocked,
  interact,
}: {
  site: Lodge;
  profile: Profile;
  blocked: boolean;
  interact: (id: string) => void;
}) {
  const r = lodgeRecord(profile, site.region);
  const geometry = useMemo(
    () => buildLodge(site, r),
    [site, r.meal, r.helper?.id, r.keepsake],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const host = useMemo(() => {
    const m = createAvatar(site.avatar);
    m.position.set(-4, 0, -5.4);
    m.userData.groundY = 0;
    part(m, "box", site.color, [0, 1.19, 0.2], [0.4, 0.14, 0.08]);
    part(m, "box", "#dfc69e", [-0.24, 0.85, 0.18], [0.15, 0.2, 0.08]);
    return m;
  }, [site]);
  const resident = useMemo(() => {
    const m = createCreature(site.species);
    m.position.set(-1.9, 0, -5.6);
    m.scale.setScalar(0.75);
    return m;
  }, [site]);
  const guests = useMemo(
    () =>
      [2, 5].map((a, i) => {
        const m = createAvatar(a);
        m.position.set(-5.5, 0.08, 1.25 + i * 1.5);
        m.userData.groundY = 0.08;
        // Seated legs bend over the cushion edge; the walking limbs stay hidden.
        m.userData.limbs[0].visible = false;
        m.userData.limbs[2].visible = false;
        for (const side of [-1, 1]) {
          part(
            m,
            "capsule",
            "#6a6170",
            [side * 0.11, 0.78, 0.2],
            [0.14, 0.2, 0.14],
            [Math.PI / 2, 0, 0],
          );
          part(
            m,
            "capsule",
            "#6a6170",
            [side * 0.11, 0.47, 0.4],
            [0.14, 0.24, 0.14],
          );
          part(
            m,
            "box",
            "#5b4334",
            [side * 0.11, 0.14, 0.44],
            [0.15, 0.1, 0.23],
          );
        }
        m.rotation.y = Math.PI / 2;
        return m;
      }),
    [],
  );
  useFrame(({ clock }) => {
    animateAvatar(host, clock.elapsedTime, false, false, settings.reduced);
    animateCreature(resident, clock.elapsedTime, "idle", 0, settings.reduced);
    if (r.keepsake)
      guests.forEach((m) =>
        animateAvatar(m, clock.elapsedTime, false, false, settings.reduced),
      );
  });
  return (
    <group name={`lodge-room-${site.region}`}>
      <mesh
        name={`lodge-furnishings-${r.keepsake || "waiting"}`}
        geometry={geometry}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial vertexColors roughness={0.86} />
      </mesh>
      <primitive object={host} />
      <primitive object={resident} />
      {r.keepsake && guests.map((g, i) => <primitive key={i} object={g} />)}
      {ROOM_STATIONS.map((s) => (
        <WorldInteraction
          key={s.id}
          name={`room-${s.id}`}
          position={[s.point[0], 0.03, s.point[1]]}
          approach={s.point}
          reach={0.8}
          disabled={blocked}
          title={s.id === "host" ? site.host : s.name}
          activate={() => interact(s.id)}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.46, 32]} />
            <meshStandardMaterial
              color={site.color}
              emissive={site.color}
              emissiveIntensity={0.25}
            />
          </mesh>
          {!blocked && (
            <Html
              position={[0, 0.75, 0]}
              center
              zIndexRange={[3, 0]}
              style={{ pointerEvents: "none" }}
            >
              <span className="lodge-marker">
                {s.id === "host"
                  ? site.host
                  : s.id === "kitchen"
                    ? "Kitchen"
                    : s.id === "companion"
                      ? "Help"
                      : s.id === "guestbook"
                        ? "Guestbook"
                        : "Exit"}
              </span>
            </Html>
          )}
        </WorldInteraction>
      ))}
    </group>
  );
}
export function LodgeScene({
  site,
  profile,
  busy,
  run,
  exit,
}: {
  site: Lodge;
  profile: Profile;
  busy: boolean;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  exit: () => void;
}) {
  const [panel, setPanel] = useState(""),
    [near, setNear] = useState(""),
    [chosen, setChosen] = useState("");
  const walker = useRef<Walker>({ go: () => {} }),
    input = useRef<ExplorationInput>({ x: 0, z: 0 });
  const position = useRef<[number, number]>(ROOM_SPAWN);
  const r = lodgeRecord(profile, site.region),
    count = lodgeCount(profile),
    helper = profile.owned.find(
      (o) => o.id === chosen && profile.team.includes(o.id),
    );
  const eligible =
    helper && fieldAbility(byId[helper.species].element) === site.ability;
  const interact = (id: string) => {
    if (busy) return;
    if (id === "exit") {
      exit();
      return;
    }
    setChosen("");
    setPanel(id);
    audio.cue("confirm");
  };
  const walk = (id: string) => {
    const s = ROOM_STATIONS.find((s) => s.id === id);
    if (s && !panel && !busy)
      walker.current.go(s.point, 0.8, () => interact(id));
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches("input,select,textarea")
      )
        return;
      if (e.code === "Escape" && !busy) setPanel("");
      if (e.code === "KeyE" && !panel && near) walk(near);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [near, panel, busy]);
  const act = (kind: string, data: Record<string, unknown> = {}) =>
    run(kind, { id: site.id, ...data });
  return (
    <div className="lodge-visit" aria-label={site.name}>
      <div className="scene full">
        <Canvas
          shadows
          camera={{ position: [10, 10, 16.5], fov: 45 }}
          frameloop={panel ? "demand" : "always"}
          dpr={[1, settings.quality === "High" ? 1.75 : 1.3]}
        >
          <WalkContext.Provider value={walker}>
            <color attach="background" args={["#393940"]} />
            <ambientLight intensity={0.9} />
            <directionalLight
              position={[3, 8, 4]}
              intensity={2.2}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <pointLight
              position={[-4, 2, -5.8]}
              color="#ffb969"
              intensity={16}
              distance={12}
            />
            <ModelLighting intensity={0.3} />
            <Room
              {...{ site, profile }}
              blocked={!!panel}
              interact={interact}
            />
            <Explorer
              {...{ profile, walker, input, area }}
              spawn={ROOM_SPAWN}
              blocked={!!panel || busy}
              onNear={setNear}
              onInteract={interact}
              onPosition={(x, z) => {
                position.current = [x, z];
              }}
              pet={false}
            />
          </WalkContext.Provider>
        </Canvas>
      </div>
      <div className="lodge-hud">
        <header>
          <div>
            <p className="eyebrow">WAYFARER LODGES / {count} OF 4 GATHERINGS</p>
            <h1>{site.name}</h1>
            <p>
              {r.keepsake
                ? "The gathering is remembered here."
                : !r.met
                  ? `Meet ${site.host} to begin.`
                  : !r.meal
                    ? `Prepare ${site.recipe} in the kitchen.`
                    : !r.helper
                      ? site.task
                      : "Sign the gathering book and choose a decoration."}
            </p>
          </div>
          <button disabled={busy} onClick={exit}>
            Leave lodge
          </button>
        </header>
        {!panel && (
          <>
            <nav aria-label="Walk around the lodge">
              {ROOM_STATIONS.map((s) => (
                <button key={s.id} disabled={busy} onClick={() => walk(s.id)}>
                  {s.name}
                </button>
              ))}
            </nav>
            <p className="lodge-controls">
              WASD / arrows to move ? Click the floor to walk ? E to interact ?
              R to reset camera
            </p>
            <TouchPad input={input} blocked={busy} />
          </>
        )}
      </div>
      {panel && (
        <div className="modal-backdrop">
          <section
            className="panel modal lodge-dialog"
            aria-label={`lodge-${panel}`}
          >
            <button
              className="close"
              aria-label="Close lodge panel"
              disabled={busy}
              onClick={() => setPanel("")}
            >
              ?
            </button>
            <p className="eyebrow">{site.name}</p>
            {panel === "host" && (
              <>
                <h2>{site.host}'s welcome</h2>
                <p>{r.keepsake ? site.ending : site.story}</p>
                {!r.met ? (
                  <button disabled={busy} onClick={() => act("lodge-meet")}>
                    Offer to help
                  </button>
                ) : (
                  <p>
                    You have met {site.host}. Explore the kitchen, companion
                    corner, and gathering book.
                  </p>
                )}
              </>
            )}
            {panel === "kitchen" && (
              <>
                <h2>{site.recipe}</h2>
                <p>
                  The host supplies all ingredients. Recipe note:{" "}
                  {site.ingredients[site.answer]}.
                </p>
                {r.meal ? (
                  <p role="status">Supper prepared: {r.meal}.</p>
                ) : (
                  <>
                    <p>Choose the ingredients for this gathering.</p>
                    {site.ingredients.map((label, i) => (
                      <button
                        className="lodge-choice"
                        key={label}
                        disabled={busy || !r.met}
                        onClick={() => act("lodge-cook", { inputs: [i] })}
                      >
                        {label}
                      </button>
                    ))}
                    {!r.met && <p>Meet the host first.</p>}
                  </>
                )}
              </>
            )}
            {panel === "companion" && (
              <>
                <h2>Companion corner</h2>
                <p>{site.task}</p>
                {r.helper ? (
                  <p role="status">
                    {byId[r.helper.species].name} helped here and gained 3
                    friendship.
                  </p>
                ) : (
                  <>
                    <label>
                      Choose an active companion
                      <select
                        aria-label="Lodge companion"
                        value={chosen}
                        onChange={(e) => setChosen(e.target.value)}
                      >
                        <option value="">Choose a companion</option>
                        {profile.team
                          .map((id) => profile.owned.find((o) => o.id === id))
                          .filter((o) => !!o)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {byId[o.species].name} /{" "}
                              {
                                FIELD_ABILITIES[
                                  fieldAbility(byId[o.species].element)
                                ].name
                              }
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      disabled={busy || !r.met || !eligible}
                      onClick={() => act("lodge-help", { companion: chosen })}
                    >
                      Help {site.host}
                    </button>
                    {!r.met && <p>Meet the host first.</p>}
                    <p>
                      Formation changes are available outdoors. Every starter
                      team can help at all four lodges after meeting Liora.
                    </p>
                  </>
                )}
              </>
            )}
            {panel === "guestbook" && (
              <>
                <h2>The gathering book</h2>
                {r.keepsake ? (
                  <>
                    <p>{site.ending}</p>
                    <p>
                      Saved decoration: {r.keepsake}. Supper: {r.meal}. Helper:{" "}
                      {r.helper && byId[r.helper.species].name}.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Prepare supper and help with a companion, then leave a
                      keepsake for future visitors.
                    </p>
                    <p>One-time reward: 50 Gold, 15 Diamonds and 20 XP.</p>
                    {(["lantern", "banner"] as const).map((choice) => (
                      <button
                        className="lodge-choice"
                        key={choice}
                        disabled={busy || !r.meal || !r.helper}
                        onClick={() => act("lodge-finish", { quest: choice })}
                      >
                        Host the gathering /{" "}
                        {choice === "lantern"
                          ? "Hang a lantern"
                          : "Weave a banner"}
                      </button>
                    ))}
                  </>
                )}
                <h3>Traveling companions</h3>
                {[
                  ["lumeswallow", 2],
                  ["velvetmoth", 4],
                ].map(([species, n]) => (
                  <button
                    className="lodge-choice"
                    key={species}
                    disabled={
                      busy ||
                      count < Number(n) ||
                      lodgeOf(profile).claims.includes(String(species))
                    }
                    onClick={() => act("lodge-claim", { species })}
                  >
                    {lodgeOf(profile).claims.includes(String(species))
                      ? "Welcomed"
                      : `Welcome ${byId[species].name}`}{" "}
                    / {n} gatherings
                  </button>
                ))}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
