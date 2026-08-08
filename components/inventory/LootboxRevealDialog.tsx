"use client";

import { useEffect, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import Modal from "@/components/ui/Modal";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { isShinyInstance } from "@/lib/shiny";

interface LootboxRevealDialogProps {
  // The already-rolled, already-persisted result — see
  // upgrades/04-lootbox-opening.md: this component never calls the open
  // endpoint itself, only reveals a result the caller already fetched. The
  // suspense below is a fixed client-side delay, not a loading state.
  pokemon: OwnedPokemon;
  onClose: () => void;
}

type Phase = "drumroll" | "sprite" | "stats" | "moves";

const DRUMROLL_MS = 1200;
const STAT_STEP_MS = 375;

const STAT_INFO: Array<{ label: string; key: "hp" | "atk" | "def" | "spatk" | "spdef" | "spd"; color: string }> = [
  { label: "HP", key: "hp", color: "#FF5959" },
  { label: "Attack", key: "atk", color: "#F5AC78" },
  { label: "Defense", key: "def", color: "#FAE078" },
  { label: "Sp. Atk", key: "spatk", color: "#9DB7F5" },
  { label: "Sp. Def", key: "spdef", color: "#A7DB8D" },
  { label: "Speed", key: "spd", color: "#FA92B2" },
];

export default function LootboxRevealDialog({ pokemon, onClose }: LootboxRevealDialogProps) {
  const [phase, setPhase] = useState<Phase>("drumroll");
  const [statsRevealed, setStatsRevealed] = useState(0);
  const shiny = isShinyInstance(pokemon);

  useEffect(() => {
    if (phase !== "drumroll") return;
    const timer = setTimeout(() => setPhase("sprite"), DRUMROLL_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "sprite") return;
    const timer = setTimeout(() => setPhase("stats"), STAT_STEP_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // Reveals one stat bar at a time, roughly i * 350-400ms apart, then hands
  // off to the moves phase once the last bar has had time to finish filling.
  useEffect(() => {
    if (phase !== "stats") return;
    if (statsRevealed >= STAT_INFO.length) {
      const timer = setTimeout(() => setPhase("moves"), STAT_STEP_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStatsRevealed((n) => n + 1), STAT_STEP_MS);
    return () => clearTimeout(timer);
  }, [phase, statsRevealed]);

  function skip() {
    setPhase("moves");
    setStatsRevealed(STAT_INFO.length);
  }

  const fullyRevealed = phase === "moves";

  return (
    <Modal onClose={onClose} large>
      {/* Tap anywhere in the dialog (but not the ✕) to skip the animation —
          only wired while it's still playing, so it doesn't swallow clicks
          on "Continue" once everything is already shown. */}
      <div className="lootbox-reveal" onClick={fullyRevealed ? undefined : skip}>
        {phase === "drumroll" && (
          <div className="lootbox-drumroll">
            <div className="lootbox-drumroll-icon">📦</div>
            <p>Opening lootbox...</p>
          </div>
        )}

        <div className={`lootbox-reveal-content${phase !== "drumroll" ? " revealed" : ""}`}>
          <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="lootbox-reveal-sprite" />
          <h2>#{pokemon.number} {pokemon.name}</h2>
          <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center />
          {shiny && <span className="shiny-badge">✨ Shiny</span>}

          <div className="lootbox-stats">
            {STAT_INFO.map(({ label, key, color }, i) => {
              const revealed = fullyRevealed || i < statsRevealed;
              return (
                <div className="stat-row" key={key}>
                  <span className="stat-name">{label}:</span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{ width: revealed ? `${Math.min(100, (pokemon[key] / 160) * 100)}%` : "0%", background: color }}
                    />
                  </div>
                  <span className="stat-value">{revealed ? pokemon[key] : ""}</span>
                </div>
              );
            })}
            {fullyRevealed && <div className="total-stats">Total: {pokemon.total}</div>}
          </div>

          {fullyRevealed && (
            <div className="lootbox-moves">
              <h3>⚔️ Moves</h3>
              <ul className="move-list">
                {pokemon.moves.map((m) => (
                  <li key={m.name}>{m.name} — {m.type}, {m.power} Pwr, {m.mana_cost} MP</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lootbox-reveal-actions">
          {fullyRevealed ? (
            <button className="btn-primary" onClick={onClose}>Continue</button>
          ) : (
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); skip(); }}>Skip</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
