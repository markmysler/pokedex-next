# Step 43: Server validation + battle UI — uses instead of mana

**Status: not started** (partially pre-done — see below). See `main.md`'s
"The mana-to-uses migration" section for the full context and dependency
chain.

> Step 40 shipped first and, to compile after removing `mp`/`maxMp`/
> `mana_cost`, already landed most of this step's *display* half:
> `MoveButton`'s/`pokemonDisplay.ts`'s/`InventoryPageClient.tsx`'s/
> `LootboxRevealDialog.tsx`'s uses text, `FighterCard`'s and (not
> originally listed here) `AllyTargetPicker`'s MP-meter removal, and
> `BattleArena.tsx`/`OnlineBattle.tsx`'s bot-move-selection and
> player-facing `insufficientMana` checks switched to `moveUses[i] !== 0`.
> What's still genuinely undone: `validateAction()` in
> `app/api/rooms/[code]/move/route.ts` is a `TODO`-marked no-op (always
> passes) — the real server-side 0-uses rejection is this step's actual
> remaining scope, plus a design pass on the exact uses-display copy/
> polish this step's file describes. See step 40's "what actually
> happened" for the full accounting.

## Why here

Depends on step 42 — nothing to validate or render against until the engine
actually tracks/spends uses. Mirrors `archive/v4/main.md`'s step 28 (UI
depended on the engine steps landing first).

## What changes

### Server validation (`app/api/rooms/[code]/move/route.ts`)

```ts
// today:
const cost = move.mana_cost ?? 10;
if (active.mp < cost) return "Not enough Mana";

// becomes:
const usesLeft = active.moveUses[action.moveIndex];
if (usesLeft !== null && usesLeft <= 0) return "No uses left for that move this battle";
```

This is the authoritative check — the client-side disabling below is UX,
not security; the server must reject an over-limit move attempt
independently, same trust boundary the mana check already enforced.

### `components/battle/MoveButton.tsx`

Replace the `insufficientMana` prop/behavior with a uses-remaining one:

```tsx
interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  usesLeft: number | null; // null = unlimited
  onClick: () => void;
}
```

- `metaLine`: `usesLeft === null ? "∞ uses" : `${usesLeft}/${move.max_uses} uses`` in place of the `"${mana_cost} MP"` text (both the normal and the "can't afford it" branches).
- The `⚠️` no-longer-castable state now keys off `usesLeft === 0` instead of
  `insufficientMana`.

### `components/battle/FighterCard.tsx`

Remove the `mp`/`maxMp` props and the `<SegmentedMeter label="MP" .../>`
(both the active-card one and the compact bench one) — there's no single
aggregate resource left to show a meter for. Per-move uses render on each
`MoveButton` instead (already the plan above), same "each button shows its
own cost" pattern the app already used for mana.

### `components/battle/BattleArena.tsx` / `components/online/OnlineBattle.tsx`

Both files independently compute `insufficientMana`/"affordable moves" in a
few places (bot-move selection at BattleArena.tsx's `affordable` filters,
the "not enough mana" log line, and the `insufficientMana` calc feeding
`MoveButton`). Each becomes a `moveUses[i] === 0` check instead of a
`mana_cost <= mp` comparison. The bot/AI "pick a random affordable move"
logic keeps its shape (filter → random pick from what's left), just against
the uses array instead of the mana pool — including still being able to
fall back to the guaranteed-free move when every limited-use move it rolled
is exhausted, same as a real player would be able to.

### `lib/pokemonDisplay.ts`

`moveEffectText()`/`moveTooltip()` currently interpolate `${move.mana_cost}
MP` into their output — swap for `${move.max_uses === null ? "unlimited" :
move.max_uses} uses` (exact phrasing is this step's call, but should read
naturally both in a tooltip and in the `MoveButton` meta line, which reuses
`moveEffectText()`).

### `components/inventory/InventoryPageClient.tsx` / `LootboxRevealDialog.tsx`

Both render a per-move browsing line like `"${m.name} — ${m.type}, ${power}
Pwr, ${m.mana_cost} MP"` outside of battle (viewing an owned Pokemon's kit).
Swap the trailing `"${m.mana_cost} MP"` for the same uses phrasing as
above — these are catalog `max_uses` values here, not a live battle's
remaining count, so render as `"X uses"` / `"unlimited uses"`, not a
fraction (there's no "remaining" outside a battle).

### `components/battle/AllyTargetPicker.tsx`

Also references `mana_cost` (confirmed via grep) — check at implementation
time what it's used for (display text for the buff move being targeted, by
inspection) and update the same way as the other display sites above.

### `design/DESIGN_SYSTEM.md` / `design/REDESIGN_TRACKER.md`

Per `upgrades/main.md`'s own note, these stay current independent of any
wave — grep both for "MP"/"mana"/"Mana" and update any meter/token spec
that references the now-removed MP meter (e.g. `FighterCard`'s bench MP
meters, added in the redesign's fix pass per `lib/battleEngine.ts`'s
`classifyLogLine` comment) so they don't describe a component that no
longer exists.

## End state

- [ ] `validateAction()` in `app/api/rooms/[code]/move/route.ts` rejects a
      move whose `moveUses` entry is `0` (and only that — a `null`/
      unlimited entry is always attemptable), independent of any
      client-side state.
- [ ] `MoveButton` shows remaining uses (or "∞") instead of an MP cost, and
      disables correctly at 0 uses.
- [ ] `FighterCard` no longer renders an MP meter anywhere (active card or
      bench).
- [ ] `BattleArena.tsx` and `OnlineBattle.tsx` both gate move selection
      (player-facing disable state and bot-AI candidate filtering) on uses,
      not mana, and both still correctly fall back to the free move when
      every limited-use move is exhausted.
- [ ] `pokemonDisplay.ts`, `InventoryPageClient.tsx`,
      `LootboxRevealDialog.tsx`, and `AllyTargetPicker.tsx` all display uses
      instead of mana cost.
- [ ] `design/DESIGN_SYSTEM.md` and `design/REDESIGN_TRACKER.md` no longer
      reference an MP meter/mana as current behavior.
- [ ] A full battle (1v1 local, 3v3 vs-bot, 3v3 online) played by hand in
      the browser: move buttons correctly grey out at 0 uses, the log
      reads sensibly with uses instead of MP, and a limited-use move
      genuinely can't be clicked/submitted once exhausted (try it against
      the server directly, not just through the disabled button, to
      confirm the server-side check independently holds).
- [ ] `npm run build` / `npm run lint` clean.
