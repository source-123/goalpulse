// ⚽ Service pour les infos d'équipe
// Utilise l'API publique TheSportsDB (gratuite, sans clé)

const TSDB_KEY = '3'; // Test key publique
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json';

export interface TeamInfo {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
  strAlternate?: string;
  strSport: string;
  strLeague?: string;
  strStadium?: string;
  strStadiumLocation?: string;
  intStadiumCapacity?: string;
  strWebsite?: string;
  strDescriptionFR?: string;
  strDescriptionEN?: string;
  strTeamBadge?: string;
  strTeamBanner?: string;
  strTeamJersey?: string;
  strCountry?: string;
  strManager?: string;
  intFormedYear?: string;
}

export interface TeamPlayer {
  idPlayer: string;
  strPlayer: string;
  strPosition?: string;
  strNationality?: string;
  strThumb?: string;
  strNumber?: string;
  dateBorn?: string;
}

export interface TeamEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string;
  strTime?: string;
  strLeague: string;
  strSeason?: string;
  strVenue?: string;
}

// ===========================
// 🔍 RECHERCHER UNE ÉQUIPE
// ===========================
export const searchTeam = async (teamName: string): Promise<TeamInfo[]> => {
  try {
    const cleanName = teamName
      .replace(/\s+U\d+/i, '')
      .replace(/\s+(FC|CF|SC|AC|II)$/i, '')
      .trim();

    const res = await fetch(
      `${TSDB_BASE}/${TSDB_KEY}/searchteams.php?t=${encodeURIComponent(cleanName)}`
    );
    const json = await res.json();
    return json.teams || [];
  } catch (e) {
    console.error('Erreur searchTeam:', e);
    return [];
  }
};

// ===========================
// 📋 DÉTAILS D'UNE ÉQUIPE
// ===========================
export const getTeamById = async (teamId: string): Promise<TeamInfo | null> => {
  try {
    const res = await fetch(`${TSDB_BASE}/${TSDB_KEY}/lookupteam.php?id=${teamId}`);
    const json = await res.json();
    return json.teams?.[0] || null;
  } catch (e) {
    console.error('Erreur getTeamById:', e);
    return null;
  }
};

// ===========================
// 👥 JOUEURS D'UNE ÉQUIPE
// ===========================
export const getTeamPlayers = async (teamId: string): Promise<TeamPlayer[]> => {
  try {
    const res = await fetch(
      `${TSDB_BASE}/${TSDB_KEY}/lookup_all_players.php?id=${teamId}`
    );
    const json = await res.json();
    return json.player || [];
  } catch (e) {
    console.error('Erreur getTeamPlayers:', e);
    return [];
  }
};

// ===========================
// 📅 5 DERNIERS MATCHS
// ===========================
export const getTeamLastEvents = async (teamId: string): Promise<TeamEvent[]> => {
  try {
    const res = await fetch(
      `${TSDB_BASE}/${TSDB_KEY}/eventslast.php?id=${teamId}`
    );
    const json = await res.json();
    return json.results || [];
  } catch (e) {
    console.error('Erreur lastEvents:', e);
    return [];
  }
};

// ===========================
// 📅 5 PROCHAINS MATCHS
// ===========================
export const getTeamNextEvents = async (teamId: string): Promise<TeamEvent[]> => {
  try {
    const res = await fetch(
      `${TSDB_BASE}/${TSDB_KEY}/eventsnext.php?id=${teamId}`
    );
    const json = await res.json();
    return json.events || [];
  } catch (e) {
    console.error('Erreur nextEvents:', e);
    return [];
  }
};

// ===========================
// 🏆 LIGUES D'UNE ÉQUIPE
// ===========================
export const getTeamLeagues = async (teamId: string): Promise<any[]> => {
  try {
    const res = await fetch(
      `${TSDB_BASE}/${TSDB_KEY}/lookup_all_leagues.php?id=${teamId}`
    );
    const json = await res.json();
    return json.leagues || [];
  } catch (e) {
    return [];
  }
};

// ===========================
// 📊 CALCULER LA FORME (5 derniers)
// ===========================
export const computeForm = (
  events: TeamEvent[],
  teamName: string
): Array<'W' | 'D' | 'L'> => {
  return events.slice(0, 5).map((ev) => {
    const isHome = ev.strHomeTeam?.toLowerCase().includes(
      teamName.toLowerCase().split(' ')[0]
    );
    const homeScore = parseInt(ev.intHomeScore || '0', 10);
    const awayScore = parseInt(ev.intAwayScore || '0', 10);

    if (homeScore === awayScore) return 'D';
    if (isHome) return homeScore > awayScore ? 'W' : 'L';
    return awayScore > homeScore ? 'W' : 'L';
  });
};
