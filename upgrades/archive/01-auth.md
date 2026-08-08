# Step 1: Auth (Supabase email/password, login required app-wide)

## Why first

Every other step either needs a durable `user_id` (match history, leaderboard) or is easier to reason about once "who is the current user" has one answer instead of two (anon cookie vs. account). Doing this last would mean re-touching every Route Handler a second time.

## What changes

Login is required for the entire app, including the Pokedex tab — not just online battles. The anonymous `anon_id` cookie is removed, not kept alongside accounts.

### Auth pages
- `app/login/page.tsx` — email/password sign-in, Client Component using `supabase.auth.signInWithPassword`.
- `app/signup/page.tsx` — email/password sign-up using `supabase.auth.signUp`. Collect a `display_name` at signup time (needed later for the leaderboard — email should never be shown publicly).
- Both pages must be reachable *without* a session (the proxy allow-list below).

### Session handling
- Switch from the raw `@supabase/supabase-js` clients to `@supabase/ssr`'s `createServerClient`/`createBrowserClient`, which handle session cookies (access + refresh token) instead of the app manufacturing its own cookie.
- `lib/session.ts`'s `readAnonId()` is replaced by something like `getCurrentUser()` that reads the authenticated user off the session. Every call site that used `readAnonId()` switches to this.
- `proxy.ts` (Next 16 proxy, not `middleware.ts`) checks for a valid session on every request. Unauthenticated requests to anything other than `/login`, `/signup`, and their own API routes (`/api/auth/*` if you add any) redirect to `/login`.

### Database
- `user_pokedex.anon_id` → `user_pokedex.user_id`, type `uuid references auth.users(id)`.
- `battle_rooms.player1_id` / `player2_id` → same `uuid references auth.users(id)`.
- Add a small `profiles` table (`user_id` PK, `display_name`) populated on signup — needed by step 5 for the leaderboard, cheap to add now while the auth migration is already touching this area.
- Enable RLS policies scoped to `auth.uid() = user_id` for `user_pokedex` (finally moving off the current zero-policy/service-role-only model). `battle_rooms` can stay service-role-only server-side, since race-safe round resolution already goes through the `submit_move`/`finalize_round` RPCs — no reason to open direct client writes to it.
- **Existing data**: wipe `user_pokedex` and `battle_rooms` rows before applying the new schema. They're keyed by anon cookie UUIDs that have no relationship to a real account, so there's nothing meaningful to migrate.

### Cleanup
- Remove the `anon_id` cookie-setting logic from `proxy.ts` once the session check replaces it.
- Remove any now-dead anon-cookie code paths in `lib/session.ts` and Route Handlers.

## End state

- [ ] Visiting any page while logged out redirects to `/login`; `/login` and `/signup` themselves are reachable while logged out.
- [ ] Signing up creates a Supabase Auth user **and** a `profiles` row with the chosen display name.
- [ ] Logging in/out works and persists across a page refresh.
- [ ] The Pokedex tab's "caught"/notes data is scoped per-account: two different accounts (not two browsers — same browser, two accounts) see independent Pokedex state.
- [ ] Creating and joining an online battle room works end-to-end using the new `user_id`-based identity (no references to `anon_id` remain in the codebase — `grep -r anon_id pokedex-next` returns nothing outside of migration history).
- [ ] `npm run build` succeeds with no TypeScript errors from the `Database` type changes.
- [ ] Supabase table editor confirms `user_pokedex` and `battle_rooms` now key off `user_id`/`player1_id`/`player2_id` as `uuid` columns referencing `auth.users`, and that RLS policies exist on `user_pokedex`.
