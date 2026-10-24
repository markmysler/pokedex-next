"use client";

import { useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import Icon from "@/components/ui/Icon";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { instanceRarity, speciesGrade } from "@/lib/rarity";
import { getPokemon } from "@/lib/pokedex";
import { displayName, movePower } from "@/lib/pokemonDisplay";
import { STAT_COLORS, STAT_KEYS } from "@/lib/statDisplay";

export const EVOLVE_COUNT = 5;

interface OwnedPokemonDetailProps {
  pokemon: OwnedPokemon;
  // Non-starter copies of this species the player owns, this one included.
  sameSpeciesCount: number;
  onRename: (nickname: string) => Promise<string | null>;
  onRelease: () => void;
  onEvolveNow: () => void;
}

// The selected Pokémon in My Pokémon (redesign wave v9): who it is, its
// rolled stats and moves, and how close its species is to evolving --
// evolution used to be a hidden mode; now it's suggested right here.
export default function OwnedPokemonDetail({ pokemon, sameSpeciesCount, onRename, onRelease, onEvolveNow }: OwnedPokemonDetailProps) {
  const dict = useDictionary();
  const t = dict.collection.inventory;
  const c = dict.collection;
  const rarity = instanceRarity(pokemon);
  const shiny = rarity === "shiny";
  const species = getPokemon(pokemon.number);
  const evolvesInto = species?.evolvesInto ?? null;
  const targetNames = evolvesInto === null ? "" : (Array.isArray(evolvesInto) ? evolvesInto : [evolvesInto]).map((n) => getPokemon(n)?.name ?? n).join(" / ");

  const [renaming, setRenaming] = useState(false);
  const [nickname, setNickname] = useState(pokemon.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function saveRename(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setRenameError(null);
    const error = await onRename(nickname);
    setSaving(false);
    if (error) return setRenameError(error);
    setRenaming(false);
  }

  return (
    <div className={`owned-detail rarity-${rarity}`}>
      <div className="owned-detail-hero">
        <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="owned-detail-sprite" />
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <span className="grade-label">
          {shiny ? `★ ${c.rarity.shiny} · ${c.rarity[speciesGrade(pokemon.number)]}` : c.rarity[rarity]} · #{pokemon.number}
        </span>
        {renaming ? (
          <form className="row" onSubmit={saveRename}>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} placeholder={pokemon.name} autoFocus style={{ flex: 1, minWidth: 0 }} aria-label={t.renameBtn} />
            <button className="btn-primary btn-sm" type="submit" disabled={saving}>{saving ? t.renameSaving : t.renameSave}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={() => setRenaming(false)}>{dict.common.cancel}</button>
          </form>
        ) : (
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <h2 className="owned-detail-name">{displayName(pokemon)}</h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setNickname(pokemon.nickname ?? ""); setRenaming(true); }}>
              <Icon name="pencil" size={14} /> {t.renameBtn}
            </button>
          </div>
        )}
        {renameError && <p className="alert alert-error">{renameError}</p>}
        {pokemon.nickname && !renaming && <span className="muted small">{pokemon.name}</span>}
        <div className="row">
          <TypeBadges type1={pokemon.type1} type2={pokemon.type2} />
          <span className="tag">{c.totalLabel(pokemon.total)}</span>
          {pokemon.isStarter && <span className="tag">{dict.common.starterBadge}</span>}
        </div>
      </div>

      <section className="stack" style={{ gap: 6 }}>
        <h3 className="eyebrow">{t.statsLabel}</h3>
        {STAT_KEYS.map((key) => (
          <SegmentedMeter key={key} label={dict.common.stats[key]} value={pokemon[key]} max={160} color={STAT_COLORS[key]} segments={12} />
        ))}
      </section>

      <section className="stack" style={{ gap: 6 }}>
        <h3 className="eyebrow">{c.movesLabel}</h3>
        <ul className="move-chips">
          {pokemon.moves.map((m) => (
            <li key={m.name} className="is-in">{c.moveLine(m.name, m.type, movePower(m), m.max_uses)}</li>
          ))}
        </ul>
      </section>

      {pokemon.isStarter ? (
        <p className="muted small">{t.starterNote}</p>
      ) : evolvesInto === null ? (
        <p className="muted small">{t.finalForm}</p>
      ) : (
        <section className="evolve-box">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{t.evolveProgress(Math.min(sameSpeciesCount, EVOLVE_COUNT), pokemon.name)}</b>
            <span className="muted small">{t.evolvesInto(targetNames)}</span>
          </div>
          <div className="evolve-pips" aria-hidden="true">
            {Array.from({ length: EVOLVE_COUNT }, (_, i) => <span key={i} className={i < sameSpeciesCount ? "on" : undefined} />)}
          </div>
          {sameSpeciesCount >= EVOLVE_COUNT ? (
            <>
              <button type="button" className="btn-primary btn-sm" onClick={onEvolveNow} style={{ justifySelf: "start" }}>
                <Icon name="evolve" size={16} /> {t.evolveNow}
              </button>
              <p className="faint small">{t.evolveStatsNote}</p>
            </>
          ) : (
            <p className="muted small">{t.evolveCollectMore(EVOLVE_COUNT - sameSpeciesCount)}</p>
          )}
        </section>
      )}

      {!pokemon.isStarter && (
        <button type="button" className="btn-danger btn-sm" style={{ justifySelf: "start" }} onClick={onRelease}>
          <Icon name="trash" size={14} /> {t.release}
        </button>
      )}
    </div>
  );
}
