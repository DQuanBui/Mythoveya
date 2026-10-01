import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import { byId } from "../../../packages/shared/content";
import {
  CHAPTERS,
  CHAPTER_MASTERY,
  DUNGEONS,
  DUNGEON_KEEPER_LEVEL,
  DUNGEON_LEVELS,
  DUNGEON_RUNS_PER_DAY,
  dungeonReward,
  dungeonTierOpen,
  rewardText,
  stageFirstReward,
  stageReplayReward,
  stageUnlocked,
  RARITIES,
  TOWER_FLOORS,
  towerFloor,
  towerReward,
} from "../../../packages/shared/adventure";
import { utcDay } from "../../../packages/shared/town";
import { Portrait } from "./portraits";

export type MissionStart = {
  stage?: string;
  dungeon?: string;
  tier?: number;
  tower?: number;
};
const ROMAN = ["I", "II", "III", "IV", "V"];

export function AdventurePanel({
  profile,
  run,
  begin,
}: {
  profile: Profile;
  run: (kind: string, value?: any) => Promise<any>;
  begin: (mission: MissionStart) => void;
}) {
  const a = profile.adventure,
    stars = a?.stages || {};
  const current = Math.max(
    0,
    CHAPTERS.findIndex((c) => !stars[c.stages[3].id]),
  );
  const [tab, setTab] = useState<"story" | "dungeons" | "tower">("story"),
    [chapter, setChapter] = useState(current === -1 ? 0 : current);
  const c = CHAPTERS[chapter],
    total = c.stages.reduce((n, s) => n + (stars[s.id] || 0), 0);
  const runsToday = a?.dungeonDay === utcDay() ? a.runs : {};
  return (
    <div className="adventure">
      <p className="eyebrow">THE RIFTGATE · BEYOND HAVENREACH</p>
      <h2>Where will your six go next?</h2>
      <div className="adventure-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "story"}
          className={tab === "story" ? "selected" : ""}
          onClick={() => setTab("story")}
        >
          ✦ Story chapters
        </button>
        <button
          role="tab"
          aria-selected={tab === "dungeons"}
          className={tab === "dungeons" ? "selected" : ""}
          onClick={() => setTab("dungeons")}
        >
          ◇ Rift dungeons
        </button>
        <button
          role="tab"
          aria-selected={tab === "tower"}
          className={tab === "tower" ? "selected" : ""}
          onClick={() => setTab("tower")}
        >
          ♜ Rift Tower
        </button>
      </div>
      {tab === "tower" ? (
        <Tower profile={profile} begin={begin} />
      ) : tab === "story" ? (
        <div className="story-layout">
          <nav className="chapter-list" aria-label="Chapters">
            {CHAPTERS.map((ch, i) => {
              const open = stageUnlocked(profile, ch.stages[0].id),
                done = !!stars[ch.stages[3].id];
              return (
                <button
                  key={ch.id}
                  className={`${chapter === i ? "selected" : ""} ${open ? "" : "locked"}`}
                  style={{ "--chapter": ch.color } as React.CSSProperties}
                  onClick={() => setChapter(i)}
                >
                  <small>CHAPTER {i + 1}</small>
                  <b>{ch.name}</b>
                  <span>{done ? "✦ Cleared" : open ? "Open" : "Locked"}</span>
                </button>
              );
            })}
          </nav>
          <section
            className="chapter-detail"
            style={{ "--chapter": c.color } as React.CSSProperties}
          >
            <p className="eyebrow">
              CHAPTER {chapter + 1} · {c.place.toUpperCase()}
            </p>
            <h3>{c.name}</h3>
            <p className="muted">{c.story}</p>
            <div className="stage-list">
              {c.stages.map((s, i) => {
                const open = stageUnlocked(profile, s.id),
                  earned = stars[s.id] || 0;
                return (
                  <article
                    key={s.id}
                    className={`stage ${s.boss ? "boss-stage" : ""} ${open ? "" : "locked"}`}
                  >
                    <div className="stage-head">
                      <span className="stage-number">
                        {s.boss ? "♛" : `${chapter + 1}-${i + 1}`}
                      </span>
                      <div>
                        <b>{s.boss ? s.boss.title : s.name}</b>
                        <small>
                          Recommended team level {s.recommended}
                          {profile.level < s.recommended - 1 ? " · tough fight" : ""}
                        </small>
                      </div>
                      <span className="stars" aria-label={`${earned} of 3 stars`}>
                        {[0, 1, 2].map((n) => (
                          <i key={n} className={n < earned ? "on" : ""}>
                            ★
                          </i>
                        ))}
                      </span>
                    </div>
                    <div className="stage-enemies">
                      {s.enemies.map((e, k) => (
                        <span
                          key={k}
                          className={s.boss?.species === e ? "boss" : ""}
                          title={byId[e].name}
                        >
                          <Portrait id={e} />
                        </span>
                      ))}
                    </div>
                    <p className="stage-reward">
                      {earned
                        ? `Replay: ${rewardText(stageReplayReward(chapter))}`
                        : `First clear: ${rewardText(stageFirstReward(chapter, !!s.boss))}${s.boss ? " · equipment" : ""}`}
                    </p>
                    <button
                      className={open ? "primary" : ""}
                      disabled={!open || profile.team.length !== 6}
                      onClick={() => begin({ stage: s.id })}
                    >
                      {open ? (earned ? "Replay stage" : "Begin stage") : "Clear the previous stage"}
                    </button>
                  </article>
                );
              })}
            </div>
            <div className="mastery">
              <span>
                Chapter mastery · {total}/12 ★ · {rewardText(CHAPTER_MASTERY)}
              </span>
              <button
                disabled={total < 12 || a?.chests.includes(c.id)}
                onClick={() => run("chapter-chest", { quest: c.id })}
              >
                {a?.chests.includes(c.id) ? "Chest opened" : "Open mastery chest"}
              </button>
            </div>
            <p className="muted small-print">
              Three stars: no companion faints. Two: up to two faint. Victories
              also count toward region unlocks and daily wins.
            </p>
          </section>
        </div>
      ) : (
        <div className="dungeon-grid">
          {DUNGEONS.map((d) => (
            <Dungeon
              key={d.id}
              dungeon={d}
              profile={profile}
              runs={runsToday[d.id] || 0}
              begin={begin}
            />
          ))}
          <p className="muted small-print">
            Each dungeon allows {DUNGEON_RUNS_PER_DAY} victories per day and
            resets at 00:00 UTC. Clear a tier to open the next one.
          </p>
        </div>
      )}
    </div>
  );
}

function Tower({
  profile,
  begin,
}: {
  profile: Profile;
  begin: (mission: MissionStart) => void;
}) {
  const best = profile.adventure?.tower || 0,
    done = best >= TOWER_FLOORS,
    floor = towerFloor(Math.min(TOWER_FLOORS, best + 1)),
    reward = towerReward(floor.floor),
    text = (r: ReturnType<typeof towerReward>) =>
      [rewardText(r), r.gear ? `${RARITIES[r.gear]} equipment` : ""]
        .filter(Boolean)
        .join(" · ");
  const milestones = Array.from({ length: 4 }, (_, i) => (Math.floor(best / 5) + i + 1) * 5).filter(
    (f) => f <= TOWER_FLOORS,
  );
  return (
    <div className="tower-layout">
      <section className="tower-climb" aria-label="Tower progress">
        <p className="eyebrow">
          {best}/{TOWER_FLOORS} FLOORS CLEARED
        </p>
        <div className="tower-shaft" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => {
            // A window of twelve floors around the next climb, never below floor 1.
            const f = Math.min(TOWER_FLOORS, Math.max(12, best + 7)) - i;
            return (
              <span
                key={i}
                className={`${f <= best ? "cleared" : ""} ${f === best + 1 ? "current" : ""} ${f % 5 === 0 ? "warden" : ""}`}
              >
                {f % 5 === 0 ? "♜" : ""} {f}
              </span>
            );
          })}
        </div>
      </section>
      <section className="chapter-detail tower-floor" style={{ "--chapter": "#9a86c4" } as React.CSSProperties}>
        <p className="eyebrow">THE RIFT TOWER · CLIMB AT YOUR OWN PACE</p>
        <h3>{done ? "You stand atop the Rift Tower." : `Floor ${floor.floor}${floor.boss ? " · Warden" : ""}`}</h3>
        <p className="muted">
          Sixty floors with no daily limit. Each floor pays once; every fifth
          floor holds a warden, and every tenth guarantees equipment.
          Recommended team level {floor.recommended}.
        </p>
        {!done && (
          <>
            <div className="stage-enemies">
              {floor.enemies.map((e, k) => (
                <span key={k} className={floor.boss === e ? "boss" : ""} title={byId[e].name}>
                  <Portrait id={e} />
                </span>
              ))}
            </div>
            <p className="stage-reward">First clear: {text(reward)}</p>
            <button
              className="primary"
              disabled={profile.team.length !== 6}
              onClick={() => begin({ tower: floor.floor })}
            >
              Climb to floor {floor.floor}
            </button>
          </>
        )}
        <div className="tower-milestones">
          {milestones.map((f) => (
            <span key={f}>
              <b>Floor {f}</b> {text(towerReward(f))}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Dungeon({
  dungeon: d,
  profile,
  runs,
  begin,
}: {
  dungeon: (typeof DUNGEONS)[number];
  profile: Profile;
  runs: number;
  begin: (mission: MissionStart) => void;
}) {
  const best = profile.adventure?.best?.[d.id] ?? -1;
  const [tier, setTier] = useState(
    Math.max(0, [0, 1, 2, 3, 4].filter((t) => dungeonTierOpen(profile, t, d.id)).at(-1) ?? 0),
  );
  const open = dungeonTierOpen(profile, tier, d.id),
    left = DUNGEON_RUNS_PER_DAY - runs;
  return (
    <article className="dungeon" style={{ "--dungeon": d.color } as React.CSSProperties}>
      <div className="dungeon-art" aria-hidden="true">
        {d.enemies.slice(-3).map((e) => (
          <Portrait key={e} id={e} />
        ))}
      </div>
      <p className="eyebrow">{d.reward.toUpperCase()}</p>
      <h3>{d.name}</h3>
      <p className="muted">{d.description}</p>
      <div className="tier-row" role="group" aria-label={`${d.name} tier`}>
        {ROMAN.map((label, t) => (
          <button
            key={label}
            className={tier === t ? "selected" : ""}
            disabled={!dungeonTierOpen(profile, t, d.id)}
            title={`Recommended team level ${DUNGEON_LEVELS[t]} · keeper level ${DUNGEON_KEEPER_LEVEL[t]}+`}
            onClick={() => setTier(t)}
          >
            {label}
            {best >= t ? "✓" : ""}
          </button>
        ))}
      </div>
      <p className="stage-reward">
        Tier {ROMAN[tier]} · recommended level {DUNGEON_LEVELS[tier]} ·{" "}
        {rewardText(dungeonReward(d.id, tier))}
        {d.id === "forge" ? ` · ${tier >= 3 ? 2 : 1} equipment` : ""}
      </p>
      <button
        className="primary"
        disabled={!open || left <= 0 || profile.team.length !== 6}
        onClick={() => begin({ dungeon: d.id, tier })}
      >
        {left <= 0 ? "Come back tomorrow" : `Enter · ${left}/${DUNGEON_RUNS_PER_DAY} runs left`}
      </button>
    </article>
  );
}
