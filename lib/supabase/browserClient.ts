import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Publishable key only — safe to expose to the browser. Used exclusively to
// subscribe to Realtime broadcast events for online battle rooms; the
// browser never reads/writes tables directly (see serverClient.ts).
let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { realtime: { params: { eventsPerSecond: 10 } } }
    );
  }
  return client;
}
