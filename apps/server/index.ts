import express from "express";
import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { z } from "zod";
import { resolve } from "node:path";
import { allProfiles, authenticate, createProfile, operation } from "./store";
import { mutate, pve, pveAction, ranking, startPve } from "./game";
import { ArenaRoom } from "./rooms";
const app = express();
app.use(express.json({ limit: "16kb" }));
const limits = new Map<string, { start: number; count: number }>();
app.use("/api", (req, res, next) => {
  const key = req.ip || "local";
  let l = limits.get(key);
  if (!l || Date.now() - l.start > 60000) {
    l = { start: Date.now(), count: 0 };
    limits.set(key, l);
  }
  if (++l.count > 600)
    return void res
      .status(429)
      .json({ error: "Too many requests. Please wait a moment." });
  next();
});
const token = (req: express.Request) =>
  z
    .string()
    .length(64)
    .parse((req.headers.authorization || "").replace("Bearer ", ""));
app.get("/api/health", (_, res) => res.json({ ok: true, game: "Mythoveya" }));
app.post("/api/guest", (req, res) => {
  const v = z
    .object({
      name: z
        .string()
        .trim()
        .min(2)
        .max(24)
        .regex(/^[\p{L}\p{N} _'-]+$/u),
      avatar: z.number().int().min(0).max(7),
    })
    .parse(req.body);
  res.json(createProfile(v.name, v.avatar));
});
app.get("/api/profile", (req, res) => res.json(authenticate(token(req))));
const mutation = z.object({
  requestId: z.string().uuid(),
  kind: z.enum([
    "starter",
    "guide",
    "recruit",
    "formation",
    "claim",
    "resource",
    "train",
    "upgrade",
    "lock",
    "avatar",
    "travel",
    "daily",
    "bond",
    "town-talk",
    "town-visit",
    "town-claim",
    "town-helper",
    "town-buy",
    "town-sell",
    "town-plant",
    "town-harvest",
    "town-craft",
    "town-feed",
    "town-rename",
    "town-equip",
    "town-spar",
    "town-weekly",
    "town-track",
    "town-cache",
    "town-fish",
    "skill-up",
    "gear-equip",
    "gear-remove",
    "gear-upgrade",
    "gear-salvage",
    "elixir",
    "chapter-chest",
    "evolve",
  ]),
  species: z.string().max(32).optional(),
  count: z.union([z.literal(1), z.literal(10)]).optional(),
  team: z.array(z.string().max(100)).length(6).optional(),
  quest: z.string().max(30).optional(),
  resource: z.string().max(30).optional(),
  id: z.string().max(100).optional(),
  avatar: z.number().int().min(0).max(7).optional(),
  region: z.string().max(15).optional(),
  npc: z.string().max(20).optional(),
  item: z.string().max(20).optional(),
  nickname: z.string().max(20).optional(),
  success: z.boolean().optional(),
  slot: z.number().int().min(1).max(2).optional(),
});
app.post("/api/mutate", (req, res) => {
  const v = mutation.parse(req.body);
  res.json(operation(token(req), v.requestId, (p) => mutate(p, v.kind, v)));
});
app.get("/api/battle", (req, res) => {
  const p = authenticate(token(req));
  res.json(pve.get(p.id) || null);
});
app.post("/api/battle/start", (req, res) => {
  const p = authenticate(token(req));
  const v = z
    .object({
      boss: z.boolean().default(false),
      practice: z.boolean().default(false),
      stage: z.string().max(10).optional(),
      dungeon: z.string().max(10).optional(),
      tier: z.number().int().min(0).max(4).optional(),
    })
    .parse(req.body);
  res.json(
    startPve(p, v.boss, v.practice, {
      stage: v.stage,
      dungeon: v.dungeon,
      tier: v.tier,
    }),
  );
});
app.post("/api/battle/act", (req, res) => {
  const p = authenticate(token(req));
  const v = z
    .object({
      action: z.number().int().min(0).max(2).optional(),
      target: z.string().max(10).optional(),
      fast: z.boolean().default(false),
      auto: z.boolean().default(false),
      sequence: z.number().int().min(0),
    })
    .parse(req.body);
  const b = pve.get(p.id);
  if (b?.sequence !== v.sequence)
    throw Error("Battle updated; refresh the action.");
  const actor = b?.units.find((u) => u.id === b.queue[0]);
  if (!v.auto && actor?.side === 0 && (v.action === undefined || !v.target))
    throw Error("Select an action and target.");
  res.json(
    pveAction(
      p,
      v.action !== undefined && v.target
        ? { action: v.action, target: v.target }
        : undefined,
      v.fast,
    ),
  );
});
app.get("/api/leaderboard", (_, res) =>
  res.json(
    allProfiles()
      .map((p) => ({
        id: p.id,
        name: p.name,
        power: ranking(p),
        ratings: p.ratings,
        ranked: p.ranked,
      }))
      .sort((a, b) => b.power - a.power),
  ),
);
app.use(express.static(resolve("dist/client")));
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) =>
    res.status(400).json({
      error:
        err instanceof z.ZodError
          ? "Invalid request. Check the entered values."
          : err.message,
    }),
);
const server = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server, maxPayload: 16384 }),
  greet: false,
});
gameServer.define("arena", ArenaRoom).filterBy(["mode", "ranked"]);
const port = Number(process.env.SERVER_PORT || 2567);
await gameServer.listen(port, "127.0.0.1");
console.log(
  `Mythoveya server http://127.0.0.1:${port} | Game http://127.0.0.1:${import.meta.url.includes("/dist/") ? port : process.env.CLIENT_PORT || 5173}`,
);
