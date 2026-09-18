// ☁️ Service qui appelle le PROXY Cloudflare Workers
// URL déployée : https://goalpulse-proxy.jebalimohamed256.workers.dev
const PROXY_URL = 'https://goalpulse-proxy.jebalimohamed256.workers.dev';

// ===========================
// 📦 TYPES
// ===========================

export interface RawMatch {
  id: string;
  date: string;
  time: string;
  status: string;
  localteam: string;
  visitorteam: string;
  scoretime: string;
  leaguename: string;
  leagueid: string;
  country?: string;
  localteamyc?: number;
  visitorteamyc?: number;
  localteamrc?: number;
  visitorteamrc?: number;
  injuryminute?: string;
  injurytime?: string;
}

export interface LeagueGroup {
  key: string;
  league: string;
  matches: RawMatch[];
}

export interface CountryGroup {
  country: string;
  leagues: LeagueGroup[];
}

export interface StandingRow {
  position?: number;
  rank?: number;
  team?: string;
  team_name?: string;
  localteam?: string;
  name?: string;
  played?: number;
  matches?: number;
  won?: number;
  draw?: number;
  drawn?: number;
  lost?: number;
  goals_for?: number;
  goals_against?: number;
  goal_diff?: number;
  points?: number;
  pts?: number;
  [key: string]: any;
}

// ===========================
// 🏠 SCORES LIVE
// ===========================

export const fetchLiveScores = async (): Promise<CountryGroup[]> => {
  console.log('🚀 Appel proxy Cloudflare:', PROXY_URL);
  try {
    const res = await fetch(`${PROXY_URL}/api/live-scores`);
    console.log('📥 Status:', res.status);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Erreur proxy');
    }

    const groups: CountryGroup[] = (json.data || []).map((country: any) => ({
      country: country.country,
      leagues: (country.leagues || []).map((league: any) => ({
        key: league.key,
        league: league.league,
        matches: (league.matches || []).map((m: any) => ({
          ...m,
          country: country.country,
        })),
      })),
    }));

    console.log('✅ ' + groups.length + ' pays reçus');
    return groups;
  } catch (err: any) {
    console.error('❌ Erreur fetchLiveScores:', err);
    throw err;
  }
};

// ===========================
// 📊 DÉTAIL D'UN MATCH
// ===========================

export const fetchMatchDetail = async (matchId: string): Promise<any> => {
  console.log('🚀 Détail match:', matchId);
  try {
    const res = await fetch(`${PROXY_URL}/api/match/${matchId}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Erreur proxy');
    }

    return json.data;
  } catch (err: any) {
    console.error('❌ Erreur fetchMatchDetail:', err);
    throw err;
  }
};

// ===========================
// 🏆 CLASSEMENT
// ===========================

export const fetchStandings = async (leagueId: string): Promise<StandingRow[]> => {
  console.log('🚀 Classement ligue:', leagueId);
  try {
    const res = await fetch(`${PROXY_URL}/api/standings/${leagueId}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Erreur proxy');
    }

    // L'API peut renvoyer plusieurs structures → on normalise
    let rows: any[] = [];
    if (Array.isArray(json.data)) {
      rows = json.data;
    } else if (json.data?.standings) {
      rows = Array.isArray(json.data.standings)
        ? json.data.standings
        : json.data.standings[0]?.table || [];
    } else if (json.data?.table) {
      rows = json.data.table;
    } else if (json.data?.data) {
      rows = json.data.data;
    }

    console.log('✅ ' + rows.length + ' équipes dans le classement');
    return rows;
  } catch (err: any) {
    console.error('❌ Erreur fetchStandings:', err);
    throw err;
  }
};

// ===========================
// 🛠️ HELPERS
// ===========================

// 🕐 Formater l'heure (ex: "13:00" depuis "13:00:00")
export const formatTime = (time: string): string => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

// 🔴 Détection "live" (en cours)
export const isLiveStatus = (status: string): boolean => {
  if (!status) return false;
  if (status === 'HT') return true; // Mi-temps
  const num = parseInt(status, 10);
  return !isNaN(num) && num > 0 && num <= 90;
};

// 📊 Statut lisible en français
export const getStatusLabel = (status: string): string => {
  if (!status) return '';
  if (status === 'HT') return '⏸️ Mi-temps';
  if (status === 'FT') return '✅ Terminé';
  if (status === 'Postp.' || status === 'Postponed') return '⏳ Reporté';
  if (status === 'Canc.') return '❌ Annulé';

  const num = parseInt(status, 10);
  if (!isNaN(num)) {
    if (num >= 90) return '✅ Terminé';
    return `🔴 ${num}'`;
  }
  return status;
};

// 🏆 Normaliser une ligne de classement (les champs varient selon l'API)
export const normalizeStandingRow = (row: any, index: number): {
  position: number;
  team: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
} => ({
  position: row.position || row.rank || row.pos || index + 1,
  team:
    row.team ||
    row.team_name ||
    row.localteam ||
    row.name ||
    row.teamName ||
    `Équipe ${index + 1}`,
  played: row.played || row.matches || row.games || row.mp || 0,
  won: row.won || row.wins || row.w || 0,
  draw: row.draw || row.drawn || row.d || row.draws || 0,
  lost: row.lost || row.losses || row.l || 0,
  goalsFor: row.goals_for || row.goalsFor || row.gf || row.scored || 0,
  goalsAgainst: row.goals_against || row.goalsAgainst || row.ga || row.conceded || 0,
  goalDiff:
    row.goal_diff !== undefined
      ? row.goal_diff
      : row.goalDiff !== undefined
      ? row.goalDiff
      : row.gd !== undefined
      ? row.gd
      : 0,
  points: row.points || row.pts || row.p || 0,
});
