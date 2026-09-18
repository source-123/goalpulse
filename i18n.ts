// 🌐 Système multi-langue (FR / EN / AR)

export type Language = 'fr' | 'en' | 'ar';

export interface Translation {
  // Nav
  matches: string;
  standings: string;
  rooms: string;
  profile: string;

  // Login
  welcomeBack: string;
  createAccount: string;
  email: string;
  password: string;
  confirmPassword: string;
  signIn: string;
  signUp: string;
  or: string;
  continueWithGoogle: string;
  noAccount: string;
  haveAccount: string;
  forgotPassword: string;

  // Match list
  live: string;
  all: string;
  finished: string;
  upcoming: string;
  search: string;
  noMatch: string;
  noLiveMatch: string;
  refresh: string;

  // Match detail
  info: string;
  events: string;
  h2h: string;
  venue: string;
  date: string;
  time: string;
  week: string;
  season: string;
  stats: string;
  noEvents: string;
  noH2H: string;

  // Rooms
  createRoom: string;
  joinRoom: string;
  roomName: string;
  enterCode: string;
  myRooms: string;
  noRooms: string;
  leaveRoom: string;
  addMatches: string;
  roomMatches: string;
  bets: string;
  chat: string;
  leaderboard: string;

  // Bets
  placeBet: string;
  yourBet: string;
  exactScore: string;
  winner: string;
  overUnder: string;
  btts: string;
  totalGoals: string;
  halfTime: string;
  ptsLabel: string;
  validate: string;
  cancel: string;
  delete: string;

  // Chat
  writeMessage: string;
  noMessages: string;

  // Profile
  level: string;
  pointsLabel: string;
  betsLabel: string;
  exacts: string;
  winRate: string;
  badges: string;
  levels: string;
  nextLevel: string;
  morePoints: string;

  // Common
  loading: string;
  error: string;
  retry: string;
  close: string;
  save: string;
  yes: string;
  no: string;
  ok: string;
  sharedBy: string;
  createdBy: string;
  creator: string;
  players: string;
  player: string;
}

export const translations: Record<Language, Translation> = {
  fr: {
    matches: 'Matchs',
    standings: 'Class.',
    rooms: 'Salons',
    profile: 'Profil',

    welcomeBack: 'Content de te revoir',
    createAccount: 'Crée ton compte',
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer mot de passe',
    signIn: 'Se connecter',
    signUp: "S'inscrire",
    or: 'OU',
    continueWithGoogle: 'Continuer avec Google',
    noAccount: 'Pas encore de compte ?',
    haveAccount: 'Déjà un compte ?',
    forgotPassword: 'Mot de passe oublié ?',

    live: 'Live',
    all: 'Tous',
    finished: 'Terminés',
    upcoming: 'À venir',
    search: 'Rechercher',
    noMatch: 'Aucun match',
    noLiveMatch: 'Aucun match en direct',
    refresh: 'Rafraîchir',

    info: 'Info',
    events: 'Événements',
    h2h: 'H2H',
    venue: 'Stade',
    date: 'Date',
    time: 'Heure',
    week: 'Journée',
    season: 'Saison',
    stats: 'Statistiques',
    noEvents: "Pas d'événements",
    noH2H: 'Pas de face-à-face',

    createRoom: 'Créer',
    joinRoom: 'Rejoindre',
    roomName: 'Nom du salon',
    enterCode: 'Entre le code',
    myRooms: 'Mes salons',
    noRooms: 'Aucun salon',
    leaveRoom: 'Quitter le salon',
    addMatches: 'Ajouter des matchs',
    roomMatches: 'Matchs du salon',
    bets: 'Paris',
    chat: 'Chat',
    leaderboard: 'Classement',

    placeBet: 'Parier',
    yourBet: 'Ton pari',
    exactScore: 'Score exact',
    winner: 'Vainqueur',
    overUnder: 'Plus / Moins',
    btts: 'Les 2 marquent',
    totalGoals: 'Total buts',
    halfTime: 'Mi-temps',
    ptsLabel: 'pts',
    validate: 'Valider',
    cancel: 'Annuler',
    delete: 'Supprimer',

    writeMessage: 'Écris un message...',
    noMessages: 'Aucun message',

    level: 'Niveau',
    pointsLabel: 'Points',
    betsLabel: 'Paris',
    exacts: 'Exacts',
    winRate: 'Réussite',
    badges: 'Badges',
    levels: 'Niveaux',
    nextLevel: 'Prochain',
    morePoints: 'points restants',

    loading: 'Chargement...',
    error: 'Erreur',
    retry: 'Réessayer',
    close: 'Fermer',
    save: 'Sauvegarder',
    yes: 'Oui',
    no: 'Non',
    ok: 'OK',
    sharedBy: 'Partagé par',
    createdBy: 'Créé par',
    creator: 'Créateur',
    players: 'joueurs',
    player: 'joueur',
  },

  en: {
    matches: 'Matches',
    standings: 'Standings',
    rooms: 'Rooms',
    profile: 'Profile',

    welcomeBack: 'Welcome back',
    createAccount: 'Create your account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    signIn: 'Sign in',
    signUp: 'Sign up',
    or: 'OR',
    continueWithGoogle: 'Continue with Google',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    forgotPassword: 'Forgot password?',

    live: 'Live',
    all: 'All',
    finished: 'Finished',
    upcoming: 'Upcoming',
    search: 'Search',
    noMatch: 'No match',
    noLiveMatch: 'No live match',
    refresh: 'Refresh',

    info: 'Info',
    events: 'Events',
    h2h: 'H2H',
    venue: 'Stadium',
    date: 'Date',
    time: 'Time',
    week: 'Matchday',
    season: 'Season',
    stats: 'Statistics',
    noEvents: 'No events',
    noH2H: 'No head-to-head',

    createRoom: 'Create',
    joinRoom: 'Join',
    roomName: 'Room name',
    enterCode: 'Enter the code',
    myRooms: 'My rooms',
    noRooms: 'No room',
    leaveRoom: 'Leave room',
    addMatches: 'Add matches',
    roomMatches: 'Room matches',
    bets: 'Bets',
    chat: 'Chat',
    leaderboard: 'Leaderboard',

    placeBet: 'Bet',
    yourBet: 'Your bet',
    exactScore: 'Exact score',
    winner: 'Winner',
    overUnder: 'Over / Under',
    btts: 'Both teams score',
    totalGoals: 'Total goals',
    halfTime: 'Half time',
    ptsLabel: 'pts',
    validate: 'Validate',
    cancel: 'Cancel',
    delete: 'Delete',

    writeMessage: 'Write a message...',
    noMessages: 'No messages',

    level: 'Level',
    pointsLabel: 'Points',
    betsLabel: 'Bets',
    exacts: 'Exact',
    winRate: 'Win rate',
    badges: 'Badges',
    levels: 'Levels',
    nextLevel: 'Next',
    morePoints: 'points left',

    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    close: 'Close',
    save: 'Save',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    sharedBy: 'Shared by',
    createdBy: 'Created by',
    creator: 'Creator',
    players: 'players',
    player: 'player',
  },

  ar: {
    matches: 'المباريات',
    standings: 'الترتيب',
    rooms: 'الغرف',
    profile: 'الملف',

    welcomeBack: 'مرحبًا بعودتك',
    createAccount: 'أنشئ حسابك',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    or: 'أو',
    continueWithGoogle: 'المتابعة مع Google',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
    forgotPassword: 'نسيت كلمة المرور؟',

    live: 'مباشر',
    all: 'الكل',
    finished: 'المنتهية',
    upcoming: 'القادمة',
    search: 'بحث',
    noMatch: 'لا توجد مباراة',
    noLiveMatch: 'لا مباراة مباشرة',
    refresh: 'تحديث',

    info: 'معلومات',
    events: 'الأحداث',
    h2h: 'المواجهات',
    venue: 'الملعب',
    date: 'التاريخ',
    time: 'الوقت',
    week: 'الجولة',
    season: 'الموسم',
    stats: 'الإحصائيات',
    noEvents: 'لا أحداث',
    noH2H: 'لا مواجهات سابقة',

    createRoom: 'إنشاء',
    joinRoom: 'انضم',
    roomName: 'اسم الغرفة',
    enterCode: 'أدخل الرمز',
    myRooms: 'غرفي',
    noRooms: 'لا غرفة',
    leaveRoom: 'مغادرة الغرفة',
    addMatches: 'إضافة مباريات',
    roomMatches: 'مباريات الغرفة',
    bets: 'الرهانات',
    chat: 'الدردشة',
    leaderboard: 'الترتيب',

    placeBet: 'راهن',
    yourBet: 'رهانك',
    exactScore: 'النتيجة الدقيقة',
    winner: 'الفائز',
    overUnder: 'أكثر / أقل',
    btts: 'كلا الفريقين',
    totalGoals: 'مجموع الأهداف',
    halfTime: 'الشوط الأول',
    ptsLabel: 'نقاط',
    validate: 'تأكيد',
    cancel: 'إلغاء',
    delete: 'حذف',

    writeMessage: 'اكتب رسالة...',
    noMessages: 'لا رسائل',

    level: 'المستوى',
    pointsLabel: 'النقاط',
    betsLabel: 'الرهانات',
    exacts: 'دقيقة',
    winRate: 'معدل الفوز',
    badges: 'الشارات',
    levels: 'المستويات',
    nextLevel: 'التالي',
    morePoints: 'نقاط متبقية',

    loading: 'جار التحميل...',
    error: 'خطأ',
    retry: 'إعادة المحاولة',
    close: 'إغلاق',
    save: 'حفظ',
    yes: 'نعم',
    no: 'لا',
    ok: 'حسناً',
    sharedBy: 'شارك بواسطة',
    createdBy: 'أنشئ بواسطة',
    creator: 'المُنشئ',
    players: 'لاعبين',
    player: 'لاعب',
  },
};

export const LANGUAGES: Array<{ code: Language; name: string; flag: string; rtl?: boolean }> = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
];
