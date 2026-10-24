import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { fetchWithClockSkewRetry } from "./clockSkewFetch";

// Secret key — full table access, bypasses RLS. Only ever imported from
// Route Handlers (app/api/**/route.ts) and Server Components. Route Handlers
// authenticate the caller via lib/session.ts's getCurrentUser() (Supabase
// Auth session, see lib/supabase/ssrServerClient.ts) and then scope every
// query to that user's id themselves. The browser roles have no table
// access at all (supabase/migrations/20261024000000_table_access_lockdown.sql),
// so scoping queries correctly here is what enforces access.
let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseServerClient() {
  if (!client) {
    client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false }, global: { fetch: fetchWithClockSkewRetry } }
    );
  }
  return client;
}
