"use client";

import { useState } from "react";
import type { Pokemon, UserPokedexEntry } from "@/types/pokemon";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { getPokemon } from "@/lib/pokedex";
import { speciesGrade } from "@/lib/rarity";
import { STAT_COLORS, STAT_KEYS } from "@/lib/statDisplay";

interface PokemonDetailProps {
  pokemon: Pokemon;
  entry: UserPokedexEntry;
  onNotesChange: (notes: string) => void;
  dict: Dictionary;
}

// A species' Pokédex entry (redesign wave v9): grade, both sprite forms,
// base stats, what it evolves into and the trainer's own notes.
export default function PokemonDetail({ pokemon, entry, onNotesChange, dict }: PokemonDetailProps) {
  const t = dict.collection.pokedex.detail;
  const grade = speciesGrade(pokemon.number);
  const [notesDraft, setNotesDraft] = useState(entry.notes);
  const [saved, setSaved] = useState(false);
  const debouncedSave = useDebouncedCallback((notes: string) => {
    onNotesChange(notes);
    setSaved(true);
  }, 400);

  const evolvesInto = pokemon.evolvesInto;
  const evolutionNames = evolvesInto === null ? null : (Array.isArray(evolvesInto) ? evolvesInto : [evolvesInto]).map((n) => getPokemon(n)?.name ?? n).join(" / ");

  return (
    <div className={`dex-detail rarity-${grade}`}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="grade-label">{dict.collection.rarity[grade]} · #{pokemon.number}</span>
        <h2 className="owned-detail-name">{pokemon.name}</h2>
        <div className="row">
          <TypeBadges type1={pokemon.type1} type2={pokemon.type2} />
          {/* Caught status is derived from owned pokemon_instances
              (upgrades/02-collection-system.md), so it's read-only here. */}
          <span className={`tag ${entry.acquired ? "tag-good" : ""}`}>{entry.acquired ? t.caughtBadge : t.notCaughtBadge}</span>
        </div>
        {!entry.acquired && <p className="muted small">{t.notCaughtHint}</p>}
      </div>

      <div className="dex-forms">
        <figure>
          <Sprite name={pokemon.name} form="normal" className="dex-form-sprite" />
          <figcaption>{t.normalForm}</figcaption>
        </figure>
        <figure className="is-shiny">
          <Sprite name={pokemon.name} form="shiny" className="dex-form-sprite" />
          <figcaption>★ {t.shinyForm}</figcaption>
        </figure>
      </div>

      <section className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 className="eyebrow">{t.baseStatsLabel}</h3>
          <span className="mono small muted">{t.totalBaseStats(pokemon.total)}</span>
        </div>
        {STAT_KEYS.map((key) => (
          <SegmentedMeter key={key} label={dict.common.stats[key]} value={pokemon[key]} max={160} color={STAT_COLORS[key]} segments={12} />
        ))}
      </section>

      <p className="muted small">{evolutionNames ? t.evolvesInto(evolutionNames) : t.finalForm}</p>

      <label className="field">
        <span className="row" style={{ justifyContent: "space-between" }}>
          {t.trainerNotes}
          <span className="faint small" aria-live="polite">{saved ? t.saved : ""}</span>
        </span>
        <textarea
          rows={3}
          value={notesDraft}
          placeholder={t.notesPlaceholder}
          onChange={(e) => {
            setNotesDraft(e.target.value);
            setSaved(false);
            debouncedSave(e.target.value);
          }}
        />
      </label>
    </div>
  );
}
