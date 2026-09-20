# Step 56: i18n content — Battle cluster

**Status: Shipped.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

Needs step 53's infrastructure. Independent of the other content steps —
placed here by table position, following `design/REDESIGN_TRACKER.md`'s own
cluster order.

## What changes

Covers `design/REDESIGN_TRACKER.md`'s "Battle cluster": **Team Picker,
Battle Arena (bot + online), Online Battle (setup/waiting/picking/battling/
rematch), room/chat**.

### The battle log becomes structured events, not rendered text — confirmed approach

This cluster has the highest density of dynamically-generated strings in
the app — `lib/battleEngine.ts`'s `log: string[]` arrays (move-used headers,
effectiveness text, status-inflicted lines, faint/switch announcements) are
built as plain English sentences **inside the engine itself**. Confirmed
during planning: **the engine emits structured events; the client renders
the localized sentence from them on arrival.** Concretely:

```ts
// lib/battleEngine.ts — replaces every `log: string[]` return
type BattleLogEvent =
  | { type: "moveUsed"; attacker: string; move: string; moveType: PokemonType; usesRemaining: string }
  | { type: "effectiveness"; multiplier: number }
  | { type: "selfHit" }
  | { type: "allyHit" }
  | { type: "dodged" }
  | { type: "blindMiss" }
  | { type: "damageDealt"; target: string; amount: number }
  | { type: "statusInflicted"; status: "bleed" | "blind" | "poison" | "burn" | "freeze"; target: string }
  | { type: "statChanged"; target: string; stat: "atk" | "def"; direction: "up" | "down" }
  | { type: "healed"; target: string; amount: number }
  | { type: "shielded"; target: string; amount: number }
  | { type: "fainted"; pokemon: string }
  | { type: "switched"; pokemon: string }
  | { type: "roundHeader"; round: number };
```

(Exact member list to be finalized against every actual log line
`executeMove`/`executeDamage`/`executeBuff`/`executeDebuff`/
`executeRedirect`/`resolveRound`/`resolveTeamRound`/`handleFaint` currently
produce — the shape above is the pattern, not a final enum.) Every function
that currently does `log.push(\`${attacker.name} used ${move.name}...\`)`
instead pushes one of these typed events. `MoveResult`/`FaintOutcome`/etc.'s
`log` fields become `BattleLogEvent[]` instead of `string[]`.

A new client-side renderer, `lib/i18n/renderBattleLogEvent(event, dict):
string`, turns each event into the localized sentence at display time
(called from `BattleArena.tsx`/`OnlineBattle.tsx` wherever `result.log` is
currently appended straight into the visible log). This is where the actual
English/`es-AR` sentence templates for combat text live — not in the engine.

**No DB/wire-format migration needed for this**: confirmed during planning
that the battle log is never persisted — `match_results`
(`supabase/migrations/20260807030000_battle_rework.sql`) only stores
outcome metadata (opponent/mode/won/played_at), and `BattleArena.tsx`
appends `result.log` straight into local React state, never into
`battle_rooms.state` or anywhere durable. The event-shape change is
contained to the engine's return values and the two client components that
consume them — a clean refactor, not a data migration.

### Other known surfaces

`FighterCard.tsx`'s `STATUS_TOOLTIPS`; `MoveButton.tsx` and
`lib/pokemonDisplay.ts`'s `moveEffectText()`/`moveTooltip()` (shared with
step 55 — coordinate, don't translate twice inconsistently); room-code/chat
UI copy in the Online Battle flow.

### What does NOT change in this step

- No new routing/dictionary mechanics.
- The actual battle *mechanics* (uses, type effectiveness) — this step only
  changes how their outcomes are communicated.
- `match_results`/`battle_rooms` schemas — confirmed unaffected, since
  neither persists rendered or structured log text today.

## End state

- [x] `lib/battleEngine.ts` emits `BattleLogEvent[]` instead of `string[]`
      from every function that currently builds log lines.
- [x] `lib/i18n/renderBattleLogEvent()` renders every event type correctly
      in both `en` and `es-AR`, called from `BattleArena.tsx` and
      `OnlineBattle.tsx` at display time.
- [x] Team Picker, Battle Arena, and Online Battle (all phases) render
      fully in either locale, including the battle log.
- [x] Confirmed no persisted battle-log text anywhere (`match_results`,
      `battle_rooms.state`) needs migrating — the change is contained to
      the engine's return shape and its two client consumers.
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

### The engine refactor, exactly as planned

`lib/battleEngine.ts` no longer builds a single string of English text
anywhere. Every function that used to `log.push(\`...\`)` now pushes a
plain-data `BattleLogEvent` object (21 variants — `moveUsed`, `dodged`,
`blindMiss`, `selfHit`, `allyHit`, `damageDealt`, `statusInflicted`,
`drained`, `statUp`, `healed`, `shielded`, `cleansed`, `statDown`,
`shieldDestroyed`, `confused`, `statusTick`, `freezeTick`,
`statModExpired`, `confusionExpired`, `fainted`, `switched`), and
`MoveResult`/`RoundResult`/`TeamRoundResult`'s `log` fields are all
`BattleLogEvent[]`. `effectivenessText()` and `classifyLogLine()` are gone
— the fixed-multiplier-text quirk they encoded ("(2.0x)" shown regardless
of the move's actual computed multiplier) moved into the dictionary as-is
rather than being "fixed" during a translation-only step.

New `lib/i18n/renderBattleLogEvent.ts` turns one event into `{ text,
kind? }` — `kind` drives the exact same `.win`/`.loss`/`.hit` CSS classes
`classifyLogLine()` used to (`app/globals.css`), but decided from the
event's own `type` now, never by pattern-matching rendered text. That's a
real bug the old design had: `classifyLogLine()` detected a "hit" line by
checking for the English substrings `"Hit"`/`"EFFECT"` in the (now
translated) log text, which could never match in `es-AR` — every combat
hit line would have silently lost its highlight color once translated.
Confirmed the fix by construction, not by observation: the new
classification never inspects text content at all.

### Server-side change confirmed safe, live-tested

`app/api/rooms/[code]/move/route.ts` forwards `result.log` (now
`BattleLogEvent[]`, plain serializable data) unchanged in its JSON
response and Realtime broadcast — no rendering happens server-side, exactly
per plan ("the engine emits structured events; the client renders the
localized sentence from them on arrival"). Ran a real 2-player online
battle over HTTP (two fresh accounts, room created/joined/locked in, a move
submitted by each) and inspected the actual response: `log` came back as
`[{"type":"moveUsed",...}, {"type":"damageDealt",...}]`, not strings —
confirmed end-to-end, not just by type-checking. `battle_rooms.state`/
`match_results` were confirmed (by reading their migrations, not just
assumed) to never persist log text, so no DB migration was needed.

### `lib/pokemonDisplay.ts`'s `moveEffectText()`/`moveTooltip()`

Both now take a `dict: Dictionary` parameter (their only caller,
`MoveButton.tsx`, threads its own `useDictionary()` result through) instead
of returning hardcoded English. ATK/DEF stay as untranslated HUD
abbreviations in both locales (`battle.moveEffect.statAbbrev`) — the same
jargon-abbreviation call as leaving species/move/type names untranslated,
just extended to these two compact battle-HUD labels (`FighterCard`'s
`StatusBadges` already hardcoded them the same way pre-existing).

### Same RSC-boundary lesson from step 55, applied everywhere in this cluster

`app/[lang]/(app)/battle/page.tsx` and `.../online/page.tsx` (Server
Components) fetch the dictionary only for their own plain-string page
title; `BattleArena.tsx`/`OnlineBattle.tsx` (Client Components, the entire
rest of both trees) call `useDictionary()` themselves, same as step 55's
`PokedexPageClient`/`InventoryPageClient`. Every other Battle-cluster
component (`FighterCard`, `MoveButton`, `AllyTargetPicker`,
`BattleResultDialog`, `TeamPicker`, `ChatPanel`) also calls
`useDictionary()` directly rather than receiving a prop, since most are
reused across both `BattleArena`'s and `OnlineBattle`'s trees and several
carry function-valued dictionary entries. `FighterCard.tsx` and
`PokemonInstanceCard.tsx` needed a new `"use client"` directive added (they
didn't call hooks before).

### Closing step 55's two deferred TODOs

`PokemonFilterBar.tsx` (`TeamPicker.tsx`'s call site) and
`LootboxRevealDialog.tsx` (`BattleArena.tsx`/`OnlineBattle.tsx`'s call
sites) both shipped step 55 with an *optional* dict prop and an English
fallback, explicitly deferring real wiring to this step since Battle was
out of scope then. Both are now wired with the real dictionary at every
call site in this cluster — the English-fallback code paths in those two
components are now dead for every call site in the app, kept only as
defensive fallbacks (matching the same pattern, no cost to leaving them).

### Drive-by fix: "✨ Shiny" / "⭐ Starter" / bare "Total N" were leftover hardcoded English in 5 places

Found while wiring `FighterCard.tsx`'s shiny badge: the exact same
hardcoded `"✨ Shiny"` string existed untranslated in `Dashboard` (step 54),
`PokemonInstanceCard.tsx` and `InventoryPageClient.tsx` (step 55) —
missed in those steps' own scope sweeps. Added `common.shinyBadge`/
`common.starterBadge` and fixed all 5 call sites (plus two `"Total {n}"`
bare-string spots in `PokemonInstanceCard.tsx` that had the same gap,
switched to reuse `collection.totalLabel()`) while already touching these
files, rather than leaving a second gap for a future step to rediscover.

### Validation performed

- `rm -rf .next` + fresh `npm run build`, `npm run lint`: both clean.
- **Engine simulation** (Node, via `tsx`, real code paths — not a hand
  check): ran 60 full 3v3 battles with movesets deliberately covering every
  move kind (damage/buff/debuff/drain/redirect) and every status
  (bleed/blind/poison/burn/freeze) against a real `resolveTeamRound()`,
  producing 9,434 total log events. Every one of the 21 `BattleLogEvent`
  types got exercised at least once, and every single event rendered to a
  correct, non-empty string in **both** `en` and `es-AR` via
  `renderBattleLogEvent()` with zero exceptions.
- **Real 2-player online battle over HTTP** against local Supabase: two
  fresh accounts, room created/joined, both teams locked in via the real
  `/api/rooms/**` routes, a move submitted by each side — inspected the
  actual JSON response and confirmed `log` arrives as structured
  `BattleLogEvent` objects, not strings.
- Fetched `/en/battle`, `/es-AR/battle`, `/en/online`, `/es-AR/online`
  with a real session cookie: all 200 (not the `id="__next_error__"` shell
  a Server->Client function-boundary violation produces — caught and fixed
  once during step 55, checked for again here from the start given this
  step's even heavier use of function-valued dictionary entries), and
  every static string (Team Picker's search/filter/sort UI, Online's
  create/join-room screen) confirmed present in the expected language.
- Negative check: grepped the `es-AR` Battle/Online pages for English
  chrome and the `en` versions for Spanish chrome — zero matches either
  direction.
