# Step 57: i18n content — Social cluster

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

Needs step 53's infrastructure. Independent of 54/55/56 — last of the 4
content steps simply by table position, not a real dependency.

## What changes

Covers `design/REDESIGN_TRACKER.md`'s "Social cluster": **Friends, Friend
Chat & Trade, Notifications, History, Leaderboard** — plus any remaining
onboarding copy not already covered by step 54's `WelcomeDialog` pass.

### Good news, confirmed during planning: notifications are already event-shaped

The concern raised when this step was first scoped — that notification
bodies might be persisted as rendered text, frozen in whichever language
was active when generated — turned out not to apply. `notifications.payload`
(`supabase/migrations/20260808070000_notifications.sql`) is stored as raw
structured JSONB (`fromDisplayName`, `friendshipId`, `roomCode`, `status`,
etc.) with **no rendered sentence baked in** — `kind` + `payload` is exactly
the "structured event, render on arrival" shape requested for step 56's
battle log, and this table already does it. The rendering happens
client/server-side at *read* time, in
`renderNotification()`
(`app/(app)/notifications/page.tsx`) and its live-toast twin in
`FriendNotifications.tsx`, both of which currently hardcode English JSX
directly in a `switch (n.kind)`.

So this step's actual task is narrower than a data migration: **make
`renderNotification()` and `FriendNotifications.tsx`'s toast renderer pull
their template strings from the dictionary** (step 53), interpolating the
already-structured `payload` fields into the localized template — e.g.
`dict.notifications.friendRequest(payload.fromDisplayName)` instead of the
current inline JSX. No schema change, no migration, no change to how
notifications are created or stored.

One exception, unchanged from the original scoping: **user-generated
content is never translated** — `friend-message`'s `payload.text` is the
sender's actual message body, rendered verbatim in either locale, same as
a friend's display name.

### Other known surfaces

Friend Chat & Trade UI copy (`app/(app)/friends/[id]/page.tsx` and its
client components); History/Leaderboard row templates (opponent names,
win/loss labels, rank labels); any remaining onboarding copy not already
covered by step 54.

### What does NOT change in this step

- No new routing/dictionary mechanics.
- `notifications.payload`'s shape, `createNotification()`, or anything
  about how/when notifications are written — confirmed already correct for
  this purpose.
- User-generated content itself (chat message bodies, display names) is
  never translated.

## End state

- [ ] Friends, Friend Chat & Trade, Notifications, History, and Leaderboard
      render fully in either locale.
- [ ] `renderNotification()` (`app/(app)/notifications/page.tsx`) and
      `FriendNotifications.tsx`'s toast renderer both pull their template
      strings from the dictionary, interpolating `payload` fields — no
      hardcoded English left in either `switch (n.kind)`.
- [ ] Confirmed (already true, verified during planning): no notification
      body is ever persisted as rendered text, so nothing needs a data
      migration or backfill for existing rows to display correctly in
      either locale.
- [ ] `npm run build` / `npm run lint` clean.
