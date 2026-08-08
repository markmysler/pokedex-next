"use client";

import { useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";

const TEAM_SIZE = 3;

interface TeamPickerProps {
  inventory: OwnedPokemon[];
  onSubmit: (ids: string[]) => Promise<void>;
}

export default function TeamPicker({ inventory, onSubmit }: TeamPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TEAM_SIZE) return prev;
      return [...prev, id];
    });
  }

  async function submit() {
    if (selected.length !== TEAM_SIZE) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(selected);
    } catch {
      setError("⚠️ Couldn't lock in your team — try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="card team-picker">
      <h3>🎯 Pick Your Team ({selected.length}/{TEAM_SIZE})</h3>
      <p className="online-status">Choose 3 Pokémon. Your opponent won&apos;t see your picks until you both lock in.</p>

      <div className="pokemon-grid team-picker-grid">
        {inventory.map((p) => {
          const isSelected = selected.includes(p.id);
          const pickIndex = selected.indexOf(p.id);
          return (
            <div
              key={p.id}
              className={`pokemon-grid-card${isSelected ? " selected" : ""}`}
              onClick={() => !submitting && toggle(p.id)}
            >
              {isSelected && <div className="team-picker-order">#{pickIndex + 1}</div>}
              <Sprite name={p.name} form="normal" className="grid-card-sprite" />
              <div className="grid-card-name">#{p.number} {p.name}</div>
              <TypeBadges type1={p.type1} type2={p.type2} center small />
              <div className="grid-card-total">Total {p.total}</div>
            </div>
          );
        })}
      </div>

      {inventory.length === 0 && <p>You don&apos;t own any Pokémon yet.</p>}

      <div className="online-status">{error}</div>
      <button className="btn-primary" disabled={selected.length !== TEAM_SIZE || submitting} onClick={submit}>
        {submitting ? "Locking in..." : `Lock In Team (${selected.length}/${TEAM_SIZE})`}
      </button>
    </div>
  );
}
