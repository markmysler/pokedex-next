import type { RolledStats } from "@/types/pokemon";

export type StatKey = keyof Omit<RolledStats, "total" | "moves">;

// The six stats in display order, with the fixed per-stat palette every
// stat block uses (design/DESIGN_SYSTEM.md: the "stat radar" convention,
// independent of the Pokémon's own types). Previously copied into each
// component that drew stat meters.
export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spatk", "spdef", "spd"];

export const STAT_COLORS: Record<StatKey, string> = {
  hp: "#FF5959",
  atk: "#F5AC78",
  def: "#FAE078",
  spatk: "#9DB7F5",
  spdef: "#A7DB8D",
  spd: "#FA92B2",
};
