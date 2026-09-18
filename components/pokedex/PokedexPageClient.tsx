"use client";

import { useMemo, useState } from "react";
import type { Pokedex, UserPokedexData } from "@/types/pokemon";
import { useDictionary } from "@/lib/i18n/useDictionary";
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
  // Read client-side (upgrades/55-i18n-collection-cluster.md) rather than
  // via a Server Component prop -- several entries here are functions
  // (e.g. showingCount, computed from this component's own filter state),
  // and functions can't cross the Server->Client prop boundary.
  const dict = useDictionary();
  const t = dict.collection.pokedex;
  const common = dict.common;
  const [userData, setUserData] = useState(initialUserData);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [statFilter, setStatFilter] = useState<StatFilter>("Any");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedId, setSelectedId] = useState<string | null>(order[0] ?? null);
  // Only affects <900px (see .mobile-detail-open in globals.css) -- desktop's
  // split pane always shows both, so this is inert there.
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  function selectEntry(num: string) {
    setSelectedId(num);
    setMobileDetailOpen(true);
  }

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
      <h1 className="page-title">{t.heading}</h1>
      <CompletionBanner acquiredCount={acquiredCount} total={order.length} dict={dict} />

      <div className="card inventory-toolbar">
        <div className="search">
          <input
            id="search-input"
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-col">
          <label>{t.typeFilterLabel}</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {typesList.map((type) => (
              <option key={type} value={type}>{type === "All Types" ? common.allTypesLabel : type}</option>
            ))}
          </select>
        </div>
        <div className="filter-col">
          <label>{t.statusFilterLabel}</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="All">{t.statusAll}</option>
            <option value="Caught">{t.statusCaught}</option>
            <option value="Missing">{t.statusMissing}</option>
          </select>
        </div>
        <div className="filter-col">
          <label>{t.minTotalStatsLabel}</label>
          <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as StatFilter)}>
            <option value="Any">{t.statAny}</option>
            <option value="300+">300+</option>
            <option value="400+">400+</option>
            <option value="500+">500+</option>
          </select>
        </div>
        <div className="view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>{common.viewToggle.grid}</button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>{common.viewToggle.list}</button>
        </div>
        <div className="count-label">{t.showingCount(filtered.length, order.length)}</div>
      </div>

      <div className={`inventory-layout${mobileDetailOpen ? " mobile-detail-open" : ""}`}>
        <div className={viewMode === "grid" ? "pokemon-grid" : "pokemon-list"}>
          {filtered.map((num) => {
            const p = pokedex[num];
            const acquired = isAcquired(num);
            if (viewMode === "list") {
              return (
                <div
                  key={num}
                  className={`pokemon-row${num === selectedId ? " selected" : ""}`}
                  onClick={() => selectEntry(num)}
                >
                  {`#${num}  ${p.name.padEnd(15)}${acquired ? " 🟢" : " ⚪"}`}
                </div>
              );
            }
            return (
              <div
                key={num}
                className={`pokemon-grid-card${num === selectedId ? " selected" : ""}`}
                onClick={() => selectEntry(num)}
              >
                <Sprite name={p.name} form="normal" className="grid-card-sprite" />
                <div className="grid-card-name">#{p.number} {p.name}</div>
                <TypeBadges type1={p.type1} type2={p.type2} center small />
                <div className="grid-card-total">{acquired ? t.caughtBadge : t.uncaughtBadge}</div>
              </div>
            );
          })}
        </div>

        {selectedPokemon && (
          <div className="inventory-detail">
            <button className="detail-back-btn" onClick={() => setMobileDetailOpen(false)}>{common.backToList}</button>
            <PokemonDetail
              key={selectedPokemon.number}
              pokemon={selectedPokemon}
              entry={selectedEntry}
              onNotesChange={(notes) => handleNotesChange(selectedPokemon.number, notes)}
              dict={dict}
            />
          </div>
        )}
      </div>
    </div>
  );
}
