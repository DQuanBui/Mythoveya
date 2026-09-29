import { byId } from "./content";
import type { Battle, Owned, Unit, Status } from "./types";
export function rng(b: { seed: number }) {
  b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0;
  return b.seed / 4294967296;
}
export function stats(o: Owned, tactical = false) {
  const s = byId[o.species];
  const level = tactical ? 10 : o.level;
  const f =
    (1 + (level - 1) * s.growth) * (tactical ? 1 : 1 + o.upgrade * 0.02);
  const budget = tactical ? 1 / (1 + Math.floor(s.index / 10) * 0.05) : 1;
  return {
    hp: Math.round(s.stats.hp * f * budget),
    attack: Math.round(s.stats.attack * f * budget),
    defense: Math.round(s.stats.defense * f * budget),
    speed: Math.round(s.stats.speed * (s.passive.effect === "haste" ? 1.05 : 1)),
  };
}
export const power = (o: Owned) => {
  const s = stats(o);
  return Math.round(s.hp + s.attack * 3 + s.defense * 2 + s.speed);
};
export function elementMultiplier(a: string, b: string) {
  if ((a === "Light" && b === "Shadow") || (a === "Shadow" && b === "Light"))
    return 1.2;
  const cycle = ["Flame", "Grove", "Stone", "Storm", "Tide"];
  const x = cycle.indexOf(a),
    y = cycle.indexOf(b);
  if (x < 0 || y < 0) return 1;
  return (x + 1) % 5 === y ? 1.2 : (y + 1) % 5 === x ? 0.85 : 1;
}
const has = (u: Unit, k: string) => u.statuses.find((s) => s.kind === k);
function status(u: Unit, kind: string, turns = 2, value = 0.2) {
  const old = has(u, kind);
  if (old) {
    old.turns = Math.max(old.turns, turns);
    old.value = value;
  } else u.statuses.push({ kind, turns, value });
}
export function makeBattle(
  id: string,
  teams: Owned[][],
  mode = "pve",
  seed = 123,
): Battle {
  const b: Battle = {
    id,
    units: teams.flatMap((t, side) =>
      t.map((o, slot) => {
        const s = stats(o, mode === "tactical");
        const p = byId[o.species].passive;
        return {
          ...s,
          maxHp: s.hp,
          id: `${side}:${slot}`,
          species: o.species,
          side,
          slot,
          level: o.level,
          shield: p.effect === "shield" ? Math.round(s.hp * 0.05) : 0,
          statuses: [],
          cooldowns: [0, 0, 0],
          revived: false,
          controlledLast: false,
          bank: 0,
        };
      }),
    ),
    round: 0,
    queue: [],
    energy: [0, 0],
    seed,
    event: null,
    sequence: 0,
    winner: null,
    log: [],
    readyAt: 0,
    deadline: 0,
    delayed: [],
    mode,
  };
  nextRound(b);
  return b;
}
function checkWinner(b: Battle) {
  const alive = [0, 1].map(
    (side) => b.units.filter((u) => u.side === side && u.hp > 0).length,
  );
  if (!alive[0] || !alive[1]) b.winner = alive[0] ? 0 : alive[1] ? 1 : 2;
  if (b.round > 25) {
    const f = [0, 1].map(
      (side) =>
        b.units.filter((u) => u.side === side).reduce((n, u) => n + u.hp, 0) /
        b.units.filter((u) => u.side === side).reduce((n, u) => n + u.maxHp, 0),
    );
    b.winner = Math.abs(f[0] - f[1]) < 0.00001 ? 2 : f[0] > f[1] ? 0 : 1;
  }
}
function nextRound(b: Battle) {
  b.round++;
  b.energy = b.energy.map((e) => Math.min(10, e + 3));
  for (const u of b.units) {
    if (u.hp <= 0) continue;
    for (const s of u.statuses) {
      if (s.kind === "burn")
        u.hp = Math.max(0, u.hp - Math.round(u.maxHp * 0.05));
      if (s.kind === "regen")
        u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.08));
      if (!["stun", "silence"].includes(s.kind)) s.turns--;
    }
    u.statuses = u.statuses.filter((s) => s.turns > 0);
    if (byId[u.species].passive.effect === "regen")
      u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.03));
    u.cooldowns = u.cooldowns.map((c) => Math.max(0, c - 1));
  }
  b.queue = b.units
    .filter((u) => u.hp > 0)
    .sort(
      (a, c) =>
        c.speed * (has(c, "slow") ? 0.7 : has(c, "haste") ? 1.3 : 1) -
          a.speed * (has(a, "slow") ? 0.7 : has(a, "haste") ? 1.3 : 1) ||
        a.id.localeCompare(c.id),
    )
    .map((u) => u.id);
  for (const d of b.delayed.filter((d) => d.round <= b.round)) {
    const a = b.units.find((u) => u.id === d.actor),
      t = b.units.find((u) => u.id === d.target);
    if (a && t && a.hp > 0 && t.hp > 0) {
      const skill = byId[a.species].actions[d.action];
      const delayedTargets = skill.target === "row" ? b.units.filter(u => u.side === t.side && Math.floor(u.slot / 3) === Math.floor(t.slot / 3) && u.hp > 0) : [t];
      for (const victim of delayedTargets) {
        const before = victim.hp;
        const damage = Math.round(a.attack * skill.power * 100 / (100 + victim.defense));
        const absorbed = Math.min(victim.shield, damage);
        victim.shield -= absorbed;
        victim.hp = Math.max(0, victim.hp - damage + absorbed);
        victim.statuses = victim.statuses.filter(s => s.kind !== "warning");
        if (skill.effects.includes("stun") && !victim.controlledLast) status(victim, "stun", 1);
        if (skill.effects.includes("slow")) status(victim, "slow", 2);
        if (skill.effects.includes("burn")) status(victim, "burn", 2);
        b.event?.amounts.push({id:victim.id,amount:before-victim.hp,shield:-absorbed});
      }
      b.log.push(`${byId[a.species].name}'s telegraphed strike resolves.`);
    }
  }
  b.delayed = b.delayed.filter((d) => d.round > b.round);
  checkWinner(b);
  b.queue = b.queue.filter((id) => b.units.find((u) => u.id === id)!.hp > 0);
}
export function targets(b: Battle, actor: Unit, n: number) {
  const a = byId[actor.species].actions[n];
  const allied = ["ally", "allies", "self"].includes(a.target);
  return b.units.filter((u) => {
    if (
      a.effects.includes("revive") &&
      allied &&
      u.side === actor.side &&
      !u.revived
    )
      return a.target === "self" ? u.id === actor.id : true;
    if (u.hp <= 0 || u.side !== (allied ? actor.side : 1 - actor.side))
      return false;
    if (a.target === "self") return u.id === actor.id;
    if (n === 0 && u.slot >= 3)
      return !b.units.some(
        (f) => f.side === u.side && f.slot === u.slot - 3 && f.hp > 0,
      );
    if (a.target === "rear")
      return (
        u.slot >= 3 ||
        !b.units.some((f) => f.side === u.side && f.slot >= 3 && f.hp > 0)
      );
    return true;
  });
}
export function legal(b: Battle, side: number, n: number, target: string) {
  const actor = b.units.find((u) => u.id === b.queue[0]);
  if (b.winner !== null || !actor || actor.side !== side)
    throw Error("It is not your turn.");
  const a = byId[actor.species].actions[n];
  if (
    !a ||
    b.energy[side] < a.cost ||
    actor.cooldowns[n] > 0 ||
    (n === 1 && has(actor, "silence"))
  )
    throw Error("That action is unavailable.");
  if (!targets(b, actor, n).some((u) => u.id === target))
    throw Error("Choose a legal target.");
  return actor;
}
export function act(
  b: Battle,
  side: number,
  n: number,
  target: string,
  now = Date.now(),
  fast = false,
) {
  const actor = legal(b, side, n, target),
    s = byId[actor.species],
    a = s.actions[n],
    t = b.units.find((u) => u.id === target)!;
  const consumeBoost = n>0 && Boolean(has(actor,'boost'));
  b.energy[side] -= a.cost;
  actor.cooldowns[n] = a.cooldown;
  const amounts: { id: string; amount: number; shield: number }[] = [];
  let affected =
    a.target === "allies"
      ? b.units.filter((u) => u.side === side)
      : a.target === "row"
        ? b.units.filter(
            (u) =>
              u.side === t.side &&
              Math.floor(u.slot / 3) === Math.floor(t.slot / 3) &&
              u.hp > 0,
          )
        : [t];
  // Authored signatures select targets; all actual effects remain reusable primitives.
  if (n > 0 && s.id === "ripplefin") affected = b.units.filter(u => u.side === side && u.hp > 0).sort((a,b) => a.hp/a.maxHp-b.hp/b.maxHp).slice(0,2);
  if (n > 0 && ["frostwhisk", "basalhorn", "glaciermaw"].includes(s.id)) affected = b.units.filter(u => u.side === side && u.hp > 0 && (s.id === "frostwhisk" ? u.slot >= 3 : u.slot < 3));
  if (n > 0 && ["voltwing", "flintuff", "tempestrix"].includes(s.id)) affected = [t,...b.units.filter(u => u.side !== side && u.hp > 0 && u.id !== t.id && (s.id !== "flintuff" || u.slot < 3 && Math.abs(u.slot-t.slot) === 1)).slice(0,s.id === "tempestrix"?2:1)];
  if (n > 0 && s.id === "aurelith") affected = [t];
  const beforeUnits = new Map(b.units.map(u => [u.id,{hp:u.hp,shield:u.shield}]));
  const stunned = has(actor, "stun") && !actor.controlledLast;
  actor.controlledLast = Boolean(stunned);
  if (!stunned) {
    if (a.effects.includes("delay")) {
      b.delayed.push({
        actor: actor.id,
        target: t.id,
        action: n,
        round: b.round + 1,
      });
      status(t, "warning", 2);
    }
    for (const u of affected) {
      const before = u.hp,
        shieldBefore = u.shield;
      for (const effect of a.effects) {
        const beneficial = ["heal","shield","cleanse","revive","regen","haste","guard","reflect","thorns","boost","bank"].includes(effect);
        if (beneficial && u.side !== side) {
          if (effect === "revive" && !actor.revived) status(actor,"rebirth",99);
          else if (["haste","boost"].includes(effect)) status(actor,effect,2);
          continue;
        }
        if (!beneficial && u.side === side && !["delay","pierce"].includes(effect)) {
          if (s.id === "crysalune" && effect === "slow") for (const enemy of b.units.filter(e => e.side !== side && e.hp > 0)) status(enemy,"slow",2);
          continue;
        }
        if (effect === "stun" && a.effects.includes("delay")) continue;
        if (effect === "damage" && !a.effects.includes("delay") && u.hp > 0) {
          const crit = rng(b) < 0.1 ? 1.5 : 1;
          let dmg = Math.max(
            1,
            Math.round(
              ((actor.attack * a.power * 100) /
                (100 +
                  (a.effects.includes("pierce")
                    ? u.defense * 0.4
                    : u.defense))) *
                elementMultiplier(s.element, byId[u.species].element) *
                (0.94 + rng(b) * 0.12) *
                crit *
                (has(actor, "weaken") ? 0.8 : 1) *
                (has(actor, "boost") ? 1.2 : 1) *
                (has(u, "mark") ? 1.2 : 1) *
                (has(u, "guard") ? 0.7 : 1) *
                (byId[u.species].passive.effect === "guard" ? 0.95 : 1) *
                (s.passive.effect === "boost" ? 1.05 : 1),
            ),
          );
          if (s.id === "obsidrake" && n > 0) u.shield = 0;
          if (s.id === "emberfox" && n > 0 && u.shield > 0) dmg = Math.round(dmg * 1.5);
          if (s.id === "murkfang" && n > 0 && has(u,"mark")) dmg = Math.round(dmg * 1.25);
          const absorbed = Math.min(u.shield, dmg);
          u.shield -= absorbed;
          dmg -= absorbed;
          const guard = has(u,"guard");
          const protector = guard?.source && b.units.find(p => p.id === guard.source && p.hp > 0 && p.id !== u.id);
          if (protector) {const share = Math.min(Math.round(dmg*.25), Math.max(0,protector.hp-1));protector.hp-=share;dmg-=share;}
          u.hp = Math.max(0, u.hp - dmg);
          if (has(u, "reflect")) {
            actor.hp = Math.max(
              1,
              actor.hp - Math.min(20, Math.round(dmg * 0.2)),
            );
            u.statuses = u.statuses.filter((s) => s.kind !== "reflect");
          }
          if (has(u, "thorns")) {actor.hp = Math.max(1, actor.hp - 5);if(u.species === "magmole")status(actor,"burn",2);}
          if (has(u, "bank")) u.bank = Math.min(35, u.bank + absorbed + Math.round(dmg*.15));
          if (n > 0 && s.id === "rimeowl") {b.delayed=b.delayed.filter(d=>d.actor!==u.id);u.statuses=u.statuses.filter(x=>x.kind!=="warning");}
          const pursuit = b.units.find(p=>p.side===side&&p.hp>0&&p.species==='raijora'&&p.id!==actor.id&&has(p,'boost'));
          if(pursuit&&!has(pursuit,'followed')){u.hp=Math.max(0,u.hp-Math.round(pursuit.attack*.3));status(pursuit,'followed',1);}
          if(actor.bank>0){u.hp=Math.max(0,u.hp-actor.bank);actor.bank=0;actor.statuses=actor.statuses.filter(s=>s.kind!=='bank');}
        }
        if (effect === "heal" && u.hp > 0)
          u.hp = Math.min(
            u.maxHp,
            u.hp +
              Math.round(
                actor.attack * a.power * (s.id === "pelagryth" ? 1.8 : 1.3),
              ),
          );
        if (effect === "shield" && u.hp > 0)
          u.shield = Math.min(
            Math.round(u.maxHp * 0.6),
            u.shield + Math.round(actor.attack * a.power),
          );
        if (effect === "cleanse")
          u.statuses = u.statuses.filter(
            (s) =>
              ![
                "burn",
                "slow",
                "weaken",
                "mark",
                "silence",
                "stun",
                "warning",
              ].includes(s.kind),
          );
        if (effect === "revive" && !u.revived) {
          if (u.hp === 0) {
            u.hp = Math.round(u.maxHp * 0.35);
            u.revived = true;
          } else if (u.id === actor.id) status(u, "rebirth", 99);
        }
        if (
          [
            "burn",
            "slow",
            "weaken",
            "mark",
            "regen",
            "haste",
            "guard",
            "reflect",
            "silence",
            "thorns",
            "boost",
            "bank",
            "stun",
          ].includes(effect) &&
          u.hp > 0
        ) {
          if (effect === "stun" && u.controlledLast) continue;
          status(u, effect, effect === "stun" || effect === "silence" ? 1 : 2);
          if (effect === "guard" && ["cragpup","titanusk","thaloryx"].includes(s.id)) has(u,"guard")!.source = actor.id;
        }
      }
      if (actor.bank > 0 && a.effects.includes("bank")) {
        const enemy = b.units.find((e) => e.side !== side && e.hp > 0);
        if (enemy) enemy.hp = Math.max(0, enemy.hp - actor.bank);
        actor.bank = 0;
      }
      amounts.push({
        id: u.id,
        amount: before - u.hp,
        shield: u.shield - shieldBefore,
      });
    }
  }
  actor.statuses = actor.statuses.filter(x=>x.kind!=="stun"&&x.kind!=="silence" && !(consumeBoost && x.kind==='boost' && s.id!=='raijora'));
  amounts.length=0;
  for (const u of b.units) {const before=beforeUnits.get(u.id)!;if(before.hp!==u.hp||before.shield!==u.shield)amounts.push({id:u.id,amount:before.hp-u.hp,shield:u.shield-before.shield});}
  for (const u of b.units)
    if (u.hp === 0 && has(u, "rebirth") && !u.revived) {
      u.hp = Math.round(u.maxHp * 0.3);
      u.revived = true;
      u.statuses = u.statuses.filter((s) => s.kind !== "rebirth");
    }
  const duration = fast && ['pve','practice'].includes(b.mode) ? 220 : a.duration;
  b.sequence++;
  b.event = {
    id: b.sequence,
    actor: actor.id,
    target: t.id,
    action: a.id,
    name: a.name,
    amounts,
    duration,
    at: now,
    message: stunned
      ? `${s.name} recovers from control.`
      : `${s.name} used ${a.name}.`,
  };
  b.log = [...b.log, b.event.message].slice(-30);
  b.queue.shift();
  b.queue = b.queue.filter((id) => b.units.find((u) => u.id === id)!.hp > 0);
  checkWinner(b);
  if (!b.queue.length && b.winner === null) nextRound(b);
  b.readyAt = now + duration;
  b.deadline = b.readyAt + 20000;
  return b;
}
export function autoAction(b: Battle) {
  const actor = b.units.find((u) => u.id === b.queue[0])!;
  for (const n of [2, 1, 0]) {
    const a = byId[actor.species].actions[n];
    if (
      b.energy[actor.side] < a.cost ||
      actor.cooldowns[n] ||
      (n === 1 && has(actor, "silence"))
    )
      continue;
    const ts = targets(b, actor, n);
    if (!ts.length) continue;
    const t = [...ts].sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
    return { action: n, target: t.id };
  }
  throw Error("No legal action");
}
export function elo(a: number, b: number, result: number) {
  const d = Math.round(24 * (result - 1 / (1 + 10 ** ((b - a) / 400))));
  return [a + d, b - d];
}
