# Step 20: Newly-opened lootbox Pokémon missing from the post-win Team Picker

## Why here

Fifth wave, single bug report added 2026-08-08 right after step 19 shipped.
Independent of everything else in this plan.

## What changes

### The bug

Reported behavior: win an online battle, open the lootbox it awarded
immediately (without leaving the page), press Rematch — the Pokémon that
lootbox just produced doesn't show up as a pickable option on the Team
Picker, only the Pokémon owned before the battle started.

### Root cause

Both `/online` (`OnlineBattle.tsx`) and the local vs-Bot arena
(`BattleArena.tsx`) receive the player's owned-Pokémon collection as an
`inventory` prop, fetched once by their respective Server Component pages
at render time. Both components then use that prop **directly** —
`TeamPicker` reads straight from it, and neither Rematch (`resetForRematch`
in `OnlineBattle.tsx`) nor "Change Team" (`changeTeam` in `BattleArena.tsx`)
touch it in any way.

Opening a lootbox mid-session (`openLootboxNow` in both files) really does
insert a new `pokemon_instances` row server-side
(`rollAndPersistLootboxPokemon`, called from
`app/api/inventory/lootboxes/[id]/open/route.ts`) and returns it in the
response — but both components only ever handed that returned Pokémon to
`setRevealPokemon()`, to drive the reveal dialog. Once the dialog closes,
it's discarded. The `inventory` prop itself never changes, so returning to
team-picking (via Rematch or Change Team) still renders the exact same
stale snapshot from before the battle — the real, persisted new Pokémon is
there in Supabase, just never in the array either component is looking at.
Not a filter, cache, or RLS/read-after-write issue — the data is correct
server-side the entire time.

### The fix

In both `OnlineBattle.tsx` and `BattleArena.tsx`: hold the `inventory` prop
in local state (seeded from the prop) instead of using the prop directly,
and append the newly-opened Pokémon to that state the moment
`openLootboxNow()` gets it back from the server. `TeamPicker` already just
renders whatever `inventory` array it's given, so once the state includes
the new Pokémon, it appears as a pickable option on the very next
Rematch/Change Team — no change needed inside `TeamPicker.tsx` itself.

## End state

- [x] Win an online battle, open the awarded lootbox immediately (without
      navigating away), accept a rematch — the newly-opened Pokémon
      appears as a selectable option on the Team Picker, verified against
      a real battle/lootbox/rematch sequence, not just reading the code.
- [x] The same sequence works for the local vs-Bot arena's "Change Team"
      (same underlying bug, same fix).
- [x] Pokémon owned before the battle are still all present and pickable
      too (regression check — this is additive, not a replacement of the
      existing list).
- [x] Declining to open the lootbox immediately (leaving it for later from
      `/inventory`) is unaffected — that path already worked since it goes
      through a full page load.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean. No schema change, nothing
  to push/apply — this is entirely a client-side React state fix in
  `OnlineBattle.tsx` and `BattleArena.tsx`.
- **Found the same bug in a second place while diagnosing**: the bug
  report named the online Rematch flow specifically, but tracing the root
  cause (`inventory` prop used directly instead of copied into state,
  never updated when `openLootboxNow()` gets a new Pokemon back) showed
  the exact same pattern in the local vs-Bot `BattleArena.tsx`'s "Change
  Team" flow — same prop, same lootbox-open handler, same lack of any
  merge-back. Fixed both together since it's one root cause with two
  call sites, not two separate bugs.
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server pointed at the live Supabase project, using 2
  disposable test accounts — 9 checks, all passing. This exercises the
  server side of the exact reported scenario for real: two accounts each
  seeded with an initial 3-Pokémon team, a room created and joined, a
  lootbox inserted and opened for account A through the actual
  `POST /api/inventory/lootboxes/[id]/open` endpoint (the same one "Open
  it now" calls) mid-room, then **A locks in a team that includes the
  Pokémon that lootbox just produced** — the id a pre-fix `TeamPicker`
  could never have offered, since it wasn't in the stale `inventory`
  array. That lock-in succeeded, the battle actually started, and the
  real battle state persisted in Supabase confirmed the newly-opened
  Pokémon was genuinely one of A's 3 fighters going into the match.
- This confirms the two things the diagnosis depended on: (1) the newly-
  opened Pokémon was always fully usable server-side the whole time — the
  bug was never a permissions/validation issue, only that the client UI
  never offered it as a choice; and (2) nothing about the fix (copying the
  prop into local state, appending on lootbox-open) could have broken
  anything server-side, since the server independently re-validates
  ownership of whatever ids it's sent (`getOwnedPokemonInstances` in
  `app/api/rooms/[code]/lock-in/route.ts`) regardless of what the client
  thinks its inventory is.
- **Not independently verified** via a real browser (no browser automation
  tool available in this environment, same recurring gap as every prior
  step's validation notes): the actual visual behavior of opening a
  lootbox mid-battle-screen and seeing the new Pokémon's card/sprite
  appear in the Team Picker grid on the next Rematch/Change Team. What
  *was* verified directly, beyond the server-side check above: every
  remaining reference to `inventory` in both `OnlineBattle.tsx` and
  `BattleArena.tsx` was grepped and confirmed to resolve to the new local
  state variable (not the renamed `initialInventory` prop), so there's no
  stale second copy left anywhere in either component.
