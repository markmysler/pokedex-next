"use client";

import { useMemo, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import PokemonInstanceCard from "./PokemonInstanceCard";
import OwnedPokemonDetail, { EVOLVE_COUNT } from "./OwnedPokemonDetail";
import LootboxRevealDialog from "./LootboxRevealDialog";
import PokemonFilterBar from "@/components/pokemon/PokemonFilterBar";
import SectionTabs from "@/components/nav/SectionTabs";
import { useCaseCount } from "@/components/nav/CaseCount";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import Sprite from "@/components/Sprite";
import { useToast } from "@/components/ui/Toast";
import Link from "@/components/LocaleLink";
import { displayName } from "@/lib/pokemonDisplay";
import { filterAndSortPokemon, type SortKey } from "@/lib/pokemonFilters";
import { getPokemon } from "@/lib/pokedex";

const TRADEUP_COUNT = 5;

interface InventoryPageClientProps {
  initialPokemon: OwnedPokemon[];
  typesList: string[];
}

type Confirm = "tradeup" | "evolve" | "release" | null;

// My Pokémon (redesign wave v9). Browse in a grid with the selected
// Pokémon's details beside it; tick "Select" to pick several, and an action
// bar offers Trade up and Evolve, saying what each still needs. This
// replaces the old Trade Up / Evolve modes you had to discover. Opening
// lootboxes moved to its own screen (/open).
export default function InventoryPageClient({ initialPokemon, typesList }: InventoryPageClientProps) {
  const dict = useDictionary();
  const t = dict.collection.inventory;
  const common = dict.common;
  const wide = useMediaQuery("(min-width: 1100px)");
  const toast = useToast();
  const { count: caseCount, setCount: setCaseCount } = useCaseCount();

  const [pokemon, setPokemon] = useState(initialPokemon);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortBy, setSortBy] = useState<SortKey>("unsorted");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(initialPokemon[0]?.id ?? null);
  // Narrow screens show the detail in a dialog instead of a side panel.
  const [detailOpen, setDetailOpen] = useState(false);

  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evolveReveal, setEvolveReveal] = useState<OwnedPokemon | null>(null);

  const filtered = useMemo(() => filterAndSortPokemon(pokemon, { search, typeFilter, sortBy }), [pokemon, search, typeFilter, sortBy]);
  const selected = pokemon.find((p) => p.id === selectedId) ?? null;
  const pickedPokemon = picked.map((id) => pokemon.find((p) => p.id === id)).filter((p): p is OwnedPokemon => Boolean(p));

  const pickedSpecies = pickedPokemon[0]?.number ?? null;
  const sameSpecies = pickedPokemon.length > 0 && pickedPokemon.every((p) => p.number === pickedSpecies);
  const pickedEvolvable = sameSpecies && pickedSpecies !== null && getPokemon(pickedSpecies)?.evolvesInto != null;
  const canTradeUp = pickedPokemon.length === TRADEUP_COUNT && pickedPokemon.every((p) => !p.isStarter);
  const canEvolve = pickedPokemon.length === EVOLVE_COUNT && pickedEvolvable;

  let hint: string = t.selectionHint;
  if (canTradeUp && canEvolve) hint = t.readyHint;
  else if (canTradeUp) hint = t.readyTradeUpOnly;
  else if (pickedPokemon.length > 0) hint = pickedEvolvable ? t.evolveNeeds(pickedPokemon.length, pickedPokemon[0].name) : t.tradeUpNeeds(pickedPokemon.length);

  function sameSpeciesCount(p: OwnedPokemon): number {
    return pokemon.filter((x) => x.number === p.number && !x.isStarter).length;
  }

  function onCardClick(p: OwnedPokemon) {
    if (selecting) {
      setPicked((prev) => (prev.includes(p.id) ? prev.filter((id) => id !== p.id) : prev.length < TRADEUP_COUNT ? [...prev, p.id] : prev));
      return;
    }
    setSelectedId(p.id);
    setDetailOpen(true);
  }

  function toggleSelecting() {
    setSelecting((s) => !s);
    setPicked([]);
    setError(null);
  }

  async function rename(id: string, nickname: string): Promise<string | null> {
    const res = await fetch(`/api/inventory/pokemon/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    if (data.error) return data.error as string;
    setPokemon((prev) => prev.map((p) => (p.id === id ? { ...p, nickname: data.nickname } : p)));
    return null;
  }

  // Preselects the 5 strongest copies: the evolved Pokémon's stats are
  // derived from the 5 burned (lib/evolution.ts), so these give the best
  // result. The player still reviews them in the confirm dialog.
  function evolveNow(p: OwnedPokemon) {
    const best = pokemon
      .filter((x) => x.number === p.number && !x.isStarter)
      .sort((a, b) => b.total - a.total)
      .slice(0, EVOLVE_COUNT)
      .map((x) => x.id);
    setSelecting(true);
    setPicked(best);
    setDetailOpen(false);
    setError(null);
    setConfirm("evolve");
  }

  async function submit() {
    if (!confirm) return;
    setSubmitting(true);
    setError(null);
    try {
      if (confirm === "release" && selected) {
        const res = await fetch(`/api/inventory/pokemon/${selected.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPokemon((prev) => prev.filter((p) => p.id !== selected.id));
        setSelectedId(null);
        setDetailOpen(false);
      } else {
        const res = await fetch(confirm === "tradeup" ? "/api/inventory/tradeup" : "/api/inventory/evolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pokemonInstanceIds: picked }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (confirm === "tradeup") {
          setPokemon((prev) => prev.filter((p) => !picked.includes(p.id)));
          setCaseCount((c) => c + 1);
          toast.push(
            <div className="row" style={{ gap: 10 }}>
              <span>{t.tradeUpDone}</span>
              <Link href="/open" className="btn-primary btn-sm">{t.openCase}</Link>
            </div>
          );
        } else {
          const evolved = data.pokemon as OwnedPokemon;
          setPokemon((prev) => [evolved, ...prev.filter((p) => !picked.includes(p.id))]);
          setSelectedId(evolved.id);
          setEvolveReveal(evolved);
        }
        setSelecting(false);
        setPicked([]);
      }
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const detail = selected && (
    <OwnedPokemonDetail
      key={selected.id}
      pokemon={selected}
      sameSpeciesCount={sameSpeciesCount(selected)}
      onRename={(nickname) => rename(selected.id, nickname)}
      onRelease={() => { setError(null); setConfirm("release"); }}
      onEvolveNow={() => evolveNow(selected)}
    />
  );

  const confirmCopy = {
    tradeup: { heading: t.tradeUpConfirmHeading, body: t.tradeUpConfirmBody, cta: t.tradeUpConfirmConfirm, busy: t.tradeUpConfirmConfirming },
    evolve: { heading: t.evolveConfirmHeading, body: t.evolveConfirmBody, cta: t.evolveConfirmConfirm, busy: t.evolveConfirmConfirming },
    release: { heading: t.releaseConfirmHeading, body: selected ? t.releaseConfirmBody(displayName(selected)) : "", cta: t.release, busy: t.releasing },
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.shell.groups.collection}</span>
          <h1>
            {t.heading} <span className="faint mono" style={{ fontSize: 18 }}>{t.showingCount(filtered.length, pokemon.length)}</span>
          </h1>
        </div>
        <div className="page-head-actions">
          <div className="seg" role="group">
            <button type="button" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} aria-label={common.viewToggle.grid}>
              <Icon name="grid" size={16} />
            </button>
            <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} aria-label={common.viewToggle.list}>
              <Icon name="list" size={16} />
            </button>
          </div>
          <button type="button" className={selecting ? "btn-primary" : "btn-secondary"} aria-pressed={selecting} onClick={toggleSelecting}>
            <Icon name={selecting ? "check" : "grid"} size={16} /> {selecting ? t.doneSelecting : t.select}
          </button>
        </div>
      </div>
      <SectionTabs section="collection" />

      {caseCount > 0 && (
        <div className="cases-banner">
          <Icon name="case" />
          <span>{t.casesBanner(caseCount)}</span>
          <Link href="/open" className="btn-primary btn-sm">{t.casesBannerCta}</Link>
        </div>
      )}

      <PokemonFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        typesList={typesList}
      />

      {error && !confirm && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="collection-layout">
        <div className={viewMode === "grid" ? "pgrid" : "plist panel panel-flush"}>
          {filtered.length === 0 && <p className="empty">{t.noMatches}</p>}
          {filtered.map((p) => (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant={viewMode}
              selectable={selecting}
              selected={selecting ? picked.includes(p.id) : p.id === selectedId && wide}
              onSelect={() => onCardClick(p)}
              disabled={selecting && p.isStarter}
              disabledReason={selecting && p.isStarter ? t.startersCantTradeUp : undefined}
            />
          ))}
        </div>

        {wide && <aside className="panel collection-detail">{detail ?? <p className="empty">{t.detailEmpty}</p>}</aside>}
      </div>

      {selecting && (
        <div className="action-bar" role="region" aria-label={t.selectedN(picked.length)}>
          <b className="mono">{t.selectedN(picked.length)}</b>
          <span className="action-bar-hint">{hint}</span>
          <div className="action-bar-buttons">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPicked([])} disabled={picked.length === 0}>{t.clearSelection}</button>
            <button type="button" className="btn-secondary btn-sm" disabled={!canTradeUp} onClick={() => { setError(null); setConfirm("tradeup"); }}>
              <Icon name="flame" size={14} /> {t.tradeUpButton}
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={!canEvolve} onClick={() => { setError(null); setConfirm("evolve"); }}>
              <Icon name="evolve" size={14} /> {t.evolveButton}
            </button>
          </div>
        </div>
      )}

      {!wide && detailOpen && selected && !selecting && (
        <Modal onClose={() => setDetailOpen(false)} size="lg">
          {detail}
        </Modal>
      )}

      {confirm && (
        <Modal onClose={() => (submitting ? null : setConfirm(null))}>
          <h2>{confirmCopy[confirm].heading}</h2>
          <p className="muted">{confirmCopy[confirm].body}</p>
          {confirm !== "release" && (
            <ul className="confirm-list">
              {pickedPokemon.map((p) => (
                <li key={p.id}>
                  <Sprite name={p.name} form="normal" className="" />
                  <span style={{ flex: 1 }}>{displayName(p)} <span className="faint mono">#{p.number}</span></span>
                  <span className="mono small muted">{p.total}</span>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn-ghost" disabled={submitting} onClick={() => setConfirm(null)}>{common.cancel}</button>
            <button type="button" className={confirm === "release" ? "btn-danger" : "btn-primary"} disabled={submitting} onClick={submit}>
              {submitting ? confirmCopy[confirm].busy : confirmCopy[confirm].cta}
            </button>
          </div>
        </Modal>
      )}

      {evolveReveal && <LootboxRevealDialog key={evolveReveal.id} pokemon={evolveReveal} variant="evolve" onClose={() => setEvolveReveal(null)} />}
    </div>
  );
}
