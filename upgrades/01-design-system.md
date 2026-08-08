# Step 1: Design system — Tailwind + shadcn/ui foundation

## Why first

Every other step in this plan ships new UI: a result dialog, a card-pack
lootbox reveal, a friends list with live notifications, a trade screen.
This repo has no Tailwind or component-library setup today — `app/globals.css`
is ~600 lines of hand-written plain CSS with a `data-theme` attribute for
dark/light. Doing the migration first means every later step's new UI gets
built once, directly in shadcn — the alternative (build new UI in today's
plain CSS, then redo it later) is strictly more work for the same result.

This is intentionally the single largest step in the plan — it's the one
place "migrate the entire visual style" actually happens, in one pass,
rather than smeared across every later step.

## What changes

### Tooling
- `npx shadcn@latest init` — installs Tailwind CSS + its PostCSS/config
  plumbing, adds `components.json` (shadcn's config: paths, style variant,
  base color), and adds `lib/utils.ts` (the `cn()` helper built on `clsx` +
  `tailwind-merge`, used by every shadcn component for conditional
  classNames).
- `npx shadcn@latest add button card dialog input select progress badge
  avatar separator sonner form label` (and anything else pulled in as
  individual steps need it) — each `add` copies real component source into
  `components/ui/*.tsx`, not an opaque npm dependency. Sonner is shadcn's
  recommended toast component, used later for the app-wide friend
  notification (step 6) as well as small transient confirmations (e.g.
  "Pokémon discarded").
- `tailwindcss-animate` (shadcn's standard companion plugin, added by
  `init`) covers the basic enter/exit/fade/scale keyframes shadcn's own
  components use, and is very likely enough for step 5's reveal animation
  too — no heavier animation library (e.g. framer-motion) unless that
  proves insufficient once step 5 is actually being built.

### Theming
- Replace the current `document.documentElement.dataset.theme = theme`
  toggle (`components/nav/SideNav.tsx`) with shadcn's standard convention:
  `next-themes`' `ThemeProvider` toggling a `dark` class on `<html>`, read
  via Tailwind's `dark:` variant. The toggle UI itself can stay roughly
  where it is (bottom of the side nav), just rebuilt with a shadcn
  `Switch`/`Button` instead of the current custom `.switch` markup.
- Map today's CSS custom properties (`--bg-main`, `--text-primary`,
  `--border-color`, etc. — defined once for dark, overridden for light) onto
  shadcn's expected variable names (`--background`, `--foreground`,
  `--card`, `--border`, `--primary`, etc.) in `globals.css`, so existing
  branding (the red Pokédex accent, the dark-first look) carries over
  instead of defaulting to shadcn's stock zinc/slate palette.
- **Not** part of this migration: `lib/typeData.ts`'s `TYPE_COLORS` (the
  per-type badge colors) and the HP/MP stat-bar fill colors in
  `FighterCard.tsx`/`PokemonDetail.tsx`. Those are content-driven, not
  chrome, and stay as inline styles/arbitrary values exactly as they work
  today.

### Component-by-component
Replace today's hand-rolled classes with shadcn primitives, page by page:
- `.btn-primary` / `.btn-secondary` → shadcn `Button` (`variant="default"` /
  `variant="secondary"`), everywhere one is used: battle actions, forms,
  room/rematch/leave controls, nav.
- `.card` (used everywhere — dashboard widgets, battle arena panels, forms)
  → shadcn `Card`/`CardHeader`/`CardContent`.
- `<input>`/`<select>` (search box, type/status/stat filters, login/signup
  forms, chat input, room-code entry) → shadcn `Input`/`Select`.
- HP/MP bars and Pokédex stat bars → shadcn `Progress`, with the existing
  color-by-percentage logic (`hpColor` in `FighterCard.tsx`) kept as a
  className/style override on top.
- Type badges, caught badges, starter/shiny indicators → shadcn `Badge`.
- The auth pages' inline error text → shadcn `Alert` (or kept as styled
  text if `Alert` feels heavier than needed — judgment call while building).
- `SideNav.tsx` — rebuilt with Tailwind utilities and shadcn `Button`s for
  its links/toggle, keeping its current responsive
  hamburger-on-small-viewports behavior; not adopting shadcn's dedicated
  `Sidebar` block unless it turns out to fit better than expected, since
  today's nav is a simple fixed list, not a collapsible multi-level tree.
- Every page under `app/(app)/**` (dashboard, inventory, pokedex, battle,
  online, history, leaderboard, profile) and the auth pages (`login`,
  `signup`) get touched — this is the "every existing page" part.

### What this step deliberately does NOT do
No new features, no behavior changes — this is a re-skin. Anything that
currently works keeps working exactly the same, just rendered with shadcn
components. Steps 2–7 are where new functionality is built (in shadcn, from
the start, because this step already exists).

## End state

- [x] `components.json`, `lib/utils.ts`, and `components/ui/*.tsx` exist;
      `npm run build` succeeds with the new Tailwind pipeline.
- [x] Dark/light theme toggle still works, now via `next-themes` + Tailwind
      `dark:` classes instead of the `data-theme` attribute.
- [x] Every page renders with shadcn primitives instead of the old
      `.btn-primary`/`.card`/raw `<input>`/`<select>` classes; the
      corresponding dead rules are removed from `globals.css` once nothing
      references them.
- [x] Type badges, stat-bar colors, and sprite rendering are visually
      unchanged — confirm side-by-side against the pre-migration app.
- [x] Battle Arena, Online Battle (including chat), Inventory grid/list
      toggle, and Pokédex filters all still function identically — this is
      a re-skin, not a rewrite, so every existing interaction needs a
      manual pass, not just a build check.
- [x] `npm run build` / `npm run lint` clean.

Implemented with the current shadcn CLI (v4, "base-nova" style, base-ui
primitives instead of Radix — the classic Radix-based shadcn setup this
plan was written against no longer reflects what `npx shadcn@latest init`
actually scaffolds today). Theme CSS variables were rebranded from
shadcn's stock neutral palette to the app's existing dark-first,
green-accent (#2FA572) look; a small `ColorProgress` helper was added
since shadcn's default `Progress` hard-codes a single `bg-primary`
indicator, which doesn't work for HP/MP/stat bars that each need their
own content-driven color.

Validated: `npm run build`/`npm run lint` clean; a live pass against the
dev server (backed by the real Supabase project via a disposable test
account) confirmed every authenticated page renders 200 with none of the
old compound CSS class names surviving anywhere in the markup, and that
the underlying interactions this migration touched still work end-to-end
through the rebuilt UI — inventory lootbox-open and discard, the bot-result
endpoint, and a full online 3v3 room (create/join/lock-in/switch/move to
completion) via the rebuilt `OnlineBattle.tsx`. No browser automation tool
is available in this environment, so pixel-level/visual review (does it
*look* right, not just "does it render and function") still needs a human
pass in an actual browser before considering this fully done.
