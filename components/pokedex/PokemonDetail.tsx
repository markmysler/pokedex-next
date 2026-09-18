"use client";

import { useState } from "react";
import type { Pokemon, UserPokedexEntry } from "@/types/pokemon";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import CardTab from "@/components/ui/CardTab";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

interface PokemonDetailProps {
  pokemon: Pokemon;
  entry: UserPokedexEntry;
  onNotesChange: (notes: string) => void;
  dict: Dictionary;
}

// The parent mounts this with key={pokemon.number}, so `entry` is always
// up to date on mount — no effect needed to resync notesDraft afterwards.
export default function PokemonDetail({ pokemon, entry, onNotesChange, dict }: PokemonDetailProps) {
  const t = dict.collection.pokedex.detail;
  const stats = dict.common.stats;
  const STAT_INFO: Array<{ label: string; key: keyof Pokemon; color: string }> = [
    { label: stats.hp, key: "hp", color: "#FF5959" },
    { label: stats.atk, key: "atk", color: "#F5AC78" },
    { label: stats.def, key: "def", color: "#FAE078" },
    { label: stats.spatk, key: "spatk", color: "#9DB7F5" },
    { label: stats.spdef, key: "spdef", color: "#A7DB8D" },
    { label: stats.spd, key: "spd", color: "#FA92B2" },
  ];
  const [notesDraft, setNotesDraft] = useState(entry.notes);
  const [saved, setSaved] = useState(false);
  const debouncedSave = useDebouncedCallback((notes: string) => {
    onNotesChange(notes);
    setSaved(true);
  }, 400);

  const spriteBase = pokemon.name.toLowerCase();

  return (
    <>
      <div className="card" id="card-header">
        <h2>#{pokemon.number} {pokemon.name}</h2>
        <TypeBadges type1={pokemon.type1} type2={pokemon.type2} />
        {/* Caught status is derived from owned pokemon_instances (see
            upgrades/02-collection-system.md) -- read-only here, not a
            manual toggle. Open lootboxes on the Inventory page to catch
            more. */}
        <span className={`caught-badge${entry.acquired ? " caught" : ""}`}>
          {entry.acquired ? t.caughtBadge : t.notCaughtBadge}
        </span>
      </div>

      <div className="card sprites-card">
        <div className="sprite-col">
          <span className="sprite-label">{t.normalForm}</span>
          <Sprite name={spriteBase} form="normal" className="sprite-img" />
        </div>
        <div className="sprite-col sprite-col-shiny">
          <span className="sprite-label shiny">{t.shinyForm}</span>
          <Sprite name={spriteBase} form="shiny" className="sprite-img" />
        </div>
      </div>

      <div className="card" id="card-stats">
        <CardTab icon="📊" label={t.baseStatsLabel} />
        {STAT_INFO.map(({ label, key, color }) => (
          <SegmentedMeter key={key} label={label} value={pokemon[key] as number} max={160} color={color} />
        ))}
        <div className="total-stats">{t.totalBaseStats(pokemon.total)}</div>
      </div>

      <div className="card" id="card-notes">
        <div className="notes-header">
          <CardTab icon="📝" label={t.trainerNotes} />
          <span className="notes-status">{saved ? t.saved : ""}</span>
        </div>
        <textarea
          id="notes-box"
          rows={4}
          value={notesDraft}
          onChange={(e) => {
            setNotesDraft(e.target.value);
            setSaved(false);
            debouncedSave(e.target.value);
          }}
        />
      </div>
    </>
  );
}
