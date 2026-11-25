// Claude's own browser (24/11, user request): every time Claude needs a browser it uses the Prévia panel (a <webview> the user sees).
// main.js registers the guest page (registrar) and serves these tools in the in-process "fcc" MCP server.
'use strict';
let PAG = null;   // guest webContents of the Prévia panel
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

function registrar(wc) {
  PAG = wc;
  wc.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) wc.loadURL(url).catch(() => { }); return { action: 'deny' }; });   // popups open in the same panel
  wc.on('destroyed', () => { if (PAG === wc) PAG = null; });
}
// webview params: no preload, no Node, only web/about pages
function proteger(e, wp, params) {
  delete wp.preload; wp.nodeIntegration = false; wp.contextIsolation = true; wp.sandbox = true;
  if (params.src && !/^(https?:|about:blank)/i.test(params.src)) e.preventDefault();
}
async function pagina(abrir, id) {
  if (PAG && !PAG.isDestroyed()) { abrir(id); return PAG; }
  abrir(id);   // UI opens the Prévia panel (creates the webview)
  for (let i = 0; i < 80 && !(PAG && !PAG.isDestroyed()); i++) await esperar(100);
  if (!PAG) throw new Error('o painel Prévia não abriu');
  const wc = PAG, t = Date.now();   // new webview: let its own first page load finish, or it replaces ours
  while ((!wc.getURL() || wc.isLoading()) && Date.now() - t < 10000) await esperar(100);
  return wc;
}
async function quieta(wc, ms = 10000) {   // wait for page to stop loading (clicks may navigate)
  await esperar(250); const t = Date.now();
  while (wc.isLoading() && Date.now() - t < ms) await esperar(150);
}
// numbers every visible clickable/typeable element (data-fcc-n) so Claude can say "clicar 12"
const RETRATO = `(() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const L = []; let n = 0;
  document.querySelectorAll('[data-fcc-n]').forEach(e => e.removeAttribute('data-fcc-n'));
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[role=tab],[role=menuitem],[onclick],[contenteditable=true]')) {
    if (!vis(e) || n >= 200) continue; e.setAttribute('data-fcc-n', ++n);
    const tx = (e.innerText || e.value || e.placeholder || e.getAttribute('aria-label') || e.title || e.name || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    L.push('[' + n + '] ' + e.tagName.toLowerCase() + (e.type && e.tagName === 'INPUT' ? ':' + e.type : '') + ' ' + JSON.stringify(tx) + (e.href ? ' -> ' + e.getAttribute('href').slice(0, 80) : ''));
  }
  const txt = (document.body ? document.body.innerText : '').replace(/\\n{3,}/g, '\\n\\n').slice(0, 12000);
  return 'Título: ' + document.title + '\\nEndereço: ' + location.href + '\\n\\n--- texto ---\\n' + txt + '\\n\\n--- elementos (use o número em clicar/digitar) ---\\n' + L.join('\\n');
})()`;
const achar = (alvo) => `(() => { const a = ${JSON.stringify(String(alvo))};
  let e = /^\\d+$/.test(a) ? document.querySelector('[data-fcc-n="' + a + '"]') : null;
  if (!e) try { e = document.querySelector(a); } catch { }
  if (!e) e = [...document.querySelectorAll('a,button,[role=button],input,label,summary')].find(x => (x.innerText || x.value || '').trim().toLowerCase() === a.toLowerCase());
  if (!e) e = [...document.querySelectorAll('a,button,[role=button],label,summary')].find(x => (x.innerText || '').toLowerCase().includes(a.toLowerCase()));
  return e; })()`;

const DEFS = [
  ['navegador_abrir', 'Abre um endereço no navegador do FCC (painel Prévia, que ele vê). Use SEMPRE este navegador quando precisar de um: ver/testar site ou app web, ler página que precisa de JavaScript, entrar em conta. Devolve título, texto e elementos numerados.', { url: 'endereço; só número = localhost:porta' }],
  ['navegador_ler', 'Lê a página aberta na Prévia: título, endereço, texto e elementos clicáveis numerados.', {}],
  ['navegador_clicar', 'Clica num elemento da página da Prévia.', { alvo: 'número de navegador_ler, seletor CSS ou texto do botão/link' }],
  ['navegador_digitar', 'Digita num campo da página da Prévia (substitui o que havia).', { alvo: 'número, seletor CSS ou texto', texto: 'o que digitar', enter: 'sim = aperta Enter no fim (opcional)' }],
  ['navegador_js', 'Roda JavaScript na página da Prévia e devolve o resultado (JSON). Para voltar: history.back().', { codigo: 'expressão ou (async()=>{...})()' }],
  ['navegador_foto', 'Foto da página da Prévia como está agora.', {}],
];

async function rodar(nome, a, abrir, id) {
  const wc = await pagina(abrir, id);
  const ler = async () => String(await wc.executeJavaScript(RETRATO, true));
  if (nome === 'navegador_abrir') {
    let u = String(a.url || '').trim(); if (/^\d+$/.test(u)) u = 'http://localhost:' + u; if (!/^[a-z]+:/i.test(u)) u = (/^(localhost|127\.)/.test(u) ? 'http://' : 'https://') + u;
    if (!/^https?:/i.test(u)) throw new Error('só endereços http/https');
    await wc.loadURL(u).catch(e => { if (!/ERR_ABORTED/.test(e.message)) throw new Error('não abriu ' + u + ': ' + e.message); });
    await quieta(wc); return ler();
  }
  if (nome === 'navegador_ler') return ler();
  if (nome === 'navegador_clicar') {
    const r = await wc.executeJavaScript(`(() => { const e = ${achar(a.alvo)}; if (!e) return 'não achei: ' + ${JSON.stringify(String(a.alvo))}; e.scrollIntoView({ block: 'center' }); e.click(); return 'ok'; })()`, true);
    if (r !== 'ok') return r + '. Rode navegador_ler para ver os números.';
    await quieta(wc); return 'clicado. ' + (await ler()).slice(0, 4000);
  }
  if (nome === 'navegador_digitar') {
    const r = await wc.executeJavaScript(`(() => { const e = ${achar(a.alvo)}; if (!e) return 'não achei'; e.scrollIntoView({ block: 'center' }); e.focus(); if (e.select) e.select(); else document.execCommand('selectAll'); return 'ok'; })()`, true);
    if (r !== 'ok') return 'não achei o campo ' + a.alvo + '. Rode navegador_ler para ver os números.';
    wc.insertText(String(a.texto || ''));   // real typing: page frameworks see normal input events
    if (/^(sim|s|true|1)$/i.test(String(a.enter || ''))) { for (const type of ['keyDown', 'char', 'keyUp']) wc.sendInputEvent({ type, keyCode: type === 'char' ? '\r' : 'Return' }); await quieta(wc); }
    return 'digitado.';
  }
  if (nome === 'navegador_js') { const v = await wc.executeJavaScript(String(a.codigo || ''), true); let s; try { s = JSON.stringify(v); } catch { s = String(v); } return (s === undefined ? 'undefined' : s).slice(0, 12000); }
  if (nome === 'navegador_foto') {
    let img = null;
    for (let i = 0; i < 3 && !(img && !img.isEmpty()); i++) { try { wc.invalidate(); await esperar(150 * (i + 1)); img = await Promise.race([wc.capturePage(), esperar(3000).then(() => null)]); } catch { } }
    if (!img || img.isEmpty()) throw new Error('não consegui a foto (janela do FCC minimizada ou escondida?). Use navegador_ler.');
    return { imagem: img.toPNG().toString('base64') };
  }
  throw new Error('ferramenta desconhecida ' + nome);
}
// SDK tools for one conversation; abrir(id) asks the UI to show the Prévia panel
function ferramentas(S, z, id, abrir) {
  return DEFS.map(([nome, desc, campos]) => S.tool(nome, desc, Object.fromEntries(Object.entries(campos).map(([k, d]) => [k, k === 'enter' ? z.string().optional().describe(d) : z.string().describe(d)])), async (a) => {
    try { const r = await rodar(nome, a, abrir, id); return r && r.imagem ? { content: [{ type: 'image', data: r.imagem, mimeType: 'image/png' }] } : { content: [{ type: 'text', text: String(r) }] }; }
    catch (e) { return { content: [{ type: 'text', text: 'erro: ' + e.message }], isError: true }; }
  }));
}
module.exports = { registrar, proteger, ferramentas, DEFS };
