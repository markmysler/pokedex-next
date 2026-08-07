import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Publishable-key client that reads/writes the auth session via request
// cookies (next/headers). Used only to identify the current user
// (supabase.auth.getUser() in lib/session.ts) — never for table access,
// which always goes through the secret-key client in serverClient.ts.
export async function getSupabaseSsrServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, which can't set cookies — fine,
            // proxy.ts already refreshes the session cookie on every request.
          }
        },
      },
    }
  );
}
