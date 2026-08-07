import "server-only";
import { getSupabaseServerClient } from "./serverClient";

export function roomChannelName(code: string): string {
  return `room:${code}`;
}

// One-off broadcast from a Route Handler — uses the REST endpoint, no
// WebSocket subscription needed (supabase-js >= 2.107.0's channel.httpSend()).
export async function broadcastToRoom(code: string, event: string, payload: unknown) {
  const supabase = getSupabaseServerClient();
  const channel = supabase.channel(roomChannelName(code));
  await channel.httpSend(event, payload as Record<string, unknown>);
  supabase.removeChannel(channel);
}
