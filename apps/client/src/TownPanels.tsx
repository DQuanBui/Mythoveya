import { useEffect, useState } from "react";
import {
  NPCS,
  ITEMS,
  FISH,
  townOf,
  missionProgress,
  npcSignal,
  dailyStock,
  utcDay,
  utcWeek,
  arenaTier,
  type TownNPC,
  type TownReward,
} from "../../../packages/shared/town";
import { byId } from "../../../packages/shared/content";
import type { Profile } from "../../../packages/shared/types";
import type { Mutation } from "./Panels";
import { Preview } from "./Scene";
import { Portrait } from "./portraits";

function rewardText(r: TownReward) {
  return Object.entries(r)
    .map(
      ([key, n]) =>
        `${n} ${{ gold: "Gold", diamonds: "Diamonds", xp: "XP", tokens: "bond token", sunseed: "Sunseed", treat: "treat" }[key as keyof TownReward]}`,
    )
    .join(" · ");
}
export function TownDirectory({
  profile,
  open,
}: {
  profile: Profile;
  open: (id: string) => void;
}) {
  const t = townOf(profile);
  return (
    <>
      <p className="eyebrow">PEOPLE OF THE REACHES</p>
      <h2>A village becomes a home.</h2>
      <p className="muted">
        Eight stories to discover. Help your neighbors, unlock their daily
        support, and bring a little more life to your journey.
      </p>
      <div className="town-summary">
        {t.claims.length}/16 missions completed · {t.helpers.length}/8 helpers
      </div>
      <div className="town-directory">
        {NPCS.map((n) => (
          <button key={n.id} onClick={() => open(`npc-${n.id}`)}>
            <span className={`villager-seal villager-${n.id}`}>
              {n.id.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h3>{n.name}</h3>
              <p>{n.role}</p>
              <small>
                {t.helpers.includes(n.id)
                  ? "♡ Your helper"
                  : `${n.missions.filter((m) => t.claims.includes(m.id)).length}/2 missions completed`}
              </small>
            </div>
            <b>{npcSignal(profile, n)}</b>
          </button>
        ))}
      </div>
    </>
  );
}
export function NpcPanel({
  npc,
  profile,
  run,
  open,
  close,
  startBattle,
}: {
  npc: TownNPC;
  profile: Profile;
  run: Mutation;
  open: (id: string) => void;
  close: () => void;
  startBattle: (boss?: boolean, practice?: boolean) => void;
}) {
  const [topic, setTopic] = useState(-1),
    [tab, setTab] = useState("story"),
    [waiting, setWaiting] = useState(false),
    [now, setNow] = useState(Date.now());
  const t = townOf(profile);
  const act: Mutation = async (kind, data) => {
    setWaiting(true);
    try {
      return await run(kind, data);
    } finally {
      setWaiting(false);
    }
  };
  useEffect(() => {
    if (!t.met.includes(npc.id)) void run("town-talk", { npc: npc.id });
    setTopic(-1);
    setTab("story");
  }, [npc.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const next = npc.missions.find((m) => !t.claims.includes(m.id));
  return (
    <div className="npc-panel">
      <div className="npc-heading">
        <div className="npc-preview">
          <Preview avatar={npc.avatar} />
        </div>
        <div>
          <p className="eyebrow">{npc.role}</p>
          <h2>{npc.name}</h2>
          <p className="npc-greeting">“{npc.greeting}”</p>
          {t.helpers.includes(npc.id) && (
            <span className="helper-badge">♡ Part of your circle</span>
          )}
        </div>
      </div>
      <div
        className="town-tabs"
        role="tablist"
        aria-label="Villager activities"
      >
        {[
          ["story", "Conversation"],
          ["missions", "Missions"],
          ["services", "Services"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "missions" &&
            next &&
            missionProgress(profile, next) >= next.goal
              ? " · ?"
              : ""}
          </button>
        ))}
      </div>
      {tab === "story" && (
        <div className="dialogue-area">
          <div className="dialogue-topics">
            {npc.topics.map((x, i) => (
              <button
                key={x.title}
                className={topic === i ? "selected" : ""}
                onClick={() => setTopic(i)}
              >
                {x.title} →
              </button>
            ))}
          </div>
          <div className="dialogue-reply" aria-live="polite">
            {topic < 0 ? (
              <>
                <h3>A moment to talk</h3>
                <p>
                  Choose something to ask{" "}
                  {npc.id === "pip" ? "Pip" : npc.name.split(" ").at(-1)}.
                </p>
              </>
            ) : (
              npc.topics[topic].lines.map((line) => <p key={line}>{line}</p>)
            )}
          </div>
        </div>
      )}
      {tab === "missions" && (
        <div className="village-missions">
          {npc.missions.map((m) => {
            const claimed = t.claims.includes(m.id),
              active = next?.id === m.id,
              progress = missionProgress(profile, m);
            return (
              <article key={m.id} className={claimed ? "mission-complete" : ""}>
                <p className="eyebrow">
                  {claimed
                    ? "COMPLETED"
                    : active
                      ? "YOUR NEXT STEP"
                      : "COMING NEXT"}
                </p>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                <progress
                  aria-label={`${m.title} progress`}
                  max={m.goal}
                  value={progress}
                />
                <small>
                  {progress}/{m.goal} · {rewardText(m.reward)}
                </small>
                <button
                  disabled={waiting || claimed || !active || progress < m.goal}
                  onClick={() =>
                    act("town-claim", { npc: npc.id, quest: m.id })
                  }
                >
                  {claimed
                    ? "Reward collected"
                    : !active
                      ? "Finish the previous mission"
                      : progress < m.goal
                        ? "Objective in progress"
                        : "Claim mission reward"}
                </button>
              </article>
            );
          })}
          {next && (
            <button
              onClick={async () => {
                const r = await act("town-track", { npc: npc.id });
                if (r !== undefined) close();
              }}
            >
              Track this story in the world ◆
            </button>
          )}
          <div className="helper-card">
            <h3>
              {t.helpers.includes(npc.id)
                ? "A friend on your journey"
                : "A future helper"}
            </h3>
            <p>{npc.helper}</p>
            <small>
              {rewardText(npc.daily)} · refreshes daily at 00:00 UTC
            </small>
            <button
              disabled={
                waiting ||
                !t.helpers.includes(npc.id) ||
                t.helperDays[npc.id] === utcDay(now)
              }
              onClick={() => act("town-helper", { npc: npc.id })}
            >
              {!t.helpers.includes(npc.id)
                ? "Complete both missions to unlock"
                : t.helperDays[npc.id] === utcDay(now)
                  ? "Today's help collected"
                  : "Collect daily help"}
            </button>
          </div>
        </div>
      )}
      {tab === "services" && (
        <div className="npc-services">
          {npc.id === "liora" && (
            <>
              <h3>Your first six</h3>
              <p>
                Five companions are ready to join your starter. Every keeper
                begins with a complete team.
              </p>
              <button
                className="primary"
                disabled={waiting}
                onClick={async () => {
                  const r = await act("guide");
                  if (r !== undefined) close();
                }}
              >
                {profile.quests.guide
                  ? "Thank you, Liora"
                  : "Accept companions & quest"}
              </button>
              <button onClick={() => open("quests")}>
                Story & daily quests
              </button>
              <button onClick={() => open("map")}>Explore the reaches</button>
            </>
          )}
          {npc.id === "sella" && (
            <>
              <div className="button-row">
                <button className="primary" onClick={() => open("recruit")}>
                  Recruit at the shrine
                </button>
                <button onClick={() => open("formation")}>
                  Arrange your party
                </button>
              </div>
              <CompanionCare profile={profile} run={act} rename />
            </>
          )}
          {npc.id === "bram" && (
            <>
              <h3>Practice makes a keeper</h3>
              <p>
                Practice uses a computer opponent and leaves your ratings
                unchanged.
              </p>
              <div className="button-row">
                <button className="primary" onClick={() => open("training")}>
                  Train companions
                </button>
                <button onClick={() => startBattle(false, true)}>
                  Start daily sparring
                </button>
              </div>
              <div className="notice">
                Daily sparring reward: 40 Gold + 10 Diamonds
                <button
                  disabled={
                    waiting ||
                    t.sparWon !== utcDay(now) ||
                    t.sparClaimed === utcDay(now)
                  }
                  onClick={() => act("town-spar")}
                >
                  {t.sparClaimed === utcDay(now)
                    ? "Sparring reward collected"
                    : t.sparWon !== utcDay(now)
                      ? "Win a practice battle today"
                      : "Claim sparring reward"}
                </button>
              </div>
            </>
          )}
          {npc.id === "kael" && (
            <>
              <div className="arena-tiers">
                <div>
                  <small>POWER</small>
                  <h3>{arenaTier(profile.ratings.power)}</h3>
                  <b>{profile.ratings.power}</b>
                </div>
                <div>
                  <small>TACTICAL</small>
                  <h3>{arenaTier(profile.ratings.tactical)}</h3>
                  <b>{profile.ratings.tactical}</b>
                </div>
              </div>
              <button className="primary" onClick={() => open("arena")}>
                Enter the Rift arena
              </button>
              <div className="notice">
                <h3>This week's guardian bounty</h3>
                <p>
                  Defeat a region guardian this UTC week. Reward: 120 Diamonds
                  and 70 Gold.
                </p>
                <button onClick={() => startBattle(true)}>
                  Challenge the region guardian
                </button>
                <button
                  disabled={
                    waiting ||
                    t.guardianWeek !== utcWeek(now) ||
                    t.guardianClaimed === utcWeek(now)
                  }
                  onClick={() => act("town-weekly")}
                >
                  {t.guardianClaimed === utcWeek(now)
                    ? "Weekly bounty collected"
                    : "Claim weekly bounty"}
                </button>
              </div>
            </>
          )}
          {npc.id === "oren" && (
            <>
              <h3>
                {new Set(profile.owned.map((o) => o.species)).size} of 60
                stories discovered
              </h3>
              <p>
                Your field journal includes appearance notes, elements, roles,
                actions, and passives for every Wildbound.
              </p>
              <button className="primary" onClick={() => open("collection")}>
                Open the creature journal
              </button>
              <button onClick={() => open("quests")}>Review your quests</button>
            </>
          )}
          {npc.id === "tali" && (
            <>
              <h3>Follow a little curiosity</h3>
              <p>
                Make sure all six formation slots are filled. The wild encounter
                uses this region's creature roster.
              </p>
              <button className="primary" onClick={() => startBattle()}>
                Begin a wild encounter
              </button>
              <button onClick={() => open("map")}>Study the habitats</button>
            </>
          )}
          {npc.id === "pip" && (
            <>
              <Market profile={profile} run={act} waiting={waiting} now={now} />
              <CompanionCare profile={profile} run={act} accessories />
            </>
          )}
          {npc.id === "wren" && (
            <>
              <Garden profile={profile} run={act} waiting={waiting} now={now} />
              <CompanionCare profile={profile} run={act} />
            </>
          )}
        </div>
      )}
      {npc.id === "liora" && !profile.quests.guide && tab !== "services" && (
        <button
          className="primary npc-first-team"
          disabled={waiting}
          onClick={async () => {
            const r = await act("guide");
            if (r !== undefined) close();
          }}
        >
          Accept companions & quest
        </button>
      )}
      <button
        className="text-button town-directory-link"
        onClick={() => open("town")}
      >
        Meet the other villagers →
      </button>
    </div>
  );
}
function Bag({ profile }: { profile: Profile }) {
  const t = townOf(profile);
  return (
    <div className="supply-bag" aria-label="Supplies">
      {Object.entries(ITEMS).map(([id, item]) => (
        <span key={id} title={item.description}>
          {item.icon} {item.name} <b>{t.inventory[id] || 0}</b>
        </span>
      ))}
    </div>
  );
}
function Market({
  profile,
  run,
  waiting,
  now,
}: {
  profile: Profile;
  run: Mutation;
  waiting: boolean;
  now: number;
}) {
  const t = townOf(profile);
  return (
    <>
      <h3>Pip's daily market</h3>
      <p className="muted">
        Stock refreshes at 00:00 UTC. All purchases use Gold.
      </p>
      <Bag profile={profile} />
      <div className="market-stock">
        {dailyStock(now).map((id) => {
          const item = ITEMS[id],
            left =
              item.stock -
              (t.stock.date === utcDay(now) ? t.stock.bought[id] || 0 : 0);
          return (
            <article key={id}>
              <span className="item-symbol">{item.icon}</span>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <small>
                {left} remaining today · {item.buy} Gold
              </small>
              <button
                disabled={waiting || left <= 0 || profile.gold < item.buy}
                onClick={() => run("town-buy", { item: id })}
              >
                {left <= 0 ? "Sold out" : `Buy ${item.name}`}
              </button>
            </article>
          );
        })}
      </div>
      <div className="button-row">
        {(
          [
            "sunseed",
            "treat",
            ...FISH.filter((f) => t.inventory[f] > 0),
          ] as const
        ).map((id) => (
          <button
            key={id}
            disabled={waiting || !(t.inventory[id] > 0)}
            onClick={() => run("town-sell", { item: id })}
          >
            Sell 1 {ITEMS[id].name} · +{ITEMS[id].sell} Gold
          </button>
        ))}
      </div>
    </>
  );
}
function Garden({
  profile,
  run,
  waiting,
  now,
}: {
  profile: Profile;
  run: Mutation;
  waiting: boolean;
  now: number;
}) {
  const t = townOf(profile),
    seconds = t.garden
      ? Math.max(0, Math.ceil((t.garden.readyAt - now) / 1000))
      : 0;
  return (
    <>
      <h3>A little patch of possibility</h3>
      <Bag profile={profile} />
      <div className="garden-bed">
        <span>✿</span>
        <div>
          <h3>
            {!t.garden
              ? "Ready for a seed"
              : seconds
                ? "Something is growing"
                : "Your crop is ready"}
          </h3>
          <p>
            {!t.garden
              ? "Plant 1 Sunseed. Harvest 3 after two minutes."
              : seconds
                ? `${Math.floor(seconds / 60)}m ${seconds % 60}s until harvest. Growth continues while you are away.`
                : "Harvest your three Sunseed and plant again."}
          </p>
        </div>
        <button
          disabled={
            waiting || (!t.garden && t.inventory.sunseed < 1) || !!seconds
          }
          onClick={() => run(t.garden ? "town-harvest" : "town-plant")}
        >
          {!t.garden ? "Plant Sunseed" : seconds ? "Growing…" : "Harvest crop"}
        </button>
      </div>
      <div className="craft-recipe">
        <div>
          <h3>Companion treat</h3>
          <p>2 Sunseed + 10 Gold → 1 treat</p>
        </div>
        <button
          disabled={waiting || t.inventory.sunseed < 2 || profile.gold < 10}
          onClick={() => run("town-craft")}
        >
          Craft treat
        </button>
      </div>
    </>
  );
}
function CompanionCare({
  profile,
  run,
  rename = false,
  accessories = false,
}: {
  profile: Profile;
  run: Mutation;
  rename?: boolean;
  accessories?: boolean;
}) {
  const [id, setId] = useState(profile.team[0] || profile.owned[0]?.id || ""),
    [nickname, setNickname] = useState("");
  const o = profile.owned.find((o) => o.id === id),
    t = townOf(profile);
  if (!o) return null;
  return (
    <div className="companion-care">
      <h3>
        {rename
          ? "A name between friends"
          : accessories
            ? "A little personal touch"
            : "Share a treat"}
      </h3>
      <select
        aria-label="Companion to care for"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          setNickname("");
        }}
      >
        {profile.owned.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nickname || byId[o.species].name} · Lv {o.level}
          </option>
        ))}
      </select>
      <div className="care-detail">
        <Portrait id={o.species} />
        <div>
          <strong>{o.nickname || byId[o.species].name}</strong>
          <p>
            {byId[o.species].name} · Friendship {o.friendship || 0}/100
          </p>
          <progress
            aria-label="Companion friendship"
            max={100}
            value={o.friendship || 0}
          />
        </div>
      </div>
      {rename ? (
        <div className="button-row">
          <input
            aria-label="Companion nickname"
            placeholder="A name for your friend"
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button
            disabled={!nickname.trim()}
            onClick={() => run("town-rename", { id, nickname })}
          >
            Save nickname
          </button>
          {o.nickname && (
            <button onClick={() => run("town-rename", { id, nickname: "" })}>
              Restore species name
            </button>
          )}
        </div>
      ) : accessories ? (
        <div className="button-row">
          {(["ribbon", "bell"] as const).map((item) => (
            <button
              key={item}
              disabled={o.accessory === item || !(t.inventory[item] > 0)}
              onClick={() => run("town-equip", { id, item })}
            >
              {o.accessory === item ? "Wearing" : "Equip"} {ITEMS[item].name}
            </button>
          ))}
          {o.accessory && (
            <button onClick={() => run("town-equip", { id, item: "none" })}>
              Remove accessory
            </button>
          )}
        </div>
      ) : (
        <button
          disabled={!(t.inventory.treat > 0) || (o.friendship || 0) >= 100}
          onClick={() => run("town-feed", { id })}
        >
          Feed 1 treat · +10 friendship · +30 XP
        </button>
      )}
    </div>
  );
}
