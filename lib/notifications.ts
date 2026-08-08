import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

export type NotificationKind =
  | "friend-request"
  | "friend-request-accepted"
  | "battle-invite"
  | "friend-message"
  | "trade-offer"
  | "trade-resolved";

const NOTIFICATIONS_LIMIT = 50;

// Thin insert wrapper, called alongside the existing broadcastToUser() call
// at each of the 7 sites that already push one of these six event kinds as
// a live toast (upgrades/17-persistent-notifications.md) -- same payload
// shape already being broadcast, so there's exactly one shape to keep in
// sync, not two. Best-effort: a failure to persist shouldn't fail the
// request that already completed its real work, same never-throws posture
// broadcastToUser() itself already has.
export async function createNotification(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: NotificationKind,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({ user_id: userId, kind, payload: payload as unknown as Json });
  if (error) console.error(`createNotification(${userId}, ${kind}) failed:`, error.message);
}

export interface NotificationEntry {
  id: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  createdAt: string;
  read: boolean;
  // Only meaningful for kind === "battle-invite" -- whether the room is
  // still actually joinable (status still 'waiting', no player2 yet),
  // resolved server-side so a stale invite doesn't offer a dead "Accept"
  // button that fails confusingly on click.
  battleInviteJoinable?: boolean;
}

// Shared by GET /api/notifications and the /notifications Server
// Component -- one query, no duplicated fetch-and-map logic.
export async function getNotificationsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NotificationEntry[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);
  if (error) throw new Error(error.message);

  const rows = data ?? [];

  const roomCodes = Array.from(
    new Set(
      rows
        .filter((r) => r.kind === "battle-invite")
        .map((r) => (r.payload as { roomCode?: string }).roomCode)
        .filter((code): code is string => Boolean(code))
    )
  );
  const joinableByCode = new Map<string, boolean>();
  if (roomCodes.length > 0) {
    const { data: rooms } = await supabase.from("battle_rooms").select("code, status, player2_id").in("code", roomCodes);
    // "waiting_for_players", not "waiting" -- matches the actual status
    // string POST /api/rooms/[code]/join checks (app/api/rooms/[code]/join/route.ts),
    // not the migration's schema-level default column value.
    for (const r of rooms ?? []) joinableByCode.set(r.code, r.status === "waiting_for_players" && r.player2_id === null);
  }

  return rows.map((r) => {
    const payload = r.payload as Record<string, unknown>;
    return {
      id: r.id,
      kind: r.kind as NotificationKind,
      payload,
      createdAt: r.created_at,
      read: r.read_at !== null,
      battleInviteJoinable: r.kind === "battle-invite" ? (joinableByCode.get(payload.roomCode as string) ?? false) : undefined,
    };
  });
}

// One bulk update, not a per-item "mark read" -- opening the Notifications
// page is itself "you've now seen these" (upgrades/17-persistent-notifications.md),
// same simplicity precedent as visiting /friends already implicitly
// "handling" incoming requests today.
export async function markAllNotificationsRead(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (error) throw new Error(error.message);
}

// Shared by AppLayout (sidebar badge) and anywhere else that just needs the
// count, not the full list.
export async function getUnreadNotificationCount(supabase: SupabaseClient<Database>, userId: string): Promise<number> {
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
