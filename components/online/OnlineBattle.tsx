"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleAction, OwnedPokemon, RoomSlot, TeamState } from "@/types/pokemon";
import FighterCard from "@/components/battle/FighterCard";
import MoveButton from "@/components/battle/MoveButton";
import TeamPicker from "./TeamPicker";
import { useRoomChannel, type RoundResultPayload } from "./useRoomChannel";

interface OnlineBattleProps {
  inventory: OwnedPokemon[];
}

type Phase = "setup" | "waiting" | "picking" | "battling";

interface OnlineBattleState {
  team1: TeamState;
  team2: TeamState;
  over: boolean;
  winner: RoomSlot | null;
  awaitingForcedSwitch: RoomSlot | null;
}

const POLL_INTERVAL_MS = 2500;

export default function OnlineBattle({ inventory }: OnlineBattleProps) {
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mySlot, setMySlot] = useState<RoomSlot | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [myLockedIn, setMyLockedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [turnStatus, setTurnStatus] = useState("");
  const [battle, setBattle] = useState<OnlineBattleState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [moveLocked, setMoveLocked] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const mySlotRef = useRef<RoomSlot | null>(null);
  const lockedInRef = useRef(false);
  // Dedupes updates arriving from three sources (Realtime broadcast, the
  // submitting client's own HTTP response, and the polling backstop below) —
  // null means "battle not started yet locally", otherwise the highest
  // turnCount already applied.
  const lastTurnRef = useRef<number | null>(null);

  useEffect(() => {
    mySlotRef.current = mySlot;
  }, [mySlot]);
  useEffect(() => {
    lockedInRef.current = myLockedIn;
  }, [myLockedIn]);

  function appendLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines]);
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
  }

  function startLogFor(team1: TeamState, team2: TeamState, slot: RoomSlot) {
    const you = slot === 1 ? team1 : team2;
    const opp = slot === 1 ? team2 : team1;
    const youActive = you.members[you.activeIndex].pokemon.name;
    const oppActive = opp.members[opp.activeIndex].pokemon.name;
    setLog([
      `=== ⚔️ 3v3 ONLINE BATTLE START: ${youActive} vs ${oppActive} ===`,
      `• Your team: ${you.members.map((m) => m.pokemon.name).join(", ")}`,
      `• Opponent's team: ${opp.members.map((m) => m.pokemon.name).join(", ")}\n`,
    ]);
    setTurnStatus("👇 Select an Attack Move or switch Pokémon below.");
  }

  function applyBattleStart(team1: TeamState, team2: TeamState) {
    if (lastTurnRef.current !== null) return; // already started, ignore late duplicate
    lastTurnRef.current = 0;
    setBattle({ team1, team2, over: false, winner: null, awaitingForcedSwitch: null });
    setPhase("battling");
    setMoveLocked(false);
    setStatus("");
    if (mySlotRef.current) startLogFor(team1, team2, mySlotRef.current);
  }

  function applyRoundResult(payload: {
    turnCount: number;
    team1: TeamState;
    team2: TeamState;
    over: boolean;
    winner: RoomSlot | null;
    awaitingForcedSwitch: RoomSlot | null;
    log?: string[];
  }) {
    if (lastTurnRef.current !== null && payload.turnCount <= lastTurnRef.current) return; // already applied
    lastTurnRef.current = payload.turnCount;

    setBattle({
      team1: payload.team1,
      team2: payload.team2,
      over: payload.over,
      winner: payload.winner,
      awaitingForcedSwitch: payload.awaitingForcedSwitch,
    });
    setMoveLocked(false);
    appendLog([`\n--- 🥊 Round ${payload.turnCount} ---`, ...(payload.log ?? ["(synced from server)"])]);

    if (payload.over) {
      const won = payload.winner === mySlotRef.current;
      appendLog([won ? "\n🏆 VICTORY! The opponent's whole team fainted!" : "\n💀 DEFEAT! Your whole team fainted!"]);
      setTurnStatus(won ? "🏆 You won the battle!" : "💀 You lost the battle.");
    } else if (payload.awaitingForcedSwitch === mySlotRef.current) {
      setTurnStatus("💀 Your Pokémon fainted! Choose your next Pokémon below.");
    } else if (payload.awaitingForcedSwitch) {
      setTurnStatus("Opponent's Pokémon fainted — waiting for them to send out a new one...");
    } else {
      setTurnStatus("👇 Select your next Attack Move or switch Pokémon!");
    }
  }

  useRoomChannel(roomCode, {
    onOpponentJoined: () => {
      setPhase((p) => (p === "waiting" ? "picking" : p));
      setStatus("Opponent joined! Pick your team.");
    },
    onPlayerLockedIn: ({ slot }) => {
      if (slot !== mySlotRef.current && !lockedInRef.current) {
        setStatus("Opponent has locked in their team — pick yours!");
      }
    },
    onBattleStart: (payload) => {
      const p = payload as { team1: TeamState; team2: TeamState };
      applyBattleStart(p.team1, p.team2);
    },
    onRoundResult: (payload: RoundResultPayload) => {
      applyRoundResult({
        turnCount: payload.turnCount,
        team1: payload.team1 as TeamState,
        team2: payload.team2 as TeamState,
        over: payload.over,
        winner: payload.winner,
        awaitingForcedSwitch: payload.awaitingForcedSwitch,
        log: payload.log,
      });
    },
    onOpponentMoveSubmitted: () => {
      setMoveLocked((locked) => {
        if (!locked) setTurnStatus("Opponent has acted — waiting for you...");
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
        const roomStatus = data.status as string | undefined;
        const state = data.state as
          | { team1?: TeamState; team2?: TeamState; turnCount: number; over: boolean; winner: RoomSlot | null; awaitingForcedSwitch: RoomSlot | null }
          | undefined;

        if (roomStatus === "picking") {
          setPhase((p) => (p === "waiting" ? "picking" : p));
        } else if (roomStatus === "battling" && state?.team1 && state?.team2) {
          if (lastTurnRef.current === null) {
            applyBattleStart(state.team1, state.team2);
          } else if (state.turnCount > lastTurnRef.current) {
            applyRoundResult({
              turnCount: state.turnCount,
              team1: state.team1,
              team2: state.team2,
              over: state.over,
              winner: state.winner,
              awaitingForcedSwitch: state.awaitingForcedSwitch,
            });
          }
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
    setPhase("setup");
    setMyLockedIn(false);
    setBattle(null);
    setLog([]);
    setMoveLocked(false);
    setStatus("");
    setTurnStatus("");
    setRoomCodeInput("");
    lastTurnRef.current = null;
  }

  async function createRoom() {
    const res = await fetch("/api/rooms", { method: "POST" });
    const data = await res.json();
    if (data.error) return setStatus(`⚠️ ${data.error}`);

    setMySlot(1);
    mySlotRef.current = 1;
    setRoomCode(data.roomCode);
    setPhase("waiting");
    setStatus(`Room created! Share code ${data.roomCode} with your opponent. Waiting for them to join...`);
  }

  async function joinRoom() {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return setStatus("⚠️ Enter a room code first.");

    const res = await fetch(`/api/rooms/${code}/join`, { method: "POST" });
    const data = await res.json();
    if (data.error) return setStatus(`⚠️ ${data.error}`);

    setMySlot(2);
    mySlotRef.current = 2;
    setRoomCode(data.roomCode);
    setPhase("picking");
    setStatus("Joined room! Pick your team.");
  }

  async function leaveRoom() {
    if (roomCode) {
      await fetch(`/api/rooms/${roomCode}/leave`, { method: "POST" });
    }
    resetToSetup();
  }

  async function lockIn(ids: string[]) {
    if (!roomCode) return;
    const res = await fetch(`/api/rooms/${roomCode}/lock-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemonInstanceIds: ids }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    setMyLockedIn(true);
    if (data.battleStarted && data.state) {
      applyBattleStart(data.state.team1, data.state.team2);
    } else {
      setStatus("Locked in! Waiting for your opponent to lock in their team...");
    }
  }

  async function submitAction(action: BattleAction) {
    if (!battle || battle.over || !roomCode) return;
    const isMyForcedSwitch = battle.awaitingForcedSwitch === mySlot;
    if (!isMyForcedSwitch) {
      if (moveLocked || battle.awaitingForcedSwitch) return; // my turn to act is blocked right now
      setMoveLocked(true);
      setTurnStatus("Action submitted — waiting for opponent...");
    }

    const res = await fetch(`/api/rooms/${roomCode}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.error) {
      setMoveLocked(false);
      setTurnStatus(`⚠️ ${data.error}`);
      return;
    }
    if (data.resolved) {
      applyRoundResult({
        turnCount: data.turnCount,
        team1: data.team1,
        team2: data.team2,
        over: data.over,
        winner: data.winner,
        awaitingForcedSwitch: data.awaitingForcedSwitch,
        log: data.log,
      });
    }
  }

  if (!roomCode) {
    return (
      <div className="card" id="online-setup">
        <h3>🌐 Online Battle (3v3)</h3>
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

  if (phase === "waiting") {
    return (
      <div className="card" id="online-setup">
        <h3>🌐 Room Code: {roomCode}</h3>
        <div className="online-status">{status}</div>
        <button className="btn-secondary" onClick={leaveRoom}>Cancel</button>
      </div>
    );
  }

  if (phase === "picking") {
    return (
      <>
        <div className="card select-bar">
          <div>Room Code: <strong>{roomCode}</strong></div>
          <button className="btn-secondary" onClick={leaveRoom}>Leave Room</button>
        </div>
        {myLockedIn ? (
          <div className="card">
            <h3>✅ Team Locked In</h3>
            <div className="online-status">{status || "Waiting for your opponent to lock in their team..."}</div>
          </div>
        ) : (
          <TeamPicker inventory={inventory} onSubmit={lockIn} />
        )}
      </>
    );
  }

  if (!battle || !mySlot) return null;

  const youTeamState = mySlot === 1 ? battle.team1 : battle.team2;
  const oppTeamState = mySlot === 1 ? battle.team2 : battle.team1;
  const you = youTeamState.members[youTeamState.activeIndex];
  const opp = oppTeamState.members[oppTeamState.activeIndex];

  const myForcedSwitch = battle.awaitingForcedSwitch === mySlot;
  const blockedByOpponentSwitch = battle.awaitingForcedSwitch === (mySlot === 1 ? 2 : 1);
  const canSwitchNow = !battle.over && (myForcedSwitch || (!moveLocked && !battle.awaitingForcedSwitch));
  const canAttackNow = !battle.over && !moveLocked && !battle.awaitingForcedSwitch;

  return (
    <>
      <div className="card select-bar">
        <div>Room Code: <strong>{roomCode}</strong> — share this with your opponent</div>
        <button className="btn-secondary" onClick={leaveRoom}>Leave Room</button>
      </div>

      <div className="arena-frame">
        <FighterCard
          title={`You: #${you.pokemon.number} ${you.pokemon.name}`}
          pokemon={you.pokemon}
          hp={you.hp}
          maxHp={you.maxHp}
          mp={you.mp}
          maxMp={you.maxMp}
          movesCaption={myForcedSwitch ? "Choose your next Pokémon:" : "Select Attack Move:"}
          team={youTeamState.members}
          activeIndex={youTeamState.activeIndex}
          onSwitchTo={canSwitchNow ? (i) => submitAction({ type: "switch", teamIndex: i as 0 | 1 | 2 }) : undefined}
        >
          {!myForcedSwitch && (
            <div className="moves-grid">
              {[0, 1, 2, 3].map((i) => {
                const move = you.pokemon.moves[i];
                if (!move) return <button key={i} className="move-btn" disabled>--</button>;
                const insufficientMana = you.mp < (move.mana_cost ?? 10);
                return (
                  <MoveButton
                    key={i}
                    move={move}
                    disabled={!canAttackNow || insufficientMana}
                    insufficientMana={insufficientMana}
                    onClick={() => submitAction({ type: "attack", moveIndex: i })}
                  />
                );
              })}
            </div>
          )}
        </FighterCard>

        <FighterCard
          title={`Opponent: #${opp.pokemon.number} ${opp.pokemon.name}`}
          pokemon={opp.pokemon}
          hp={opp.hp}
          maxHp={opp.maxHp}
          mp={opp.mp}
          maxMp={opp.maxMp}
          movesCaption=""
          team={oppTeamState.members}
          activeIndex={oppTeamState.activeIndex}
        />
      </div>

      <div className="card log-container">
        <div className="online-status">{blockedByOpponentSwitch ? "Opponent is choosing a new Pokémon..." : turnStatus}</div>
        <pre className="battle-log" ref={logRef}>{log.join("\n")}</pre>
      </div>
    </>
  );
}
