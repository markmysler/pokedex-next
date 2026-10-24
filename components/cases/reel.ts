import type { OwnedPokemon } from "@/types/pokemon";
import { getPokemon } from "@/lib/pokedex";
import { instanceRarity, rollReelFiller, speciesGrade, type Rarity } from "@/lib/rarity";

export interface ReelCell {
  key: string;
  name: string;
  rarity: Rarity;
  // Shinies scroll past as a gold ★ card that hides the species, like the
  // rare-special card in a CS2 case. The winning card un-hides on landing.
  hidden: boolean;
}

export interface ReelPlan {
  cells: ReelCell[];
  winIndex: number;
  // Where under the marker the strip stops, as a fraction of a card width
  // (-0.35..0.35), so landings don't all look identical.
  jitter: number;
}

export const REEL_LENGTH = 60;
export const REEL_WIN_INDEX = 52;

// Small deterministic PRNG (mulberry32). Seeding it from the rolled
// Pokémon's id keeps the reel a pure function of the server's result: the
// same pull always draws the same strip, and nothing random runs during
// render.
function seededRandom(seedText: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (Math.imul(seed, 31) + seedText.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The strip for one case. The winner is the Pokémon the open endpoint
// already rolled and saved; every other card is decorative filler drawn at
// the real odds (lib/rarity.ts's rollReelFiller), so the colours you see
// scrolling past are honest and there are no planted near-misses.
export function planReel(winner: OwnedPokemon): ReelPlan {
  const random = seededRandom(winner.id);
  const winnerRarity = instanceRarity(winner);
  const cells: ReelCell[] = Array.from({ length: REEL_LENGTH }, (_, i) => {
    if (i === REEL_WIN_INDEX) {
      return { key: `win-${winner.id}`, name: winner.name, rarity: winnerRarity, hidden: winnerRarity === "shiny" };
    }
    const filler = rollReelFiller(random);
    const name = getPokemon(filler.number)?.name ?? "";
    return {
      key: `${i}-${filler.number}`,
      name,
      rarity: filler.shiny ? "shiny" : speciesGrade(filler.number),
      hidden: filler.shiny,
    };
  });
  return { cells, winIndex: REEL_WIN_INDEX, jitter: (random() - 0.5) * 0.7 };
}

// Fast start, long crawl into the marker -- close to the CS2 case reel.
export function reelEase(t: number): number {
  return 1 - Math.pow(1 - t, 4.2);
}

// A still strip for the idle state, before anything has been opened.
// Seeded so server and client render the same cards.
export function idleCells(seedText: string, count = 14): ReelCell[] {
  const random = seededRandom(seedText);
  return Array.from({ length: count }, (_, i) => {
    const filler = rollReelFiller(random);
    return {
      key: `idle-${i}-${filler.number}`,
      name: getPokemon(filler.number)?.name ?? "",
      rarity: filler.shiny ? "shiny" : speciesGrade(filler.number),
      hidden: filler.shiny,
    };
  });
}
