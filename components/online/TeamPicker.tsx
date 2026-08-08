"use client";

import { useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const TEAM_SIZE = 3;

interface TeamPickerProps {
  inventory: OwnedPokemon[];
  onSubmit: (ids: string[]) => Promise<void>;
}

export default function TeamPicker({ inventory, onSubmit }: TeamPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TEAM_SIZE) return prev;
      return [...prev, id];
    });
  }

  async function submit() {
    if (selected.length !== TEAM_SIZE) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(selected);
    } catch {
      setError("⚠️ Couldn't lock in your team — try again.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎯 Pick Your Team ({selected.length}/{TEAM_SIZE})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Choose 3 Pokémon. Your opponent won&apos;t see your picks until you both lock in.
        </p>

        <div className="grid max-h-[50vh] grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 overflow-y-auto">
          {inventory.map((p) => {
            const isSelected = selected.includes(p.id);
            const pickIndex = selected.indexOf(p.id);
            return (
              <div
                key={p.id}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border p-2 text-center",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:border-primary"
                )}
                onClick={() => !submitting && toggle(p.id)}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary-foreground text-[11px] font-bold text-primary">
                    {pickIndex + 1}
                  </span>
                )}
                <Sprite name={p.name} form="normal" className="size-16 object-contain" />
                <div className="text-xs font-bold">#{p.number} {p.name}</div>
                <TypeBadges type1={p.type1} type2={p.type2} center small />
                <div className="text-[11px]">Total {p.total}</div>
              </div>
            );
          })}
        </div>

        {inventory.length === 0 && <p className="text-sm text-muted-foreground">You don&apos;t own any Pokémon yet.</p>}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button disabled={selected.length !== TEAM_SIZE || submitting} onClick={submit}>
          {submitting ? "Locking in..." : `Lock In Team (${selected.length}/${TEAM_SIZE})`}
        </Button>
      </CardContent>
    </Card>
  );
}
