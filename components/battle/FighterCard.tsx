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
// (upgrades/10-battle-depth.md) — status persists on the bench, so both
// need to show it, just at different sizes.
function StatusBadges({ bleedTurns, blindTurns, poisonTurns, compact }: { bleedTurns?: number; blindTurns?: number; poisonTurns?: number; compact?: boolean }) {
  if (!bleedTurns && !blindTurns && !poisonTurns) return null;
  // <span>, not <div> -- this renders inside a bench <button> in compact
  // mode, and <div> isn't valid phrasing content inside a <button>.
  return (
    <span className={compact ? "status-badges compact" : "status-badges"}>
      {Boolean(bleedTurns) && <span className="status-badge bleed">🩸 Bleeding ({bleedTurns})</span>}
      {Boolean(blindTurns) && <span className="status-badge blind">🌀 Blinded ({blindTurns})</span>}
      {Boolean(poisonTurns) && <span className="status-badge poison">☠️ Poisoned ({poisonTurns})</span>}
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
      <StatusBadges bleedTurns={bleedTurns} blindTurns={blindTurns} poisonTurns={poisonTurns} />
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
                  <StatusBadges bleedTurns={member.bleedTurns} blindTurns={member.blindTurns} poisonTurns={member.poisonTurns} compact />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
