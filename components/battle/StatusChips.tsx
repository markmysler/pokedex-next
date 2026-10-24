"use client";

import type { FighterState } from "@/types/pokemon";
import { useDictionary } from "@/lib/i18n/useDictionary";

type StatusFields = Pick<
  FighterState,
  "bleedTurns" | "blindTurns" | "poisonTurns" | "burnTurns" | "freezeTurns" | "atkMod" | "atkModTurns" | "defMod" | "defModTurns" | "shieldPoints" | "redirectTurns"
>;

// A fighter's active effects as small coloured chips with the turns left;
// hover (or long-press) for the full rule. Same data and tooltips as the
// old status badges, without the emoji.
export default function StatusChips({ fighter, compact }: { fighter: Partial<StatusFields>; compact?: boolean }) {
  const dict = useDictionary();
  const t = dict.battle.fighterCard;
  const adj = dict.battle.statusAdjective;
  const abbrev = dict.battle.moveEffect.statAbbrev;
  const { bleedTurns, blindTurns, poisonTurns, burnTurns, freezeTurns, atkMod, atkModTurns, defMod, defModTurns, shieldPoints, redirectTurns } = fighter;
  const atkPct = atkMod && atkMod !== 1 ? Math.round((atkMod - 1) * 100) : 0;
  const defPct = defMod && defMod !== 1 ? Math.round((defMod - 1) * 100) : 0;

  const chips: { key: string; cls: string; label: string; title: string }[] = [];
  if (bleedTurns) chips.push({ key: "bleed", cls: "bleed", label: `${adj.bleed} ${bleedTurns}`, title: t.statusTooltip.bleed });
  if (blindTurns) chips.push({ key: "blind", cls: "blind", label: `${adj.blind} ${blindTurns}`, title: t.statusTooltip.blind });
  if (poisonTurns) chips.push({ key: "poison", cls: "poison", label: `${adj.poison} ${poisonTurns}`, title: t.statusTooltip.poison });
  if (burnTurns) chips.push({ key: "burn", cls: "burn", label: `${adj.burn} ${burnTurns}`, title: t.statusTooltip.burn });
  if (freezeTurns) chips.push({ key: "freeze", cls: "freeze", label: `${adj.freeze} ${freezeTurns}`, title: t.statusTooltip.freeze });
  if (atkPct) chips.push({ key: "atk", cls: atkPct > 0 ? "buff" : "debuff", label: `${abbrev.atk} ${atkPct > 0 ? "+" : ""}${atkPct}% · ${atkModTurns}`, title: t.atkModTooltip(atkMod ?? 1, atkPct, atkModTurns ?? 0) });
  if (defPct) chips.push({ key: "def", cls: defPct > 0 ? "buff" : "debuff", label: `${abbrev.def} ${defPct > 0 ? "+" : ""}${defPct}% · ${defModTurns}`, title: t.defModTooltip(defMod ?? 1, defPct, defModTurns ?? 0) });
  if (shieldPoints && shieldPoints > 0) chips.push({ key: "shield", cls: "shield", label: `${t.shieldLabel} ${shieldPoints}`, title: t.shieldTooltip(shieldPoints) });
  if (redirectTurns && redirectTurns > 0) chips.push({ key: "redirect", cls: "redirect", label: `${t.confusedLabel} ${redirectTurns}`, title: t.redirectTooltip(redirectTurns) });

  if (chips.length === 0) return null;
  return (
    <span className={`status-chips${compact ? " compact" : ""}`}>
      {chips.map((c) => (
        <span key={c.key} className={`status-chip ${c.cls}`} title={c.title}>
          {c.label}
        </span>
      ))}
    </span>
  );
}
