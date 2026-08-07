import "server-only";
import { getSupabaseSsrServerClient } from "@/lib/supabase/ssrServerClient";

// proxy.ts redirects unauthenticated requests to /login before they reach a
// Route Handler or Server Component, so callers should normally get a user
// back here — but Route Handlers must not assume that: treat a null return
// as a real 401, the same way you'd treat any other public-facing endpoint
// (see node_modules/next/dist/docs/01-app/02-guides/authentication.md).
//
// Uses getUser() rather than getSession(): getUser() revalidates the JWT
// against the Supabase Auth server instead of trusting the (spoofable)
// cookie payload outright.
export async function getCurrentUser() {
  const supabase = await getSupabaseSsrServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
