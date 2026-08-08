"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import SignOutButton from "@/components/auth/SignOutButton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/inventory", label: "Inventory", icon: "🎒" },
  { href: "/pokedex", label: "Pokédex", icon: "📖" },
  { href: "/battle", label: "Battle", icon: "⚔️" },
  { href: "/online", label: "Online", icon: "🌐" },
  { href: "/history", label: "History", icon: "📜" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

interface SideNavProps {
  displayName: string;
}

export default function SideNav({ displayName }: SideNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: the server has no idea what theme the
  // client will resolve to (next-themes reads localStorage), so the first
  // client render has to match the server's guess until this effect runs.
  const [mounted, setMounted] = useState(false);
  // Standard next-themes hydration guard: the server can't know the
  // client's stored theme, so this flips exactly once after mount to swap
  // from the server's guess to the real value.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed top-3 left-3 z-30 md:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? <X /> : <Menu />}
      </Button>
      {open && <div className="fixed inset-0 z-10 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "flex w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:transition-transform max-md:duration-200",
          open ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
      >
        <h1 className="mb-1 text-xl font-bold">🔴 POKÉDEX</h1>

        <nav className="flex flex-1 flex-col gap-0.5">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span className="text-base">{link.icon}</span> {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 pt-1.5 text-xs">
          <span>Theme:</span>
          <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
          <span>{isDark ? "Dark" : "Light"}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-sidebar-border pt-2 text-xs">
          <span className="truncate font-bold" title={displayName}>👤 {displayName}</span>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
