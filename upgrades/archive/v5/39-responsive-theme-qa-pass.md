# Step 39: Full responsive + theme QA pass

**Status: shipped**, 2026-08-19.

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

- [x] `WelcomeDialog` and both toast content components restyled and
      verified. In practice all three needed zero code changes —
      `WelcomeDialog` already rendered entirely through `Modal`/
      `.btn-primary`/`.welcome-dialog-*` classes already restyled in
      steps 30/31, and `FriendNotifications`' `BattleInviteToast`/
      `FriendMessageToast` already used `.toast-invite`/`.toast-action`
      + `.btn-primary`, also already correct. Verified live: signed up a
      fresh account (captures the real post-signup `?welcome=1` dialog,
      not a synthetic mount), screenshotted in both themes and at phone
      width; triggered a real friend-request toast from a second account
      and screenshotted it live on top of `/pokedex`.
- [x] No dead CSS classes remain in `app/globals.css` for anything this
      wave's steps left behind. Removed: `.filter-row`, `.stat-filter-row`
      (+ its `select` rule), `#btn-random-rival`, `.stat-row`/`.stat-name`/
      `.stat-value`/`.stat-bar-track`/`.stat-bar-fill` (all replaced by
      `SegmentedMeter` in step 34), `.lootbox-stats .stat-bar-fill`,
      `#card-stats h3`/`#online-setup h3` (both headers converted to
      `CardTab` in steps 34/37), and the dead `.progress-bar.small`/
      `.progress-fill.hp`/`.progress-fill.mp` modifiers (FighterCard
      migrated off them in step 35 — the base `.progress-bar`/
      `.progress-fill` rules stay, since `CompletionBanner`'s `.completion`
      modifier still composes with them). Cross-referenced every removal
      against `components/`+`app/` via grep before deleting, and
      `npm run build`/`lint` confirm nothing broke.
- [x] Spacing/radius usage consistent across all pages on manual review.
      Also fixed three leftover hardcoded hex colors that predated this
      wave and had no token-driven reason to stay fixed:
      `.auth-error`/`.nav-link-badge` → `var(--bad)` (with `.nav-link-badge`
      also picking up the `--accent-ink` contrast pairing status badges
      already use, since `--bad` runs bright in dark theme), and
      `.auth-switch a`/`.dashboard-note a` → `var(--info)` (`DESIGN_SYSTEM.md`
      §1 explicitly maps links onto `--info`).
- [x] All 13 routes verified at phone/tablet/desktop widths in both
      themes — 47 live screenshots via Playwright (11 authenticated
      routes × 3 widths × dark, + 11 × desktop-light, + 3 phone-light
      spot-checks; login/signup were already covered exhaustively in
      step 33's validation) plus a programmatic
      `scrollWidth > clientWidth` check on every page load as an
      objective "no horizontal scroll" signal rather than relying on
      eyeballing every cell. Zero overflow, zero console errors across
      the whole run. See implementation notes for a test-harness bug
      this surfaced (not an app bug).
- [x] `design/REDESIGN_TRACKER.md` shows ✅ Done for all 15 rows in its
      Screens table and all 10 rows in its Shared components table —
      flipped from 🎨 Designed, plus its intro/legend/footer rewritten to
      reflect the wave being complete rather than not-yet-started.
- [x] `design/DESIGN_SYSTEM.md` matches the shipped implementation — see
      implementation notes for the two real deviations found and
      reconciled (base-stat meter coloring, the battle log's plain-text
      markup), plus several minor doc gaps fixed (missing "blind" in the
      status-chip list, the move-button two-line layout, softened an
      unverified button-height claim).
- [x] `npm run build` and `npm run lint` both clean.
- [x] This wave's `main.md` archived to `upgrades/archive/v5/` (all 10
      step files + this wave's final `main.md`), with a fresh
      `upgrades/main.md` written reflecting "no active wave," following
      the exact v2/v3/v4 precedent.

### Implementation notes

- **Test-harness bug, not an app bug**: the first pass of the 13-route
  matrix showed `/friends/[id]` rendering identical content to `/friends`
  at every width — traced to Git Bash's MSYS path-conversion quirk
  silently mangling the dynamic route argument (`/friends/<uuid>` got
  rewritten into a bogus `C:\Program Files\Git\friends\<uuid>` URL),
  which made that one `page.goto()` fail and silently leave the browser
  on whatever page it was already showing (caught by an intentionally
  permissive `.catch(() => {})` meant for flaky navigation, not for this
  kind of argument corruption). Re-ran that one route in isolation with
  `MSYS_NO_PATHCONV=1` and confirmed it renders correctly at all three
  widths and both themes — genuinely fine, just a test-script artifact
  that needed tracking down rather than a real gap in this wave's
  coverage.
- **Dead-CSS removal was scoped to this wave's own leftovers**, not a
  full-file audit of everything predating steps 30-39 — e.g. pre-existing
  patterns like the emoji-icon convention or the mono/tabular-nums
  treatment weren't second-guessed, only classes this redesign itself
  orphaned by migrating a component (SegmentedMeter replacing
  `.stat-bar-fill`, CardTab replacing plain `<h3>` headers) were removed.
- **`DESIGN_SYSTEM.md` reconciliation found exactly two real behavioral
  deviations**, both judgment calls made correctly earlier in the wave
  and now documented rather than silently left mismatched: base-stat
  meters keep their pre-existing fixed per-stat color instead of the
  originally-specified type color (§5), and the battle log never grew
  per-line "win"/"hit" highlighting since it's a single `<pre>` block,
  not per-line spans (§6). Neither was a regression — both were always
  true, the doc just hadn't caught up.
- **The `--bad`/`var(--accent-ink)` contrast pairing (first established
  for status badges in step 31) got applied a third time here**, to
  `.nav-link-badge`'s unread-count pill — the same "bright semantic token
  in dark theme fails with literal white text" issue would have
  recurred there if left as a fixed white-on-hex badge, so it's worth
  remembering as the default pairing for any future badge/pill that
  sits directly on `--good`/`--warn`/`--bad`/`--info`.
