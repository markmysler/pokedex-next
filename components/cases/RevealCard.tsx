"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { instanceRarity, speciesGrade } from "@/lib/rarity";
import { displayName, movePower } from "@/lib/pokemonDisplay";
import { STAT_COLORS, STAT_KEYS } from "@/lib/statDisplay";

const STEP_MS = 140;

interface RevealCardProps {
  pokemon: OwnedPokemon;
  // Skip the staggered fill-in (summary details, reduced motion).
  instant?: boolean;
  eyebrow?: string;
  children?: ReactNode;
}

// The landed result (redesign wave v9): grade, sprite and types first, then
// the six rolled stats and four moves fill in one after another -- the same
// pacing the old reveal dialog used, now on a card glowing in the grade's
// colour instead of a separate modal.
export default function RevealCard({ pokemon, instant = false, eyebrow, children }: RevealCardProps) {
  const dict = useDictionary();
  const c = dict.collection;
  const rarity = instanceRarity(pokemon);
  const shiny = rarity === "shiny";
  const total = STAT_KEYS.length + pokemon.moves.length;
  const [shown, setShown] = useState(instant ? total : 0);

  useEffect(() => {
    if (shown >= total) return;
    const timer = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 260 : STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, total]);

  const statsShown = Math.min(shown, STAT_KEYS.length);
  const movesShown = Math.max(0, shown - STAT_KEYS.length);

  return (
    <article className={`reveal rarity-${rarity}${instant ? "" : " is-animated"}`}>
      <div className="reveal-hero">
        <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="reveal-sprite" eager />
      </div>
      <div className="reveal-body">
        <div className="stack" style={{ gap: 6 }}>
          <span className="grade-label">
            {eyebrow ? `${eyebrow} · ` : ""}
            {shiny ? `★ ${c.rarity.shiny} · ${c.rarity[speciesGrade(pokemon.number)]}` : c.rarity[rarity]}
          </span>
          <h2 className="reveal-name">
            {displayName(pokemon)} <span className="faint mono">#{pokemon.number}</span>
          </h2>
          <div className="row">
            <TypeBadges type1={pokemon.type1} type2={pokemon.type2} />
            <span className="tag">{c.totalLabel(pokemon.total)}</span>
          </div>
        </div>
        <div className="reveal-stats">
          {STAT_KEYS.map((key, i) => (
            <SegmentedMeter key={key} label={dict.common.stats[key]} value={pokemon[key]} max={160} color={STAT_COLORS[key]} segments={12} revealed={i < statsShown} />
          ))}
        </div>
        <ul className="move-chips">
          {pokemon.moves.map((m, i) => (
            <li key={m.name} className={i < movesShown ? "is-in" : undefined}>
              {c.moveLine(m.name, m.type, movePower(m), m.max_uses)}
            </li>
          ))}
        </ul>
        {children && <div className="row reveal-actions">{children}</div>}
      </div>
    </article>
  );
}
