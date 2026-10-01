import { useEffect, useState } from "react";
import { CompanionGrowth } from "./CompanionGrowth";
import {
  AVATARS,
  byId,
  ELEMENTS,
  REGIONS,
  SPECIES,
  TIERS,
} from "../../../packages/shared/content";
import {
  power,
  makeBattle,
  act,
  targets,
} from "../../../packages/shared/combat";
import type { Profile, Battle } from "../../../packages/shared/types";
import { audio, settings, type Settings } from "./audio";
import { Portrait } from "./portraits";
import { Preview, BattleScene } from "./Scene";
import { api } from "./api";
import type { Motion } from "./models";
import { RecruitmentStage } from "./RecruitmentStage";
export type Mutation = (
  kind: string,
  data?: Record<string, unknown>,
) => Promise<any>;
export function SettingsPanel() {
  const [, refresh] = useState(0);
  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings[key] = value;
    audio.update();
    refresh((x) => x + 1);
  }
  return (
    <>
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h2>Sound & atmosphere</h2>
      <div className="settings-grid">
        {(["master", "music", "sfx", "ambience", "voices"] as const).map(
          (key) => (
            <label className="slider" key={key}>
              <span>
                {key === "sfx"
                  ? "Sound effects"
                  : key === "voices"
                    ? "Creature voices"
                    : key}{" "}
                <b>{Math.round(settings[key] * 100)}%</b>
              </span>
              <input
                aria-label={`${key} volume`}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={settings[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
            </label>
          ),
        )}
      </div>
      <div className="settings-grid">
        {(["mute", "reduced", "shake", "daynight"] as const).map((key) => (
          <label className="toggle" key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => change(key, e.target.checked)}
            />
            {key === "mute"
              ? "Mute all sound"
              : key === "reduced"
                ? "Reduced motion"
                : "Camera shake"}
          </label>
        ))}
        <label className="slider">
          Graphics quality
          <select
            value={settings.quality}
            onChange={(e) => change("quality", e.target.value)}
          >
            {["Low", "Medium", "High"].map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Graphics density updates when you enter another area. All sounds are
        composed and synthesized locally.
      </p>
      <button
        onClick={async () => {
          await audio.unlock();
          audio.cue("light");
          setTimeout(() => audio.voice("emberfox"), 400);
        }}
      >
        Play sound test ♫
      </button>
    </>
  );
}
export function Collection({
  profile,
  run,
  training = false,
}: {
  profile: Profile;
  run: Mutation;
  training?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [tier, setTier] = useState(""),
    [element, setElement] = useState(""),
    [role, setRole] = useState(""),
    [owned, setOwned] = useState(training ? "owned" : ""),
    [sort, setSort] = useState("roster"),
    [detail, setDetail] = useState<string | null>(null),
    [confirm, setConfirm] = useState(false);
  const list = SPECIES.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) &&
      (!tier || s.tier === tier) &&
      (!element || s.element === element) &&
      (!role || s.role === role) &&
      (!owned ||
        (owned === "owned") === profile.owned.some((o) => o.species === s.id)),
  ).sort((a, b) => {
    const oa = profile.owned.find((o) => o.species === a.id),
      ob = profile.owned.find((o) => o.species === b.id);
    return sort === "level"
      ? (ob?.level || 0) - (oa?.level || 0)
      : sort === "power"
        ? (ob ? power(ob) : 0) - (oa ? power(oa) : 0)
        : a.index - b.index;
  });
  if (detail) {
    const s = byId[detail],
      o = profile.owned.find((o) => o.species === detail);
    return (
      <>
        <button className="text-button" onClick={() => setDetail(null)}>
          ← All Wildbound
        </button>
        <div className="detail-grid">
          <div className="model-preview">
            <Preview species={detail} />
          </div>
          <div>
            <p className="eyebrow">
              TIER {s.tier} · {s.element} · {s.role}
            </p>
            <h2>{s.name}</h2>
            <p>
              {s.appearance}. A wild spirit of Mythoveya, drawn to keepers who
              share its courage.
            </p>
            <div className="stats-row">
              <span>
                HP <b>{s.stats.hp}</b>
              </span>
              <span>
                ATK <b>{s.stats.attack}</b>
              </span>
              <span>
                DEF <b>{s.stats.defense}</b>
              </span>
              <span>
                SPD <b>{s.stats.speed}</b>
              </span>
            </div>
            <p className="muted">
              Base level 1 stats · +7.5% per level · 10% critical chance ×1.5
            </p>
            {s.actions.map((a, i) => (
              <div className="ability" key={a.id}>
                <b>
                  {["I", "II", "III"][i]} · {a.name}
                </b>
                <span>
                  {a.cost} energy · {a.cooldown} round cooldown · {a.target}
                </span>
                <p>
                  {i === 0
                    ? "A direct strike. Front companions screen the rear."
                    : s.signature}{" "}
                  · {a.effects.join(" / ")}
                </p>
              </div>
            ))}
            <div className="ability">
              <b>{s.passive.name}</b>
              <p>Passive: {s.passive.effect} · small role-based benefit.</p>
            </div>
            {o ? (
              <>
                <p>
                  Level {o.level}/{profile.level} · XP {o.xp} · {o.shards}{" "}
                  shards · Upgrade {o.upgrade}/5
                </p>
                <div className="button-row">
                  <button onClick={() => run("train", { id: o.id })}>
                    Train · 50 gold
                  </button>
                  <button onClick={() => run("lock", { id: o.id })}>
                    {o.locked ? "★ Favorite" : "☆ Favorite"}
                  </button>
                  <button
                    disabled={o.shards < 3 || o.upgrade >= 5}
                    title="Requires 3 shards; adds 2% stats outside Tactical Arena"
                    onClick={() => setConfirm(true)}
                  >
                    Upgrade · 3 shards
                  </button>
                </div>
                <CompanionGrowth profile={profile} o={o} run={run} />
                {confirm && (
                  <div className="notice">
                    Spend 3 shards for +2% stats?
                    <button
                      onClick={async () => {
                        await run("upgrade", { id: o.id });
                        setConfirm(false);
                      }}
                    >
                      Confirm upgrade
                    </button>
                    <button onClick={() => setConfirm(false)}>Cancel</button>
                  </div>
                )}
              </>
            ) : (
              <p className="notice">
                Find through the bond shrine
                {s.tier <= "C" ? " or selected wild encounters" : ""}. Equal
                chance among all ten species in its tier.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <p className="eyebrow">THE FIELD JOURNAL</p>
      <h2>
        {training ? "Training grounds" : "Meet the Wildbound"}{" "}
        <small>{profile.owned.length} / 60 bonded</small>
      </h2>
      <p className="muted">Every bond begins with a little curiosity.</p>
      <div className="filters">
        <input
          placeholder="Search creatures…"
          aria-label="Search creatures"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Rarity"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="">All rarities</option>
          {TIERS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Element"
          value={element}
          onChange={(e) => setElement(e.target.value)}
        >
          <option value="">All elements</option>
          {ELEMENTS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          {["tank", "striker", "healer", "support", "controller"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Ownership"
          value={owned}
          onChange={(e) => setOwned(e.target.value)}
        >
          <option value="">All species</option>
          <option value="owned">Owned</option>
          <option value="unowned">Unowned</option>
        </select>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="roster">Roster order</option>
          <option value="power">Team power</option>
          <option value="level">Level</option>
        </select>
      </div>
      <div className="creature-grid">
        {list.map((s) => {
          const o = profile.owned.find((o) => o.species === s.id);
          return (
            <button
              key={s.id}
              className={`creature-card ${o ? "" : "unowned"}`}
              onClick={() => {
                audio.voice(s.id);
                setDetail(s.id);
              }}
            >
              <span className={`tier tier-${s.tier}`}>{s.tier}</span>
              <Portrait id={s.id} />
              <strong>{s.name}</strong>
              <span>
                {s.element} · {s.role}
              </span>
              <small>
                {o
                  ? `Lv. ${o.level} · ${power(o)} power${o.locked ? " · ★" : ""}`
                  : "Not yet bonded"}
              </small>
            </button>
          );
        })}
      </div>
      {!list.length && (
        <p className="notice">No creatures match these filters.</p>
      )}
    </>
  );
}
export function Formation({
  profile,
  run,
}: {
  profile: Profile;
  run: Mutation;
}) {
  const [slots, setSlots] = useState(profile.team),
    [selected, setSelected] = useState("");
  function place(slot: number, id = selected) {
    if (!id) return;
    const copy = [...slots],
      previous = copy.indexOf(id);
    if (previous >= 0) copy[previous] = copy[slot];
    copy[slot] = id;
    setSlots(copy);
    setSelected("");
  }
  return (
    <>
      <p className="eyebrow">FORGE YOUR SIX</p>
      <h2>A bond is stronger together</h2>
      <p className="muted">
        Select a companion below, then a slot. You can also drag a portrait.
        Front allies screen the matching rear slot.
      </p>
      {["FRONT LINE", "REAR LINE"].map((row, r) => (
        <div key={row}>
          <h3 className="eyebrow">{row}</h3>
          <div className="formation-row">
            {[0, 1, 2].map((n) => {
              const i = r * 3 + n,
                o = profile.owned.find((o) => o.id === slots[i]);
              return (
                <button
                  key={i}
                  className="formation-slot"
                  onClick={() => place(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    place(i, e.dataTransfer.getData("text/plain"));
                  }}
                >
                  {o ? (
                    <>
                      <Portrait id={o.species} />
                      <strong>{byId[o.species].name}</strong>
                      <small>
                        {byId[o.species].role} · Lv. {o.level}
                      </small>
                    </>
                  ) : (
                    <span>Empty slot</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="owned-strip">
        {profile.owned.map((o) => (
          <button
            key={o.id}
            className={selected === o.id ? "selected" : ""}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
            onClick={() => setSelected(o.id)}
          >
            <Portrait id={o.species} />
            <span>{byId[o.species].name}</span>
          </button>
        ))}
      </div>
      <button
        className="primary"
        disabled={slots.length !== 6 || new Set(slots).size !== 6}
        onClick={() => run("formation", { team: slots })}
      >
        Save formation
      </button>
    </>
  );
}
export function Quests({ profile, run }: { profile: Profile; run: Mutation }) {
  const qs = [
    [
      "tutorial",
      "A first bond",
      "Meet Liora, then win your first wild encounter.",
      profile.wins >= 1,
      "600 diamonds + 100 gold",
    ],
    [
      "recruit",
      "Answer the call",
      "Recruit a creature at the bond shrine.",
      !!profile.quests.recruit,
      "100 diamonds + 100 gold",
    ],
    [
      "formation",
      "Your own six",
      "Save a six-creature formation.",
      !!profile.quests.formation,
      "100 diamonds + 100 gold",
    ],
    [
      "explorer",
      "Beyond the meadow",
      "Win three wild encounters.",
      profile.wins >= 3,
      "100 diamonds + 100 gold",
    ],
    [
      "arena",
      "Keeper to keeper",
      "Complete a human arena match.",
      !!profile.quests.arena,
      "100 diamonds + 100 gold",
    ],
  ] as const;
  return (
    <>
      <p className="eyebrow">A KEEPER'S JOURNEY</p>
      <h2>Small steps. Lasting bonds.</h2>
      <div className="quest-list">
        {qs.map(([id, name, desc, ready, reward], i) => (
          <div className="quest" key={id}>
            <span className="quest-number">0{i + 1}</span>
            <div>
              <h3>{name}</h3>
              <p>{desc}</p>
              <small>{reward} · 60 XP</small>
            </div>
            <button
              disabled={!ready || profile.claims.includes(id)}
              onClick={async () => {
                await run("claim", { quest: id });
                audio.cue("quest");
              }}
            >
              {profile.claims.includes(id)
                ? "Claimed"
                : ready
                  ? "Claim reward"
                  : "In progress"}
            </button>
          </div>
        ))}
      </div>
      <h3>Daily adventures</h3>
      <p className="muted">
        Reset: 00:00 UTC · Server day {profile.daily.date}
      </p>
      <div className="daily-row">
        <span>
          Wild victories <b>{Math.min(3, profile.daily.wins)}/3</b>
        </span>
        <span>
          Train a creature <b>{Math.min(1, profile.daily.train)}/1</b>
        </span>
        <span>
          Gather sunseeds <b>{Math.min(3, profile.daily.resources)}/3</b>
        </span>
      </div>
      <button
        disabled={
          profile.daily.claimed ||
          profile.daily.wins < 3 ||
          profile.daily.train < 1 ||
          profile.daily.resources < 3
        }
        onClick={() => run("daily")}
      >
        {profile.daily.claimed
          ? "Daily chest claimed"
          : "Claim daily chest · 100 diamonds"}
      </button>
    </>
  );
}
export function Recruitment({
  profile,
  run,
}: {
  profile: Profile;
  run: Mutation;
}) {
  const [result, setResult] = useState<
      { species: string; duplicate: boolean }[]
    >([]),
    [busy, setBusy] = useState(false),
    [reveal, setReveal] = useState(0),
    [confirm, setConfirm] = useState(false);
  async function recruit(count: number) {
    setBusy(true);
    audio.cue("charge");
    try {
      const r = await run("recruit", { count });
      if (r) {
        setResult(r);
        setReveal(0);
        audio.cue(
          r.some((x: any) => byId[x.species].tier === "S") ? "rare" : "reveal",
        );
      }
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  return (
    <>
      <p className="eyebrow">THE BOND SHRINE</p>
      <h2>Somewhere, a Wildbound is waiting.</h2>
      <p className="muted">Offer a little starlight. Begin a new story.</p>
      {result.length ? (
        <>
          <RecruitmentStage
            key={`${reveal}-${result[reveal].species}`}
            id={result[reveal].species}
          />
          <div className="recruit-results">
            {result.map((r, i) => (
              <button
                className={`reveal-card ${reveal === i ? "selected" : ""}`}
                key={i}
                onClick={() => setReveal(i)}
                aria-label={`Meet ${byId[r.species].name}`}
                aria-pressed={reveal === i}
              >
                <span className={`tier tier-${byId[r.species].tier}`}>
                  TIER {byId[r.species].tier}
                </span>
                <Portrait id={r.species} />
                <h3>{byId[r.species].name}</h3>
                <p>{r.duplicate ? "+1 species shard" : "A new bond begins"}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setResult([])}>Continue</button>
        </>
      ) : (
        <div className="shrine-art">
          <img src="/emblem.svg" alt="Six-point bond emblem" />
          <span>✧</span>
          <p>Find your wild.</p>
        </div>
      )}
      <div className="button-row centered">
        <button
          className="primary"
          disabled={busy || profile.diamonds < 100}
          onClick={() => recruit(1)}
        >
          Bond once <span>◇ 100</span>
        </button>
        <button
          disabled={busy || profile.diamonds < 1000}
          onClick={() => setConfirm(true)}
        >
          Ten bonds <span>◇ 1,000</span>
        </button>
      </div>
      {confirm && (
        <div className="notice">
          Spend 1,000 diamonds on ten sequential recruitments?
          <button onClick={() => recruit(10)}>Confirm ten bonds</button>
          <button onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      )}
      <p className="center muted">
        Your starlight: ◇ {profile.diamonds} · Duplicates grant 1 species shard.
      </p>
      <div className="odds">
        <span>E 30%</span>
        <span>D 30%</span>
        <span>C 22%</span>
        <span>B 12%</span>
        <span>A 5%</span>
        <span>S 1%</span>
      </div>
      <p className="muted">
        Ten equally likely species per tier. A/S pity: {profile.pity.as}/30 · S
        pity: {profile.pity.s}/90. Any A/S resets the first; S resets both. Pull
        30 without A/S: A 83.33%, S 16.67%. Pull 90 without S: S 100%, taking
        priority.
      </p>
      <p className="notice">
        Next pull:{" "}
        {profile.pity.s >= 89
          ? "Guaranteed S"
          : profile.pity.as >= 29
            ? "Guaranteed A or S"
            : "Base probabilities"}
      </p>
    </>
  );
}
export function MapPanel({
  profile,
  run,
  close,
}: {
  profile: Profile;
  run: Mutation;
  close: () => void;
}) {
  return (
    <>
      <p className="eyebrow">THE FLOATING REACHES</p>
      <h2>The world is calling.</h2>
      <div className="region-grid">
        {REGIONS.map((r, i) => (
          <button
            className="region-card"
            disabled={profile.wins < r.unlock}
            key={r.id}
            onClick={async () => {
              await run("travel", { region: r.id });
              close();
            }}
            style={{ "--region": r.color } as React.CSSProperties}
          >
            <span>
              0{i + 1} /{" "}
              {profile.wins < r.unlock
                ? "LOCKED"
                : profile.region === r.id
                  ? "YOU ARE HERE"
                  : "EXPLORE"}
            </span>
            <div className="island-symbol">◇</div>
            <h3>{r.name}</h3>
            <p>{r.subtitle}</p>
            <small>
              {profile.wins < r.unlock
                ? `Win ${r.unlock} encounters to enter`
                : "Step through the waystone →"}
            </small>
          </button>
        ))}
      </div>
    </>
  );
}
export function Appearance({
  profile,
  run,
}: {
  profile: Profile;
  run: Mutation;
}) {
  const [avatar, setAvatar] = useState(profile.avatar);
  return (
    <>
      <p className="eyebrow">YOUR KEEPER</p>
      <h2>A familiar face, a new chapter.</h2>
      <div className="detail-grid">
        <div className="model-preview">
          <Preview avatar={avatar} />
        </div>
        <div className="avatar-list">
          {AVATARS.map((a, i) => (
            <button
              className={avatar === i ? "selected" : ""}
              key={a.name}
              onClick={() => setAvatar(i)}
            >
              <span style={{ background: a.coat }} />
              {a.name}
              <small>{a.desc}</small>
            </button>
          ))}
          <button className="primary" onClick={() => run("avatar", { avatar })}>
            Save appearance
          </button>
        </div>
      </div>
    </>
  );
}
export function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]),
    [mode, setMode] = useState("power-score"),
    [error, setError] = useState("");
  useEffect(() => {
    api("leaderboard")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  const list = [...rows]
    .filter((r) => mode === "power-score" || r.ranked[mode] > 0)
    .sort((a, b) =>
      mode === "power-score"
        ? b.power - a.power
        : b.ratings[mode] - a.ratings[mode],
    );
  return (
    <>
      <p className="eyebrow">KEEPERS OF MYTHOVEYA</p>
      <h2>Every journey leaves a mark.</h2>
      <div className="tabs">
        {[
          ["power-score", "Team power"],
          ["power", "Power Arena"],
          ["tactical", "Tactical Arena"],
        ].map(([m, label]) => (
          <button
            className={mode === m ? "selected" : ""}
            key={m}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="muted">
        {mode === "power-score"
          ? "Saved six-creature formations, ranked by HP + 3× attack + 2× defense + speed."
          : "Only completed ranked human matches. Initial rating 1000 · Elo K 24. Friendly rooms do not affect rating."}
      </p>
      {error && <p role="alert">{error}</p>}
      {list.length ? (
        <div className="leaderboard">
          {list.map((r, i) => (
            <div key={r.id}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{r.name}</strong>
              <span>
                {mode === "power-score"
                  ? r.power
                  : `${rank(r.ratings[mode])} · ${r.ratings[mode]}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="notice">The first ranked story is still unwritten.</p>
      )}
    </>
  );
}
function rank(n: number) {
  return n >= 1900
    ? "Mythic"
    : n >= 1700
      ? "Diamond"
      : n >= 1500
        ? "Platinum"
        : n >= 1300
          ? "Gold"
          : n >= 1100
            ? "Silver"
            : "Bronze";
}
export function Gallery() {
  const [id, setId] = useState("solkarath"),
    [query, setQuery] = useState(""),
    [motion, setMotion] = useState<Motion>("idle"),
    [paused, setPaused] = useState(false),
    [previewPhase, setPreviewPhase] = useState(0.55),
    [avatar, setAvatar] = useState(-1),
    [battle, setBattle] = useState<Battle | null>(null);
  const s = byId[id];
  function preview(n: number) {
    const owned = Array.from({ length: 6 }, (_, i) => ({
      id: `g${i}`,
      species: i === 0 ? id : SPECIES[i].id,
      level: 1,
      xp: 0,
      shards: 0,
      upgrade: 0,
      locked: false,
    }));
    const b = makeBattle("gallery", [owned, owned]);
    b.queue = ["0:0", ...b.queue.filter((x) => x !== "0:0")];
    b.energy[0] = 10;
    const t = targets(b, b.units[0], n)[0];
    act(b, 0, n, t.id);
    setBattle(b);
    audio.cue(s.element.toLowerCase());
    audio.voice(s.id, "attack");
    if (n === 2) audio.ultimate(s.id);
  }
  return (
    <>
      <p className="eyebrow">DEVELOPMENT ASSET GALLERY · READ ONLY</p>
      <h2>The Wildbound workshop</h2>
      <div className="gallery-layout">
        <aside>
          <input
            placeholder="Search all 60 species"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Preview avatar"
            value={avatar}
            onChange={(e) => {
              setAvatar(Number(e.target.value));
              setBattle(null);
            }}
          >
            <option value={-1}>Creature models</option>
            {AVATARS.map((a, i) => (
              <option key={i} value={i}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="gallery-list">
            {SPECIES.filter((s) =>
              s.name.toLowerCase().includes(query.toLowerCase()),
            ).map((s) => (
              <button
                key={s.id}
                className={id === s.id ? "selected" : ""}
                onClick={() => {
                  setId(s.id);
                  setAvatar(-1);
                  setBattle(null);
                }}
              >
                {s.tier} · {s.name}
              </button>
            ))}
          </div>
        </aside>
        <div>
          <div className="gallery-preview">
            {battle ? (
              <BattleScene
                battle={battle}
                target={battle.event?.target || ""}
                onTarget={() => {}}
                preview
                paused={paused}
                previewPhase={previewPhase}
              />
            ) : (
              <Preview
                species={avatar < 0 ? id : undefined}
                avatar={avatar}
                state={motion}
                paused={paused}
              />
            )}
          </div>
          <h3>{avatar < 0 ? s.name : AVATARS[avatar].name}</h3>
          {battle && paused && (
            <label className="effect-timeline">
              Effect phase {Math.round(previewPhase * 100)}%
              <input
                aria-label="Effect phase"
                type="range"
                min="0"
                max="99"
                value={Math.round(previewPhase * 100)}
                onChange={(e) => setPreviewPhase(Number(e.target.value) / 100)}
              />
            </label>
          )}
          <p>
            {s.family} · voice {s.voice} · {s.actions[2].presentation}
          </p>
          <div className="button-row">
            <select
              value={motion}
              onChange={(e) => {
                setMotion(e.target.value as Motion);
                setBattle(null);
              }}
            >
              {[
                "idle",
                "walk",
                "attack",
                "cast",
                "ultimate",
                "hit",
                "defeat",
                "entrance",
                "victory",
                "guard",
                "stunned",
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button onClick={() => setPaused(!paused)}>
              {paused ? "Play" : "Pause"}
            </button>
            {s.actions.map((a, i) => (
              <button key={a.id} onClick={() => preview(i)}>
                Preview {["basic", "skill", "ultimate"][i]}
              </button>
            ))}
          </div>
          <div className="button-row">
            {["call", "attack", "hurt"].map((v) => (
              <button key={v} onClick={() => audio.voice(id, v)}>
                {v} voice ♫
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
