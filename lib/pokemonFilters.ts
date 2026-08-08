import type { OwnedPokemon } from "@/types/pokemon";

// "unsorted" preserves the incoming array's order (created_at desc, as
// fetched) -- Inventory's existing default, kept as-is so this step doesn't
// alter Inventory's current behavior. TeamPicker uses "total-desc" instead,
// the more useful default once there are hundreds of Pokemon to pick from.
export type SortKey = "unsorted" | "total-desc" | "total-asc" | "name-asc" | "number-asc";

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "unsorted", label: "Default order" },
  { value: "total-desc", label: "Total (high to low)" },
  { value: "total-asc", label: "Total (low to high)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "number-asc", label: "Number" },
];

// Pure function, not a hook -- both InventoryPageClient and TeamPicker need
// the filtered array as a plain value to layer their own selection-state
// logic on top of (upgrades/09-team-picker-parity.md), so a hook would just
// add indirection.
export function filterAndSortPokemon(
  pokemon: OwnedPokemon[],
  opts: { search: string; typeFilter: string; sortBy: SortKey }
): OwnedPokemon[] {
  const q = opts.search.trim().toLowerCase();

  const filtered = pokemon.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.number.includes(q) && !p.nickname?.toLowerCase().includes(q)) {
      return false;
    }
    if (opts.typeFilter !== "All Types" && p.type1 !== opts.typeFilter && p.type2 !== opts.typeFilter) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (opts.sortBy) {
    case "unsorted":
      break;
    case "total-desc":
      sorted.sort((a, b) => b.total - a.total);
      break;
    case "total-asc":
      sorted.sort((a, b) => a.total - b.total);
      break;
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "number-asc":
      sorted.sort((a, b) => Number(a.number) - Number(b.number));
      break;
  }
  return sorted;
}
