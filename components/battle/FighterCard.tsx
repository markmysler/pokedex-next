"use client";

import type { OwnedPokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";
import { useDictionary } from "@/lib/i18n/useDictionary";
import type { Dictionary } from "@/lib/i18n/getDictionary";

// Same green->amber->red HP-percentage logic as before, just feeding
// SegmentedMeter's color prop with tokens instead of an inline hex style
// (upgrades/35-battle-shared-components-redesign.md).
function hpColor(pct: number): string {
  return pct > 0.5 ? "var(--good)" : pct > 0.2 ? "var(--warn)" : "var(--bad)";
}

interface TeamMemberDisplay {
  pokemon: OwnedPokemon;
  hp: number;
  maxHp: number;
  // Optional so this interface still structurally matches any older/simpler
  // caller — real FighterState objects (the only thing ever passed in
  // practice) always have these (upgrades/10-battle-depth.md).
  bleedTurns?: number;
  blindTurns?: number;
  poisonTurns?: number;
  burnTurns?: number;
  freezeTurns?: number;
  // Buff/debuff/shield/redirect (upgrades/28-move-ui-and-ally-targeting.md)
  // -- same "optional but always present on a real FighterState" story.
  atkMod?: number;
  atkModTurns?: number;
  defMod?: number;
  defModTurns?: number;
  shieldPoints?: number;
  redirectTurns?: number;
}

interface FighterCardProps {
  // A prefix ("You: ", "Opponent: ", or "") — the rest of the title is
  // derived from `pokemon` here (nickname if set, else species name), so
  // callers don't each need to know about displayName().
  title: string;
  pokemon: OwnedPokemon;
  hp: number;
  maxHp: number;
  bleedTurns?: number;
  blindTurns?: number;
  poisonTurns?: number;
  burnTurns?: number;
  freezeTurns?: number;
  atkMod?: number;
  atkModTurns?: number;
  defMod?: number;
  defModTurns?: number;
  shieldPoints?: number;
  redirectTurns?: number;
  movesCaption: string;
  children?: React.ReactNode;
  // 3v3 only (upgrades/05-3v3-battles.md) — the full 3-member team, so the
  // benched (non-active) members render below as switch targets. Undefined
  // for 1v1 local battles, which render exactly as before.
  team?: TeamMemberDisplay[];
  activeIndex?: number;
  onSwitchTo?: (teamIndex: number) => void;
}

// Small badge row shared by the active card and bench members
// (upgrades/10-battle-depth.md, extended by
// upgrades/19-burn-and-freeze-status-effects.md and, for atkMod/defMod/
// shieldPoints/redirectTurns, upgrades/28-move-ui-and-ally-targeting.md)
// — status persists on the bench, so both need to show it, just at
// different sizes.
function StatusBadges({
  bleedTurns,
  blindTurns,
  poisonTurns,
  burnTurns,
  freezeTurns,
  atkMod,
  atkModTurns,
  defMod,
  defModTurns,
  shieldPoints,
  redirectTurns,
  compact,
  dict,
}: {
  bleedTurns?: number;
  blindTurns?: number;
  poisonTurns?: number;
  burnTurns?: number;
  freezeTurns?: number;
  atkMod?: number;
  atkModTurns?: number;
  defMod?: number;
  defModTurns?: number;
  shieldPoints?: number;
  redirectTurns?: number;
  compact?: boolean;
  dict: Dictionary;
}) {
  const t = dict.battle.fighterCard;
  const hasAtkMod = Boolean(atkMod && atkMod !== 1);
  const hasDefMod = Boolean(defMod && defMod !== 1);
  const hasShield = Boolean(shieldPoints && shieldPoints > 0);
  const hasRedirect = Boolean(redirectTurns && redirectTurns > 0);
  if (!bleedTurns && !blindTurns && !poisonTurns && !burnTurns && !freezeTurns && !hasAtkMod && !hasDefMod && !hasShield && !hasRedirect) return null;

  const atkPct = atkMod ? Math.round((atkMod - 1) * 100) : 0;
  const defPct = defMod ? Math.round((defMod - 1) * 100) : 0;

  // <span>, not <div> -- this renders inside a bench <button> in compact
  // mode, and <div> isn't valid phrasing content inside a <button>.
  return (
    <span className={compact ? "status-badges compact" : "status-badges"}>
      {Boolean(bleedTurns) && <span className="status-badge bleed" title={t.statusTooltip.bleed}>🩸 {dict.battle.statusAdjective.bleed} ({bleedTurns})</span>}
      {Boolean(blindTurns) && <span className="status-badge blind" title={t.statusTooltip.blind}>🌀 {dict.battle.statusAdjective.blind} ({blindTurns})</span>}
      {Boolean(poisonTurns) && <span className="status-badge poison" title={t.statusTooltip.poison}>☠️ {dict.battle.statusAdjective.poison} ({poisonTurns})</span>}
      {Boolean(burnTurns) && <span className="status-badge burn" title={t.statusTooltip.burn}>🔥 {dict.battle.statusAdjective.burn} ({burnTurns})</span>}
      {Boolean(freezeTurns) && <span className="status-badge freeze" title={t.statusTooltip.freeze}>❄️ {dict.battle.statusAdjective.freeze} ({freezeTurns})</span>}
      {hasAtkMod && (
        <span className={`status-badge ${atkPct > 0 ? "buff" : "debuff"}`} title={t.atkModTooltip(atkMod ?? 1, atkPct, atkModTurns ?? 0)}>
          ⚔️ {dict.battle.moveEffect.statAbbrev.atk} {atkPct > 0 ? "+" : ""}{atkPct}% ({atkModTurns})
        </span>
      )}
      {hasDefMod && (
        <span className={`status-badge ${defPct > 0 ? "buff" : "debuff"}`} title={t.defModTooltip(defMod ?? 1, defPct, defModTurns ?? 0)}>
          🛡️ {dict.battle.moveEffect.statAbbrev.def} {defPct > 0 ? "+" : ""}{defPct}% ({defModTurns})
        </span>
      )}
      {hasShield && (
        <span className="status-badge shield" title={t.shieldTooltip(shieldPoints ?? 0)}>
          💠 {t.shieldLabel} ({shieldPoints})
        </span>
      )}
      {hasRedirect && (
        <span className="status-badge redirect" title={t.redirectTooltip(redirectTurns ?? 0)}>
          🌀 {t.confusedLabel} ({redirectTurns})
        </span>
      )}
    </span>
  );
}

export default function FighterCard({
  title,
  pokemon,
  hp,
  maxHp,
  bleedTurns,
  blindTurns,
  poisonTurns,
  burnTurns,
  freezeTurns,
  atkMod,
  atkModTurns,
  defMod,
  defModTurns,
  shieldPoints,
  redirectTurns,
  movesCaption,
  children,
  team,
  activeIndex,
  onSwitchTo,
}: FighterCardProps) {
  const dict = useDictionary();
  const shiny = isShinyInstance(pokemon);

  return (
    <div className="fighter-card">
      <h3><span className="fighter-name-tab">{title}{displayName(pokemon)}</span></h3>
      {pokemon.nickname && <div className="fighter-species-line">#{pokemon.number} {pokemon.name}</div>}
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      {shiny && <span className="shiny-badge">{dict.common.shinyBadge}</span>}
      <StatusBadges
        bleedTurns={bleedTurns}
        blindTurns={blindTurns}
        poisonTurns={poisonTurns}
        burnTurns={burnTurns}
        freezeTurns={freezeTurns}
        atkMod={atkMod}
        atkModTurns={atkModTurns}
        defMod={defMod}
        defModTurns={defModTurns}
        shieldPoints={shieldPoints}
        redirectTurns={redirectTurns}
        dict={dict}
      />
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="battle-sprite" />

      <SegmentedMeter label="HP" value={Math.max(0, hp)} max={maxHp} color={hpColor(Math.max(0, Math.min(1, hp / maxHp)))} />
      {/* MP meter removed (upgrades/40-uses-based-move-data-model.md) -- no
          more aggregate resource pool; per-move uses render on MoveButton
          instead (upgrades/43-uses-ui-and-server-validation.md). */}

      <div className="moves-caption">{movesCaption}</div>
      {children}

      {team && (
        <div className="bench-row">
          {team.map((member, i) => {
            if (i === activeIndex) return null;
            const fainted = member.hp <= 0;
            const clickable = Boolean(onSwitchTo) && !fainted;
            const benchShiny = isShinyInstance(member.pokemon);
            return (
              <button
                key={i}
                type="button"
                className={`bench-member${fainted ? " fainted" : ""}`}
                disabled={!clickable}
                onClick={() => clickable && onSwitchTo?.(i)}
                title={fainted ? dict.battle.fighterCard.faintedTitle(displayName(member.pokemon)) : dict.battle.fighterCard.switchTo(displayName(member.pokemon))}
              >
                <Sprite name={member.pokemon.name} form={benchShiny ? "shiny" : "normal"} className="bench-sprite" />
                <span className="bench-name">{benchShiny ? "✨ " : ""}{displayName(member.pokemon)}</span>
                {fainted ? (
                  <span className="bench-hp">{dict.battle.fighterCard.fainted}</span>
                ) : (
                  <>
                    <SegmentedMeter label="HP" value={Math.max(0, member.hp)} max={member.maxHp} color={hpColor(Math.max(0, Math.min(1, member.hp / member.maxHp)))} segments={6} compact />
                  </>
                )}
                {!fainted && (
                  <StatusBadges
                    bleedTurns={member.bleedTurns}
                    blindTurns={member.blindTurns}
                    poisonTurns={member.poisonTurns}
                    burnTurns={member.burnTurns}
                    freezeTurns={member.freezeTurns}
                    atkMod={member.atkMod}
                    atkModTurns={member.atkModTurns}
                    defMod={member.defMod}
                    defModTurns={member.defModTurns}
                    shieldPoints={member.shieldPoints}
                    redirectTurns={member.redirectTurns}
                    compact
                    dict={dict}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
