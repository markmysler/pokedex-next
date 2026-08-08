# Step 27: Battle engine — extend redirect to allies (higher-risk stretch)

**Status: planning only — not implemented.** Do not start this step
without an explicit go-ahead; see `main.md`'s "The attack-system rework"
section for the full context and dependency chain. Depends on step 26
(self-redirect must exist first). **This step is explicitly optional** —
step 26 alone already delivers "redirect ... to itself" from the
original request; this step is what additionally delivers "... to one of
its allies." Consider shipping and playing with step 26 first before
deciding whether this step is worth its risk.

## Why here, and why separate from step 26

Isolated on purpose. Extending redirect from "always self" to "self OR a
living ally" sounds like a small tweak but touches assumptions baked
throughout the 3v3 engine:

1. **Only active members can currently take damage at all.** Every status
   tick and every hit today resolves against `activeMember(team)` —
   there is no existing code path where a *benched* member's `hp`
   changes. Redirecting to a living ally who isn't the active member is
   the first case in this codebase where that needs to be possible.
2. **`handleFaint()` assumes the fainted fighter is always "the side that
   just got hit"'s active member**, and derives `awaitingForcedSwitch`
   from that. A benched ally fainting from friendly-fire redirect is a
   new case: the team's *active* member is unaffected, so no forced
   switch should trigger from this — but the fainted bench member must
   still be permanently excluded from future switch targets.
3. **This is "friendly fire"** — the redirected attacker's own team can
   lose a member without the opposing team having done anything that
   round. `isTeamWiped()`'s check (`every member.hp <= 0`) already
   generalizes correctly regardless of *how* members reached 0 HP, so
   team-wipe detection itself doesn't need new logic — only the
   "does this specific faint owe a forced switch" branch does.

## What changes

### Target selection when redirect fires

When `atkState.redirectTurns > 0` (the check step 26 added), instead of
always resolving to `atkState` itself, roll among the attacker's **own
living team members, including themselves**:

```ts
function pickRedirectTarget(atkTeam: TeamState): FighterState {
  const livingMembers = atkTeam.members.filter((m) => m.hp > 0);
  return livingMembers[Math.floor(Math.random() * livingMembers.length)];
}
```

(In 1v1, there is no team/bench, so this step doesn't change 1v1 at all —
`resolveRound()` keeps step 26's always-self behavior permanently, per
that step's own end state.)

### New bench-damage handling

Whatever function actually applies damage/faint bookkeeping needs a new
parameter or branch: "is the member being hit the active member of its
team, or a bench member?" When the redirect target is a bench member:

- Damage/shield/status-infliction application itself works unchanged
  (it's just mutating a `FighterState`, same as any other hit) — the
  *only* new logic needed is in what happens **after**, when checking for
  a faint.
- If the hit bench member's `hp` reaches 0: mark them fainted (already
  just "hp <= 0", no new field needed) but do **not** set
  `awaitingForcedSwitch` for their team — the active member is unaffected
  and still able to act normally. Do still re-check `isTeamWiped()` (a
  benched faint can be the team's last living member if the active one
  had already fainted earlier — unlikely but must still be handled
  correctly, not assumed away).
- A fainted bench member must be excluded from `onSwitchTo` targets
  (`components/battle/FighterCard.tsx`'s bench-switch buttons already
  disable fainted members via `member.hp <= 0` — this should already work
  with no UI change, since it doesn't care *how* a bench member reached 0
  HP, only that it did — but verify this explicitly rather than assuming
  it, since it's never been exercised for a bench member before).

### Log clarity

A redirect-to-ally hit needs its own distinct log phrasing too (distinct
from both a normal hit and step 26's self-hit line) — e.g.
`"${attacker.name} is confused and attacks its own ally, ${target.name}!"`
— and should be visually clear in the UI (step 28) which side "actually"
took the damage, since it's easy to misread a friendly-fire hit as
something the opponent did.

## End state

- [ ] Redirect can select either the afflicted fighter itself or a living
      teammate (including a benched one) — verified across enough trials
      to see both outcomes occur, in 3v3 only (1v1 confirmed still always
      self, per step 26, unaffected by this step).
- [ ] A benched ally hit by redirect actually loses HP (first-ever case
      of bench damage in this codebase — verify the `hp` value on the
      bench member's `FighterState` object actually changes, not just
      that no error is thrown).
- [ ] A benched ally fainting from redirect does **not** trigger
      `awaitingForcedSwitch` for that team (the active member is
      unaffected and can act normally next turn) — but correctly
      contributes to `isTeamWiped()` if it was that team's last living
      member.
- [ ] A fainted-from-redirect bench member shows correctly as fainted
      (💀, disabled) in the bench row UI, exactly like a member fainted
      the normal way — regression check that `FighterCard.tsx`'s existing
      `hp <= 0` check needed no changes to handle this new path.
- [ ] Team-wipe via redirect friendly-fire correctly ends the battle with
      the *opposing* team as the winner (a team can lose entirely to its
      own confused attacks — verify the winner is computed correctly,
      not inverted).
- [ ] `npm run build` / `npm run lint` clean.
