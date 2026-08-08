# Step 11: Sound effects (synthesized, no audio files)

## Why here

Depends on step 10: attack sounds need to know which move type was used
and whether it hit, dodged, or triggered a status — step 10's new
structured `events` data on the round result is exactly that, so this step
only has to consume it rather than parse battle-log strings.

Decided with the user: sounds are synthesized client-side via the Web
Audio API (oscillators + gain envelopes), not pre-recorded audio files.
There are no audio assets anywhere in this repo today (unlike the sprite
GIFs, inherited from the original project), and there's no way to
source/license real audio files in this environment. Synthesis keeps this
fully self-contained, same "no external dependencies" posture as the rest
of the app — the tradeoff is simple/retro-sounding blips rather than
realistic sound design, which is an accepted, explicit tradeoff, not an
oversight.

## What changes

### `lib/sound.ts` (client-only)
- A single lazily-created `AudioContext`, instantiated on first use —
  browsers block audio until a user gesture, and every trigger point in
  this app (clicking a move, opening a lootbox) already originates from a
  click, so this is never blocked in practice.
- `playTone({ freq, durationMs, type: OscillatorType, volume, sweepToFreq?
  })` — the one primitive every effect below is built from: an
  `OscillatorNode` (optionally frequency-swept via a linear ramp) through a
  `GainNode` envelope (quick attack, exponential decay) to the context's
  destination.
- Named effects, each 1-3 `playTone()` calls:
  - `playAttackSound(moveType: PokemonType)` — waveform/frequency/sweep
    varies by type (e.g. Electric: short square-wave zap; Water: sine,
    descending sweep; Fire: sawtooth, rising then falling; Normal: a
    plain short click). All 18 types get a tuple, not just a few — exact
    Hz/waveform choices are tunable by ear later, not something to get
    perfectly right up front.
  - `playDodgeSound()`, distinct from a normal hit (step 10's dodge).
  - `playFaintSound()` — descending sweep.
  - `playVictorySound()` / `playDefeatSound()` — short ascending/
    descending tone sequences.
  - `playLootboxDrumrollSound()` — a short repeating tick synced to the
    reveal dialog's existing shake animation.
  - `playLootboxRevealSound()` — a bright ascending chime, extra flourish
    if the reveal is shiny.
- Defensive no-op if `window`/`AudioContext` is unavailable (SSR import
  safety) — these functions are only ever called from client event
  handlers/effects, but the guard costs nothing.

### Mute control
- A single "🔊/🔇" toggle in `SideNav.tsx`, next to the existing theme
  toggle, same interaction pattern. **Not persisted** — defaults to sound
  on, resets on reload — deliberately matching the theme toggle's existing
  precedent (`SideNav.tsx`'s own comment: "not persisted, always starts
  dark on a fresh load") rather than inventing a new persistence mechanism
  for just this.
- All `play*()` functions check the mute state (a small module-level
  flag/context) before doing anything.

### Wiring
- `BattleArena.tsx` / `OnlineBattle.tsx`: `playAttackSound()`/
  `playDodgeSound()` per event in step 10's structured `events` array as a
  round result is applied; `playFaintSound()` when an event's `fainted` is
  true; `playVictorySound()`/`playDefeatSound()` at the same point
  `BattleResultDialog` opens (reuses the already-available `won` boolean —
  one line each, not a new trigger path).
- `LootboxRevealDialog.tsx`: `playLootboxDrumrollSound()` when entering the
  drumroll phase, `playLootboxRevealSound()` when entering the sprite
  phase.

## End state

- [ ] A mute toggle exists in `SideNav.tsx` and actually silences every
      sound listed above when on.
- [ ] Every trigger point listed above calls the correct `play*()`
      function — verified by code review at each call site (see
      Validation note below).
- [ ] `npm run build` / `npm run lint` clean.

### On validating this step
There's no way to actually *hear* output or run a real `AudioContext` in
this environment (no browser, and Node has no Web Audio implementation).
Validation for this step is necessarily different from every other step in
this plan:
- Write a small script with a minimal fake `AudioContext`/`OscillatorNode`/
  `GainNode` (just enough to record which methods were called with what
  arguments) and call every `play*()` function against it, asserting no
  exceptions and that frequencies/durations are finite, positive numbers —
  catches real logic bugs (NaN from a bad type lookup, calling `.stop()`
  twice) without needing real audio.
- Everything else (whether it actually *sounds* good, whether the mute
  toggle is easy to find, whether the timing feels right) is a call for
  the user to make once they can actually hear it in a browser — flag this
  explicitly rather than claiming it's "done" in a way build/lint can't
  back up.
