// ☁️ Cloudflare Worker — Proxy Football-Data.org
// Cache API intégré (pas de KV setup)
// Token: 20fcd3d508e24984b82ba762b50d0ab0

const API_TOKEN = '20fcd3d508e24984b82ba762b50d0ab0';
const BASE_URL = 'https://api.football-data.org/v4';
const USER_AGENT = 'GoalPulse/1.0 (+https://github.com/source-123/goalpulse)';

// Durées de cache (en secondes)
const CACHE_LIVE = 60;    // 1 min pour matchs live
const CACHE_MATCH = 300;  // 5 min pour détail
const CACHE_STANDINGS = 600; // 10 min pour classement
const CACHE_COMPETITIONS = 3600; // 1h pour liste

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/health') {
      return jsonResponse(
        { status: 'ok', source: 'football-data.org', ts: Date.now() },
        corsHeaders
      );
    }

    // 🏠 Matchs live (aujourd'hui)
    if (url.pathname === '/api/live-scores') {
      return withCache(
        request,
        ctx,
        corsHeaders,
        CACHE_LIVE,
        async () => {
          const today = new Date().toISOString().split('T')[0];
          const data = await fetchFD(`/matches?date=${today}`);
          return { success: true, data: transformMatches(data) };
        }
      );
    }

    // 📅 Matchs d'une date (YYYY-MM-DD)
    if (url.pathname.startsWith('/api/matches/')) {
      const date = url.pathname.split('/').pop();
      return withCache(request, ctx, corsHeaders, CACHE_LIVE, async () => {
        const data = await fetchFD(`/matches?date=${date}`);
        return { success: true, data: transformMatches(data) };
      });
    }

    // 📊 Détail d'un match
    if (url.pathname.startsWith('/api/match/')) {
      const id = url.pathname.split('/').pop();
      return withCache(request, ctx, corsHeaders, CACHE_MATCH, async () => {
        const data = await fetchFD(`/matches/${id}`);
        return { success: true, data };
      });
    }

    // 🏆 Classement d'une compétition (PL, PD, SA, BL1, FL1, CL...)
    if (url.pathname.startsWith('/api/standings/')) {
      const code = url.pathname.split('/').pop();
      return withCache(request, ctx, corsHeaders, CACHE_STANDINGS, async () => {
        const data = await fetchFD(`/competitions/${code}/standings`);
        const table = data.standings?.[0]?.table || [];
        return { success: true, data: table };
      });
    }

    // 🏆 Liste des compétitions
    if (url.pathname === '/api/competitions') {
      return withCache(
        request,
        ctx,
        corsHeaders,
        CACHE_COMPETITIONS,
        async () => {
          const data = await fetchFD('/competitions');
          return { success: true, data: data.competitions || [] };
        }
      );
    }

    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  },
};

// ==================================================
// 🔧 Appel Football-Data.org
// ==================================================
async function fetchFD(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-Auth-Token': API_TOKEN,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FD API ${res.status}: ${text.substring(0, 200)}`);
  }

  return res.json();
}

// ==================================================
// 🔄 Transforme la réponse en format attendu par l'app
// ==================================================
function transformMatches(data) {
  const matches = data.matches || [];

  // Regrouper par pays (area) puis par compétition
  const byCountry = {};

  for (const m of matches) {
    const country = m.area?.name || m.competition?.area?.name || 'International';
    const leagueName = m.competition?.name || 'Autre';
    const leagueKey = m.competition?.code || m.competition?.id?.toString() || 'X';

    if (!byCountry[country]) byCountry[country] = {};
    if (!byCountry[country][leagueKey]) {
      byCountry[country][leagueKey] = {
        key: leagueKey,
        league: leagueName,
        matches: [],
      };
    }

    const homeScore = m.score?.fullTime?.home;
    const awayScore = m.score?.fullTime?.away;
    const scoretime =
      homeScore !== null && homeScore !== undefined
        ? `${homeScore} - ${awayScore}`
        : ' - ';

    // Statut normalisé
    let status = '';
    if (m.status === 'IN_PLAY') status = 'LIVE';
    else if (m.status === 'PAUSED') status = 'HT';
    else if (m.status === 'FINISHED') status = 'FT';
    else if (m.status === 'SCHEDULED' || m.status === 'TIMED') status = 'NS';
    else if (m.status === 'POSTPONED') status = 'Postp.';
    else if (m.status === 'CANCELLED') status = 'Canc.';
    else status = m.status || '';

    // Heure locale (HH:MM)
    let time = '--:--';
    if (m.utcDate) {
      const d = new Date(m.utcDate);
      time = d.toISOString().substring(11, 16);
    }

    // Date au format JJ/MM/AAAA
    let date = '';
    if (m.utcDate) {
      const [y, mo, d] = m.utcDate.split('T')[0].split('-');
      date = `${d}/${mo}/${y}`;
    }

    byCountry[country][leagueKey].matches.push({
      id: m.id.toString(),
      date,
      time,
      status,
      localteam: m.homeTeam?.shortName || m.homeTeam?.name || 'Home',
      visitorteam: m.awayTeam?.shortName || m.awayTeam?.name || 'Away',
      scoretime,
      leaguename: leagueName,
      leagueid: m.competition?.id?.toString() || '',
      country,
      // Champs supplémentaires utiles
      homeCrest: m.homeTeam?.crest,
      awayCrest: m.awayTeam?.crest,
      competitionCode: m.competition?.code,
      utcDate: m.utcDate,
    });
  }

  // Transformer en tableau
  return Object.keys(byCountry)
    .map((country) => ({
      country,
      leagues: Object.values(byCountry[country]),
    }))
    .filter((c) => c.leagues.length > 0);
}

// ==================================================
// 💾 Cache API helper
// ==================================================
async function withCache(request, ctx, corsHeaders, ttlSeconds, fetchFn) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  // Chercher dans le cache
  const cached = await cache.match(cacheKey);
  if (cached) {
    const response = new Response(cached.body, cached);
    response.headers.set('X-Cache', 'HIT');
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // Sinon, appeler l'API
  try {
    const json = await fetchFn();
    const response = new Response(JSON.stringify(json), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttlSeconds}`,
        'X-Cache': 'MISS',
        ...corsHeaders,
      },
    });

    // Mettre en cache (waitUntil évite de bloquer la réponse)
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
