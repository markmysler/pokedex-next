// English dictionary -- the source of truth for the Dictionary shape every
// other locale must satisfy. Structured by the same 4-cluster split
// design/REDESIGN_TRACKER.md already uses (Account, Collection, Battle,
// Social), since steps 54-57 fill these in one cluster at a time.
//
// This step (53) only builds the loading infrastructure -- no real content
// migration yet, so every string below is a placeholder proving the shape
// works end to end, not a translation of real UI copy.
const en = {
  common: {
    appName: "Kanto Pokédex",
  },
  account: {},
  collection: {},
  battle: {},
  social: {},
} as const;

export default en;
