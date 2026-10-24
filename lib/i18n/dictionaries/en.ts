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
// Pulled out to a standalone const, not just written inline under `common`
// below, so battle.log's freezeTick() (upgrades/56-i18n-battle-cluster.md)
// can reuse the exact same translated stat names without a self-reference
// back into the `en` object literal it's still being constructed inside of.
const STATS = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spatk: "Sp. Atk",
  spdef: "Sp. Def",
  spd: "Speed",
};

// Same reuse reasoning as STATS above -- battle.log's statusTick()/
// statusInflicted() and lib/pokemonDisplay.ts's moveEffectText()/
// moveTooltip() (via a dict param, upgrades/56-i18n-battle-cluster.md) all
// need the same 5 status display names. One capitalized form ("Bleeding"),
// lowercased at the start of a sentence by whoever renders it -- matches
// English capitalization rules and is a harmless no-op for Spanish, which
// capitalizes adjectives the same way regardless of sentence position.
const STATUS_ADJECTIVE = {
  bleed: "Bleeding",
  blind: "Blinded",
  poison: "Poisoned",
  burn: "Burned",
  freeze: "Frozen",
};

// The bare noun/verb form ("Bleed", not "Bleeding") -- used where the
// original text used `status.charAt(0).toUpperCase() + status.slice(1)`
// directly on the StatusKind literal (moveEffectText's short label,
// moveTooltip's "guarantees {status} on the enemy" sentence).
const STATUS_NOUN = {
  bleed: "Bleed",
  blind: "Blind",
  poison: "Poison",
  burn: "Burn",
  freeze: "Freeze",
};

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
    stats: STATS,
    viewToggle: {
      grid: "▦ Grid",
      list: "☰ List",
    },
    backToList: "← Back to list",
    cancel: "Cancel",
    // PokemonMultiPicker's default emptyMessage -- every real call site
    // (Team Chat/Trade's builder, upgrades/57-i18n-social-cluster.md)
    // passes its own, so this only shows if a future caller doesn't.
    nothingHere: "Nothing here.",
    // Modal.tsx/Toast.tsx's close buttons and Sprite.tsx's broken-image
    // fallback -- app-wide shared chrome used by every dialog/toast/sprite
    // in the app, found still hardcoded during step 58's full i18n sweep
    // (upgrades/58-docs-and-roster-validation.md): a screen reader
    // announced "Close"/"Dismiss" in English regardless of locale, and a
    // missing sprite image showed untranslated bracketed text. Plain
    // strings only, deliberately -- `common` as a whole is passed as a
    // Server->Client prop to SideNav (app/[lang]/(app)/layout.tsx), so
    // nothing under it may ever be a function (see `ui.spriteAlt` below
    // for where a function-valued entry needed for the same sweep had to
    // live instead -- this broke exactly that way once, caught before
    // shipping by a live HTTP check, not by build/lint).
    close: "Close",
    dismiss: "Dismiss",
    noImage: "[No Image]",
    // "Shiny" stays untranslated in both locales, same jargon-word call as
    // ATK/DEF (battle.moveEffect.statAbbrev) -- caught as a leftover
    // hardcoded string in 5 places (Dashboard, Inventory x3, FighterCard)
    // while wiring step 56's FighterCard, fixed here for all of them at
    // once rather than only the one this step technically owns.
    shinyBadge: "✨ Shiny",
    starterBadge: "⭐ Starter",
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
  battle: {
    // upgrades/56-i18n-battle-cluster.md's cluster: Team Picker, Battle
    // Arena (bot + online), Online Battle (setup/waiting/picking/battling/
    // rematch), room/chat. The battle log itself is rendered from
    // lib/battleEngine.ts's structured BattleLogEvent[] (that engine change
    // is this step's own biggest piece -- it used to build English text
    // directly) via lib/i18n/renderBattleLogEvent.ts, which reads every
    // entry under `log` below.
    statusAdjective: STATUS_ADJECTIVE,
    statusNoun: STATUS_NOUN,
    log: {
      moveDetailDamage: (type: string, power: number) => `${type}, ${power} Pwr`,
      unlimitedUses: "unlimited uses",
      usesLeft: (remaining: number, max: number) => `${remaining}/${max} uses left`,
      moveUsedLine: (attacker: string, move: string, detail: string, usesText: string) =>
        `${attacker} used [${move}] (${detail} | ${usesText})!`,
      // Fixed placeholder multiplier text regardless of the move's actual
      // computed multiplier (e.g. a double-super-effective 4x hit still
      // reads "(2.0x)") -- a pre-existing quirk of the original English
      // copy, preserved as-is rather than "fixed" during a translation-only
      // step.
      superEffective: "⚡ SUPER EFFECTIVE! (2.0x)",
      noEffect: "🛡️ NO EFFECT (0.0x)",
      notVeryEffective: "🛡️ Not very effective... (0.5x)",
      normalHit: "💥 Normal Hit (1.0x)",
      dodged: (defender: string) => `💨 ${defender} dodged the attack!`,
      blindMiss: (attacker: string) => `🌀 ${attacker} is blinded and flailed, missing the attack!`,
      selfHit: (attacker: string) => `🌀 ${attacker} is confused! It hurt itself in its confusion!`,
      allyHit: (attacker: string, ally: string) => `🌀 ${attacker} is confused and attacks its own ally, ${ally}!`,
      dealtDamage: (target: string, amount: number, hpAfter: number) => `Dealt ${amount} damage! ${target} HP: ${hpAfter}`,
      shieldAbsorbedAll: (amount: number) => `🛡️ Shield absorbed all ${amount} damage!`,
      shieldAbsorbedPartial: (absorbed: number, dealt: number, target: string, hpAfter: number) =>
        `🛡️ Shield absorbed ${absorbed} damage! Dealt ${dealt} damage! ${target} HP: ${hpAfter}`,
      statusInflicted: (target: string, adjective: string) => `${target} is ${adjective}!`,
      drained: (attacker: string, amount: number, hpAfter: number, maxHp: number) =>
        `🩸 ${attacker} drained ${amount} HP! (${hpAfter}/${maxHp})`,
      statUp: (target: string, statName: string, multiplier: number, turns: number) =>
        `✨ ${target}'s ${statName} rose to x${multiplier} for ${turns} turns!`,
      healed: (target: string, amount: number, hpAfter: number, maxHp: number) =>
        `💚 ${target} healed ${amount} HP! (${hpAfter}/${maxHp})`,
      shielded: (target: string, amount: number, total: number) =>
        `🛡️ ${target} gained a ${amount}-point shield! (total: ${total})`,
      cleansed: (target: string) => `🌿 ${target}'s status ailments were cleansed!`,
      statDown: (target: string, statName: string, multiplier: number, turns: number) =>
        `💢 ${target}'s ${statName} fell to x${multiplier} for ${turns} turns!`,
      shieldDestroyed: (target: string) => `💥 ${target}'s shield was destroyed!`,
      confused: (target: string, turns: number) => `🌀 ${target} is confused about who to attack, for ${turns} turns!`,
      statusTick: (status: "bleed" | "poison" | "burn", target: string, amount: number, turnsLeft: number) => {
        const emoji = status === "bleed" ? "🩸" : status === "poison" ? "☠️" : "🔥";
        const noun = status;
        const wornOff = status === "burn" ? "the burn wore off" : status === "bleed" ? "bleeding wore off" : "poison wore off";
        const remaining = turnsLeft > 0 ? ` (${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left)` : ` — ${wornOff}.`;
        return `${emoji} ${target} takes ${amount} ${noun} damage!${remaining}`;
      },
      freezeTick: (target: string, turnsLeft: number) => {
        const remaining = turnsLeft > 0 ? ` (${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left)` : " — it thawed out.";
        return `❄️ ${target} is frozen, sapping its ${STATS.atk}, ${STATS.def} and ${STATS.spd}!${remaining}`;
      },
      statModExpired: (target: string, statName: string, wasBuff: boolean) =>
        `${wasBuff ? "💪" : "💢"} ${target}'s ${statName} ${wasBuff ? "boost" : "drop"} wore off!`,
      confusionExpired: (target: string) => `🌀 Confused no longer — ${target}'s attacks aimed correctly again.`,
      fainted: (pokemon: string) => `${pokemon} fainted!`,
      faintedForcesSwitch: (pokemon: string, slot: number) => `${pokemon} fainted! Player ${slot} must send out another Pokémon.`,
      switched: (from: string, to: string) => `↩️ ${from} is withdrawn! ${to}, go!`,
    },
    // lib/pokemonDisplay.ts's moveEffectText()/moveTooltip() -- shared with
    // step 55 (coordinated there, see that step's "no changes needed"
    // note: Collection cluster never calls these two, only Battle does).
    moveEffect: {
      // MoveButton's own meta-line format ("3/5 uses"), distinct from the
      // battle log's usesLeft() ("3/5 uses left") -- same numbers, terser
      // phrasing to fit the button.
      usesFraction: (left: number, max: number) => `${left}/${max} uses`,
      pwr: (power: number) => `${power} Pwr`,
      drainShort: (power: number, pct: number) => `${power} Pwr, ${pct}% HP drain`,
      confusedTurnsShort: (turns: number) => `${turns} turns confused`,
      // ATK/DEF stay as compact HUD-style abbreviations in both locales
      // (like HP) rather than the full translated stat words -- this is
      // the same jargon-abbreviation call as keeping species/move/type
      // names untranslated, just extended to these two battle-HUD labels
      // (FighterCard's StatusBadges already hardcoded them the same way).
      statAbbrev: { atk: "ATK", def: "DEF" },
      statUpShort: (pct: number, statAbbrev: string, turns: number) => `+${pct}% ${statAbbrev}, ${turns} turns`,
      healShort: (pct: number) => `+${pct}% HP`,
      shieldShort: (amount: number) => `+${amount} Shield`,
      cleanse: "Cleanse",
      statDownShort: (pct: number, statAbbrev: string, turns: number) => `${pct}% ${statAbbrev}, ${turns} turns`,
      removeShield: "Remove Shield",
    },
    moveTooltip: {
      unlimitedUses: "unlimited uses",
      usesPerBattle: (n: number) => `${n} uses per battle`,
      base: (name: string, type: string, usesText: string) => `${name} (${type}-type, ${usesText})`,
      categoryPhysical: "physical",
      categorySpecial: "special",
      damage: (base: string, category: string, power: number) => `${base}: a ${category} attack, ${power} power.`,
      drain: (base: string, category: string, power: number, pct: number) =>
        `${base}: a ${category} attack, ${power} power, that also restores ${pct}% of the raw damage dealt as HP to the user.`,
      redirect: (base: string, turns: number) =>
        `${base}: confuses the target for ${turns} turns -- while confused, its own attacks land on itself or a living ally instead of the opponent.`,
      buffStatUp: (base: string, statName: string, multiplier: number, turns: number) =>
        `${base}: raises the target's ${statName} to x${multiplier} for ${turns} turns.`,
      buffHeal: (base: string, pct: number) => `${base}: heals the target for ${pct}% of its max HP.`,
      buffShield: (base: string, amount: number) => `${base}: grants the target a ${amount}-point shield that absorbs incoming damage before HP.`,
      buffCleanse: (base: string) => `${base}: cleanses bleed/blind/poison/burn/freeze from the target.`,
      debuffStatDown: (base: string, statName: string, multiplier: number, turns: number) =>
        `${base}: lowers the enemy's ${statName} to x${multiplier} for ${turns} turns.`,
      debuffRemoveShield: (base: string) => `${base}: destroys the enemy's shield.`,
      debuffInflictStatus: (base: string, status: string) =>
        `${base}: guarantees ${status} on the enemy -- no chance roll, unlike the incidental version.`,
    },
    fighterCard: {
      statusTooltip: {
        bleed: "Bleeding: loses 5% of max HP at the start of each of its turns. Inflicted by physical-category hits; lasts 3 turns.",
        blind: "Blinded: 25% chance to miss with its own attack each turn. Inflicted by special-category hits; lasts 3 turns.",
        poison:
          "Poisoned: loses 5% of max HP at the start of each of its turns. Inflicted by Poison-type moves; lasts 3 turns. Can stack with Bleeding since it's gated by move type, not category.",
        burn:
          "Burning: loses 5% of max HP at the start of each of its turns (10% against Grass-type Pokemon). Inflicted by Fire-type moves; lasts 3 turns. Can't be inflicted on Water-type Pokemon.",
        freeze:
          "Frozen: Attack, Special Attack, Defense, Special Defense and Speed all reduced by 30% while active. Inflicted by Ice-type moves; lasts 3 turns. Can't be inflicted on Fire-type Pokemon.",
      },
      atkModTooltip: (multiplier: number, pct: number, turns: number) =>
        `Attack is x${multiplier} (${pct > 0 ? "+" : ""}${pct}%) for ${turns} more turn${turns === 1 ? "" : "s"}.`,
      defModTooltip: (multiplier: number, pct: number, turns: number) =>
        `Defense is x${multiplier} (${pct > 0 ? "+" : ""}${pct}%) for ${turns} more turn${turns === 1 ? "" : "s"}.`,
      shieldTooltip: (points: number) => `A shield absorbs the next ${points} damage before HP is touched. No duration -- it just runs out.`,
      redirectTooltip: (turns: number) =>
        `Confused: this fighter's own attacks land on itself or a living ally instead of the opponent, for ${turns} more turn${turns === 1 ? "" : "s"}.`,
      fainted: "💀 Fainted",
      switchTo: (name: string) => `Switch to ${name}`,
      faintedTitle: (name: string) => `${name} (fainted)`,
      shieldLabel: "Shield",
      confusedLabel: "Confused",
    },
    allyPicker: {
      chooseTarget: "Choose a target:",
      targetSelf: (name: string) => `Target yourself (${name})`,
      targetOther: (name: string) => `Target ${name}`,
      self: "Self",
    },
    resultDialog: {
      victoryHeading: "🏆 Victory!",
      victoryBody: "Your team battled hard and came out on top!",
      lootboxEarned: "🎁 You earned a lootbox!",
      noLootbox: "No lootbox this time — better luck next battle.",
      defeatHeading: "💀 Defeat",
      defeatBody: "Better luck next time!",
      continue: "Continue",
      openItNow: "📦 Open it now",
    },
    teamPicker: {
      pickYourTeam: (selected: number, total: number) => `Pick your team (${selected}/${total})`,
      chooseHint: "Choose 3 Pokémon. Your opponent won't see your picks until you both lock in.",
      noPokemon: "You don't own any Pokémon yet.",
      noMatches: "No Pokémon match your filters.",
      selectedCount: (selected: number, total: number) => `${selected}/${total} selected`,
      lockingIn: "Locking in...",
      lockInTeam: "🎯 Lock In Team",
      lockInError: "⚠️ Couldn't lock in your team — try again.",
    },
    chat: {
      title: "Chat",
      empty: "No messages yet — say hi!",
      you: "You",
      placeholder: "Type a message...",
      send: "Send",
    },
    arena: {
      title: "⚔️ Battle Arena",
      needThree: "You need at least 3 Pokémon to start a 3v3 battle. This shouldn't normally happen — every account starts with 3 starters.",
      startBanner: (you: string, opp: string) => `=== ⚔️ 3v3 BATTLE START: ${you} vs a wild ${opp} ===`,
      yourTeam: (names: string) => `• Your team: ${names}`,
      opponentTeam: (names: string) => `• Opponent's team: ${names}\n`,
      selectPrompt: "👇 Select an Attack Move or switch Pokémon below.",
      roundHeader: (n: number) => `\n--- 🥊 Round ${n} ---`,
      noUsesLeft: (move: string) => `⚠️ No uses left for ${move} this battle!`,
      victory: "\n🏆 VICTORY! The opponent's whole team fainted!",
      defeat: "\n💀 DEFEAT! Your whole team fainted!",
      couldntOpenLootbox: (error: string) => `⚠️ Couldn't open lootbox: ${error}`,
      botTeamNote: "🎲 Bot team randomly generated, matched to your team's level",
      changeTeam: "🔁 Change Team",
      youPrefix: "You: ",
      chooseNextPokemon: "Choose your next Pokémon:",
      selectAttackMove: "Select Attack Move:",
      pauseBattle: "⏸️ Pause Battle",
      newBattle: "⚡ New Battle",
      autoBattle: "⚡ Auto Battle",
      resetBattle: "🔄 Reset Battle",
      opponentChoosing: "Opponent is choosing a new Pokémon...",
    },
    online: {
      title: "🌐 Online Battle",
      setupLabel: "Online battle (3v3)",
      createRoom: "🆕 Create Room",
      or: "or",
      joinCodePlaceholder: "Enter room code",
      joinRoom: "Join Room",
      waitingLabel: "Waiting for opponent",
      cancel: "Cancel",
      roomCreated: (code: string) => `Room created! Share code ${code} with your opponent. Waiting for them to join...`,
      joinedPickTeam: "Joined room! Pick your team.",
      roomCodeLabel: "Room Code:",
      leaveRoom: "Leave Room",
      teamLockedIn: "Team locked in",
      waitingOpponentLockIn: "Waiting for your opponent to lock in their team...",
      opponentJoinedPickTeam: "Opponent joined! Pick your team.",
      opponentLockedInPickYours: "Opponent has locked in their team — pick yours!",
      roomCodeShare: (code: string) => `Room Code: ${code} — share this with your opponent`,
      youPrefix: "You: ",
      opponentPrefix: "Opponent: ",
      chooseNextPokemon: "Choose your next Pokémon:",
      selectAttackMove: "Select Attack Move:",
      opponentChoosing: "Opponent is choosing a new Pokémon...",
      startBanner: (you: string, opp: string) => `=== ⚔️ 3v3 ONLINE BATTLE START: ${you} vs ${opp} ===`,
      yourTeam: (names: string) => `• Your team: ${names}`,
      opponentTeam: (names: string) => `• Opponent's team: ${names}\n`,
      selectPrompt: "👇 Select an Attack Move or switch Pokémon below.",
      roundHeader: (n: number) => `\n--- 🥊 Round ${n} ---`,
      syncedFromServer: "(synced from server)",
      victory: "\n🏆 VICTORY! The opponent's whole team fainted!",
      defeat: "\n💀 DEFEAT! Your whole team fainted!",
      youWon: "🏆 You won the battle!",
      youLost: "💀 You lost the battle.",
      yourPokemonFainted: "💀 Your Pokémon fainted! Choose your next Pokémon below.",
      opponentPokemonFaintedWaiting: "Opponent's Pokémon fainted — waiting for them to send out a new one...",
      selectNextMove: "👇 Select your next Attack Move or switch Pokémon!",
      opponentLeft: "\n⚠️ Your opponent left the room.",
      opponentForfeited: "\n🏆 Your opponent left mid-battle, so you win by forfeit. A lootbox was added to your inventory.",
      opponentDisconnected: "Opponent disconnected.",
      actionSubmittedWaiting: "Action submitted — waiting for opponent...",
      opponentActedWaiting: "Opponent has acted — waiting for you...",
      couldntOpenLootbox: (error: string) => `⚠️ Couldn't open lootbox: ${error}`,
      enterRoomCodeFirst: "⚠️ Enter a room code first.",
      genericError: (error: string) => `⚠️ ${error}`,
      rematch: "Rematch?",
      requestRematch: "🔁 Request Rematch",
      rematchRequestedWaiting: "Rematch requested — waiting for your opponent to accept...",
      opponentWantsRematch: "Your opponent wants a rematch!",
      acceptRematch: "✅ Accept Rematch",
    },
  },
  social: {
    // upgrades/57-i18n-social-cluster.md's cluster: Friends, Friend Chat &
    // Trade, Notifications, History, Leaderboard. Two things stay
    // untranslated on purpose: a friend's own display name, and any
    // user-generated content (a chat message's `text`, `friend-message`'s
    // notification body) -- both are the sender's actual words/name, not
    // app copy.
    friends: {
      heading: "🤝 Friends",
      yourFriendCode: "Your friend code",
      shareCodeNote: "Share this code with a friend so they can add you.",
      addFriend: "Add a friend",
      codePlaceholder: "Enter friend code",
      sendRequest: "Send Request",
      enterCodeFirst: "⚠️ Enter a friend code first.",
      nowFriends: "✅ You're now friends!",
      requestSent: "Friend request sent!",
      genericError: (error: string) => `⚠️ ${error}`,
      incomingRequests: "Incoming requests",
      outgoingRequests: "Outgoing requests",
      accept: "Accept",
      decline: "Decline",
      cancelRequest: "Cancel",
      friendsCount: (n: number) => `Friends (${n})`,
      noFriendsYet: "No friends yet — send a request above to get started.",
      battle: "⚔️ Battle",
      chat: "💬 Chat",
      remove: "Remove",
      // Same fallback used for a message sender and a trade partner whose
      // account no longer exists -- mirrors the pre-existing "a Bot"/"a
      // departed player" pair this step also moved out of lib/history.ts.
      departedPlayer: "a departed player",
    },
    // Friend Chat & Trade (the /friends/[id] page) -- ChatPanel itself
    // reuses battle.chat (identical widget, Team Chat and Friend Chat are
    // the same component), so only the trade-builder chrome and this
    // page's own strings live here.
    chat: {
      backToFriends: "← Back to Friends",
      friendNotFound: "This friendship doesn't exist, isn't confirmed yet, or isn't yours to view.",
      friendFallback: "Friend",
      trades: "Trades",
      noPendingTrades: "No pending trades.",
      youProposed: "You proposed:",
      friendProposed: (name: string) => `${name} proposed:`,
      youGive: "You give",
      friendGives: (name: string) => `${name} gives`,
      accept: "Accept",
      decline: "Decline",
      cancelOffer: "Cancel",
      proposeTrade: "➕ Propose Trade",
      yourPokemonSelected: (n: number) => `Your Pokémon (${n} selected)`,
      friendPokemonSelected: (name: string, n: number) => `${name}'s Pokémon (${n} selected)`,
      noOwnedPokemon: "You don't own any Pokémon yet.",
      friendNoOwnedPokemon: (name: string) => `${name} doesn't own any Pokémon yet.`,
      startersCantBeTraded: "Starters can't be traded",
      sendTradeOffer: "Send Trade Offer",
      proposing: "Proposing…",
      pickAtLeastOne: "Pick at least one Pokémon from each side.",
      systemSender: "System",
      messageFailed: (error: string) => `⚠️ Message failed to send: ${error}`,
    },
    notifications: {
      heading: "🔔 Notifications",
      empty: "No notifications yet.",
      open: "Open",
      inviteUnavailable: "This invite is no longer available.",
      accept: "Accept",
      joining: "Joining…",
      // Bodies are the sentence's tail only -- every caller renders the
      // actor's name in bold ahead of it (`<strong>{name}</strong> {body}`),
      // same split renderNotification() and FriendNotifications.tsx's toast
      // already used before translation, just now driven from here instead
      // of inline JSX in a `switch (n.kind)`.
      friendRequestBody: "sent you a friend request.",
      friendRequestAcceptedBody: "accepted your friend request!",
      tradeProposedBody: "proposed a trade.",
      tradeResolved: (status: "accepted" | "declined" | "cancelled") => `A trade was ${status}.`,
      battleInviteBody: "invited you to battle!",
      // Longer live-toast-only variants (FriendNotifications.tsx) -- same
      // event, a bit more context since a toast isn't sitting next to a
      // browsable Friends/Notifications page the way the persisted-list
      // rendering already is.
      toastFriendRequestBody: "sent you a friend request. Check the Friends page to respond.",
      toastTradeProposedBody: "proposed a trade!",
      toastJoinFailed: (name: string, error: string) => `⚠️ Couldn't join ${name}'s battle: ${error}`,
    },
    history: {
      heading: "📜 Battle History",
      noMatches: "No matches played yet.",
      won: "Won",
      lost: "Lost",
      vs: "vs",
      // "Online" and "Bot" are identical in both locales -- not a missed
      // translation, "vs" and "bot" are the same established loanwords
      // account.dashboard already uses inside Spanish sentences
      // ("Victorias vs bot"); this is just the standalone Title Case badge
      // form of the same words.
      onlineMode: "Online",
      botMode: "vs Bot",
      roomSuffix: (code: string) => ` — room ${code}`,
      yourTeamSuffix: (names: string) => ` · Your team: ${names}`,
      opponentBot: "a Bot",
      opponentDeparted: "a departed player",
    },
    leaderboard: {
      heading: "🏆 Leaderboard",
      noTrainers: "No trainers yet.",
      youSuffix: " (you)",
      wins: (n: number) => `${n} online win${n === 1 ? "" : "s"}`,
    },
  },
  // A function-valued entry Sprite.tsx (used app-wide, way below the
  // per-cluster split above) needs, kept out of `common` specifically
  // because `common` as a whole is passed as a Server->Client prop to
  // SideNav (see `common.close`'s comment) and so must stay function-free
  // -- Sprite.tsx reads this directly via its own useDictionary() call
  // instead, same self-fetch pattern as every other function-valued slice.
  ui: {
    spriteAlt: (name: string, form: string) => `${name} ${form} sprite`,
  },
};
// Deliberately not `as const`: that would infer every string as its own
// literal type, and the Dictionary type (getDictionary.ts derives it from
// this file's default export) would then force es-AR.ts to use the exact
// same literal English text for every key instead of just the same shape.

export default en;
