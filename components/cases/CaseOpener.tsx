"use client";

import { useMemo, useRef, useState } from "react";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { GRADES, gradeOdds, instanceRarity, RARITY_RANK, SHINY_RATE } from "@/lib/rarity";
import { playCaseUnlockSound, playReelLandSound } from "@/lib/sound";
import Link from "@/components/LocaleLink";
import Icon from "@/components/ui/Icon";
import Sprite from "@/components/Sprite";
import PokemonInstanceCard from "@/components/inventory/PokemonInstanceCard";
import { useCaseCount } from "@/components/nav/CaseCount";
import CaseArt from "./CaseArt";
import CaseReel from "./CaseReel";
import RevealCard from "./RevealCard";
import { idleCells, planReel, type ReelPlan } from "./reel";

type Phase = "idle" | "unlocking" | "spinning" | "done";

interface Pull {
  pokemon: OwnedPokemon;
  plan: ReelPlan;
}

// Spin lengths. The first reel of a batch stops after the base time, each
// later one a little after the previous, so they land one by one.
const SPIN_MS = { normal: 6500, fast: 2400, reduced: 800 };
const STAGGER_MS = { normal: 600, fast: 220, reduced: 120 };
// The case shakes for at least this long while the open request runs, so a
// fast response doesn't cut the unlock short.
const MIN_UNLOCK_MS = 450;
const QUANTITIES = [1, 3, 5] as const;

function bestOf(pulls: Pull[]): Pull | null {
  return pulls.reduce<Pull | null>((best, p) => (!best || RARITY_RANK[instanceRarity(p.pokemon)] > RARITY_RANK[instanceRarity(best.pokemon)] ? p : best), null);
}

// The Open cases screen (redesign wave v9). The server decides every
// result: Open calls POST /api/inventory/lootboxes/[id]/open (or
// /open-many), which rolls and saves the Pokémon in one transaction, and
// only then is a reel built that lands on what came back.
export default function CaseOpener({ initialLootboxes }: { initialLootboxes: Lootbox[] }) {
  const dict = useDictionary();
  const t = dict.collection.caseOpening;
  const r = dict.collection.rarity;
  const { setCount } = useCaseCount();

  const [lootboxes, setLootboxes] = useState(initialLootboxes);
  const [qty, setQty] = useState<(typeof QUANTITIES)[number]>(1);
  const [fast, setFast] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [skip, setSkip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<keyof typeof SPIN_MS>("normal");
  const landedRef = useRef(0);

  const odds = useMemo(() => gradeOdds(), []);
  const idle = useMemo(() => idleCells("kanto-case"), []);
  const available = lootboxes.length;
  const busy = phase === "unlocking" || phase === "spinning";
  const effectiveQty = Math.max(1, Math.min(qty, available));

  async function open(count: number, instant = false) {
    if (busy || available === 0) return;
    const n = Math.max(1, Math.min(count, available));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setError(null);
    setSkip(false);
    setDetailId(null);
    setPhase("unlocking");
    playCaseUnlockSound();
    const startedAt = performance.now();

    let opened: OwnedPokemon[] = [];
    try {
      const res =
        n === 1
          ? await fetch(`/api/inventory/lootboxes/${lootboxes[0].id}/open`, { method: "POST" })
          : await fetch("/api/inventory/lootboxes/open-many", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ count: n }),
            });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      opened = n === 1 ? [data.pokemon as OwnedPokemon] : (data.pokemon as OwnedPokemon[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase(pulls.length > 0 ? "done" : "idle");
      return;
    }

    const wait = MIN_UNLOCK_MS - (performance.now() - startedAt);
    if (!instant && wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    // Trust the returned count, not the requested one: open-many opens
    // however many were still available.
    setLootboxes((prev) => (n === 1 ? prev.slice(1) : prev.slice(opened.length)));
    setCount((c) => c - opened.length);
    const nextPulls = opened.map((pokemon) => ({ pokemon, plan: planReel(pokemon) }));
    setPulls(nextPulls);
    landedRef.current = 0;

    if (instant || opened.length === 0) {
      setPhase("done");
      const best = bestOf(nextPulls);
      if (best) playReelLandSound(RARITY_RANK[instanceRarity(best.pokemon)]);
      return;
    }
    setSpeed(reduced ? "reduced" : fast ? "fast" : "normal");
    setPhase("spinning");
  }

  function handleLanded() {
    landedRef.current += 1;
    if (landedRef.current < pulls.length) return;
    setPhase("done");
    const best = bestOf(pulls);
    if (best) playReelLandSound(RARITY_RANK[instanceRarity(best.pokemon)]);
  }

  const sortedPulls = [...pulls].sort((a, b) => RARITY_RANK[instanceRarity(b.pokemon)] - RARITY_RANK[instanceRarity(a.pokemon)]);
  const best = sortedPulls[0] ?? null;
  const detail = pulls.find((p) => p.pokemon.id === detailId) ?? best;

  if (available === 0 && phase === "idle") {
    return (
      <div className="panel">
        <div className="empty">
          <CaseArt className="case-art case-art-empty" />
          <h3>{t.emptyTitle}</h3>
          <p>{t.emptyBody}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/battle" className="btn-primary">
              <Icon name="swords" size={16} /> {t.battleCta}
            </Link>
            <Link href="/inventory" className="btn-secondary">
              <Icon name="flame" size={16} /> {t.tradeUpCta}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const openLabel = phase === "unlocking" ? t.unlocking : effectiveQty === 1 ? t.openOne : t.openMany(effectiveQty);

  return (
    <div className="case-layout">
      <section className="case-stage" aria-busy={busy}>
        <div className="case-top">
          <div className="case-title">
            <CaseArt className={`case-art${phase === "unlocking" ? " is-shaking" : ""}`} />
            <div>
              <span className="eyebrow">{t.eyebrow}</span>
              <h2 className="mono">{t.unopened(available)}</h2>
            </div>
          </div>
          <div className="case-controls">
            <div className="seg" role="group" aria-label={t.howMany}>
              {QUANTITIES.map((q) => (
                <button key={q} type="button" aria-pressed={qty === q} onClick={() => setQty(q)} disabled={busy || q > Math.max(available, 1)}>
                  ×{q}
                </button>
              ))}
            </div>
            <label className="row small muted" style={{ gap: 8, cursor: "pointer" }}>
              <span className="switch">
                <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} />
                <span className="slider" />
              </span>
              {t.fast}
            </label>
            {phase === "spinning" ? (
              <button type="button" className="btn-secondary" onClick={() => setSkip(true)}>
                {t.skip}
              </button>
            ) : (
              <button type="button" className="btn-primary btn-lg" onClick={() => open(qty)} disabled={busy || available === 0}>
                <Icon name="case" size={18} /> {openLabel}
              </button>
            )}
          </div>
        </div>

        {error && <p className="alert alert-error" role="alert">{error}</p>}

        <div className={`reels${pulls.length > 1 && phase !== "done" ? " is-multi" : ""}`}>
          {phase === "idle" || phase === "unlocking" ? (
            <div className="reel reel-lg is-idle" aria-hidden="true">
              <div className="reel-strip" style={{ transform: "translate3d(-40px, 0, 0)" }}>
                {idle.map((cell) => (
                  <div key={cell.key} className={`reel-card rarity-${cell.rarity}${cell.hidden ? " is-hidden" : ""}`}>
                    {cell.hidden ? (
                      <span className="reel-mystery">★</span>
                    ) : (
                      <>
                        <Sprite name={cell.name} form="normal" className="reel-sprite" />
                        <span className="reel-name">{cell.name}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="reel-marker" />
            </div>
          ) : phase === "spinning" || pulls.length === 1 ? (
            pulls.map((p, i) => (
              <CaseReel
                key={p.pokemon.id}
                plan={p.plan}
                size={pulls.length > 1 ? "sm" : "lg"}
                durationMs={SPIN_MS[speed] + i * STAGGER_MS[speed]}
                skip={skip}
                onLanded={handleLanded}
              />
            ))
          ) : null}
        </div>

        {phase === "done" && pulls.length === 1 && (
          <RevealCard pokemon={pulls[0].pokemon}>
            <button type="button" className="btn-primary" onClick={() => open(qty)} disabled={available === 0}>
              <Icon name="case" size={16} /> {effectiveQty === 1 ? t.openAnother : t.openAnotherMany(effectiveQty)}
            </button>
            <Link href="/inventory" className="btn-secondary">{t.viewCollection}</Link>
          </RevealCard>
        )}

        {phase === "done" && pulls.length > 1 && best && detail && (
          <div className="pull-summary">
            <div className="row">
              <h3 style={{ fontSize: 18 }}>{t.pulled(pulls.length)}</h3>
              <span className="muted small">{t.tapForDetails}</span>
            </div>
            <div className="pgrid">
              {sortedPulls.map((p) => (
                <PokemonInstanceCard
                  key={p.pokemon.id}
                  pokemon={p.pokemon}
                  variant="grid"
                  selected={p.pokemon.id === detail.pokemon.id}
                  onSelect={() => setDetailId(p.pokemon.id)}
                />
              ))}
            </div>
            <RevealCard key={detail.pokemon.id} pokemon={detail.pokemon} instant eyebrow={detail === best ? t.bestPull : undefined}>
              <button type="button" className="btn-primary" onClick={() => open(qty)} disabled={available === 0}>
                <Icon name="case" size={16} /> {t.openAnotherMany(effectiveQty)}
              </button>
              <Link href="/inventory" className="btn-secondary">{t.viewCollection}</Link>
            </RevealCard>
          </div>
        )}

        {available > 1 && !busy && (
          <button type="button" className="btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => open(available, true)}>
            <Icon name="zap" size={14} /> {t.openAll(available)}
          </button>
        )}
      </section>

      <aside className="panel case-contents">
        <div className="panel-head">
          <h2>{t.contentsTitle}</h2>
        </div>
        <ul className="odds">
          {GRADES.map((g) => (
            <li key={g} className={`odds-row rarity-${g}`}>
              <span className="grade-label">{r[g]}</span>
              <span className="odds-track"><span style={{ width: `${(odds[g] / 0.35) * 100}%` }} /></span>
              <span className="mono small muted">{(odds[g] * 100).toFixed(1)}%</span>
            </li>
          ))}
          <li className="odds-row rarity-shiny">
            <span className="grade-label">★ {r.shiny}</span>
            <span className="odds-track"><span style={{ width: `${(SHINY_RATE / 0.35) * 100}%` }} /></span>
            <span className="mono small muted">~{SHINY_RATE * 100}%</span>
          </li>
        </ul>
        <p className="small muted">{t.contentsNote}</p>
      </aside>
    </div>
  );
}
