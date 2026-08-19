import type { OwnedPokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import SegmentedMeter from "@/components/ui/SegmentedMeter";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";

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
  mp: number;
  maxMp: number;
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

// Native `title` tooltips, same as .account-name's existing pattern
// (components/nav/SideNav.tsx) -- no tooltip library, just the mechanics
// from lib/battleEngine.ts spelled out so a hover explains what the badge
// actually does, not just its name (upgrades/10-battle-depth.md).
const STATUS_TOOLTIPS: Record<"bleed" | "blind" | "poison" | "burn" | "freeze", string> = {
  bleed: "Bleeding: loses 5% of max HP at the start of each of its turns. Inflicted by physical-category hits; lasts 3 turns.",
  blind: "Blinded: 25% chance to miss with its own attack each turn. Inflicted by special-category hits; lasts 3 turns.",
  poison: "Poisoned: loses 5% of max HP at the start of each of its turns. Inflicted by Poison-type moves; lasts 3 turns. Can stack with Bleeding since it's gated by move type, not category.",
  burn: "Burning: loses 5% of max HP at the start of each of its turns (10% against Grass-type Pokemon). Inflicted by Fire-type moves; lasts 3 turns. Can't be inflicted on Water-type Pokemon.",
  freeze: "Frozen: Attack, Special Attack, Defense, Special Defense and Speed all reduced by 30% while active. Inflicted by Ice-type moves; lasts 3 turns. Can't be inflicted on Fire-type Pokemon.",
};

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
}) {
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
      {Boolean(bleedTurns) && <span className="status-badge bleed" title={STATUS_TOOLTIPS.bleed}>🩸 Bleeding ({bleedTurns})</span>}
      {Boolean(blindTurns) && <span className="status-badge blind" title={STATUS_TOOLTIPS.blind}>🌀 Blinded ({blindTurns})</span>}
      {Boolean(poisonTurns) && <span className="status-badge poison" title={STATUS_TOOLTIPS.poison}>☠️ Poisoned ({poisonTurns})</span>}
      {Boolean(burnTurns) && <span className="status-badge burn" title={STATUS_TOOLTIPS.burn}>🔥 Burning ({burnTurns})</span>}
      {Boolean(freezeTurns) && <span className="status-badge freeze" title={STATUS_TOOLTIPS.freeze}>❄️ Frozen ({freezeTurns})</span>}
      {hasAtkMod && (
        <span className={`status-badge ${atkPct > 0 ? "buff" : "debuff"}`} title={`Attack is x${atkMod} (${atkPct > 0 ? "+" : ""}${atkPct}%) for ${atkModTurns} more turn${atkModTurns === 1 ? "" : "s"}.`}>
          ⚔️ ATK {atkPct > 0 ? "+" : ""}{atkPct}% ({atkModTurns})
        </span>
      )}
      {hasDefMod && (
        <span className={`status-badge ${defPct > 0 ? "buff" : "debuff"}`} title={`Defense is x${defMod} (${defPct > 0 ? "+" : ""}${defPct}%) for ${defModTurns} more turn${defModTurns === 1 ? "" : "s"}.`}>
          🛡️ DEF {defPct > 0 ? "+" : ""}{defPct}% ({defModTurns})
        </span>
      )}
      {hasShield && (
        <span className="status-badge shield" title={`A shield absorbs the next ${shieldPoints} damage before HP is touched. No duration -- it just runs out.`}>
          💠 Shield ({shieldPoints})
        </span>
      )}
      {hasRedirect && (
        <span className="status-badge redirect" title={`Confused: this fighter's own attacks land on itself or a living ally instead of the opponent, for ${redirectTurns} more turn${redirectTurns === 1 ? "" : "s"}.`}>
          🌀 Confused ({redirectTurns})
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
  mp,
  maxMp,
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
  const shiny = isShinyInstance(pokemon);

  return (
    <div className="fighter-card">
      <h3><span className="fighter-name-tab">{title}{displayName(pokemon)}</span></h3>
      {pokemon.nickname && <div className="fighter-species-line">#{pokemon.number} {pokemon.name}</div>}
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      {shiny && <span className="shiny-badge">✨ Shiny</span>}
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
      />
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="battle-sprite" />

      <SegmentedMeter label="HP" value={Math.max(0, hp)} max={maxHp} color={hpColor(Math.max(0, Math.min(1, hp / maxHp)))} />
      <SegmentedMeter label="MP" value={Math.max(0, mp)} max={maxMp} color="var(--info)" />

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
                title={fainted ? `${displayName(member.pokemon)} (fainted)` : `Switch to ${displayName(member.pokemon)}`}
              >
                <Sprite name={member.pokemon.name} form={benchShiny ? "shiny" : "normal"} className="bench-sprite" />
                <span className="bench-name">{benchShiny ? "✨ " : ""}{displayName(member.pokemon)}</span>
                {fainted ? (
                  <span className="bench-hp">💀 Fainted</span>
                ) : (
                  <SegmentedMeter label="HP" value={Math.max(0, member.hp)} max={member.maxHp} color={hpColor(Math.max(0, Math.min(1, member.hp / member.maxHp)))} segments={6} compact />
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
