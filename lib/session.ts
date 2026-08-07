import "server-only";
import { cookies } from "next/headers";

export const ANON_ID_COOKIE = "anon_id";

// proxy.ts assigns this cookie on every request before it reaches a Route
// Handler, so it should always be present here. Route Handlers should treat
// a missing value as a client error rather than silently generating one —
// only proxy.ts is the source of truth for anon_id.
export async function readAnonId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ANON_ID_COOKIE)?.value ?? null;
}
