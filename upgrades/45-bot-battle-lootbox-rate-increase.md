# Step 45: Bot-battle lootbox drop rate — 25% → 60%

**Status: not started.** See `main.md`'s "The mana-to-uses migration"
section for the full context.

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
at line ~53 ("unlike bot battles' 25% roll") references the old bot rate in
prose and should be updated to say 60% for consistency, even though no
logic there changes.

## End state

- [ ] `LOOTBOX_DROP_CHANCE` is `0.6` in
      `app/api/battles/bot-result/route.ts`, comment updated to match.
- [ ] The stale "25%" mention in `app/api/rooms/[code]/move/route.ts`'s
      comment is updated to 60%.
- [ ] A batch of simulated bot-battle-win calls (or a direct
      `Math.random()`-seeded unit check) confirms the roll now fires at
      ~60% over a large sample, not ~25%.
- [ ] Online-battle lootbox grant is confirmed still unconditional
      (100%) — unaffected, but worth a quick regression check given the
      two code paths live in adjacent files.
- [ ] `npm run build` / `npm run lint` clean.
