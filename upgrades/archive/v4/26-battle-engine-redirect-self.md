# Step 26: Battle engine — redirect, self-hit only

**Status: shipped**, 2026-08-14. See `main.md`'s "The attack-system
rework" section for the full context and dependency chain.

Closes the last slice of step 23's interim gap — every move kind is now
fully executable. Step 27 (extending redirect to a living ally instead of
always-self) remains optional/deferred.

## Why here

Redirect is the one new move kind that needs an actual change to *how
targets get chosen* inside the turn-resolution loop, not just a new
effect applied to an already-chosen target (which is all buffs/debuffs/
drain need). This step ships the simplest, lowest-risk version — the
afflicted fighter's own attacks hit themselves — which needs no new
bench-damage handling at all, since "self" is always the team's own
active member (the one already taking the turn), never a benched one.
Step 27 (separate, optional) extends this to hitting a *living ally*
instead, which does need bench-damage handling.

## What changes

### Inflicting redirect

A `RedirectMove` targets the opponent's active member exactly like a
debuff does (no new targeting UI) and sets `defenderState.redirectTurns =
move.turns` in `executeMove()`'s effect-application block, alongside
where debuffs set their own fields (step 24).

### Consuming redirect — the actual behavior change

In both `resolveRound()` (1v1) and `resolveTeamRound()` (3v3), the
attack-resolution branch currently always resolves a move as
`attacker → the opponent's side`. Add one check, right before calling
`resolveAttack()`/`executeMove()`:

```ts
// resolveTeamRound(), inside the per-slot loop, after switches/status ticks:
const defState = atkState.redirectTurns > 0
  ? atkState // self-hit: the redirected fighter's own attack lands on itself
  : activeMember(defTeam); // normal case, unchanged
```

(1v1's `resolveRound()` gets the equivalent change against
`fighter1State`/`fighter2State` directly — there's no team/bench concept
there at all, so "self" is the only sensible target either way; redirect
in 1v1 local battles is *always* self-hit even after step 27 ships,
since there's no ally to redirect to.)

Everything downstream of `defState` — damage calculation, status
infliction, shield absorption, faint checks — runs completely unchanged,
because `defState` is just a `FighterState` and none of that code cares
whether it happens to be the same object as `atkState`. This is exactly
why self-redirect is low-risk: it needs zero changes to `handleFaint`,
`isTeamWiped`, or any bench-related bookkeeping — a self-hit fighter that
faints is handled by the *existing* "attacker's own active fainted"
paths, because from the engine's perspective a self-hit target IS the
attacker's own active member, the same object the existing code already
knows how to handle fainting.

### Decay

`redirectTurns` decrements at the same per-turn tick point as
`bleedTurns`/`atkModTurns`/etc. (step 24's tick extension), logging
something like "🌀 Confused no longer — attacks aimed correctly again."
when it hits 0.

### Log/event clarity

The battle log should make a self-hit obviously different from a normal
hit — e.g. `"${attacker.name} is confused! It hurt itself in its
confusion!"` instead of the normal `"${attacker.name} used [Move] on
${defender.name}"` line, since `attacker.name === defender.name` here and
the default log phrasing would read strangely ("Pikachu used Tackle on
Pikachu").

## End state

- [x] A `RedirectMove` sets `redirectTurns` on the target exactly like a
      debuff sets its own fields — verified directly, not just "the move
      exists." (Taunt: `redirectTurns` set to its `turns` value directly.)
- [x] While `redirectTurns > 0`, that fighter's own attacks land on
      themselves instead of the opponent, in both 1v1 (`resolveRound`)
      and 3v3 (`resolveTeamRound`) — verified for both, since they're
      separate code paths. (Isolated the effect with a 0-power control
      move on the non-redirected side in each: only the redirected
      fighter's own HP dropped, the other side's stayed untouched.)
- [x] A self-hit still deals real damage (using the fighter's own
      atk/def, exactly the formula a normal hit against them would use)
      and can still faint them, ending the battle/triggering a forced
      switch through the *existing* faint-handling code paths, with no
      new bookkeeping needed. (1v1: self-hit faint correctly ended the
      battle with the *other* player as winner. 3v3: self-hit faint on a
      2-HP-remaining team correctly triggered `awaitingForcedSwitch`
      rather than ending the battle, exactly the existing team-wipe logic
      — no new bookkeeping was written for this, `handleFaint()` is called
      with the attacker's own team/slot when the hit was a self-hit.)
- [x] `redirectTurns` decays by 1 per active turn (paused while benched,
      same rule as every other status), independent of and stacking
      correctly alongside any simultaneously-active buff/debuff/freeze
      effects on the same fighter. (`redirectTurns`, `atkModTurns`, and
      `freezeTurns` all set simultaneously on one fighter, each ticked
      down independently by 1 per round as expected.)
- [x] The battle log clearly reads as "hurt itself in confusion," not a
      normal attack-on-opponent line. (Exact phrase present: "🌀 X is
      confused! It hurt itself in its confusion!")
- [x] Regression: a fighter under redirect can still be the *target* of
      the opponent's normal attacks in the same round (redirect only
      changes what happens when the afflicted fighter is the one
      attacking, not when they're being attacked). (Redirected fighter1
      still took damage from fighter2's normal incoming attack in the
      same round it hit itself.)
- [x] `npm run build` / `npm run lint` clean.

Also verified: 80 full battles (50x 1v1, 30x 3v3) using freshly-rolled
instances' real movesets, randomly picking among all 4 slots (every kind
now executable) — 0 crashes.
