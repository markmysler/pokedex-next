"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleAction, OwnedPokemon, RoomSlot, TeamState } from "@/types/pokemon";
import BattleStage, { type StageTurn } from "@/components/battle/BattleStage";
import { addToFeed, addToLastRound, type FeedRound } from "@/components/battle/feed";
import BattleResultDialog from "@/components/battle/BattleResultDialog";
import LootboxRevealDialog from "@/components/inventory/LootboxRevealDialog";
import Icon from "@/components/ui/Icon";
import { useCaseCount } from "@/components/nav/CaseCount";
import TeamPicker from "./TeamPicker";
import ChatPanel, { type ChatMessage } from "./ChatPanel";
import { useRoomChannel, type RoundResultPayload } from "./useRoomChannel";
import type { BattleEvent, BattleLogEvent } from "@/lib/battleEngine";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { renderBattleLogEvent, type RenderedLogLine } from "@/lib/i18n/renderBattleLogEvent";
import { playAttackSound, playDodgeSound, playFaintSound, playVictorySound, playDefeatSound } from "@/lib/sound";

interface OnlineBattleProps {
  inventory: OwnedPokemon[];
  displayName: string;
  typesList: string[];
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

export default function OnlineBattle({ inventory: initialInventory, displayName, typesList }: OnlineBattleProps) {
  const dict = useDictionary();
  const t = dict.battle.online;
  // Local copy, not just the prop directly -- `initialInventory` is a
  // server-render snapshot from when /online first loaded. A lootbox opened
  // mid-session (e.g. right after a win, via the "Open it now" flow below)
  // persists a real new pokemon_instances row without any navigation/
  // reload, so without this the newly-caught Pokemon would never appear as
  // a TeamPicker option on the rematch that follows.
  const [inventory, setInventory] = useState(initialInventory);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mySlot, setMySlot] = useState<RoomSlot | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [myLockedIn, setMyLockedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [turnStatus, setTurnStatus] = useState("");
  const [battle, setBattle] = useState<OnlineBattleState | null>(null);
  const [feed, setFeed] = useState<FeedRound[]>([]);
  const [lastTurn, setLastTurn] = useState<StageTurn | null>(null);
  const [copied, setCopied] = useState(false);
  const { setCount: setCaseCount } = useCaseCount();
  const [moveLocked, setMoveLocked] = useState(false);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<RoomSlot | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [resultDialog, setResultDialog] = useState<{ won: boolean; lootboxGranted: boolean; lootboxId: string | null } | null>(null);
  const [revealPokemon, setRevealPokemon] = useState<OwnedPokemon | null>(null);
  // Awaiting a target choice for this move index (upgrades/28-move-ui-and
  // -ally-targeting.md) -- only ever set for a buff move whose caster has
  // a living ally; every other move submits immediately with no picker.
  const mySlotRef = useRef<RoomSlot | null>(null);
  const lockedInRef = useRef(false);
  const phaseRef = useRef<Phase>("setup");
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
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Deep-link from a friend battle invite (upgrades/05-friend-system.md):
  // the invite toast's "Accept" already called POST /api/rooms/[code]/join
  // (or, for the inviter, the Friends page already called POST /api/rooms)
  // before navigating here — this just picks up the resulting room code
  // client-side instead of re-running the create/join screen. Reads
  // window.location directly (not useSearchParams()) since this only needs
  // to run once after a client-side navigation, not react to SSR.
  //
  // This has to be an effect, not render-time or a lazy useState initializer:
  // window is unavailable during SSR/the initial hydration render, so
  // hydrating this deep-link state has to happen after mount — the
  // react-hooks/set-state-in-effect warning below is a known false positive
  // for exactly this "adopt state from a browser-only source" case.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    const upperCode = code.toUpperCase();
    const isHost = params.get("host") === "1";
    mySlotRef.current = isHost ? 1 : 2;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMySlot(isHost ? 1 : 2);
    setRoomCode(upperCode);
    if (isHost) {
      setPhase("waiting");
      setStatus(t.roomCreated(upperCode));
    } else {
      setPhase("picking");
      setStatus(t.joinedPickTeam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notices outside a round (opponent left, a failed case open) join the
  // current round of the battle feed.
  function appendLog(lines: RenderedLogLine[]) {
    setFeed((prev) => addToLastRound(prev, lines));
  }

  function startLogFor(team1: TeamState, team2: TeamState, slot: RoomSlot) {
    const you = slot === 1 ? team1 : team2;
    const opp = slot === 1 ? team2 : team1;
    const youActive = you.members[you.activeIndex].pokemon.name;
    const oppActive = opp.members[opp.activeIndex].pokemon.name;
    setFeed([
      {
        key: "start",
        title: dict.battle.arena.feedStart,
        lines: [
          { text: t.startBanner(youActive, oppActive) },
          { text: `-> ${t.yourTeam(you.members.map((m) => m.pokemon.name).join(", "))}` },
          { text: `-> ${t.opponentTeam(opp.members.map((m) => m.pokemon.name).join(", "))}` },
        ],
      },
    ]);
    setLastTurn(null);
    setTurnStatus(t.selectPrompt);
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
    log?: BattleLogEvent[];
    // Same "only present via the broadcast/HTTP paths" caveat as
    // lootboxId below — the poll backstop reads persisted RoomState, which
    // has no ephemeral per-round data. Sounds simply don't fire for that
    // resync path, same degradation as `log`'s fallback line already has.
    events?: BattleEvent[];
    lootboxGranted?: boolean;
    // Only present via the broadcast/HTTP paths, not the poll backstop
    // (which reads persisted RoomState, not this ephemeral payload) — see
    // upgrades/04-lootbox-opening.md. "Open it now" just doesn't render in
    // that fallback case; the player can still find it in Inventory.
    lootboxId?: string | null;
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
    const lines = payload.log ? payload.log.map((event) => renderBattleLogEvent(event, dict)) : [{ text: t.syncedFromServer }];
    setFeed((prev) => addToFeed(prev, `r${payload.turnCount}`, t.roundHeader(payload.turnCount), lines));
    setLastTurn({ id: String(payload.turnCount), events: payload.events ?? [], lines });

    // One sound per structured event (upgrades/10-battle-depth.md's `events`
    // array) rather than parsing the log strings above — undefined via the
    // poll backstop, which just means no sounds fire for that resync path.
    for (const ev of payload.events ?? []) {
      if (ev.hit) playAttackSound(ev.moveType);
      else playDodgeSound();
      if (ev.fainted) playFaintSound();
    }

    if (payload.over) {
      const won = payload.winner === mySlotRef.current;
      appendLog([{ text: won ? t.victory : t.defeat, kind: won ? "win" : "loss" }]);
      if (won) playVictorySound();
      else playDefeatSound();
      setTurnStatus(won ? t.youWon : t.youLost);
      // Keeps the top bar's case counter in step with the win's case.
      if (won && payload.lootboxGranted) setCaseCount((c) => c + 1);
      // Trigger the result dialog from here, not a separate effect watching
      // battle?.over — this function only runs once per real turnCount
      // transition (dedup check above), so a naive effect would instead
      // refire on every re-render after the player dismisses the dialog,
      // since battle.over stays true for the rest of the session.
      setResultDialog({ won, lootboxGranted: won && Boolean(payload.lootboxGranted), lootboxId: won ? (payload.lootboxId ?? null) : null });
    } else if (payload.awaitingForcedSwitch === mySlotRef.current) {
      setTurnStatus(t.yourPokemonFainted);
    } else if (payload.awaitingForcedSwitch) {
      setTurnStatus(t.opponentPokemonFaintedWaiting);
    } else {
      setTurnStatus(t.selectNextMove);
    }
  }

  const { sendChatMessage } = useRoomChannel(roomCode, {
    onOpponentJoined: () => {
      resetForRematch();
      setStatus(t.opponentJoinedPickTeam);
    },
    onPlayerLockedIn: ({ slot }) => {
      if (slot !== mySlotRef.current && !lockedInRef.current) {
        setStatus(t.opponentLockedInPickYours);
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
        events: payload.events,
        lootboxGranted: payload.lootboxGranted,
        lootboxId: payload.lootboxId,
      });
    },
    onOpponentMoveSubmitted: () => {
      setMoveLocked((locked) => {
        if (!locked) setTurnStatus(t.opponentActedWaiting);
        return locked;
      });
    },
    onOpponentLeft: ({ forfeit }) => {
      appendLog([{ text: forfeit ? t.opponentForfeited : t.opponentLeft }]);
      setTurnStatus(t.opponentDisconnected);
      setTimeout(resetToSetup, 2000);
    },
    onRematchRequested: ({ slot }) => {
      setRematchRequestedBy(slot);
    },
    onRematchStarted: () => {
      resetForRematch();
    },
    onChatMessage: ({ text, senderDisplayName }) => {
      setChatMessages((prev) => [...prev, { text, senderDisplayName, mine: false }]);
    },
  });

  function sendChat(text: string) {
    setChatMessages((prev) => [...prev, { text, senderDisplayName: displayName, mine: true }]);
    sendChatMessage({ text, senderDisplayName: displayName });
  }

  // Polling backstop: Realtime broadcast is the fast path, but this
  // guarantees the game can't get permanently stuck if a broadcast doesn't
  // arrive — applyBattleStart/applyRoundResult dedupe against whichever
  // source (broadcast, own move response, or this poll) reports first.
  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (!res.ok) return;
        const data = await res.json();
        const roomStatus = data.status as string | undefined;
        const state = data.state as
          | {
              team1?: TeamState;
              team2?: TeamState;
              turnCount: number;
              over: boolean;
              winner: RoomSlot | null;
              awaitingForcedSwitch: RoomSlot | null;
              rematchRequestedBy?: RoomSlot | null;
            }
          | undefined;

        if (roomStatus === "picking") {
          // Covers both "opponent just joined" (from waiting) and "rematch
          // accepted" (from battling/over) — resetForRematch is idempotent
          // either way, so no need to distinguish which.
          if (phaseRef.current !== "picking") resetForRematch();
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
              // Persisted RoomState doesn't carry the ephemeral round-result
              // payload's lootboxGranted field, but online wins are
              // unconditional (100%, see recordBattleEnd) — so this is
              // exactly as accurate as the broadcast/HTTP path's value.
              lootboxGranted: Boolean(state.over && state.winner),
            });
          }
        } else if (roomStatus === "over") {
          const requestedBy = state?.rematchRequestedBy ?? null;
          setRematchRequestedBy((prev) => (prev === requestedBy ? prev : requestedBy));
        }
      } catch {
        // transient network hiccup — next poll tick will retry
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // applyBattleStart/applyRoundResult/resetForRematch only close over refs
    // and setState setters (all stable across renders), never over stale
    // state, so omitting them here is intentional, not a staleness bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  function resetToSetup() {
    setRoomCode(null);
    setMySlot(null);
    setPhase("setup");
    setMyLockedIn(false);
    setBattle(null);
    setFeed([]);
    setLastTurn(null);
    setMoveLocked(false);
    setStatus("");
    setTurnStatus("");
    setRoomCodeInput("");
    setRematchRequestedBy(null);
    setChatMessages([]);
    setResultDialog(null);
    setRevealPokemon(null);
    lastTurnRef.current = null;
  }

  // Drops back into the picking phase for the *same* room/room code — used
  // both when a rematch is accepted and (idempotently) whenever the poll
  // backstop notices the room is in "picking" but this client hasn't caught
  // up yet. Deliberately mirrors step 5's initial picking-phase state so the
  // reused TeamPicker/lock-in flow behaves identically to a fresh room.
  function resetForRematch() {
    setBattle(null);
    setFeed([]);
    setLastTurn(null);
    setMoveLocked(false);
    setMyLockedIn(false);
    setTurnStatus("");
    setStatus("");
    setRematchRequestedBy(null);
    setChatMessages([]);
    setResultDialog(null);
    setRevealPokemon(null);
    setPhase("picking");
    lastTurnRef.current = null;
  }

  async function openLootboxNow(lootboxId: string) {
    const res = await fetch(`/api/inventory/lootboxes/${lootboxId}/open`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      appendLog([{ text: t.couldntOpenLootbox(data.error) }]);
      return;
    }
    const opened = data.pokemon as OwnedPokemon;
    setCaseCount((c) => c - 1);
    setResultDialog(null);
    setRevealPokemon(opened);
    setInventory((prev) => [...prev, opened]);
  }

  async function createRoom() {
    const res = await fetch("/api/rooms", { method: "POST" });
    const data = await res.json();
    if (data.error) return setStatus(t.genericError(data.error));

    setMySlot(1);
    mySlotRef.current = 1;
    setRoomCode(data.roomCode);
    setPhase("waiting");
    setStatus(t.roomCreated(data.roomCode));
  }

  async function joinRoom() {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return setStatus(t.enterRoomCodeFirst);

    const res = await fetch(`/api/rooms/${code}/join`, { method: "POST" });
    const data = await res.json();
    if (data.error) return setStatus(t.genericError(data.error));

    setMySlot(2);
    mySlotRef.current = 2;
    setRoomCode(data.roomCode);
    setPhase("picking");
    setStatus(t.joinedPickTeam);
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
      setStatus(t.waitingOpponentLockIn);
    }
  }

  async function submitAction(action: BattleAction) {
    if (!battle || battle.over || !roomCode) return;
    const isMyForcedSwitch = battle.awaitingForcedSwitch === mySlot;
    if (!isMyForcedSwitch) {
      if (moveLocked || battle.awaitingForcedSwitch) return; // my turn to act is blocked right now
      setMoveLocked(true);
      setTurnStatus(t.actionSubmittedWaiting);
    }

    const res = await fetch(`/api/rooms/${roomCode}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.error) {
      setMoveLocked(false);
      setTurnStatus(t.genericError(data.error));
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
        events: data.events,
        lootboxGranted: data.lootboxGranted,
        lootboxId: data.lootboxId,
      });
    }
  }

  async function requestRematch() {
    if (!roomCode) return;
    const res = await fetch(`/api/rooms/${roomCode}/rematch/request`, { method: "POST" });
    const data = await res.json();
    if (data.error) return setStatus(t.genericError(data.error));
    setRematchRequestedBy(mySlot);
  }

  async function acceptRematch() {
    if (!roomCode) return;
    const res = await fetch(`/api/rooms/${roomCode}/rematch/accept`, { method: "POST" });
    const data = await res.json();
    if (data.error) return setStatus(t.genericError(data.error));
    resetForRematch();
  }


  async function copyCode() {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); the
      // code is on screen to copy by hand.
    }
  }

  const chat = <ChatPanel messages={chatMessages} onSend={sendChat} />;

  const roomBar = roomCode && (
    <div className="room-bar">
      <span className="eyebrow">{t.roomCodeLabel}</span>
      <button type="button" className="room-code" onClick={copyCode} title={t.copyCode}>
        {roomCode} <Icon name={copied ? "check" : "copy"} size={14} />
      </button>
      {status && <span className="small muted">{status}</span>}
      <button type="button" className="btn-ghost btn-sm row-end" onClick={leaveRoom}>
        <Icon name="door" size={14} /> {t.leaveRoom}
      </button>
    </div>
  );

  if (!roomCode) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <div className="online-setup">
          <section className="panel online-card">
            <span className="online-card-icon"><Icon name="plus" size={22} /></span>
            <h2>{t.hostTitle}</h2>
            <p className="muted small">{t.hostBody}</p>
            <button type="button" className="btn-primary" onClick={createRoom}>{t.createRoom}</button>
          </section>
          <form
            className="panel online-card"
            onSubmit={(e) => {
              e.preventDefault();
              void joinRoom();
            }}
          >
            <span className="online-card-icon"><Icon name="door" size={22} /></span>
            <h2>{t.joinTitle}</h2>
            <p className="muted small">{t.joinBody}</p>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                className="code-input"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                maxLength={6}
                placeholder={t.joinCodePlaceholder}
                aria-label={t.joinCodePlaceholder}
              />
              <button type="submit" className="btn-secondary">{t.joinRoom}</button>
            </div>
          </form>
        </div>
        {status && <p className="alert alert-error" role="alert">{status}</p>}
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="online-split">
        <section className="panel waiting-card">
          <span className="eyebrow">{t.waitingLabel}</span>
          <button type="button" className="room-code room-code-lg" onClick={copyCode} title={t.copyCode}>
            {roomCode} <Icon name={copied ? "check" : "copy"} size={20} />
          </button>
          <p className="muted">{t.waitingBody}</p>
          <span className="waiting-dots" aria-hidden="true"><span /><span /><span /></span>
          <button type="button" className="btn-ghost" onClick={leaveRoom}>{t.cancel}</button>
        </section>
        {chat}
      </div>
    );
  }

  if (phase === "picking") {
    return (
      <div className="stack" style={{ gap: 16 }}>
        {roomBar}
        {myLockedIn ? (
          <div className="online-split">
            <section className="panel waiting-card">
              <span className="tag tag-good"><Icon name="check" size={13} /> {t.teamLockedIn}</span>
              <p className="muted">{t.waitingOpponentLockIn}</p>
              <span className="waiting-dots" aria-hidden="true"><span /><span /><span /></span>
            </section>
            {chat}
          </div>
        ) : (
          <>
            <TeamPicker inventory={inventory} typesList={typesList} onSubmit={lockIn} />
            {chat}
          </>
        )}
      </div>
    );
  }

  if (!battle || !mySlot) return null;

  const youTeamState = mySlot === 1 ? battle.team1 : battle.team2;
  const oppTeamState = mySlot === 1 ? battle.team2 : battle.team1;

  const myForcedSwitch = battle.awaitingForcedSwitch === mySlot;
  const blockedByOpponentSwitch = battle.awaitingForcedSwitch === (mySlot === 1 ? 2 : 1);
  const canSwitchNow = !battle.over && (myForcedSwitch || (!moveLocked && !battle.awaitingForcedSwitch));
  const canAttackNow = !battle.over && !moveLocked && !battle.awaitingForcedSwitch;

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
      {revealPokemon && <LootboxRevealDialog pokemon={revealPokemon} onClose={() => setRevealPokemon(null)} />}

      <BattleStage
        you={youTeamState}
        opp={oppTeamState}
        oppLabel={t.opponentLabel}
        viewerSlot={mySlot}
        canAttack={canAttackNow}
        canSwitch={canSwitchNow}
        forcedSwitch={myForcedSwitch && !battle.over}
        status={blockedByOpponentSwitch ? t.opponentChoosing : turnStatus}
        lastTurn={lastTurn}
        feed={feed}
        onAction={submitAction}
        toolbar={
          <>
            {roomBar}
            {battle.over && (
              <div className="rematch-bar">
                <b>{t.rematch}</b>
                {rematchRequestedBy === null && (
                  <button type="button" className="btn-primary btn-sm" onClick={requestRematch}>
                    <Icon name="refresh" size={14} /> {t.requestRematch}
                  </button>
                )}
                {rematchRequestedBy === mySlot && <span className="small muted">{t.rematchRequestedWaiting}</span>}
                {rematchRequestedBy !== null && rematchRequestedBy !== mySlot && (
                  <>
                    <span className="small">{t.opponentWantsRematch}</span>
                    <button type="button" className="btn-primary btn-sm" onClick={acceptRematch}>{t.acceptRematch}</button>
                  </>
                )}
              </div>
            )}
          </>
        }
        aside={chat}
      />
    </>
  );
}
