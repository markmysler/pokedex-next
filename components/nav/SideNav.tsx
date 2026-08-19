"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import { setMuted } from "@/lib/sound";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/inventory", label: "Inventory", icon: "🎒" },
  { href: "/pokedex", label: "Pokédex", icon: "📖" },
  { href: "/battle", label: "Battle", icon: "⚔️" },
  { href: "/online", label: "Online", icon: "🌐" },
  { href: "/friends", label: "Friends", icon: "🤝" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/history", label: "History", icon: "📜" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

// The 4 routes that get their own mobile tab (upgrades/32-navigation-
// shell-rework.md) -- the ones a trainer reaches for constantly (check the
// team, manage the bag, browse the dex, fight). Everything else lives
// behind the 5th tab, "More" -- same split the design mockups used.
const MOBILE_TAB_HREFS = ["/dashboard", "/inventory", "/pokedex", "/battle"];

interface SideNavProps {
  displayName: string;
  pendingFriendRequestCount?: number;
  unreadNotificationCount?: number;
}

export default function SideNav({ displayName, pendingFriendRequestCount = 0, unreadNotificationCount = 0 }: SideNavProps) {
  const pathname = usePathname();
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
  const moreActive = moreLinks.some((link) => link.href === pathname);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function toggleSound() {
    const next = !soundOn;
    setMuted(!next);
    setSoundOn(next);
  }

  // Shared between the desktop rail's footer and the mobile "More" sheet
  // (upgrades/32-navigation-shell-rework.md) -- there's no room for these
  // in a 5-item tab bar, so they relocate into the sheet on mobile but
  // stay put on the rail, same components either way.
  const accountBlock = (
    <>
      <div className="theme-row">
        <span>Theme:</span>
        <label className="switch">
          <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} />
          <span className="slider" />
        </label>
        <span>{theme === "dark" ? "Dark" : "Light"}</span>
      </div>

      <div className="theme-row">
        <span>Sound:</span>
        <button
          type="button"
          className="btn-secondary sound-toggle"
          onClick={toggleSound}
          aria-label={soundOn ? "Mute sound" : "Unmute sound"}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      <div className="account-row">
        <span className="account-name" title={displayName}>👤 {displayName}</span>
        <SignOutButton />
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
              className={`nav-link${pathname === link.href ? " active" : ""}`}
            >
              <span className="nav-link-icon">{link.icon}</span> {link.label}
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
            className={`tab-item${pathname === link.href ? " active" : ""}`}
          >
            <span className="tab-item-icon">{link.icon}</span>
            {link.label}
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
          More
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
                  className={`nav-link${pathname === link.href ? " active" : ""}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="nav-link-icon">{link.icon}</span> {link.label}
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
