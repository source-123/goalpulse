import EventSource from 'react-native-sse';

const SSE_URL = 'https://livescoremcp.com/sse';

// 📦 Type d'un match brut
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
  stageName?: string;
  week?: string;
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

// 🔧 Helper : parser le texte brut
const parseResponseText = (text: string): CountryGroup[] => {
  // Le texte commence par "Live Scores:\n\n[...]"
  const jsonStart = text.indexOf('[');
  if (jsonStart === -1) return [];
  const jsonStr = text.substring(jsonStart);
  try {
    const data = JSON.parse(jsonStr);
    // Injecter le country dans chaque match
    return data.map((country: any) => ({
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
  } catch (e) {
    console.error('Erreur parse JSON:', e);
    return [];
  }
};

// 🔴 Récupérer les scores live (via MCP over SSE)
export const fetchLiveScores = (): Promise<CountryGroup[]> => {
  return new Promise((resolve, reject) => {
    const es = new EventSource(SSE_URL);
    let sessionEndpoint: string | null = null;
    let requestId: number | null = null;
    let resolved = false;

    const cleanup = () => {
      try { es.close(); } catch (e) {}
    };

    const finish = (success: boolean, data?: CountryGroup[], error?: any) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      if (success) resolve(data || []);
      else reject(error);
    };

    // 🔑 Étape 1 : Recevoir l'endpoint de session
    es.addEventListener('endpoint', async (e: any) => {
      sessionEndpoint = e.data;
      requestId = Date.now();

      try {
        await fetch(sessionEndpoint!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method: 'tools/call',
            params: { name: 'get_live_scores', arguments: {} },
          }),
        });
      } catch (err) {
        finish(false, undefined, err);
      }
    });

    // 🔑 Étape 2 : Écouter la réponse via SSE
    es.addEventListener('message', (e: any) => {
      if (resolved) return;
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.id !== requestId) return;

        const text = parsed.result?.content?.[0]?.text;
        if (!text) throw new Error('Pas de contenu');

        const data = parseResponseText(text);
        finish(true, data);
      } catch (err) {
        finish(false, undefined, err);
      }
    });

    es.addEventListener('error', (err: any) => {
      finish(false, undefined, new Error('SSE error: ' + (err?.message || 'inconnu')));
    });

    // ⏰ Timeout de sécurité
    setTimeout(() => {
      finish(false, undefined, new Error('Timeout 30s'));
    }, 30000);
  });
};

// 🕐 Format de l'heure
export const formatTime = (time: string): string => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

// 🔴 Détection live
export const isLiveStatus = (status: string): boolean => {
  if (!status) return false;
  if (status === 'HT') return true; // Mi-temps
  const num = parseInt(status, 10);
  return !isNaN(num) && num > 0 && num <= 90;
};

// 📊 Statut lisible
export const getStatusLabel = (status: string): string => {
  if (status === 'HT') return '⏸️ Mi-temps';
  const num = parseInt(status, 10);
  if (!isNaN(num)) {
    if (num >= 90) return '✅ Terminé';
    return `🔴 ${num}'`;
  }
  return status;
};
