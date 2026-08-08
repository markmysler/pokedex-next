import { SORT_OPTIONS, type SortKey } from "@/lib/pokemonFilters";

interface PokemonFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  typesList: string[];
}

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
}: PokemonFilterBarProps) {
  return (
    <div className="card inventory-toolbar">
      <input
        id="search-input"
        type="text"
        placeholder="🔍 Search Name, # or Nickname..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="filter-col">
        <label>Type Filter:</label>
        <select value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value)}>
          {typesList.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="filter-col">
        <label>Sort:</label>
        <select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortKey)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
