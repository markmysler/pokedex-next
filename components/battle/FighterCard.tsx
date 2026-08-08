import type { Pokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";

interface TeamMemberDisplay {
  pokemon: Pokemon;
  hp: number;
  maxHp: number;
}

interface FighterCardProps {
  title: string;
  pokemon: Pokemon;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  movesCaption: string;
  children?: React.ReactNode;
  // 3v3 only (upgrades/05-3v3-battles.md) — the full 3-member team, so the
  // benched (non-active) members render below as switch targets. Undefined
  // for 1v1 local battles, which render exactly as before.
  team?: TeamMemberDisplay[];
  activeIndex?: number;
  onSwitchTo?: (teamIndex: number) => void;
}

export default function FighterCard({
  title,
  pokemon,
  hp,
  maxHp,
  mp,
  maxMp,
  movesCaption,
  children,
  team,
  activeIndex,
  onSwitchTo,
}: FighterCardProps) {
  const hpPct = Math.max(0, Math.min(1, hp / maxHp));
  const hpColor = hpPct > 0.5 ? "#2FA572" : hpPct > 0.2 ? "#F39C12" : "#E74C3C";
  const mpPct = Math.max(0, Math.min(1, mp / maxMp));

  return (
    <div className="fighter-card">
      <h3>{title}</h3>
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      <Sprite name={pokemon.name} form="normal" className="battle-sprite" />

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
            return (
              <button
                key={i}
                type="button"
                className={`bench-member${fainted ? " fainted" : ""}`}
                disabled={!clickable}
                onClick={() => clickable && onSwitchTo?.(i)}
                title={fainted ? `${member.pokemon.name} (fainted)` : `Switch to ${member.pokemon.name}`}
              >
                <Sprite name={member.pokemon.name} form="normal" className="bench-sprite" />
                <span className="bench-name">{member.pokemon.name}</span>
                <span className="bench-hp">{fainted ? "💀 Fainted" : `${Math.max(0, member.hp)}/${member.maxHp} HP`}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
