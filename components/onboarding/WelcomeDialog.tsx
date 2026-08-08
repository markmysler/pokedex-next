"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Modal from "@/components/ui/Modal";

// Shown once, right after signup -- app/signup/page.tsx redirects into
// /dashboard?welcome=1 on a successful signUp() rather than persisting a
// "has seen onboarding" flag anywhere, since the moment of account
// creation is already unambiguous client-side (no DB round trip needed to
// know this is a first visit). Dismissing strips the query param so a
// refresh doesn't re-trigger it.
export default function WelcomeDialog() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (searchParams.get("welcome") !== "1") return null;

  function dismiss() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <Modal onClose={dismiss} large>
      <h2>🎉 Welcome, Trainer!</h2>
      <div className="welcome-dialog-body">
        <p>
          You&apos;ve been given 3 starter Pokémon — Bulbasaur, Charmander,
          and Squirtle — to kick off your journey. They&apos;re yours
          forever: starters can never be discarded or traded away.
        </p>
        <p>
          We also dropped your very first <strong>📦 Lootbox</strong> into
          your Inventory. Here&apos;s how it all works:
        </p>
        <ul className="welcome-dialog-list">
          <li>
            📦 <strong>Opening a Lootbox</strong> gives you one random
            Pokémon. Its stats are rolled individually around that
            species&apos; normal stats, so no two of the same species ever
            turn out quite identical — some rolls land unusually strong.
          </li>
          <li>
            ✨ <strong>Shiny Pokémon</strong> are a rare find (roughly 1 in
            10) — an instance whose rolled stats and moveset both land near
            the top of what that species could roll.
          </li>
          <li>
            🏆 <strong>Winning battles</strong> earns more Lootboxes: an
            online win against a real player always drops one, a bot battle
            win has a 25% chance.
          </li>
          <li>
            🔥 <strong>Trade Up</strong>, in your Inventory, lets you burn 5
            unwanted (non-starter) Pokémon at once for 1 guaranteed
            Lootbox.
          </li>
        </ul>
      </div>
      <button className="btn-primary" onClick={dismiss}>
        🎒 Got it, let&apos;s go!
      </button>
    </Modal>
  );
}
