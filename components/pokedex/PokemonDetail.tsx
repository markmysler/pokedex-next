"use client";

import { useState } from "react";
import type { Pokemon, UserPokedexEntry } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import ColorProgress from "@/components/ColorProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

const STAT_INFO: Array<{ label: string; key: keyof Pokemon; color: string }> = [
  { label: "HP", key: "hp", color: "#FF5959" },
  { label: "Attack", key: "atk", color: "#F5AC78" },
  { label: "Defense", key: "def", color: "#FAE078" },
  { label: "Sp. Atk", key: "spatk", color: "#9DB7F5" },
  { label: "Sp. Def", key: "spdef", color: "#A7DB8D" },
  { label: "Speed", key: "spd", color: "#FA92B2" },
];

interface PokemonDetailProps {
  pokemon: Pokemon;
  entry: UserPokedexEntry;
  onNotesChange: (notes: string) => void;
}

// The parent mounts this with key={pokemon.number}, so `entry` is always
// up to date on mount — no effect needed to resync notesDraft afterwards.
export default function PokemonDetail({ pokemon, entry, onNotesChange }: PokemonDetailProps) {
  const [notesDraft, setNotesDraft] = useState(entry.notes);
  const [saved, setSaved] = useState(false);
  const debouncedSave = useDebouncedCallback((notes: string) => {
    onNotesChange(notes);
    setSaved(true);
  }, 400);

  const spriteBase = pokemon.name.toLowerCase();

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-2xl font-bold">#{pokemon.number} {pokemon.name}</h2>
          <TypeBadges type1={pokemon.type1} type2={pokemon.type2} />
          {/* Caught status is derived from owned pokemon_instances (see
              upgrades/archive/02-collection-system.md) -- read-only here,
              not a manual toggle. Open lootboxes on the Inventory page to
              catch more. */}
          <Badge variant={entry.acquired ? "default" : "secondary"}>
            {entry.acquired ? "✅ Caught" : "⚪ Not caught yet"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex justify-around">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">Normal Form</span>
            <Sprite name={spriteBase} form="normal" className="size-30 object-contain [image-rendering:pixelated]" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-[#FFD700]">✨ Shiny Form</span>
            <Sprite name={spriteBase} form="shiny" className="size-30 object-contain [image-rendering:pixelated]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-2.5 font-bold">📊 Base Stats</h3>
          {STAT_INFO.map(({ label, key, color }) => {
            const value = pokemon[key] as number;
            return (
              <div className="grid grid-cols-[75px_1fr_45px] items-center gap-2 py-1 text-xs" key={key}>
                <span className="font-bold">{label}:</span>
                <ColorProgress value={Math.min(100, (value / 160) * 100)} color={color} trackClassName="h-2.5" />
                <span className="text-right">{value}</span>
              </div>
            );
          })}
          <div className="mt-2 text-sm font-bold text-muted-foreground">Total Base Stats: {pokemon.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="font-bold">📝 Personal Trainer Notes</h3>
            <span className="text-[11px] text-muted-foreground">{saved ? "Saved ✓" : ""}</span>
          </div>
          <Textarea
            rows={4}
            value={notesDraft}
            onChange={(e) => {
              setNotesDraft(e.target.value);
              setSaved(false);
              debouncedSave(e.target.value);
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
