"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname } from "./locale";
import type { Dictionary } from "./getDictionary";
import en from "./dictionaries/en";
import esAR from "./dictionaries/es-AR";

// Client-side counterpart to getDictionary() -- that one reads the locale
// via next/root-params, which only works in Server Components. Some
// dictionary entries are functions (e.g. collection.pokedex.showingCount,
// computed from client-only filter state), and functions can't cross the
// Server->Client prop boundary (React Server Components can only serialize
// plain data), so a Server Component page can't fetch the dictionary and
// hand it down as a prop the way step 54's plain-string dictionaries could
// (upgrades/55-i18n-collection-cluster.md). Importing both dictionaries
// directly here and picking one by pathname keeps everything client-side --
// no boundary ever crossed, same "usePathname() + localeFromPathname()"
// convention every other Client Component already uses for the locale
// itself.
const dictionaries: Record<string, Dictionary> = { en, "es-AR": esAR };

export function useDictionary(): Dictionary {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  return dictionaries[locale];
}
