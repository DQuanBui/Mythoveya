import express from "express";
import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { resolve } from "node:path";
import * as routes from "./routes";
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
const token = (req: express.Request) => routes.token(req.headers.authorization);
app.get("/api/health", (_, res) => res.json({ ok: true, game: "Mythoveya" }));
app.post("/api/guest", (req, res) => res.json(routes.guest(req.body)));
app.get("/api/profile", (req, res) => res.json(routes.profile(token(req))));
app.post("/api/mutate", (req, res) =>
  res.json(routes.mutateRequest(token(req), req.body)),
);
app.get("/api/festival", (req, res) =>
  res.json(routes.festivalBoard(token(req), req.query.activity)),
);
app.get("/api/battle", (req, res) => res.json(routes.currentBattle(token(req))));
app.post("/api/battle/start", (req, res) =>
  res.json(routes.battleStart(token(req), req.body)),
);
app.post("/api/battle/act", (req, res) =>
  res.json(routes.battleAct(token(req), req.body)),
);
app.get("/api/leaderboard", (_, res) => res.json(routes.leaderboard()));
app.use(express.static(resolve("dist/client")));
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) =>
    res.status(400).json({ error: routes.errorMessage(err) }),
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
