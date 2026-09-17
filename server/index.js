const express = require('express');
const cors = require('cors');
const EventSource = require('eventsource');

const app = express();
const PORT = 3000;
const SSE_URL = 'https://livescoremcp.com/sse';

app.use(cors());

const fetchLiveScores = () => {
  return new Promise((resolve, reject) => {
    console.log('=== DEBUT fetchLiveScores ===');
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

    es.addEventListener('open', () => console.log('SSE: ouvert'));

    es.addEventListener('endpoint', async (e) => {
      console.log('SSE endpoint:', e.data);
      requestId = Date.now();
      try {
        const res = await fetch(e.data, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method: 'tools/call',
            params: { name: 'get_live_scores', arguments: {} },
          }),
        });
        console.log('POST status:', res.status);
      } catch (err) {
        console.error('POST err:', err.message);
        finish(false, null, err);
      }
    });

    es.addEventListener('message', (e) => {
      if (resolved) return;
      console.log('MESSAGE recu, longueur:', e.data?.length || 0);
      
      try {
        const parsed = JSON.parse(e.data);
        console.log('JSON parse OK, id:', parsed.id, 'requestId:', requestId);
        
        if (parsed.id !== requestId) {
          console.log('id ne correspond pas, on ignore');
          return;
        }
        
        const text = parsed.result?.content?.[0]?.text;
        console.log('Texte recu, longueur:', text?.length || 0);
        
        if (!text) {
          console.log('Pas de texte dans la reponse');
          throw new Error('Pas de contenu');
        }

        const jsonStart = text.indexOf('[');
        console.log('Position du [:', jsonStart);
        
        if (jsonStart === -1) throw new Error('Format inattendu');
        
        const jsonStr = text.substring(jsonStart);
        console.log('Debut du JSON:', jsonStr.substring(0, 100));
        console.log('Fin du JSON:', jsonStr.substring(jsonStr.length - 100));
        
        const data = JSON.parse(jsonStr);
        console.log('SUCCESS!', data.length, 'pays');
        finish(true, data);
      } catch (err) {
        console.error('Erreur parse:', err.message);
        console.error('Stack:', err.stack);
        finish(false, null, err);
      }
    });

    es.addEventListener('error', (err) => {
      console.error('SSE error:', err?.message || err);
      if (!resolved) {
        finish(false, null, new Error('SSE error'));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        console.log('TIMEOUT');
        finish(false, null, new Error('Timeout 30s'));
      }
    }, 30000);
  });
};

app.get('/api/live-scores', async (req, res) => {
  console.log('=== APPEL API ===');
  try {
    const data = await fetchLiveScores();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Erreur finale:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('Proxy demarre sur port ' + PORT);
});
