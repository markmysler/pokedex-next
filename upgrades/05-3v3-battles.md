# Step 5: 3v3 battles + manual switching + hidden team lock-in

## Why here, and why it's the biggest remaining step

Now that battles draw from owned `pokemon_instances` (steps 2–4) instead of raw species picks, this step layers "pick 3 of your owned instances instead of 1" on top of an already-working owned-Pokémon battle system, rather than building team selection twice. It depends on steps 1–4: rooms are keyed by `user_id`, teams come from inventory, and the nav/pages already exist to build the team-picking UI into.

The "don't reveal picks before both are locked in" requirement from `todo.txt` is folded into this step rather than done separately, since the team-picking UI is being built from scratch here anyway.

## What changes

### Data model
- `RoomState.fighter1` / `fighter2` (single `FighterState`) become `team1` / `team2`: `{ members: FighterState[3], activeIndex: 0 | 1 | 2 }`, each member built from an owned `pokemon_instances` id (not a raw species number) via `buildFighterState()`.
- `battleEngine.ts`'s move type grows a second variant alongside the existing attack move: `{ type: "switch", teamIndex: 0 | 1 | 2 }`. `resolveRound()` takes both players' submitted actions (each either an attack or a switch) and applies **switches before attacks** within the round.
- If a Pokémon's active member faints from an attack, that side must switch before its next action is accepted — a distinct "forced switch" state from a voluntary mid-turn switch; the room state needs a flag for it (e.g. `awaitingForcedSwitch: 1 | 2 | null`) so the client shows only the switch UI, not the move buttons.

### Room lifecycle
Current (post step 3): `waiting_for_players → battling`, with the Pokémon instance pick bundled into `join`.
New: `waiting_for_players → picking → battling`.
- `POST /api/rooms/[code]/join` no longer takes an instance id — it only seats the second player.
- New `POST /api/rooms/[code]/lock-in` — body is an array of 3 owned `pokemon_instances` ids. Stores the submitting player's team on the room row **without exposing it to the other player** (not returned from `GET /api/rooms/[code]`, not broadcast) until both players have locked in.
- Once both teams are locked, the server builds the full `RoomState` (both teams now visible), flips status to `battling`, and broadcasts `battle-start` — same event name as today, richer payload.

### Server-side validation
- `move/route.ts` validates: is it this player's turn to act, is the chosen action legal (attack requires enough mana and an alive active Pokémon; switch requires a non-active, non-fainted team member owned by this player), and recomputes damage server-side exactly as it does today — against `team1/team2` instead of `fighter1/fighter2`.
- `lock-in` validates every submitted id actually belongs to the caller's `pokemon_instances` — same trust boundary as step 3's single-Pokémon join.

### Client
- New `components/online/TeamPicker.tsx` — select 3 of the player's owned instances (from `/api/inventory`, step 2), submit via `lock-in`.
- `FighterCard.tsx` extended to show the active Pokémon prominently plus the two benched members (sprite + fainted/alive state).
- `OnlineBattle.tsx` gains a "picking" phase UI (`TeamPicker` shown until this player's lock-in call succeeds, then a waiting state until the opponent locks in too) before the existing battle UI.
- A switch action needs its own control alongside the 4 move buttons, disabled when there's nothing to switch to.
- Local Battle Arena (`components/battle/BattleArena.tsx`, step 3) stays 1v1 — 3v3 is online-only per this step, unless you want it applied to bot battles too once this is built and proven.

## End state

- [ ] Two players can create/join a room, each independently pick 3 owned instances, and neither can see the other's picks until both have locked in, at which point both teams reveal simultaneously.
- [ ] A full 3v3 battle can be played to completion: attacking, a forced switch on faint, and at least one voluntary mid-battle switch all work and stay in sync between both clients.
- [ ] Server rejects an attack that costs more mana than the active Pokémon has, a switch to a fainted/already-active/not-owned member, and any action submitted out of turn.
- [ ] Lock-in with an instance id you don't own is rejected server-side.
- [ ] Battle ends only when a team's all 3 members are fainted, not when just the active one faints.
- [ ] `npm run build` / `npm run lint` clean.
