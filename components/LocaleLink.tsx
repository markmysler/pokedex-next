"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";

type LocaleLinkProps = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

// Drop-in replacement for next/link in Client Components (upgrades/53-i18n-
// routing-and-toggle-infrastructure.md). Every href in this app is a bare
// app-relative path ("/dashboard") -- never external -- so this always
// prefixes with whatever locale the current URL is already in, read
// straight from usePathname() since Client Components can't call
// next/root-params. Server Components don't need this: they already have
// the locale for free via next/root-params and can build the href directly.
export default function LocaleLink({ href, ...rest }: LocaleLinkProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const localizedHref = typeof href === "string" ? withLocale(locale, href) : href;
  return <Link href={localizedHref} {...rest} />;
}
