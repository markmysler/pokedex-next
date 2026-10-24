"use client";

import { useState, type ReactNode } from "react";
import type { BattleAction, FighterState, RoomSlot, TeamState } from "@/types/pokemon";
import { hasLivingAlly, type BattleEvent } from "@/lib/battleEngine";
import type { RenderedLogLine } from "@/lib/i18n/renderBattleLogEvent";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import Icon from "@/components/ui/Icon";
import MoveButton from "./MoveButton";
import StatusChips from "./StatusChips";
import { feedLineParts, type FeedRound } from "./feed";

export interface StageTurn {
  // Changes every round, so the hit/damage animations replay.
  id: string;
  events: BattleEvent[];
  lines: RenderedLogLine[];
}

interface BattleStageProps {
  you: TeamState;
  opp: TeamState;
  oppLabel: string;
  // Which RoomSlot the viewer is, to tell whose hits are whose.
  viewerSlot: RoomSlot;
  canAttack: boolean;
  canSwitch: boolean;
  forcedSwitch: boolean;
  // One line under the dock: whose turn it is, what we're waiting on.
  status: string;
  lastTurn: StageTurn | null;
  feed: FeedRound[];
  onAction: (action: BattleAction) => void;
  // Controls above the field (auto battle, restart, room code...).
  toolbar?: ReactNode;
  // Extra panel under the feed (online chat).
  aside?: ReactNode;
}

// The field caption is the feed line without its bracketed details
// ("used [Crunch] (Dark, 65 Pwr | 3/4 uses left)!" -> "used Crunch!"); the
// feed keeps the full line.
function captionText(text: string): string {
  return feedLineParts(text).text.replace(/\s*\([^)]*\)/g, "").replace(/[[\]]/g, "").replace(/\s{2,}/g, " ").trim();
}

function hpClass(member: FighterState): string {
  const pct = member.maxHp > 0 ? member.hp / member.maxHp : 0;
  return pct > 0.5 ? "" : pct > 0.2 ? " mid" : " low";
}

function Hud({ member, team, label }: { member: FighterState; team: TeamState; label?: string }) {
  const dict = useDictionary();
  const shiny = isShinyInstance(member.pokemon);
  const pct = member.maxHp > 0 ? Math.max(0, Math.min(1, member.hp / member.maxHp)) : 0;
  return (
    <div className="hud">
      <div className="hud-row">
        <span className="hud-name">
          {label && <span className="eyebrow">{label}</span>}
          {displayName(member.pokemon)}
          {shiny && <Icon name="star" size={13} fill="currentColor" label={dict.common.shinyBadge} style={{ color: "var(--r-shiny)" }} />}
        </span>
        <TypeBadges type1={member.pokemon.type1} type2={member.pokemon.type2} small />
      </div>
      <span className={`hpbar${hpClass(member)}`} role="meter" aria-valuemin={0} aria-valuemax={member.maxHp} aria-valuenow={Math.max(0, member.hp)} aria-label="HP">
        <span style={{ width: `${pct * 100}%` }} />
      </span>
      <div className="hud-row">
        <span className="bench-dots" aria-hidden="true">
          {team.members.map((m, i) => <span key={i} className={m.hp <= 0 ? "ko" : i === team.activeIndex ? "active" : undefined} />)}
        </span>
        <span className="mono small muted">{Math.max(0, member.hp)}/{member.maxHp}</span>
      </div>
      <StatusChips fighter={member} />
    </div>
  );
}

// The shared battle screen (redesign wave v9), used by bot and online
// battles: a field with the opponent back-right and you front-left, an
// action dock with Fight/Switch tabs, and the round-by-round feed beside
// it. It only renders state and reports the player's choice; the server
// resolves everything.
export default function BattleStage({
  you,
  opp,
  oppLabel,
  viewerSlot,
  canAttack,
  canSwitch,
  forcedSwitch,
  status,
  lastTurn,
  feed,
  onAction,
  toolbar,
  aside,
}: BattleStageProps) {
  const dict = useDictionary();
  const t = dict.battle.arena;
  const [tab, setTab] = useState<"fight" | "switch">("fight");
  const [pendingBuff, setPendingBuff] = useState<number | null>(null);
  const activeTab = forcedSwitch ? "switch" : tab;
  const me = you.members[you.activeIndex];
  const them = opp.members[opp.activeIndex];
  const benchAlive = you.members.filter((m, i) => i !== you.activeIndex && m.hp > 0).length;

  // Hits from this round: which side took damage, for the shake and the
  // floating number.
  const hits = (lastTurn?.events ?? []).filter((e) => e.hit && e.dealt > 0);
  const youHit = hits.filter((e) => e.slot !== viewerSlot);
  const oppHit = hits.filter((e) => e.slot === viewerSlot);
  const captions = (lastTurn?.lines ?? []).filter((l) => feedLineParts(l.text).main && l.text.trim() !== "").slice(-2);

  function act(action: BattleAction) {
    setPendingBuff(null);
    if (action.type === "switch") setTab("fight");
    onAction(action);
  }

  return (
    <div className="battle-layout">
      <div className="battle-main">
        {toolbar && <div className="battle-toolbar">{toolbar}</div>}

        <div className="battlefield">
          <div className="field-opp">
            <Hud member={them} team={opp} label={oppLabel} />
            <div className="field-fighter">
              <span className="field-platform" />
              <Sprite
                key={`o-${opp.activeIndex}-${oppHit.length ? lastTurn?.id : "idle"}`}
                name={them.pokemon.name}
                form={isShinyInstance(them.pokemon) ? "shiny" : "normal"}
                className={`field-sprite${them.hp <= 0 ? " is-fainted" : ""}${oppHit.length ? " is-hit" : ""}`}
                eager
              />
              {oppHit.map((e, i) => (
                <span key={`${lastTurn?.id}-o${i}`} className="dmg-float" style={{ animationDelay: `${i * 0.25}s` }}>−{e.dealt}</span>
              ))}
            </div>
          </div>
          <div className="field-you">
            <div className="field-fighter">
              <span className="field-platform" />
              <Sprite
                key={`y-${you.activeIndex}-${youHit.length ? lastTurn?.id : "idle"}`}
                name={me.pokemon.name}
                form={isShinyInstance(me.pokemon) ? "shiny" : "normal"}
                className={`field-sprite is-mine${me.hp <= 0 ? " is-fainted" : ""}${youHit.length ? " is-hit" : ""}`}
                eager
              />
              {youHit.map((e, i) => (
                <span key={`${lastTurn?.id}-y${i}`} className="dmg-float" style={{ animationDelay: `${i * 0.25}s` }}>−{e.dealt}</span>
              ))}
            </div>
            <Hud member={me} team={you} />
          </div>
          {captions.length > 0 && (
            <div className="field-caption" key={lastTurn?.id} aria-live="polite">
              {captions.map((l, i) => <span key={i}>{captionText(l.text)}</span>)}
            </div>
          )}
        </div>

        <div className="dock">
          <div className="dock-head">
            <div className="seg" role="tablist">
              <button type="button" role="tab" aria-selected={activeTab === "fight"} className={activeTab === "fight" ? "active" : undefined} disabled={forcedSwitch} onClick={() => setTab("fight")}>
                <Icon name="swords" size={15} /> {t.fight}
              </button>
              <button type="button" role="tab" aria-selected={activeTab === "switch"} className={activeTab === "switch" ? "active" : undefined} disabled={benchAlive === 0} onClick={() => setTab("switch")}>
                <Icon name="swap" size={15} /> {t.switchTab} <span className="mono faint">{benchAlive}</span>
              </button>
            </div>
            <span className={`dock-status${forcedSwitch ? " is-urgent" : ""}`}>{forcedSwitch ? t.chooseNextPokemon : status}</span>
          </div>

          {activeTab === "fight" && pendingBuff === null && (
            <div className="moves">
              {[0, 1, 2, 3].map((i) => {
                const move = me.pokemon.moves[i];
                if (!move) return <button key={i} type="button" className="move-btn" disabled>—</button>;
                const usesLeft = me.moveUses[i];
                return (
                  <MoveButton
                    key={i}
                    move={move}
                    usesLeft={usesLeft}
                    disabled={!canAttack || usesLeft === 0}
                    onClick={() => (move.kind === "buff" && hasLivingAlly(you) ? setPendingBuff(i) : act({ type: "attack", moveIndex: i }))}
                  />
                );
              })}
            </div>
          )}

          {activeTab === "fight" && pendingBuff !== null && (
            <div className="stack">
              <span className="small muted">{dict.battle.allyPicker.chooseTarget}</span>
              <div className="bench">
                {you.members.map((m, i) =>
                  m.hp <= 0 ? null : (
                    <button
                      key={i}
                      type="button"
                      className="bench-card"
                      onClick={() => act({ type: "attack", moveIndex: pendingBuff, buffTargetTeamIndex: i as 0 | 1 | 2 })}
                      title={i === you.activeIndex ? dict.battle.allyPicker.targetSelf(displayName(m.pokemon)) : dict.battle.allyPicker.targetOther(displayName(m.pokemon))}
                    >
                      <Sprite name={m.pokemon.name} form={isShinyInstance(m.pokemon) ? "shiny" : "normal"} className="bench-sprite" />
                      <span className="bench-name">{i === you.activeIndex ? dict.battle.allyPicker.self : displayName(m.pokemon)}</span>
                      <span className={`hpbar${hpClass(m)}`}><span style={{ width: `${(Math.max(0, m.hp) / m.maxHp) * 100}%` }} /></span>
                    </button>
                  )
                )}
              </div>
              <button type="button" className="btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => setPendingBuff(null)}>{dict.common.cancel}</button>
            </div>
          )}

          {activeTab === "switch" && (
            <div className="bench">
              {you.members.map((m, i) => {
                if (i === you.activeIndex) return null;
                const fainted = m.hp <= 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`bench-card${fainted ? " is-fainted" : ""}`}
                    disabled={fainted || !canSwitch}
                    onClick={() => act({ type: "switch", teamIndex: i as 0 | 1 | 2 })}
                    title={fainted ? dict.battle.fighterCard.faintedTitle(displayName(m.pokemon)) : dict.battle.fighterCard.switchTo(displayName(m.pokemon))}
                  >
                    <Sprite name={m.pokemon.name} form={isShinyInstance(m.pokemon) ? "shiny" : "normal"} className="bench-sprite" />
                    <span className="bench-name">{displayName(m.pokemon)}</span>
                    {fainted ? (
                      <span className="small faint">{dict.battle.fighterCard.fainted}</span>
                    ) : (
                      <>
                        <span className={`hpbar${hpClass(m)}`}><span style={{ width: `${(m.hp / m.maxHp) * 100}%` }} /></span>
                        <span className="mono small muted">{m.hp}/{m.maxHp}</span>
                        <StatusChips fighter={m} compact />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="battle-side">
        <section className="panel feed" aria-label={t.feedTitle}>
          <div className="panel-head"><h2>{t.feedTitle}</h2></div>
          <div className="feed-body">
            {[...feed].reverse().map((round) => (
              <div key={round.key} className="feed-round">
                <span className="eyebrow">{round.title}</span>
                {round.lines.map((line, i) => {
                  const parts = feedLineParts(line.text);
                  if (!parts.text) return null;
                  return (
                    <p key={i} className={`feed-line${parts.main ? " is-main" : ""}${line.kind ? ` is-${line.kind}` : ""}`}>
                      {parts.text}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
        {aside}
      </aside>
    </div>
  );
}
