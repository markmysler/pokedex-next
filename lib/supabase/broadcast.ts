import "server-only";
import { getSupabaseServerClient } from "./serverClient";

export function roomChannelName(code: string): string {
  return `room:${code}`;
}

// One-off broadcast from a Route Handler — uses the REST endpoint, no
// WebSocket subscription needed (supabase-js >= 2.107.0's channel.httpSend()).
//
// Never throws: a Realtime hiccup here must not take down the request that's
// already committed the real state change to Postgres (submit_move/
// finalize_round already ran). Broadcast is a best-effort push to speed up
// the OTHER player's client; api/rooms/[code] (GET) + client-side polling
// is the reliability backstop if this silently fails.
export async function broadcastToRoom(code: string, event: string, payload: unknown) {
  const supabase = getSupabaseServerClient();
  const channel = supabase.channel(roomChannelName(code));
  try {
    const result = await channel.httpSend(event, payload as Record<string, unknown>);
    if (!("success" in result) || !result.success) {
      console.error(`broadcastToRoom(${code}, ${event}) failed:`, result);
    }
  } catch (err) {
    console.error(`broadcastToRoom(${code}, ${event}) threw:`, err);
  } finally {
    supabase.removeChannel(channel);
  }
}
