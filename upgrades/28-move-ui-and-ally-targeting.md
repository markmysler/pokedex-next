# Step 28: Move-kind UI (badges/tooltips) + ally-target picker for buffs

**Status: planning only — not implemented.** Do not start this step
without an explicit go-ahead; see `main.md`'s "The attack-system rework"
section for the full context and dependency chain. Depends on steps 24,
25, 26 (the engine has to actually execute these move kinds before there's
real behavior to surface in the UI). Does **not** depend on step 27 —
redirect's own targeting is automatic/engine-side (main.md's key
decision), so whether ally-redirect ships doesn't change anything this
step builds.

## Why here

Everything through step 27 is engine-only — a buff/debuff/drain/redirect
move would already fully function if submitted via a raw API call, but
the actual battle UIs (`MoveButton.tsx`, `BattleArena.tsx`,
`OnlineBattle.tsx`, `FighterCard.tsx`) have no way to show what a
non-damage move does, and no way for a player to choose an ally target
for a buff. This step is what makes the rework actually playable, not
just executable.

## What changes

### `AttackAction` gains an optional target field (`types/pokemon.ts`)

```ts
export interface AttackAction {
  type: "attack";
  moveIndex: number;
  // Only meaningful for a buff move in a 3v3 team battle where the
  // caster has a living ally to choose (undefined/omitted = target self,
  // the only valid value in 1v1 or when no living ally exists). Every
  // other move kind ignores this field entirely — debuffs/drain always
  // target the opponent's active member (existing implicit targeting),
  // redirect's own target is chosen automatically, engine-side, never by
  // the player.
  buffTargetTeamIndex?: 0 | 1 | 2;
}
```

### `MoveButton.tsx` — show what a move actually does

Today's `MoveButton` renders `{move.name} ({move.power} Pwr | {move.mana_cost} MP)` — meaningless for a non-damage move. Branch on `move.kind`:

- **Damage**: unchanged label.
- **Buff**: label describes the effect (`"Iron Defense (+30% DEF, 3 turns | 20 MP)"`, `"Recover (+25% HP | 20 MP)"`, etc.) plus a color/icon distinct from damage moves (mirroring the 🔥/❄️/🩸/☠️/🌀 status-badge icon convention already established for statuses — e.g. a 🛡️/💚-tinted button background).
- **Debuff**: same idea, enemy-colored (mirroring the debuff-is-bad framing already used for bleed/poison/burn/freeze badge colors).
- **Drain**: shows both the damage and the drain (`"Drain Punch (60 Pwr, 50% HP drain | 20 MP)"`).
- **Redirect**: shows duration (`"Confuse Ray (2 turns confused | 25 MP)"`).

A `title` tooltip on each button gives the full plain-English effect
description, same `title`-on-the-whole-element pattern step 16 already
fixed the hover area for (so this step should use `inline-flex`-style
buttons from the start, not repeat that bug).

### Ally-target picker for buff moves (3v3 only)

New, minimal interaction added to `OnlineBattle.tsx` (and equally to
`BattleArena.tsx`'s bot-battle team, which also has a bench): clicking a
buff move whose caster has at least one living ally (bench or otherwise)
does **not** immediately call `submitAction()` — it first shows a small
inline target picker (self + each living ally, using the same
`bench-member`-style buttons `FighterCard.tsx` already renders for
switching, reused/adapted rather than a new visual language invented from
scratch). Selecting a target then calls `submitAction({ type: "attack",
moveIndex, buffTargetTeamIndex })`. If there is no living ally (1v1, or a
3v3 battle where both allies have already fainted), skip the picker
entirely and submit as a self-target immediately — no picker shown for a
choice that isn't actually a choice.

Debuff/drain/redirect moves need **no** picker — clicking them submits
immediately exactly like a damage move does today, since their targets
are either the implicit opponent (debuff/drain, unchanged from today) or
fully automatic (redirect).

### Server-side (`app/api/rooms/[code]/move/route.ts`)

Passes `action.buffTargetTeamIndex` through to `resolveTeamRound()`
unchanged, alongside the existing `moveIndex` — this route already
re-validates everything it's handed server-side (never trusts the client
for anything beyond "which move/switch was chosen"), so the only new
work here is plumbing the extra field through, not new validation logic
beyond what step 24's engine execution already does (e.g. rejecting/
clamping an out-of-range or fainted-ally index defensively, same spirit
as existing move-index bounds checks).

### `FighterCard.tsx` — show the new persistent effects

Extend `StatusBadges` (already showing 🩸/🌀/☠️/🔥/❄️ for the five
existing statuses, per steps 10/19) with badges for the new fields:
`atkMod`/`defMod` (only when `≠ 1`, showing the live percentage and
remaining turns, colored green if `> 1`/red if `< 1`), `shieldPoints`
(only when `> 0`, showing the remaining pool), `redirectTurns` (only when
`> 0`). Same `title`-tooltip-on-`inline-flex` pattern as every other
status badge.

## End state

- [ ] Every move kind's button clearly and correctly describes its
      effect at a glance, with a working hover tooltip for the full
      description — spot-checked against at least one move of each of the
      5 kinds.
- [ ] In a 3v3 battle with a living bench ally, selecting a buff move
      shows a target picker (self + each living ally); selecting a target
      submits correctly and the engine applies the buff to the chosen
      fighter, not always self.
- [ ] In 1v1, or in 3v3 once all allies have fainted, buff moves submit
      immediately with no picker shown, always targeting self.
- [ ] Debuff/drain/redirect moves submit immediately with no picker in
      every context — regression check that the picker only ever appears
      for buffs.
- [ ] The new persistent-effect badges (`atkMod`/`defMod`/`shieldPoints`/
      `redirectTurns`) appear on both the active fighter card and the
      bench row, with working hover tooltips, matching the existing
      status-badge visual language.
- [ ] `npm run build` / `npm run lint` clean.
