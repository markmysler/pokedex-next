"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import { setMuted } from "@/lib/sound";
import { localeFromPathname, stripLocale, type Locale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import Link from "@/components/LocaleLink";

// `key` indexes into dict.nav (this component's `dict` prop) for the
// translated label -- the href/icon stay fixed, only the label is locale-
// dependent (upgrades/54-i18n-account-cluster.md).
const LINKS = [
  { href: "/dashboard", key: "dashboard", icon: "🏠" },
  { href: "/inventory", key: "inventory", icon: "🎒" },
  { href: "/pokedex", key: "pokedex", icon: "📖" },
  { href: "/battle", key: "battle", icon: "⚔️" },
  { href: "/online", key: "online", icon: "🌐" },
  { href: "/friends", key: "friends", icon: "🤝" },
  { href: "/notifications", key: "notifications", icon: "🔔" },
  { href: "/history", key: "history", icon: "📜" },
  { href: "/leaderboard", key: "leaderboard", icon: "🏆" },
  { href: "/profile", key: "profile", icon: "👤" },
] as const satisfies readonly { href: string; key: keyof Dictionary["common"]["nav"]; icon: string }[];

// The 4 routes that get their own mobile tab (upgrades/32-navigation-
// shell-rework.md) -- the ones a trainer reaches for constantly (check the
// team, manage the bag, browse the dex, fight). Everything else lives
// behind the 5th tab, "More" -- same split the design mockups used.
const MOBILE_TAB_HREFS = ["/dashboard", "/inventory", "/pokedex", "/battle"];

interface SideNavProps {
  displayName: string;
  pendingFriendRequestCount?: number;
  unreadNotificationCount?: number;
  dict: Dictionary["common"];
}

export default function SideNav({
  displayName,
  pendingFriendRequestCount = 0,
  unreadNotificationCount = 0,
  dict,
}: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  // The nav's own LINKS array holds bare app paths ("/dashboard"), but
  // `pathname` (from usePathname()) is always locale-prefixed now -- strip
  // it once so every "is this the active link" comparison below still
  // works the same as before the i18n routing change.
  const localePath = stripLocale(pathname);
  const locale = localeFromPathname(pathname);
  // Mobile-only "More" sheet (upgrades/32-navigation-shell-rework.md) --
  // replaces the old hamburger drawer's `open` state; the desktop rail
  // itself has no open/closed state anymore, it's just always visible
  // >=900px and hidden <900px via CSS.
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  // Same precedent as theme above: not persisted, always starts on (sound
  // audible) on a fresh load (upgrades/11-sound-effects.md).
  const [soundOn, setSoundOn] = useState(true);

  // Moved here from the old PokedexApp.tsx (retired in step 4) — the side
  // nav is the one thing rendered on every page, so it's the natural home
  // for a cross-cutting control like theme. Same behavior as before: not
  // persisted, always starts dark on a fresh load.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const tabLinks = LINKS.filter((link) => MOBILE_TAB_HREFS.includes(link.href));
  const moreLinks = LINKS.filter((link) => !MOBILE_TAB_HREFS.includes(link.href));
  const hasUnread = pendingFriendRequestCount > 0 || unreadNotificationCount > 0;
  // Friends/Notifications live inside "More" on mobile (upgrades/32-
  // navigation-shell-rework.md) -- so a route within there still lights
  // up the More tab as the active one, same as any other tab would.
  const moreActive = moreLinks.some((link) => link.href === localePath);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function toggleSound() {
    const next = !soundOn;
    setMuted(!next);
    setSoundOn(next);
  }

  // Language toggle (upgrades/53-i18n-routing-and-toggle-infrastructure.md)
  // -- same theme-row pattern as Theme/Sound above, a 2-state EN/ES switch
  // in the same accountBlock. Persists to localStorage (the user's explicit
  // ask) and its server-readable cookie twin (proxy.ts can't read
  // localStorage), then navigates to the same route with the URL segment
  // swapped so the Server Component tree re-renders in the new language
  // immediately -- no flash-of-wrong-language to correct for, since the
  // locale comes from the URL itself, not a value read client-side after
  // the fact (node_modules/next/dist/docs/01-app/02-guides/preventing-
  // flash-before-hydration.md's inline-script technique is for values
  // *unavailable* at SSR time; that's not the case here).
  function toggleLanguage() {
    const nextLocale: Locale = locale === "en" ? "es-AR" : "en";
    try {
      localStorage.setItem("lang", nextLocale);
    } catch {
      // Unavailable in some private/locked-down browser contexts -- the
      // cookie below still lets the server pick it up next visit either way.
    }
    document.cookie = `lang=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.push(`/${nextLocale}${localePath === "/" ? "" : localePath}`);
  }

  // Shared between the desktop rail's footer and the mobile "More" sheet
  // (upgrades/32-navigation-shell-rework.md) -- there's no room for these
  // in a 5-item tab bar, so they relocate into the sheet on mobile but
  // stay put on the rail, same components either way.
  const accountBlock = (
    <>
      <div className="theme-row">
        <span>{dict.theme.label}</span>
        <label className="switch">
          <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} />
          <span className="slider" />
        </label>
        <span>{theme === "dark" ? dict.theme.dark : dict.theme.light}</span>
      </div>

      <div className="theme-row">
        <span>{dict.sound.label}</span>
        <button
          type="button"
          className="btn-secondary sound-toggle"
          onClick={toggleSound}
          aria-label={soundOn ? dict.sound.mute : dict.sound.unmute}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      <div className="theme-row">
        <span>{dict.language.label}</span>
        <label className="switch">
          <input type="checkbox" checked={locale === "es-AR"} onChange={toggleLanguage} />
          <span className="slider" />
        </label>
        {/* The language codes themselves (EN/ES) aren't translated content
            -- they're the two options the toggle switches between. */}
        <span>{locale === "en" ? "EN" : "ES"}</span>
      </div>

      <div className="account-row">
        <span className="account-name" title={displayName}>👤 {displayName}</span>
        <SignOutButton dict={dict} />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop rail, >=900px -- hidden via CSS below that, see .side-nav's
          media query in globals.css. */}
      <aside className="side-nav">
        <h1 className="sidebar-title">🔴 POKÉDEX</h1>

        <nav className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${localePath === link.href ? " active" : ""}`}
            >
              <span className="nav-link-icon">{link.icon}</span> {dict.nav[link.key]}
              {link.href === "/friends" && pendingFriendRequestCount > 0 && (
                <span className="nav-link-badge">{pendingFriendRequestCount}</span>
              )}
              {link.href === "/notifications" && unreadNotificationCount > 0 && (
                <span className="nav-link-badge">{unreadNotificationCount}</span>
              )}
            </Link>
          ))}
        </nav>

        {accountBlock}
      </aside>

      {/* Mobile bottom tab bar, <900px -- hidden via CSS at/above that. */}
      <nav className="tab-bar">
        {tabLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`tab-item${localePath === link.href ? " active" : ""}`}
          >
            <span className="tab-item-icon">{link.icon}</span>
            {dict.nav[link.key]}
          </Link>
        ))}
        <button
          type="button"
          className={`tab-item${moreActive ? " active" : ""}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <span className="tab-item-icon">⋯</span>
          {dict.nav.more}
          {hasUnread && <span className="tab-item-dot" aria-hidden="true" />}
        </button>
      </nav>

      {moreOpen && (
        <div className="modal-overlay sheet-overlay" onClick={() => setMoreOpen(false)}>
          <div className="card sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <nav className="nav-links">
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${localePath === link.href ? " active" : ""}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="nav-link-icon">{link.icon}</span> {dict.nav[link.key]}
                  {link.href === "/friends" && pendingFriendRequestCount > 0 && (
                    <span className="nav-link-badge">{pendingFriendRequestCount}</span>
                  )}
                  {link.href === "/notifications" && unreadNotificationCount > 0 && (
                    <span className="nav-link-badge">{unreadNotificationCount}</span>
                  )}
                </Link>
              ))}
            </nav>
            {accountBlock}
          </div>
        </div>
      )}
    </>
  );
}
