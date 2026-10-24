# Upgrade Path

## Active wave: v8, security hardening (implemented on `improvements`, awaiting review)

Driven by an external code review. Every item was validated against a
local Supabase stack (migrations, SQL tests, and an end-to-end script that
tried each exploit against the running app), and the bot battle was
played through in a browser. Not yet merged or deployed.

1. **Direct table access closed** (`20261024000000_table_access_lockdown.sql`):
   `anon`/`authenticated` had insert/update/delete on several tables, so a
   player could use the publishable key to mint Pokemon, add lootboxes,
   forge leaderboard wins or force friendships. Browser roles now have no
   table privileges and the unused per-user policies are gone.
2. **Bot battles moved to the server** (`20261024000200_server_bot_battles.sql`,
   `lib/botBattle.ts`, `app/api/battles/bot/**`): the old
   `/api/battles/bot-result` trusted `{ won: true }` from the client. The
   server now builds both teams, resolves every round and decides the
   result; `BattleArena` only sends the player's choice.
3. **PvP integrity** (`20261024000100_pvp_round_integrity.sql`): the room
   GET no longer returns the opponent's pending move; action indexes are
   integer-checked (`lib/battleValidation.ts`); one move per player per
   round; a round is written once (`finalize_round_at_turn`); battle end
   pays out once (`record_online_battle_end`); leaving mid-battle is a
   forfeit. The old `finalize_round(text, jsonb)` is kept for the deploy
   window only -- drop it in the next migration.
4. **Private Realtime channels** (`20261024000300_private_realtime_channels.sql`).
   Production also needs "Allow public access" turned off under Realtime
   settings in the Supabase dashboard (not settable by migration).
5. **Next.js 16.4.3** (critical advisories in 16.3.0); `npm audit` is clean.
6. **Atomic lootbox opening** (`20261024000400_atomic_lootbox_opening.sql`),
   `readJson`/`serverError` helpers on every route, UUID check on battle
   invites, notes length cap, stale room cleanup.
7. **Tests and CI**: Vitest (`tests/`), SQL tests (`supabase/tests/database.sql`),
   `.github/workflows/ci.yml`.

## Previous waves

The seventh wave, **evolution, Psychic counterplay, and bilingual
support**, shipped in full on 2026-09-20 — see
[archive/v7/main.md](archive/v7/main.md) for the complete 11-step history,
validation notes, and key decisions. Added an evolution system (burn 5
same-species Pokémon for 1 guaranteed instance of its evolution, stats
derived from the 5 burned instances rather than freshly rolled), 6 real
Gen 2/3 Dark-type species (Umbreon; Houndour → Houndoom; Larvitar → Pupitar
→ Tyranitar — Dark being the only hard counter to Psychic, which otherwise
had none in the 151-species Kanto-only roster), and full English/
Argentinian-Spanish bilingual support via `app/[lang]/` URL-segment
routing. It followed [archive/v6/main.md](archive/v6/main.md) (the
mana-to-uses migration, 8 steps, shipped 2026-09-11), which followed
[archive/v5/main.md](archive/v5/main.md) (the full visual redesign, 10
steps, shipped 2026-08-19), which followed
[archive/v4/main.md](archive/v4/main.md) (the attack/move-kind rework, 9
steps, shipped 2026-08-14), which followed
[archive/v3/main.md](archive/v3/main.md) (5 steps), which followed
[archive/v2/main.md](archive/v2/main.md) (15 steps), which followed the
original 8-step plan in [archive/main.md](archive/main.md).

A same-type-attack-bonus (STAB) mechanic was proposed, simulated in full
(3,000 rolls/species across all 151 species), and explicitly rejected
during planning — Mewtwo's own absolute power gain would have been the
largest in the game, widening the exact problem this wave existed to fix,
while the Dark counter turned out not to need it at all (the existing type
chart alone already gives a decisive 2x/0x matchup). See
[archive/v7/main.md](archive/v7/main.md)'s "Key decisions made" for the
full analysis, preserved rather than summarized away, in case the idea
resurfaces later.

Two real bugs were found and fixed along the way, neither part of the
wave's original scope:

- A pre-existing security gap (unrelated to this wave, surfaced while
  validating step 50): every Postgres RPC in this schema was callable
  directly over the REST API by anyone holding the public anon key, due to
  a Supabase default-privilege quirk that the existing `grant ... to
  service_role` pattern never actually excluded. Fixed the same day, see
  [archive/v7/main.md](archive/v7/main.md)'s "⚠ Security finding from step
  50."
- A pre-existing type-immunity bug, found by step 58's own roster-wide
  validation: a 0x type matchup (e.g. Psychic vs. Dark) still dealt 1
  damage due to a damage-floor clamp that didn't special-case true
  immunity — directly undermining this wave's own Psychic-counterplay
  goal until fixed. See
  [archive/v7/58-docs-and-roster-validation.md](archive/v7/58-docs-and-roster-validation.md).

One item from the wave's own validation plan remains genuinely unverified:
a real browser pass over the bilingual UI (this is a CLI-only environment
with no GUI) — same standing limitation every prior wave since v4 has
carried forward. Worth a manual pass before/alongside real player traffic,
particularly for the language toggle and any text that might overflow a
fixed-width layout once translated.

The redesign's own source-of-truth docs live outside `upgrades/` and stay
current going forward, independent of any wave's lifecycle:

- **[design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)** — the
  token/component spec (palette, type, spacing, radius, meters, nav,
  battle log) as actually implemented.
- **[design/REDESIGN_TRACKER.md](../design/REDESIGN_TRACKER.md)** —
  per-screen status; all 15 screens + 10 shared components read ✅ Done,
  with this wave's Evolve UI and language toggle additions noted inline.

## Starting a new wave

When the next batch of work is scoped:

1. Create numbered step files here in `upgrades/` (continue numbering
   from 59), each with: Status, Why here, What changes, and an End state
   checklist — same shape every prior wave used.
2. Rewrite this file to describe the new wave, its step table, "why this
   order," and a running "key decisions made" log — replacing this
   placeholder.
3. Work through steps in order, one at a time: read the step file in
   full, implement it in isolation (don't pull in later steps' scope
   even if convenient), validate against its End state checklist, only
   then move on.
4. Once every step ships, archive this file + the step files to
   `upgrades/archive/v8/` (following this file's own git history for the
   exact pattern) and write a fresh "no active wave" `main.md` — same as
   this one.
