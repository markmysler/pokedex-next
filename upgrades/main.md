# Upgrade Path

## Evolution, Psychic counterplay, and bilingual support (planned — steps 48–58)

Seventh wave, requested 2026-09-18 right after the sixth wave (the mana-to-uses
migration, 8 steps — see [archive/v6/main.md](archive/v6/main.md)) shipped in
full. Three independent feature requests, bundled into one wave the same way
v6 bundled its own unrelated balance patches:

1. **Evolution** — burn 5 owned, non-starter Pokemon of the same species for
   1 guaranteed instance of its evolution (e.g. 5 Pikachu → 1 Raichu),
   structurally a sibling of the existing Trade Up feature
   (`upgrades/archive/v2/14-pokemon-tradeup.md`) rather than a new mechanic
   from scratch.
2. **Psychic counterplay** — Mewtwo (and Psychic generally) has no hard
   counter today: Dark, the only type immune to Psychic damage
   (`TYPE_MATCHUPS.Psychic.Dark = 0.0`), doesn't exist anywhere in the
   151-species roster (Dark wasn't introduced until Gen 2). Fixed by adding
   3 real Dark-type lines in full (Umbreon; Houndour → Houndoom; Larvitar →
   Pupitar → Tyranitar — 6 species total, not just the 3 counter-relevant
   final stages) — a deliberate, acknowledged departure from "all 151 Kanto
   species." **A same-type-attack-bonus (STAB) mechanic was also proposed,
   simulated, and explicitly rejected** during planning — see "key decisions
   made" below for the full reasoning; it isn't part of this wave.
3. **Bilingual support (English/Argentinian Spanish)** — a toggle in the same
   `SideNav` account block as the existing Sound toggle, using full
   `app/[lang]/` URL-segment routing (per this Next version's own docs,
   `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`),
   with the standing preference mirrored to `localStorage` so a fresh visit
   lands on the right locale without depending on `Accept-Language`.

Evolution and the new species ship before the i18n content steps so their
strings (the Evolve UI, "Umbreon," "Houndoom," "Tyranitar," etc.) get
translated once, in their final form, not twice.

| # | Step | File | Depends on | Status |
|---|------|------|------------|--------|
| 48 | Evolution: species data model (`evolvesInto`, Eevee's 3-way branch) | [48-evolution-data-model.md](48-evolution-data-model.md) | — | Shipped |
| 49 | Evolution: derived-stat formula + moveset roll | [49-evolution-stat-derivation-and-moveset.md](49-evolution-stat-derivation-and-moveset.md) | 48 | Shipped |
| 50 | Evolution: DB migration + `evolve_pokemon` RPC | [50-evolution-db-migration-and-rpc.md](50-evolution-db-migration-and-rpc.md) | 48 | Shipped (pending deploy) |
| 51 | Evolution: API route + Inventory UI/reveal | [51-evolution-api-and-inventory-ui.md](51-evolution-api-and-inventory-ui.md) | 49, 50 | Shipped |
| 52 | Psychic counterplay: Umbreon + Houndour/Houndoom + Larvitar/Pupitar/Tyranitar (full lines) + Dark damage moves + sprites | [52-psychic-counterplay-new-dark-species.md](52-psychic-counterplay-new-dark-species.md) | — | Planned |
| 53 | i18n: `app/[lang]/` routing + dictionary infrastructure + toggle | [53-i18n-routing-and-toggle-infrastructure.md](53-i18n-routing-and-toggle-infrastructure.md) | — | Planned |
| 54 | i18n content: Account cluster (Login/Signup/Dashboard/Profile) | [54-i18n-account-cluster.md](54-i18n-account-cluster.md) | 53 | Planned |
| 55 | i18n content: Collection cluster (Pokédex/Inventory/Lootbox + Evolve UI + new species) | [55-i18n-collection-cluster.md](55-i18n-collection-cluster.md) | 53, 51, 52 | Planned |
| 56 | i18n content: Battle cluster (Team Picker/Arena/Online+chat) | [56-i18n-battle-cluster.md](56-i18n-battle-cluster.md) | 53 | Planned |
| 57 | i18n content: Social cluster (Friends/Trade/Notifications/History/Leaderboard) + onboarding copy | [57-i18n-social-cluster.md](57-i18n-social-cluster.md) | 53 | Planned |
| 58 | Docs pass + roster-wide validation | [58-docs-and-roster-validation.md](58-docs-and-roster-validation.md) | all | Planned |

## Why this order

- **48 (evolution data model) first** within the evolution slice — 49/50/51
  all need `evolvesInto` to exist first, same role step 40 played in v6.
- **49 (stat/moveset logic) and 50 (DB/RPC) are independent of each other**
  (pure TS math vs. SQL) but both need 48 — order between them doesn't
  matter, split for clarity of scope, same precedent v6's 44/46 split used.
- **51 (API + UI) last in the evolution slice** — needs both the computed
  result (49) and the atomic write path (50) to exist before there's
  anything to call from a route.
- **52 (new species) has no dependency on anything else in this wave** —
  Dark's counter to Psychic works entirely off existing type-effectiveness
  math (`TYPE_MATCHUPS.Dark.Psychic = 2.0`, `TYPE_MATCHUPS.Psychic.Dark =
  0.0`), no engine change involved (see "key decisions made" for why a
  same-type-bonus mechanic was considered here and dropped). Placed right
  after the evolution slice mainly so both gameplay-content slices land
  before the larger i18n slice. Note this does mean Eevee ships (step 48)
  with only its historically-accurate 3-way Gen 1 branch, and step 52 amends
  that same `pokedex.json` entry to add Umbreon as a 4th — a deliberate
  one-directional exception to "don't pull in later steps' scope," justified
  by 48's 3-way version being correct and shippable on its own (Umbreon
  didn't exist in Gen 1 either), not a half-finished stub waiting on 52.
- **53 (i18n infra) before any content step** — 54-57 all need the
  `app/[lang]/` routing, the dictionary loader, and the toggle to exist.
  It has no dependency on 48-52 and could ship in parallel, but is ordered
  last-but-content because it's the biggest, most invasive change in the
  wave (every route in `app/` moves), and translating strings that are
  still about to change (the Evolve UI, the new species names) would mean
  doing some of that work twice.
- **54-57 (per-cluster content) split along the same 4 clusters
  `design/REDESIGN_TRACKER.md` already uses** — Account, Collection, Battle,
  Social — since that grouping already proved itself once for a
  full-app sweep. 55 depends on 51 and 52 specifically because it covers the
  screens those steps touch (Inventory's new Evolve button, the Pokédex
  entries for the 6 new species).
- **58 (docs + validation) is last** — a sanity pass across the whole wave,
  mirrors v6's step 47 closing role.

## Key decisions made

From the 2026-09-18 planning pass (this file was written before any
implementation — flag disagreement before step 48 starts):

- **Evolution's species-level fact (`evolvesInto`) lives in
  `lib/data/pokedex.json`**, not a new DB table or column — there's no
  species-level table in the schema at all today (only per-instance
  `pokemon_instances`), and every other species fact (types, base stats,
  canonical moves) already lives there. Matches the existing "static
  content in the repo, per-instance state in the DB" split.
- **The evolution mechanic is a structural sibling of Trade Up**
  (`upgrades/archive/v2/14-pokemon-tradeup.md`): burn exactly 5 owned,
  non-starter instances of one species, one atomic Postgres function
  (`evolve_pokemon`, modeled directly on `trade_up_pokemon`), re-validated
  server-side against the actual rows (never trusts a client pre-check).
  Starters are excluded the same way Trade Up excludes them — not just
  precedent, but load-bearing here: a starter can never reach a stack of 5
  in the first place (exactly one per account).
- **Eevee's branch (Vaporeon/Jolteon/Flareon) is resolved server-side by a
  uniform random pick** at evolve time, not a player choice — confirmed
  with the user directly (their own preference, not a cost/complexity call
  this time). The resolution logic picks over however many entries
  `evolvesInto` currently holds (not a hardcoded "1 of 3") specifically
  because step 52 later appends Umbreon as a 4th branch — ships 3-way,
  grows to 4-way with no engine change required.
- **Evolved stats are derived from the 5 burned instances**, using the same
  z-score-against-own-species-distribution convention `lib/shiny.ts` already
  established for the shiny check (`STAT_SPREAD_RATIO = 0.12`), re-centered
  on the evolved species' base stats — not a plain average, and not a fresh
  roll. See step 49 for the full formula. The moveset, by contrast, **is** a
  fresh `rollMoveset()` roll of the evolved species — there's no equivalent
  "derive" operation for a categorical move pick the way there is for a
  continuous stat, confirmed as the intended split with the user.
- **6 real Gen 2/3 Dark-type species are being added — full pre-evolution
  lines, not just the counter-relevant final stages**: Umbreon (standalone),
  Houndour → Houndoom, Larvitar → Pupitar → Tyranitar. The user's explicit
  call, both on adding real species at all (over retyping/buffing an
  existing Kanto one, which would have stayed Kanto-only) and on adding
  their complete lines rather than single entries. Larvitar/Pupitar are
  Rock/Ground, not Dark — Tyranitar only gains Dark on its final stage, same
  as the real games. No hardcoded `151` exists anywhere in the app
  (confirmed by a full-repo grep) — `pokedexOwnedPct` and every other
  dex-size-derived stat compute off the actual dex size already, so adding
  6 species (157 total) doesn't need a separate "denominator" fix.
- **The move pool has zero Dark-type damage moves today** (only 3 Dark
  support moves exist: Screech, Vampire Fang, Taunt) — a gap already flagged
  as pre-existing in `archive/v6/main.md`'s key decisions ("Dark has 0
  own-type damage moves in the pool at all"). Step 52 has to author at least
  1-2 Dark damage moves, or Houndour/Houndoom/Umbreon's own-type
  damage-slot rolls would starve and fall back to the any-type pool 100% of
  the time — otherwise they'd rarely land the Dark-type hit their whole
  counter-play depends on.
- **A same-type-attack-bonus (STAB) mechanic was proposed, simulated, and
  explicitly rejected.** The pitch was to give the new Dark-types a bigger
  offensive edge against Mewtwo by rewarding own-type moves with a flat
  1.5x. Before building it, the actual meta impact was simulated (3,000
  rolls/species, all 151 species, reproducing `rollOneMove`/`rollMoveset`
  exactly) rather than assumed: 79.0% roster-wide STAB-eligible rate, ~1.4x
  average damage multiplier, dual-type species systematically favored over
  single-type (84.0% vs. 75.0%), and — the decisive finding — **Mewtwo's own
  STAB rate was unremarkable (79.5%, dead average) but its absolute power
  gain would have been the largest of any species in the game** (a flat
  percentage bonus applied to an already-top-2 stat total produces the
  biggest raw gain), with the rest of the top 10 gainers almost entirely
  other legendaries/pseudo-legendaries. Separately, the Dark counter turns
  out not to need it at all: `TYPE_MATCHUPS.Dark.Psychic = 2.0` and
  `TYPE_MATCHUPS.Psychic.Dark = 0.0` already give a Dark-type 2x damage in /
  0x damage taken against Mewtwo purely from the existing type chart — a
  decisive matchup with or without STAB. So STAB would have widened this
  wave's original problem (Mewtwo getting relatively stronger almost
  everywhere else) while not meaningfully improving the one matchup it was
  meant to help. Dropped entirely, not deferred — if it comes back later
  it should be its own dedicated wave with its own move-power retune and
  validation, decoupled from this fix. Full simulation output lived in step
  52's file before this decision, preserved in this file's git history for
  anyone who wants to revisit it.
- **Language architecture is full `app/[lang]/` path routing**, per this
  Next version's own documented pattern (`next/root-params`, dictionaries
  loaded server-side), not a client-only localStorage toggle — the user's
  explicit choice after being shown both, specifically because most page
  text lives in Server Components (confirmed directly in `DashboardPage`),
  which a pure client-side toggle can't reach without a flash. Locale
  resolution precedence in `proxy.ts`: existing URL segment → localStorage-
  mirrored cookie → `Accept-Language` header → default `en`.
- **i18n content is translated once, after the evolution and new-species
  work ships** (steps 48-52 before 53-57) — specifically so the Evolve UI's
  strings and "Umbreon"/"Houndoom"/"Tyranitar" get localized in their final
  form, not translated twice.
- **"Argentinian Spanish" means real `vos`-form/`che` register**, not neutral
  Latin American Spanish — the user's own explicit framing of the audience
  (Argentina), not softened during planning.
- **The battle log (step 56) is refactored from `log: string[]` to
  structured `BattleLogEvent[]` objects, rendered into localized sentences
  client-side** — the user's explicit call over making the engine itself
  locale-aware. Confirmed this needs no DB migration: the log is never
  persisted (`match_results` only stores outcome metadata, `battle_rooms`
  never stores it either), so the change is contained to
  `lib/battleEngine.ts`'s return shape and its two client consumers
  (`BattleArena.tsx`/`OnlineBattle.tsx`).
- **Notifications (step 57) turned out to already be event-shaped** —
  `notifications.payload` is raw structured JSONB with no rendered text
  baked in, and rendering already happens at read time
  (`renderNotification()`/`FriendNotifications.tsx`). The user asked for the
  same structured-event approach here as step 56; discovered during
  planning that this table already works that way, so step 57 only needs to
  make the existing render functions pull from the dictionary instead of
  hardcoded English — no schema change or migration.

## ⚠ Security finding from step 50 — fixed (standalone, outside the wave's step numbering)

Validating step 50's `evolve_pokemon` RPC against the local Supabase
instance surfaced a **live production security gap, unrelated to this
wave**: Supabase's own project provisioning grants `EXECUTE` on every new
`public`-schema function to `anon`/`authenticated` automatically (confirmed
via `pg_proc.proacl`/`pg_default_acl`), which the `grant execute ... to
service_role` pattern used by every prior RPC in this schema
(`trade_up_pokemon`, `accept_trade`, `submit_move`, `increment_released_
count`, `claim_lootboxes`, and `evolve_pokemon` before it was fixed) does
**not** revoke — that grant is additive, not exclusive. Verified concretely:
calling these RPCs over the REST API with only the public anon key
succeeded and mutated real rows, before the fix below.

**Practical impact (now fixed, see below)**: anyone holding the public anon
key (ships in every client bundle, by design) could call these RPCs
directly against production's REST API, passing an arbitrary `p_user_id`,
bypassing all app-level auth entirely.

**Fixed, per the user's explicit go-ahead, before continuing to step 51**:
new migration `supabase/migrations/20260918010000_rpc_execute_lockdown.sql`
explicitly revokes `public`/`anon`/`authenticated` execute on all 8
existing sensitive functions (the 6 above + `evolve_pokemon` again,
idempotently + `handle_new_user`, defensively — it's a trigger function so
wasn't actually reachable this way, but costs nothing to lock down too).
Verified on the local instance: all 8 now show only `postgres`/
`service_role` in `pg_proc.proacl`; anon key gets `42501 permission denied`
on every one tested over REST; `service_role` calls still succeed
(regression-checked `trade_up_pokemon`'s happy path). This migration
applies to production the same way every other one does — once pushed to
`main`, the same fix lands there.

**Also discovered while writing the fix, worth keeping in mind for every
future step that adds a new Postgres function**: `alter default privileges
... revoke execute on functions from public` does **not** reliably prevent
this from recurring — tested directly (see the migration's own comments):
a brand-new function, created immediately after fully rebuilding the
default ACL to exclude `PUBLIC`, still got `PUBLIC` execute automatically
anyway. This environment appears to apply an unconditional PUBLIC-execute
default to new functions that default-privilege customization can't
suppress. **The only reliable mitigation found: every new function that
shouldn't be public-callable must include its own explicit `revoke execute
on function ... from public, anon, authenticated;` immediately after
creation** — same as `evolve_pokemon`'s own migration and this hotfix both
do. Worth remembering for step 51 onward if any future step adds another
Postgres function.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Any step that writes to production data (none in the evolution slice
   burn/create anything until a real user acts — but the migration itself,
   once pushed, is live for everyone) gets a dry-run-then-confirm go-ahead
   from the user before anything irreversible runs.
5. Only move to the next step once its listed dependencies are checked off.
6. Once every step ships, archive this file + the step files to
   `upgrades/archive/v7/` and write a fresh "no active wave" `main.md`.
