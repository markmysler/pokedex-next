# Upgrade Path (v3)

Third wave of upgrades, requested 2026-08-08 after the v2 plan
([archive/v2/main.md](archive/v2/main.md), itself built on the original
8-step plan at [archive/main.md](archive/main.md)) shipped in full,
including its own post-plan fixes (starters made untradeable, a UI-polish
pass, and the welcome-lootbox/onboarding dialog — see the bottom of
[archive/v2/main.md](archive/v2/main.md) for those). This wave is three
smaller, independent requests: a tooltip hover-area bug, a real
persistent-notifications feature (today's friend/battle-invite toasts
vanish on refresh with no way to recover them), and a match-history/
dashboard display bug (online opponents show as a generic "another
player" instead of their actual name in one of the two places that show
match history).

Each step has its own file with what to build and an end state to
validate against before moving to the next step — same format as both
archived plans.

| # | Step | File | Depends on |
|---|------|------|------------|
| 16 | Status-badge tooltip hover area | [16-status-tooltip-hover-area.md](16-status-tooltip-hover-area.md) | — |
| 17 | Persistent notifications (battle invites + everything else that was toast-only) | [17-persistent-notifications.md](17-persistent-notifications.md) | — |
| 18 | Show the actual opponent display name everywhere match history is shown | [18-match-history-opponent-names.md](18-match-history-opponent-names.md) | — |
| 19 | Burn and Freeze status effects (Fire/Ice-type moves) | [19-burn-and-freeze-status-effects.md](19-burn-and-freeze-status-effects.md) | — |
| 20 | Newly-opened lootbox Pokémon missing from the post-win Team Picker | [20-rematch-team-picker-missing-new-lootbox-pokemon.md](20-rematch-team-picker-missing-new-lootbox-pokemon.md) | — |

## Why this order

All three are independent of each other and of every prior step — ordered
smallest-and-most-mechanical first (16), then the one genuinely new
feature (17), then another small display-only fix (18). None blocks any
other; they could ship in any order.

## Key decisions already made

From the 2026-08-08 planning conversation:

- **Status-badge tooltips already use `title` on the whole badge element**
  (added in v2's post-plan UI-polish pass) — the bug is that hovering only
  reliably triggers over the emoji glyph itself, not the padded area
  around the label text, in at least one tested browser. Root-caused to
  `.status-badge` being a default `display: inline` element, whose
  hover/hit-test box for `title` tooltips isn't guaranteed to include its
  own padding consistently across engines — fixed by giving it an
  explicit `inline-flex` box instead, not by touching the `title` text
  itself.
- **Persisted notifications reuse the existing broadcast events almost
  verbatim, not a new event taxonomy.** Every place that already calls
  `broadcastToUser()` for a toast (friend request, friend request
  accepted, battle invite, friend message, trade offer, trade resolved)
  gets one new insert into a generic `notifications` table alongside the
  existing broadcast call — same `kind`, same `payload` shape the toast
  already receives. The live toast behavior for someone actively in the
  app is unchanged; the new table is what makes the same events
  recoverable after a refresh or while offline.
- **Only battle invites get a real "Accept" action directly on the
  Notifications page.** Every other notification kind already has a
  proper persisted, browsable home elsewhere (incoming friend requests on
  `/friends`, trade offers and messages on `/friends/[id]`) — the
  Notifications page links out to those rather than duplicating their
  accept/decline UI. Battle invites are the one kind with no other home:
  a `battle_rooms` row today doesn't record *who* was invited, so without
  this table an invite that scrolls past as a toast is unrecoverable
  except by the host re-sending it.
- **A battle-invite notification checks room freshness at render time**
  (still `status = 'waiting'` and unclaimed) before offering "Accept" —
  same staleness a stale toast's own `accept()` handler already surfaces
  as an error today, just checked proactively instead of failing on
  click.
- **Opening the Notifications page marks everything currently listed as
  read** (one bulk update), rather than a per-item "mark read" control —
  simplest semantics ("you've now seen these"), matching how visiting
  `/friends` already implicitly "handles" incoming friend requests today.
- **The match-history opponent-name bug is a duplication bug, not a
  missing feature.** `lib/history.ts`'s `getMatchHistoryForUser()`
  already resolves online opponents' real display names correctly for the
  `/history` page (step 7 of the v2 plan) — the Dashboard's separate
  "Recent Matches" card queries `match_results` directly with its own
  inline logic and hardcodes `"another player"` for every online match,
  never resolving a name. Fixed by having the Dashboard reuse
  `getMatchHistoryForUser()` (sliced to its most recent 5) instead of
  duplicating the resolution logic a second time, badly.
- **Burn and Freeze (step 19, added after 16-18 shipped) reuse the
  existing status-effect machinery from v2's step 10** (bleed/blind/
  poison) rather than inventing a parallel system — same turn-counter
  shape, same `STATUS_INFLICT_CAP`/`STATUS_DURATION`, same
  `applyStatusTick()` decay point, same badge/tooltip UI pattern. Burn is
  a damage tick like bleed/poison (gated by `Fire`-type moves, immune on
  `Water` targets, doubled tick on `Grass` targets). Freeze is a new
  mechanic — a temporary atk/def/spd debuff on the frozen fighter itself,
  not a damage tick — gated by `Ice`-type moves, immune on `Fire` targets.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
