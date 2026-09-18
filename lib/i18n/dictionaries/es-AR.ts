// Argentinian Spanish dictionary -- real vos-form register (not neutral
// Latin American Spanish), per upgrades/main.md's key decisions. Step 53
// only proved the loading infrastructure with a straight copy of en.ts; this
// is the first real translation pass (step 54, Account cluster + the shared
// SideNav/WelcomeDialog/SignOutButton chrome).
//
// Species names, move names, and other game-content proper nouns stay
// untranslated in both locales (see upgrades/54-i18n-account-cluster.md) --
// only UI chrome and prose gets translated.
import type en from "./en";

const esAR: typeof en = {
  common: {
    appName: "Kanto Pokédex",
    nav: {
      dashboard: "Inicio",
      inventory: "Inventario",
      pokedex: "Pokédex",
      battle: "Batalla",
      online: "Online",
      friends: "Amigos",
      notifications: "Notificaciones",
      history: "Historial",
      leaderboard: "Ranking",
      profile: "Perfil",
      more: "Más",
    },
    theme: {
      label: "Tema:",
      dark: "Oscuro",
      light: "Claro",
    },
    sound: {
      label: "Sonido:",
      mute: "Silenciar sonido",
      unmute: "Activar sonido",
    },
    language: {
      label: "Idioma:",
    },
    signOut: "Cerrar sesión",
    signingOut: "Cerrando sesión…",
  },
  account: {
    login: {
      heading: "🔴 Iniciar sesión",
      email: "Email",
      password: "Contraseña",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión…",
      noAccount: "¿No tenés cuenta?",
      signUp: "Registrate",
    },
    signup: {
      heading: "🔴 Registrate",
      displayName: "Nombre para mostrar",
      email: "Email",
      password: "Contraseña",
      submit: "Registrarme",
      submitting: "Registrando…",
      haveAccount: "¿Ya tenés cuenta?",
      logIn: "Iniciá sesión",
      checkEmailHeading: "📬 Revisá tu email",
      checkEmailPrefix: "Te mandamos un link de confirmación a ",
      checkEmailSuffix: ". Confirmá tu dirección y después iniciá sesión.",
      backToLogin: "Volver a iniciar sesión",
    },
    dashboard: {
      heading: "🏠 Inicio",
      statBotWins: "Victorias vs bot",
      statBotWinRate: "% victorias vs bot",
      statOnlineWins: "Victorias online",
      statDexOwned: "Pokédex completa",
      yourTeam: "Tu equipo",
      noPokemon: "Todavía no tenés ningún Pokémon.",
      strongestNote: (count: number, total: number) =>
        `Mostrando tus ${count} Pokémon más fuertes por stats totales · ${total} en total.`,
      viewInventory: "Ver inventario →",
      battleStats: "Estadísticas de batalla",
      botLosses: "derrotas vs bot",
      onlineLosses: "derrotas online",
      onlineWinRate: "% victorias online",
      collectionStats: "Estadísticas de colección",
      lootboxesOpened: "lootboxes abiertas",
      pokemonReleased: "Pokémon liberados",
      mostUsed: "más usado",
      mostOwned: "más poseído",
      recentMatches: "Partidas recientes",
      noMatches: "Todavía no jugaste ninguna partida.",
      battleABot: "Batallá contra un bot →",
      fullHistory: "Ver historial completo →",
      won: "🏆 Ganaste",
      lost: "💀 Perdiste",
      vs: "vs",
    },
    profile: {
      heading: "👤 Perfil",
      trainerFallback: "Entrenador/a",
      email: "Email",
      displayName: "Nombre para mostrar",
      save: "Guardar",
      saving: "Guardando…",
      saved: "Guardado ✓",
      friendCode: "Tu código de amigo",
      friendCodeNote: "Compartí este código con un amigo para que te pueda agregar en la página de Amigos.",
    },
    welcome: {
      heading: "🎉 ¡Bienvenido, entrenador!",
      intro1:
        "Te dimos 3 Pokémon iniciales — Bulbasaur, Charmander y Squirtle — para arrancar tu aventura. Son tuyos para siempre: los iniciales nunca se pueden liberar ni intercambiar.",
      intro2Prefix: "También te dejamos tu primera ",
      intro2Lootbox: "📦 Lootbox",
      intro2Suffix: " en el Inventario. Así funciona todo:",
      lootboxOpeningBold: "Abrir una Lootbox",
      lootboxOpeningRest:
        " te da un Pokémon al azar. Sus stats se calculan individualmente alrededor de los de esa especie, así que nunca hay dos iguales — algunas tiradas salen insólitamente fuertes.",
      shinyBold: "Los Pokémon shiny",
      shinyRest:
        " son un hallazgo raro (más o menos 1 de cada 10) — una instancia cuyos stats y movimientos calculados quedan cerca del máximo que esa especie puede tirar.",
      winningBattlesBold: "Ganar batallas",
      winningBattlesRest:
        " te da más Lootboxes: una victoria online contra otro jugador siempre suelta una, y una victoria contra un bot tiene 60% de probabilidad.",
      tradeUpBold: "Trade Up",
      tradeUpRest: ", en tu Inventario, te deja quemar 5 Pokémon no iniciales que no quieras, de una, por 1 Lootbox garantizada.",
      dismiss: "🎒 ¡Dale, vamos!",
    },
  },
  collection: {},
  battle: {},
  social: {},
};

export default esAR;
