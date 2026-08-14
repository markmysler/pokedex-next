# Step 25: Battle engine — drain (life/mana steal) execution

**Status: shipped**, 2026-08-14. See `main.md`'s "The attack-system
rework" section for the full context and dependency chain.

Step 24 landed first, so this step reuses its shield-aware `applyDamage()`
helper as anticipated rather than adding its own — `executeDamage()` was
generalized to accept `DamageMove | DrainMove` instead of duplicating the
formula.

Closes another slice of step 23's interim gap — drain support moves are
now fully playable. Redirect is the only remaining unexecutable kind,
closed by step 26.

## Why here

Simplest of the three new execution kinds — it's the existing damage
formula plus one extra step (heal/restore self by a percentage of the
damage just dealt), no new targeting concept and no new persistent
per-turn state. Independent of buffs/debuffs/redirect, could be built in
any order relative to steps 24/26.

## What changes

### Drain execution (`move.kind === "drain"`)

Runs the **exact same damage calculation** `DamageMove` already uses
(same `atkStat`/`defStat`/type-multiplier/RNG-roll math, same
`freezeAdjusted`/`atkMod`/`defMod` composition from step 24, same
shield-aware `applyDamage()` from step 24) — a `DrainMove` is a
`DamageMove` with one extra effect attached, not a different damage
model. After damage is dealt to the defender:

```ts
const healAmount = Math.round(dealtDamage * (move.drain.percentOfDamageDealt / 100));
if (move.drain.resource === "hp") {
  attackerState.hp = Math.min(attackerState.maxHp, attackerState.hp + healAmount);
} else {
  attackerState.mp = Math.min(attackerState.maxMp, attackerState.mp + healAmount);
}
```

Important edge case: **`dealtDamage` here means damage actually dealt to
HP, or the pre-shield raw hit?** Decision: use the *raw* damage the move
would have dealt (pre-shield-absorption) as the basis for the drain
percentage — a drain move draining "life force" from the hit itself
shouldn't be weakened just because the target happened to have a shield
up; the shield protects the target's HP, it doesn't reduce how much the
attacker draws off the attack. Document this explicitly since it's a
non-obvious interaction between two new mechanics landing in the same
step (or the previous step, if 24 lands first).

Life-drain (`resource: "hp"`) and mana-drain (`resource: "mp"`) are both
one-sided — the target does **not** lose the drained amount from their
own pool (unlike a real "steal," this is closer to "draining life force
from the hit," not literally transferring HP/MP out of the target's
pool). This matches the request's wording ("steal life or mana") loosely
but keeps the mechanic simple and one-directional, consistent with how
real drain-type moves work in the genre this is modeled on (damage +
self-heal, not damage + target-HP-reduction-beyond-the-damage-already-
dealt). Flagged explicitly as a design call worth confirming before
implementing, since "steal" could also reasonably mean "the target loses
what you gain," which is a meaningfully different (and more punishing)
mechanic.

### What can faint from a drain move

The target can still faint from a drain hit exactly like any damage move
— the heal/restore-mana side effect only applies if `dealtDamage > 0`,
which it always will be for a landed hit (drain moves don't get a
"reduced" drain amount for overkill damage — draining 50% of a
300-damage hit that only needed 40 to knock out the target still heals
50% of the full 300, not the 40 that "counted"). This keeps the mechanic
simple (no separate "effective damage" concept to introduce) and rewards
finishing blows appropriately.

## End state

- [x] A drain move deals damage to the defender identical to what an
      equivalent `DamageMove` of the same power/type/category would deal
      (same formula, verified by direct comparison, not just "it deals
      some damage"). (500-trial average each, matching type/category/
      power/mana: DamageMove 22.88 avg vs. DrainMove 23.00 avg, 0.6% apart
      — within RNG noise.)
- [x] `resource: "hp"` drain moves heal the attacker by the specified
      percentage of the raw damage dealt, capped at `maxHp`.
- [x] `resource: "mp"` drain moves restore the attacker's mana by the
      specified percentage, capped at `maxMp`. (Cap forced with a 0-cost,
      200%-restore test move against a near-full pool — confirmed
      `Math.min()` actually engages rather than just never being
      exercised by normal-sized moves.)
- [x] A shield on the defender reduces the defender's actual HP loss but
      does **not** reduce the attacker's drain gain (verified: same drain
      move against a shielded vs. unshielded defender of equal HP heals
      the attacker the same amount either time, while the defender's own
      HP loss differs). (A fully-absorbing shield — defender HP loss = 0
      — still healed the attacker exactly `round(dealt * pct/100)`, proving
      the heal is keyed off the raw pre-shield damage, not post-shield HP
      loss.)
- [x] A drain hit that would overkill the defender (defender's remaining
      HP is less than the damage dealt) still heals the attacker based on
      the full raw damage, not a reduced "effective" amount.
- [x] The target's own HP/MP pool is unaffected beyond the damage the hit
      already dealt (no double-counted loss from the "drain" framing —
      regression check confirming the one-sided-heal design decision
      above was actually implemented as decided). (Defender's HP loss
      equals exactly `dealt`, nothing extra subtracted; mp-resource drain
      leaves the defender's MP completely untouched.)
- [x] `npm run build` / `npm run lint` clean.

Also verified: 50 full battles (30x 1v1, 20x 3v3) using freshly-rolled
instances' real movesets, randomly picking among damage/buff/debuff/drain
slots each turn — 0 crashes. Redirect still correctly throws its
"not executable yet (see upgrades/26)" error.
