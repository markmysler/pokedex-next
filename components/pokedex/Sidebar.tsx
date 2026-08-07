"use client";

import { useMemo, useState } from "react";
import type { Pokedex, UserPokedexData } from "@/types/pokemon";

type StatusFilter = "All" | "Caught" | "Missing";
type StatFilter = "Any" | "300+" | "400+" | "500+";

interface SidebarProps {
  pokedex: Pokedex;
  order: string[];
  typesList: string[];
  userData: UserPokedexData;
  selectedId: string | null;
  onSelect: (number: string) => void;
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export default function Sidebar({
  pokedex,
  order,
  typesList,
  userData,
  selectedId,
  onSelect,
  theme,
  onThemeToggle,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [statFilter, setStatFilter] = useState<StatFilter>("Any");

  const isAcquired = (num: string) => Boolean(userData[num]?.acquired);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return order.filter((num) => {
      const p = pokedex[num];
      if (q && !p.name.toLowerCase().includes(q) && !num.toLowerCase().includes(q)) return false;
      if (typeFilter !== "All Types" && p.type1 !== typeFilter && p.type2 !== typeFilter) return false;
      const acquired = isAcquired(num);
      if (statusFilter === "Caught" && !acquired) return false;
      if (statusFilter === "Missing" && acquired) return false;
      if (statFilter === "300+" && p.total < 300) return false;
      if (statFilter === "400+" && p.total < 400) return false;
      if (statFilter === "500+" && p.total < 500) return false;
      return true;
      // userData intentionally read via isAcquired() rather than listed as a dep array key by field,
      // it's fine since userData itself is the dep.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, statusFilter, statFilter, order, pokedex, userData]);

  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">🔴 POKÉDEX</h1>

      <input
        id="search-input"
        type="text"
        placeholder="🔍 Search Name or #..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="filter-row">
        <div className="filter-col">
          <label>Type Filter:</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {typesList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="filter-col">
          <label>Status Filter:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option>All</option>
            <option>Caught</option>
            <option>Missing</option>
          </select>
        </div>
      </div>

      <div className="filter-row stat-filter-row">
        <label>Min Total Stats:</label>
        <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as StatFilter)}>
          <option>Any</option>
          <option>300+</option>
          <option>400+</option>
          <option>500+</option>
        </select>
      </div>

      <div className="count-label">Showing: {filtered.length} of {order.length} Pokémon</div>

      <div className="pokemon-list">
        {filtered.map((num) => {
          const p = pokedex[num];
          const acquired = isAcquired(num);
          return (
            <div
              key={num}
              className={`pokemon-row${num === selectedId ? " selected" : ""}`}
              onClick={() => onSelect(num)}
            >
              {`#${num}  ${p.name.padEnd(15)}${acquired ? " 🟢" : " ⚪"}`}
            </div>
          );
        })}
      </div>

      <div className="theme-row">
        <span>Theme:</span>
        <label className="switch">
          <input type="checkbox" checked={theme === "dark"} onChange={onThemeToggle} />
          <span className="slider" />
        </label>
        <span>{theme === "dark" ? "Dark" : "Light"}</span>
      </div>
    </aside>
  );
}
