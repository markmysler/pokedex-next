-- Security hotfix, discovered validating step 50 (upgrades/50-evolution-
-- db-migration-and-rpc.md's "What actually happened") -- flagged in
-- upgrades/main.md as a pre-existing, out-of-wave production issue, fixed
-- here on its own as agreed with the user before continuing the wave.
--
-- Root cause (confirmed via pg_default_acl / pg_proc.proacl on the local
-- instance): Supabase's own project provisioning sets a default privilege
-- for role `postgres` in schema `public` that auto-grants EXECUTE on every
-- new function to `anon`/`authenticated`/`service_role` -- on top of
-- PostgreSQL's own separate built-in default of granting EXECUTE to PUBLIC
-- (every role, including anon/authenticated, are members of PUBLIC).
-- Neither of these is revoked by the `grant execute ... to service_role`
-- pattern every function in this schema (correctly) uses -- that grant is
-- purely additive, it was never actually exclusive. The result: every
-- function below has been callable by anyone holding the public anon key
-- (shipped in every client bundle) since the migration that created it,
-- completely bypassing the app-level auth every Route Handler enforces.
--
-- This migration applies via the same Supabase GitHub integration as every
-- other one here -- pushing it to `main` fixes production the same way it
-- fixes the local instance.

-- Part 1: narrow the stored default for any function created from here on.
-- Migrations in this project are applied as role `postgres` (confirmed:
-- every existing function's owner/grantor is `postgres`), so this default
-- applies to every future `create function` this project's migrations run.
--
-- IMPORTANT CAVEAT, confirmed empirically while writing this migration (see
-- upgrades/50-evolution-db-migration-and-rpc.md): this statement does stop
-- `anon`/`authenticated` from being auto-granted on new functions, but it
-- does NOT suppress this environment's separate, unconditional default of
-- granting EXECUTE to PUBLIC on every newly created function -- tested
-- directly (create a throwaway function immediately after running this
-- exact revoke, including a full from-scratch rebuild of the default ACL
-- containing only postgres/service_role): the new function's ACL still
-- included a bare PUBLIC entry every time, regardless. Since every role
-- (including anon/authenticated) is a member of PUBLIC, a PUBLIC grant
-- alone is sufficient to make a function callable by the anon key -- so
-- this ALTER DEFAULT PRIVILEGES statement is, on its own, NOT a reliable
-- guard for future functions in this environment, despite narrowing what
-- it can narrow. Keeping it (harmless, marginally reduces surface), but
-- the actual, reliable convention going forward: every future function
-- that shouldn't be public-callable MUST include its own explicit
-- `revoke execute on function ... from public, anon, authenticated;`
-- immediately after creation, exactly like Part 2 below and like
-- evolve_pokemon's own migration already does -- verified this per-
-- function form works correctly every time it's been tested.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Part 2: fix every function that already exists and takes attacker-
-- controlled parameters server-side logic depends on being unreachable by
-- anyone but service_role. (handle_new_user() is a trigger function --
-- Postgres refuses to invoke a trigger-returning function outside trigger
-- context, and PostgREST doesn't expose "trigger"-return functions as RPC
-- endpoints either, so it isn't reachable the same way -- included anyway
-- for defense in depth, at no cost.)
revoke execute on function public.submit_move(text, int, jsonb) from public, anon, authenticated;
revoke execute on function public.finalize_round(text, jsonb) from public, anon, authenticated;
revoke execute on function public.accept_trade(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.increment_released_count(uuid) from public, anon, authenticated;
revoke execute on function public.trade_up_pokemon(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.claim_lootboxes(uuid, int) from public, anon, authenticated;
revoke execute on function public.evolve_pokemon(uuid, uuid[], text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
