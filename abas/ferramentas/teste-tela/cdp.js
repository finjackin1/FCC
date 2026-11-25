// usage: node cdp.js file.js   -> evaluates async expression in the FCC page, prints result
const fs = require('fs');
(async () => {
  const L = await (await fetch('http://127.0.0.1:9333/json')).json();
  const pg = L.find(x => x.type === 'page' && /index|ca|tela/.test(x.url)) || L.find(x => x.type === 'page');
  const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  const src = fs.readFileSync(process.argv[2], 'utf8');
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: src, awaitPromise: true, returnByValue: true } }));
  ws.onmessage = e => { const j = JSON.parse(e.data); if (j.id === 1) { const r = j.result; console.log(r.exceptionDetails ? 'ERRO ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : (typeof r.result.value === 'string' ? r.result.value : JSON.stringify(r.result.value))); process.exit(0); } };
  setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 100000);
})();
