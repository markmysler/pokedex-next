"use client";

import { useMemo, useState } from "react";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";
import PokemonInstanceCard from "./PokemonInstanceCard";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import ColorProgress from "@/components/ColorProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InventoryPageClientProps {
  initialPokemon: OwnedPokemon[];
  initialLootboxes: Lootbox[];
  typesList: string[];
}

const STAT_INFO: Array<{ label: string; key: "hp" | "atk" | "def" | "spatk" | "spdef" | "spd"; color: string }> = [
  { label: "HP", key: "hp", color: "#FF5959" },
  { label: "Attack", key: "atk", color: "#F5AC78" },
  { label: "Defense", key: "def", color: "#FAE078" },
  { label: "Sp. Atk", key: "spatk", color: "#9DB7F5" },
  { label: "Sp. Def", key: "spdef", color: "#A7DB8D" },
  { label: "Speed", key: "spd", color: "#FA92B2" },
];

export default function InventoryPageClient({ initialPokemon, initialLootboxes, typesList }: InventoryPageClientProps) {
  const [pokemon, setPokemon] = useState(initialPokemon);
  const [lootboxes, setLootboxes] = useState(initialLootboxes);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(initialPokemon[0]?.id ?? null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pokemon.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.number.includes(q)) return false;
      if (typeFilter !== "All Types" && p.type1 !== typeFilter && p.type2 !== typeFilter) return false;
      return true;
    });
  }, [pokemon, search, typeFilter]);

  const selected = pokemon.find((p) => p.id === selectedId) ?? null;

  async function handleDiscard(id: string) {
    setError(null);
    const res = await fetch(`/api/inventory/pokemon/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) return setError(data.error);
    setPokemon((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleOpen(id: string) {
    setError(null);
    setOpeningId(id);
    const res = await fetch(`/api/inventory/lootboxes/${id}/open`, { method: "POST" });
    const data = await res.json();
    setOpeningId(null);
    if (data.error) return setError(data.error);
    setLootboxes((prev) => prev.filter((l) => l.id !== id));
    setPokemon((prev) => [data.pokemon as OwnedPokemon, ...prev]);
    setSelectedId((data.pokemon as OwnedPokemon).id);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">🎒 Inventory</h1>

      {lootboxes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📦 Unopened Lootboxes ({lootboxes.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {lootboxes.map((box) => (
              <Button key={box.id} onClick={() => handleOpen(box.id)} disabled={openingId === box.id}>
                {openingId === box.id ? "Opening…" : "📦 Open Lootbox"}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Input
            className="min-w-40 flex-1"
            type="text"
            placeholder="🔍 Search Name or #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-col gap-1 text-xs font-bold">
            <Label>Type Filter</Label>
            <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typesList.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>▦ Grid</Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>☰ List</Button>
          </div>
          <div className="text-xs text-muted-foreground">Showing: {filtered.length} of {pokemon.length}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_340px]">
        <div
          className={cn(
            "max-h-[70vh] overflow-y-auto p-1",
            viewMode === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5" : "flex flex-col"
          )}
        >
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No Pokémon match your filters.</p>}
          {filtered.map((p) => (
            <PokemonInstanceCard
              key={p.id}
              pokemon={p}
              variant={viewMode}
              selected={p.id === selectedId}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </div>

        {selected && (
          <Card className="flex flex-col gap-3">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="text-xl font-bold">#{selected.number} {selected.name}{selected.isStarter ? " ⭐" : ""}</h2>
                <TypeBadges type1={selected.type1} type2={selected.type2} />
              </div>
              <Sprite name={selected.name} form="normal" className="mx-auto size-30 object-contain [image-rendering:pixelated]" />
              <div>
                <h3 className="mb-2 font-bold">📊 Stats (this Pokémon)</h3>
                {STAT_INFO.map(({ label, key, color }) => (
                  <div key={key} className="grid grid-cols-[75px_1fr_45px] items-center gap-2 py-1 text-xs">
                    <span className="font-bold">{label}:</span>
                    <ColorProgress value={Math.min(100, (selected[key] / 160) * 100)} color={color} trackClassName="h-2.5" />
                    <span className="text-right">{selected[key]}</span>
                  </div>
                ))}
                <div className="mt-2 text-sm font-bold text-muted-foreground">Total: {selected.total}</div>
              </div>
              <div>
                <h3 className="mb-2 font-bold">⚔️ Moves</h3>
                <ul className="flex flex-col gap-1 text-xs">
                  {selected.moves.map((m) => (
                    <li key={m.name} className="rounded-md bg-muted px-2 py-1">{m.name} — {m.type}, {m.power} Pwr, {m.mana_cost} MP</li>
                  ))}
                </ul>
              </div>
              <Button variant="secondary" onClick={() => handleDiscard(selected.id)}>🗑️ Discard</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
