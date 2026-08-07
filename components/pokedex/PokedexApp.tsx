"use client";

import { useEffect, useState } from "react";
import type { Pokedex, UserPokedexData } from "@/types/pokemon";
import Sidebar from "./Sidebar";
import PokemonDetail from "./PokemonDetail";
import CompletionBanner from "./CompletionBanner";
import BattleArena from "@/components/battle/BattleArena";
import OnlineBattle from "@/components/online/OnlineBattle";

type Tab = "info" | "battle" | "online";

interface PokedexAppProps {
  pokedex: Pokedex;
  order: string[];
  typesList: string[];
}

export default function PokedexApp({ pokedex, order, typesList }: PokedexAppProps) {
  const [userData, setUserData] = useState<UserPokedexData>({});
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(order[0] ?? null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    fetch("/api/user-data")
      .then((res) => res.json())
      .then((data: UserPokedexData) => setUserData(data))
      .catch(() => {
        /* first-ever visit or offline — empty Pokedex is a valid starting state */
      })
      .finally(() => setUserDataLoaded(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function handleToggleAcquired(number: string, acquired: boolean) {
    setUserData((prev) => ({
      ...prev,
      [number]: { acquired, notes: prev[number]?.notes ?? "" },
    }));
    await fetch(`/api/user-data/${number}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acquired }),
    });
  }

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

  const acquiredCount = order.reduce((count, num) => count + (userData[num]?.acquired ? 1 : 0), 0);
  const selectedPokemon = selectedId ? pokedex[selectedId] : null;
  const selectedEntry = selectedId ? userData[selectedId] ?? { acquired: false, notes: "" } : { acquired: false, notes: "" };

  return (
    <>
      <Sidebar
        pokedex={pokedex}
        order={order}
        typesList={typesList}
        userData={userData}
        selectedId={selectedId}
        onSelect={setSelectedId}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <main className="main-panel">
        <CompletionBanner acquiredCount={acquiredCount} total={order.length} />

        <div className="tabs">
          <button
            className={`tab-btn${activeTab === "info" ? " active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            📖 Pokédex Info
          </button>
          <button
            className={`tab-btn${activeTab === "battle" ? " active" : ""}`}
            onClick={() => setActiveTab("battle")}
          >
            ⚔️ Battle Arena
          </button>
          <button
            className={`tab-btn${activeTab === "online" ? " active" : ""}`}
            onClick={() => setActiveTab("online")}
          >
            🌐 Online Battle
          </button>
        </div>

        <section className={`tab-content${activeTab === "info" ? " active" : ""}`}>
          {selectedPokemon && userDataLoaded && (
            <PokemonDetail
              key={selectedPokemon.number}
              pokemon={selectedPokemon}
              entry={selectedEntry}
              onToggleAcquired={(acquired) => handleToggleAcquired(selectedPokemon.number, acquired)}
              onNotesChange={(notes) => handleNotesChange(selectedPokemon.number, notes)}
            />
          )}
        </section>

        {/* Battle Arena and Online Battle stay mounted (just hidden) across tab
            switches so their in-progress battle/room state survives navigating
            back to the Pokedex Info tab — matches pokedex-web's display:none
            tab switching instead of unmounting. */}
        <section className={`tab-content${activeTab === "battle" ? " active" : ""}`}>
          <BattleArena pokedex={pokedex} order={order} syncFighter1Id={selectedId} />
        </section>

        <section className={`tab-content${activeTab === "online" ? " active" : ""}`}>
          <OnlineBattle pokedex={pokedex} order={order} />
        </section>
      </main>
    </>
  );
}
