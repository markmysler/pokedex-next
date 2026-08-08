"use client";

import { useMemo, useState } from "react";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";
import PokemonInstanceCard from "./PokemonInstanceCard";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";

interface InventoryPageClientProps {
  initialPokemon: OwnedPokemon[];
  initialLootboxes: Lootbox[];
  typesList: string[];
}

const STAT_INFO: Array<{ label: string; key: "hp" | "atk" | "def" | "spatk" | "spdef" | "spd"; color: string }> = [
  { label: "HP", key: "hp", color: "#FF5959" },
  { label: "Attack", key: "atk", color: "#F5AC78" },
  { label: "Defense", key: "def", color: "#FAE078" },
  { label: "Sp. Atk", key: "spatk", color: "#9DB7F5" },
  { label: "Sp. Def", key: "spdef", color: "#A7DB8D" },
  { label: "Speed", key: "spd", color: "#FA92B2" },
];

export default function InventoryPageClient({ initialPokemon, initialLootboxes, typesList }: InventoryPageClientProps) {
  const [pokemon, setPokemon] = useState(initialPokemon);
  const [lootboxes, setLootboxes] = useState(initialLootboxes);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(initialPokemon[0]?.id ?? null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pokemon.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.number.includes(q)) return false;
      if (typeFilter !== "All Types" && p.type1 !== typeFilter && p.type2 !== typeFilter) return false;
      return true;
    });
  }, [pokemon, search, typeFilter]);

  const selected = pokemon.find((p) => p.id === selectedId) ?? null;

  async function handleDiscard(id: string) {
    setError(null);
    const res = await fetch(`/api/inventory/pokemon/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) return setError(data.error);
    setPokemon((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleOpen(id: string) {
    setError(null);
    setOpeningId(id);
    const res = await fetch(`/api/inventory/lootboxes/${id}/open`, { method: "POST" });
    const data = await res.json();
    setOpeningId(null);
    if (data.error) return setError(data.error);
    setLootboxes((prev) => prev.filter((l) => l.id !== id));
    setPokemon((prev) => [data.pokemon as OwnedPokemon, ...prev]);
    setSelectedId((data.pokemon as OwnedPokemon).id);
  }

  return (
    <div className="page">
      <h1 className="page-title">🎒 Inventory</h1>

      {lootboxes.length > 0 && (
        <div className="card">
          <h2>📦 Unopened Lootboxes ({lootboxes.length})</h2>
          <div className="lootbox-row">
            {lootboxes.map((box) => (
              <button
                key={box.id}
                className="btn-primary"
                onClick={() => handleOpen(box.id)}
                disabled={openingId === box.id}
              >
                {openingId === box.id ? "Opening…" : "📦 Open Lootbox"}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}

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
        <div className="view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>▦ Grid</button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>☰ List</button>
        </div>
        <div className="count-label">Showing: {filtered.length} of {pokemon.length}</div>
      </div>

      <div className="inventory-layout">
        <div className={viewMode === "grid" ? "pokemon-grid" : "pokemon-list"}>
          {filtered.length === 0 && <p>No Pokémon match your filters.</p>}
          {filtered.map((p) => (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant={viewMode}
              selected={p.id === selectedId}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </div>

        {selected && (
          <div className="card inventory-detail">
            <div id="card-header">
              <h2>#{selected.number} {selected.name}{selected.isStarter ? " ⭐" : ""}</h2>
              <TypeBadges type1={selected.type1} type2={selected.type2} />
            </div>
            <Sprite name={selected.name} form="normal" className="sprite-img" />
            <div id="card-stats">
              <h3>📊 Stats (this Pokémon)</h3>
              {STAT_INFO.map(({ label, key, color }) => (
                <div className="stat-row" key={key}>
                  <span className="stat-name">{label}:</span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{ width: `${Math.min(100, (selected[key] / 160) * 100)}%`, background: color }}
                    />
                  </div>
                  <span className="stat-value">{selected[key]}</span>
                </div>
              ))}
              <div className="total-stats">Total: {selected.total}</div>
            </div>
            <div id="card-moves">
              <h3>⚔️ Moves</h3>
              <ul className="move-list">
                {selected.moves.map((m) => (
                  <li key={m.name}>{m.name} — {m.type}, {m.power} Pwr, {m.mana_cost} MP</li>
                ))}
              </ul>
            </div>
            <button className="btn-secondary" onClick={() => handleDiscard(selected.id)}>🗑️ Discard</button>
          </div>
        )}
      </div>
    </div>
  );
}
