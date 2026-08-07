"use client";

import { useEffect, useRef, useState } from "react";
import type { FighterState, Move, OwnedPokemon } from "@/types/pokemon";
import { buildFighterState, resolveRound } from "@/lib/battleEngine";
import { rollBotOpponent } from "@/lib/collection";
import { getPokemon, pokedexOrder } from "@/lib/pokedex";
import FighterCard from "./FighterCard";
import MoveButton from "./MoveButton";

interface BattleArenaProps {
  inventory: OwnedPokemon[];
}

interface LocalBattleState {
  f1: FighterState;
  f2: FighterState;
  turnCount: number;
  over: boolean;
  winner: 1 | 2 | null;
}

// Species is never chosen by the player — only its level (see
// lib/collection.ts's rollBotOpponent) is tied to what they're bringing in.
function randomBotFor(playerTotal: number): OwnedPokemon {
  const randomNumber = pokedexOrder[Math.floor(Math.random() * pokedexOrder.length)];
  const species = getPokemon(randomNumber);
  return rollBotOpponent(species, playerTotal);
}

function freshBattle(myPokemon: OwnedPokemon): LocalBattleState {
  return {
    f1: buildFighterState(myPokemon),
    f2: buildFighterState(randomBotFor(myPokemon.total)),
    turnCount: 0,
    over: false,
    winner: null,
  };
}

function startLog(battle: LocalBattleState): string[] {
  const p1 = battle.f1.pokemon;
  const p2 = battle.f2.pokemon;
  return [
    `=== ⚔️ BATTLE START: #${p1.number} ${p1.name} vs a wild #${p2.number} ${p2.name} ===`,
    `• ${p1.name}: HP ${battle.f1.hp} | Mana: ${battle.f1.mp}/100 | Atk: ${p1.atk} | Spd: ${p1.spd}`,
    `• ${p2.name}: HP ${battle.f2.hp} | Mana: ${battle.f2.mp}/100 | Atk: ${p2.atk} | Spd: ${p2.spd}\n`,
    "👇 Select an Attack Move below. Higher power moves cost more Mana!",
  ];
}

async function reportBotResult(won: boolean) {
  try {
    await fetch("/api/battles/bot-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ won }),
    });
  } catch {
    // Best-effort — a dropped report just costs a possible lootbox roll,
    // not a broken battle. The battle itself is already fully resolved
    // client-side by this point.
  }
}

export default function BattleArena({ inventory }: BattleArenaProps) {
  const [f1Id, setF1Id] = useState<string | null>(inventory[0]?.id ?? null);
  const selected = inventory.find((p) => p.id === f1Id) ?? inventory[0] ?? null;

  const [battle, setBattle] = useState<LocalBattleState | null>(() => (selected ? freshBattle(selected) : null));
  const [log, setLog] = useState<string[]>(() => (battle ? startLog(battle) : []));
  const [autoRunning, setAutoRunning] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  function appendLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines]);
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  function reset(pokemon: OwnedPokemon) {
    setAutoRunning(false);
    const fresh = freshBattle(pokemon);
    setBattle(fresh);
    setLog(startLog(fresh));
  }

  function onChangeF1(id: string) {
    setF1Id(id);
    const pokemon = inventory.find((p) => p.id === id);
    if (pokemon) reset(pokemon);
  }

  function playerSelectMove(moveIndex: number) {
    if (!battle || battle.over) return;
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
      const won = result.winner === 1;
      if (won) {
        appendLog([`\n💀 ${f2State.pokemon.name} FAINTED!`, `🏆 VICTORY: ${f1State.pokemon.name} wins the battle in ${nextTurn} rounds!`]);
      } else {
        appendLog([`\n💀 ${f1State.pokemon.name} FAINTED!`, `💀 DEFEAT: ${f2State.pokemon.name} wins the battle in ${nextTurn} rounds!`]);
      }
      // Server rolls the lootbox chance itself — this only ever reports
      // win/loss, never "and I should get a lootbox."
      reportBotResult(won);
    }

    setBattle({ f1: f1State, f2: f2State, turnCount: nextTurn, over: result.over, winner: result.winner });
  }

  function toggleAutoBattle() {
    if (!battle) return;
    if (battle.over) {
      if (selected) reset(selected);
      return;
    }
    setAutoRunning((running) => !running);
  }

  // Auto-battle scheduling: this effect's own cleanup (returned setTimeout
  // cancellation) fires whenever `autoRunning`/`battle` change or the
  // component unmounts, so no separate imperative timer-ref bookkeeping is
  // needed elsewhere (e.g. reset()/toggleAutoBattle() just flip state).
  useEffect(() => {
    if (!autoRunning || !battle || battle.over) return;

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

  if (!selected || !battle) {
    return (
      <div className="card">
        <p>You don&apos;t own any Pokémon yet. This shouldn&apos;t normally happen — every account starts with 3 starters.</p>
      </div>
    );
  }

  const p2MovesLabel = battle.f2.pokemon.moves.map((m) => `${m.name} (${m.mana_cost ?? 10} MP)`).join(" | ");

  return (
    <>
      <div className="card select-bar">
        <div className="fighter-select">
          <label>Your Fighter:</label>
          <select value={f1Id ?? ""} onChange={(e) => onChangeF1(e.target.value)}>
            {inventory.map((p) => (
              <option key={p.id} value={p.id}>#{p.number} {p.name} (Total {p.total})</option>
            ))}
          </select>
        </div>
        <div className="vs-badge">
          <div className="vs-text">⚡ VS ⚡</div>
        </div>
        <div className="fighter-select">
          <label>Opponent:</label>
          <div className="online-status">🎲 Randomly generated, matched to your level</div>
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
          <button className="btn-secondary" onClick={() => selected && reset(selected)}>🔄 Reset Battle</button>
        </div>
        <pre className="battle-log" ref={logRef}>{log.join("\n")}</pre>
      </div>
    </>
  );
}
