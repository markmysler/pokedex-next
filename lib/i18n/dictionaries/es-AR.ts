// Argentinian Spanish dictionary -- real vos/che register, not neutral
// Latin American Spanish (the user's explicit framing, see upgrades/
// main.md's key decisions). A straight copy of en.ts for now: this step
// (53) only builds the loading infrastructure, no content translation yet
// (that's steps 54-57, one design/REDESIGN_TRACKER.md cluster at a time).
import type en from "./en";

const esAR: typeof en = {
  common: {
    appName: "Kanto Pokédex",
  },
  account: {},
  collection: {},
  battle: {},
  social: {},
};

export default esAR;
