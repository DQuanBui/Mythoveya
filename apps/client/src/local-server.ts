import * as routes from "../../server/routes";
// The standalone (GitHub Pages) build has no backend. These requests run the
// server's own handlers in the page, against browser storage.
const handlers: Record<string, (token: () => string, body: any, query: URLSearchParams) => unknown> = {
  "GET health": () => ({ ok: true, game: "Mythoveya" }),
  "POST guest": (_, body) => routes.guest(body),
  "GET profile": (token) => routes.profile(token()),
  "POST mutate": (token, body) => routes.mutateRequest(token(), body),
  "GET festival": (token, _, query) => routes.festivalBoard(token(), query.get("activity") ?? undefined),
  "GET battle": (token) => routes.currentBattle(token()),
  "POST battle/start": (token, body) => routes.battleStart(token(), body),
  "POST battle/act": (token, body) => routes.battleAct(token(), body),
  "GET leaderboard": () => routes.leaderboard(),
};
export async function localApi(path: string, body: unknown, session: string) {
  const [route, search = ""] = path.split("?");
  const handler = handlers[`${body === undefined ? "GET" : "POST"} ${route}`];
  try {
    if (!handler) throw Error("This feature needs the local game server.");
    const result = handler(() => routes.token(`Bearer ${session}`), body, new URLSearchParams(search));
    // Match a network response: callers get a copy, never live game state.
    return JSON.parse(JSON.stringify(result ?? null));
  } catch (e) {
    throw Error(routes.errorMessage(e));
  }
}
