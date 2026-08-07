"use client";

import { useState } from "react";

interface SpriteProps {
  name: string;
  form: "normal" | "shiny";
  className: string;
}

export default function Sprite({ name, form, className }: SpriteProps) {
  const [failed, setFailed] = useState(false);
  const src = `/images/${name.toLowerCase()}_${form}.gif`;

  if (failed) {
    return (
      <div className={className} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-muted)" }}>
        [No Image]
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated GIFs bypass next/image optimization anyway; plain <img> matches pokedex-web's approach.
    <img
      className={className}
      src={src}
      alt={`${name} ${form} sprite`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
