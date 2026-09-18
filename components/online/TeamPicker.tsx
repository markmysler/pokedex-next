"use client";

import { useMemo, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import PokemonInstanceCard from "@/components/inventory/PokemonInstanceCard";
import PokemonFilterBar from "@/components/pokemon/PokemonFilterBar";
import CardTab from "@/components/ui/CardTab";
import { filterAndSortPokemon, type SortKey } from "@/lib/pokemonFilters";
import { useDictionary } from "@/lib/i18n/useDictionary";

const TEAM_SIZE = 3;

interface TeamPickerProps {
  inventory: OwnedPokemon[];
  typesList: string[];
  onSubmit: (ids: string[]) => Promise<void>;
}

export default function TeamPicker({ inventory, typesList, onSubmit }: TeamPickerProps) {
  const dict = useDictionary();
  const t = dict.battle.teamPicker;
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  // Strongest-first is the most useful default once there are hundreds of
  // Pokemon to pick a team from -- Inventory keeps its own "unsorted"
  // default instead (upgrades/09-team-picker-parity.md).
  const [sortBy, setSortBy] = useState<SortKey>("total-desc");

  const filtered = useMemo(
    () => filterAndSortPokemon(inventory, { search, typeFilter, sortBy }),
    [inventory, search, typeFilter, sortBy]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TEAM_SIZE) return prev;
      return [...prev, id];
    });
  }

  async function submit() {
    if (selected.length !== TEAM_SIZE) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(selected);
    } catch {
      setError(t.lockInError);
      setSubmitting(false);
    }
  }

  return (
    <div className="card team-picker">
      <CardTab icon="🎯" label={t.pickYourTeam(selected.length, TEAM_SIZE)} />
      <p className="online-status">{t.chooseHint}</p>

      <PokemonFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        typesList={typesList}
        dict={dict.common.filterBar}
        allTypesLabel={dict.common.allTypesLabel}
      />

      <div className="pokemon-grid team-picker-grid">
        {filtered.map((p) => {
          const isSelected = selected.includes(p.id);
          const pickIndex = selected.indexOf(p.id);
          return (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant="grid"
              selected={isSelected}
              onSelect={() => !submitting && toggle(p.id)}
              pickOrder={isSelected ? pickIndex + 1 : undefined}
            />
          );
        })}
      </div>

      {inventory.length === 0 && <p>{t.noPokemon}</p>}
      {inventory.length > 0 && filtered.length === 0 && <p>{t.noMatches}</p>}

      <div className="team-lockbar">
        <span className="team-lockbar-count">{t.selectedCount(selected.length, TEAM_SIZE)}</span>
        {error && <span className="auth-error">{error}</span>}
        <button className="btn-primary" disabled={selected.length !== TEAM_SIZE || submitting} onClick={submit}>
          {submitting ? t.lockingIn : t.lockInTeam}
        </button>
      </div>
    </div>
  );
}
