import type { Profile } from "../../packages/shared/types";
import { own } from "../../packages/shared/economy";
import { DISCOVERIES, FIELD_HOUSES, FIELD_NODES, discoveryWindow, emptyExpedition, fieldCompanions } from "../../packages/shared/wildwood";

/** Progress is validated here; operation() makes rewards and request replay atomic. */
export function expeditionMutation(p: Profile, kind: string, v: { id?: string; quest?: string }, now: number, random = Math.random) {
  if (p.region !== "haven" || p.island) throw Error("Return to Havenreach first.");
  if (p.team.length !== 6) throw Error("Meet the guide and form your team of six first.");
  const e = p.expedition ||= emptyExpedition();
  if (kind === "exp-start") {
    if (e.started) throw Error("The windmill journey has already begun.");
    e.started = true;
    return { message: "The Silent Windmill: recover three pieces using your companions' field abilities." };
  }
  if (kind === "exp-field") {
    if (!e.started) throw Error("Read the windmill's notice first.");
    const node = FIELD_NODES.find((n) => n.id === v.quest);
    if (!node) throw Error("Choose a field ability site.");
    if (e.repaired.includes(node.id)) throw Error("This piece is already recovered.");
    const companion = fieldCompanions(p, node.element).find((o) => o.id === v.id);
    if (!companion) throw Error(`Choose an owned ${node.element} companion.`);
    e.repaired.push(node.id);
    companion.friendship = Math.min(100, (companion.friendship || 0) + 5);
    p.gold += 30;
    return { message: `${node.ability} restored the ${node.name.toLowerCase()}. Piece recovered, +30 gold and +5 friendship.` };
  }
  if (kind === "exp-restore") {
    if (!e.started || FIELD_NODES.some((n) => !e.repaired.includes(n.id)) || !e.guardian) throw Error("Recover the three pieces and calm the guardian first.");
    if (e.restored) throw Error("The windmill is already restored.");
    e.restored = true;
    p.gold += 200;
    p.diamonds += 50;
    const companion = own(p, "galehart", random);
    return { message: "The sails turn, and Galehart joins your collection! +200 gold and +50 diamonds.", companion };
  }
  if (kind === "exp-visit") {
    const house = FIELD_HOUSES.find((h) => h.id === v.id);
    if (!house) throw Error("Choose a field house.");
    if (e.visits.includes(house.id)) throw Error("This story is already in your journal.");
    e.visits.push(house.id);
    p.gold += 20;
    return { message: "A new house story recorded. +20 gold." };
  }
  if (kind === "exp-discover") {
    const discovery = DISCOVERIES.find((d) => d.id === v.id);
    if (!discovery) throw Error("Choose a discovery.");
    if (!discoveryWindow(discovery.id, now)) throw Error(discovery.clue);
    if (e.discoveries.includes(discovery.id)) throw Error("This discovery is already recorded.");
    e.discoveries.push(discovery.id);
    p.diamonds += 15;
    return { message: `${discovery.name} recorded. +15 diamonds.` };
  }
  throw Error("Unknown expedition action.");
}
