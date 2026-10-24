"use client";

import { useId, type ReactNode } from "react";
import { SORT_OPTIONS, type SortKey } from "@/lib/pokemonFilters";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon from "@/components/ui/Icon";

interface PokemonFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  typesList: string[];
  // Extra controls on the right (a view toggle, a count).
  children?: ReactNode;
}

// One compact row shared by My Pokémon, the team picker and the trade
// builder (redesign wave v9). Visible labels became placeholders and
// screen-reader labels, so the row stays one line on desktop.
export default function PokemonFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortByChange,
  typesList,
  children,
}: PokemonFilterBarProps) {
  const dict = useDictionary();
  const t = dict.common.filterBar;
  const id = useId();

  return (
    <div className="filter-bar">
      <label className="search-input filter-search" htmlFor={`${id}-q`}>
        <span className="sr-only">{t.searchPlaceholder}</span>
        <Icon name="search" size={16} />
        <input id={`${id}-q`} type="search" placeholder={t.searchPlaceholder} value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </label>
      <label className="filter-select">
        <span className="sr-only">{t.typeFilterLabel}</span>
        <select value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value)}>
          {typesList.map((type) => (
            // "All Types" is also the filter's sentinel value (lib/pokemonFilters.ts),
            // so only its label is translated.
            <option key={type} value={type}>{type === "All Types" ? dict.common.allTypesLabel : type}</option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        <span className="sr-only">{t.sortLabel}</span>
        <select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortKey)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t.sortOptions[opt.value]}</option>
          ))}
        </select>
      </label>
      {children}
    </div>
  );
}
