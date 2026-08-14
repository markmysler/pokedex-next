# Upgrade Path

No active upgrade wave right now.

The fourth wave ([archive/v4/main.md](archive/v4/main.md) — the
attack-system rework: damage-only moves → damage + buff + debuff + drain
+ redirect, 9 steps) shipped in full on 2026-08-14, including its
optional redirect-to-allies stretch (step 27) and the existing-instance
backfill the user chose over the default "leave it alone" recommendation
(step 29). It followed the v3 plan ([archive/v3/main.md](archive/v3/main.md),
5 steps, all shipped), which followed the v2 plan
([archive/v2/main.md](archive/v2/main.md), 15 steps, all shipped), which
followed the original 8-step plan ([archive/main.md](archive/main.md)).

When the next wave is requested, this file gets rewritten the same way
each prior wave's did: a numbered step table, a "why this order" section,
and key decisions as they're made — see any `archive/*/main.md` for the
format. "Working through a step" (read the step file in full, implement
it in isolation, validate against its end-state checklist, only advance
once dependencies are checked off) applies to whatever comes next too.
