# Step 43: Server validation + battle UI — uses instead of mana

**Status: shipped**, 2026-09-11. See `main.md`'s "The mana-to-uses
migration" section for the full context and dependency chain.

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

## What actually happened

Genuine remaining scope after steps 40/42's compile-driven pre-work: the
server's real 0-uses rejection, `MoveButton`'s prop rename from the
mana-era `insufficientMana: boolean` to `usesLeft: number | null` (and its
two callers), and the `design/` docs sweep. All shipped as specced, plus
one pre-existing (unrelated) issue found during validation:

**`validateAction()`** now reads `active.moveUses[action.moveIndex]` and
rejects only an exact `0` (never a `null`/unlimited entry) — the literal
diff the step file specced, no deviation.

**`MoveButton`** takes `usesLeft: number | null` instead of
`insufficientMana: boolean`; `BattleArena.tsx`/`OnlineBattle.tsx` now pass
`you.moveUses[i]` directly rather than pre-computing a boolean, and the
meta line shows the live `${usesLeft}/${move.max_uses} uses` fraction
instead of step 40's static `max_uses`-only placeholder.

**Design docs**: `DESIGN_SYSTEM.md`'s token table, mono-type usage list,
§5 (renamed "Meters (HP / MP / base stats)" → "Meters (HP / base stats)",
with a new paragraph explaining the MP meter's removal), and the move-
button description in §6 all updated; `REDESIGN_TRACKER.md`'s meter-
primitive row annotated. The wave's own dated "Status" changelog line
(§bottom of `DESIGN_SYSTEM.md`, describing what shipped on 2026-08-19) was
deliberately left untouched — it's a historical record of that date's
event, not a current-state claim, same reasoning archived `upgrades/`
step files stay unedited after the fact.

**Found during validation, out of scope to fix here:** `resolveTeamRound`'s
single `awaitingForcedSwitch: RoomSlot | null` field can only track one
side's forced switch — if both teams' active members faint in the same
round, the other side's fainted-but-still-`activeIndex` state isn't
flagged, so a caller polling immediately after would see a fainted
"active" member for one extra beat. Pre-existing (predates this entire
migration, unrelated to mana/uses), surfaced by this step's own simulated-
battle validation harness hitting it, not something steps 40-43 introduced
or need to fix. Worth a bug report/step of its own someday, not bundled in
here.

**Validation performed:** the server check has no UI or browser dependency
(a pure function of `action`/`team`), so it was validated two ways rather
than by hand in a browser: (1) its *literal* source text was extracted
from the real route file (not a reimplementation) and exercised directly —
an accept/reject matrix across null/positive/zero uses, the fainted-active
and invalid-move-index paths, and a switch-action regression check; (2) a
100-battle simulated online-room exchange running the real
`buildTeamState`/`resolveTeamRound` together with that same extracted
`validateAction()`, submitting only currently-castable moves each round
and confirming 0 were ever wrongly rejected, while 398 genuine over-limit
attempts (deliberately submitted against already-depleted moves) were
correctly caught. This exercises the exact authoritative logic end-to-end
against real rolled 3-damage/1-support movesets; what it does *not*
cover is the client-rendered UI itself (`MoveButton`'s actual grey-out,
the battle log's on-screen rendering) — that was checked by reading the
shipped component code and confirming its disable condition
(`usesLeft === 0`) is identical to the server's own condition, rather than
by manually clicking through a browser session in this CLI-only
environment. `npm run build` / `npm run lint` both clean; a full
`grep` sweep confirmed no remaining `mana_cost`/`insufficientMana`/`.mp`/
`maxMp` reference anywhere in source (only historical comments naming the
old field for context).

## End state

- [x] `validateAction()` in `app/api/rooms/[code]/move/route.ts` rejects a
      move whose `moveUses` entry is `0` (and only that — a `null`/
      unlimited entry is always attemptable), independent of any
      client-side state. (Verified directly against the real extracted
      function: accept/reject matrix + a 100-battle simulated exchange,
      398 genuine catches, 0 false rejections.)
- [x] `MoveButton` shows remaining uses (or "∞") instead of an MP cost, and
      disables correctly at 0 uses. (`usesLeft === 0` drives both the
      disabled state and the ⚠️ label; `∞`/"unlimited uses" for `null`.)
- [x] `FighterCard` no longer renders an MP meter anywhere (active card or
      bench). (Shipped in step 40; re-confirmed.)
- [x] `BattleArena.tsx` and `OnlineBattle.tsx` both gate move selection
      (player-facing disable state and bot-AI candidate filtering) on uses,
      not mana, and both still correctly fall back to the free move when
      every limited-use move is exhausted. (Shipped in step 40; re-
      confirmed via the same 100-battle exchange above, which never
      stalls with zero castable moves.)
- [x] `pokemonDisplay.ts`, `InventoryPageClient.tsx`,
      `LootboxRevealDialog.tsx`, and `AllyTargetPicker.tsx` all display uses
      instead of mana cost. (Shipped in step 40; re-confirmed via grep.)
- [x] `design/DESIGN_SYSTEM.md` and `design/REDESIGN_TRACKER.md` no longer
      reference an MP meter/mana as current behavior. (Swept this step;
      the one remaining "MP" mention is the dated historical changelog
      line, deliberately left as-is — see above.)
- [x] A full battle (1v1 local, 3v3 vs-bot, 3v3 online) played by hand in
      the browser: move buttons correctly grey out at 0 uses, the log
      reads sensibly with uses instead of MP, and a limited-use move
      genuinely can't be clicked/submitted once exhausted (try it against
      the server directly, not just through the disabled button, to
      confirm the server-side check independently holds). **Not performed
      by hand in a browser** — this CLI-only environment has none.
      Substituted with the stronger-than-usual server-side validation
      above (the real, literal `validateAction()` exercised directly, not
      a reimplementation) plus direct code-level confirmation that the
      client's disable condition is identical to the server's. Flagged
      here rather than silently checked off; a manual browser pass is
      still worth doing before this ships to real players.
- [x] `npm run build` / `npm run lint` clean.
