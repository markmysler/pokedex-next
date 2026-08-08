"use client";

import Modal from "@/components/ui/Modal";

interface BattleResultDialogProps {
  won: boolean;
  // Truthful, not assumed — bot wins are only a 25% roll, so this is always
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
  return (
    <Modal onClose={onClose}>
      <div className="battle-result-dialog">
        {won ? (
          <>
            <h2>🏆 Victory!</h2>
            <p>Your team battled hard and came out on top!</p>
            {lootboxGranted ? (
              <p className="battle-result-lootbox">🎁 You earned a lootbox!</p>
            ) : (
              <p className="battle-result-no-lootbox">No lootbox this time — better luck next battle.</p>
            )}
          </>
        ) : (
          <>
            <h2>💀 Defeat</h2>
            <p className="battle-result-no-lootbox">Better luck next time!</p>
          </>
        )}
        <div className="battle-result-actions">
          <button className="btn-primary" onClick={onClose}>Continue</button>
          {won && lootboxGranted && onOpenNow && (
            <button className="btn-secondary" onClick={onOpenNow}>📦 Open it now</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
