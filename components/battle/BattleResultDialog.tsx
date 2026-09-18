"use client";

import Modal from "@/components/ui/Modal";
import { useDictionary } from "@/lib/i18n/useDictionary";

interface BattleResultDialogProps {
  won: boolean;
  // Truthful, not assumed — bot wins are only a 60% roll, so this is always
  // read from what the server actually granted, never inferred from `won`
  // alone. Ignored entirely on a loss: losers never get one, in either mode.
  lootboxGranted: boolean;
  onClose: () => void;
  // Only set when the win response actually carried a lootbox id (see
  // upgrades/04-lootbox-opening.md) — the online poll-backstop path doesn't
  // have one to offer, so this degrades gracefully to no button rather than
  // a broken one.
  onOpenNow?: () => void;
}

// Shared by BattleArena.tsx (bot) and OnlineBattle.tsx (online) — one
// dialog, since both modes now resolve to the same "your team won/lost"
// shape (see upgrades/01-bot-3v3.md).
export default function BattleResultDialog({ won, lootboxGranted, onClose, onOpenNow }: BattleResultDialogProps) {
  const dict = useDictionary();
  const t = dict.battle.resultDialog;
  return (
    <Modal onClose={onClose}>
      <div className="battle-result-dialog">
        {won ? (
          <>
            <h2>{t.victoryHeading}</h2>
            <p>{t.victoryBody}</p>
            {lootboxGranted ? (
              <p className="battle-result-lootbox">{t.lootboxEarned}</p>
            ) : (
              <p className="battle-result-no-lootbox">{t.noLootbox}</p>
            )}
          </>
        ) : (
          <>
            <h2>{t.defeatHeading}</h2>
            <p className="battle-result-no-lootbox">{t.defeatBody}</p>
          </>
        )}
        <div className="battle-result-actions">
          <button className="btn-primary" onClick={onClose}>{t.continue}</button>
          {won && lootboxGranted && onOpenNow && (
            <button className="btn-secondary" onClick={onOpenNow}>{t.openItNow}</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
