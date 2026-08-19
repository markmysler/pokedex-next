# Step 32: Navigation shell — desktop rail + mobile bottom tabs

**Status: not started**

## Why here

Depends on 30 (tokens) and 31 (buttons/chips the nav badge/toggle reuse).
Every page in steps 33–38 renders inside this shell, so getting it right
before touching individual pages means each later step is tested inside
its final navigation context, not a placeholder.

This is also the one interaction-model change in the whole wave, not
just a restyle: the current single `<aside class="side-nav">` that
becomes a slide-over drawer under 720px is replaced with two structurally
different layouts.

## What changes

**File**: `components/nav/SideNav.tsx` (rewritten), `app/globals.css`
(new nav classes, old `.side-nav`/`.nav-hamburger`/`.nav-overlay` classes
removed once nothing references them).

1. **Breakpoint moves from 720px to 900px** (`design/DESIGN_SYSTEM.md`
   §7) — a bottom tab bar needs more room to keep touch targets ≥44px
   than a hidden drawer did.
2. **Desktop (≥900px)**: fixed 220px left rail, unchanged link set (all
   10 routes), active state = solid `--accent` pill (already default
   `.nav-link.active` behavior, just recolored via step 30). Structurally
   the same as today's `.side-nav`, so this half is mostly a class
   rename/restyle, not new markup.
3. **Mobile (<900px)**: replace the hamburger+overlay+slide-in-drawer
   with a fixed bottom tab bar — 5 primary items (Dashboard, Inventory,
   Pokédex, Battle, "More") per the mockups. "More" opens a sheet
   (reuse `components/ui/Modal.tsx`, or a small variant anchored to the
   bottom edge instead of centered — implementer's call, keep it in the
   existing modal-overlay pattern rather than a new library) listing the
   remaining 5 routes (Online, Friends, Notifications, History,
   Leaderboard) plus Profile, the theme switch, sound toggle, and sign
   out — i.e. everything the current drawer holds below the nav links.
4. **Unread badges** (`.nav-link-badge` on Friends/Notifications) carry
   over to both layouts: on the rail, same as today; on the bottom tab
   bar, a small dot on the relevant tab (Friends/Notifications currently
   live inside "More" on mobile, so the dot goes on the "More" tab
   itself if either has an unread count — the mockups show this as
   `.mob-tab .dot`).
5. Theme toggle / sound toggle / account row / sign-out move into the
   "More" sheet on mobile (there's no room for them in a 5-item tab bar)
   but stay in their current position at the bottom of the rail on
   desktop — same components (`SignOutButton`, the existing switch
   markup), just relocated per breakpoint.
6. `app/(app)/layout.tsx` — no structural change expected (still renders
   `<SideNav>` + `<main className="app-main">`), but verify `.app-main`'s
   padding/scroll behavior still works with a fixed-height bottom tab bar
   eating into the viewport on mobile (needs `padding-bottom` clearance
   so content isn't hidden behind the tab bar, same idea as
   `env(safe-area-inset-bottom)` in the mockups).

## End state

- [ ] `components/nav/SideNav.tsx` renders a fixed rail ≥900px and a
      fixed bottom tab bar + working "More" sheet <900px, both driven by
      one component (CSS-hidden alternate, not two separately mounted
      trees, to avoid SSR/hydration flash — same approach the old
      hamburger used).
- [ ] All 10 routes reachable from both layouts; active-route
      highlighting correct in both.
- [ ] Unread-count badges (Friends pending requests, Notifications
      unread) visible in both layouts.
- [ ] Theme toggle, sound toggle, display name, sign-out all reachable
      on mobile (via "More") and desktop (rail footer), behavior
      unchanged from today.
- [ ] No page content is obscured behind the bottom tab bar on any
      screen, scrolled to the bottom, on a real phone width (375px)
      viewport.
- [ ] Old `.side-nav`/`.nav-hamburger`/`.nav-overlay` CSS classes fully
      removed once unreferenced.
- [ ] `npm run build` clean; manual click-through of every nav link in
      both breakpoints (browser devtools responsive mode is sufficient)
      and both themes.
