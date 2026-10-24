"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { isMuted, setMuted } from "@/lib/sound";
import { localeFromPathname, stripLocale, withLocale, type Locale } from "@/lib/i18n/locale";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Link from "@/components/LocaleLink";
import Icon, { type IconName } from "@/components/ui/Icon";
import PokedexSearch from "./PokedexSearch";
import { useCaseCount } from "./CaseCount";

type NavKey = "dashboard" | "battle" | "online" | "open" | "inventory" | "pokedex" | "friends" | "history" | "leaderboard";

interface NavLink {
  href: string;
  key: NavKey;
  icon: IconName;
}

// Four groups instead of ten flat links (redesign wave v9). Notifications
// live behind the bell and Profile behind the avatar menu, so the rail only
// holds places you go to play.
const GROUPS: { key: "play" | "collection" | "social" | "records"; links: NavLink[] }[] = [
  {
    key: "play",
    links: [
      { href: "/dashboard", key: "dashboard", icon: "home" },
      { href: "/battle", key: "battle", icon: "swords" },
      { href: "/online", key: "online", icon: "globe" },
    ],
  },
  {
    key: "collection",
    links: [
      { href: "/open", key: "open", icon: "case" },
      { href: "/inventory", key: "inventory", icon: "grid" },
      { href: "/pokedex", key: "pokedex", icon: "book" },
    ],
  },
  { key: "social", links: [{ href: "/friends", key: "friends", icon: "users" }] },
  {
    key: "records",
    links: [
      { href: "/history", key: "history", icon: "clock" },
      { href: "/leaderboard", key: "leaderboard", icon: "trophy" },
    ],
  },
];

// Phone tab bar: the four places reached most, plus a raised Open button in
// the middle. Everything else is one tap away through each page's section
// tabs (SectionTabs) or the avatar menu.
const TAB_SECTIONS: Record<string, string[]> = {
  "/dashboard": ["/dashboard"],
  "/inventory": ["/inventory", "/pokedex"],
  "/battle": ["/battle", "/online", "/history", "/leaderboard"],
  "/friends": ["/friends", "/notifications"],
};

interface SideNavProps {
  displayName: string;
  email: string;
  pendingFriendRequestCount?: number;
  unreadNotificationCount?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

export default function SideNav({ displayName, email, pendingFriendRequestCount = 0, unreadNotificationCount = 0 }: SideNavProps) {
  const dict = useDictionary();
  const t = dict.shell;
  const pathname = usePathname();
  const router = useRouter();
  const localePath = stripLocale(pathname);
  const locale = localeFromPathname(pathname);
  const { count: caseCount } = useCaseCount();

  const [menuOpen, setMenuOpen] = useState(false);
  // Not persisted, same as before the redesign: a fresh load starts dark
  // with sound on.
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function toggleSound() {
    const next = !soundOn;
    setMuted(!next);
    setSoundOn(next);
  }

  // Persists to localStorage and its server-readable cookie twin (proxy.ts
  // can't read localStorage), then swaps the URL's locale segment so the
  // Server Component tree re-renders in the new language right away.
  function toggleLanguage() {
    const nextLocale: Locale = locale === "en" ? "es-AR" : "en";
    try {
      localStorage.setItem("lang", nextLocale);
    } catch {
      // Unavailable in some locked-down browser contexts; the cookie below
      // still carries the choice to the server.
    }
    document.cookie = `lang=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setMenuOpen(false);
    router.push(`/${nextLocale}${localePath === "/" ? "" : localePath}`);
  }

  async function signOut() {
    setSigningOut(true);
    await getSupabaseBrowserClient().auth.signOut();
    router.replace(withLocale(locale, "/login"));
    router.refresh();
  }

  const isActive = (href: string) => localePath === href || localePath.startsWith(`${href}/`);
  const linkCount = (key: NavKey): number => {
    if (key === "friends") return pendingFriendRequestCount;
    if (key === "open") return caseCount;
    return 0;
  };
  const tabActive = (tab: string) => TAB_SECTIONS[tab].some(isActive);

  return (
    <>
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <span className="brand-ball" aria-hidden="true" />
          POKÉDEX
        </Link>

        <PokedexSearch />

        <div className="top-actions">
          <Link href="/open" className={`case-chip${caseCount === 0 ? " is-empty" : ""}`}>
            <Icon name="case" size={16} />
            <span className="mono">{t.casesChip(caseCount)}</span>
            {caseCount > 0 && <span className="case-chip-go">{t.open}</span>}
          </Link>

          <Link href="/notifications" className="icon-btn" aria-label={t.notificationsLabel(unreadNotificationCount)}>
            <Icon name="bell" />
            {unreadNotificationCount > 0 && <span className="dot-badge">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
          </Link>

          <div className="popover-anchor" ref={menuRef}>
            <button
              type="button"
              className="avatar-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t.menu.label}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="avatar">{initials(displayName)}</span>
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu-head">
                  <span className="avatar">{initials(displayName)}</span>
                  <span style={{ minWidth: 0 }}>
                    <b>{displayName}</b>
                    <span>{email}</span>
                  </span>
                </div>
                <Link href="/profile" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <Icon name="user" /> {t.menu.profile}
                </Link>
                <Link href="/history" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <Icon name="clock" /> {t.nav.history}
                </Link>
                <Link href="/leaderboard" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <Icon name="trophy" /> {t.nav.leaderboard}
                </Link>
                <div className="menu-sep" />
                <button type="button" className="menu-item" role="menuitemcheckbox" aria-checked={theme === "dark"} onClick={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}>
                  <Icon name={theme === "dark" ? "moon" : "sun"} /> {t.menu.darkMode}
                  <span className="menu-value">{theme === "dark" ? t.menu.on : t.menu.off}</span>
                </button>
                <button type="button" className="menu-item" role="menuitemcheckbox" aria-checked={soundOn} onClick={toggleSound}>
                  <Icon name={soundOn ? "volume" : "mute"} /> {t.menu.sound}
                  <span className="menu-value">{soundOn ? t.menu.on : t.menu.off}</span>
                </button>
                <button type="button" className="menu-item" role="menuitem" onClick={toggleLanguage}>
                  <Icon name="language" /> {t.menu.language}
                  {/* The language names themselves aren't translated: each is shown in its own language. */}
                  <span className="menu-value">{locale === "en" ? "English" : "Español"}</span>
                </button>
                <div className="menu-sep" />
                <button type="button" className="menu-item" role="menuitem" onClick={signOut} disabled={signingOut}>
                  <Icon name="logout" /> {signingOut ? dict.common.signingOut : dict.common.signOut}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="rail" aria-label={t.mainNav}>
        {GROUPS.map((group) => (
          <div key={group.key} className="rail-group">
            <span className="eyebrow">{t.groups[group.key]}</span>
            {group.links.map((link) => {
              const count = linkCount(link.key);
              return (
                <Link key={link.href} href={link.href} className="rail-link" aria-current={isActive(link.href) ? "page" : undefined}>
                  <Icon name={link.icon} />
                  {t.nav[link.key]}
                  {count > 0 && <span className={`count${link.key === "open" ? " count-gold" : ""}`}>{count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <nav className="tabbar" aria-label={t.mainNav}>
        <Link href="/dashboard" className="tab" aria-current={tabActive("/dashboard") ? "page" : undefined}>
          <Icon name="home" /> {t.nav.dashboard}
        </Link>
        <Link href="/inventory" className="tab" aria-current={tabActive("/inventory") ? "page" : undefined}>
          <Icon name="grid" /> {t.tabs.collection}
        </Link>
        <Link href="/open" className="tab-open" aria-label={t.nav.open}>
          <Icon name="case" />
          {caseCount > 0 && <span className="dot-badge">{caseCount > 99 ? "99+" : caseCount}</span>}
        </Link>
        <Link href="/battle" className="tab" aria-current={tabActive("/battle") ? "page" : undefined}>
          <Icon name="swords" /> {t.nav.battle}
        </Link>
        <Link href="/friends" className="tab" aria-current={tabActive("/friends") ? "page" : undefined}>
          <Icon name="users" /> {t.tabs.social}
          {pendingFriendRequestCount > 0 && <span className="dot-badge" style={{ top: 2, right: "calc(50% - 22px)" }}>{pendingFriendRequestCount}</span>}
        </Link>
      </nav>
    </>
  );
}
