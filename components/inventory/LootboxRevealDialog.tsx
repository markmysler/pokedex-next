"use client";

import { useMemo, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import CaseReel from "@/components/cases/CaseReel";
import RevealCard from "@/components/cases/RevealCard";
import { planReel } from "@/components/cases/reel";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { instanceRarity, RARITY_RANK } from "@/lib/rarity";
import { playReelLandSound } from "@/lib/sound";

interface LootboxRevealDialogProps {
  // The already-rolled, already-saved result: this dialog never calls an
  // endpoint itself, it only shows what the caller already got back.
  pokemon: OwnedPokemon;
  onClose: () => void;
  // "case": a battle reward opened on the spot, shown on a single reel.
  // "evolve": an evolution result, which isn't a roll, so no reel.
  variant?: "case" | "evolve";
}

const SPIN_MS = 5200;

// Result dialog outside the Open cases screen (redesign wave v9): a won
// battle's "Open it now" and evolution both land here, on the same reel and
// result card as the Open cases page.
export default function LootboxRevealDialog({ pokemon, onClose, variant = "case" }: LootboxRevealDialogProps) {
  const dict = useDictionary();
  const t = dict.collection.lootboxReveal;
  const plan = useMemo(() => planReel(pokemon), [pokemon]);
  const [landed, setLanded] = useState(variant === "evolve");
  const [skip, setSkip] = useState(false);

  function handleLanded() {
    setLanded(true);
    playReelLandSound(RARITY_RANK[instanceRarity(pokemon)]);
  }

  return (
    <Modal onClose={onClose} size="xl">
      <span className="eyebrow">{variant === "evolve" ? t.evolvedEyebrow : dict.collection.caseOpening.eyebrow}</span>
      {variant === "case" && (
        <CaseReel plan={plan} durationMs={window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 800 : SPIN_MS} skip={skip} onLanded={handleLanded} />
      )}
      {landed ? (
        <RevealCard pokemon={pokemon}>
          <button type="button" className="btn-primary" onClick={onClose}>
            <Icon name="check" size={16} /> {t.continueLabel}
          </button>
        </RevealCard>
      ) : (
        <div className="row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn-secondary" onClick={() => setSkip(true)}>
            {t.skip}
          </button>
        </div>
      )}
    </Modal>
  );
}
