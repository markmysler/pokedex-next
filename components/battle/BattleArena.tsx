"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleAction, OwnedPokemon, TeamState } from "@/types/pokemon";
import { hasLivingAlly } from "@/lib/battleEngine";
import type { BotBattleState, BotBattleTurn } from "@/lib/botBattle";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { renderBattleLogEvent, type RenderedLogLine } from "@/lib/i18n/renderBattleLogEvent";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import TeamPicker from "@/components/online/TeamPicker";
import FighterCard from "./FighterCard";
import MoveButton from "./MoveButton";
import AllyTargetPicker from "./AllyTargetPicker";
import BattleResultDialog from "./BattleResultDialog";
import LootboxRevealDialog from "@/components/inventory/LootboxRevealDialog";
import { playAttackSound, playDodgeSound, playFaintSound, playVictorySound, playDefeatSound } from "@/lib/sound";

interface BattleArenaProps {
  inventory: OwnedPokemon[];
  typesList: string[];
}

type Phase = "picking" | "battling";

interface MoveResponse {
  state: BotBattleState;
  turns: BotBattleTurn[];
  lootboxGranted: boolean;
  lootboxId: string | null;
}

// Bot battles are played on the server (app/api/battles/bot/**): it builds
// both teams from the database, picks the bot's moves, resolves every round
// and decides the winner and any lootbox. This component only sends the
// player's choice and renders what comes back.
async function startBotBattle(ids: string[]): Promise<{ battleId: string; state: BotBattleState }> {
  const res = await fetch("/api/battles/bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pokemonInstanceIds: ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't start the battle");
  return data;
}

async function sendBotMove(battleId: string, action: BattleAction): Promise<MoveResponse> {
  const res = await fetch(`/api/battles/bot/${battleId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't play that move");
  return data;
}

function startLog(battle: BotBattleState, dict: Dictionary): RenderedLogLine[] {
  const t = dict.battle.arena;
  const you = battle.team1.members[battle.team1.activeIndex].pokemon;
  const opp = battle.team2.members[battle.team2.activeIndex].pokemon;
  return [
    { text: t.startBanner(you.name, opp.name) },
    { text: t.yourTeam(battle.team1.members.map((m) => m.pokemon.name).join(", ")) },
    { text: t.opponentTeam(battle.team2.members.map((m) => m.pokemon.name).join(", ")) },
    { text: t.selectPrompt },
  ];
}

function firstAliveBenchIndex(team: TeamState): 0 | 1 | 2 | null {
  const i = team.members.findIndex((m, idx) => idx !== team.activeIndex && m.hp > 0);
  return i === -1 ? null : (i as 0 | 1 | 2);
}

export default function BattleArena({ inventory: initialInventory, typesList }: BattleArenaProps) {
  const dict = useDictionary();
  const t = dict.battle.arena;
  // Local copy, not just the prop directly -- `initialInventory` is a
  // server-render snapshot from when the page first loaded. A lootbox
  // opened mid-session (right after a win, via "Open it now" below)
  // persists a real new pokemon_instances row with no navigation/reload, so
  // without this the newly-caught Pokemon would never appear as a
  // TeamPicker option when picking a team again via "Change Team".
  const [inventory, setInventory] = useState(initialInventory);
  const [phase, setPhase] = useState<Phase>("picking");
  const [myTeamIds, setMyTeamIds] = useState<string[] | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [battle, setBattle] = useState<BotBattleState | null>(null);
  // True while a move request is in flight (and while the bot's forced
  // switch is being shown), so a double click or auto-battle can't send a
  // second action for the same turn.
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<RenderedLogLine[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [resultDialog, setResultDialog] = useState<{ won: boolean; lootboxGranted: boolean; lootboxId: string | null } | null>(null);
  const [revealPokemon, setRevealPokemon] = useState<OwnedPokemon | null>(null);
  // Awaiting a target choice for this move index (upgrades/28-move-ui-and
  // -ally-targeting.md) -- only ever set for a buff move whose caster has
  // a living ally; every other move submits immediately with no picker.
  const [pendingBuffMoveIndex, setPendingBuffMoveIndex] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  function appendLog(lines: RenderedLogLine[]) {
    setLog((prev) => [...prev, ...lines]);
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  async function openLootboxNow(lootboxId: string) {
    const res = await fetch(`/api/inventory/lootboxes/${lootboxId}/open`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      appendLog([{ text: t.couldntOpenLootbox(data.error) }]);
      return;
    }
    const opened = data.pokemon as OwnedPokemon;
    setResultDialog(null);
    setRevealPokemon(opened);
    setInventory((prev) => [...prev, opened]);
  }

  async function startBattle(ids: string[]) {
    if (ids.length !== 3) throw new Error("Pick exactly 3 Pokémon");
    const { battleId: id, state } = await startBotBattle(ids);
    setMyTeamIds(ids);
    setBattleId(id);
    setAutoRunning(false);
    setBusy(false);
    setResultDialog(null);
    setRevealPokemon(null);
    setPendingBuffMoveIndex(null);
    setBattle(state);
    setLog(startLog(state, dict));
    setPhase("battling");
  }

  async function resetBattle() {
    if (!myTeamIds) return;
    try {
      await startBattle(myTeamIds);
    } catch (err) {
      appendLog([{ text: `⚠️ ${(err as Error).message}` }]);
    }
  }

  function changeTeam() {
    setAutoRunning(false);
    setResultDialog(null);
    setRevealPokemon(null);
    setPendingBuffMoveIndex(null);
    setBattle(null);
    setBattleId(null);
    setLog([]);
    setPhase("picking");
  }

  function renderTurn(turn: BotBattleTurn) {
    appendLog([{ text: t.roundHeader(turn.turn) }, ...turn.log.map((event) => renderBattleLogEvent(event, dict))]);
    // One sound per structured event (upgrades/10-battle-depth.md's `events`
    // array) rather than parsing the log strings above.
    for (const ev of turn.events) {
      if (ev.hit) playAttackSound(ev.moveType);
      else playDodgeSound();
      if (ev.fainted) playFaintSound();
    }
  }

  async function submitAction(action: BattleAction) {
    if (!battle || battle.over || busy || !battleId) return;
    setPendingBuffMoveIndex(null);

    // Quick local checks for instant feedback; the server re-checks all of
    // them (lib/battleValidation.ts) and is the only authority.
    if (battle.awaitingForcedSwitch === 1 && action.type !== "switch") return;
    if (action.type === "attack") {
      const active = battle.team1.members[battle.team1.activeIndex];
      const move = active.pokemon.moves[action.moveIndex];
      if (!move) return;
      if (active.moveUses[action.moveIndex] === 0) {
        appendLog([{ text: t.noUsesLeft(move.name) }]);
        return;
      }
    } else {
      const target = battle.team1.members[action.teamIndex];
      if (!target || action.teamIndex === battle.team1.activeIndex || target.hp <= 0) return;
    }

    setBusy(true);
    let response: MoveResponse;
    try {
      response = await sendBotMove(battleId, action);
    } catch (err) {
      setAutoRunning(false);
      setBusy(false);
      appendLog([{ text: `⚠️ ${(err as Error).message}` }]);
      return;
    }

    const { state, turns, lootboxGranted, lootboxId } = response;
    const [round, botSwitch] = turns;
    renderTurn(round);

    if (state.over) {
      setAutoRunning(false);
      const won = state.winner === 1;
      appendLog([{ text: won ? t.victory : t.defeat, kind: won ? "win" : "loss" }]);
      if (won) playVictorySound();
      else playDefeatSound();
      setResultDialog({ won, lootboxGranted, lootboxId });
      setBattle(state);
      setBusy(false);
      return;
    }

    if (!botSwitch) {
      setBattle(state);
      setBusy(false);
      return;
    }

    // The bot's forced switch is part of the same server response; show the
    // round first, then the switch a beat later, as before.
    setBattle({ ...state, team2: { ...state.team2, activeIndex: battle.team2.activeIndex }, awaitingForcedSwitch: 2 });
    setTimeout(() => {
      renderTurn(botSwitch);
      setBattle(state);
      setBusy(false);
    }, 600);
  }

  function toggleAutoBattle() {
    if (!battle) return;
    if (battle.over) {
      void resetBattle();
      return;
    }
    setAutoRunning((running) => !running);
  }

  // Auto-battle scheduling: this effect's own cleanup (returned setTimeout
  // cancellation) fires whenever `autoRunning`/`battle`/`busy` change or the
  // component unmounts, so no separate imperative timer-ref bookkeeping is
  // needed elsewhere (e.g. resetBattle()/toggleAutoBattle() just flip state).
  useEffect(() => {
    if (!autoRunning || !battle || battle.over || busy || battle.awaitingForcedSwitch === 2) return;

    const timer = setTimeout(() => {
      if (battle.awaitingForcedSwitch === 1) {
        const teamIndex = firstAliveBenchIndex(battle.team1);
        if (teamIndex !== null) void submitAction({ type: "switch", teamIndex });
        return;
      }
      const active = battle.team1.members[battle.team1.activeIndex];
      const moves = active.pokemon.moves;
      const castable = moves.map((_, i) => i).filter((i) => active.moveUses[i] !== 0);
      if (castable.length) {
        void submitAction({ type: "attack", moveIndex: castable[Math.floor(Math.random() * castable.length)] });
      } else if (moves.length) {
        void submitAction({ type: "attack", moveIndex: Math.floor(Math.random() * moves.length) });
      }
    }, 750);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunning, battle, busy]);

  if (inventory.length < 3) {
    return (
      <div className="card">
        <p>{t.needThree}</p>
      </div>
    );
  }

  if (phase === "picking" || !battle) {
    return <TeamPicker inventory={inventory} typesList={typesList} onSubmit={startBattle} />;
  }

  const you = battle.team1.members[battle.team1.activeIndex];
  const opp = battle.team2.members[battle.team2.activeIndex];
  const myForcedSwitch = battle.awaitingForcedSwitch === 1;
  const blockedByBotSwitch = battle.awaitingForcedSwitch === 2;
  const canAttackNow = !battle.over && !busy && !battle.awaitingForcedSwitch;
  const canSwitchNow = !battle.over && !busy && (myForcedSwitch || !battle.awaitingForcedSwitch);

  return (
    <>
      {resultDialog && (
        <BattleResultDialog
          won={resultDialog.won}
          lootboxGranted={resultDialog.lootboxGranted}
          onClose={() => setResultDialog(null)}
          onOpenNow={resultDialog.lootboxId ? () => openLootboxNow(resultDialog.lootboxId!) : undefined}
        />
      )}
      {revealPokemon && (
        <LootboxRevealDialog
          pokemon={revealPokemon}
          onClose={() => setRevealPokemon(null)}
          drumrollText={dict.collection.lootboxReveal.openingLootboxText}
          dict={{
            stats: dict.common.stats,
            shinyBadge: dict.common.shinyBadge,
            movesLabel: dict.collection.movesLabel,
            totalLabel: dict.collection.totalLabel,
            moveLine: dict.collection.moveLine,
            lootboxReveal: dict.collection.lootboxReveal,
          }}
        />
      )}

      <div className="card select-bar">
        <div className="vs-badge">
          <div className="vs-text">⚡ 3v3 VS ⚡</div>
        </div>
        <div className="fighter-select">
          <div className="online-status">{t.botTeamNote}</div>
        </div>
        <button className="btn-secondary" onClick={changeTeam}>{t.changeTeam}</button>
      </div>

      <div className="arena-frame">
        <FighterCard
          title={t.youPrefix}
          pokemon={you.pokemon}
          hp={you.hp}
          maxHp={you.maxHp}
          bleedTurns={you.bleedTurns}
          blindTurns={you.blindTurns}
          poisonTurns={you.poisonTurns}
          burnTurns={you.burnTurns}
          freezeTurns={you.freezeTurns}
          atkMod={you.atkMod}
          atkModTurns={you.atkModTurns}
          defMod={you.defMod}
          defModTurns={you.defModTurns}
          shieldPoints={you.shieldPoints}
          redirectTurns={you.redirectTurns}
          movesCaption={myForcedSwitch ? t.chooseNextPokemon : t.selectAttackMove}
          team={battle.team1.members}
          activeIndex={battle.team1.activeIndex}
          onSwitchTo={canSwitchNow ? (i) => submitAction({ type: "switch", teamIndex: i as 0 | 1 | 2 }) : undefined}
        >
          {!myForcedSwitch && pendingBuffMoveIndex !== null && (
            <AllyTargetPicker
              team={battle.team1.members}
              activeIndex={battle.team1.activeIndex}
              onSelect={(teamIndex) => submitAction({ type: "attack", moveIndex: pendingBuffMoveIndex, buffTargetTeamIndex: teamIndex })}
              onCancel={() => setPendingBuffMoveIndex(null)}
            />
          )}
          {!myForcedSwitch && pendingBuffMoveIndex === null && (
            <div className="moves-grid">
              {[0, 1, 2, 3].map((i) => {
                const move = you.pokemon.moves[i];
                if (!move) return <button key={i} className="move-btn" disabled>--</button>;
                const usesLeft = you.moveUses[i];
                return (
                  <MoveButton
                    key={i}
                    move={move}
                    disabled={!canAttackNow || usesLeft === 0}
                    usesLeft={usesLeft}
                    onClick={() => {
                      if (move.kind === "buff" && hasLivingAlly(battle.team1)) {
                        setPendingBuffMoveIndex(i);
                      } else {
                        submitAction({ type: "attack", moveIndex: i });
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </FighterCard>

        <FighterCard
          title=""
          pokemon={opp.pokemon}
          hp={opp.hp}
          maxHp={opp.maxHp}
          bleedTurns={opp.bleedTurns}
          blindTurns={opp.blindTurns}
          poisonTurns={opp.poisonTurns}
          burnTurns={opp.burnTurns}
          freezeTurns={opp.freezeTurns}
          atkMod={opp.atkMod}
          atkModTurns={opp.atkModTurns}
          defMod={opp.defMod}
          defModTurns={opp.defModTurns}
          shieldPoints={opp.shieldPoints}
          redirectTurns={opp.redirectTurns}
          movesCaption=""
          team={battle.team2.members}
          activeIndex={battle.team2.activeIndex}
        />
      </div>

      <div className="card log-container">
        <div className="action-row">
          <button className="btn-primary" onClick={toggleAutoBattle}>
            {autoRunning ? t.pauseBattle : battle.over ? t.newBattle : t.autoBattle}
          </button>
          <button className="btn-secondary" onClick={resetBattle}>{t.resetBattle}</button>
        </div>
        <div className="online-status">{blockedByBotSwitch ? t.opponentChoosing : ""}</div>
        <div className="battle-log" ref={logRef}>
          {log.map((entry, i) => (
            <div key={i} className={entry.kind}>{entry.text}</div>
          ))}
        </div>
      </div>
    </>
  );
}
