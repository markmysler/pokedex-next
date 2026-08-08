"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import Modal from "@/components/ui/Modal";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { isShinyInstance } from "@/lib/shiny";
import { playLootboxDrumrollSound, playLootboxRevealSound } from "@/lib/sound";

interface LootboxRevealDialogProps {
  // The already-rolled, already-persisted result — see
  // upgrades/04-lootbox-opening.md: this component never calls the open
  // endpoint itself, only reveals a result the caller already fetched. The
  // suspense below is a fixed client-side delay, not a loading state.
  pokemon: OwnedPokemon;
  onClose: () => void;
  // Batch reveals only (upgrades/15-lootbox-batch-opening.md) -- when true,
  // the terminal button reads "Next" instead of "Continue," but still calls
  // the same onClose; the parent (InventoryPageClient) decides what "close"
  // means (advance the queue vs. actually closing the dialog).
  hasNext?: boolean;
}

type Phase = "drumroll" | "sprite" | "stats" | "moves" | "done";

const DRUMROLL_MS = 1200;
const STAT_STEP_MS = 375;
const MOVE_STEP_MS = 300;

const STAT_INFO: Array<{ label: string; key: "hp" | "atk" | "def" | "spatk" | "spdef" | "spd"; color: string }> = [
  { label: "HP", key: "hp", color: "#FF5959" },
  { label: "Attack", key: "atk", color: "#F5AC78" },
  { label: "Defense", key: "def", color: "#FAE078" },
  { label: "Sp. Atk", key: "spatk", color: "#9DB7F5" },
  { label: "Sp. Def", key: "spdef", color: "#A7DB8D" },
  { label: "Speed", key: "spd", color: "#FA92B2" },
];

export default function LootboxRevealDialog({ pokemon, onClose, hasNext }: LootboxRevealDialogProps) {
  const [phase, setPhase] = useState<Phase>("drumroll");
  const [statsRevealed, setStatsRevealed] = useState(0);
  const [movesRevealed, setMovesRevealed] = useState(0);
  const shiny = isShinyInstance(pokemon);
  // Guards against playing the reveal chime twice -- the "sprite" phase
  // effect below normally plays it, but skip() can jump straight from
  // "drumroll" to "done" without ever passing through "sprite".
  const revealSoundPlayedRef = useRef(false);

  // Fires once on mount -- phase starts as "drumroll", so this is "entering
  // the drumroll phase" (upgrades/11-sound-effects.md).
  useEffect(() => {
    playLootboxDrumrollSound();
  }, []);

  useEffect(() => {
    if (phase !== "drumroll") return;
    const timer = setTimeout(() => setPhase("sprite"), DRUMROLL_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "sprite") return;
    if (!revealSoundPlayedRef.current) {
      revealSoundPlayedRef.current = true;
      playLootboxRevealSound(shiny);
    }
    const timer = setTimeout(() => setPhase("stats"), STAT_STEP_MS);
    return () => clearTimeout(timer);
  }, [phase, shiny]);

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

  // Reveals one move at a time (fade/slide-in, see .lootbox-moves li in
  // globals.css), same staggered-reveal shape as the stat bars above,
  // rather than dumping all 4 in at once.
  useEffect(() => {
    if (phase !== "moves") return;
    if (movesRevealed >= pokemon.moves.length) {
      const timer = setTimeout(() => setPhase("done"), MOVE_STEP_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setMovesRevealed((n) => n + 1), MOVE_STEP_MS);
    return () => clearTimeout(timer);
  }, [phase, movesRevealed, pokemon.moves.length]);

  function skip() {
    if (!revealSoundPlayedRef.current) {
      revealSoundPlayedRef.current = true;
      playLootboxRevealSound(shiny);
    }
    setPhase("done");
    setStatsRevealed(STAT_INFO.length);
    setMovesRevealed(pokemon.moves.length);
  }

  const fullyRevealed = phase === "done";

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

          {(phase === "moves" || fullyRevealed) && (
            <div className="lootbox-moves">
              <h3>⚔️ Moves</h3>
              <ul className="move-list">
                {pokemon.moves.map((m, i) => (
                  <li key={m.name} className={fullyRevealed || i < movesRevealed ? "move-revealed" : undefined}>
                    {m.name} — {m.type}, {m.power} Pwr, {m.mana_cost} MP
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lootbox-reveal-actions">
          {fullyRevealed ? (
            <button className="btn-primary" onClick={onClose}>{hasNext ? "➡️ Next" : "✅ Continue"}</button>
          ) : (
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); skip(); }}>Skip</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
