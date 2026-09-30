import { useCallback, useEffect, useRef, useState } from "react";
import {
  AVATARS,
  byId,
  REGIONS,
  STARTERS,
} from "../../../packages/shared/content";
import type { Battle, Profile } from "../../../packages/shared/types";
import { api, mutate, session, setSession } from "./api";
import { audio, settings } from "./audio";
import { INTERACTABLES, Preview, TitleScene, WorldScene } from "./Scene";
import { Portrait } from "./portraits";
import { WorldHUD } from "./WorldHUD";
import { NPCS } from "../../../packages/shared/town";
import { NpcPanel, TownDirectory } from "./TownPanels";
import { currentObjective, type ExplorationInput } from "./world-guide";
import {
  Appearance,
  Collection,
  Formation,
  Gallery,
  Leaderboard,
  MapPanel,
  Quests,
  Recruitment,
  SettingsPanel,
} from "./Panels";
import { Arena, BattleUI } from "./Arena";
export default function App() {
  const [screen, setScreen] = useState("title"),
    [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [avatar, setAvatar] = useState(0),
    [starter, setStarter] = useState("emberfox"),
    [panel, setPanel] = useState(""),
    [toast, setToast] = useState(""),
    [near, setNear] = useState(""),
    [position, setPosition] = useState([0, 5]),
    [pet, setPet] = useState(false),
    [battle, setBattle] = useState<Battle | null>(null),
    [auto, setAuto] = useState(false),
    [fast, setFast] = useState(false);
  const input = useRef<ExplorationInput>({ x: 0, z: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    inFlight = useRef(false);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 5000);
  }, []);
  const refresh = useCallback(
    () =>
      api<Profile>("profile")
        .then(setProfile)
        .catch((e) => notify(e.message)),
    [notify],
  );
  useEffect(() => {
    if (session)
      api<Profile>("profile")
        .then((p) => {
          setProfile(p);
          setAvatar(p.avatar);
        })
        .catch((e) => notify(e.message))
        .finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (screen === "world") setPanel((p) => (p ? "" : "pause"));
        else if (panel) setPanel("");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [screen, panel]);
  useEffect(() => {
    audio.location(
      screen === "battle"
        ? "battle"
        : screen === "arena"
          ? "arena"
          : screen === "world"
            ? profile?.region || "haven"
            : "title",
    );
  }, [screen, profile?.region]);
  useEffect(() => {
    if (
      screen !== "battle" ||
      !battle ||
      battle.winner !== null ||
      inFlight.current
    )
      return;
    const actor = battle.units.find((u) => u.id === battle.queue[0]);
    if (actor?.side === 0 && !auto) return;
    const t = setTimeout(
      () => battleAction(),
      Math.max(50, battle.readyAt - Date.now() + 80),
    );
    return () => clearTimeout(t);
  }, [battle, screen, auto, fast]);
  async function run(kind: string, data: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const result = await mutate(kind, data);
      setProfile(result.profile);
      audio.cue("confirm");
      if (kind === "resource") notify("Gathered +1 Sunseed · +25 Gold");
      if (
        kind.startsWith("town-") &&
        result.value?.message &&
        kind !== "town-talk"
      )
        notify(result.value.message);
      if (["formation", "train", "upgrade", "avatar"].includes(kind))
        notify(
          kind === "formation"
            ? "Formation saved."
            : kind === "train"
              ? "Training complete. Earned XP is kept until your level cap rises."
              : "Saved.",
        );
      return result.value;
    } catch (e) {
      notify((e as Error).message);
      audio.cue("error");
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  async function enter() {
    await audio.unlock();
    audio.location("haven");
    if (!profile) {
      setScreen("avatar");
      return;
    }
    if (!profile.owned.length) {
      setScreen("starter");
      return;
    }
    if (sessionStorage.getItem("mythoveya-room")) {
      setScreen("arena");
      return;
    }
    try {
      const b = await api<Battle | null>("battle");
      if (b && b.winner === null) {
        setBattle(b);
        setScreen("battle");
        return;
      }
    } catch {}
    setScreen("world");
  }
  async function create() {
    setBusy(true);
    try {
      const r = await api("guest", { name, avatar });
      setSession(r.token);
      setProfile(r.profile);
      setScreen("starter");
      audio.cue("confirm");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function choose() {
    await run("starter", { species: starter });
    const p = await api<Profile>("profile");
    setProfile(p);
    if (p.owned.length) setScreen("world");
  }
  async function startBattle(boss = false, practice = false) {
    if (!profile || profile.team.length !== 6) {
      notify("Meet Warden Liora to form your first team of six.");
      return;
    }
    setBusy(true);
    try {
      const b = await api<Battle>("battle/start", { boss, practice });
      setBattle(b);
      setPanel("");
      setAuto(false);
      setScreen("battle");
      audio.location(boss ? "boss" : "battle");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function battleAction(action?: number, target?: string) {
    if (!battle || inFlight.current) return;
    inFlight.current = true;
    try {
      const b = await api<Battle>("battle/act", {
        action,
        target,
        auto: action === undefined,
        fast,
        sequence: battle.sequence,
      });
      setBattle(b);
      if (b.winner !== null) {
        refresh();
        audio.cue(b.winner === 0 ? "victory" : "defeat");
      }
    } catch (e) {
      notify((e as Error).message);
      api<Battle>("battle")
        .then(setBattle)
        .catch(() => {});
    } finally {
      inFlight.current = false;
    }
  }
  const interact = useCallback(
    (id: string) => {
      audio.cue("interact");
      const villager = NPCS.find((n) => n.location === id);
      if (villager) setPanel(`npc-${villager.id}`);
      else if (id === "boss") startBattle(true);
      else if (id.startsWith("resource")) {
        run("resource", { resource: id });
        audio.cue("collect");
      } else if (id === "arena") {
        if (profile?.team.length !== 6)
          notify("Meet Liora first to form a team of six.");
        else setScreen("arena");
      } else setPanel(id);
    },
    [profile],
  );
  function open(id: string) {
    audio.cue("confirm");
    if (id === "arena") {
      if (profile?.team.length !== 6) {
        notify("Meet Liora first to form a team of six.");
        return;
      }
      setScreen("arena");
      setPanel("");
    } else setPanel(id);
  }
  const objective = profile ? currentObjective(profile) : null;
  const onboarding = screen === "avatar" || screen === "starter";
  return (
    <main
      onPointerDown={() => {
        if (!audio.ctx) void audio.unlock();
      }}
    >
      {(screen === "title" || onboarding) && (
        <div className="scene full">
          <TitleScene avatar={avatar} species={starter} />
        </div>
      )}
      {screen === "title" && (
        <>
          <div className="title-shade" />
          <header className="title-top">
            <span className="small-brand">
              <img src="/emblem.svg" /> MYTHOVEYA
            </span>
            <button
              className="text-button"
              onClick={() => setPanel("settings")}
            >
              ♫ Sound & settings
            </button>
          </header>
          <section className="title-content">
            <p className="eyebrow">A WORLD WORTH GETTING LOST IN</p>
            <img
              className="title-emblem"
              src="/emblem.svg"
              alt="Six-point bond emblem"
            />
            <h1>MYTHOVEYA</h1>
            <p className="subtitle">CALL OF THE WILDBOUND</p>
            <div className="title-rule" />
            <h2>
              Find your wild.
              <br />
              <em>Forge your six.</em>
            </h2>
            <p className="intro">
              Beyond the clouds, a thousand little wonders.
              <br />
              And somewhere out there, your first companion.
            </p>
            <button
              className="primary start-button"
              disabled={loading}
              onClick={enter}
            >
              {loading
                ? "Finding your story…"
                : profile
                  ? "Continue your journey"
                  : "Begin your journey"}{" "}
              <span>→</span>
            </button>
            <p className="title-foot">EXPLORE · BEFRIEND · BELONG</p>
          </section>
          <div className="title-location">
            <span>01 / THE FLOATING REACHES</span>
            <strong>A new horizon awaits.</strong>
          </div>
          <footer className="title-bottom">
            <span>CALL OF THE WILDBOUND</span>
            <span>60 WILDBOUND · ONE EXTRAORDINARY JOURNEY</span>
          </footer>
        </>
      )}
      {onboarding && (
        <div className="onboarding panel">
          <p className="eyebrow">
            {screen === "avatar" ? "01 / THE KEEPER" : "02 / THE FIRST BOND"}
          </p>
          <h2>
            {screen === "avatar"
              ? "Every story starts with you."
              : "Who will walk beside you?"}
          </h2>
          {screen === "avatar" ? (
            <div className="detail-grid">
              <div className="model-preview">
                <Preview avatar={avatar} />
              </div>
              <div>
                <label className="name-label">
                  Your keeper name
                  <input
                    aria-label="Keeper name"
                    placeholder="What should we call you?"
                    maxLength={24}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <div className="avatar-list">
                  {AVATARS.map((a, i) => (
                    <button
                      key={a.name}
                      className={avatar === i ? "selected" : ""}
                      onClick={() => setAvatar(i)}
                    >
                      <span style={{ background: a.coat }} />
                      {a.name}
                      <small>{a.desc}</small>
                    </button>
                  ))}
                </div>
                <button
                  className="primary"
                  disabled={busy || name.trim().length < 2}
                  onClick={create}
                >
                  Choose this keeper →
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="starter-grid">
                {STARTERS.map((id) => (
                  <button
                    className={starter === id ? "selected" : ""}
                    key={id}
                    onClick={() => {
                      setStarter(id);
                      audio.voice(id);
                    }}
                  >
                    <Portrait id={id} />
                    <span className="eyebrow">
                      {byId[id].element} · {byId[id].role}
                    </span>
                    <h3>{byId[id].name}</h3>
                    <p>{byId[id].appearance}</p>
                  </button>
                ))}
              </div>
              <p className="muted">
                All starters can lead a complete team. Warden Liora is waiting
                in Havenreach with five more companions.
              </p>
              <button className="primary" disabled={busy} onClick={choose}>
                Begin with {byId[starter].name} →
              </button>
            </>
          )}
        </div>
      )}
      {screen === "world" && profile && (
        <>
          <div className="scene full">
            <WorldScene
              profile={profile}
              blocked={!!panel}
              onNear={setNear}
              onInteract={interact}
              onPosition={(x, z) => setPosition([x, z])}
              pet={pet}
              position={position}
              objective={objective!}
              input={input}
            />
          </div>
          <WorldHUD
            profile={profile}
            position={position}
            near={near}
            objective={objective!}
            open={open}
            interact={interact}
            input={input}
            blocked={!!panel}
            greet={() => {
              setPet(true);
              audio.voice(
                profile.owned.find((o) => o.id === profile.team[0])?.species ||
                  profile.owned[0].species,
              );
              audio.cue("pet");
              setTimeout(() => setPet(false), 1800);
            }}
          />
        </>
      )}
      {screen === "battle" && battle && (
        <BattleUI
          battle={battle}
          send={battleAction}
          auto={auto}
          setAuto={setAuto}
          fast={fast}
          setFast={setFast}
          finish={() => {
            refresh();
            setScreen("world");
            setBattle(null);
            setPanel(profile?.bond && !profile.bond.used ? "bond" : "quests");
          }}
        />
      )}
      {screen === "arena" && profile && (
        <Arena
          profile={profile}
          onExit={() => {
            setScreen("world");
            refresh();
          }}
          onPractice={() => startBattle(false, true)}
          refresh={refresh}
        />
      )}
      {panel && (
        <div className="modal-backdrop">
          <section
            className={`panel modal ${["collection", "formation", "gallery", "town"].includes(panel) || panel.startsWith("npc-") ? "wide" : ""}`}
            aria-label={panel}
          >
            <button
              className="close"
              aria-label="Close panel"
              onClick={() => {
                setPanel("");
                audio.cue("back");
              }}
            >
              ×
            </button>
            {panel === "settings" && <SettingsPanel />}
            {panel === "town" && profile && (
              <TownDirectory profile={profile} open={open} />
            )}
            {profile &&
              NPCS.filter((n) => panel === `npc-${n.id}`).map((n) => (
                <NpcPanel
                  key={n.id}
                  npc={n}
                  profile={profile}
                  run={run}
                  open={open}
                  close={() => setPanel("")}
                  startBattle={startBattle}
                />
              ))}
            {panel === "collection" && profile && (
              <Collection profile={profile} run={run} />
            )}{" "}
            {panel === "training" && profile && (
              <Collection profile={profile} run={run} training />
            )}
            {panel === "formation" && profile && (
              <Formation profile={profile} run={run} />
            )}{" "}
            {panel === "quests" && profile && (
              <>
                <button className="town-entry" onClick={() => open("town")}>
                  People & missions · Meet the village →
                </button>
                <Quests profile={profile} run={run} />
              </>
            )}{" "}
            {panel === "recruit" && profile && (
              <Recruitment profile={profile} run={run} />
            )}{" "}
            {panel === "leaderboard" && <Leaderboard />}
            {panel === "map" && profile && (
              <MapPanel
                profile={profile}
                run={run}
                close={() => setPanel("")}
              />
            )}{" "}
            {panel === "appearance" && profile && (
              <Appearance profile={profile} run={run} />
            )}{" "}
            {panel === "gallery" && import.meta.env.DEV && <Gallery />}
            {panel === "guide" && profile && (
              <div className="guide-content">
                <p className="eyebrow">WARDEN LIORA · HAVENREACH</p>
                <h2>"No keeper walks alone."</h2>
                <p>
                  "The reaches are full of extraordinary little lives. Earn
                  their trust, and they will change yours."
                </p>
                <p>
                  "Take these five companions. Alongside your starter, they make
                  your first team of six. Find the Wild encounter marker in the
                  meadow, and remember: your front line protects the friends
                  behind it."
                </p>
                <div className="guide-companions">
                  {[
                    "cindermite",
                    "puddlepip",
                    "mossprig",
                    "pebblit",
                    "zippinch",
                  ].map((id) => (
                    <Portrait key={id} id={id} />
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={async () => {
                    await run("guide");
                    setPanel("");
                    notify(
                      "Your first six are ready. Find the wild encounter!",
                    );
                  }}
                >
                  {profile.quests.guide
                    ? "Thank you, Liora"
                    : "Accept companions & quest"}
                </button>
              </div>
            )}
            {panel === "bond" && profile?.bond && (
              <>
                <p className="eyebrow">A CHANCE TO CONNECT</p>
                <h2>{byId[profile.bond.species].name} lingers nearby.</h2>
                <Portrait id={profile.bond.species} />
                <p>
                  Offer 1 bond token · {Math.round(profile.bond.chance * 100)}%
                  chance · {profile.tokens} tokens available.
                </p>
                <p className="muted">
                  One attempt for this encounter. Reloading cannot retry it.
                </p>
                <button
                  disabled={profile.bond.used || profile.tokens < 1}
                  className="primary"
                  onClick={async () => {
                    const r = await run("bond");
                    if (r) {
                      notify(
                        r.success
                          ? "A new bond! Check your journal."
                          : "It returns to the wild. Another meeting awaits.",
                      );
                      setPanel("quests");
                    }
                  }}
                >
                  Offer a bond token
                </button>
                <button onClick={() => setPanel("quests")}>
                  Let it wander
                </button>
              </>
            )}
            {panel === "pause" && (
              <>
                <p className="eyebrow">TAKE A BREATH</p>
                <h2>Your story is safe.</h2>
                <p>Progress is saved on the local server after each action.</p>
                <div className="pause-buttons">
                  <button className="primary" onClick={() => setPanel("")}>
                    Return to the reaches
                  </button>
                  <button onClick={() => setPanel("settings")}>
                    Sound & graphics
                  </button>
                  <button onClick={() => setPanel("appearance")}>
                    Change keeper appearance
                  </button>
                  <button onClick={() => setPanel("town")}>
                    People of the reaches
                  </button>
                  {import.meta.env.DEV && (
                    <button onClick={() => setPanel("gallery")}>
                      Asset gallery
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setPanel("");
                      setScreen("title");
                    }}
                  >
                    Return to title
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {busy && <div className="saving">✧ Saving your story…</div>}
      {toast && (
        <div role="status" className="toast" onClick={() => setToast("")}>
          {toast}
        </div>
      )}
    </main>
  );
}
