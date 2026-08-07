import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Secret key — full table access, bypasses RLS. Only ever imported from
// Route Handlers (app/api/**/route.ts) and Server Components. Route Handlers
// authenticate the caller via lib/session.ts's getCurrentUser() (Supabase
// Auth session, see lib/supabase/ssrServerClient.ts) and then scope every
// query to that user's id themselves — RLS policies also exist on
// user_pokedex/profiles as defense-in-depth, but this client bypasses them,
// so scoping queries correctly here is what actually enforces access.
let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseServerClient() {
  if (!client) {
    client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}
