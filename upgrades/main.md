# Upgrade Path

Order and rationale for implementing the features listed in `todo.txt`. Each step has its own file with what to build and an end state to validate against before moving to the next step.

Two features (Auth, 3v3) change data models and identity assumptions that every later feature depends on, so they come first. Everything else is ordered by what it builds on top of.

| # | Step | File | Depends on |
|---|------|------|------------|
| 1 | Auth (Supabase email/password, login required app-wide) | [01-auth.md](01-auth.md) | — |
| 2 | UI upgrades (sidebar redesign) | [02-ui-sidebar.md](02-ui-sidebar.md) | — (independent, slotted here as a low-risk break between backend-heavy steps) |
| 3 | 3v3 battles + manual switching + hidden team lock-in | [03-3v3-battles.md](03-3v3-battles.md) | 1 |
| 4 | Rematch (same room code) | [04-rematch.md](04-rematch.md) | 3 |
| 5 | Match history + public leaderboard | [05-match-history-leaderboard.md](05-match-history-leaderboard.md) | 1, 3 |
| 6 | In-match chat | [06-chat.md](06-chat.md) | — (independent, done last as polish) |

## Key decisions already made

- **Login is required app-wide** — the anonymous `anon_id` cookie identity is fully replaced by Supabase Auth. Nothing (Pokedex included) works without an account.
- **Existing `user_pokedex`/`battle_rooms` data will be wiped** as part of step 1, since current rows are keyed by anon cookie UUIDs with no path to a real account. If preserving that data turns out to matter, stop before step 1 and revisit.
- **3v3 switching is manual** (like the mainline games), not auto-on-faint-only. This is the more complex option and is why step 3 is the biggest step on this list.
- **Match history/leaderboard is public** (global leaderboard across all accounts), not private-per-user.
- **Rematch reuses the same room code/row** rather than creating a new room.
- Within a round, **switches resolve before attacks**; both players still submit their action simultaneously (same atomic `submit_move`/`finalize_round` RPC pattern already in place). This is a default, not a hard requirement — revisit if it plays badly.
- **Rematch requires both players to confirm** before the room resets (one requests, the other accepts) rather than resetting instantly on request.
- **Chat is ephemeral** (not persisted to a table) and sent client-to-client over the existing Realtime channel without a server round-trip, since unlike battle moves it isn't a cheating vector.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file. Every item should be verifiable by hand (`npm run build`, a browser check, a Supabase table query, etc.) — if an item can't be checked, the step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
