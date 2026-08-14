import type { FighterState } from "@/types/pokemon";
import { displayName } from "@/lib/pokemonDisplay";
import { isShinyInstance } from "@/lib/shiny";
import Sprite from "@/components/Sprite";

interface AllyTargetPickerProps {
  team: [FighterState, FighterState, FighterState];
  activeIndex: number;
  onSelect: (teamIndex: 0 | 1 | 2) => void;
  onCancel: () => void;
}

// Minimal inline target picker for a buff move with a living ally to
// choose (upgrades/28-move-ui-and-ally-targeting.md) -- self + each living
// ally, reusing FighterCard.tsx's existing bench-member button visual
// language rather than inventing a new one. Only rendered by the caller
// when hasLivingAlly() is true; a fainted-and-therefore-unselectable
// member simply doesn't get a button here (nothing to disable, unlike the
// switch-target bench row which still shows fainted members struck out).
export default function AllyTargetPicker({ team, activeIndex, onSelect, onCancel }: AllyTargetPickerProps) {
  return (
    <div className="ally-target-picker">
      <div className="moves-caption">Choose a target:</div>
      <div className="bench-row">
        {team.map((member, i) => {
          if (member.hp <= 0) return null;
          const isSelf = i === activeIndex;
          const shiny = isShinyInstance(member.pokemon);
          return (
            <button
              key={i}
              type="button"
              className="bench-member"
              onClick={() => onSelect(i as 0 | 1 | 2)}
              title={isSelf ? `Target yourself (${displayName(member.pokemon)})` : `Target ${displayName(member.pokemon)}`}
            >
              <Sprite name={member.pokemon.name} form={shiny ? "shiny" : "normal"} className="bench-sprite" />
              <span className="bench-name">{isSelf ? "Self" : displayName(member.pokemon)}</span>
              <span className="bench-hp">{Math.max(0, member.hp)}/{member.maxHp} HP</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
    </div>
  );
}
