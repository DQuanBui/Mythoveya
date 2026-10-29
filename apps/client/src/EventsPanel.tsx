import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { utcDay } from "../../../packages/shared/town";
import { RARITIES, rewardText } from "../../../packages/shared/adventure";
import {
  LOGIN_REWARDS,
  MONTHLY,
  MONTHLY_CHEST,
  WEEKLY,
  WEEKLY_CHEST,
  FEATURED_CHEST,
  FEATURED_WEEKS,
  featuredWeek,
  type EventMission,
  type EventReward,
  missionDone,
  nextLoginDay,
  utcMonth,
  weekKey,
} from "../../../packages/shared/events";
import { SEASONS, activeSeason } from "../../../packages/shared/seasons";
import type { TownReward } from "../../../packages/shared/town";

const describe = (r: EventReward) =>
  [rewardText(r), r.gear ? `${RARITIES[r.gear]} equipment` : ""]
    .filter(Boolean)
    .join(" · ");
const ICON = (r: EventReward) =>
  r.gear ? "⚔" : r.diamonds ? "◇" : r.crystal ? "✧" : r.tome ? "❖" : r.elixir ? "⚱" : r.dust ? "⁂" : "◉";

const townReward = (r: TownReward) =>
  Object.entries(r)
    .map(([k, n]) =>
      k === "tokens" ? `${n} bond token${n === 1 ? "" : "s"}` : k === "xp" ? `${n} keeper XP` : k === "treat" ? `${n} treat` : `${n} ${k[0].toUpperCase()}${k.slice(1)}`,
    )
    .join(" · ");

export function EventsPanel({
  profile,
  run,
}: {
  profile: Profile;
  run: (kind: string, value?: any) => Promise<any>;
}) {
  const now = Date.now(),
    today = utcDay(now),
    season = activeSeason(now);
  const [tab, setTab] = useState<"season" | "featured" | "login" | "weekly" | "monthly">(season ? "season" : "featured");
  // Mirror the server's period resets so stale counters never show.
  const raw = profile.events,
    e = {
      login: raw?.login || { day: 0, last: "" },
      weekly: raw?.week === weekKey(now) ? raw.weekly : {},
      monthly: raw?.month === utcMonth(now) ? raw.monthly : {},
      claimed: (raw?.claimed || []).filter(
        (id) =>
          (raw?.week === weekKey(now) || !(id.startsWith("w-") || id === "weekly-chest")) &&
          (raw?.month === utcMonth(now) || !(id.startsWith("m-") || id === "monthly-chest")),
      ),
      week: weekKey(now),
      month: utcMonth(now),
    };
  const featured = featuredWeek(now),
    stamps = raw?.stamps || [];
  const ready = e.login.last !== today,
    next = nextLoginDay(e);
  const resets = (days: number) => `${days} day${days === 1 ? "" : "s"}`;
  const toMonday = 7 - ((new Date(now).getUTCDay() + 6) % 7),
    d = new Date(now),
    toMonth = Math.ceil(
      (Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - now) / 86400000,
    );
  // Days already claimed in the current 30-day cycle (a finished cycle shows full until the next claim).
  const inCycle =
    e.login.day === 0 || (ready && next === 1) ? 0 : ((e.login.day - 1) % 30) + 1;
  return (
    <div className="events">
      <p className="eyebrow">EVENTS · COME BACK EVERY DAY</p>
      <h2>Gifts, missions and milestones.</h2>
      <div className="adventure-tabs" role="tablist">
        {(
          [
            ...(season ? [["season", `${season.season.prop === "gourd" ? "🎃" : "❄"} ${season.season.name}`] as const] : []),
            ["featured", `${featured.icon} ${featured.name}`],
            ["login", "✦ 30-day login"],
            ["weekly", "◈ Weekly missions"],
            ["monthly", "❂ Monthly missions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "selected" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "login" && (
        <>
          <p className="muted">
            Claim one gift each UTC day. Missing a day never resets your
            progress. Days 7, 14, 21 and 30 hold guaranteed equipment.
          </p>
          <div className="login-grid">
            {LOGIN_REWARDS.map((r, i) => {
              const day = i + 1,
                claimed = day <= inCycle,
                today_ = day === next && ready;
              return (
                <div
                  key={day}
                  className={`login-day ${claimed ? "claimed" : ""} ${today_ ? "today" : ""} ${[7, 14, 21, 30].includes(day) ? "milestone" : ""}`}
                  title={describe(r)}
                >
                  <small>Day {day}</small>
                  <span aria-hidden="true">{claimed ? "✓" : ICON(r)}</span>
                  <em>{describe(r)}</em>
                </div>
              );
            })}
          </div>
          <button
            className="primary"
            disabled={!ready}
            onClick={() => run("login-claim")}
          >
            {ready ? `Claim day ${next} gift` : "Today's gift is claimed · come back tomorrow"}
          </button>
        </>
      )}
      {tab === "season" && season && (() => {
        const found = profile.seasons?.key === season.key ? profile.seasons.found : [],
          { season: s } = season;
        return (
          <>
            <div className={`featured-week season-${s.id}`} style={{ "--theme": s.prop === "gourd" ? "#e0782e" : "#7cc8ff" } as React.CSSProperties}>
              <span aria-hidden="true">{s.prop === "gourd" ? "🎃" : "❄"}</span>
              <div>
                <small>SEASONAL FESTIVAL · HAVENREACH</small>
                <h3>{s.name}</h3>
                <p>{s.blurb}</p>
              </div>
            </div>
            <p className="muted">
              Each lantern: {townReward(s.find)}. All {s.spots.length}: {townReward(s.complete)}. Walk up to a
              glowing lantern in Havenreach and click it.
            </p>
            <h3>
              Lanterns found · {found.length}/{s.spots.length}
            </h3>
            <ul className="season-clues">
              {s.spots.map((spot) => (
                <li key={spot.id} className={found.includes(spot.id) ? "found" : ""}>
                  <span aria-hidden="true">{found.includes(spot.id) ? "✓" : "○"}</span>
                  {spot.clue}
                </li>
              ))}
            </ul>
            {!!profile.seasons?.done.length && (
              <p className="event-stamps">
                Festivals completed:{" "}
                {profile.seasons.done
                  .map((k) => `${SEASONS.find((x) => k.startsWith(x.id))?.name || k} ${k.slice(-4)}`)
                  .join(" · ")}
              </p>
            )}
          </>
        );
      })()}
      {tab === "featured" && (
        <>
          <div
            className="featured-week"
            style={{ "--theme": featured.color } as React.CSSProperties}
          >
            <span aria-hidden="true">{featured.icon}</span>
            <div>
              <small>THIS WEEK'S EVENT</small>
              <h3>{featured.name}</h3>
              <p>{featured.blurb}</p>
            </div>
          </div>
          <Missions
            list={featured.missions}
            counts={e.weekly}
            claimed={e.claimed}
            chest={featured.chest}
            chestId={FEATURED_CHEST}
            resets={`A new event begins Monday 00:00 UTC · ${resets(toMonday)} left`}
            run={run}
          />
          <div className="event-stamps" aria-label="Event stamps">
            <small>EVENT STAMPS · {stamps.length}/{FEATURED_WEEKS.length}</small>
            <div>
              {FEATURED_WEEKS.map((w) => (
                <span
                  key={w.id}
                  className={stamps.includes(w.id) ? "earned" : ""}
                  style={{ "--theme": w.color } as React.CSSProperties}
                  title={`${w.name}${stamps.includes(w.id) ? " · stamp earned" : " · open its chest to earn this stamp"}`}
                >
                  <b aria-hidden="true">{w.icon}</b>
                  {w.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {(tab === "weekly" || tab === "monthly") && (
        <Missions
          list={tab === "weekly" ? WEEKLY : MONTHLY}
          counts={tab === "weekly" ? e.weekly : e.monthly}
          claimed={e.claimed}
          chest={tab === "weekly" ? WEEKLY_CHEST : MONTHLY_CHEST}
          chestId={tab === "weekly" ? "weekly-chest" : "monthly-chest"}
          resets={
            tab === "weekly"
              ? `Resets Monday 00:00 UTC · ${resets(toMonday)} left`
              : `Resets on the 1st at 00:00 UTC · ${resets(toMonth)} left`
          }
          run={run}
        />
      )}
    </div>
  );
}

function Missions({
  list,
  counts,
  claimed,
  chest,
  chestId,
  resets,
  run,
}: {
  list: EventMission[];
  counts: Record<string, number>;
  claimed: string[];
  chest: EventReward;
  chestId: string;
  resets: string;
  run: (kind: string, value?: any) => Promise<any>;
}) {
  const all = list.every((m) => claimed.includes(m.id));
  return (
    <>
      <p className="muted">{resets}. Progress counts automatically as you play.</p>
      <div className="mission-list">
        {list.map((m) => {
          const value = Math.min(m.goal, counts[m.metric] || 0),
            done = missionDone(
              { weekly: counts, monthly: counts } as never,
              m,
            ),
            taken = claimed.includes(m.id);
          return (
            <article key={m.id} className={`event-mission ${taken ? "taken" : done ? "done" : ""}`}>
              <div>
                <b>{m.title}</b>
                <small>{describe(m.reward)}</small>
                <span className="progress" aria-label={`${value} of ${m.goal}`}>
                  <i style={{ width: `${(value / m.goal) * 100}%` }} />
                </span>
              </div>
              <span className="count">
                {value}/{m.goal}
              </span>
              <button
                className={done && !taken ? "primary" : ""}
                disabled={!done || taken}
                onClick={() => run("event-claim", { quest: m.id })}
              >
                {taken ? "Claimed" : done ? "Claim" : "In progress"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="mastery">
        <span>
          Complete every mission · {describe(chest)}
        </span>
        <button
          className={all && !claimed.includes(chestId) ? "primary" : ""}
          disabled={!all || claimed.includes(chestId)}
          onClick={() => run("event-chest", { quest: chestId })}
        >
          {claimed.includes(chestId) ? "Chest opened" : "Open chest"}
        </button>
      </div>
    </>
  );
}
