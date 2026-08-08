import type { OwnedPokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";

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
// upgrades/19-burn-and-freeze-status-effects.md) — status persists on the
// bench, so both need to show it, just at different sizes.
function StatusBadges({
  bleedTurns,
  blindTurns,
  poisonTurns,
  burnTurns,
  freezeTurns,
  compact,
}: {
  bleedTurns?: number;
  blindTurns?: number;
  poisonTurns?: number;
  burnTurns?: number;
  freezeTurns?: number;
  compact?: boolean;
}) {
  if (!bleedTurns && !blindTurns && !poisonTurns && !burnTurns && !freezeTurns) return null;
  // <span>, not <div> -- this renders inside a bench <button> in compact
  // mode, and <div> isn't valid phrasing content inside a <button>.
  return (
    <span className={compact ? "status-badges compact" : "status-badges"}>
      {Boolean(bleedTurns) && <span className="status-badge bleed" title={STATUS_TOOLTIPS.bleed}>🩸 Bleeding ({bleedTurns})</span>}
      {Boolean(blindTurns) && <span className="status-badge blind" title={STATUS_TOOLTIPS.blind}>🌀 Blinded ({blindTurns})</span>}
      {Boolean(poisonTurns) && <span className="status-badge poison" title={STATUS_TOOLTIPS.poison}>☠️ Poisoned ({poisonTurns})</span>}
      {Boolean(burnTurns) && <span className="status-badge burn" title={STATUS_TOOLTIPS.burn}>🔥 Burning ({burnTurns})</span>}
      {Boolean(freezeTurns) && <span className="status-badge freeze" title={STATUS_TOOLTIPS.freeze}>❄️ Frozen ({freezeTurns})</span>}
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
  movesCaption,
  children,
  team,
  activeIndex,
  onSwitchTo,
}: FighterCardProps) {
  const hpPct = Math.max(0, Math.min(1, hp / maxHp));
  const hpColor = hpPct > 0.5 ? "#2FA572" : hpPct > 0.2 ? "#F39C12" : "#E74C3C";
  const mpPct = Math.max(0, Math.min(1, mp / maxMp));
  const shiny = isShinyInstance(pokemon);

  return (
    <div className="fighter-card">
      <h3>{title}{displayName(pokemon)}</h3>
      {pokemon.nickname && <div className="fighter-species-line">#{pokemon.number} {pokemon.name}</div>}
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      {shiny && <span className="shiny-badge">✨ Shiny</span>}
      <StatusBadges bleedTurns={bleedTurns} blindTurns={blindTurns} poisonTurns={poisonTurns} burnTurns={burnTurns} freezeTurns={freezeTurns} />
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="battle-sprite" />

      <div className="hp-label">HP: {Math.max(0, hp)} / {maxHp}</div>
      <div className="progress-bar small">
        <div className="progress-fill hp" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
      </div>

      <div className="mp-label">💧 Mana: {Math.max(0, mp)} / {maxMp}</div>
      <div className="progress-bar small">
        <div className="progress-fill mp" style={{ width: `${mpPct * 100}%` }} />
      </div>

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
                <span className="bench-hp">{fainted ? "💀 Fainted" : `${Math.max(0, member.hp)}/${member.maxHp} HP`}</span>
                {!fainted && (
                  <StatusBadges
                    bleedTurns={member.bleedTurns}
                    blindTurns={member.blindTurns}
                    poisonTurns={member.poisonTurns}
                    burnTurns={member.burnTurns}
                    freezeTurns={member.freezeTurns}
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
