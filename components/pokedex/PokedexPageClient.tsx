"use client";

import { useMemo, useState } from "react";
import type { Pokedex, UserPokedexData } from "@/types/pokemon";
import CompletionBanner from "./CompletionBanner";
import PokemonDetail from "./PokemonDetail";
import TypeBadges from "@/components/TypeBadges";
import Sprite from "@/components/Sprite";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusFilter = "All" | "Caught" | "Missing";
type StatFilter = "Any" | "300+" | "400+" | "500+";

interface PokedexPageClientProps {
  pokedex: Pokedex;
  order: string[];
  typesList: string[];
  initialUserData: UserPokedexData;
}

export default function PokedexPageClient({ pokedex, order, typesList, initialUserData }: PokedexPageClientProps) {
  const [userData, setUserData] = useState(initialUserData);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [statFilter, setStatFilter] = useState<StatFilter>("Any");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedId, setSelectedId] = useState<string | null>(order[0] ?? null);

  const isAcquired = (num: string) => Boolean(userData[num]?.acquired);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return order.filter((num) => {
      const p = pokedex[num];
      if (q && !p.name.toLowerCase().includes(q) && !num.toLowerCase().includes(q)) return false;
      if (typeFilter !== "All Types" && p.type1 !== typeFilter && p.type2 !== typeFilter) return false;
      const acquired = isAcquired(num);
      if (statusFilter === "Caught" && !acquired) return false;
      if (statusFilter === "Missing" && acquired) return false;
      if (statFilter === "300+" && p.total < 300) return false;
      if (statFilter === "400+" && p.total < 400) return false;
      if (statFilter === "500+" && p.total < 500) return false;
      return true;
      // userData intentionally read via isAcquired() rather than listed as a dep array key by field,
      // it's fine since userData itself is the dep.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, statusFilter, statFilter, order, pokedex, userData]);

  const acquiredCount = order.reduce((count, num) => count + (userData[num]?.acquired ? 1 : 0), 0);
  const selectedPokemon = selectedId ? pokedex[selectedId] : null;
  const selectedEntry = selectedId ? userData[selectedId] ?? { acquired: false, notes: "" } : { acquired: false, notes: "" };

  async function handleNotesChange(number: string, notes: string) {
    setUserData((prev) => ({
      ...prev,
      [number]: { acquired: prev[number]?.acquired ?? false, notes },
    }));
    await fetch(`/api/user-data/${number}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">📖 Pokédex</h1>
      <CompletionBanner acquiredCount={acquiredCount} total={order.length} />

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
          <div className="flex flex-col gap-1 text-xs font-bold">
            <Label>Status Filter</Label>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Caught">Caught</SelectItem>
                <SelectItem value="Missing">Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 text-xs font-bold">
            <Label>Min Total Stats</Label>
            <Select value={statFilter} onValueChange={(v) => v && setStatFilter(v as StatFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="300+">300+</SelectItem>
                <SelectItem value="400+">400+</SelectItem>
                <SelectItem value="500+">500+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>▦ Grid</Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>☰ List</Button>
          </div>
          <div className="text-xs text-muted-foreground">Showing: {filtered.length} of {order.length} Pokémon</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_340px]">
        <div
          className={cn(
            "max-h-[70vh] overflow-y-auto p-1",
            viewMode === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5" : "flex flex-col"
          )}
        >
          {filtered.map((num) => {
            const p = pokedex[num];
            const acquired = isAcquired(num);
            if (viewMode === "list") {
              return (
                <div
                  key={num}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1.5 font-mono text-sm whitespace-pre hover:bg-accent",
                    num === selectedId && "bg-primary text-primary-foreground hover:bg-primary"
                  )}
                  onClick={() => setSelectedId(num)}
                >
                  {`#${num}  ${p.name.padEnd(15)}${acquired ? " 🟢" : " ⚪"}`}
                </div>
              );
            }
            return (
              <div
                key={num}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border p-2 text-center",
                  num === selectedId ? "bg-primary text-primary-foreground" : "hover:border-primary"
                )}
                onClick={() => setSelectedId(num)}
              >
                <Sprite name={p.name} form="normal" className="size-16 object-contain" />
                <div className="text-xs font-bold">#{p.number} {p.name}</div>
                <TypeBadges type1={p.type1} type2={p.type2} center small />
                <div className="text-[11px]">{acquired ? "🟢 Caught" : "⚪ Uncaught"}</div>
              </div>
            );
          })}
        </div>

        {selectedPokemon && (
          <div className="flex flex-col gap-3">
            <PokemonDetail
              key={selectedPokemon.number}
              pokemon={selectedPokemon}
              entry={selectedEntry}
              onNotesChange={(notes) => handleNotesChange(selectedPokemon.number, notes)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
