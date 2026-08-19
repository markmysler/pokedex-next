# Step 39: Full responsive + theme QA pass

**Status: not started**

## Why here

Every screen has now been individually restyled and spot-checked (33–38
each end with their own theme/breakpoint checklist), but no step so far
has looked at the app as a *whole* — consistent spacing across unrelated
pages, no leftover old tokens/classes, WelcomeDialog and other
cross-cutting pieces not explicitly assigned to a cluster, and the two
design docs kept honest against what actually got built. Depends on
33–38 (everything shipped).

## What changes

Mostly verification, not new UI — but a few pieces genuinely have no
home in steps 30–38 and belong here:

- **`components/onboarding/WelcomeDialog.tsx`**: restyle onto the new
  `Modal`/button tokens (missed by every earlier step since it isn't
  tied to a specific cluster — it overlays Dashboard on first visit).
- **`components/notifications/MarkAllReadOnMount.tsx`**,
  **`components/friends/FriendNotifications.tsx`**'s toast content
  (`BattleInviteToast`, `FriendMessageToast`): confirm they render
  correctly against step 31's toast sizing fix — these are the actual
  runtime toast content, distinct from the Design System artifact's
  static mockup.
- **Dead CSS sweep**: grep `app/globals.css` for any class no longer
  referenced by any `.tsx` file (leftover from the old design — e.g. if
  `.hover-color`-based rules or old badge colors survived step
  30/31's rename) and remove them.
- **Cross-page consistency pass**: spacing scale (`--s-*`) and radius
  scale (`--r-*`) actually used consistently — e.g. every `.card` uses
  the same padding, every button row uses the same gap — rather than
  each page step having drifted slightly from the others.
- **Full theme + breakpoint matrix**: every one of the 13 routes,
  checked at minimum at ~375px (phone), ~768px (tablet), ~1280px
  (desktop), in both light and dark theme — 13 × 3 × 2 = 78 cells, doesn't
  need a written table, just methodical manual coverage (or Playwright
  screenshots if the project has any visual-testing setup — it
  currently doesn't, so manual is expected).
- **Update `design/REDESIGN_TRACKER.md`**: flip every screen from 🎨
  Designed to ✅ Done as it's verified in this step (should already be
  ✅ per-cluster if 33–38 were done correctly — this step is the final
  confirmation pass, not the first time anything gets marked done).
- **Reconcile `design/DESIGN_SYSTEM.md`** against whatever actually
  shipped — if any step made a justified deviation from the spec (e.g.
  a token value tweaked for contrast, a component merged/split
  differently than planned), update the doc so it stays the source of
  truth rather than a stale plan.

## End state

- [ ] `WelcomeDialog` and both toast content components restyled and
      verified.
- [ ] No dead CSS classes remain in `app/globals.css` (cross-referenced
      against actual `className`/template-literal usage across
      `components/` and `app/`).
- [ ] Spacing/radius usage consistent across all pages on manual review.
- [ ] All 13 routes verified at phone/tablet/desktop widths in both
      themes — no illegible text, no overlapping elements, no
      horizontally-scrolling page body anywhere.
- [ ] `design/REDESIGN_TRACKER.md` shows ✅ Done for all 15 rows in its
      Screens table and all 10 rows in its Shared components table.
- [ ] `design/DESIGN_SYSTEM.md` matches the shipped implementation (no
      stale token values/component descriptions).
- [ ] `npm run build` and `npm run lint` both clean.
- [ ] This wave's `main.md` updated to reflect completion (see
      `main.md`'s own "Working through a step" note — the wave gets
      archived to `upgrades/archive/v5/` the same way v2/v3/v4 were,
      with `main.md` rewritten to "no active wave" pointing at it).
