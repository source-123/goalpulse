const express = require('express');
const cors = require('cors');
const EventSource = require('eventsource');

const app = express();
const PORT = process.env.PORT || 3000;
const SSE_URL = 'https://livescoremcp.com/sse';

app.use(cors());

// ==================================================
// 💾 CACHE MÉMOIRE (économise les appels MCP)
// ==================================================
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 secondes

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
// 🔧 Appel MCP via SSE
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
// 🏥 Health check (pour UptimeRobot)
// ==================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    source: 'livescoremcp.com',
    cached: cache.size,
    ts: Date.now(),
  });
});

// ==================================================
// 🏠 Scores live (avec cache 60s)
// ==================================================
app.get('/api/live-scores', async (req, res) => {
  const cached = getCached('live-scores');
  if (cached) {
    return res.json(cached);
  }

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
// 📊 Détail d'un match (cache 5 min)
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
// 🏆 Classement (cache 10 min)
// ==================================================
app.get('/api/standings/:id', async (req, res) => {
  const key = `standings-${req.params.id}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);

  const tools = [
    { name: 'get_standings', args: { league_id: req.params.id } },
    { name: 'getStandings', args: { league_id: req.params.id } },
    { name: 'get_table', args: { league_id: req.params.id } },
  ];
  const errors = [];

  for (const t of tools) {
    try {
      const data = await callMCPTool(t.name, t.args);
      const result = { success: true, tool: t.name, data };
      setCache(key, result);
      return res.json(result);
    } catch (err) {
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  res.status(404).json({ success: false, error: 'Aucun outil trouvé', errors });
});

// ==================================================
// 🚀 Démarrage
// ==================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log(`🚀 Proxy GoalPulse sur port ${PORT}`);
  console.log(`💾 Cache: ${CACHE_TTL / 1000}s`);
  console.log(`🌐 Source: ${SSE_URL}`);
  console.log('');
});
