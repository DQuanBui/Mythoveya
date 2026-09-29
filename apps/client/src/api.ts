import type { Profile } from "../../../packages/shared/types";
export let session = localStorage.getItem("mythoveya-session") || "";
export function setSession(token: string) {
  session = token;
  localStorage.setItem("mythoveya-session", token);
}
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
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
