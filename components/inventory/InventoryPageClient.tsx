"use client";

import { useMemo, useState } from "react";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";
import PokemonInstanceCard from "./PokemonInstanceCard";
import PokemonFilterBar from "@/components/pokemon/PokemonFilterBar";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import Modal from "@/components/ui/Modal";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";
import { filterAndSortPokemon, type SortKey } from "@/lib/pokemonFilters";
import LootboxRevealDialog from "./LootboxRevealDialog";

const TRADEUP_COUNT = 5;

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
  // "unsorted" keeps Inventory's existing insertion-order default
  // (upgrades/09-team-picker-parity.md) — TeamPicker defaults differently.
  const [sortBy, setSortBy] = useState<SortKey>("unsorted");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(initialPokemon[0]?.id ?? null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealQueue, setRevealQueue] = useState<OwnedPokemon[]>([]);
  const [openQty, setOpenQty] = useState(1);
  const [openingMany, setOpeningMany] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [tradeUpMode, setTradeUpMode] = useState(false);
  const [tradeUpSelected, setTradeUpSelected] = useState<Set<string>>(new Set());
  const [showTradeUpConfirm, setShowTradeUpConfirm] = useState(false);
  const [tradeUpSubmitting, setTradeUpSubmitting] = useState(false);
  const [tradeUpError, setTradeUpError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterAndSortPokemon(pokemon, { search, typeFilter, sortBy }),
    [pokemon, search, typeFilter, sortBy]
  );

  const selected = pokemon.find((p) => p.id === selectedId) ?? null;

  function selectPokemon(id: string) {
    setSelectedId(id);
    setRenamingId(null);
    setRenameError(null);
  }

  function startRenaming(p: OwnedPokemon) {
    setRenamingId(p.id);
    setNicknameInput(p.nickname ?? "");
    setRenameError(null);
  }

  async function handleRenameSave(e: React.FormEvent) {
    e.preventDefault();
    if (!renamingId) return;
    setRenaming(true);
    setRenameError(null);
    const res = await fetch(`/api/inventory/pokemon/${renamingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nicknameInput }),
    });
    const data = await res.json();
    setRenaming(false);
    if (data.error) return setRenameError(data.error);
    setPokemon((prev) => prev.map((p) => (p.id === renamingId ? { ...p, nickname: data.nickname } : p)));
    setRenamingId(null);
  }

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
    // The card-pack reveal (upgrades/04-lootbox-opening.md) shows this same
    // already-persisted result — opening the dialog is wiring, not a new
    // fetch, and the roll above has already happened by this point.
    setRevealQueue([data.pokemon as OwnedPokemon]);
  }

  async function handleOpenMany(qty: number) {
    setError(null);
    setOpeningMany(true);
    const res = await fetch("/api/inventory/lootboxes/open-many", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: qty }),
    });
    const data = await res.json();
    setOpeningMany(false);
    if (data.error) return setError(data.error);
    const opened = data.pokemon as OwnedPokemon[];
    // The batch endpoint only claims (and reports) however many were
    // actually still available — trust its returned count, not the
    // requested qty, to decide how many lootboxes to drop locally.
    setLootboxes((prev) => prev.slice(opened.length));
    setPokemon((prev) => [...opened, ...prev]);
    if (opened.length > 0) setSelectedId(opened[0].id);
    setOpenQty(1);
    // Queued reveal: LootboxRevealDialog is keyed on revealQueue[0].id below,
    // so shifting the queue on close forces a full remount, resetting the
    // dialog's internal phase back to "drumroll" for the next box for free.
    setRevealQueue(opened);
  }

  function toggleTradeUpMode() {
    setTradeUpMode((prev) => !prev);
    setTradeUpSelected(new Set());
    setTradeUpError(null);
  }

  function toggleTradeUpPick(p: OwnedPokemon) {
    if (p.isStarter) return;
    setTradeUpSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else if (next.size < TRADEUP_COUNT) {
        next.add(p.id);
      }
      return next;
    });
  }

  async function confirmTradeUp() {
    setTradeUpSubmitting(true);
    setTradeUpError(null);
    const ids = Array.from(tradeUpSelected);
    const res = await fetch("/api/inventory/tradeup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemonInstanceIds: ids }),
    });
    const data = await res.json();
    setTradeUpSubmitting(false);
    if (data.error) {
      setTradeUpError(data.error);
      return;
    }
    setPokemon((prev) => prev.filter((p) => !tradeUpSelected.has(p.id)));
    setLootboxes((prev) => [...prev, { id: data.lootboxId, openedAt: null, createdAt: new Date().toISOString() }]);
    setShowTradeUpConfirm(false);
    setTradeUpMode(false);
    setTradeUpSelected(new Set());
  }

  return (
    <div className="page">
      <h1 className="page-title">🎒 Inventory</h1>

      {revealQueue.length > 0 && (
        <LootboxRevealDialog
          key={revealQueue[0].id}
          pokemon={revealQueue[0]}
          hasNext={revealQueue.length > 1}
          onClose={() => setRevealQueue((q) => q.slice(1))}
        />
      )}

      {lootboxes.length > 0 && (
        <div className="card">
          <h2>📦 Unopened Lootboxes ({lootboxes.length})</h2>
          {lootboxes.length === 1 ? (
            <div className="lootbox-row">
              <button
                className="btn-primary"
                onClick={() => handleOpen(lootboxes[0].id)}
                disabled={openingId === lootboxes[0].id}
              >
                {openingId === lootboxes[0].id ? "Opening…" : "📦 Open Lootbox"}
              </button>
            </div>
          ) : (
            <div className="lootbox-batch-row">
              <p>You have {lootboxes.length} unopened lootboxes.</p>
              <div className="lootbox-qty-stepper">
                <input
                  type="number"
                  min={1}
                  max={lootboxes.length}
                  value={openQty}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n)) setOpenQty(Math.min(Math.max(1, n), lootboxes.length));
                  }}
                  disabled={openingMany}
                />
              </div>
              <button
                className="btn-primary"
                onClick={() => handleOpenMany(Math.min(Math.max(1, openQty), lootboxes.length))}
                disabled={openingMany}
              >
                {openingMany ? "Opening…" : `📦 Open ${openQty} Lootbox${openQty === 1 ? "" : "es"}`}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}

      <PokemonFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        typesList={typesList}
      />
      <div className="card inventory-toolbar">
        <div className="view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>▦ Grid</button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>☰ List</button>
        </div>
        <button className={tradeUpMode ? "btn-primary" : "btn-secondary"} onClick={toggleTradeUpMode}>
          🔥 Trade Up
        </button>
        <div className="count-label">Showing: {filtered.length} of {pokemon.length}</div>
      </div>

      {tradeUpError && <p className="auth-error">{tradeUpError}</p>}

      <div className="inventory-layout">
        <div className={viewMode === "grid" ? "pokemon-grid" : "pokemon-list"}>
          {filtered.length === 0 && <p>No Pokémon match your filters.</p>}
          {filtered.map((p) => (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant={viewMode}
              selected={tradeUpMode ? tradeUpSelected.has(p.id) : p.id === selectedId}
              onSelect={() => (tradeUpMode ? toggleTradeUpPick(p) : selectPokemon(p.id))}
              disabled={tradeUpMode && p.isStarter}
            />
          ))}
        </div>

        {selected && !tradeUpMode && (
          <div className="card inventory-detail">
            <div id="card-header">
              {renamingId === selected.id ? (
                <form className="nickname-edit-form" onSubmit={handleRenameSave}>
                  <input
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    maxLength={24}
                    placeholder={selected.name}
                    autoFocus
                  />
                  <button className="btn-primary" type="submit" disabled={renaming}>
                    {renaming ? "Saving…" : "Save"}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setRenamingId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <h2>
                    {displayName(selected)}{selected.isStarter ? " ⭐" : ""}{" "}
                    <button className="btn-secondary rename-btn" onClick={() => startRenaming(selected)}>✏️ Rename</button>
                  </h2>
                  {selected.nickname && <p className="detail-species-line">#{selected.number} {selected.name}</p>}
                </>
              )}
              {renameError && <p className="auth-error">{renameError}</p>}
              <TypeBadges type1={selected.type1} type2={selected.type2} />
              {isShinyInstance(selected) && <span className="shiny-badge">✨ Shiny</span>}
            </div>
            <Sprite name={selected.name} form={isShinyInstance(selected) ? "shiny" : "normal"} className="sprite-img" />
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

      {tradeUpMode && (
        <div className="card tradeup-bar">
          <span className="tradeup-count">{tradeUpSelected.size}/{TRADEUP_COUNT} selected</span>
          <button
            className="btn-primary"
            disabled={tradeUpSelected.size !== TRADEUP_COUNT}
            onClick={() => setShowTradeUpConfirm(true)}
          >
            🔥 Trade Up
          </button>
        </div>
      )}

      {showTradeUpConfirm && (
        <Modal onClose={() => (tradeUpSubmitting ? null : setShowTradeUpConfirm(false))}>
          <h2>🔥 Confirm Trade Up</h2>
          <p>These 5 Pokémon will be permanently released in exchange for 1 lootbox. This can&apos;t be undone.</p>
          <ul className="tradeup-confirm-list">
            {pokemon.filter((p) => tradeUpSelected.has(p.id)).map((p) => (
              <li key={p.id}>{displayName(p)} — #{p.number} {p.name} (Total {p.total})</li>
            ))}
          </ul>
          {tradeUpError && <p className="auth-error">{tradeUpError}</p>}
          <div className="trade-builder-actions">
            <button className="btn-primary" disabled={tradeUpSubmitting} onClick={confirmTradeUp}>
              {tradeUpSubmitting ? "Trading Up…" : "Confirm"}
            </button>
            <button className="btn-secondary" disabled={tradeUpSubmitting} onClick={() => setShowTradeUpConfirm(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
