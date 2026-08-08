import "server-only";
import { getSupabaseServerClient } from "./serverClient";

export function roomChannelName(code: string): string {
  return `room:${code}`;
}

export function userChannelName(userId: string): string {
  return `user:${userId}`;
}

export function friendshipChannelName(friendshipId: string): string {
  return `friendship:${friendshipId}`;
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

// Same mechanism as broadcastToRoom, just account-scoped instead of
// room-scoped — used by the friend system (upgrades/05-friend-system.md)
// for app-wide live notifications (friend requests, acceptances, battle
// invites) delivered to a specific user regardless of which page they're
// on. Never throws, same reasoning as broadcastToRoom.
export async function broadcastToUser(userId: string, event: string, payload: unknown) {
  const supabase = getSupabaseServerClient();
  const channel = supabase.channel(userChannelName(userId));
  try {
    const result = await channel.httpSend(event, payload as Record<string, unknown>);
    if (!("success" in result) || !result.success) {
      console.error(`broadcastToUser(${userId}, ${event}) failed:`, result);
    }
  } catch (err) {
    console.error(`broadcastToUser(${userId}, ${event}) threw:`, err);
  } finally {
    supabase.removeChannel(channel);
  }
}

// Same mechanism again, friendship-scoped — used by friend DMs
// (upgrades/12-friend-chat-trading.md) for instant delivery to a friend who
// currently has that chat window open. Never throws, same reasoning as the
// two above.
export async function broadcastToFriendship(friendshipId: string, event: string, payload: unknown) {
  const supabase = getSupabaseServerClient();
  const channel = supabase.channel(friendshipChannelName(friendshipId));
  try {
    const result = await channel.httpSend(event, payload as Record<string, unknown>);
    if (!("success" in result) || !result.success) {
      console.error(`broadcastToFriendship(${friendshipId}, ${event}) failed:`, result);
    }
  } catch (err) {
    console.error(`broadcastToFriendship(${friendshipId}, ${event}) threw:`, err);
  } finally {
    supabase.removeChannel(channel);
  }
}
