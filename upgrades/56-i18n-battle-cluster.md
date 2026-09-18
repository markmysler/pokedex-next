# Step 56: i18n content — Battle cluster

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
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

- [ ] `lib/battleEngine.ts` emits `BattleLogEvent[]` instead of `string[]`
      from every function that currently builds log lines.
- [ ] `lib/i18n/renderBattleLogEvent()` renders every event type correctly
      in both `en` and `es-AR`, called from `BattleArena.tsx` and
      `OnlineBattle.tsx` at display time.
- [ ] Team Picker, Battle Arena, and Online Battle (all phases) render
      fully in either locale, including the battle log.
- [ ] Confirmed no persisted battle-log text anywhere (`match_results`,
      `battle_rooms.state`) needs migrating — the change is contained to
      the engine's return shape and its two client consumers.
- [ ] `npm run build` / `npm run lint` clean — expect every existing
      `battleEngine.test`-style validation script (if any) that inspects
      `.log` as strings to need updating for the new event shape.
