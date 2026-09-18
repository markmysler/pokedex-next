"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import Modal from "@/components/ui/Modal";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import { isShinyInstance } from "@/lib/shiny";
import { movePower } from "@/lib/pokemonDisplay";
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
  // Evolution reuses this same drumroll -> sprite -> stats -> moves pacing
  // rather than inventing new reveal choreography (upgrades/51-evolution-
  // api-and-inventory-ui.md) -- only the drumroll copy differs, since
  // "Opening lootbox..." doesn't fit a result that came from evolving 5
  // Pokemon rather than opening a box. InventoryPageClient (upgrades/55-
  // i18n-collection-cluster.md) always passes an already-translated string
  // here; BattleArena.tsx/OnlineBattle.tsx's own lootbox-reveal call sites
  // (Battle cluster, step 56) don't yet and fall back to the English
  // default below, same "optional dict, English fallback" shape as
  // PokemonFilterBar's.
  drumrollIcon?: string;
  drumrollText?: string;
  dict?: LootboxRevealDict;
}

// Narrow slice of Dictionary rather than the whole thing -- this component
// only ever needs these 5 pieces, so a caller that hasn't been translated
// yet (Battle cluster, step 56) can omit `dict` entirely instead of having
// to assemble a full Dictionary-shaped fallback.
interface LootboxRevealDict {
  stats: Dictionary["common"]["stats"];
  shinyBadge: Dictionary["common"]["shinyBadge"];
  movesLabel: Dictionary["collection"]["movesLabel"];
  totalLabel: Dictionary["collection"]["totalLabel"];
  moveLine: Dictionary["collection"]["moveLine"];
  lootboxReveal: Dictionary["collection"]["lootboxReveal"];
}

const FALLBACK_DICT: LootboxRevealDict = {
  stats: { hp: "HP", atk: "Attack", def: "Defense", spatk: "Sp. Atk", spdef: "Sp. Def", spd: "Speed" },
  shinyBadge: "✨ Shiny",
  movesLabel: "Moves",
  totalLabel: (total) => `Total: ${total}`,
  moveLine: (name, type, power, maxUses) =>
    `${name} — ${type}, ${power !== null ? `${power} Pwr, ` : ""}${maxUses === null ? "unlimited" : maxUses} uses`,
  lootboxReveal: { openingLootboxText: "Opening lootbox...", evolvingText: "Evolving...", next: "➡️ Next", continueLabel: "✅ Continue", skip: "Skip" },
};

type Phase = "drumroll" | "sprite" | "stats" | "moves" | "done";

const DRUMROLL_MS = 1200;
const STAT_STEP_MS = 375;
const MOVE_STEP_MS = 300;

export default function LootboxRevealDialog({
  pokemon,
  onClose,
  hasNext,
  drumrollIcon = "📦",
  drumrollText = FALLBACK_DICT.lootboxReveal.openingLootboxText,
  dict = FALLBACK_DICT,
}: LootboxRevealDialogProps) {
  const stats = dict.stats;
  const STAT_INFO: Array<{ label: string; key: "hp" | "atk" | "def" | "spatk" | "spdef" | "spd"; color: string }> = [
    { label: stats.hp, key: "hp", color: "#FF5959" },
    { label: stats.atk, key: "atk", color: "#F5AC78" },
    { label: stats.def, key: "def", color: "#FAE078" },
    { label: stats.spatk, key: "spatk", color: "#9DB7F5" },
    { label: stats.spdef, key: "spdef", color: "#A7DB8D" },
    { label: stats.spd, key: "spd", color: "#FA92B2" },
  ];
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
  }, [phase, statsRevealed, STAT_INFO.length]);

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
            <div className="lootbox-drumroll-icon">{drumrollIcon}</div>
            <p>{drumrollText}</p>
          </div>
        )}

        <div className={`lootbox-reveal-content${phase !== "drumroll" ? " revealed" : ""}${shiny ? " lootbox-reveal-shiny" : ""}`}>
          <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="lootbox-reveal-sprite" />
          <h2>#{pokemon.number} {pokemon.name}</h2>
          <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center />
          {shiny && <span className="shiny-badge">{dict.shinyBadge}</span>}

          <div className="lootbox-stats">
            {STAT_INFO.map(({ label, key, color }, i) => {
              const revealed = fullyRevealed || i < statsRevealed;
              return (
                <SegmentedMeter key={key} label={label} value={pokemon[key]} max={160} color={color} revealed={revealed} />
              );
            })}
            {fullyRevealed && <div className="total-stats">{dict.totalLabel(pokemon.total)}</div>}
          </div>

          {(phase === "moves" || fullyRevealed) && (
            <div className="lootbox-moves">
              <h3>⚔️ {dict.movesLabel}</h3>
              <ul className="move-list">
                {pokemon.moves.map((m, i) => (
                  <li key={m.name} className={fullyRevealed || i < movesRevealed ? "move-revealed" : undefined}>
                    {dict.moveLine(m.name, m.type, movePower(m), m.max_uses)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lootbox-reveal-actions">
          {fullyRevealed ? (
            <button className="btn-primary" onClick={onClose}>{hasNext ? dict.lootboxReveal.next : dict.lootboxReveal.continueLabel}</button>
          ) : (
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); skip(); }}>{dict.lootboxReveal.skip}</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
