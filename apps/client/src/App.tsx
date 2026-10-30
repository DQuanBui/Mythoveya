import { LODGES, lodgeStops } from "../../../packages/shared/lodges";
import { rescueStops } from "../../../packages/shared/rescue";
import { ATLAS_STOPS } from "../../../packages/shared/atlas";
import { CONSERVANCY_STOPS } from "../../../packages/shared/conservancy";
import { RALLY_HOSTS } from "../../../packages/shared/rally";
import { MEADOW_STOPS } from "../../../packages/shared/meadow";
import { HOLLOW_STOPS } from "../../../packages/shared/hollow";
import { CANYON_STOPS } from "../../../packages/shared/canyon";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_SPECIES,
  AVATARS,
  byId,
  REGIONS,
  STARTERS,
} from "../../../packages/shared/content";
import type { Battle, Profile } from "../../../packages/shared/types";
import { api, mutate, session, setSession } from "./api";
import { audio, settings } from "./audio";
import { Preview, TitleScene, WorldScene } from "./Scene";
import { Portrait } from "./portraits";
import { WorldHUD } from "./WorldHUD";
import { NPCS } from "../../../packages/shared/town";
import { HavenMap, MAP_DESTINATIONS } from "./HavenMap";
import { HouseVisit } from "./HavenHouses";
import { weatherFx } from "./Weather";
import { TOWNSFOLK } from "./HavenTownsfolk";
import type { MissionStart } from "./AdventurePanel";
import { currentObjective, type ExplorationInput } from "./world-guide";
import { SettingsPanel } from "./SettingsPanel";
import type { Placing } from "./HomeIsland";
import type { FestivalTab } from "./FestivalPanel";
import { FESTIVAL_RADIUS } from "../../../packages/shared/festival";
import { SKYFERRY, HAVEN_HOUSES, houseDoor } from "../../../packages/shared/haven";
import { HOME_INTERIORS } from "../../../packages/shared/homes";
import { PhotoMode, photoCss, type PhotoFilter } from "./PhotoMode";
import { MilestonesPanel } from "./MilestonesPanel";
import {
  catalogEntry,
  defaultHome,
  homeRadius,
  islandArrival,
} from "../../../packages/shared/islands";
// Panels and region maps load when first opened.
const LodgePanel = lazy(() => import("./LodgePanel").then((m) => ({ default: m.LodgePanel })));
const RescuePanel = lazy(() => import("./RescuePanel").then((m) => ({ default: m.RescuePanel })));
const AtlasPanel = lazy(() => import("./AtlasPanel").then((m) => ({ default: m.AtlasPanel })));
const ConservancyPanel = lazy(() => import("./ConservancyPanel").then((m) => ({ default: m.ConservancyPanel })));
const RallyPanel = lazy(() => import("./RallyPanel").then((m) => ({ default: m.RallyPanel })));
const MeadowPanel = lazy(() => import("./MeadowPanel").then((m) => ({ default: m.MeadowPanel })));
const MeadowMap = lazy(() => import("./MeadowMap").then((m) => ({ default: m.MeadowMap })));
const HollowPanel = lazy(() => import("./HollowPanel").then((m) => ({ default: m.HollowPanel })));
const HollowMap = lazy(() => import("./HollowMap").then((m) => ({ default: m.HollowMap })));
const CanyonPanel = lazy(() => import("./CanyonPanel").then((m) => ({ default: m.CanyonPanel })));
const CanyonMap = lazy(() => import("./CanyonMap").then((m) => ({ default: m.CanyonMap })));
const ExpeditionPanel = lazy(() => import("./ExpeditionPanel").then((m) => ({ default: m.ExpeditionPanel })));
const FishingPanel = lazy(() => import("./FishingPanel").then((m) => ({ default: m.FishingPanel })));
const ShopPanel = lazy(() => import("./ShopPanel").then((m) => ({ default: m.ShopPanel })));
const EventsPanel = lazy(() => import("./EventsPanel").then((m) => ({ default: m.EventsPanel })));
const NpcPanel = lazy(() => import("./TownPanels").then((m) => ({ default: m.NpcPanel })));
const TownDirectory = lazy(() => import("./TownPanels").then((m) => ({ default: m.TownDirectory })));
const AdventurePanel = lazy(() => import("./AdventurePanel").then((m) => ({ default: m.AdventurePanel })));
const StoryScene = lazy(() => import("./StoryScene").then((m) => ({ default: m.StoryScene })));
// Chapter scenes already shown, per keeper; a viewing convenience only.
const STORY_KEY = "mythoveya-story-seen";
function storySeen(id: string) {
  try {
    return (JSON.parse(localStorage.getItem(STORY_KEY) || "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}
function markStory(id: string) {
  try {
    const seen = JSON.parse(localStorage.getItem(STORY_KEY) || "[]") as string[];
    localStorage.setItem(STORY_KEY, JSON.stringify([...new Set([...seen, id])]));
  } catch {}
}
const Appearance = lazy(() => import("./Panels").then((m) => ({ default: m.Appearance })));
const Collection = lazy(() => import("./Panels").then((m) => ({ default: m.Collection })));
const Formation = lazy(() => import("./Panels").then((m) => ({ default: m.Formation })));
const Leaderboard = lazy(() => import("./Panels").then((m) => ({ default: m.Leaderboard })));
const MapPanel = lazy(() => import("./Panels").then((m) => ({ default: m.MapPanel })));
const Quests = lazy(() => import("./Panels").then((m) => ({ default: m.Quests })));
const Recruitment = lazy(() => import("./Panels").then((m) => ({ default: m.Recruitment })));
const Gallery = import.meta.env.DEV ? lazy(() => import("./Panels").then((m) => ({ default: m.Gallery }))) : () => null;
const Arena = lazy(() => import("./Arena").then((m) => ({ default: m.Arena })));
const BattleUI = lazy(() => import("./Arena").then((m) => ({ default: m.BattleUI })));
// Islands and minigames are loaded only when the keeper travels there.
const LodgeScene = lazy(() => import("./LodgeScene").then(m=>({default:m.LodgeScene})));
const HomeScene = lazy(() => import("./HomeScene").then((m) => ({ default: m.HomeScene })));
const IslandScene = lazy(() => import("./HomeIsland").then((m) => ({ default: m.IslandScene })));
const HomePanel = lazy(() => import("./HomePanel").then((m) => ({ default: m.HomePanel })));
const SkyferryPanel = lazy(() => import("./HomePanel").then((m) => ({ default: m.SkyferryPanel })));
const FestivalScene = lazy(() => import("./FestivalIsland").then((m) => ({ default: m.FestivalScene })));
const FestivalPanel = lazy(() => import("./FestivalPanel").then((m) => ({ default: m.FestivalPanel })));
const FestivalGame = lazy(() => import("./FestivalGames").then((m) => ({ default: m.FestivalGame })));

/** Where you step off the ferry in Havenreach: just inland from the dock gate. */
const FERRY_LANDING: number[] = [SKYFERRY.point[0] * 0.95, SKYFERRY.point[1] * 0.95];
export default function App() {
  const [lodge, setLodge] = useState<string | null>(null);
  const [home, setHome] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState(false),
    [photoFilter, setPhotoFilter] = useState<PhotoFilter>("natural");
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
    [fast, setFast] = useState(false),
    [placing, setPlacing] = useState<Placing | null>(null),
    [homeFocus, setHomeFocus] = useState<string | undefined>(),
    [festTab, setFestTab] = useState<FestivalTab>("today"),
    [fairGame, setFairGame] = useState<"race" | "course" | "fishing">("race");
  const input = useRef<ExplorationInput>({ x: 0, z: 0 });
  const mission = useRef(false),
    missionStage = useRef<string | undefined>(undefined);
  const [story, setStory] = useState<{
    chapter: string;
    kind: "intro" | "outro";
    then?: () => void;
  } | null>(null);
  const [trail, setTrail] = useState<string | null>(null);
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
      // Photo mode handles its own keys.
      if (photoMode) return;
      if (
        e.code === "KeyP" &&
        screen === "world" &&
        !panel &&
        !placing &&
        !(e.target instanceof HTMLElement && e.target.matches("input,select,textarea"))
      )
        setPhotoMode(true);
      if (e.code === "KeyQ" && placing && !panel)
        setPlacing({ ...placing, rot: (placing.rot + 1) % 4 });
      if (e.code === "Escape") {
        if (placing && !panel) setPlacing(null);
        else if (screen === "world") setPanel((p) => (p ? "" : "pause"));
        else if (panel) setPanel("");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [screen, panel, placing, photoMode]);
  useEffect(() => {
    audio.location(
      screen === "battle"
        ? "battle"
        : screen === "arena" ||
            (screen === "fair-game" && fairGame !== "fishing")
          ? "arena"
          : screen === "fair-game"
            ? "festival"
            : screen === "lodge" || screen === "home"
            ? "indoors"
            : screen === "world"
            ? profile?.island === "festival"
              ? "festival"
              : profile?.island
                ? "home"
                : profile?.region || "haven"
            : "title",
    );
  }, [screen, profile?.region, profile?.island, fairGame]);
  useEffect(() => {
    // Rain and mist ambience follow the blended weather while exploring.
    const t = setInterval(
      () =>
        screen === "world"
          ? audio.weather(weatherFx.rain, weatherFx.mist)
          : audio.weather(0, 0),
      500,
    );
    return () => clearInterval(t);
  }, [screen]);
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
      if (kind === "travel") {
        setTrail(null);
        setPosition([0, 5]);
      }
      if (kind === "island-travel") {
        // Set the arrival point in the same render that swaps the scene.
        setTrail(null);
        setPlacing(null);
        setPanel("");
        setPosition(
          data.region === "haven"
            ? FERRY_LANDING
            : data.region === "festival"
              ? islandArrival("festival", FESTIVAL_RADIUS)
              : islandArrival("home", homeRadius(result.profile.home || defaultHome())),
        );
      }
      audio.cue("confirm");
      if (kind === "resource") notify("Gathered +1 Sunseed · +25 Gold");
      if (
        (kind.startsWith("lodge-") || kind.startsWith("rescue-") || kind.startsWith("atlas-") || kind.startsWith("cons-") || kind.startsWith("rally-") || kind.startsWith("mea-") || kind.startsWith("hol-") || kind.startsWith("can-") || kind.startsWith("exp-") || kind.startsWith("town-") || kind.startsWith("home-") || kind.startsWith("island-") || kind.startsWith("season-")) &&
        result.value?.message &&
        kind !== "town-talk" &&
        kind !== "town-fish"
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
  /** Story stages open with their chapter's prologue the first time. */
  function beginMission(m: MissionStart) {
    const chapter = m.stage?.match(/^(c\d+)-1$/)?.[1],
      key = chapter && `${profile?.id}:${chapter}:intro`;
    if (!chapter || !key || storySeen(key)) return void startBattle(false, false, m);
    markStory(key);
    setPanel("");
    setStory({ chapter, kind: "intro", then: () => startBattle(false, false, m) });
  }
  async function startBattle(
    boss = false,
    practice = false,
    adventure: MissionStart = {},
  ) {
    if (!profile || profile.team.length !== 6) {
      notify("Meet Warden Liora to form your first team of six.");
      return;
    }
    setBusy(true);
    try {
      const b = await api<Battle>("battle/start", {
        boss,
        practice,
        ...adventure,
      });
      mission.current = !!(adventure.expedition || adventure.stage || adventure.dungeon || adventure.tower);
      missionStage.current = adventure.stage;
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
  async function bondAttempt(target: string) {
    if (!battle || inFlight.current) return;
    inFlight.current = true;
    try {
      const b = await api<Battle>("battle/bond", { target, sequence: battle.sequence });
      setBattle(b);
      const joined = b.bonded?.length !== battle.bonded?.length;
      audio.cue(joined ? "rare" : "break");
      notify(b.log[b.log.length - 1]);
      refresh();
      if (b.winner !== null) audio.cue(b.winner === 0 ? "victory" : "defeat");
    } catch (e) {
      notify((e as Error).message);
      api<Battle>("battle")
        .then(setBattle)
        .catch(() => {});
    } finally {
      inFlight.current = false;
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
      if (id.startsWith("lodge-") && LODGES.some(s=>s.id===id && s.region===profile?.region) && !profile?.island) {
        setLodge(id);setPanel("");setTrail(null);setNear("");setScreen("lodge");
      }
      else if (villager) setPanel(`npc-${villager.id}`);
      else if (id.startsWith("trail-")) {
        setTrail(id.slice(6));
        setPanel("map");
      } else if (id === "boss") startBattle(true);
      else if (id.startsWith("resource")) {
        run("resource", { resource: id });
        audio.cue("collect");
      } else if (id === "riftgate") setPanel("adventure");
      else if (id === "skyferry" || id === "home-ferry" || id === "fest-ferry")
        setPanel("skyferry");
      else if (id === "fest-board" || id === "fest-shop") {
        setFestTab(id === "fest-shop" ? "shop" : "today");
        setPanel("festival");
      } else if (id === "fest-race" || id === "fest-course" || id === "fest-fishing") {
        setFairGame(id === "fest-race" ? "race" : id === "fest-course" ? "course" : "fishing");
        setPanel("");
        setScreen("fair-game");
      } else if (id.startsWith("fest-lantern-")) {
        audio.cue("collect");
        run("fest-hunt", { id: id.slice(13) });
      }
      else if (id === "home-house") {
        setHomeFocus(undefined);
        setPanel("home");
      } else if (id.startsWith("habitat-")) {
        setHomeFocus(id.slice(8));
        setPanel("home");
      } else if (id.startsWith("pet-")) {
        audio.cue("pet");
        run("home-pet", { id: id.slice(4) });
      }
      else if (id === "pierfishing") setPanel("fishing");
      else if (id.startsWith("folk-")) {
        const folk = TOWNSFOLK[Number(id.slice(5))];
        if (folk)
          notify(
            `${folk.name}: “${folk.lines[Math.floor(Math.random() * folk.lines.length)]}”`,
          );
      }
      else if (id.startsWith("season-")) {
        audio.cue("collect");
        run("season-find", { id: id.slice(7) });
      } else if (id.startsWith("cache-")) {
        if (profile?.town?.caches?.includes(id.slice(6)))
          notify("You already found this Skyglass cache.");
        else {
          audio.cue("collect");
          run("town-cache", { id: id.slice(6) });
        }
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
    if (id === "photo") {
      setPanel("");
      setPhotoMode(true);
    } else if (id === "arena") {
      if (profile?.team.length !== 6) {
        notify("Meet Liora first to form a team of six.");
        return;
      }
      setScreen("arena");
      setPanel("");
    } else setPanel(id);
  }
  const destination =
    trail?.startsWith("lodge-") ? lodgeStops(profile?.region || "").find(s=>s.id===trail) : trail?.startsWith("rescue-") ? rescueStops(profile?.region || "").find(s=>s.id===trail) : trail?.startsWith("atlas-") ? ATLAS_STOPS.find(s=>s.id===trail && s.region===profile?.region) : trail?.startsWith("cons-") ? CONSERVANCY_STOPS.find(s=>s.id===trail && s.region===profile?.region) : trail?.startsWith("rally-") ? RALLY_HOSTS.find(h=>h.id===trail && h.region===profile?.region) : profile?.region === "haven"
      ? MAP_DESTINATIONS.find((p) => p.id === trail)
      : profile?.region === "canyon" ? CANYON_STOPS.find(p=>p.id===trail) : profile?.region === "hollow" ? HOLLOW_STOPS.find(p=>p.id===trail) : profile?.region === "meadow" ? MEADOW_STOPS.find(p=>p.id===trail) : undefined;
  const objective = profile
    ? {
        ...currentObjective(profile),
        ...(destination
          ? {
              title: destination.name,
              text: destination.description,
              target:
                trail?.startsWith("lodge-") || trail?.startsWith("rescue-") || trail?.startsWith("atlas-") || trail?.startsWith("cons-") || trail?.startsWith("rally-") || trail?.startsWith("mea-") || trail?.startsWith("hol-") || trail?.startsWith("can-") || trail?.startsWith("exp-") || trail?.startsWith("porch-") || trail === "smith" || trail === "apothecary"
                  ? trail
                  : `trail-${destination.id}`,
              waypoint: true,
              action: "map",
              button: "View walking route",
            }
          : {}),
      }
    : null;
  const onboarding = screen === "avatar" || screen === "starter";
  return (
    <main
      onPointerDown={() => {
        if (!audio.ctx) void audio.unlock();
      }}
    >
      <Suspense fallback={<div className="panel fatal" role="status">Preparing your destination...</div>}>
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
              <img src={`${import.meta.env.BASE_URL}emblem.svg`} /> MYTHOVEYA
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
              src={`${import.meta.env.BASE_URL}emblem.svg`}
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
            <span>{ALL_SPECIES.length} WILDBOUND · ONE EXTRAORDINARY JOURNEY</span>
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
      {screen === "lodge" && profile && lodge && <LodgeScene site={LODGES.find(s=>s.id===lodge)!} profile={profile} busy={busy} run={run} exit={()=>{setPosition(LODGES.find(s=>s.id===lodge)!.point);setLodge(null);setNear("");setScreen("world");}}/>}
      {screen === "home" && profile && home && (
        <HomeScene
          id={home}
          profile={profile}
          busy={busy}
          run={run}
          exit={() => {
            setPosition(houseDoor(HAVEN_HOUSES.find((h) => h.id === home)!));
            setHome(null);
            setNear("");
            setScreen("world");
          }}
        />
      )}
      {screen === "world" && profile && (
        <>
          <div className={`scene full${photoMode ? " photo-shot" : ""}`} style={photoMode ? { filter: photoCss(photoFilter) } : undefined}>
            {profile.island === "festival" ? (
              <FestivalScene
                profile={profile}
                blocked={!!panel}
                onNear={setNear}
                onInteract={interact}
                onPosition={(x, z) => setPosition([x, z])}
                pet={pet}
                input={input}
              />
            ) : profile.island === "home" ? (
              <IslandScene
                profile={profile}
                blocked={!!panel}
                onNear={setNear}
                onInteract={interact}
                onPosition={(x, z) => setPosition([x, z])}
                pet={pet}
                input={input}
                placing={placing}
                onPlace={async (x, z) => {
                  if (!placing) return;
                  const done = placing.uid
                    ? await run("home-move", { id: placing.uid, x, z, rot: placing.rot })
                    : await run("home-place", { item: placing.kind, x, z, rot: placing.rot });
                  if (done) {
                    audio.cue("collect");
                    setPlacing(null);
                  }
                }}
              />
            ) : (
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
            )}
          </div>
          {photoMode && (
            <PhotoMode
              filter={photoFilter}
              setFilter={setPhotoFilter}
              caption={`${profile.name} · ${profile.island === "festival" ? "Lanternfair Isle" : profile.island === "home" ? "Hearthfall Isle" : (REGIONS.find((r) => r.id === profile.region)?.name || "Havenreach")} · Mythoveya`}
              close={() => setPhotoMode(false)}
              // A pose holds the keeper's wave and the companion's cheer a little longer.
              pose={() => {
                setPet(true);
                audio.cue("pet");
                setTimeout(() => setPet(false), 3200);
              }}
            />
          )}
          {!photoMode && <WorldHUD
            profile={profile}
            position={position}
            near={near}
            objective={objective!}
            open={open}
            interact={interact}
            input={input}
            blocked={!!panel}
            placing={!!placing}
            greet={() => {
              setPet(true);
              audio.voice(
                profile.owned.find((o) => o.id === profile.team[0])?.species ||
                  profile.owned[0].species,
              );
              audio.cue("pet");
              setTimeout(() => setPet(false), 1800);
            }}
          />}
          {placing && !panel && !photoMode && (
            <div className="placement-bar" role="toolbar" aria-label="Placing a piece">
              <strong>
                {placing.uid ? "Moving" : "Placing"} {catalogEntry(placing.kind)?.name}
              </strong>
              <small>Click your land to set it down.</small>
              <button
                onClick={() => setPlacing({ ...placing, rot: (placing.rot + 1) % 4 })}
              >
                ⟳ Rotate <kbd>Q</kbd>
              </button>
              <button onClick={() => setPlacing(null)}>
                Cancel <kbd>Esc</kbd>
              </button>
            </div>
          )}
        </>
      )}
      {screen === "battle" && battle && (
        <BattleUI
          battle={battle}
          send={battleAction}
          bond={profile ? { tokens: profile.tokens, attempt: bondAttempt } : undefined}
          auto={auto}
          setAuto={setAuto}
          fast={fast}
          setFast={setFast}
          finish={() => {
            refresh();
            setScreen("world");
            setBattle(null);
            // A first boss victory closes its chapter with an epilogue.
            const chapter = missionStage.current?.match(/^(c\d+)-4$/)?.[1],
              outro = chapter && `${profile?.id}:${chapter}:outro`;
            if (chapter && outro && battle.winner === 0 && !storySeen(outro)) {
              markStory(outro);
              setStory({ chapter, kind: "outro" });
            }
            missionStage.current = undefined;
            setPanel(
              battle.encounter === "canyon" ? "can-journal" : battle.encounter === "windmill" ? "exp-journal" : mission.current
                ? "adventure"
                : profile?.bond && !profile.bond.used
                  ? "bond"
                  : "quests",
            );
            mission.current = false;
          }}
        />
      )}
      {story && (
        <Suspense fallback={null}>
          <StoryScene
            chapter={story.chapter}
            kind={story.kind}
            onDone={() => {
              const then = story.then;
              setStory(null);
              then?.();
            }}
          />
        </Suspense>
      )}
      {screen === "fair-game" && profile && (
        <FestivalGame
          profile={profile}
          activity={fairGame}
          run={run}
          exit={() => {
            setScreen("world");
            refresh();
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
            key={panel}
            className={`panel modal ${["collection", "formation", "gallery", "town", "map", "adventure", "training", "events", "smith", "apothecary", "home", "skyferry", "festival"].includes(panel) || panel === "lodges" || panel.startsWith("rescue-") || panel.startsWith("atlas-") || panel.startsWith("cons-") || panel.startsWith("rally-") || panel.startsWith("mea-") || panel.startsWith("hol-") || panel.startsWith("can-") || panel.startsWith("exp-") || panel.startsWith("npc-") ? "wide" : ""}`}
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
            {/* Panel chunks load here without hiding the world behind them. */}
            <Suspense fallback={<p className="muted" role="status">Opening…</p>}>
            {panel === "lodges" && profile && <LodgePanel profile={profile} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")}/>}
            {panel.startsWith("rescue-") && profile && <RescuePanel profile={profile} position={position} focus={panel} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")} formation={()=>setPanel("formation")} />}
            {panel.startsWith("atlas-") && profile && <AtlasPanel profile={profile} position={position} focus={panel} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")} />}
            {panel.startsWith("cons-") && profile && <ConservancyPanel profile={profile} position={position} focus={panel} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")} />}
            {panel.startsWith("rally-") && profile && <RallyPanel profile={profile} position={position} focus={panel.slice(6)} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")} />}
            {panel.startsWith("mea-") && profile && <MeadowPanel profile={profile} position={position} focus={panel.slice(4)} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")} />}
            {panel.startsWith("hol-") && profile && <HollowPanel profile={profile} position={position} focus={panel.slice(4)} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} travel={()=>setPanel("regions")} />}
            {panel.startsWith("can-") && profile && <CanyonPanel profile={profile} position={position} focus={panel.slice(4)} busy={busy} run={run} track={id=>{setTrail(id);setPanel("");}} begin={()=>startBattle(false,false,{canyon:true})} travel={()=>setPanel("regions")} />}
            {panel.startsWith("exp-") && profile && <ExpeditionPanel profile={profile} position={position} focus={panel.slice(4)} busy={busy} run={run} track={(id) => { setTrail(id); setPanel(""); }} begin={() => startBattle(false, false, { expedition: true })} />}
            {panel === "settings" && <SettingsPanel />}
            {panel === "home" && profile && (
              <HomePanel
                profile={profile}
                run={run}
                focus={homeFocus}
                place={(p) => {
                  setPlacing(p);
                  setPanel("");
                }}
              />
            )}
            {panel === "festival" && profile && (
              <FestivalPanel
                profile={profile}
                run={run}
                tab={festTab}
                play={(game) => {
                  setFairGame(game);
                  setPanel("");
                  setScreen("fair-game");
                }}
              />
            )}
            {panel === "skyferry" && profile && (
              <SkyferryPanel profile={profile} run={run} />
            )}
            {panel === "adventure" && profile && (
              <><button className="expedition-entry" onClick={()=>setPanel("lodges")}>Wayfarer Lodges / Step inside and host a gathering</button><button className="expedition-entry" onClick={()=>setPanel("rescue-journal")}>Wildbound Rescues / Help wildlife with your companions</button><button className="expedition-entry" onClick={()=>setPanel("atlas-journal")}>The Atlas of Echoes / A journey through four memories</button><button className="expedition-entry" onClick={()=>setPanel("cons-journal")}>Wildhaven Conservancy / Craft and restore habitats</button><button className="expedition-entry" onClick={()=>setPanel("rally-journal")}>The Wayfarer Rally / Daily regional activities</button><button className="expedition-entry" onClick={()=>setPanel("mea-journal")}>The Forest Choir / Explore Whisperleaf Meadow</button><button className="expedition-entry" onClick={()=>setPanel("hol-journal")}>The Lantern Road / Explore Moonfrost Hollow</button><button className="expedition-entry" onClick={()=>setPanel("can-journal")}>Signals in the Stone / Explore Emberglass Canyon</button><button className="expedition-entry" onClick={() => setPanel("exp-journal")}>The Silent Windmill · Explore western Havenreach</button><AdventurePanel
                profile={profile}
                run={run}
                begin={beginMission}
                story={(chapter, kind) => {
                  setPanel("");
                  setStory({ chapter, kind, then: () => setPanel("adventure") });
                }}
              /></>
            )}
            {panel === "events" && profile && (
              <><button className="expedition-entry" onClick={()=>setPanel("lodges")}>Wayfarer Lodges / Step inside and host a gathering</button><button className="expedition-entry" onClick={()=>setPanel("rescue-journal")}>Wildbound Rescues / Help wildlife with your companions</button><button className="expedition-entry" onClick={()=>setPanel("atlas-journal")}>The Atlas of Echoes / A journey through four memories</button><button className="expedition-entry" onClick={()=>setPanel("cons-journal")}>Wildhaven Conservancy / Craft and restore habitats</button><button className="expedition-entry" onClick={()=>setPanel("rally-journal")}>The Wayfarer Rally / Daily regional activities</button><EventsPanel profile={profile} run={run} /></>
            )}
            {(panel === "smith" || panel === "apothecary") && profile && (
              <ShopPanel shop={panel} profile={profile} run={run} />
            )}
            {panel === "milestones" && profile && <MilestonesPanel profile={profile} />}
            {panel === "fishing" && profile && (
              <FishingPanel profile={profile} run={run} />
            )}
            {panel.startsWith("porch-") && profile && (
              <HouseVisit
                id={panel.slice(6)}
                profile={profile}
                run={run}
                enter={() => {
                  const id = panel.slice(6);
                  setPanel("");
                  setNear("");
                  // Cloudwatch Lodge's door opens onto the Wayfarer Lodge common room.
                  if (HOME_INTERIORS[id]) {
                    setHome(id);
                    setScreen("home");
                  } else {
                    setLodge("lodge-haven");
                    setScreen("lodge");
                  }
                }}
              />
            )}
            {panel.startsWith("observe-") && byId[panel.slice(8)] && (
              <div className="wildlife-note">
                <p className="eyebrow">A MOMENT IN THE WILD</p>
                <Portrait id={panel.slice(8)} />
                <h2>{byId[panel.slice(8)].name}</h2>
                <p>
                  {byId[panel.slice(8)].element} Wildbound ·{" "}
                  {byId[panel.slice(8)].role}
                </p>
                <p className="muted">
                  Watch this companion in its habitat, listen to its call, or
                  ask Ranger Tali about friendly wild encounters.
                </p>
                <div className="button-row">
                  <button onClick={() => audio.voice(panel.slice(8), "call")}>
                    Hear its call
                  </button>
                  <button onClick={() => setPanel("collection")}>
                    Open field journal
                  </button>
                  <button onClick={() => setPanel("npc-tali")}>
                    Visit Ranger Tali
                  </button>
                </div>
              </div>
            )}
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
            {panel === "map" && profile?.region === "meadow" && <MeadowMap profile={profile} position={position} trail={trail} choose={id=>{setTrail(id);setPanel("");}} regions={()=>setPanel("regions")} journal={()=>setPanel("mea-journal")} />}
            {panel === "map" && profile?.region === "hollow" && <HollowMap profile={profile} position={position} trail={trail} choose={id=>{setTrail(id);setPanel("");}} regions={()=>setPanel("regions")} journal={()=>setPanel("hol-journal")} />}
            {panel === "map" && profile?.region === "canyon" && <CanyonMap profile={profile} position={position} trail={trail} choose={id=>{setTrail(id);setPanel("");}} regions={()=>setPanel("regions")} journal={()=>setPanel("can-journal")} />}
            {panel === "map" && profile?.region === "haven" && (
              <HavenMap
                position={position}
                caches={profile.town?.caches || []}
                trail={trail}
                choose={(id) => {
                  setTrail(id);
                  setPanel("");
                }}
                regions={() => setPanel("regions")}
              />
            )}
            {(panel === "regions" ||
              (panel === "map" && profile?.region !== "haven" && profile?.region !== "canyon" && profile?.region !== "hollow" && profile?.region !== "meadow")) &&
              profile && (
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
                  <button onClick={() => setPanel("lodges")}>Wayfarer Lodges journal</button>
                  <button onClick={() => setPanel("rescue-journal")}>Wildbound Rescues journal</button>
                  <button onClick={() => setPanel("atlas-journal")}>Atlas of Echoes journal</button>
                  <button onClick={() => setPanel("cons-journal")}>Conservancy journal</button>
                  <button onClick={() => setPanel("rally-journal")}>Wayfarer Rally journal</button>
                  <button onClick={() => setPanel("mea-journal")}>The Forest Choir journal</button>
                  <button onClick={() => setPanel("hol-journal")}>The Lantern Road journal</button>
                  <button onClick={() => setPanel("can-journal")}>Signals in the Stone journal</button>
                  <button onClick={() => setPanel("exp-journal")}>The Silent Windmill journal</button>
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
                  <button
                    onClick={() => {
                      input.current.resetCamera =
                        (input.current.resetCamera || 0) + 1;
                      setPanel("");
                    }}
                  >
                    Reset exploration camera
                  </button>
                  {profile?.island ? (
                    <button
                      onClick={() => run("island-travel", { region: "haven" })}
                    >
                      Sail back to Havenreach
                    </button>
                  ) : (profile?.region === "haven" || profile?.region === "canyon" || profile?.region === "hollow" || profile?.region === "meadow") && (
                    <button
                      onClick={() => {
                        input.current.returnHome =
                          (input.current.returnHome || 0) + 1;
                        setTrail(null);
                        setPanel("");
                      }}
                    >
                      {profile?.region === "meadow" ? "Return to Whisperleaf trailhead" : profile?.region === "hollow" ? "Return to Moonfrost trailhead" : profile?.region === "canyon" ? "Return to canyon trailhead" : "Return to Havenreach village"}
                    </button>
                  )}
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
                <details className="controls-guide">
                  <summary>Controls</summary>
                  <dl>
                    <dt>Click the ground</dt>
                    <dd>Walk there along the trails</dd>
                    <dt>Click a person, home or object</dt>
                    <dd>Walk over and interact</dd>
                    <dt>WASD / arrows</dt>
                    <dd>Move directly · hold Shift to sprint</dd>
                    <dt>Drag · scroll</dt>
                    <dd>Turn the camera · zoom</dd>
                    <dt>R</dt>
                    <dd>Reset the camera</dd>
                    <dt>Esc</dt>
                    <dd>Pause or close a panel</dd>
                  </dl>
                </details>
              </>
            )}
            </Suspense>
          </section>
        </div>
      )}
      {busy && <div className="saving">✧ Saving your story…</div>}
      {toast && (
        <div role="status" className="toast" onClick={() => setToast("")}>
          {toast}
        </div>
      )}
      </Suspense>
    </main>
  );
}
