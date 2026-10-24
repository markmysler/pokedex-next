"use client";

import { useState } from "react";
import { useDictionary } from "@/lib/i18n/useDictionary";

interface SpriteProps {
  name: string;
  form: "normal" | "shiny";
  className: string;
  // The case reel needs every card's image before it scrolls into view;
  // lazy loading would leave blank cards flying past.
  eager?: boolean;
}

export default function Sprite({ name, form, className, eager }: SpriteProps) {
  const dict = useDictionary();
  const [failed, setFailed] = useState(false);
  const src = `/images/${name.toLowerCase()}_${form}.gif`;

  if (failed) {
    return (
      // <span>, not <div>: sprites render inside Pokémon-card <button>s.
      <span className={className} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--ink-faint)" }}>
        {dict.common.noImage}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated GIFs bypass next/image optimization anyway; plain <img> matches pokedex-web's approach.
    <img
      className={className}
      src={src}
      alt={dict.ui.spriteAlt(name, form)}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
