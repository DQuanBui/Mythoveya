import type { Owned, Profile } from "../../../packages/shared/types";
import { byId } from "../../../packages/shared/content";
import { townOf } from "../../../packages/shared/town";
import {
  ELIXIR_XP,
  GEAR_ICONS,
  GEAR_MAX_LEVEL,
  GEAR_SLOTS,
  RARITIES,
  RARITY_COLORS,
  SKILL_MAX,
  companionBonus,
  describeBonus,
  gearBonus,
  gearName,
  gearSalvage,
  gearUpgradeCost,
  skillCost,
  skillLevels,
  skillPower,
  type Gear,
} from "../../../packages/shared/adventure";

const tag = (g: Gear) => ({ "--rarity": RARITY_COLORS[g.rarity] }) as React.CSSProperties;

/** Skill training, equipment slots and the forge for one owned companion. */
export function CompanionGrowth({
  profile,
  o,
  run,
}: {
  profile: Profile;
  o: Owned;
  run: (kind: string, value?: any) => Promise<any>;
}) {
  const s = byId[o.species],
    t = townOf(profile),
    levels = skillLevels(o),
    gear = profile.gear || [],
    total = companionBonus(profile, o);
  return (
    <div className="growth">
      <h3>Skills</h3>
      <p className="muted">
        Each level adds 10% power to damage, healing and shields. Skill tomes
        come from the Grove of Insight and chapter bosses. You have{" "}
        {t.inventory.tome || 0} ❖.
      </p>
      {[1, 2].map((slot) => {
        const level = levels[slot - 1],
          cost = skillCost(level),
          maxed = level >= SKILL_MAX;
        return (
          <div className="growth-row" key={slot}>
            <div>
              <b>
                {slot === 1 ? "Skill" : "Ultimate"} · {s.actions[slot].name}
              </b>
              <small>
                Level {level}/{SKILL_MAX} · {Math.round(skillPower(level) * 100)}% power
              </small>
              <span className="pips" aria-hidden="true">
                {Array.from({ length: SKILL_MAX }, (_, i) => (
                  <i key={i} className={i < level ? "on" : ""} />
                ))}
              </span>
            </div>
            <button
              disabled={
                maxed || (t.inventory.tome || 0) < cost.tome || profile.gold < cost.gold
              }
              onClick={() => run("skill-up", { id: o.id, slot })}
            >
              {maxed ? "Mastered" : `Train · ${cost.tome} ❖ · ${cost.gold} Gold`}
            </button>
          </div>
        );
      })}
      <div className="growth-row">
        <div>
          <b>Growth elixir</b>
          <small>
            +{ELIXIR_XP} creature XP · {t.inventory.elixir || 0} owned · level cap{" "}
            {profile.level}
          </small>
        </div>
        <button
          disabled={!(t.inventory.elixir > 0) || o.level >= profile.level}
          onClick={() => run("elixir", { id: o.id })}
        >
          Use elixir
        </button>
      </div>
      <h3>Equipment</h3>
      <p className="muted">
        {describeBonus(total) || "No equipment yet."} Equipment applies to
        story, dungeons and Power Arena, not Tactical Arena. Forge dust:{" "}
        {t.inventory.dust || 0} ⁂.
      </p>
      <div className="gear-slots">
        {GEAR_SLOTS.map((slot) => {
          const worn = gear.find((g) => g.owner === o.id && g.slot === slot),
            spare = gear.filter((g) => g.slot === slot && g.owner !== o.id);
          const cost = worn && gearUpgradeCost(worn);
          return (
            <section key={slot} className="gear-slot">
              <header>
                <span aria-hidden="true">{GEAR_ICONS[slot]}</span>
                {slot[0].toUpperCase() + slot.slice(1)}
              </header>
              {worn ? (
                <div className="gear-item worn" style={tag(worn)}>
                  <b>{gearName(worn)}</b>
                  <small>
                    {RARITIES[worn.rarity]} · {describeBonus(gearBonus(worn))}
                  </small>
                  <div className="button-row">
                    <button
                      disabled={
                        worn.level >= GEAR_MAX_LEVEL ||
                        (t.inventory.dust || 0) < cost!.dust ||
                        profile.gold < cost!.gold
                      }
                      onClick={() => run("gear-upgrade", { item: worn.id })}
                    >
                      {worn.level >= GEAR_MAX_LEVEL
                        ? "Fully forged"
                        : `Forge · ${cost!.dust} ⁂ · ${cost!.gold} Gold`}
                    </button>
                    <button onClick={() => run("gear-remove", { item: worn.id })}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">Empty slot</p>
              )}
              {spare.slice(0, 4).map((g) => (
                <div className="gear-item" key={g.id} style={tag(g)}>
                  <b>{gearName(g)}</b>
                  <small>
                    {RARITIES[g.rarity]} · {describeBonus(gearBonus(g))}
                    {g.owner
                      ? ` · on ${byId[profile.owned.find((x) => x.id === g.owner)?.species || ""]?.name || "another"}`
                      : ""}
                  </small>
                  <div className="button-row">
                    <button onClick={() => run("gear-equip", { id: o.id, item: g.id })}>
                      Equip
                    </button>
                    {!g.owner && (
                      <button onClick={() => run("gear-salvage", { item: g.id })}>
                        Salvage · +{gearSalvage(g)} ⁂
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {spare.length > 4 && (
                <small className="muted">+{spare.length - 4} more in your bag</small>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
