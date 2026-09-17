// 🎯 Service qui appelle ton PROXY (pas directement LiveScore MCP)
// ⚠️ Remplace par TON URL de Codespaces port 3000
const PROXY_URL = 'https://redesigned-doodle-jr754vr545jrcjjqq-3000.app.github.dev';

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

export const fetchLiveScores = async (): Promise<CountryGroup[]> => {
  console.log('🚀 Appel proxy:', PROXY_URL);
  try {
    const res = await fetch(`${PROXY_URL}/api/live-scores`);
    console.log('📥 Status:', res.status);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Erreur proxy');
    }

    // Adapter : injecter 'country' dans chaque match + adapter la structure
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
    console.error('❌ Erreur fetch:', err);
    throw err;
  }
};

export const formatTime = (time: string): string => time ? time.slice(0, 5) : '--:--';

export const isLiveStatus = (status: string): boolean => {
  if (!status) return false;
  if (status === 'HT') return true;
  const num = parseInt(status, 10);
  return !isNaN(num) && num > 0 && num <= 90;
};

export const getStatusLabel = (status: string): string => {
  if (status === 'HT') return '⏸️ Mi-temps';
  const num = parseInt(status, 10);
  if (!isNaN(num)) {
    if (num >= 90) return '✅ Terminé';
    return `🔴 ${num}'`;
  }
  return status;
};
