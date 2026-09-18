import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { hasLocale, LOCALES } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Pokédex Kanto - Web Edition",
  description: "Kanto Pokedex with a per-move uses battle arena and online PvP rooms",
};

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
    <html lang={lang} data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
