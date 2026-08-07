"use client";

import { useEffect, useRef, useState } from "react";
import type { Pokedex, FighterState, Move } from "@/types/pokemon";
import { buildFighterState, resolveRound } from "@/lib/battleEngine";
import FighterCard from "./FighterCard";
import MoveButton from "./MoveButton";

interface BattleArenaProps {
  pokedex: Pokedex;
  order: string[];
  syncFighter1Id: string | null;
}

interface LocalBattleState {
  f1: FighterState;
  f2: FighterState;
  turnCount: number;
  over: boolean;
  winner: 1 | 2 | null;
}

function freshBattle(pokedex: Pokedex, f1Id: string, f2Id: string): LocalBattleState {
  return {
    f1: buildFighterState(pokedex[f1Id]),
    f2: buildFighterState(pokedex[f2Id]),
    turnCount: 0,
    over: false,
    winner: null,
  };
}

function startLog(battle: LocalBattleState): string[] {
  const p1 = battle.f1.pokemon;
  const p2 = battle.f2.pokemon;
  return [
    `=== ⚔️ BATTLE START: #${p1.number} ${p1.name} vs #${p2.number} ${p2.name} ===`,
    `• ${p1.name}: HP ${battle.f1.hp} | Mana: ${battle.f1.mp}/100 | Atk: ${p1.atk} | Spd: ${p1.spd}`,
    `• ${p2.name}: HP ${battle.f2.hp} | Mana: ${battle.f2.mp}/100 | Atk: ${p2.atk} | Spd: ${p2.spd}\n`,
    "👇 Select an Attack Move below. Higher power moves cost more Mana!",
  ];
}

export default function BattleArena({ pokedex, order, syncFighter1Id }: BattleArenaProps) {
  const [f1Id, setF1Id] = useState<string>(syncFighter1Id ?? order[0]);
  const [f2Id, setF2Id] = useState<string>(order[order.length - 1]);
  const [battle, setBattle] = useState<LocalBattleState>(() => freshBattle(pokedex, f1Id, f2Id));
  const [log, setLog] = useState<string[]>(() => startLog(battle));
  const [autoRunning, setAutoRunning] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  // Render-time sync of Fighter 1 with the selected Pokedex tab Pokemon,
  // following React's "adjusting state when a prop changes" pattern instead
  // of an effect (see react.dev/learn/you-might-not-need-an-effect) — this
  // mirrors pokedex-web's select_pokemon() -> on_battle_fighter_changed().
  const [prevSyncId, setPrevSyncId] = useState(syncFighter1Id);
  if (syncFighter1Id !== prevSyncId) {
    setPrevSyncId(syncFighter1Id);
    if (syncFighter1Id && syncFighter1Id !== f1Id) {
      const fresh = freshBattle(pokedex, syncFighter1Id, f2Id);
      setF1Id(syncFighter1Id);
      setBattle(fresh);
      setLog(startLog(fresh));
      setAutoRunning(false);
    }
  }

  function appendLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines]);
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  function reset(nextF1: string, nextF2: string) {
    setAutoRunning(false);
    const fresh = freshBattle(pokedex, nextF1, nextF2);
    setBattle(fresh);
    setLog(startLog(fresh));
  }

  function onChangeF1(id: string) {
    setF1Id(id);
    reset(id, f2Id);
  }
  function onChangeF2(id: string) {
    setF2Id(id);
    reset(f1Id, id);
  }
  function pickRandomOpponent() {
    const randomId = order[Math.floor(Math.random() * order.length)];
    onChangeF2(randomId);
  }

  function playerSelectMove(moveIndex: number) {
    if (battle.over) return;
    const moves1 = battle.f1.pokemon.moves;
    const move1 = moves1[moveIndex];
    if (!move1) return;
    const cost1 = move1.mana_cost ?? 10;
    if (battle.f1.mp < cost1) {
      appendLog([`⚠️ Not enough Mana for ${move1.name}! (Requires ${cost1} MP, have ${battle.f1.mp} MP)`]);
      return;
    }

    const moves2 = battle.f2.pokemon.moves;
    const affordable2 = moves2.filter((m) => (m.mana_cost ?? 10) <= battle.f2.mp);
    const move2: Move = affordable2.length
      ? affordable2[Math.floor(Math.random() * affordable2.length)]
      : { name: "Tackle", type: "Normal", power: 40, category: "Physical", mana_cost: 0 };

    // resolveRound mutates plain copies of the current fighter states in place.
    const f1State: FighterState = { ...battle.f1 };
    const f2State: FighterState = { ...battle.f2 };
    const nextTurn = battle.turnCount + 1;
    const result = resolveRound(f1State, f2State, move1, move2);

    appendLog([`\n--- 🥊 Round ${nextTurn} (Mana Restored +15 MP) ---`, ...result.log]);

    if (result.over) {
      setAutoRunning(false);
      if (result.winner === 2) {
        appendLog([`\n💀 ${f1State.pokemon.name} FAINTED!`, `🏆 VICTORY: ${f2State.pokemon.name} wins the battle in ${nextTurn} rounds!`]);
      } else {
        appendLog([`\n💀 ${f2State.pokemon.name} FAINTED!`, `🏆 VICTORY: ${f1State.pokemon.name} wins the battle in ${nextTurn} rounds!`]);
      }
    }

    setBattle({ f1: f1State, f2: f2State, turnCount: nextTurn, over: result.over, winner: result.winner });
  }

  function toggleAutoBattle() {
    if (battle.over) {
      reset(f1Id, f2Id);
      return;
    }
    setAutoRunning((running) => !running);
  }

  // Auto-battle scheduling: this effect's own cleanup (returned setTimeout
  // cancellation) fires whenever `autoRunning`/`battle` change or the
  // component unmounts, so no separate imperative timer-ref bookkeeping is
  // needed elsewhere (e.g. reset()/toggleAutoBattle() just flip state).
  useEffect(() => {
    if (!autoRunning || battle.over) return;

    const timer = setTimeout(() => {
      const moves = battle.f1.pokemon.moves;
      const affordable = moves.map((m, i) => i).filter((i) => (moves[i].mana_cost ?? 10) <= battle.f1.mp);
      if (affordable.length) {
        playerSelectMove(affordable[Math.floor(Math.random() * affordable.length)]);
      } else if (moves.length) {
        playerSelectMove(Math.floor(Math.random() * moves.length));
      }
    }, 750);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunning, battle]);

  const p2MovesLabel = battle.f2.pokemon.moves.map((m) => `${m.name} (${m.mana_cost ?? 10} MP)`).join(" | ");

  return (
    <>
      <div className="card select-bar">
        <div className="fighter-select">
          <label>Player Fighter 1:</label>
          <select value={f1Id} onChange={(e) => onChangeF1(e.target.value)}>
            {order.map((num) => (
              <option key={num} value={num}>#{pokedex[num].number} {pokedex[num].name}</option>
            ))}
          </select>
        </div>
        <div className="vs-badge">
          <div className="vs-text">⚡ VS ⚡</div>
          <button id="btn-random-rival" onClick={pickRandomOpponent}>🎲 Random Rival</button>
        </div>
        <div className="fighter-select">
          <label>Rival Fighter 2:</label>
          <select value={f2Id} onChange={(e) => onChangeF2(e.target.value)}>
            {order.map((num) => (
              <option key={num} value={num}>#{pokedex[num].number} {pokedex[num].name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="arena-frame">
        <FighterCard
          title={`#${battle.f1.pokemon.number} ${battle.f1.pokemon.name}`}
          pokemon={battle.f1.pokemon}
          hp={battle.f1.hp}
          maxHp={battle.f1.maxHp}
          mp={battle.f1.mp}
          maxMp={battle.f1.maxMp}
          movesCaption="Select Attack Move:"
        >
          <div className="moves-grid">
            {[0, 1, 2, 3].map((i) => {
              const move = battle.f1.pokemon.moves[i];
              if (!move) return <button key={i} className="move-btn" disabled>--</button>;
              const insufficientMana = battle.f1.mp < (move.mana_cost ?? 10);
              return (
                <MoveButton
                  key={i}
                  move={move}
                  disabled={battle.over || insufficientMana}
                  insufficientMana={insufficientMana}
                  onClick={() => playerSelectMove(i)}
                />
              );
            })}
          </div>
        </FighterCard>

        <FighterCard
          title={`#${battle.f2.pokemon.number} ${battle.f2.pokemon.name}`}
          pokemon={battle.f2.pokemon}
          hp={battle.f2.hp}
          maxHp={battle.f2.maxHp}
          mp={battle.f2.mp}
          maxMp={battle.f2.maxMp}
          movesCaption="AI Arsenal:"
        >
          <div className="ai-arsenal">{p2MovesLabel}</div>
        </FighterCard>
      </div>

      <div className="card log-container">
        <div className="action-row">
          <button className="btn-primary" onClick={toggleAutoBattle}>
            {autoRunning ? "⏸️ Pause Battle" : "⚡ Auto Battle"}
          </button>
          <button className="btn-secondary" onClick={() => reset(f1Id, f2Id)}>🔄 Reset Battle</button>
        </div>
        <pre className="battle-log" ref={logRef}>{log.join("\n")}</pre>
      </div>
    </>
  );
}
