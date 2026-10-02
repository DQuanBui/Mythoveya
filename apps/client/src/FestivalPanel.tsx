import { useState } from "react";
import type { Profile } from "../../../packages/shared/types";
import {
  FESTIVAL_SHOP,
  GREETING_TICKETS,
  HUNT_BONUS,
  HUNT_DAILY,
  HUNT_TICKETS,
  defaultFestival,
  huntSpots,
  type ShopEntry,
} from "../../../packages/shared/festival";
import { utcDay, utcWeek } from "../../../packages/shared/town";

type Run = (kind: string, value?: any) => Promise<any>;
export type FestivalTab = "today" | "shop" | "wardrobe";
const SECTIONS: [ShopEntry["kind"], string][] = [
  ["decor", "Home decorations"],
  ["outfit", "Keeper outfits"],
  ["accessory", "Companion accessories"],
  ["supply", "Weekly supplies"],
];

/** Lanternfair's board and ticket booth. */
export function FestivalPanel({ profile, run, tab: initial }: { profile: Profile; run: Run; tab: FestivalTab }) {
  const [tab, setTab] = useState<FestivalTab>(initial);
  const today = utcDay(),
    f = profile.festival || defaultFestival(),
    fresh = f.day === today,
    found = fresh ? f.hunt : [],
    bought = f.week === utcWeek() ? f.bought : {},
    greeted = fresh && !!f.greeted;
  return (
    <div className="festival-panel">
      <p className="eyebrow">LANTERNFAIR ISLE · THE FESTIVAL</p>
      <h2>{tab === "shop" ? "The ticket booth" : tab === "wardrobe" ? "Your wardrobe" : "Today at the fair"}</h2>
      <div className="supply-bag">
        <span>
          ✦ Festival tickets <b data-tickets>{f.tickets}</b>
        </span>
        <span>
          Lanterns found today <b>{found.length}/{HUNT_DAILY}</b>
        </span>
      </div>
      <div className="adventure-tabs" role="tablist">
        {(
          [
            ["today", "❖ Today"],
            ["shop", "✦ Ticket booth"],
            ["wardrobe", "♔ Wardrobe"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "today" && (
        <>
          <div className="festival-greeting">
            <p className="muted">
              Every visit earns a few tickets. Spend them on decorations for Hearthfall Isle, keeper outfits, companion
              accessories and weekly supplies. Nothing here is needed for the main story.
            </p>
            <button className="primary" disabled={greeted} onClick={() => run("fest-greet")}>
              {greeted ? "Welcome tickets collected" : `Collect ${GREETING_TICKETS} welcome tickets`}
            </button>
          </div>
          <section className="hunt-clues">
            <h3>The lantern hunt</h3>
            <p className="muted">
              Five lanterns are hidden around the fair each day: {HUNT_TICKETS} tickets each, and {HUNT_BONUS} more for
              finding all five. The spots change at 00:00 UTC.
            </p>
            <ol>
              {huntSpots(today).map((s) => (
                <li key={s.id} className={found.includes(s.id) ? "done" : ""}>
                  <span>{found.includes(s.id) ? "✓" : "✦"}</span> {s.clue}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      {tab === "shop" &&
        SECTIONS.map(([kind, title]) => (
          <section key={kind} className="festival-shop-section">
            <h3>{title}</h3>
            <div className="market-stock">
              {FESTIVAL_SHOP.filter((s) => s.kind === kind).map((s) => {
                const owned = s.kind === "outfit" && f.outfits.includes(s.id),
                  left = s.weekly ? s.weekly - (bought[s.id] || 0) : Infinity,
                  stash = s.kind === "decor" ? profile.home?.stash?.[s.id] || 0 : 0,
                  carried = s.kind === "accessory" ? profile.town?.inventory[s.id] || 0 : 0;
                return (
                  <article key={s.id} data-shop={s.id}>
                    <span className="item-symbol">{s.icon}</span>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <small>
                      {s.tickets} tickets
                      {s.weekly ? ` · ${left} left this week` : ""}
                      {stash ? ` · ${stash} waiting to place` : ""}
                      {carried ? ` · ${carried} in your bag` : ""}
                    </small>
                    <button
                      disabled={owned || left <= 0 || f.tickets < s.tickets}
                      onClick={() => run("fest-buy", { item: s.id })}
                    >
                      {owned
                        ? "In your wardrobe"
                        : left <= 0
                          ? "Sold out this week"
                          : f.tickets < s.tickets
                            ? `Needs ${s.tickets} tickets`
                            : `Buy · ${s.tickets} tickets`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      {tab === "wardrobe" && (
        <div className="market-stock">
          {FESTIVAL_SHOP.filter((s) => s.kind === "outfit").map((s) => {
            const owned = f.outfits.includes(s.id),
              wearing = f.outfit === s.id;
            return (
              <article key={s.id} className={wearing ? "here" : ""} data-outfit={s.id}>
                <span className="item-symbol">{s.icon}</span>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <small>{owned ? (wearing ? "Wearing now" : "In your wardrobe") : `${s.tickets} tickets at the booth`}</small>
                <button
                  disabled={!owned}
                  onClick={() => run("fest-outfit", { item: wearing ? "none" : s.id })}
                >
                  {!owned ? "Not owned yet" : wearing ? "Take off" : "Wear"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
