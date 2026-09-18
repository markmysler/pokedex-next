import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { hasLocale } from "./locale";

// Docs' own getDictionary(locale) pattern (node_modules/next/dist/docs/
// 01-app/02-guides/internationalization.md's "sharing the locale across
// your app" section), just with the locale read internally via
// next/root-params instead of every caller passing it down. Server
// Components/utilities only -- Route Handlers and Client Components can't
// use next/root-params; neither needs a dictionary yet (app/api/** never
// renders user-facing text, and Client Components that eventually need
// translated strings get them via a prop from their Server Component
// parent, same as any other server-fetched data).
const dictionaries = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  "es-AR": () => import("./dictionaries/es-AR").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export async function getDictionary(): Promise<Dictionary> {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]();
}
