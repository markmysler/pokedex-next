"use client";

import { useMemo, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import PokemonInstanceCard from "@/components/inventory/PokemonInstanceCard";
import PokemonFilterBar from "@/components/pokemon/PokemonFilterBar";
import { filterAndSortPokemon, type SortKey } from "@/lib/pokemonFilters";

interface PokemonMultiPickerProps {
  inventory: OwnedPokemon[];
  typesList: string[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyMessage?: string;
}

// A search/filter/sort multi-select grid with no fixed selection size --
// "at least 1, no max" (upgrades/12-friend-chat-trading.md's trade builder),
// unlike TeamPicker.tsx's fixed "exactly 3." Reuses the same underlying
// pieces TeamPicker was refactored onto (PokemonInstanceCard,
// PokemonFilterBar, filterAndSortPokemon) rather than duplicating that grid
// a third time.
export default function PokemonMultiPicker({ inventory, typesList, selected, onToggle, emptyMessage }: PokemonMultiPickerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortBy, setSortBy] = useState<SortKey>("total-desc");

  const filtered = useMemo(
    () => filterAndSortPokemon(inventory, { search, typeFilter, sortBy }),
    [inventory, search, typeFilter, sortBy]
  );

  return (
    <div>
      <PokemonFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        typesList={typesList}
      />
      <div className="pokemon-grid trade-picker-grid">
        {filtered.map((p) => (
          <PokemonInstanceCard
            key={p.id}
            pokemon={p}
            variant="grid"
            selected={selected.includes(p.id)}
            onSelect={() => onToggle(p.id)}
            disabled={p.isStarter}
            disabledReason={p.isStarter ? "Starters can't be traded" : undefined}
          />
        ))}
      </div>
      {inventory.length === 0 && <p>{emptyMessage ?? "Nothing here."}</p>}
      {inventory.length > 0 && filtered.length === 0 && <p>No Pokémon match your filters.</p>}
    </div>
  );
}
