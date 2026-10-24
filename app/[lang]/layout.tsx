import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Chakra_Petch, Figtree, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import "../styles/collection.css";
import "../styles/case.css";
import "../styles/battle.css";
import "../styles/social.css";
import { hasLocale, LOCALES } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Pokédex Kanto - Web Edition",
  // Real user/SEO-facing text, not a code comment -- kept in sync with
  // shipped features the same way step 47 caught this same field
  // advertising a retired mana system (upgrades/47-... in archive/v6).
  // Static/English-only regardless of locale: Metadata here is a plain
  // export, not a per-request generateMetadata(), and no step in this
  // wave scoped localizing it.
  description: "Kanto Pokedex with evolution, a per-move uses battle arena, and online PvP rooms -- in English or Argentinian Spanish",
};

// Redesign wave v9 type roles (design/DESIGN_SYSTEM.md): next/font self-
// hosts these at build time, so no request reaches Google at runtime. Each
// sets a CSS variable that app/globals.css folds into its font stacks.
const display = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--ff-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--ff-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--ff-mono", display: "swap" });

// Every route lives under app/[lang]/ now (upgrades/53-i18n-routing-and-
// toggle-infrastructure.md) -- app/api/** is the one exception, it doesn't
// need a locale segment.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // Docs' own hasLocale pattern (node_modules/next/dist/docs/01-app/02-
  // guides/internationalization.md) -- 404s an unsupported locale segment
  // instead of a runtime error. proxy.ts only ever redirects into a real
  // locale, so this is defense-in-depth against a hand-typed/bookmarked
  // bad URL, not something normal navigation can trigger.
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} data-theme="dark" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
