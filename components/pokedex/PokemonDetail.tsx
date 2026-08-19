"use client";

import { useState } from "react";
import type { Pokemon, UserPokedexEntry } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import CardTab from "@/components/ui/CardTab";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

const STAT_INFO: Array<{ label: string; key: keyof Pokemon; color: string }> = [
  { label: "HP", key: "hp", color: "#FF5959" },
  { label: "Attack", key: "atk", color: "#F5AC78" },
  { label: "Defense", key: "def", color: "#FAE078" },
  { label: "Sp. Atk", key: "spatk", color: "#9DB7F5" },
  { label: "Sp. Def", key: "spdef", color: "#A7DB8D" },
  { label: "Speed", key: "spd", color: "#FA92B2" },
];

interface PokemonDetailProps {
  pokemon: Pokemon;
  entry: UserPokedexEntry;
  onNotesChange: (notes: string) => void;
}

// The parent mounts this with key={pokemon.number}, so `entry` is always
// up to date on mount — no effect needed to resync notesDraft afterwards.
export default function PokemonDetail({ pokemon, entry, onNotesChange }: PokemonDetailProps) {
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
          {entry.acquired ? "✅ Caught" : "⚪ Not caught yet"}
        </span>
      </div>

      <div className="card sprites-card">
        <div className="sprite-col">
          <span className="sprite-label">Normal Form</span>
          <Sprite name={spriteBase} form="normal" className="sprite-img" />
        </div>
        <div className="sprite-col sprite-col-shiny">
          <span className="sprite-label shiny">✨ Shiny Form</span>
          <Sprite name={spriteBase} form="shiny" className="sprite-img" />
        </div>
      </div>

      <div className="card" id="card-stats">
        <CardTab icon="📊" label="Base stats" />
        {STAT_INFO.map(({ label, key, color }) => (
          <SegmentedMeter key={key} label={label} value={pokemon[key] as number} max={160} color={color} />
        ))}
        <div className="total-stats">Total Base Stats: {pokemon.total}</div>
      </div>

      <div className="card" id="card-notes">
        <div className="notes-header">
          <CardTab icon="📝" label="Trainer notes" />
          <span className="notes-status">{saved ? "Saved ✓" : ""}</span>
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
