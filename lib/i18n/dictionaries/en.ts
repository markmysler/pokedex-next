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
  collection: {},
  battle: {},
  social: {},
};
// Deliberately not `as const`: that would infer every string as its own
// literal type, and the Dictionary type (getDictionary.ts derives it from
// this file's default export) would then force es-AR.ts to use the exact
// same literal English text for every key instead of just the same shape.

export default en;
