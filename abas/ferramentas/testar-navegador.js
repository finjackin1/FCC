'use strict';
// Claude's browser (navegador.js, 24/11): real Electron window with the same CSP and <webview> as the Prévia panel, local http page.
// Uso: node ferramentas\testar-navegador.js   (relaunches itself in Electron; window offscreen)
const path = require('path'), http = require('http'), fs = require('fs'), os = require('os'), assert = require('assert');
const ABAS = path.join(__dirname, '..');
if (!process.versions.electron) {
  const r = require('child_process').spawnSync(require(path.join(ABAS, 'node_modules', 'electron')), [__filename], { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 120000 });
  process.exit(r.status === null ? 1 : r.status);
}
const { app, BrowserWindow } = require('electron');
const NAV = require(path.join(ABAS, 'navegador.js')), { z } = require(path.join(ABAS, 'node_modules', 'zod'));
const PAGINA = '<!doctype html><title>Teste FCC</title><h1>Olá navegador</h1><input id="nome" placeholder="Seu nome"><button onclick="document.getElementById(\'saida\').textContent=\'oi \'+document.getElementById(\'nome\').value">Saudar</button><p id="saida"></p><a href="/dois">Ir para dois</a>';
let falhas = 0;
const ok = (nome, f) => Promise.resolve().then(f).then(() => console.log('ok    ' + nome), (e) => { falhas++; console.log('FALHOU ' + nome + ': ' + e.message); });

app.on('web-contents-created', (e, wc) => { if (wc.getType() === 'webview') NAV.registrar(wc); });
app.whenReady().then(async () => {
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(q.url === '/dois' ? '<title>Dois</title><p>página dois</p>' : PAGINA); }).listen(0);
  const porta = srv.address().port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-nav-'));
  const csp = fs.readFileSync(path.join(ABAS, 'tela', 'ca', 'index.html'), 'utf8').match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)[0];
  fs.writeFileSync(path.join(dir, 'i.html'), `<!doctype html><html><head>${csp}</head><body style="margin:0"><div id="p"></div><script src="i.js"></script></body></html>`);
  fs.writeFileSync(path.join(dir, 'i.js'), "require = undefined; window.abrir = () => { if (document.getElementById('w')) return; document.getElementById('p').innerHTML = '<webview id=\"w\" src=\"about:blank\" partition=\"persist:teste\" style=\"width:460px;height:600px;display:flex\"></webview>'; };");
  const win = new BrowserWindow({ x: -4000, y: 100, width: 500, height: 700, show: true, skipTaskbar: true, webPreferences: { webviewTag: true, contextIsolation: true } });
  win.webContents.on('will-attach-webview', NAV.proteger);
  await win.loadFile(path.join(dir, 'i.html'));
  let pedidos = 0;
  const T = Object.fromEntries(NAV.ferramentas({ tool: (n, d, s, h) => ({ n, h }) }, z, 'aba1', () => { pedidos++; win.webContents.executeJavaScript('abrir()'); }).map(x => [x.n, x.h]));
  const txt = async (n, a) => { const r = await T[n](a || {}); if (r.isError) throw new Error(r.content[0].text); return r.content[0].text !== undefined ? r.content[0].text : r.content[0]; };
  try {
    await ok('1 abrir: pede o painel, carrega e lista elementos', async () => { const r = await txt('navegador_abrir', { url: String(porta) }); assert.ok(pedidos >= 1); assert.match(r, /Título: Teste FCC/); assert.match(r, /Olá navegador/); assert.match(r, /\[1\] input:text "Seu nome"/); assert.match(r, /\[2\] button "Saudar"/); });
    await ok('2 digitar pelo número e clicar pelo texto', async () => { assert.strictEqual(await txt('navegador_digitar', { alvo: '1', texto: 'Fin' }), 'digitado.'); const r = await txt('navegador_clicar', { alvo: 'Saudar' }); assert.match(r, /oi Fin/); });
    await ok('3 js devolve JSON', async () => assert.strictEqual(await txt('navegador_js', { codigo: '({ a: 1 + 1 })' }), '{"a":2}'));
    await ok('4 clicar link navega e espera carregar', async () => { const r = await txt('navegador_clicar', { alvo: '3' }); assert.match(r, /Título: Dois/); });
    await ok('5 foto é PNG (ou aviso claro se a janela não pinta)', async () => { const x = await T.navegador_foto({}); if (x.isError) return assert.match(x.content[0].text, /não consegui a foto/); const r = x.content[0]; assert.strictEqual(r.type, 'image'); assert.ok(Buffer.from(r.data, 'base64').readUInt32BE(0) === 0x89504e47); });
    await ok('6 alvo inexistente não quebra', async () => assert.match(await txt('navegador_clicar', { alvo: 'nada disso' }), /não achei/));
    await ok('7 só http/https', async () => { const r = await T.navegador_abrir({ url: 'file:///c:/' }); assert.ok(r.isError); });
  } finally { srv.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo'); app.exit(falhas ? 1 : 0);
});
