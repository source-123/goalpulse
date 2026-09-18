// ☁️ Cloudflare Worker — Proxy LiveScore MCP
// Compatible avec le runtime V8 de Cloudflare
// Routes : /api/live-scores, /api/match/:id, /api/standings/:id, /health

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 🏥 Health check
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok' }, corsHeaders);
    }

    // 🏠 Live scores
     if (url.pathname === '/api/live-scores') {
      try {
        console.log('[WORKER] Fetching live scores...');
        const data = await callMCPTool('get_live_scores');
        console.log('[WORKER] Success:', JSON.stringify(data).substring(0, 200));
        return jsonResponse({ success: true, data }, corsHeaders);
      } catch (err) {
        console.error('[WORKER ERROR]', err.message, err.stack);
        return jsonResponse(
          { 
            success: false, 
            error: err.message,
            stack: err.stack?.substring(0, 500),
          },
          corsHeaders,
          500
        );
      }
    }

    // 📊 Détail d'un match
    if (url.pathname.startsWith('/api/match/')) {
      const id = url.pathname.split('/').pop();
      try {
        const data = await callMCPTool('get_match', { match_id: id });
        return jsonResponse({ success: true, data }, corsHeaders);
      } catch (err) {
        return jsonResponse(
          { success: false, error: err.message },
          corsHeaders,
          500
        );
      }
    }

    // 🏆 Classement d'une ligue
    if (url.pathname.startsWith('/api/standings/')) {
      const id = url.pathname.split('/').pop();

      // Essayer plusieurs noms d'outils MCP
      const tools = [
        { name: 'get_standings', args: { league_id: id } },
        { name: 'getStandings', args: { league_id: id } },
        { name: 'get_league_standings', args: { league_id: id } },
        { name: 'standings', args: { league_id: id } },
        { name: 'get_standings', args: { league: id } },
        { name: 'get_table', args: { league_id: id } },
      ];

      const errors = [];
      for (const tool of tools) {
        try {
          const data = await callMCPTool(tool.name, tool.args);
          if (data) {
            return jsonResponse(
              { success: true, tool: tool.name, data },
              corsHeaders
            );
          }
        } catch (err) {
          errors.push(`${tool.name}: ${err.message}`);
        }
      }

      return jsonResponse(
        {
          success: false,
          error: 'Aucun outil classement trouvé',
          tried: tools.map((t) => t.name),
          errors,
        },
        corsHeaders,
        404
      );
    }

    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  },
};

// ==================================================
// 🔧 Appel MCP via SSE
// ==================================================
async function callMCPTool(toolName, args = {}) {
  const sseRes = await fetch('https://livescoremcp.com/sse', {
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });

  if (!sseRes.ok) throw new Error('SSE connection failed');

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sessionEndpoint = null;
  let requestId = null;
  let resolved = false;
  let result = null;
  let error = null;

  const TIMEOUT = 25000;
  const startTime = Date.now();

  try {
    while (!resolved) {
      if (Date.now() - startTime > TIMEOUT) {
        throw new Error('Timeout 25s');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        const lines = eventBlock.split('\n');
        let eventType = 'message';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const dataLine = line.slice(5);
            eventData += dataLine.startsWith(' ')
              ? dataLine.slice(1)
              : dataLine;
          }
        }

        // Événement endpoint (URL de session)
        if (eventType === 'endpoint' && !sessionEndpoint) {
          sessionEndpoint = eventData;
          requestId = Date.now();

          fetch(sessionEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: requestId,
              method: 'tools/call',
              params: { name: toolName, arguments: args },
            }),
          }).catch((e) => {
            error = e;
            resolved = true;
          });
        }

        // Événement message (la réponse)
        if (eventType === 'message' && sessionEndpoint && !resolved) {
          try {
            const parsed = JSON.parse(eventData);
            if (parsed.id === requestId) {
              if (parsed.error) throw new Error(parsed.error.message);

              const text = parsed.result?.content?.[0]?.text;
              if (!text) throw new Error('No content');

              const candidates = [
                text.indexOf('['),
                text.indexOf('{'),
              ].filter((i) => i >= 0);
              const jsonStart = candidates.length
                ? Math.min(...candidates)
                : -1;

              if (jsonStart === -1) {
                result = { raw: text };
              } else {
                result = JSON.parse(text.substring(jsonStart));
              }
              resolved = true;
            }
          } catch (e) {
            error = e;
            resolved = true;
          }
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch (e) {}
  }

  if (error) throw error;
  if (!resolved) throw new Error('No response');
  return result;
}

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
