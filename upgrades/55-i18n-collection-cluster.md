# Step 55: i18n content — Collection cluster

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

Needs step 53's infrastructure. Also depends on step 51 (the Evolve UI) and
step 52 (the 6 new species) specifically because this cluster is where both
land — translating it before those ship would mean redoing part of this
step once their strings exist.

## What changes

Covers `design/REDESIGN_TRACKER.md`'s "Collection cluster": **Pokédex
(list+detail), Inventory (list+detail), Lootbox reveal** — plus, new since
that tracker was written, the **Evolve action + reveal dialog** from step
51, and the 6 new species (Umbreon, Houndour, Houndoom, Larvitar, Pupitar,
Tyranitar) from step 52 wherever their names/flavor surface in UI copy (not
the names themselves, per step 54's "proper nouns stay as-is" note, but any
surrounding descriptive text).

Same mechanical approach as step 54: dictionary lookups replacing literal
strings, real `es-AR` translations (not placeholders), in both Server and
Client Components across this cluster.

Specific known surfaces: `PokemonDetail.tsx`'s "Normal Form"/"Shiny Form"
labels; `InventoryPageClient.tsx`'s Trade Up and new Evolve flows'
copy/confirmation text; `LootboxRevealDialog.tsx`'s phase copy; move
tooltip/effect text from `lib/pokemonDisplay.ts` if it's rendered as
user-facing prose anywhere in this cluster (shared with the Battle cluster
too — coordinate with step 56 so this shared utility's strings aren't
translated twice inconsistently).

### What does NOT change in this step

- No new routing/dictionary mechanics.
- `lib/pokemonDisplay.ts`'s functions themselves — if they need to become
  locale-aware (e.g. `moveEffectText()` returning a translated string),
  that's a shared concern with step 56; decide during implementation
  whether to handle it here, there, or as a small shared prerequisite
  touched once.

## End state

- [ ] Pokédex, Inventory, Lootbox reveal, and the new Evolve UI render
      fully in either locale with no leftover hardcoded English (or vice
      versa).
- [ ] The 6 new species' surrounding UI copy (not their names) is
      translated consistently with the rest of the cluster.
- [ ] `npm run build` / `npm run lint` clean.
