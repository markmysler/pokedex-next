import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Secret key — full table access, bypasses RLS. Only ever imported from
// Route Handlers (app/api/**/route.ts). Route Handlers trust the httpOnly
// anon_id cookie as the identity boundary instead of Supabase Auth/RLS —
// see the plan's "Auth/trust model" note.
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
