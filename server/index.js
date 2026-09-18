const express = require('express');
const cors = require('cors');
const EventSource = require('eventsource');

const app = express();
const PORT = process.env.PORT || 3000;
const SSE_URL = 'https://livescoremcp.com/sse';
const FD_TOKEN = '20fcd3d508e24984b82ba762b50d0ab0';

app.use(cors());

// ==================================================
// 💾 CACHE MÉMOIRE
// ==================================================
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 secondes

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.ts < CACHE_TTL) {
    console.log(`⚡ Cache HIT: ${key}`);
    return item.data;
  }
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, ts: Date.now() });
  console.log(`💾 Cache SET: ${key}`);
};

// ==================================================
// 🔧 APPEL MCP via SSE (LiveScore)
// ==================================================
const callMCPTool = (toolName, args = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`🔧 MCP: ${toolName}`, JSON.stringify(args));
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
// 🏥 HEALTH CHECK
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
// 🏠 SCORES LIVE (LiveScore MCP + cache 30s)
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
    console.error('❌ Erreur live-scores:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 📅 MATCHS PAR DATE (LiveScore MCP)
// ==================================================
app.get('/api/matches/:date', async (req, res) => {
  const key = `matches-${req.params.date}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    const data = await callMCPTool('get_day_fixtures', {
      date: req.params.date,
    });
    const result = { success: true, data };
    setCache(key, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 📊 DÉTAIL D'UN MATCH (LiveScore MCP)
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
// 🏆 CLASSEMENT (Football-Data.org — 12 grandes ligues)
// ==================================================
// Codes: PL, PD, SA, BL1, FL1, CL, DED, PPL, BSA, ELC, EC, WC
app.get('/api/standings/:code', async (req, res) => {
  const key = `standings-${req.params.code}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  try {
    console.log(`🏆 Fetch standings: ${req.params.code}`);
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
    console.error('❌ Erreur standings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// 🚀 DÉMARRAGE
// ==================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log(`🚀 Proxy GoalPulse sur port ${PORT}`);
  console.log(`💾 Cache: ${CACHE_TTL / 1000}s`);
  console.log(`🌐 LiveScore MCP: ${SSE_URL}`);
  console.log(`🏆 Football-Data.org: activé`);
  console.log('');
});
