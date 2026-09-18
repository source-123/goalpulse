const express = require('express');
const cors = require('cors');
const EventSource = require('eventsource');

const app = express();
const PORT = process.env.PORT || 3000;
const SSE_URL = 'https://livescoremcp.com/sse';

app.use(cors());

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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/live-scores', async (req, res) => {
  try {
    const data = await callMCPTool('get_live_scores');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/match/:id', async (req, res) => {
  try {
    const data = await callMCPTool('get_match', { match_id: req.params.id });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/standings/:id', async (req, res) => {
  const tools = [
    { name: 'get_standings', args: { league_id: req.params.id } },
    { name: 'getStandings', args: { league_id: req.params.id } },
    { name: 'get_table', args: { league_id: req.params.id } },
  ];
  const errors = [];
  for (const t of tools) {
    try {
      const data = await callMCPTool(t.name, t.args);
      return res.json({ success: true, tool: t.name, data });
    } catch (err) {
      errors.push(`${t.name}: ${err.message}`);
    }
  }
  res.status(404).json({ success: false, error: 'Aucun outil trouvé', errors });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy sur port ${PORT}`);
});
