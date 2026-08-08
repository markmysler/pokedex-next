"use client";

import { useMemo, useState } from "react";
import type { Pokedex, UserPokedexData } from "@/types/pokemon";
import CompletionBanner from "./CompletionBanner";
import PokemonDetail from "./PokemonDetail";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";

type StatusFilter = "All" | "Caught" | "Missing";
type StatFilter = "Any" | "300+" | "400+" | "500+";

interface PokedexPageClientProps {
  pokedex: Pokedex;
  order: string[];
  typesList: string[];
  initialUserData: UserPokedexData;
}

export default function PokedexPageClient({ pokedex, order, typesList, initialUserData }: PokedexPageClientProps) {
  const [userData, setUserData] = useState(initialUserData);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [statFilter, setStatFilter] = useState<StatFilter>("Any");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedId, setSelectedId] = useState<string | null>(order[0] ?? null);

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

  const acquiredCount = order.reduce((count, num) => count + (userData[num]?.acquired ? 1 : 0), 0);
  const selectedPokemon = selectedId ? pokedex[selectedId] : null;
  const selectedEntry = selectedId ? userData[selectedId] ?? { acquired: false, notes: "" } : { acquired: false, notes: "" };

  async function handleNotesChange(number: string, notes: string) {
    setUserData((prev) => ({
      ...prev,
      [number]: { acquired: prev[number]?.acquired ?? false, notes },
    }));
    await fetch(`/api/user-data/${number}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  return (
    <div className="page">
      <h1 className="page-title">📖 Pokédex</h1>
      <CompletionBanner acquiredCount={acquiredCount} total={order.length} />

      <div className="card inventory-toolbar">
        <input
          id="search-input"
          type="text"
          placeholder="🔍 Search Name or #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        <div className="filter-col">
          <label>Min Total Stats:</label>
          <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as StatFilter)}>
            <option>Any</option>
            <option>300+</option>
            <option>400+</option>
            <option>500+</option>
          </select>
        </div>
        <div className="view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>▦ Grid</button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>☰ List</button>
        </div>
        <div className="count-label">Showing: {filtered.length} of {order.length} Pokémon</div>
      </div>

      <div className="inventory-layout">
        <div className={viewMode === "grid" ? "pokemon-grid" : "pokemon-list"}>
          {filtered.map((num) => {
            const p = pokedex[num];
            const acquired = isAcquired(num);
            if (viewMode === "list") {
              return (
                <div
                  key={num}
                  className={`pokemon-row${num === selectedId ? " selected" : ""}`}
                  onClick={() => setSelectedId(num)}
                >
                  {`#${num}  ${p.name.padEnd(15)}${acquired ? " 🟢" : " ⚪"}`}
                </div>
              );
            }
            return (
              <div
                key={num}
                className={`pokemon-grid-card${num === selectedId ? " selected" : ""}`}
                onClick={() => setSelectedId(num)}
              >
                <Sprite name={p.name} form="normal" className="grid-card-sprite" />
                <div className="grid-card-name">#{p.number} {p.name}</div>
                <TypeBadges type1={p.type1} type2={p.type2} center small />
                <div className="grid-card-total">{acquired ? "🟢 Caught" : "⚪ Uncaught"}</div>
              </div>
            );
          })}
        </div>

        {selectedPokemon && (
          <div className="inventory-detail">
            <PokemonDetail
              key={selectedPokemon.number}
              pokemon={selectedPokemon}
              entry={selectedEntry}
              onNotesChange={(notes) => handleNotesChange(selectedPokemon.number, notes)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
