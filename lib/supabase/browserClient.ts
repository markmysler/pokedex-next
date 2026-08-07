import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Publishable key only — safe to expose to the browser. Uses @supabase/ssr's
// browser client (not plain supabase-js's createClient) so the auth session
// is stored in cookies instead of localStorage — that's what lets proxy.ts
// and server-side Route Handlers see the same session the browser has.
// Also used to subscribe to Realtime broadcast events for online battle
// rooms; the browser never reads/writes tables directly (see serverClient.ts).
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { realtime: { params: { eventsPerSecond: 10 } } }
    );
  }
  return client;
}
