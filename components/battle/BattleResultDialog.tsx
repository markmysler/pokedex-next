"use client";

import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import CaseArt from "@/components/cases/CaseArt";
import { useDictionary } from "@/lib/i18n/useDictionary";

interface BattleResultDialogProps {
  won: boolean;
  lootboxGranted: boolean;
  onClose: () => void;
  onOpenNow?: () => void;
}

// End-of-battle result (redesign wave v9): the outcome first, then the
// reward with the option to open it on the spot.
export default function BattleResultDialog({ won, lootboxGranted, onClose, onOpenNow }: BattleResultDialogProps) {
  const t = useDictionary().battle.resultDialog;
  return (
    <Modal onClose={onClose}>
      <div className={`result-dialog ${won ? "is-win" : "is-loss"}`}>
        <span className="result-icon"><Icon name={won ? "trophy" : "shield"} size={30} /></span>
        <h2>{won ? t.victoryHeading : t.defeatHeading}</h2>
        <p className="muted">{won ? t.victoryBody : t.defeatBody}</p>
        {won && (
          lootboxGranted ? (
            <div className="result-reward">
              <CaseArt className="case-art" />
              <b>{t.lootboxEarned}</b>
            </div>
          ) : (
            <p className="small faint">{t.noLootbox}</p>
          )
        )}
        <div className="dialog-actions" style={{ justifyContent: "center" }}>
          {won && lootboxGranted && onOpenNow && (
            <button type="button" className="btn-primary" onClick={onOpenNow}>
              <Icon name="case" size={16} /> {t.openItNow}
            </button>
          )}
          <button type="button" className={won && lootboxGranted && onOpenNow ? "btn-secondary" : "btn-primary"} onClick={onClose}>{t.continue}</button>
        </div>
      </div>
    </Modal>
  );
}
