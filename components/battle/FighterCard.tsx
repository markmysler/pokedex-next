import type { Pokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import ColorProgress from "@/components/ColorProgress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  // 3v3 only (upgrades/archive/05-3v3-battles.md) — the full 3-member team,
  // so the benched (non-active) members render below as switch targets.
  // Undefined for 1v1 local battles, which render exactly as before.
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
  const hpPct = Math.max(0, Math.min(1, hp / maxHp)) * 100;
  const hpColor = hpPct > 50 ? "#2FA572" : hpPct > 20 ? "#F39C12" : "#E74C3C";
  const mpPct = Math.max(0, Math.min(1, mp / maxMp)) * 100;

  return (
    <Card className="items-center gap-1 py-3 text-center">
      <CardContent className="flex w-full flex-col items-center gap-1">
        <h3 className="my-1 font-bold">{title}</h3>
        <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
        <Sprite name={pokemon.name} form="normal" className="size-21 object-contain" />

        <div className="text-xs font-bold">HP: {Math.max(0, hp)} / {maxHp}</div>
        <ColorProgress value={hpPct} color={hpColor} className="w-full" trackClassName="h-2.5" />

        <div className="text-xs font-bold text-[#00BCFF]">💧 Mana: {Math.max(0, mp)} / {maxMp}</div>
        <ColorProgress value={mpPct} color="#00BCFF" className="w-full" trackClassName="h-2.5" />

        <div className="mt-1 text-xs font-bold text-muted-foreground">{movesCaption}</div>
        {children}

        {team && (
          <div className="mt-1.5 flex w-full gap-1.5">
            {team.map((member, i) => {
              if (i === activeIndex) return null;
              const fainted = member.hp <= 0;
              const clickable = Boolean(onSwitchTo) && !fainted;
              return (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-border bg-muted p-1 text-foreground",
                    clickable ? "cursor-pointer hover:border-primary" : "cursor-not-allowed",
                    fainted && "opacity-50"
                  )}
                  disabled={!clickable}
                  onClick={() => clickable && onSwitchTo?.(i)}
                  title={fainted ? `${member.pokemon.name} (fainted)` : `Switch to ${member.pokemon.name}`}
                >
                  <Sprite name={member.pokemon.name} form="normal" className="size-8 object-contain" />
                  <span className="text-[10px] font-bold">{member.pokemon.name}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {fainted ? "💀 Fainted" : `${Math.max(0, member.hp)}/${member.maxHp} HP`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
