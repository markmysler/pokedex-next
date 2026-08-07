"use client";

import { useRef, useState } from "react";
import type { Pokedex, FighterState, RoomSlot } from "@/types/pokemon";
import FighterCard from "@/components/battle/FighterCard";
import MoveButton from "@/components/battle/MoveButton";
import { useRoomChannel, type RoundResultPayload } from "./useRoomChannel";

interface OnlineBattleProps {
  pokedex: Pokedex;
  order: string[];
}

interface OnlineBattleState {
  fighter1: FighterState;
  fighter2: FighterState;
  over: boolean;
  winner: RoomSlot | null;
}

export default function OnlineBattle({ pokedex, order }: OnlineBattleProps) {
  const [fighterChoice, setFighterChoice] = useState(order[0]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mySlot, setMySlot] = useState<RoomSlot | null>(null);
  const [status, setStatus] = useState("");
  const [turnStatus, setTurnStatus] = useState("");
  const [battle, setBattle] = useState<OnlineBattleState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [moveLocked, setMoveLocked] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  function appendLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines]);
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
  }

  function startLogFor(fighter1: FighterState, fighter2: FighterState, slot: RoomSlot) {
    const you = slot === 1 ? fighter1 : fighter2;
    const opp = slot === 1 ? fighter2 : fighter1;
    setLog([
      `=== ⚔️ ONLINE BATTLE START: ${you.pokemon.name} vs ${opp.pokemon.name} ===`,
      `• You (${you.pokemon.name}): HP ${you.hp} | Mana: ${you.mp}/100`,
      `• Opponent (${opp.pokemon.name}): HP ${opp.hp} | Mana: ${opp.mp}/100\n`,
    ]);
    setTurnStatus("👇 Select an Attack Move below. Higher power moves cost more Mana!");
  }

  useRoomChannel(roomCode, {
    onBattleStart: (payload) => {
      const p = payload as { fighter1: FighterState; fighter2: FighterState };
      setBattle({ fighter1: p.fighter1, fighter2: p.fighter2, over: false, winner: null });
      setMoveLocked(false);
      setStatus("");
      if (mySlot) startLogFor(p.fighter1, p.fighter2, mySlot);
    },
    onRoundResult: (payload: RoundResultPayload) => {
      const fighter1 = payload.fighter1 as FighterState;
      const fighter2 = payload.fighter2 as FighterState;
      setBattle({ fighter1, fighter2, over: payload.over, winner: payload.winner });
      setMoveLocked(false);
      appendLog([`\n--- 🥊 Round ${payload.turnCount} (Mana Restored +15 MP) ---`, ...payload.log]);

      if (payload.over) {
        setMySlot((slot) => {
          const won = payload.winner === slot;
          appendLog([won ? "\n🏆 VICTORY! Your opponent's Pokémon fainted!" : "\n💀 DEFEAT! Your Pokémon fainted!"]);
          setTurnStatus(won ? "🏆 You won the battle!" : "💀 You lost the battle.");
          return slot;
        });
      } else {
        setTurnStatus("👇 Select your next Attack Move!");
      }
    },
    onOpponentMoveSubmitted: () => {
      setMoveLocked((locked) => {
        if (!locked) setTurnStatus("Opponent has chosen their move — waiting for you...");
        return locked;
      });
    },
    onOpponentLeft: () => {
      appendLog(["\n⚠️ Your opponent left the room."]);
      setTurnStatus("Opponent disconnected.");
      setTimeout(resetToSetup, 2000);
    },
  });

  function resetToSetup() {
    setRoomCode(null);
    setMySlot(null);
    setBattle(null);
    setLog([]);
    setMoveLocked(false);
    setStatus("");
    setTurnStatus("");
    setRoomCodeInput("");
  }

  async function createRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fighterNumber: fighterChoice }),
    });
    const data = await res.json();
    if (data.error) return setStatus(`⚠️ ${data.error}`);

    setRoomCode(data.roomCode);
    setMySlot(1);
    setStatus(`Room created! Share code ${data.roomCode} with your opponent. Waiting for them to join...`);
  }

  async function joinRoom() {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return setStatus("⚠️ Enter a room code first.");

    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fighterNumber: fighterChoice }),
    });
    const data = await res.json();
    if (data.error) return setStatus(`⚠️ ${data.error}`);

    setRoomCode(data.roomCode);
    setMySlot(2);
    setStatus(`Joined room ${data.roomCode}. Starting battle...`);
    if (data.state) {
      setBattle({ fighter1: data.state.fighter1, fighter2: data.state.fighter2, over: false, winner: null });
      startLogFor(data.state.fighter1, data.state.fighter2, 2);
    }
  }

  async function leaveRoom() {
    if (roomCode) {
      await fetch(`/api/rooms/${roomCode}/leave`, { method: "POST" });
    }
    resetToSetup();
  }

  async function submitMove(moveIndex: number) {
    if (moveLocked || !battle || battle.over || !roomCode) return;
    setMoveLocked(true);
    setTurnStatus("Move submitted — waiting for opponent...");

    const res = await fetch(`/api/rooms/${roomCode}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveIndex }),
    });
    const data = await res.json();
    if (data.error) {
      setMoveLocked(false);
      setTurnStatus(`⚠️ ${data.error}`);
    }
  }

  if (!roomCode) {
    return (
      <div className="card" id="online-setup">
        <h3>🌐 Online Battle</h3>
        <div className="fighter-select">
          <label>Your Fighter:</label>
          <select value={fighterChoice} onChange={(e) => setFighterChoice(e.target.value)}>
            {order.map((num) => (
              <option key={num} value={num}>#{pokedex[num].number} {pokedex[num].name}</option>
            ))}
          </select>
        </div>
        <div className="online-actions">
          <button className="btn-primary" onClick={createRoom}>Create Room</button>
        </div>
        <div className="online-join-row">
          <input
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
            maxLength={6}
            placeholder="Enter room code"
          />
          <button className="btn-secondary" onClick={joinRoom}>Join Room</button>
        </div>
        <div className="online-status">{status}</div>
      </div>
    );
  }

  const you = battle && mySlot ? (mySlot === 1 ? battle.fighter1 : battle.fighter2) : null;
  const opp = battle && mySlot ? (mySlot === 1 ? battle.fighter2 : battle.fighter1) : null;

  return (
    <>
      <div className="card select-bar">
        <div>Room Code: <strong>{roomCode}</strong> — share this with your opponent</div>
        <button className="btn-secondary" onClick={leaveRoom}>Leave Room</button>
      </div>

      {you && opp && (
        <div className="arena-frame">
          <FighterCard
            title={`You: #${you.pokemon.number} ${you.pokemon.name}`}
            pokemon={you.pokemon}
            hp={you.hp}
            maxHp={you.maxHp}
            mp={you.mp}
            maxMp={you.maxMp}
            movesCaption="Select Attack Move:"
          >
            <div className="moves-grid">
              {[0, 1, 2, 3].map((i) => {
                const move = you.pokemon.moves[i];
                if (!move) return <button key={i} className="move-btn" disabled>--</button>;
                const insufficientMana = you.mp < (move.mana_cost ?? 10);
                return (
                  <MoveButton
                    key={i}
                    move={move}
                    disabled={Boolean(battle?.over) || moveLocked || insufficientMana}
                    insufficientMana={insufficientMana}
                    onClick={() => submitMove(i)}
                  />
                );
              })}
            </div>
          </FighterCard>

          <FighterCard
            title={`Opponent: #${opp.pokemon.number} ${opp.pokemon.name}`}
            pokemon={opp.pokemon}
            hp={opp.hp}
            maxHp={opp.maxHp}
            mp={opp.mp}
            maxMp={opp.maxMp}
            movesCaption=""
          />
        </div>
      )}

      <div className="card log-container">
        <div className="online-status">{turnStatus}</div>
        <pre className="battle-log" ref={logRef}>{log.join("\n")}</pre>
      </div>
    </>
  );
}
