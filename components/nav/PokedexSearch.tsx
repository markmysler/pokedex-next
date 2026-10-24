"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pokedex, pokedexOrder } from "@/lib/pokedex";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon from "@/components/ui/Icon";
import TypeBadges from "@/components/TypeBadges";

const MAX_RESULTS = 8;

// Top-bar species search (redesign wave v9). The Pokédex is static data
// already in the client bundle, so this filters locally and jumps to the
// species' entry on the Pokédex page (/pokedex#025). "/" focuses it from
// anywhere, the way most web apps' search does.
export default function PokedexSearch() {
  const dict = useDictionary();
  const t = dict.shell;
  const router = useRouter();
  const locale = localeFromPathname(usePathname());
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return [];
    const isNumber = /^\d+$/.test(q);
    return pokedexOrder
      .filter((n) => (isNumber ? parseInt(n, 10) === parseInt(q, 10) || n.includes(q) : pokedex[n].name.toLowerCase().includes(q)))
      .slice(0, MAX_RESULTS);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(number: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(withLocale(locale, `/pokedex#${number}`));
  }

  return (
    <div className="top-search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <div className="search-input">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          role="combobox"
          aria-expanded={open && query.trim() !== ""}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
        {!query && <kbd>/</kbd>}
      </div>
      {open && query.trim() !== "" && (
        <div className="search-results" id={listId} role="listbox">
          {results.length === 0 ? (
            <div className="search-empty">{t.searchNoResults(query.trim())}</div>
          ) : (
            results.map((n, i) => {
              const p = pokedex[n];
              return (
                <button
                  key={n}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className="search-result"
                  style={{ border: 0, background: i === active ? "var(--surface-2)" : "transparent", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(n)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF sprite, same as components/Sprite.tsx */}
                  <img src={`/images/${p.name.toLowerCase()}_normal.gif`} alt="" loading="lazy" />
                  <span>
                    <span className="faint mono" style={{ marginRight: 8 }}>#{n}</span>
                    {p.name}
                  </span>
                  <TypeBadges type1={p.type1} type2={p.type2} small />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
