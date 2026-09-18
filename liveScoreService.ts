// ☁️ Service : LiveScore MCP (via Render) + Football-Data.org (classement)
// URL Render : https://goalpulse-aciq.onrender.com
const PROXY_URL = 'https://goalpulse-aciq.onrender.com';

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
  position: number;
  team: string;
  crest?: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface StandingsResult {
  competition: string;
  season: string;
  rows: StandingRow[];
}

// ===========================
// 🏠 SCORES LIVE
// ===========================

export const fetchLiveScores = async (): Promise<CountryGroup[]> => {
  console.log('🚀 Fetch scores:', PROXY_URL);
  try {
    const res = await fetch(`${PROXY_URL}/api/live-scores`);
    console.log('📥 Status:', res.status);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erreur proxy');

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
// 📅 MATCHS PAR DATE (YYYY-MM-DD)
// ===========================

export const fetchMatchesByDate = async (
  date: string
): Promise<CountryGroup[]> => {
  try {
    const res = await fetch(`${PROXY_URL}/api/matches/${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erreur proxy');
    return json.data || [];
  } catch (err: any) {
    console.error('❌ Erreur fetchMatchesByDate:', err);
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erreur proxy');

    return json.data;
  } catch (err: any) {
    console.error('❌ Erreur fetchMatchDetail:', err);
    throw err;
  }
};

// ===========================
// 🏆 CLASSEMENT (Football-Data.org)
// ===========================
// Codes disponibles :
// PL, PD, SA, BL1, FL1, CL, DED, PPL, BSA, ELC, EC, WC

export const fetchStandings = async (
  competitionCode: string
): Promise<StandingsResult> => {
  console.log('🏆 Fetch standings:', competitionCode);
  try {
    const res = await fetch(`${PROXY_URL}/api/standings/${competitionCode}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erreur proxy');

    return {
      competition: json.competition || competitionCode,
      season: json.season || '',
      rows: (json.data || []).map((row: any, i: number) =>
        normalizeStandingRow(row, i)
      ),
    };
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
  if (status === 'HT' || status === 'LIVE') return true;
  const num = parseInt(status, 10);
  return !isNaN(num) && num > 0 && num <= 90;
};

// ✅ Détection "terminé"
export const isFinishedStatus = (status: string): boolean => {
  if (!status) return false;
  if (status === 'FT') return true;
  const num = parseInt(status, 10);
  return !isNaN(num) && num >= 90;
};

// ⏰ Détection "à venir"
export const isUpcomingStatus = (status: string): boolean => {
  if (!status) return true;
  if (['NS', 'SCHEDULED', 'TIMED', 'Postp.'].includes(status)) return true;
  return false;
};

// 📊 Statut lisible en français
export const getStatusLabel = (status: string): string => {
  if (!status) return '⏰ À venir';
  if (status === 'HT') return '⏸️ Mi-temps';
  if (status === 'LIVE') return '🔴 EN DIRECT';
  if (status === 'FT') return '✅ Terminé';
  if (status === 'NS') return '⏰ À venir';
  if (status === 'Postp.') return '⏳ Reporté';
  if (status === 'Canc.') return '❌ Annulé';

  const num = parseInt(status, 10);
  if (!isNaN(num)) {
    if (num >= 90) return '✅ Terminé';
    return `🔴 ${num}'`;
  }
  return status;
};

// 🏆 Normaliser une ligne de classement
export const normalizeStandingRow = (
  row: any,
  index: number
): StandingRow => ({
  position: row.position || row.rank || index + 1,
  team:
    row.team ||
    row.team_name ||
    row.name ||
    row.teamName ||
    `Équipe ${index + 1}`,
  crest: row.crest || row.logo || undefined,
  played: row.played ?? row.playedGames ?? row.matches ?? 0,
  won: row.won ?? row.wins ?? 0,
  draw: row.draw ?? row.drawn ?? row.draws ?? 0,
  lost: row.lost ?? row.losses ?? 0,
  goalsFor: row.goalsFor ?? row.goals_for ?? row.gf ?? 0,
  goalsAgainst: row.goalsAgainst ?? row.goals_against ?? row.ga ?? 0,
  goalDiff: row.goalDiff ?? row.goal_diff ?? row.gd ?? 0,
  points: row.points ?? row.pts ?? 0,
});
