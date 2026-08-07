"use client";

import { useEffect, useRef, useState } from "react";
import type { Pokedex, FighterState, RoomSlot, RoomState } from "@/types/pokemon";
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

const POLL_INTERVAL_MS = 2500;

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
  const mySlotRef = useRef<RoomSlot | null>(null);
  // Dedupes updates arriving from three sources (Realtime broadcast, the
  // submitting client's own HTTP response, and the polling backstop below) —
  // null means "battle not started yet locally", otherwise the highest
  // turnCount already applied.
  const lastTurnRef = useRef<number | null>(null);

  useEffect(() => {
    mySlotRef.current = mySlot;
  }, [mySlot]);

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

  function applyBattleStart(fighter1: FighterState, fighter2: FighterState) {
    if (lastTurnRef.current !== null) return; // already started, ignore late duplicate
    lastTurnRef.current = 0;
    setBattle({ fighter1, fighter2, over: false, winner: null });
    setMoveLocked(false);
    setStatus("");
    if (mySlotRef.current) startLogFor(fighter1, fighter2, mySlotRef.current);
  }

  function applyRoundResult(payload: {
    turnCount: number;
    fighter1: FighterState;
    fighter2: FighterState;
    over: boolean;
    winner: RoomSlot | null;
    log?: string[];
  }) {
    if (lastTurnRef.current !== null && payload.turnCount <= lastTurnRef.current) return; // already applied
    lastTurnRef.current = payload.turnCount;

    setBattle({ fighter1: payload.fighter1, fighter2: payload.fighter2, over: payload.over, winner: payload.winner });
    setMoveLocked(false);
    appendLog([
      `\n--- 🥊 Round ${payload.turnCount} (Mana Restored +15 MP) ---`,
      ...(payload.log ?? ["(synced from server)"]),
    ]);

    if (payload.over) {
      const won = payload.winner === mySlotRef.current;
      appendLog([won ? "\n🏆 VICTORY! Your opponent's Pokémon fainted!" : "\n💀 DEFEAT! Your Pokémon fainted!"]);
      setTurnStatus(won ? "🏆 You won the battle!" : "💀 You lost the battle.");
    } else {
      setTurnStatus("👇 Select your next Attack Move!");
    }
  }

  useRoomChannel(roomCode, {
    onBattleStart: (payload) => {
      const p = payload as { fighter1: FighterState; fighter2: FighterState };
      applyBattleStart(p.fighter1, p.fighter2);
    },
    onRoundResult: (payload: RoundResultPayload) => {
      applyRoundResult({
        turnCount: payload.turnCount,
        fighter1: payload.fighter1 as FighterState,
        fighter2: payload.fighter2 as FighterState,
        over: payload.over,
        winner: payload.winner,
        log: payload.log,
      });
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

  // Polling backstop: Realtime broadcast is the fast path, but this
  // guarantees the game can't get permanently stuck if a broadcast doesn't
  // arrive — applyBattleStart/applyRoundResult dedupe against whichever
  // source (broadcast, own move response, or this poll) reports first.
  useEffect(() => {
    if (!roomCode || battle?.over) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (!res.ok) return;
        const data = await res.json();
        const state = data.state as RoomState | undefined;
        if (!state || !state.fighter1 || !state.fighter2) return;

        if (lastTurnRef.current === null) {
          applyBattleStart(state.fighter1, state.fighter2);
        } else if (state.turnCount > lastTurnRef.current) {
          applyRoundResult({
            turnCount: state.turnCount,
            fighter1: state.fighter1,
            fighter2: state.fighter2,
            over: state.over,
            winner: state.winner,
          });
        }
      } catch {
        // transient network hiccup — next poll tick will retry
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // applyBattleStart/applyRoundResult only close over refs and setState
    // setters (both stable across renders), never over stale state, so
    // omitting them here is intentional, not a staleness bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, battle?.over]);

  function resetToSetup() {
    setRoomCode(null);
    setMySlot(null);
    setBattle(null);
    setLog([]);
    setMoveLocked(false);
    setStatus("");
    setTurnStatus("");
    setRoomCodeInput("");
    lastTurnRef.current = null;
  }

  async function createRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fighterNumber: fighterChoice }),
    });
    const data = await res.json();
    if (data.error) return setStatus(`⚠️ ${data.error}`);

    setMySlot(1);
    mySlotRef.current = 1;
    setRoomCode(data.roomCode);
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

    setMySlot(2);
    mySlotRef.current = 2;
    setRoomCode(data.roomCode);
    setStatus(`Joined room ${data.roomCode}. Starting battle...`);
    if (data.state) {
      applyBattleStart(data.state.fighter1, data.state.fighter2);
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
      return;
    }
    // Apply directly instead of waiting on the broadcast — the other
    // player still gets it via Realtime (or the poll backstop above).
    if (data.resolved) {
      applyRoundResult({
        turnCount: data.turnCount,
        fighter1: data.fighter1,
        fighter2: data.fighter2,
        over: data.over,
        winner: data.winner,
        log: data.log,
      });
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
