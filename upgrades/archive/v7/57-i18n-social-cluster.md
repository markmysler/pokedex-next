# Step 57: i18n content — Social cluster

**Status: Shipped.** See `main.md`'s "Evolution, Psychic counterplay,
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

- [x] Friends, Friend Chat & Trade, Notifications, History, and Leaderboard
      render fully in either locale.
- [x] `renderNotification()` (`app/[lang]/(app)/notifications/page.tsx`) and
      `FriendNotifications.tsx`'s toast renderer both pull their template
      strings from the dictionary, interpolating `payload` fields — no
      hardcoded English left in either `switch (n.kind)`.
- [x] Confirmed (already true, verified during planning): no notification
      body is ever persisted as rendered text, so nothing needs a data
      migration or backfill for existing rows to display correctly in
      either locale.
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

### `renderNotification()`/`FriendNotifications.tsx`, exactly as planned

Both now build every sentence from `dict.social.notifications`, interpolating
`payload` fields exactly as scoped — `notifications.payload`'s shape,
`createNotification()`, and how/when notifications are written are all
untouched, confirmed by not needing to touch `lib/notifications.ts` at all.
Every dictionary entry here is the sentence's *tail* only (`"sent you a
friend request."`), with the actor's name bolded ahead of it by the caller —
the same split the original hardcoded JSX already used, just sourced from
the dictionary now. `renderNotification()` is called directly from
`NotificationsPage`'s own render (never passed as a prop across a
Server->Client boundary), so it can take the whole `Dictionary` object,
function-valued entries included, with zero risk of the steps-55/56 RSC
serialization bug — its return value is a `ReactNode`, not a dictionary.

One case, `trade-resolved`, needed more than string interpolation:
`payload.status` is one of 3 fixed enum values our own code writes
(`"accepted" | "declined" | "cancelled"`, from
`app/api/friends/trade/[id]/{accept,decline}/route.ts`) — not user content,
so (unlike a display name or a chat message) it's a legitimate translation
target. `notifications.tradeResolved(status)` maps all 3 to the right
Spanish participle (`aceptado`/`rechazado`/`cancelado`) rather than treating
`status` as opaque text to interpolate raw.

### One ESLint catch: a ref read inside a component's own render body

`FriendNotifications.tsx`'s toast handlers use a `dictRef` (mirroring the
pre-existing `pushRef` pattern) so the live-subscription effect doesn't need
`dict` in its dependency array. Initially wired `BattleInviteToast` to read
`dictRef.current` directly inside its own function body — passed
`npm run build` fine, but `npm run lint` caught it immediately:
`react-hooks/refs` ("Cannot access refs during render"), since that
component's body *is* a render despite being constructed inline inside an
event handler. Fixed by having the *caller* (the event handler itself, not
a render) resolve the needed strings from `dictRef.current` and pass them
down as plain string/function props — the same shape `FriendMessageToast`
already used correctly for its `openLabel` prop.

### `lib/history.ts`'s `opponentLabel` moved out of the data layer

Found while wiring History: `getMatchHistoryForUser()` was baking
`"a Bot"`/`"a departed player"` directly into `MatchHistoryEntry` as a
pre-rendered English `opponentLabel` string — both the `/history` page and
Dashboard's "Recent matches" card displayed this raw, regardless of locale
(a real pre-existing gap, not something this step's scope technically
required touching, but the same "never bake rendered text into a
non-UI-layer module" principle step 56's `classifyLogLine` fix already
established). Replaced with `opponentKind: "bot" | "player"` +
`opponentName: string | null`; both call sites now render the localized
label themselves via `dict.social.history.opponentBot`/`opponentDeparted`.
The unused `GET /api/history` route (confirmed via search — no client code
calls it) picked up the shape change too, with no consumer to break.

### Reused existing infrastructure rather than re-solving it

`ChatPanel.tsx` (step 56) needed no changes — Friend Chat reuses it as-is,
including its generic `you`/`send`/`placeholder` strings. `PokemonMultiPicker.tsx`
(the trade builder's grid, previously untranslated in any step) got wired
the same way TeamPicker's `PokemonFilterBar` call site was in step 56: real
`dict`/`allTypesLabel` props, `useDictionary()` for its own strings. One
near-miss caught before it shipped: initializing `PokemonFilterBar`'s
`typeFilter` state to the *translated* `allTypesLabel` instead of the
literal sentinel value `"All Types"` `lib/pokemonFilters.ts` compares
against — every other call site (TeamPicker, PokedexPageClient,
InventoryPageClient) keeps the state untranslated and only translates the
*displayed* option label, caught by comparing against that precedent before
running anything.

### Validation performed

- `rm -rf .next` + fresh `npm run build`, `npm run lint`: both clean.
- Two fresh accounts signed up against local Supabase via genuine
  `@supabase/ssr` sessions (no shortcuts), then driven entirely over real
  HTTP through the actual API routes: friend request → accept, a real chat
  message, a real 3-outcome trade cycle (accepted/declined/cancelled — all
  3 `tradeResolved()` branches confirmed rendering correctly in both
  locales), a real battle invite through to a real room join, two recorded
  bot-battle results, and a leaderboard/dashboard check.
- Fetched every Social-cluster page (`/friends`, `/friends/[id]`,
  `/notifications`, `/history`, `/leaderboard`, `/dashboard`) in both
  locales with real session cookies: all 200, not the `id="__next_error__"`
  shell an RSC function-boundary violation produces.
- `roomSuffix`/`yourTeamSuffix`/leaderboard `wins()` singular-vs-plural
  templates checked directly via a `tsx` script (same technique steps
  55-56 established) rather than playing a full online match to completion
  just to populate one `match_results` row, given how simple these
  particular template functions are.
- Negative check: grepped every `es-AR` Social-cluster page fetched for
  English chrome and every `en` page for Spanish chrome — zero matches
  either direction.
