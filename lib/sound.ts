import type { PokemonType } from "@/types/pokemon";

// Synthesized client-side via the Web Audio API, not pre-recorded files —
// there are no audio assets anywhere in this repo and no way to source/
// license real ones in this environment (upgrades/11-sound-effects.md).
// Simple/retro-sounding blips, not realistic sound design; an accepted
// tradeoff, not an oversight.

let ctx: AudioContext | null = null;
let muted = false;

// Lazily created on first use -- browsers block audio until a user
// gesture, and every trigger point in this app (clicking a move, opening a
// lootbox) already originates from a click, so this is never blocked in
// practice. Guarded for SSR/no-AudioContext environments (defensive no-op).
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
}

export function toggleMuted(): boolean {
  muted = !muted;
  return muted;
}

interface PlayToneOptions {
  freq: number;
  durationMs: number;
  type: OscillatorType;
  volume?: number;
  // Linear frequency ramp from `freq` to this value over the tone's duration.
  sweepToFreq?: number;
  // Delays this tone's start relative to when playTone() is called --
  // lets a named effect schedule a short sequence of tones with one call
  // each instead of manual setTimeout chains.
  delayMs?: number;
}

// The one primitive every effect below is built from: an OscillatorNode
// (optionally frequency-swept via a linear ramp) through a GainNode
// envelope (quick attack, exponential decay) to the context's destination.
export function playTone({ freq, durationMs, type, volume = 0.15, sweepToFreq, delayMs = 0 }: PlayToneOptions): void {
  if (muted) return;
  const audio = getContext();
  if (!audio) return;

  const startAt = audio.currentTime + delayMs / 1000;
  const durationSec = durationMs / 1000;

  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, freq), startAt);
  if (sweepToFreq !== undefined) {
    osc.frequency.linearRampToValueAtTime(Math.max(1, sweepToFreq), startAt + durationSec);
  }

  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, startAt);
  // Exponential ramps can't target exactly 0 -- ramp to a near-silent floor
  // instead, same trick every Web Audio envelope example uses.
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start(startAt);
  osc.stop(startAt + durationSec);
}

// Waveform/frequency/sweep tuned per type -- exact Hz/waveform choices are
// tunable by ear later, not something to get perfectly right up front. All
// 18 types get an entry, not just a few.
const ATTACK_SOUND_BY_TYPE: Record<PokemonType, Omit<PlayToneOptions, "delayMs">> = {
  Normal: { freq: 300, durationMs: 90, type: "square", volume: 0.12 },
  Fire: { freq: 220, durationMs: 220, type: "sawtooth", sweepToFreq: 500, volume: 0.14 },
  Water: { freq: 500, durationMs: 220, type: "sine", sweepToFreq: 200, volume: 0.14 },
  Grass: { freq: 350, durationMs: 150, type: "triangle", sweepToFreq: 280, volume: 0.12 },
  Electric: { freq: 900, durationMs: 90, type: "square", sweepToFreq: 1400, volume: 0.13 },
  Ice: { freq: 1200, durationMs: 180, type: "sine", sweepToFreq: 900, volume: 0.11 },
  Fighting: { freq: 150, durationMs: 100, type: "square", volume: 0.16 },
  Poison: { freq: 260, durationMs: 200, type: "sawtooth", sweepToFreq: 180, volume: 0.13 },
  Ground: { freq: 100, durationMs: 220, type: "triangle", sweepToFreq: 60, volume: 0.16 },
  Flying: { freq: 600, durationMs: 160, type: "triangle", sweepToFreq: 800, volume: 0.11 },
  Psychic: { freq: 700, durationMs: 240, type: "sine", sweepToFreq: 1100, volume: 0.12 },
  Bug: { freq: 450, durationMs: 80, type: "square", sweepToFreq: 550, volume: 0.1 },
  Rock: { freq: 130, durationMs: 180, type: "sawtooth", volume: 0.16 },
  Ghost: { freq: 400, durationMs: 260, type: "sine", sweepToFreq: 150, volume: 0.12 },
  Dragon: { freq: 200, durationMs: 260, type: "sawtooth", sweepToFreq: 350, volume: 0.15 },
  Dark: { freq: 180, durationMs: 200, type: "square", sweepToFreq: 90, volume: 0.14 },
  Steel: { freq: 800, durationMs: 120, type: "square", sweepToFreq: 600, volume: 0.13 },
  Fairy: { freq: 900, durationMs: 200, type: "triangle", sweepToFreq: 1300, volume: 0.11 },
};

export function playAttackSound(moveType: PokemonType): void {
  playTone(ATTACK_SOUND_BY_TYPE[moveType]);
}

export function playDodgeSound(): void {
  playTone({ freq: 700, durationMs: 100, type: "triangle", sweepToFreq: 900, volume: 0.1 });
}

export function playFaintSound(): void {
  playTone({ freq: 400, durationMs: 500, type: "sine", sweepToFreq: 60, volume: 0.15 });
}

export function playVictorySound(): void {
  playTone({ freq: 523, durationMs: 140, type: "square", volume: 0.14 });
  playTone({ freq: 659, durationMs: 140, type: "square", volume: 0.14, delayMs: 140 });
  playTone({ freq: 784, durationMs: 260, type: "square", volume: 0.14, delayMs: 280 });
}

export function playDefeatSound(): void {
  playTone({ freq: 400, durationMs: 180, type: "sawtooth", volume: 0.14 });
  playTone({ freq: 320, durationMs: 180, type: "sawtooth", volume: 0.14, delayMs: 180 });
  playTone({ freq: 220, durationMs: 320, type: "sawtooth", volume: 0.14, delayMs: 360 });
}

// A short repeating tick synced to the reveal dialog's existing shake
// animation (see DRUMROLL_MS in LootboxRevealDialog.tsx).
export function playLootboxDrumrollSound(): void {
  const TICKS = 6;
  const SPACING_MS = 180;
  for (let i = 0; i < TICKS; i++) {
    playTone({ freq: 220, durationMs: 60, type: "square", volume: 0.08, delayMs: i * SPACING_MS });
  }
}

export function playLootboxRevealSound(shiny: boolean): void {
  playTone({ freq: 660, durationMs: 120, type: "triangle", volume: 0.15 });
  playTone({ freq: 880, durationMs: 120, type: "triangle", volume: 0.15, delayMs: 100 });
  playTone({ freq: 1100, durationMs: 220, type: "triangle", volume: 0.15, delayMs: 200 });
  if (shiny) {
    playTone({ freq: 1500, durationMs: 300, type: "sine", volume: 0.14, delayMs: 320 });
  }
}
