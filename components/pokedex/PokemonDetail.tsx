"use client";

import { useState } from "react";
import type { Pokemon, UserPokedexEntry } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
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
  onToggleAcquired: (acquired: boolean) => void;
  onNotesChange: (notes: string) => void;
}

// The parent (PokedexApp) mounts this with key={pokemon.number} and only
// once the initial user-data fetch has settled, so `entry` is always
// up to date on mount — no effect needed to resync notesDraft afterwards.
export default function PokemonDetail({ pokemon, entry, onToggleAcquired, onNotesChange }: PokemonDetailProps) {
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
        <label className="switch-labeled">
          <input
            type="checkbox"
            checked={entry.acquired}
            onChange={(e) => onToggleAcquired(e.target.checked)}
          />
          <span className="slider" />
          <span>Mark as Acquired (Caught)</span>
        </label>
      </div>

      <div className="card sprites-card">
        <div className="sprite-col">
          <span className="sprite-label">Normal Form</span>
          <Sprite name={spriteBase} form="normal" className="sprite-img" />
        </div>
        <div className="sprite-col">
          <span className="sprite-label shiny">✨ Shiny Form</span>
          <Sprite name={spriteBase} form="shiny" className="sprite-img" />
        </div>
      </div>

      <div className="card" id="card-stats">
        <h3>📊 Base Stats</h3>
        {STAT_INFO.map(({ label, key, color }) => {
          const value = pokemon[key] as number;
          return (
            <div className="stat-row" key={key}>
              <span className="stat-name">{label}:</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${Math.min(100, (value / 160) * 100)}%`, background: color }}
                />
              </div>
              <span className="stat-value">{value}</span>
            </div>
          );
        })}
        <div className="total-stats">Total Base Stats: {pokemon.total}</div>
      </div>

      <div className="card" id="card-notes">
        <div className="notes-header">
          <h3>📝 Personal Trainer Notes</h3>
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
