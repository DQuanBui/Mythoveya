import { beforeEach, describe, it, expect, vi } from "vitest";
// The GitHub Pages build swaps the SQLite store for the browser store. Run the
// real request handlers and game modules the same way.
vi.mock("../apps/server/store", () => import("../apps/server/browser-store"));
const saved = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => void saved.set(k, v),
};
const { localApi } = await import("../apps/client/src/local-server");
const store = await import("../apps/server/browser-store");
const game = await import("../apps/server/game");
const call = (token: string, path: string, body?: unknown) => localApi(path, body, token);
const mutate = (token: string, kind: string, data: object = {}, requestId = crypto.randomUUID()) =>
  call(token, "mutate", { requestId, kind, ...data });
async function keeper() {
  const { token } = await call("", "guest", { name: "Pages Keeper", avatar: 2 });
  await mutate(token, "starter", { species: "emberfox" });
  return token as string;
}
beforeEach(() => {
  saved.clear();
  store.reloadStandaloneStore();
});
describe("standalone browser server", () => {
  it("creates a guest whose progress survives a page reload", async () => {
    const token = await keeper();
    await mutate(token, "guide");
    expect(saved.get(store.STORAGE_KEY)).toBeTruthy();
    store.reloadStandaloneStore();
    const p = await call(token, "profile");
    expect(p.name).toBe("Pages Keeper");
    expect(p.owned.map((o: any) => o.species)).toContain("emberfox");
    expect(p.team).toHaveLength(6);
  });

  it("replays a retried mutation without granting it twice", async () => {
    const token = await keeper();
    const id = crypto.randomUUID();
    const first = await mutate(token, "guide", {}, id);
    const again = await mutate(token, "guide", {}, id);
    expect(again).toEqual(first);
    expect((await call(token, "profile")).owned).toHaveLength(first.profile.owned.length);
  });

  it("rolls back a failed mutation and reports server errors", async () => {
    const token = await keeper();
    const before = saved.get(store.STORAGE_KEY);
    await expect(mutate(token, "starter", { species: "ripplefin" })).rejects.toThrow("already chose a starter");
    expect(saved.get(store.STORAGE_KEY)).toBe(before);
    await expect(call(token, "guest", { name: "x", avatar: 0 })).rejects.toThrow("Invalid request");
    await expect(call("bad", "profile")).rejects.toThrow("Invalid request");
    await expect(call(token, "matchmake/arena", {})).rejects.toThrow("needs the local game server");
  });

  it("settles a full computer battle once and saves the rewards", async () => {
    const token = await keeper();
    await mutate(token, "guide");
    const start = await call(token, "battle/start", { practice: false });
    const id = (await call(token, "profile")).id;
    let b = start;
    for (let i = 0; i < 400 && b.winner === null; i++) {
      game.pve.get(id)!.readyAt = 0;
      b = await call(token, "battle/act", { auto: true, fast: true, sequence: b.sequence });
    }
    expect(b.winner).not.toBeNull();
    expect(b.rewards).toBeTruthy();
    store.reloadStandaloneStore();
    const p = await call(token, "profile");
    expect(store.matchRecorded(b.id)).toBe(true);
    if (b.winner === 0) expect(p.wins).toBe(1);
    expect(await call(token, "battle")).toMatchObject({ id: b.id, winner: b.winner });
  });

  it("serves local rankings and festival boards", async () => {
    const token = await keeper();
    const board = await call(token, "leaderboard");
    expect(board.map((r: any) => r.name)).toContain("Pages Keeper");
    const fest = await call(token, "festival?activity=race");
    expect(fest).toMatchObject({ today: [], allTime: [], ghosts: [] });
  });
});
