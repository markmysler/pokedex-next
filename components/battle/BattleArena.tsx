"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { BattleAction, OwnedPokemon, TeamState } from "@/types/pokemon";
import type { BotBattleState, BotBattleTurn } from "@/lib/botBattle";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { renderBattleLogEvent } from "@/lib/i18n/renderBattleLogEvent";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import TeamPicker from "@/components/online/TeamPicker";
import { useCaseCount } from "@/components/nav/CaseCount";
import Icon from "@/components/ui/Icon";
import BattleStage, { type StageTurn } from "./BattleStage";
import BattleResultDialog from "./BattleResultDialog";
import LootboxRevealDialog from "@/components/inventory/LootboxRevealDialog";
import { addToFeed, addToLastRound, type FeedRound } from "./feed";
import { playAttackSound, playDodgeSound, playFaintSound, playVictorySound, playDefeatSound } from "@/lib/sound";

interface BattleArenaProps {
  inventory: OwnedPokemon[];
  typesList: string[];
  // Home's "Quick battle" (/battle?team=best): start straight away with
  // these three instead of showing the team picker.
  quickTeamIds?: string[];
}

type Phase = "picking" | "battling";

interface MoveResponse {
  state: BotBattleState;
  turns: BotBattleTurn[];
  lootboxGranted: boolean;
  lootboxId: string | null;
}

// The server runs the whole bot battle (lib/botBattle.ts,
// app/api/battles/bot/**): this component sends the player's choice and
// renders the state and log that come back.
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

function startFeed(battle: BotBattleState, dict: Dictionary): FeedRound[] {
  const t = dict.battle.arena;
  const you = battle.team1.members[battle.team1.activeIndex].pokemon;
  const opp = battle.team2.members[battle.team2.activeIndex].pokemon;
  return [
    {
      key: "start",
      title: t.feedStart,
      lines: [
        { text: t.startBanner(you.name, opp.name) },
        { text: `-> ${t.yourTeam(battle.team1.members.map((m) => m.pokemon.name).join(", "))}` },
        { text: `-> ${t.opponentTeam(battle.team2.members.map((m) => m.pokemon.name).join(", "))}` },
      ],
    },
  ];
}

// First living bench member, for auto-battle's forced switch.
function firstAliveBenchIndex(team: TeamState): 0 | 1 | 2 | null {
  const i = team.members.findIndex((m, idx) => idx !== team.activeIndex && m.hp > 0);
  return i === -1 ? null : (i as 0 | 1 | 2);
}

export default function BattleArena({ inventory: initialInventory, typesList, quickTeamIds }: BattleArenaProps) {
  const dict = useDictionary();
  const t = dict.battle.arena;
  const { setCount: setCaseCount } = useCaseCount();
  const [inventory, setInventory] = useState(initialInventory);
  const [phase, setPhase] = useState<Phase>("picking");
  const [myTeamIds, setMyTeamIds] = useState<string[] | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [battle, setBattle] = useState<BotBattleState | null>(null);
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<FeedRound[]>([]);
  const [lastTurn, setLastTurn] = useState<StageTurn | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [resultDialog, setResultDialog] = useState<{ won: boolean; lootboxGranted: boolean; lootboxId: string | null } | null>(null);
  const [revealPokemon, setRevealPokemon] = useState<OwnedPokemon | null>(null);
  const turnSeq = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  // Quick battle from Home: start once, then drop ?team=best from the URL
  // so a reload doesn't start another battle.
  useEffect(() => {
    if (quickTeamIds?.length !== 3) return;
    router.replace(pathname, { scroll: false });
    startBattle(quickTeamIds).catch((err: Error) => setNotice(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openLootboxNow(lootboxId: string) {
    const res = await fetch(`/api/inventory/lootboxes/${lootboxId}/open`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      setNotice(t.couldntOpenLootbox(data.error));
      return;
    }
    const opened = data.pokemon as OwnedPokemon;
    setCaseCount((c) => c - 1);
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
    setNotice(null);
    setLastTurn(null);
    setBattle(state);
    setFeed(startFeed(state, dict));
    setPhase("battling");
  }

  async function resetBattle() {
    if (!myTeamIds) return;
    try {
      await startBattle(myTeamIds);
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  function changeTeam() {
    setAutoRunning(false);
    setResultDialog(null);
    setRevealPokemon(null);
    setBattle(null);
    setBattleId(null);
    setFeed([]);
    setLastTurn(null);
    setNotice(null);
    setPhase("picking");
  }

  function renderTurn(turn: BotBattleTurn) {
    const lines = turn.log.map((event) => renderBattleLogEvent(event, dict));
    setFeed((f) => addToFeed(f, `r${turn.turn}`, t.roundHeader(turn.turn), lines));
    setLastTurn({ id: `${turn.turn}-${++turnSeq.current}`, events: turn.events, lines });
    for (const ev of turn.events) {
      if (ev.hit) playAttackSound(ev.moveType);
      else playDodgeSound();
      if (ev.fainted) playFaintSound();
    }
  }

  async function submitAction(action: BattleAction) {
    if (!battle || battle.over || busy || !battleId) return;
    setNotice(null);

    // Same checks the server makes, so an impossible click doesn't cost a
    // round trip.
    if (battle.awaitingForcedSwitch === 1 && action.type !== "switch") return;
    if (action.type === "attack") {
      const active = battle.team1.members[battle.team1.activeIndex];
      const move = active.pokemon.moves[action.moveIndex];
      if (!move) return;
      if (active.moveUses[action.moveIndex] === 0) {
        setNotice(t.noUsesLeft(move.name));
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
      setNotice((err as Error).message);
      return;
    }

    const { state, turns, lootboxGranted, lootboxId } = response;
    const [round, botSwitch] = turns;
    renderTurn(round);

    if (state.over) {
      setAutoRunning(false);
      const won = state.winner === 1;
      setFeed((f) => addToLastRound(f, [{ text: won ? t.victory : t.defeat, kind: won ? "win" : "loss" }]));
      if (won) playVictorySound();
      else playDefeatSound();
      if (lootboxGranted) setCaseCount((c) => c + 1);
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

    // The bot's replacement after a faint: show the faint first, then the
    // new Pokémon a beat later.
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
  // component unmounts, so no separate timer bookkeeping is needed.
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
    return <p className="alert alert-info">{t.needThree}</p>;
  }

  if (phase === "picking" || !battle) {
    return <TeamPicker inventory={inventory} typesList={typesList} onSubmit={startBattle} />;
  }

  const myForcedSwitch = battle.awaitingForcedSwitch === 1;
  const blockedByBotSwitch = battle.awaitingForcedSwitch === 2;
  const status = battle.over
    ? battle.winner === 1 ? t.victory : t.defeat
    : busy ? t.resolving : blockedByBotSwitch ? t.opponentChoosing : t.selectPrompt;

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
        you={battle.team1}
        opp={battle.team2}
        oppLabel={t.botLabel}
        viewerSlot={1}
        canAttack={!battle.over && !busy && !battle.awaitingForcedSwitch}
        canSwitch={!battle.over && !busy && (myForcedSwitch || !battle.awaitingForcedSwitch)}
        forcedSwitch={myForcedSwitch && !battle.over}
        status={status}
        lastTurn={lastTurn}
        feed={feed}
        onAction={submitAction}
        toolbar={
          <>
            <span className="tag">{t.botLabel}</span>
            <span className="mono small muted">{t.roundHeader(battle.turnCount)}</span>
            {notice && <span className="small" style={{ color: "var(--bad)" }} role="alert">{notice}</span>}
            <span className="row row-end">
              <button type="button" className={autoRunning ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={toggleAutoBattle}>
                <Icon name={autoRunning ? "pause" : "zap"} size={14} /> {autoRunning ? t.pauseBattle : battle.over ? t.newBattle : t.autoBattle}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={resetBattle}>
                <Icon name="refresh" size={14} /> {t.resetBattle}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={changeTeam}>
                <Icon name="users" size={14} /> {t.changeTeam}
              </button>
            </span>
          </>
        }
      />
    </>
  );
}
