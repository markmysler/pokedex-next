"use client";

import { useMemo, useState } from "react";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";
import { useDictionary } from "@/lib/i18n/useDictionary";
import PokemonInstanceCard from "./PokemonInstanceCard";
import PokemonFilterBar from "@/components/pokemon/PokemonFilterBar";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import Modal from "@/components/ui/Modal";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import CardTab from "@/components/ui/CardTab";
import { isShinyInstance } from "@/lib/shiny";
import { displayName, movePower } from "@/lib/pokemonDisplay";
import { filterAndSortPokemon, type SortKey } from "@/lib/pokemonFilters";
import { getPokemon } from "@/lib/pokedex";
import LootboxRevealDialog from "./LootboxRevealDialog";

const TRADEUP_COUNT = 5;
const EVOLVE_COUNT = 5;

interface InventoryPageClientProps {
  initialPokemon: OwnedPokemon[];
  initialLootboxes: Lootbox[];
  typesList: string[];
}

export default function InventoryPageClient({ initialPokemon, initialLootboxes, typesList }: InventoryPageClientProps) {
  // Read client-side (upgrades/55-i18n-collection-cluster.md) rather than
  // via a Server Component prop -- several entries here are functions
  // (e.g. showingCount, moveLine, computed from this component's own
  // state), and functions can't cross the Server->Client prop boundary.
  // LootboxRevealDialog below is a Client Component too, so handing it a
  // slice of this same object is a plain in-browser prop pass, not a
  // boundary crossing -- no restriction there.
  const dict = useDictionary();
  const t = dict.collection.inventory;
  const c = dict.collection;
  const common = dict.common;
  const stats = common.stats;
  const STAT_INFO: Array<{ label: string; key: "hp" | "atk" | "def" | "spatk" | "spdef" | "spd"; color: string }> = [
    { label: stats.hp, key: "hp", color: "#FF5959" },
    { label: stats.atk, key: "atk", color: "#F5AC78" },
    { label: stats.def, key: "def", color: "#FAE078" },
    { label: stats.spatk, key: "spatk", color: "#9DB7F5" },
    { label: stats.spdef, key: "spdef", color: "#A7DB8D" },
    { label: stats.spd, key: "spd", color: "#FA92B2" },
  ];

  const [pokemon, setPokemon] = useState(initialPokemon);
  const [lootboxes, setLootboxes] = useState(initialLootboxes);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  // "unsorted" keeps Inventory's existing insertion-order default
  // (upgrades/09-team-picker-parity.md) — TeamPicker defaults differently.
  const [sortBy, setSortBy] = useState<SortKey>("unsorted");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(initialPokemon[0]?.id ?? null);
  // Only affects <900px (see .mobile-detail-open in globals.css) -- desktop's
  // split pane always shows both, so this is inert there.
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
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

  // Evolve (upgrades/51-evolution-api-and-inventory-ui.md) -- same "select 5
  // of a kind" picker shape as Trade Up above, but scoped to one species at a
  // time (evolveSpeciesNumber below) and only species with a real evolution.
  // A separate reveal (evolveReveal) from the lootbox queue since evolving
  // always produces exactly 1 result, never a batch.
  const [evolveMode, setEvolveMode] = useState(false);
  const [evolveSelected, setEvolveSelected] = useState<Set<string>>(new Set());
  const [showEvolveConfirm, setShowEvolveConfirm] = useState(false);
  const [evolveSubmitting, setEvolveSubmitting] = useState(false);
  const [evolveError, setEvolveError] = useState<string | null>(null);
  const [evolveReveal, setEvolveReveal] = useState<OwnedPokemon | null>(null);

  const filtered = useMemo(
    () => filterAndSortPokemon(pokemon, { search, typeFilter, sortBy }),
    [pokemon, search, typeFilter, sortBy]
  );

  const selected = pokemon.find((p) => p.id === selectedId) ?? null;
  // Whatever species is already represented in evolveSelected, if any --
  // null once the set is empty, meaning any evolvable species can start a
  // fresh pick. Locks every other species out of the picker once set.
  const evolveSpeciesNumber = pokemon.find((p) => evolveSelected.has(p.id))?.number ?? null;

  function selectPokemon(id: string) {
    setSelectedId(id);
    setRenamingId(null);
    setRenameError(null);
    setMobileDetailOpen(true);
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
    if (selectedId === id) {
      setSelectedId(null);
      setMobileDetailOpen(false);
    }
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
    // Trade Up and Evolve are mutually exclusive picker modes -- entering
    // one exits the other, same as either exits plain selection.
    setEvolveMode(false);
    setEvolveSelected(new Set());
    setEvolveError(null);
  }

  function toggleEvolveMode() {
    setEvolveMode((prev) => !prev);
    setEvolveSelected(new Set());
    setEvolveError(null);
    setTradeUpMode(false);
    setTradeUpSelected(new Set());
    setTradeUpError(null);
  }

  function evolveDisabledReason(p: OwnedPokemon): string | undefined {
    if (p.isStarter) return t.startersCantEvolve;
    const species = getPokemon(p.number);
    if (!species || species.evolvesInto === null) return t.noEvolutionForSpecies;
    if (evolveSpeciesNumber !== null && evolveSpeciesNumber !== p.number && !evolveSelected.has(p.id)) {
      return t.selectSameSpecies;
    }
    return undefined;
  }

  function toggleEvolvePick(p: OwnedPokemon) {
    if (evolveDisabledReason(p) !== undefined && !evolveSelected.has(p.id)) return;
    setEvolveSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
        return next;
      }
      if (next.size < EVOLVE_COUNT) next.add(p.id);
      return next;
    });
  }

  async function confirmEvolve() {
    setEvolveSubmitting(true);
    setEvolveError(null);
    const ids = Array.from(evolveSelected);
    const res = await fetch("/api/inventory/evolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemonInstanceIds: ids }),
    });
    const data = await res.json();
    setEvolveSubmitting(false);
    if (data.error) {
      setEvolveError(data.error);
      return;
    }
    const evolved = data.pokemon as OwnedPokemon;
    setPokemon((prev) => [evolved, ...prev.filter((p) => !evolveSelected.has(p.id))]);
    setSelectedId(evolved.id);
    setShowEvolveConfirm(false);
    setEvolveMode(false);
    setEvolveSelected(new Set());
    // Same already-persisted-result reveal pattern as opening a lootbox --
    // the evolve API call above already did the burn + roll + insert, this
    // is just wiring the dialog to show what already happened.
    setEvolveReveal(evolved);
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

  // Narrow slice passed to LootboxRevealDialog -- it only ever needs these
  // 5 pieces (upgrades/55-i18n-collection-cluster.md), not the whole
  // Dictionary, since BattleArena.tsx/OnlineBattle.tsx's own call sites
  // (Battle cluster, step 56) pass no dict at all yet.
  const lootboxRevealDict = { stats: common.stats, shinyBadge: common.shinyBadge, movesLabel: c.movesLabel, totalLabel: c.totalLabel, moveLine: c.moveLine, lootboxReveal: c.lootboxReveal };

  return (
    <div className="page">
      <h1 className="page-title">{t.heading}</h1>

      {revealQueue.length > 0 && (
        <LootboxRevealDialog
          key={revealQueue[0].id}
          pokemon={revealQueue[0]}
          hasNext={revealQueue.length > 1}
          onClose={() => setRevealQueue((q) => q.slice(1))}
          drumrollText={c.lootboxReveal.openingLootboxText}
          dict={lootboxRevealDict}
        />
      )}

      {evolveReveal && (
        <LootboxRevealDialog
          key={evolveReveal.id}
          pokemon={evolveReveal}
          drumrollIcon="🧬"
          drumrollText={c.lootboxReveal.evolvingText}
          onClose={() => setEvolveReveal(null)}
          dict={lootboxRevealDict}
        />
      )}

      {lootboxes.length > 0 && (
        <div className="card lootbox-hero">
          <CardTab icon="📦" label={t.unopenedLootboxes(lootboxes.length)} color="var(--accent-2)" />
          {lootboxes.length === 1 ? (
            <div className="lootbox-row">
              <button
                className="btn-primary"
                onClick={() => handleOpen(lootboxes[0].id)}
                disabled={openingId === lootboxes[0].id}
              >
                {openingId === lootboxes[0].id ? t.opening : t.openLootbox}
              </button>
            </div>
          ) : (
            <div className="lootbox-batch-row">
              <p>{t.unopenedCountNote(lootboxes.length)}</p>
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
                {openingMany ? t.opening : t.openNLootboxes(openQty)}
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
        dict={common.filterBar}
        allTypesLabel={common.allTypesLabel}
      />
      <div className="card inventory-toolbar">
        <div className="view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>{common.viewToggle.grid}</button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>{common.viewToggle.list}</button>
        </div>
        <button className={`btn-tradeup${tradeUpMode ? " active" : ""}`} onClick={toggleTradeUpMode}>
          {t.tradeUpButton}
        </button>
        <button className={`btn-evolve${evolveMode ? " active" : ""}`} onClick={toggleEvolveMode}>
          {t.evolveButton}
        </button>
        <div className="count-label">{t.showingCount(filtered.length, pokemon.length)}</div>
      </div>

      {tradeUpError && <p className="auth-error">{tradeUpError}</p>}
      {evolveError && <p className="auth-error">{evolveError}</p>}

      <div className={`inventory-layout${mobileDetailOpen ? " mobile-detail-open" : ""}`}>
        <div className={viewMode === "grid" ? "pokemon-grid" : "pokemon-list"}>
          {filtered.length === 0 && <p>{t.noMatches}</p>}
          {filtered.map((p) => (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant={viewMode}
              selected={tradeUpMode ? tradeUpSelected.has(p.id) : evolveMode ? evolveSelected.has(p.id) : p.id === selectedId}
              onSelect={() => (tradeUpMode ? toggleTradeUpPick(p) : evolveMode ? toggleEvolvePick(p) : selectPokemon(p.id))}
              disabled={tradeUpMode ? p.isStarter : evolveMode ? evolveDisabledReason(p) !== undefined : false}
              disabledReason={
                tradeUpMode
                  ? (p.isStarter ? t.startersCantTradeUp : undefined)
                  : evolveMode
                    ? evolveDisabledReason(p)
                    : undefined
              }
            />
          ))}
        </div>

        {selected && !tradeUpMode && !evolveMode && (
          <div className="card inventory-detail">
            <button className="detail-back-btn" onClick={() => setMobileDetailOpen(false)}>{common.backToList}</button>
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
                    {renaming ? t.renameSaving : t.renameSave}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setRenamingId(null)}>
                    {common.cancel}
                  </button>
                </form>
              ) : (
                <>
                  <h2>
                    {displayName(selected)}{selected.isStarter ? " ⭐" : ""}{" "}
                    <button className="btn-secondary rename-btn" onClick={() => startRenaming(selected)}>{t.renameBtn}</button>
                  </h2>
                  {selected.nickname && <p className="detail-species-line">#{selected.number} {selected.name}</p>}
                </>
              )}
              {renameError && <p className="auth-error">{renameError}</p>}
              <TypeBadges type1={selected.type1} type2={selected.type2} />
              {isShinyInstance(selected) && <span className="shiny-badge">{common.shinyBadge}</span>}
            </div>
            <Sprite name={selected.name} form={isShinyInstance(selected) ? "shiny" : "normal"} className="sprite-img" />
            <div id="card-stats">
              <CardTab icon="📊" label={t.statsLabel} />
              {STAT_INFO.map(({ label, key, color }) => (
                <SegmentedMeter key={key} label={label} value={selected[key]} max={160} color={color} />
              ))}
              <div className="total-stats">{c.totalLabel(selected.total)}</div>
            </div>
            <div id="card-moves">
              <CardTab icon="⚔️" label={c.movesLabel} />
              <ul className="move-list">
                {selected.moves.map((m) => (
                  <li key={m.name}>{c.moveLine(m.name, m.type, movePower(m), m.max_uses)}</li>
                ))}
              </ul>
            </div>
            <button
              className="btn-danger"
              onClick={() => handleDiscard(selected.id)}
              disabled={selected.isStarter}
              title={selected.isStarter ? t.discardTooltip : undefined}
            >
              {t.discard}
            </button>
          </div>
        )}
      </div>

      {tradeUpMode && (
        <div className="card tradeup-bar">
          <span className="tradeup-count">{t.selectedCount(tradeUpSelected.size, TRADEUP_COUNT)}</span>
          <button
            className="btn-primary"
            disabled={tradeUpSelected.size !== TRADEUP_COUNT}
            onClick={() => setShowTradeUpConfirm(true)}
          >
            {t.tradeUpButton}
          </button>
        </div>
      )}

      {showTradeUpConfirm && (
        <Modal onClose={() => (tradeUpSubmitting ? null : setShowTradeUpConfirm(false))}>
          <h2>{t.tradeUpConfirmHeading}</h2>
          <p>{t.tradeUpConfirmBody}</p>
          <ul className="tradeup-confirm-list">
            {pokemon.filter((p) => tradeUpSelected.has(p.id)).map((p) => (
              <li key={p.id}>{t.confirmListItem(displayName(p), p.number, p.name, p.total)}</li>
            ))}
          </ul>
          {tradeUpError && <p className="auth-error">{tradeUpError}</p>}
          <div className="trade-builder-actions">
            <button className="btn-primary" disabled={tradeUpSubmitting} onClick={confirmTradeUp}>
              {tradeUpSubmitting ? t.tradeUpConfirmConfirming : t.tradeUpConfirmConfirm}
            </button>
            <button className="btn-secondary" disabled={tradeUpSubmitting} onClick={() => setShowTradeUpConfirm(false)}>
              {common.cancel}
            </button>
          </div>
        </Modal>
      )}

      {evolveMode && (
        <div className="card evolve-bar">
          <span className="evolve-count">{t.selectedCount(evolveSelected.size, EVOLVE_COUNT)}</span>
          <button
            className="btn-primary"
            disabled={evolveSelected.size !== EVOLVE_COUNT}
            onClick={() => setShowEvolveConfirm(true)}
          >
            {t.evolveButton}
          </button>
        </div>
      )}

      {showEvolveConfirm && (
        <Modal onClose={() => (evolveSubmitting ? null : setShowEvolveConfirm(false))}>
          <h2>{t.evolveConfirmHeading}</h2>
          <p>{t.evolveConfirmBody}</p>
          <ul className="evolve-confirm-list">
            {pokemon.filter((p) => evolveSelected.has(p.id)).map((p) => (
              <li key={p.id}>{t.confirmListItem(displayName(p), p.number, p.name, p.total)}</li>
            ))}
          </ul>
          {evolveError && <p className="auth-error">{evolveError}</p>}
          <div className="trade-builder-actions">
            <button className="btn-primary" disabled={evolveSubmitting} onClick={confirmEvolve}>
              {evolveSubmitting ? t.evolveConfirmConfirming : t.evolveConfirmConfirm}
            </button>
            <button className="btn-secondary" disabled={evolveSubmitting} onClick={() => setShowEvolveConfirm(false)}>
              {common.cancel}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
