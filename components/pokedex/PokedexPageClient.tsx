"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pokedex, UserPokedexData } from "@/types/pokemon";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { speciesGrade } from "@/lib/rarity";
import PokemonDetail from "./PokemonDetail";
import Sprite from "@/components/Sprite";
import SectionTabs from "@/components/nav/SectionTabs";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";

type StatusFilter = "All" | "Caught" | "Missing";
type StatFilter = "Any" | "300+" | "400+" | "500+";

interface PokedexPageClientProps {
  pokedex: Pokedex;
  order: string[];
  typesList: string[];
  initialUserData: UserPokedexData;
}

function hashEntry(order: string[]): string | null {
  const n = window.location.hash.replace("#", "");
  return order.includes(n) ? n : null;
}

// The Pokédex (redesign wave v9): every species as a card in one grid,
// uncaught ones as silhouettes, with the entry beside it (or in a dialog on
// narrow screens). The top bar's search links here as /pokedex#025.
export default function PokedexPageClient({ pokedex, order, typesList, initialUserData }: PokedexPageClientProps) {
  const dict = useDictionary();
  const t = dict.collection.pokedex;
  const common = dict.common;
  const wide = useMediaQuery("(min-width: 1100px)");
  const [userData, setUserData] = useState(initialUserData);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [statFilter, setStatFilter] = useState<StatFilter>("Any");
  const [selectedId, setSelectedId] = useState<string | null>(order[0] ?? null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Follow #025-style links from the top-bar search, on load and whenever
  // the hash changes while this page is open.
  useEffect(() => {
    function follow() {
      const n = hashEntry(order);
      if (!n) return;
      setSearch("");
      setTypeFilter("All Types");
      setStatusFilter("All");
      setStatFilter("Any");
      setSelectedId(n);
      setDetailOpen(true);
      requestAnimationFrame(() => document.getElementById(`dex-${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [order]);

  const isAcquired = (num: string) => Boolean(userData[num]?.acquired);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    return order.filter((num) => {
      const p = pokedex[num];
      if (q && !p.name.toLowerCase().includes(q) && !num.includes(q)) return false;
      if (typeFilter !== "All Types" && p.type1 !== typeFilter && p.type2 !== typeFilter) return false;
      const acquired = Boolean(userData[num]?.acquired);
      if (statusFilter === "Caught" && !acquired) return false;
      if (statusFilter === "Missing" && acquired) return false;
      if (statFilter !== "Any" && p.total < parseInt(statFilter, 10)) return false;
      return true;
    });
  }, [search, typeFilter, statusFilter, statFilter, order, pokedex, userData]);

  const acquiredCount = order.reduce((count, num) => count + (userData[num]?.acquired ? 1 : 0), 0);
  const pct = order.length > 0 ? (acquiredCount / order.length) * 100 : 0;
  const selectedPokemon = selectedId ? pokedex[selectedId] : null;
  const selectedEntry = (selectedId && userData[selectedId]) || { acquired: false, notes: "" };

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

  const detail = selectedPokemon && (
    <PokemonDetail
      key={selectedPokemon.number}
      pokemon={selectedPokemon}
      entry={selectedEntry}
      onNotesChange={(notes) => handleNotesChange(selectedPokemon.number, notes)}
      dict={dict}
    />
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.shell.groups.collection}</span>
          <h1>{t.heading}</h1>
        </div>
        <div className="dex-progress">
          <span className="mono small">{t.completion(acquiredCount, order.length, pct.toFixed(1))}</span>
          <span className="hpbar"><span style={{ width: `${pct}%`, background: "var(--accent)" }} /></span>
        </div>
      </div>
      <SectionTabs section="collection" />

      <div className="filter-bar">
        <label className="search-input filter-search">
          <span className="sr-only">{t.searchPlaceholder}</span>
          <Icon name="search" size={16} />
          <input type="search" placeholder={t.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="seg" role="group" aria-label={t.statusFilterLabel}>
          {(["All", "Caught", "Missing"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "All" ? t.statusAll : s === "Caught" ? t.statusCaught : t.statusMissing}
            </button>
          ))}
        </div>
        <label className="filter-select">
          <span className="sr-only">{t.typeFilterLabel}</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {typesList.map((type) => (
              <option key={type} value={type}>{type === "All Types" ? common.allTypesLabel : type}</option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <span className="sr-only">{t.minTotalStatsLabel}</span>
          <select value={statFilter} onChange={(e) => setStatFilter(e.target.value as StatFilter)}>
            <option value="Any">{t.statAny}</option>
            <option value="300+">300+</option>
            <option value="400+">400+</option>
            <option value="500+">500+</option>
          </select>
        </label>
        <span className="faint mono small">{t.showingCount(filtered.length, order.length)}</span>
      </div>

      <div className="collection-layout">
        <div className="pgrid dex-grid">
          {filtered.map((num) => {
            const p = pokedex[num];
            const acquired = isAcquired(num);
            return (
              <button
                key={num}
                id={`dex-${num}`}
                type="button"
                className={`pcard dex-card rarity-${speciesGrade(num)}${acquired ? "" : " is-uncaught"}`}
                aria-pressed={num === selectedId && wide}
                onClick={() => {
                  setSelectedId(num);
                  setDetailOpen(true);
                }}
              >
                <span className="pcard-flags">{acquired && <Icon name="check" size={14} label={t.caughtBadge} style={{ color: "var(--good)" }} />}</span>
                <Sprite name={p.name} form="normal" className="pcard-sprite" />
                <span className="pcard-total">#{num}</span>
                <span className="pcard-name">{p.name}</span>
              </button>
            );
          })}
        </div>
        {wide && <aside className="panel collection-detail">{detail}</aside>}
      </div>

      {!wide && detailOpen && detail && (
        <Modal onClose={() => setDetailOpen(false)} size="lg">
          {detail}
        </Modal>
      )}
    </div>
  );
}
