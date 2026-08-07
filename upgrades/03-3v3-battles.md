# Step 3: 3v3 battles + manual switching + hidden team lock-in

## Why here, and why it's the biggest step

This is the largest rework on the list: the room/battle data model changes from "one Pokemon per side" to "a team of 3 with an active slot," a new mid-battle action type (switching) is added, and the room join flow gains a whole new phase (private pick → simultaneous reveal). It depends on step 1 because rooms are keyed by `user_id` by the time this lands. Everything after this step (rematch, match history) builds directly on the shapes defined here, so get the data model right once.

The "don't reveal picks before both are locked in" requirement from `todo.txt` is folded into this step rather than done separately, since the team-picking UI is being built from scratch here anyway — doing it twice would mean redoing the same screen.

## What changes

### Data model
- `RoomState.fighter1` / `fighter2` (single `FighterState`) become `team1` / `team2`: `{ members: FighterState[3], activeIndex: 0 | 1 | 2 }`.
- `battleEngine.ts`'s move type grows a second variant alongside the existing attack move: `{ type: "switch", teamIndex: 0 | 1 | 2 }`. `resolveRound()` takes both players' submitted actions (each either an attack or a switch) and applies **switches before attacks** within the round (see `main.md` for why this default was picked).
- If a Pokemon's active member faints from an attack, that side must switch before its next action is accepted — this is a distinct "forced switch" state from a voluntary mid-turn switch; the room state needs a flag for it (e.g. `awaitingForcedSwitch: 1 | 2 | null`) so the client knows to show only the switch UI, not the move buttons.

### Room lifecycle
Current: `waiting_for_players → battling`, with the Pokemon pick bundled into `join`.
New: `waiting_for_players → picking → battling`.
- `POST /api/rooms/[code]/join` no longer takes a `fighterNumber` — it only seats the second player.
- New `POST /api/rooms/[code]/lock-in` — body is an array of 3 Pokemon numbers. Stores the submitting player's team on the room row **without exposing it to the other player** (not returned from `GET /api/rooms/[code]`, not broadcast) until both players have locked in.
- Once both teams are locked, the server builds the full `RoomState` (both teams now visible), flips status to `battling`, and broadcasts `battle-start` — same event name as today, richer payload.

### Server-side validation (same trust model as existing moves)
- `move/route.ts` must validate: is it this player's turn to act (both act every round, so this is really "have they already submitted"), is the chosen action legal (attack requires enough mana and an alive active Pokemon; switch requires a non-active, non-fainted team member), and recompute damage server-side exactly as it does today — none of this changes, it just needs to happen against `team1/team2` instead of `fighter1/fighter2`.

### Client
- New `components/online/TeamPicker.tsx` — select 3 of the player's Pokemon (reuses the Pokedex data already loaded), submit via `lock-in`.
- `FighterCard.tsx` extended to show the active Pokemon prominently plus the two benched members (sprite + fainted/alive state, no need to show benched HP bars in detail).
- `OnlineBattle.tsx` gains a "picking" phase UI (`TeamPicker` shown until this player's lock-in call succeeds, then a waiting state until the opponent locks in too) before the existing battle UI.
- A switch action needs its own button/control alongside the 4 move buttons, disabled when there's nothing to switch to.

## End state

- [ ] Two players can create/join a room, each independently pick 3 Pokemon, and neither can see the other's picks (verify via the GET endpoint / network tab — the response must not contain the opponent's team before both have locked in) until both have locked in, at which point both teams reveal simultaneously.
- [ ] A full 3v3 battle can be played to completion in two browser windows: attacking, a forced switch on faint, and at least one voluntary mid-battle switch all work and stay in sync between both clients.
- [ ] Server rejects (with the existing 400/403/409-style error responses) an attack that costs more mana than the active Pokemon has, a switch to a fainted or already-active member, and any action submitted out of turn — verified the same way the original server-side trust requirements were verified (e.g. a curl-based two-player simulation), not just by trusting the UI to not offer illegal actions.
- [ ] Battle correctly ends only when a team's all 3 members are fainted, not when just the active one faints.
- [ ] `npm run build` / `npm run lint` clean.
