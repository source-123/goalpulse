// 🎰 Types de paris disponibles dans GoalPulse

export type BetType =
  | 'exact_score'   // Score exact (5/3/1 pts)
  | 'winner'        // 1 / N / 2
  | 'over_under'    // Plus ou moins 2.5 buts
  | 'btts'          // Les 2 équipes marquent (Oui/Non)
  | 'both_score'    // Nombre total de buts (0-1, 2-3, 4+)
  | 'first_half';   // Qui mène à la mi-temps

export interface BetTypeInfo {
  id: BetType;
  name: string;
  description: string;
  icon: string;
  color: string;
  points: number;
  options?: Array<{ value: string; label: string }>;
}

export const BET_TYPES: BetTypeInfo[] = [
  {
    id: 'exact_score',
    name: 'Score exact',
    description: 'Devine le score final',
    icon: '🎯',
    color: '#39FF14',
    points: 5,
  },
  {
    id: 'winner',
    name: 'Vainqueur',
    description: 'Qui va gagner ?',
    icon: '🏆',
    color: '#FFD700',
    points: 3,
    options: [
      { value: 'home', label: 'Domicile' },
      { value: 'draw', label: 'Match nul' },
      { value: 'away', label: 'Extérieur' },
    ],
  },
  {
    id: 'over_under',
    name: 'Plus / Moins',
    description: 'Plus ou moins 2.5 buts',
    icon: '📊',
    color: '#00BFFF',
    points: 2,
    options: [
      { value: 'over', label: 'Plus de 2.5 buts' },
      { value: 'under', label: 'Moins de 2.5 buts' },
    ],
  },
  {
    id: 'btts',
    name: 'Les 2 marquent',
    description: 'Les deux équipes vont-elles marquer ?',
    icon: '🥅',
    color: '#FF6B6B',
    points: 2,
    options: [
      { value: 'yes', label: 'Oui' },
      { value: 'no', label: 'Non' },
    ],
  },
  {
    id: 'both_score',
    name: 'Total buts',
    description: 'Combien de buts au total ?',
    icon: '⚽',
    color: '#9D4EDD',
    points: 3,
    options: [
      { value: '0-1', label: '0 à 1 but' },
      { value: '2-3', label: '2 à 3 buts' },
      { value: '4+', label: '4 buts ou plus' },
    ],
  },
  {
    id: 'first_half',
    name: 'Mi-temps',
    description: 'Qui mène à la mi-temps ?',
    icon: '⏸️',
    color: '#FFA500',
    points: 3,
    options: [
      { value: 'home', label: 'Domicile' },
      { value: 'draw', label: 'Match nul' },
      { value: 'away', label: 'Extérieur' },
    ],
  },
];

export const getBetType = (id: BetType): BetTypeInfo | undefined =>
  BET_TYPES.find((b) => b.id === id);

// ===========================
// 🧮 CALCUL DES POINTS SELON TYPE
// ===========================
export interface BetData {
  type: BetType;
  value?: string; // pour les types sans score
  homeScore?: number; // pour exact_score
  awayScore?: number;
}

export const calculateBetPoints = (
  bet: BetData,
  actual: { homeScore: number; awayScore: number; halfHome?: number; halfAway?: number }
): number => {
  const { homeScore: h, awayScore: a } = actual;
  const diff = h - a;
  const total = h + a;

  switch (bet.type) {
    case 'exact_score': {
      if (bet.homeScore === h && bet.awayScore === a) return 5;
      const betDiff = (bet.homeScore || 0) - (bet.awayScore || 0);
      if (betDiff === diff) return 3;
      if (Math.sign(betDiff) === Math.sign(diff)) return 1;
      return 0;
    }

    case 'winner': {
      let actualWinner = 'draw';
      if (h > a) actualWinner = 'home';
      else if (a > h) actualWinner = 'away';
      return bet.value === actualWinner ? 3 : 0;
    }

    case 'over_under': {
      const isOver = total > 2.5;
      const betOver = bet.value === 'over';
      return isOver === betOver ? 2 : 0;
    }

    case 'btts': {
      const bothScored = h > 0 && a > 0;
      const betYes = bet.value === 'yes';
      return bothScored === betYes ? 2 : 0;
    }

    case 'both_score': {
      let actualRange = '4+';
      if (total <= 1) actualRange = '0-1';
      else if (total <= 3) actualRange = '2-3';
      return bet.value === actualRange ? 3 : 0;
    }

    case 'first_half': {
      if (actual.halfHome === undefined || actual.halfAway === undefined) {
        return 0; // Pas de données mi-temps
      }
      let actualHTWinner = 'draw';
      if (actual.halfHome > actual.halfAway) actualHTWinner = 'home';
      else if (actual.halfAway > actual.halfHome) actualHTWinner = 'away';
      return bet.value === actualHTWinner ? 3 : 0;
    }

    default:
      return 0;
  }
};

// 🏷️ Label lisible d'un pari
export const formatBetLabel = (bet: BetData): string => {
  switch (bet.type) {
    case 'exact_score':
      return `Score exact : ${bet.homeScore} - ${bet.awayScore}`;
    case 'winner':
      return `Vainqueur : ${bet.value === 'home' ? 'Domicile' : bet.value === 'draw' ? 'Nul' : 'Extérieur'}`;
    case 'over_under':
      return `${bet.value === 'over' ? 'Plus' : 'Moins'} de 2.5 buts`;
    case 'btts':
      return `Les 2 marquent : ${bet.value === 'yes' ? 'Oui' : 'Non'}`;
    case 'both_score':
      return `Total buts : ${bet.value}`;
    case 'first_half':
      return `Mi-temps : ${bet.value === 'home' ? 'Domicile' : bet.value === 'draw' ? 'Nul' : 'Extérieur'}`;
    default:
      return '';
  }
};
