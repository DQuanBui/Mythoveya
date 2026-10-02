import { useState } from "react";
import { byId } from "../../../packages/shared/content";
import type { Profile } from "../../../packages/shared/types";
import {
  CATALOG,
  HABITAT_CAPACITY,
  HABITAT_STORAGE_HOURS,
  HOME_EXPANSIONS,
  HOUSE_LEVELS,
  ISLANDS,
  OPEN_ISLANDS,
  catalogEntry,
  defaultHome,
  habitatRate,
  habitatStored,
  islandUnlocked,
  residentRate,
  unlockHint,
  type HomeItem,
} from "../../../packages/shared/islands";
import { Portrait } from "./portraits";
import type { Placing } from "./HomeIsland";

type Run = (kind: string, value?: any) => Promise<any>;
const TABS = [
  ["build", "✚ Build"],
  ["placed", "▦ Placed"],
  ["habitats", "⌂ Habitats"],
  ["house", "▲ House & land"],
] as const;

/** The house ledger: build from the catalog, rearrange, care for habitats and grow the island. */
export function HomePanel({
  profile,
  run,
  focus,
  place,
}: {
  profile: Profile;
  run: Run;
  focus?: string;
  place: (p: Placing) => void;
}) {
  const home = profile.home || defaultHome(),
    house = HOUSE_LEVELS[home.house];
  const [tab, setTab] = useState<(typeof TABS)[number][0]>(focus ? "habitats" : "build");
  const count = (type: "decor" | "habitat") =>
    home.items.filter((i) => catalogEntry(i.kind)?.type === type).length;
  const habitats = home.items.filter((i) => catalogEntry(i.kind)?.type === "habitat");
  const stored = habitats.reduce((n, i) => n + habitatStored(profile, home, i), 0);
  return (
    <div className="home-panel">
      <p className="eyebrow">{ISLANDS.home.name.toUpperCase()} · YOUR ISLAND</p>
      <h2>{house.name}</h2>
      <div className="supply-bag">
        <span>◉ Gold <b>{profile.gold.toLocaleString()}</b></span>
        <span>◆ Diamonds <b>{profile.diamonds.toLocaleString()}</b></span>
        <span>Decorations <b>{count("decor")}/{house.decor}</b></span>
        <span>Habitats <b>{count("habitat")}/{house.habitats}</b></span>
        <span>Island <b>{HOME_EXPANSIONS[home.expansion].radius} m</b></span>
      </div>
      <div className="adventure-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "build" && (
        <div className="market-stock home-catalog">
          {CATALOG.filter((c) => !c.tickets).map((c) => {
            const full = count(c.type) >= (c.type === "habitat" ? house.habitats : house.decor),
              locked = home.house < c.house;
            return (
              <article key={c.kind} className={c.type === "habitat" ? "habitat-card" : ""}>
                <span className="item-symbol">{c.icon}</span>
                <h3>{c.name}</h3>
                <p>
                  {c.type === "habitat"
                    ? `Home for up to ${HABITAT_CAPACITY} companions. ${c.element} companions earn half again as much Gold here.`
                    : `A ${c.w}×${c.d} decoration for your island.`}
                </p>
                <small>{c.gold} Gold · {c.w}×{c.d} m</small>
                <button
                  disabled={locked || full || profile.gold < c.gold}
                  onClick={() => place({ kind: c.kind, rot: 0 })}
                >
                  {locked
                    ? `Needs the ${HOUSE_LEVELS[c.house].name}`
                    : full
                      ? "Upgrade your house for more"
                      : profile.gold < c.gold
                        ? "Not enough Gold"
                        : "Choose a spot →"}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {tab === "placed" &&
        (home.items.length ? (
          <ul className="home-placed">
            {home.items.map((item) => {
              const e = catalogEntry(item.kind)!;
              return (
                <li key={item.uid}>
                  <span className="item-symbol">{e.icon}</span>
                  <strong>{e.name}</strong>
                  <small>
                    {item.x}, {item.z}
                  </small>
                  <button onClick={() => place({ kind: item.kind, uid: item.uid, rot: item.rot })}>Move</button>
                  <button onClick={() => run("home-remove", { id: item.uid })}>
                    Pack away · +{Math.floor(e.gold / 2)} Gold
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">Nothing placed yet. Choose something from the Build tab.</p>
        ))}
      {tab === "habitats" && (
        <>
          <div className="home-collect">
            <p className="muted">
              Companions living in habitats earn Gold every hour, up to {HABITAT_STORAGE_HOURS} hours of
              storage. They still join your battles as usual.
            </p>
            <button className="primary" disabled={!stored} onClick={() => run("home-collect")}>
              Collect {stored} Gold
            </button>
          </div>
          {habitats.length ? (
            habitats.map((item) => (
              <HabitatCard key={item.uid} item={item} profile={profile} run={run} focused={item.uid === focus} />
            ))
          ) : (
            <p className="muted">Build a habitat from the Build tab, then move companions in.</p>
          )}
        </>
      )}
      {tab === "house" && <HouseTab profile={profile} run={run} />}
    </div>
  );
}
function HabitatCard({ item, profile, run, focused }: { item: HomeItem; profile: Profile; run: Run; focused: boolean }) {
  const home = profile.home!,
    entry = catalogEntry(item.kind)!,
    ids = home.residents[item.uid] || [],
    living = new Set(Object.values(home.residents).flat());
  const [choosing, setChoosing] = useState(false);
  const candidates = profile.owned
    .filter((o) => !ids.includes(o.id))
    .sort(
      (a, b) =>
        Number(byId[b.species]?.element === entry.element) - Number(byId[a.species]?.element === entry.element) ||
        residentRate(b, entry.element) - residentRate(a, entry.element),
    );
  return (
    <section className={`habitat-card-row ${focused ? "focused" : ""}`} data-habitat={item.uid}>
      <header>
        <h3>{entry.name}</h3>
        <small>
          {entry.element} habitat · {ids.length}/{HABITAT_CAPACITY} · {habitatRate(profile, home, item)} Gold/hour ·{" "}
          {habitatStored(profile, home, item)} stored
        </small>
      </header>
      <div className="habitat-residents">
        {ids.map((id) => {
          const o = profile.owned.find((o) => o.id === id);
          if (!o) return null;
          return (
            <div key={id} className="resident">
              <Portrait id={o.species} />
              <span>
                {o.nickname || byId[o.species].name}
                <small>
                  Lv {o.level} · {residentRate(o, entry.element)} Gold/h · ♥ {o.friendship || 0}
                </small>
              </span>
              <button onClick={() => run("home-unassign", { id })}>Move out</button>
            </div>
          );
        })}
        {ids.length < HABITAT_CAPACITY && (
          <button className="resident add" onClick={() => setChoosing(!choosing)}>
            {choosing ? "Close" : "+ Move a companion in"}
          </button>
        )}
      </div>
      {choosing && (
        <div className="resident-picker">
          {candidates.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setChoosing(false);
                run("home-assign", { quest: item.uid, id: o.id });
              }}
            >
              <Portrait id={o.species} />
              <span>
                {o.nickname || byId[o.species].name}
                <small>
                  {byId[o.species].element} · {residentRate(o, entry.element)} Gold/h
                  {living.has(o.id) ? " · moves from another habitat" : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
function HouseTab({ profile, run }: { profile: Profile; run: Run }) {
  const home = profile.home || defaultHome(),
    next = HOUSE_LEVELS[home.house + 1],
    land = HOME_EXPANSIONS[home.expansion + 1];
  return (
    <div className="home-upgrades">
      <article>
        <span className="item-symbol">⌂</span>
        <h3>{next ? `Build the ${next.name}` : "Your manor is complete"}</h3>
        {next ? (
          <>
            <p>
              Room for {next.habitats} habitats and {next.decor} decorations, and new pieces in the catalog.
            </p>
            <small>
              {next.gold} Gold · keeper level {next.level}
            </small>
            <button disabled={profile.level < next.level || profile.gold < next.gold} onClick={() => run("home-house")}>
              {profile.level < next.level
                ? `Reach level ${next.level}`
                : profile.gold < next.gold
                  ? "Not enough Gold"
                  : "Upgrade house"}
            </button>
          </>
        ) : (
          <p>Every room is built. Fill the island with habitats and decorations.</p>
        )}
      </article>
      <article>
        <span className="item-symbol">◌</span>
        <h3>{land ? `Expand to ${land.radius} m` : "Your island is full size"}</h3>
        {land ? (
          <>
            <p>New land rises from the clouds around your island, with room for more habitats and gardens.</p>
            <small>
              {land.gold} Gold{land.diamonds ? ` · ${land.diamonds} Diamonds` : ""} · keeper level {land.level}
            </small>
            <button
              disabled={profile.level < land.level || profile.gold < land.gold || profile.diamonds < land.diamonds}
              onClick={() => run("home-expand")}
            >
              {profile.level < land.level
                ? `Reach level ${land.level}`
                : profile.gold < land.gold || profile.diamonds < land.diamonds
                  ? "Not enough Gold or Diamonds"
                  : "Expand island"}
            </button>
          </>
        ) : (
          <p>The clouds can't hold any more land.</p>
        )}
      </article>
    </div>
  );
}

/** Skyferry destinations, from any dock or from the pause menu. */
export function SkyferryPanel({ profile, run }: { profile: Profile; run: Run }) {
  const here = profile.island || "haven";
  const stops = [
    {
      id: "haven",
      name: "Havenreach",
      subtitle: "The village, the Riftgate and every trail you know",
      open: true,
      hint: "",
    },
    ...OPEN_ISLANDS.map((id) => ({
      id,
      name: ISLANDS[id].name,
      subtitle: ISLANDS[id].subtitle,
      open: islandUnlocked(profile, id),
      hint: unlockHint(id),
    })),
  ];
  return (
    <div className="skyferry-panel">
      <p className="eyebrow">THE SKYFERRY · ALWAYS ON TIME</p>
      <h2>Where to, keeper?</h2>
      <p className="muted">
        Ferries land at each island's dock. You can always sail back to Havenreach from any dock or from the pause menu.
      </p>
      <div className="market-stock">
        {stops.map((s) => (
          <article key={s.id} className={s.id === here ? "here" : ""} data-destination={s.id}>
            <span className="item-symbol">{s.id === "haven" ? "✦" : "⛵"}</span>
            <h3>{s.name}</h3>
            <p>{s.subtitle}</p>
            <small>{s.id === here ? "You are here" : s.open ? "Ferry waiting" : s.hint}</small>
            <button
              disabled={s.id === here || !s.open}
              onClick={() => run("island-travel", { region: s.id })}
            >
              {s.id === here ? "You are here" : s.open ? "Sail →" : "Locked"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
