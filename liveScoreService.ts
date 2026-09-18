// ☁️ Service Football-Data.org via Cloudflare Worker (avec cache)
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
  homeCrest?: string;
  awayCrest?: string;
  competitionCode?: string;
  utcDate?: string;
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

// ===========================
// 🏠 SCORES
// ===========================

export const fetchLiveScores = async (): Promise<CountryGroup[]> => {
  console.log('🚀 Fetch scores:', PROXY_URL);
  const res = await fetch(`${PROXY_URL}/api/live-scores`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur proxy');
  const groups: CountryGroup[] = json.data || [];
  console.log(`✅ ${groups.length} pays reçus`);
  return groups;
};

// 📅 Matchs par date (YYYY-MM-DD)
export const fetchMatchesByDate = async (date: string): Promise<CountryGroup[]> => {
  const res = await fetch(`${PROXY_URL}/api/matches/${date}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur proxy');
  return json.data || [];
};

// ===========================
// 📊 DÉTAIL D'UN MATCH
// ===========================

export const fetchMatchDetail = async (matchId: string): Promise<any> => {
  const res = await fetch(`${PROXY_URL}/api/match/${matchId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur proxy');
  return json.data;
};

// ===========================
// 🏆 CLASSEMENT
// ===========================

export const fetchStandings = async (competitionCode: string): Promise<any[]> => {
  const res = await fetch(`${PROXY_URL}/api/standings/${competitionCode}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur proxy');
  return json.data || [];
};

// ===========================
// 🛠️ HELPERS
// ===========================

export const formatTime = (time: string): string => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

export const isLiveStatus = (status: string): boolean => {
  if (!status) return false;
  if (status === 'HT' || status === 'LIVE') return true;
  const num = parseInt(status, 10);
  return !isNaN(num) && num > 0 && num <= 90;
};

export const getStatusLabel = (status: string): string => {
  if (!status) return '';
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
