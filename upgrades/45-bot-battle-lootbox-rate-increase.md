# Step 45: Bot-battle lootbox drop rate — 25% → 60%

**Status: shipped.** See `main.md`'s "The mana-to-uses migration" section
for the full context.

## Why here

Fully independent of every other step in this wave — no data-model or
engine dependency, a single constant change. Placed here (rather than
first) only because it's small enough to slot in anywhere; could be done in
any order relative to 40-44/46-47 without conflict.

## What changes

### `app/api/battles/bot-result/route.ts`

```ts
const LOOTBOX_DROP_CHANCE = 0.25; // -> 0.6
```

Update the comment directly above the `if (body.won && Math.random() <
LOOTBOX_DROP_CHANCE)` check (currently explains "the 25%" — update the
number in the prose, not just the code).

Online-battle wins are unaffected — `app/api/rooms/[code]/move/route.ts`'s
`recordBattleEnd()` already grants a lootbox unconditionally (100%) on
every online win, that's not part of this change. That file's own comment
at line ~58 ("unlike bot battles' 25% roll") references the old bot rate in
prose and should be updated to say 60% for consistency, even though no
logic there changes.

## What actually happened

Matched the plan exactly, plus a broader sweep than originally scoped: a
grep for stray "25%" mentions across the codebase (not just the two files
called out above) turned up three more prose references to the old bot
rate that the plan hadn't anticipated — `components/battle/BattleArena.tsx`'s
`reportBotResult()` comment, `components/battle/BattleResultDialog.tsx`'s
prop comment, and, notably, real player-facing copy in
`components/onboarding/WelcomeDialog.tsx` ("a bot battle win has a 25%
chance") — the only one of the three that's actually visible to users, not
just a code comment. All four non-logic references updated to 60% alongside
the two files the plan named. A fifth match, `FighterCard.tsx`'s "Blinded:
25% chance to miss" tooltip, is `BLIND_MISS_CHANCE` (a status-effect
mechanic, `lib/battleEngine.ts:45`) — unrelated to lootboxes, correctly
left untouched.

Validated the real (not reimplemented) `LOOTBOX_DROP_CHANCE` constant by
extracting it via regex from the actual shipped route file and running
200,000 `Math.random() < CHANCE` trials against it: 59.90% observed, well
within tolerance of the expected 60%. Confirmed `recordBattleEnd()`'s
online-win grant has no `Math.random()` gate at all (unconditional insert
on every win) — unaffected, as expected.

## End state

- [x] `LOOTBOX_DROP_CHANCE` is `0.6` in
      `app/api/battles/bot-result/route.ts`, comment updated to match.
- [x] The stale "25%" mention in `app/api/rooms/[code]/move/route.ts`'s
      comment is updated to 60%. (Also found and fixed three more stray
      "25%" mentions the plan hadn't listed — see "What actually
      happened".)
- [x] A batch of simulated bot-battle-win calls (or a direct
      `Math.random()`-seeded unit check) confirms the roll now fires at
      ~60% over a large sample, not ~25%. (200,000-trial check against the
      real extracted constant: 59.90% observed.)
- [x] Online-battle lootbox grant is confirmed still unconditional
      (100%) — unaffected, but worth a quick regression check given the
      two code paths live in adjacent files. (Confirmed: no `Math.random()`
      call anywhere in `recordBattleEnd()`.)
- [x] `npm run build` / `npm run lint` clean.
