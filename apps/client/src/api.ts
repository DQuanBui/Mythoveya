import type { Profile } from "../../../packages/shared/types";
/** True in the GitHub Pages build, which runs the game without a server. */
export const STANDALONE = import.meta.env.MODE === "pages";
export let session = localStorage.getItem("mythoveya-session") || "";
export function setSession(token: string) {
  session = token;
  localStorage.setItem("mythoveya-session", token);
}
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  if (STANDALONE)
    return (await import("./local-server")).localApi(path, body, session);
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error(
      "The local game server is unavailable. Keep npm run dev running, then try again.",
    );
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error || "The server could not complete this request.");
  return result;
}
export const mutate = (kind: string, data: Record<string, unknown> = {}) =>
  api<{ profile: Profile; value: any }>("mutate", {
    requestId: crypto.randomUUID(),
    kind,
    ...data,
  });
// The online build's save (see apps/server/browser-store.ts) can be moved
// between browsers as a file. It includes the session token for that save.
const SAVE_KEY = "mythoveya-standalone-save";
export function exportSave() {
  return JSON.stringify({
    game: "Mythoveya",
    version: 1,
    exported: new Date().toISOString(),
    session,
    save: JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"),
  });
}
export function importSave(text: string) {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {}
  if (data?.game !== "Mythoveya" || !data.save?.tokens?.[data.session])
    throw Error("This file is not a Mythoveya save.");
  localStorage.setItem(SAVE_KEY, JSON.stringify(data.save));
  setSession(data.session);
}
