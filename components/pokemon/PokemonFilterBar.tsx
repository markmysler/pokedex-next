import { SORT_OPTIONS, type SortKey } from "@/lib/pokemonFilters";
import type { Dictionary } from "@/lib/i18n/getDictionary";

interface PokemonFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  typesList: string[];
  // Optional, English-fallback: InventoryPageClient (upgrades/55-i18n-
  // collection-cluster.md) passes the real dictionary slices; TeamPicker
  // (upgrades/56-i18n-battle-cluster.md, not yet translated) doesn't pass
  // them yet and falls back to the literal English text below rather than
  // needing to be touched in this step.
  dict?: Dictionary["common"]["filterBar"];
  allTypesLabel?: string;
}

const FALLBACK_DICT: Dictionary["common"]["filterBar"] = {
  searchPlaceholder: "Search Name, # or Nickname...",
  typeFilterLabel: "Type Filter:",
  sortLabel: "Sort:",
  sortOptions: {
    unsorted: "Default order",
    "total-desc": "Total (high to low)",
    "total-asc": "Total (low to high)",
    "name-asc": "Name (A-Z)",
    "number-asc": "Number",
  },
};
const FALLBACK_ALL_TYPES_LABEL = "All Types";

// Presentational only -- reused by InventoryPageClient (replacing its inline
// toolbar) and TeamPicker (which had no search/filter/sort before this step).
export default function PokemonFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortByChange,
  typesList,
  dict = FALLBACK_DICT,
  allTypesLabel = FALLBACK_ALL_TYPES_LABEL,
}: PokemonFilterBarProps) {
  return (
    <div className="card inventory-toolbar">
      <div className="search">
        <input
          id="search-input"
          type="text"
          placeholder={dict.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-col">
        <label>{dict.typeFilterLabel}</label>
        <select value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value)}>
          {typesList.map((t) => (
            <option key={t} value={t}>{t === "All Types" ? allTypesLabel : t}</option>
          ))}
        </select>
      </div>
      <div className="filter-col">
        <label>{dict.sortLabel}</label>
        <select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortKey)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{dict.sortOptions[opt.value]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
