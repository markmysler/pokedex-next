"use client";

import { useEffect, useRef, useState } from "react";
import Sprite from "@/components/Sprite";
import { playReelTickSound } from "@/lib/sound";
import { reelEase, type ReelPlan } from "./reel";

interface CaseReelProps {
  plan: ReelPlan;
  durationMs: number;
  size?: "lg" | "sm";
  // Flips to true when the player hits Skip: the reel finishes in a blink.
  skip?: boolean;
  onLanded: () => void;
}

const SKIP_MS = 220;
// The first frames move dozens of cards each; ticking on every one would
// be a buzz, so ticks are spaced at least this far apart.
const MIN_TICK_GAP_MS = 45;

// One horizontal case reel (redesign wave v9): a strip of cards scrolls
// left, decelerates and stops with the winning card under the centre
// marker. The strip's position is written straight to the DOM from a
// requestAnimationFrame loop, so a 6-second spin costs no React renders.
export default function CaseReel({ plan, durationMs, size = "lg", skip = false, onLanded }: CaseReelProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef(skip);
  const onLandedRef = useRef(onLanded);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    skipRef.current = skip;
    onLandedRef.current = onLanded;
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip || strip.children.length < 2) return;

    const first = strip.children[0] as HTMLElement;
    const second = strip.children[1] as HTMLElement;

    // Positions are worked out in card units and converted with the
    // current card size on every frame, so a window resize mid-spin (or
    // after landing) still lands the winner under the marker. Reading
    // offsets each frame is cheap: only transforms change between frames,
    // so layout stays cached.
    function place(progress: number): { x: number; index: number } {
      const cardWidth = first.offsetWidth;
      const pitch = second.offsetLeft - first.offsetLeft;
      const view = viewport!.clientWidth;
      const startCards = 2;
      const endCards = plan.winIndex + plan.jitter;
      const cards = startCards + (endCards - startCards) * reelEase(progress);
      const x = view / 2 - (cards * pitch + cardWidth / 2);
      strip!.style.transform = `translate3d(${x}px, 0, 0)`;
      return { x, index: Math.floor((view / 2 - x) / pitch) };
    }

    let raf = 0;
    let startedAt: number | null = null;
    let skipFrom: { at: number; t: number } | null = null;
    let lastIndex = -1;
    let lastTickAt = 0;
    let done = false;
    const onResize = () => place(1);

    function frame(now: number) {
      startedAt ??= now;
      let t = Math.min(1, (now - startedAt) / durationMs);
      if (skipRef.current && t < 1) {
        skipFrom ??= { at: now, t };
        t = Math.min(1, skipFrom.t + ((now - skipFrom.at) / SKIP_MS) * (1 - skipFrom.t));
      }
      const { index } = place(t);
      if (index !== lastIndex) {
        if (lastIndex !== -1 && t < 1 && !skipFrom && now - lastTickAt >= MIN_TICK_GAP_MS) {
          playReelTickSound(1 - t);
          lastTickAt = now;
        }
        lastIndex = index;
      }

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else if (!done) {
        done = true;
        window.addEventListener("resize", onResize);
        setLanded(true);
        onLandedRef.current();
      }
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [plan, durationMs]);

  return (
    <div className={`reel reel-${size}${landed ? " is-landed" : ""}`} ref={viewportRef}>
      <div className="reel-strip" ref={stripRef}>
        {plan.cells.map((cell, i) => {
          const isWinner = i === plan.winIndex;
          const concealed = cell.hidden && !(isWinner && landed);
          return (
            <div key={cell.key} className={`reel-card rarity-${cell.rarity}${concealed ? " is-hidden" : ""}${isWinner && landed ? " is-won" : ""}`}>
              {concealed ? (
                <>
                  <span className="reel-mystery" aria-hidden="true">★</span>
                  {/* Preload the winning shiny's sprite so the reveal is instant. */}
                  {isWinner && <Sprite name={cell.name} form="shiny" className="sr-only" eager />}
                </>
              ) : (
                <>
                  <Sprite name={cell.name} form={cell.rarity === "shiny" ? "shiny" : "normal"} className="reel-sprite" eager />
                  <span className="reel-name">{cell.name}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="reel-marker" aria-hidden="true" />
    </div>
  );
}
