"use client";

import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/locale";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Link from "@/components/LocaleLink";

type Section = "collection" | "battle" | "social" | "records";

const SECTIONS: Record<Section, { href: string; key: "open" | "inventory" | "pokedex" | "battle" | "online" | "friends" | "notifications" | "history" | "leaderboard" }[]> = {
  collection: [
    { href: "/open", key: "open" },
    { href: "/inventory", key: "inventory" },
    { href: "/pokedex", key: "pokedex" },
  ],
  battle: [
    { href: "/battle", key: "battle" },
    { href: "/online", key: "online" },
  ],
  social: [
    { href: "/friends", key: "friends" },
    { href: "/notifications", key: "notifications" },
  ],
  records: [
    { href: "/history", key: "history" },
    { href: "/leaderboard", key: "leaderboard" },
  ],
};

// Sibling pages of one section as tabs at the top of each page (redesign
// wave v9). On phones the tab bar only has five slots, so this is how you
// get from My Pokémon to the Pokédex, or from Battle to Online.
export default function SectionTabs({ section }: { section: Section }) {
  const t = useDictionary().shell;
  const path = stripLocale(usePathname());

  return (
    <nav className="section-tabs" aria-label={t.groups[section === "battle" ? "play" : section]}>
      {SECTIONS[section].map((s) => (
        <Link key={s.href} href={s.href} className="section-tab" aria-current={path === s.href || path.startsWith(`${s.href}/`) ? "page" : undefined}>
          {t.nav[s.key]}
        </Link>
      ))}
    </nav>
  );
}
