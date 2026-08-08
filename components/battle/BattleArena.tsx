"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleAction, FighterState, OwnedPokemon, RoomSlot, TeamState } from "@/types/pokemon";
import { buildTeamState, resolveTeamRound } from "@/lib/battleEngine";
import { rollBotTeam } from "@/lib/collection";
import TeamPicker from "@/components/online/TeamPicker";
import FighterCard from "./FighterCard";
import MoveButton from "./MoveButton";
import BattleResultDialog from "./BattleResultDialog";
import LootboxRevealDialog from "@/components/inventory/LootboxRevealDialog";
import { playAttackSound, playDodgeSound, playFaintSound, playVictorySound, playDefeatSound } from "@/lib/sound";

interface BattleArenaProps {
  inventory: OwnedPokemon[];
  typesList: string[];
}

type Phase = "picking" | "battling";

interface LocalBattleState {
  team1: TeamState;
  team2: TeamState;
  awaitingForcedSwitch: RoomSlot | null;
  turnCount: number;
  over: boolean;
  winner: RoomSlot | null;
}

function freshBattle(myTeam: OwnedPokemon[]): LocalBattleState {
  const playerTeamAverageTotal = myTeam.reduce((sum, p) => sum + p.total, 0) / myTeam.length;
  return {
    team1: buildTeamState(myTeam),
    team2: buildTeamState(rollBotTeam(playerTeamAverageTotal)),
    awaitingForcedSwitch: null,
    turnCount: 0,
    over: false,
    winner: null,
  };
}

function startLog(battle: LocalBattleState): string[] {
  const you = battle.team1.members[battle.team1.activeIndex].pokemon;
  const opp = battle.team2.members[battle.team2.activeIndex].pokemon;
  return [
    `=== ⚔️ 3v3 BATTLE START: ${you.name} vs a wild ${opp.name} ===`,
    `• Your team: ${battle.team1.members.map((m) => m.pokemon.name).join(", ")}`,
    `• Opponent's team: ${battle.team2.members.map((m) => m.pokemon.name).join(", ")}\n`,
    "👇 Select an Attack Move or switch Pokémon below.",
  ];
}

// Returns whether a lootbox was actually granted (server-rolled — see
// app/api/battles/bot-result/route.ts's 25% chance) and its id, so the
// result dialog can say so truthfully instead of assuming "won = lootbox,"
// and its "Open it now" (upgrades/04-lootbox-opening.md) can target this
// exact lootbox.
async function reportBotResult(
  won: boolean,
  team: OwnedPokemon[]
): Promise<{ lootboxGranted: boolean; lootboxId: string | null }> {
  try {
    const res = await fetch("/api/battles/bot-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ won, team: team.map((p) => ({ number: p.number, name: p.name })) }),
    });
    const data = await res.json();
    return { lootboxGranted: Boolean(data.lootboxGranted), lootboxId: (data.lootboxId as string | null) ?? null };
  } catch {
    // Best-effort — a dropped report just costs a possible lootbox roll,
    // not a broken battle. The battle itself is already fully resolved
    // client-side by this point, and nothing was granted server-side if the
    // request never landed, so "false"/null is accurate here, not a guess.
    return { lootboxGranted: false, lootboxId: null };
  }
}

function cloneTeam(team: TeamState): TeamState {
  return {
    members: team.members.map((m) => ({ ...m })) as [FighterState, FighterState, FighterState],
    activeIndex: team.activeIndex,
  };
}

// Simple decision logic, mirrors the old 1v1 bot: random affordable move, or
// the cheapest one available if nothing is affordable (mp floors at 0 rather
// than going negative, so this is always safe to submit).
function pickBotAttackAction(team: TeamState): BattleAction {
  const active = team.members[team.activeIndex];
  const moves = active.pokemon.moves;
  const affordable = moves.map((_, i) => i).filter((i) => (moves[i].mana_cost ?? 10) <= active.mp);
  if (affordable.length) {
    return { type: "attack", moveIndex: affordable[Math.floor(Math.random() * affordable.length)] };
  }
  let cheapestIndex = 0;
  let cheapestCost = Infinity;
  moves.forEach((m, i) => {
    const cost = m.mana_cost ?? 10;
    if (cost < cheapestCost) {
      cheapestCost = cost;
      cheapestIndex = i;
    }
  });
  return { type: "attack", moveIndex: cheapestIndex };
}

function firstAliveBenchIndex(team: TeamState): 0 | 1 | 2 | null {
  const i = team.members.findIndex((m, idx) => idx !== team.activeIndex && m.hp > 0);
  return i === -1 ? null : (i as 0 | 1 | 2);
}

export default function BattleArena({ inventory, typesList }: BattleArenaProps) {
  const [phase, setPhase] = useState<Phase>("picking");
  const [myTeam, setMyTeam] = useState<OwnedPokemon[] | null>(null);
  const [battle, setBattle] = useState<LocalBattleState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [resultDialog, setResultDialog] = useState<{ won: boolean; lootboxGranted: boolean; lootboxId: string | null } | null>(null);
  const [revealPokemon, setRevealPokemon] = useState<OwnedPokemon | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  function appendLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines]);
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  async function openLootboxNow(lootboxId: string) {
    const res = await fetch(`/api/inventory/lootboxes/${lootboxId}/open`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      appendLog([`⚠️ Couldn't open lootbox: ${data.error}`]);
      return;
    }
    setResultDialog(null);
    setRevealPokemon(data.pokemon as OwnedPokemon);
  }

  async function startBattle(ids: string[]) {
    const team = ids.map((id) => inventory.find((p) => p.id === id)).filter((p): p is OwnedPokemon => Boolean(p));
    if (team.length !== 3) throw new Error("Pick exactly 3 Pokémon");
    setMyTeam(team);
    setAutoRunning(false);
    setResultDialog(null);
    setRevealPokemon(null);
    const fresh = freshBattle(team);
    setBattle(fresh);
    setLog(startLog(fresh));
    setPhase("battling");
  }

  function resetBattle() {
    if (!myTeam) return;
    setAutoRunning(false);
    setResultDialog(null);
    setRevealPokemon(null);
    const fresh = freshBattle(myTeam);
    setBattle(fresh);
    setLog(startLog(fresh));
  }

  function changeTeam() {
    setAutoRunning(false);
    setResultDialog(null);
    setRevealPokemon(null);
    setBattle(null);
    setLog([]);
    setPhase("picking");
  }

  function submitAction(action: BattleAction) {
    if (!battle || battle.over) return;

    // Forced switch: only the side whose active fainted may act, and only
    // with a switch — mirrors the online room's same rule.
    if (battle.awaitingForcedSwitch === 2) return; // bot resolves its own forced switch automatically
    if (battle.awaitingForcedSwitch === 1) {
      if (action.type !== "switch") return;
      const target = battle.team1.members[action.teamIndex];
      if (!target || action.teamIndex === battle.team1.activeIndex || target.hp <= 0) return;

      const fromName = battle.team1.members[battle.team1.activeIndex].pokemon.name;
      const toName = target.pokemon.name;
      const team1: TeamState = { members: battle.team1.members, activeIndex: action.teamIndex };
      const nextTurn = battle.turnCount + 1;
      appendLog([`\n--- 🥊 Round ${nextTurn} ---`, `↩️ ${fromName} is withdrawn! ${toName}, go!`]);
      setBattle({ ...battle, team1, awaitingForcedSwitch: null, turnCount: nextTurn });
      return;
    }

    if (action.type === "attack") {
      const active = battle.team1.members[battle.team1.activeIndex];
      const move = active.pokemon.moves[action.moveIndex];
      if (!move) return;
      const cost = move.mana_cost ?? 10;
      if (active.mp < cost) {
        appendLog([`⚠️ Not enough Mana for ${move.name}! (Requires ${cost} MP, have ${active.mp} MP)`]);
        return;
      }
    } else {
      const target = battle.team1.members[action.teamIndex];
      if (!target || action.teamIndex === battle.team1.activeIndex || target.hp <= 0) return;
    }

    const action2 = pickBotAttackAction(battle.team2);
    const team1 = cloneTeam(battle.team1);
    const team2 = cloneTeam(battle.team2);
    const nextTurn = battle.turnCount + 1;
    const result = resolveTeamRound(team1, team2, action, action2);

    appendLog([`\n--- 🥊 Round ${nextTurn} ---`, ...result.log]);

    // One sound per structured event (upgrades/10-battle-depth.md's `events`
    // array) rather than parsing the log strings above.
    for (const ev of result.events) {
      if (ev.hit) playAttackSound(ev.moveType);
      else playDodgeSound();
      if (ev.fainted) playFaintSound();
    }

    if (result.over) {
      setAutoRunning(false);
      const won = result.winner === 1;
      appendLog([won ? "\n🏆 VICTORY! The opponent's whole team fainted!" : "\n💀 DEFEAT! Your whole team fainted!"]);
      if (won) playVictorySound();
      else playDefeatSound();
      // Server rolls the lootbox chance itself — this only ever reports
      // win/loss, never "and I should get a lootbox."
      if (myTeam) {
        reportBotResult(won, myTeam).then(({ lootboxGranted, lootboxId }) => setResultDialog({ won, lootboxGranted, lootboxId }));
      }
    }

    setBattle({
      team1,
      team2,
      awaitingForcedSwitch: result.awaitingForcedSwitch,
      turnCount: nextTurn,
      over: result.over,
      winner: result.winner,
    });
  }

  function toggleAutoBattle() {
    if (!battle) return;
    if (battle.over) {
      resetBattle();
      return;
    }
    setAutoRunning((running) => !running);
  }

  // Bot's own forced switch resolves itself — there's no opponent player to
  // wait on locally, so this is a short beat rather than an instant jump.
  useEffect(() => {
    if (!battle || battle.over || battle.awaitingForcedSwitch !== 2) return;

    const timer = setTimeout(() => {
      const teamIndex = firstAliveBenchIndex(battle.team2);
      if (teamIndex === null) return; // shouldn't happen — a wiped team already ended the battle
      const fromName = battle.team2.members[battle.team2.activeIndex].pokemon.name;
      const toName = battle.team2.members[teamIndex].pokemon.name;
      const team2: TeamState = { members: battle.team2.members, activeIndex: teamIndex };
      const nextTurn = battle.turnCount + 1;
      appendLog([`\n--- 🥊 Round ${nextTurn} ---`, `↩️ ${fromName} is withdrawn! ${toName}, go!`]);
      setBattle({ ...battle, team2, awaitingForcedSwitch: null, turnCount: nextTurn });
    }, 600);

    return () => clearTimeout(timer);
  }, [battle]);

  // Auto-battle scheduling: this effect's own cleanup (returned setTimeout
  // cancellation) fires whenever `autoRunning`/`battle` change or the
  // component unmounts, so no separate imperative timer-ref bookkeeping is
  // needed elsewhere (e.g. resetBattle()/toggleAutoBattle() just flip state).
  useEffect(() => {
    if (!autoRunning || !battle || battle.over || battle.awaitingForcedSwitch === 2) return;

    const timer = setTimeout(() => {
      if (battle.awaitingForcedSwitch === 1) {
        const teamIndex = firstAliveBenchIndex(battle.team1);
        if (teamIndex !== null) submitAction({ type: "switch", teamIndex });
        return;
      }
      const active = battle.team1.members[battle.team1.activeIndex];
      const moves = active.pokemon.moves;
      const affordable = moves.map((_, i) => i).filter((i) => (moves[i].mana_cost ?? 10) <= active.mp);
      if (affordable.length) {
        submitAction({ type: "attack", moveIndex: affordable[Math.floor(Math.random() * affordable.length)] });
      } else if (moves.length) {
        submitAction({ type: "attack", moveIndex: Math.floor(Math.random() * moves.length) });
      }
    }, 750);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunning, battle]);

  if (inventory.length < 3) {
    return (
      <div className="card">
        <p>You need at least 3 Pokémon to start a 3v3 battle. This shouldn&apos;t normally happen — every account starts with 3 starters.</p>
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
  const canAttackNow = !battle.over && !battle.awaitingForcedSwitch;
  const canSwitchNow = !battle.over && (myForcedSwitch || !battle.awaitingForcedSwitch);

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
        <LootboxRevealDialog pokemon={revealPokemon} onClose={() => setRevealPokemon(null)} />
      )}

      <div className="card select-bar">
        <div className="vs-badge">
          <div className="vs-text">⚡ 3v3 VS ⚡</div>
        </div>
        <div className="fighter-select">
          <div className="online-status">🎲 Bot team randomly generated, matched to your team&apos;s level</div>
        </div>
        <button className="btn-secondary" onClick={changeTeam}>🔁 Change Team</button>
      </div>

      <div className="arena-frame">
        <FighterCard
          title="You: "
          pokemon={you.pokemon}
          hp={you.hp}
          maxHp={you.maxHp}
          mp={you.mp}
          maxMp={you.maxMp}
          bleedTurns={you.bleedTurns}
          blindTurns={you.blindTurns}
          poisonTurns={you.poisonTurns}
          burnTurns={you.burnTurns}
          freezeTurns={you.freezeTurns}
          movesCaption={myForcedSwitch ? "Choose your next Pokémon:" : "Select Attack Move:"}
          team={battle.team1.members}
          activeIndex={battle.team1.activeIndex}
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
          title=""
          pokemon={opp.pokemon}
          hp={opp.hp}
          maxHp={opp.maxHp}
          mp={opp.mp}
          maxMp={opp.maxMp}
          bleedTurns={opp.bleedTurns}
          blindTurns={opp.blindTurns}
          poisonTurns={opp.poisonTurns}
          burnTurns={opp.burnTurns}
          freezeTurns={opp.freezeTurns}
          movesCaption=""
          team={battle.team2.members}
          activeIndex={battle.team2.activeIndex}
        />
      </div>

      <div className="card log-container">
        <div className="action-row">
          <button className="btn-primary" onClick={toggleAutoBattle}>
            {autoRunning ? "⏸️ Pause Battle" : battle.over ? "⚡ New Battle" : "⚡ Auto Battle"}
          </button>
          <button className="btn-secondary" onClick={resetBattle}>🔄 Reset Battle</button>
        </div>
        <div className="online-status">{blockedByBotSwitch ? "Opponent is choosing a new Pokémon..." : ""}</div>
        <pre className="battle-log" ref={logRef}>{log.join("\n")}</pre>
      </div>
    </>
  );
}
