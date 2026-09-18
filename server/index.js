const express = require('express');
const cors = require('cors');
const EventSource = require('eventsource');

const app = express();
const PORT = process.env.PORT || 3000;
const SSE_URL = 'https://livescoremcp.com/sse';
const FD_TOKEN = '20fcd3d508e24984b82ba762b50d0ab0';

app.use(cors());
app.use(express.json());

// ==================================================
// 💾 CACHE MÉMOIRE
// ==================================================
const cache = new Map();
const CACHE_TTL = 30 * 1000;

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.ts < CACHE_TTL) {
    return item.data;
  }
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, ts: Date.now() });
};

// ==================================================
// 🔧 APPEL MCP via SSE
// ==================================================
const callMCPTool = (toolName, args = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`🔧 MCP: ${toolName}`);
    const es = new EventSource(SSE_URL);
    let requestId = null;
    let resolved = false;

    const finish = (success, data, error) => {
      if (resolved) return;
      resolved = true;
      try { es.close(); } catch (e) {}
      if (success) resolve(data);
      else reject(error);
    };

    es.addEventListener('endpoint', async (e) => {
      requestId = Date.now();
      try {
        await fetch(e.data, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method: 'tools/call',
            params: { name: toolName, arguments: args },
          }),
        });
      } catch (err) {
        finish(false, null, err);
      }
    });

    es.addEventListener('message', (e) => {
      if (resolved) return;
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.id !== requestId) return;
        if (parsed.error) throw new Error(parsed.error.message);

        const text = parsed.result?.content?.[0]?.text;
        if (!text) throw new Error('No content');

        const candidates = [text.indexOf('['), text.indexOf('{')].filter((i) => i >= 0);
        const jsonStart = candidates.length ? Math.min(...candidates) : -1;
        const data = jsonStart === -1 ? { raw: text } : JSON.parse(text.substring(jsonStart));
        finish(true, data);
      } catch (err) {
        finish(false, null, err);
      }
    });

    es.addEventListener('error', (err) => finish(false, null, err));
    setTimeout(() => finish(false, null, new Error('Timeout 30s')), 30000);
  });
};

// ==================================================
// 🏥 HEALTH
// ==================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    source: 'livescoremcp.com + football-data.org',
    cached: cache.size,
    ts: Date.now(),
  });
});

// ==================================================
// 🏠 SCORES LIVE
// ==================================================
app.get('/api/live-scores', async (req, res) => {
  const cached = getCached('live-scores');
  if (cached) return res.json(cached);

  try {
    const data = await callMCPTool('get_live_scores');
    const result = { success: true, data };
    setCache('live-scores', result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 🎯 INDEX DES SCORES
// ==================================================
app.get('/api/check-scores', async (req, res) => {
  const cached = getCached('check-scores');
  if (cached) return res.json(cached);

  try {
    const data = await callMCPTool('get_live_scores');
    const index = {};
    (data || []).forEach((country) => {
      (country.leagues || []).forEach((league) => {
        (league.matches || []).forEach((m) => {
          const parts = m.scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];
          index[m.id] = {
            homeScore: parseInt(parts[0], 10) || 0,
            awayScore: parseInt(parts[1], 10) || 0,
            status: m.status,
          };
        });
      });
    });
    const result = { success: true, data: index };
    setCache('check-scores', result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 📅 MATCHS PAR DATE
// ==================================================
app.get('/api/matches/:date', async (req, res) => {
  const key = `matches-${req.params.date}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const data = await callMCPTool('get_day_fixtures', { date: req.params.date });
    const result = { success: true, data };
    setCache(key, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 📊 DÉTAIL D'UN MATCH
// ==================================================
app.get('/api/match/:id', async (req, res) => {
  const key = `match-${req.params.id}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const data = await callMCPTool('get_match', { match_id: req.params.id });
    const result = { success: true, data };
    setCache(key, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 🏆 CLASSEMENT (Football-Data.org)
// ==================================================
app.get('/api/standings/:code', async (req, res) => {
  const key = `standings-${req.params.code}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const fdRes = await fetch(
      `https://api.football-data.org/v4/competitions/${req.params.code}/standings`,
      {
        headers: {
          'X-Auth-Token': FD_TOKEN,
          'User-Agent': 'GoalPulse/1.0',
          Accept: 'application/json',
        },
      }
    );

    if (!fdRes.ok) {
      const text = await fdRes.text();
      throw new Error(`FD ${fdRes.status}: ${text.substring(0, 150)}`);
    }

    const json = await fdRes.json();
    const table = json.standings?.[0]?.table || [];

    const result = {
      success: true,
      competition: json.competition?.name || req.params.code,
      area: json.competition?.area?.name || '',
      season: json.season?.startDate
        ? `${new Date(json.season.startDate).getFullYear()}/${new Date(json.season.endDate).getFullYear()}`
        : '',
      data: table.map((row) => ({
        position: row.position,
        team: row.team?.shortName || row.team?.name || 'Team',
        crest: row.team?.crest,
        played: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDiff: row.goalDifference,
        points: row.points,
        form: row.form || '',
      })),
    };

    setCache(key, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 🔔 NOTIFICATIONS PUSH (via Expo Push API)
// ==================================================
app.post('/api/notify', async (req, res) => {
  const { userKeys, title, body, data } = req.body;

  if (!userKeys || !Array.isArray(userKeys) || userKeys.length === 0) {
    return res.status(400).json({ success: false, error: 'userKeys requis' });
  }

  try {
    const tokens = [];

    for (const userKey of userKeys) {
      try {
        const fbRes = await fetch(
          `https://goalpulse-app-b000c-default-rtdb.firebaseio.com/users/${userKey}/pushToken.json`
        );
        const tokenData = await fbRes.json();
        if (tokenData?.token) {
          tokens.push(tokenData.token);
        }
      } catch (e) {
        console.error(`Token fetch error for ${userKey}:`, e.message);
      }
    }

    if (tokens.length === 0) {
      return res.json({ success: true, sent: 0, message: 'Aucun token' });
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: 'default',
    }));

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();
    console.log(`🔔 Notifs envoyées: ${tokens.length}`);

    res.json({ success: true, sent: tokens.length });
  } catch (err) {
    console.error('❌ Erreur notify:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 🚀 DÉMARRAGE
// ==================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy GoalPulse sur port ${PORT}`);
  console.log(`💾 Cache: ${CACHE_TTL / 1000}s`);
  console.log(`🔔 Notifications: activées`);
});
