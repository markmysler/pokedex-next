"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/inventory", label: "Inventory", icon: "🎒" },
  { href: "/pokedex", label: "Pokédex", icon: "📖" },
  { href: "/battle", label: "Battle", icon: "⚔️" },
  { href: "/online", label: "Online", icon: "🌐" },
  { href: "/history", label: "History", icon: "📜" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

interface SideNavProps {
  displayName: string;
}

export default function SideNav({ displayName }: SideNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Moved here from the old PokedexApp.tsx (retired in step 4) — the side
  // nav is the one thing rendered on every page, so it's the natural home
  // for a cross-cutting control like theme. Same behavior as before: not
  // persisted, always starts dark on a fresh load.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <button className="nav-hamburger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
        ☰
      </button>
      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}

      <aside className={`side-nav${open ? " open" : ""}`}>
        <h1 className="sidebar-title">🔴 POKÉDEX</h1>

        <nav className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-link-icon">{link.icon}</span> {link.label}
            </Link>
          ))}
        </nav>

        <div className="theme-row">
          <span>Theme:</span>
          <label className="switch">
            <input type="checkbox" checked={theme === "dark"} onChange={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
            <span className="slider" />
          </label>
          <span>{theme === "dark" ? "Dark" : "Light"}</span>
        </div>

        <div className="account-row">
          <span className="account-name" title={displayName}>👤 {displayName}</span>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
