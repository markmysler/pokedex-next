"use client";

import { useMemo, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import PokemonInstanceCard from "@/components/inventory/PokemonInstanceCard";
import PokemonFilterBar from "@/components/pokemon/PokemonFilterBar";
import Sprite from "@/components/Sprite";
import Icon from "@/components/ui/Icon";
import { filterAndSortPokemon, type SortKey } from "@/lib/pokemonFilters";
import { instanceRarity } from "@/lib/rarity";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";
import { useDictionary } from "@/lib/i18n/useDictionary";

const TEAM_SIZE = 3;

interface TeamPickerProps {
  inventory: OwnedPokemon[];
  typesList: string[];
  onSubmit: (ids: string[]) => Promise<void>;
}

// Team selection for bot and online battles (redesign wave v9): the three
// slots sit in a tray pinned to the top of the screen with Lock in always
// in reach, instead of a counter under a long grid.
export default function TeamPicker({ inventory, typesList, onSubmit }: TeamPickerProps) {
  const dict = useDictionary();
  const t = dict.battle.teamPicker;
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortBy, setSortBy] = useState<SortKey>("total-desc");

  const filtered = useMemo(() => filterAndSortPokemon(inventory, { search, typeFilter, sortBy }), [inventory, search, typeFilter, sortBy]);
  const picked = selected.map((id) => inventory.find((p) => p.id === id)).filter((p): p is OwnedPokemon => Boolean(p));

  function toggle(id: string) {
    if (submitting) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= TEAM_SIZE ? prev : [...prev, id]));
  }

  function pickBest() {
    if (submitting) return;
    setSelected([...inventory].sort((a, b) => b.total - a.total).slice(0, TEAM_SIZE).map((p) => p.id));
  }

  async function submit() {
    if (selected.length !== TEAM_SIZE) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(selected);
    } catch {
      setError(t.lockInError);
      setSubmitting(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="team-tray">
        <div className="team-slots">
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const p = picked[i];
            if (!p) {
              return (
                <div key={i} className="team-slot is-empty">
                  <span className="mono small faint">{t.slot(i + 1)}</span>
                </div>
              );
            }
            return (
              <button key={p.id} type="button" className={`team-slot rarity-${instanceRarity(p)}`} onClick={() => toggle(p.id)} aria-label={t.removeFromTeam(displayName(p))}>
                <Sprite name={p.name} form={isShinyInstance(p) ? "shiny" : "normal"} className="team-slot-sprite" />
                <span className="team-slot-name">{displayName(p)}</span>
                <Icon name="close" size={14} className="team-slot-x" />
              </button>
            );
          })}
        </div>
        <div className="team-tray-text">
          <b>{t.pickYourTeam(selected.length, TEAM_SIZE)}</b>
          <span className="small muted">{t.chooseHint}</span>
          {error && <span className="small" style={{ color: "var(--bad)" }} role="alert">{error}</span>}
        </div>
        <div className="team-tray-actions">
          <button type="button" className="btn-secondary" onClick={pickBest} disabled={submitting}>
            <Icon name="zap" size={16} /> {t.bestThree}
          </button>
          <button type="button" className="btn-primary" disabled={selected.length !== TEAM_SIZE || submitting} onClick={submit}>
            <Icon name="lock" size={16} /> {submitting ? t.lockingIn : t.lockInTeam}
          </button>
        </div>
      </div>

      <PokemonFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        typesList={typesList}
      />

      <div className="pgrid">
        {filtered.map((p) => {
          const index = selected.indexOf(p.id);
          return (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant="grid"
              selected={index !== -1}
              onSelect={() => toggle(p.id)}
              pickOrder={index !== -1 ? index + 1 : undefined}
            />
          );
        })}
      </div>

      {inventory.length === 0 && <p className="empty">{t.noPokemon}</p>}
      {inventory.length > 0 && filtered.length === 0 && <p className="empty">{t.noMatches}</p>}
    </div>
  );
}
