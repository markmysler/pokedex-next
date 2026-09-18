// English dictionary -- the source of truth for the Dictionary shape every
// other locale must satisfy. Structured by the same 4-cluster split
// design/REDESIGN_TRACKER.md already uses (Account, Collection, Battle,
// Social), since steps 54-57 fill these in one cluster at a time.
//
// Step 53 only built the loading infrastructure (every string was a
// placeholder proving the shape worked end to end). Step 54 is the first
// real content migration: Account cluster (Login, Signup, Dashboard,
// Profile) plus the shared SideNav/WelcomeDialog/SignOutButton strings that
// render on every page regardless of cluster -- those live under `common`
// rather than `account` since they're not specific to this cluster's pages.
//
// A few entries are functions instead of plain strings -- wherever the
// English sentence embeds a value (a count, a name, a date), the function
// takes that value and returns the whole sentence, so each locale is free to
// place the value wherever its own word order needs it rather than being
// forced into English's ordering via a fixed placeholder.
const en = {
  common: {
    appName: "Kanto Pokédex",
    nav: {
      dashboard: "Dashboard",
      inventory: "Inventory",
      pokedex: "Pokédex",
      battle: "Battle",
      online: "Online",
      friends: "Friends",
      notifications: "Notifications",
      history: "History",
      leaderboard: "Leaderboard",
      profile: "Profile",
      more: "More",
    },
    theme: {
      label: "Theme:",
      dark: "Dark",
      light: "Light",
    },
    sound: {
      label: "Sound:",
      mute: "Mute sound",
      unmute: "Unmute sound",
    },
    language: {
      label: "Language:",
    },
    signOut: "Log out",
    signingOut: "Logging out…",
    // Shared across Pokédex/Inventory/(later) Team Picker rather than
    // duplicated per screen -- these render identically everywhere a stat
    // bar or a grid/list toggle shows up (upgrades/55-i18n-collection-
    // cluster.md).
    stats: {
      hp: "HP",
      atk: "Attack",
      def: "Defense",
      spatk: "Sp. Atk",
      spdef: "Sp. Def",
      spd: "Speed",
    },
    viewToggle: {
      grid: "▦ Grid",
      list: "☰ List",
    },
    backToList: "← Back to list",
    cancel: "Cancel",
    // "All Types" is also a sentinel *value* compared via strict equality in
    // lib/pokemonFilters.ts/lib/pokedex.ts (untouched, out of scope) -- the
    // <select>'s displayed label is decoupled from its value wherever this
    // is used, so translating the label here never risks the filter logic.
    allTypesLabel: "All Types",
    // PokemonFilterBar.tsx (shared presentational component) -- wired for
    // Inventory in this step; Team Picker's own call site (step 56) picks
    // this dictionary slice up too once it's translated, via the same
    // optional `dict` prop with an English fallback.
    filterBar: {
      searchPlaceholder: "Search Name, # or Nickname...",
      typeFilterLabel: "Type Filter:",
      sortLabel: "Sort:",
      sortOptions: {
        unsorted: "Default order",
        "total-desc": "Total (high to low)",
        "total-asc": "Total (low to high)",
        "name-asc": "Name (A-Z)",
        "number-asc": "Number",
      },
    },
  },
  account: {
    login: {
      heading: "🔴 Log in",
      email: "Email",
      password: "Password",
      submit: "Log in",
      submitting: "Logging in…",
      noAccount: "Don't have an account?",
      signUp: "Sign up",
    },
    signup: {
      heading: "🔴 Sign up",
      displayName: "Display name",
      email: "Email",
      password: "Password",
      submit: "Sign up",
      submitting: "Signing up…",
      haveAccount: "Already have an account?",
      logIn: "Log in",
      checkEmailHeading: "📬 Check your email",
      checkEmailPrefix: "We sent a confirmation link to ",
      checkEmailSuffix: ". Confirm your address, then log in.",
      backToLogin: "Back to login",
    },
    dashboard: {
      heading: "🏠 Dashboard",
      statBotWins: "Bot wins",
      statBotWinRate: "Bot win rate",
      statOnlineWins: "Online wins",
      statDexOwned: "Dex owned",
      yourTeam: "Your team",
      noPokemon: "You don't own any Pokémon yet.",
      strongestNote: (count: number, total: number) =>
        `Showing your ${count} strongest Pokémon by total stats · ${total} owned total.`,
      viewInventory: "View inventory →",
      battleStats: "Battle stats",
      botLosses: "bot losses",
      onlineLosses: "online losses",
      onlineWinRate: "online win rate",
      collectionStats: "Collection stats",
      lootboxesOpened: "lootboxes opened",
      pokemonReleased: "Pokémon released",
      mostUsed: "most used",
      mostOwned: "most owned",
      recentMatches: "Recent matches",
      noMatches: "No matches played yet.",
      battleABot: "Battle a bot →",
      fullHistory: "Full history →",
      won: "🏆 Won",
      lost: "💀 Lost",
      vs: "vs",
    },
    profile: {
      heading: "👤 Profile",
      trainerFallback: "Trainer",
      email: "Email",
      displayName: "Display name",
      save: "Save",
      saving: "Saving…",
      saved: "Saved ✓",
      friendCode: "Your friend code",
      friendCodeNote: "Share this code with a friend so they can add you on the Friends page.",
    },
    welcome: {
      heading: "🎉 Welcome, Trainer!",
      intro1:
        "You've been given 3 starter Pokémon — Bulbasaur, Charmander, and Squirtle — to kick off your journey. They're yours forever: starters can never be discarded or traded away.",
      intro2Prefix: "We also dropped your very first ",
      intro2Lootbox: "📦 Lootbox",
      intro2Suffix: " into your Inventory. Here's how it all works:",
      lootboxOpeningBold: "Opening a Lootbox",
      lootboxOpeningRest:
        " gives you one random Pokémon. Its stats are rolled individually around that species' normal stats, so no two of the same species ever turn out quite identical — some rolls land unusually strong.",
      shinyBold: "Shiny Pokémon",
      shinyRest:
        " are a rare find (roughly 1 in 10) — an instance whose rolled stats and moveset both land near the top of what that species could roll.",
      winningBattlesBold: "Winning battles",
      winningBattlesRest:
        " earns more Lootboxes: an online win against a real player always drops one, a bot battle win has a 60% chance.",
      tradeUpBold: "Trade Up",
      tradeUpRest: ", in your Inventory, lets you burn 5 unwanted (non-starter) Pokémon at once for 1 guaranteed Lootbox.",
      dismiss: "🎒 Got it, let's go!",
    },
  },
  collection: {
    // upgrades/55-i18n-collection-cluster.md's cluster: Pokédex (list +
    // detail), Inventory (list + detail, Trade Up, Evolve), Lootbox reveal.
    // The 6 new species from step 52 need no entries here -- their names
    // stay untranslated (proper nouns, per step 54's precedent) and every
    // surrounding label on these screens is generic ("Caught", "Total",
    // move-list formatting), not species-specific prose.
    pokedex: {
      heading: "📖 Pokédex",
      searchPlaceholder: "Search Name or #...",
      typeFilterLabel: "Type Filter:",
      statusFilterLabel: "Status Filter:",
      statusAll: "All",
      statusCaught: "Caught",
      statusMissing: "Missing",
      minTotalStatsLabel: "Min Total Stats:",
      statAny: "Any",
      showingCount: (shown: number, total: number) => `Showing: ${shown} of ${total} Pokémon`,
      caughtBadge: "🟢 Caught",
      uncaughtBadge: "⚪ Uncaught",
      completion: (acquired: number, total: number, pct: string) =>
        `Pokédex Completion: ${acquired} / ${total} (${pct}%)`,
      detail: {
        caughtBadge: "✅ Caught",
        notCaughtBadge: "⚪ Not caught yet",
        normalForm: "Normal Form",
        shinyForm: "✨ Shiny Form",
        baseStatsLabel: "Base stats",
        totalBaseStats: (total: number) => `Total Base Stats: ${total}`,
        trainerNotes: "Trainer notes",
        saved: "Saved ✓",
      },
    },
    inventory: {
      heading: "🎒 Inventory",
      unopenedLootboxes: (n: number) => `Unopened lootboxes (${n})`,
      openLootbox: "📦 Open Lootbox",
      opening: "Opening…",
      unopenedCountNote: (n: number) => `You have ${n} unopened lootboxes.`,
      openNLootboxes: (qty: number) => `📦 Open ${qty} Lootbox${qty === 1 ? "" : "es"}`,
      showingCount: (shown: number, total: number) => `Showing: ${shown} of ${total}`,
      tradeUpButton: "🔥 Trade Up",
      evolveButton: "🧬 Evolve",
      noMatches: "No Pokémon match your filters.",
      renameBtn: "✏️ Rename",
      renameSave: "Save",
      renameSaving: "Saving…",
      statsLabel: "Stats",
      discard: "🗑️ Discard",
      discardTooltip: "Starters can't be discarded",
      startersCantEvolve: "Starters can't evolve",
      noEvolutionForSpecies: "This Pokémon has no evolution",
      selectSameSpecies: "Select 5 of the same species",
      startersCantTradeUp: "Starters can't be traded up",
      selectedCount: (n: number, total: number) => `${n}/${total} selected`,
      confirmListItem: (name: string, number: string, species: string, total: number) =>
        `${name} — #${number} ${species} (Total ${total})`,
      tradeUpConfirmHeading: "🔥 Confirm Trade Up",
      tradeUpConfirmBody: "These 5 Pokémon will be permanently released in exchange for 1 lootbox. This can't be undone.",
      tradeUpConfirmConfirm: "Confirm",
      tradeUpConfirmConfirming: "Trading Up…",
      evolveConfirmHeading: "🧬 Confirm Evolution",
      evolveConfirmBody: "These 5 Pokémon will be permanently combined into 1 evolved Pokémon. This can't be undone.",
      evolveConfirmConfirm: "Confirm",
      evolveConfirmConfirming: "Evolving…",
    },
    // Shared between InventoryPageClient's detail panel and
    // LootboxRevealDialog's move list -- identical formatting in both
    // places, so one function instead of two copies that could drift.
    movesLabel: "Moves",
    totalLabel: (total: number) => `Total: ${total}`,
    moveLine: (name: string, type: string, power: number | null, maxUses: number | null) =>
      `${name} — ${type}, ${power !== null ? `${power} Pwr, ` : ""}${maxUses === null ? "unlimited" : maxUses} uses`,
    lootboxReveal: {
      openingLootboxText: "Opening lootbox...",
      evolvingText: "Evolving...",
      next: "➡️ Next",
      continueLabel: "✅ Continue",
      skip: "Skip",
    },
  },
  battle: {},
  social: {},
};
// Deliberately not `as const`: that would infer every string as its own
// literal type, and the Dictionary type (getDictionary.ts derives it from
// this file's default export) would then force es-AR.ts to use the exact
// same literal English text for every key instead of just the same shape.

export default en;
