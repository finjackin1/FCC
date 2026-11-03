'use strict';
// Main-process checks (02/11): CE draft -> project, DB Ollama library list, BM house rules, BC local-AI MCP client.
// Run: node abas\ferramentas\testar-principal.js  (plain node; main.js is loaded with a fake electron, nothing opens)
// Everything lives in os.tmpdir(): FCC_RAIZ and the fake home point there, fetch/spawn are stubbed, no network, no real Ollama/Claude.
const path = require('path'), fs = require('fs'), os = require('os'), assert = require('assert'), http = require('http'), Module = require('module');
const cp = require('child_process'), vm = require('vm');
const ABAS = path.join(__dirname, '..');

const TMP = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'fcc-principal-'))   // real path: the SDK keys sessions by the canonical path (8.3 names would not match);
const RAIZ = path.join(TMP, 'raiz'), CASA_DIR = path.join(RAIZ, 'perfil', 'casa'), HOME = path.join(TMP, 'home');
for (const d of [RAIZ, HOME, path.join(HOME, 'AppData', 'Roaming'), path.join(HOME, 'AppData', 'Local')]) fs.mkdirSync(d, { recursive: true });
Object.assign(process.env, { FCC_RAIZ: RAIZ, USERPROFILE: HOME, HOME, APPDATA: path.join(HOME, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(HOME, 'AppData', 'Local') });
delete process.env.CLAUDE_CONFIG_DIR; delete process.env.OLLAMA_MODELS;

let falhas = 0, n = 0;
const ok = async (nome, f) => { const i = ++n; try { await f(); console.log(`ok    ${i} ${nome}`); } catch (e) { falhas++; console.log(`FALHOU ${i} ${nome}: ${e.message}`); } };
const pulado = (nome, motivo) => console.log(`pulado ${++n} ${nome}: ${motivo}`);
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const esperaAte = async (f, ms = 20000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await espera(50); return f(); };

// ---- fakes: electron, pty, cp.spawn/execFile, fetch ----
const H = {};   // ipcMain handlers main.js registers
const univ = () => new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : univ(), apply: () => univ(), construct: () => univ() });
const app = new Proxy({}, { get: (t, k) => k === 'requestSingleInstanceLock' ? () => true : k === 'whenReady' ? () => new Promise(() => { }) : k === 'getPath' ? () => TMP : k === 'isPackaged' ? false : () => univ() });
const electron = { app, ipcMain: { handle: (nome, f) => { H[nome] = f; }, on() { }, once() { } }, BrowserWindow: univ(), shell: univ(), dialog: univ(), Menu: univ(), Tray: univ(), screen: univ(), nativeImage: univ(), clipboard: univ(), session: univ(), Notification: univ(), powerMonitor: univ(), globalShortcut: univ() };
const carregar = Module._load;
Module._load = function (req, ...r) { if (req === 'electron') return electron; if (req === '@lydell/node-pty') return { spawn() { throw new Error('sem pty no teste'); } }; return carregar.call(this, req, ...r); };

const spawns = [];   // what main.js tried to launch (never runs)
const spawnReal = cp.spawn, execFileReal = cp.execFile;
const filho = () => { const e = new (require('events'))(); e.unref = () => { }; e.kill = () => { }; e.stdout = e.stderr = new (require('events'))(); e.pid = 0; return e; };
cp.spawn = function (cmd, args, opts) { if (!/powershell|explorer/i.test(String(cmd))) return spawnReal.call(cp, cmd, args, opts); spawns.push({ cmd, args: args || [] }); return filho(); };
cp.execFile = function (cmd, args, opts, cb) { cb = [opts, args, cb].find(x => typeof x === 'function'); if (cb) setImmediate(() => cb(null, '', '')); return filho(); };

const pedidosRede = [];   // every URL main.js asked fetch for
const fetchReal = global.fetch;
let htmlBiblioteca = '';
global.fetch = async (url, o) => {
  const u = String(url);
  if (/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u)) return fetchReal(url, o);   // fake Ollama of this test
  pedidosRede.push(u);
  const resp = (corpo, ok = true) => ({ ok, status: ok ? 200 : 404, text: async () => corpo, json: async () => JSON.parse(corpo || '{}') });
  if (u === 'https://ollama.com/library') return resp(htmlBiblioteca);
  if (/^https:\/\/ollama\.com\//.test(u)) return resp('');
  return resp('', false);   // registry etc.: no size known
};


// =====================================================================================================
// CE: draft -> project (main.js 'rascunhos' + 'rascunho' handlers)
// =====================================================================================================
async function ce() {
  const C = require(path.join(ABAS, 'caminhos.js')), P = require(path.join(ABAS, 'perfil.js'));
  const LIVRE = path.join(C.perfil(), 'chat-livre'), ID = '11111111-1111-4111-8111-111111111111', ID2 = '33333333-3333-4333-8333-333333333333';
  fs.mkdirSync(LIVRE, { recursive: true });
  P.prepararConfig();   // same as main.js cfgClaude(): junctions conta\config\projects -> perfil\claude\projects
  const sessao = (id, dir, texto) => { const d = path.join(C.perfilClaude(), 'projects', C.chaveProjeto(dir)); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, id + '.jsonl'), JSON.stringify({ type: 'user', uuid: '22222222-2222-4222-8222-22222222222' + id[0], sessionId: id, cwd: dir, timestamp: new Date().toISOString(), message: { role: 'user', content: texto } }) + '\n'); return path.join(d, id + '.jsonl'); };
  const arq = sessao(ID, LIVRE, 'Quero um app de receitas com lista de compras');
  sessao(ID2, LIVRE, 'Outra conversa solta');

  let lista = [];
  await ok('CE: lista de rascunhos acha a conversa gravada no perfil (sem CLAUDE_CONFIG_DIR no ambiente do programa)', async () => {
    lista = await H['rascunhos']();
    if (!lista.some(x => x.id === ID)) {
      // main.js never sets CLAUDE_CONFIG_DIR for its own process: the SDK listSessions looks in ~\.claude. Keep the failure, continue with the env set.
      process.env.CLAUDE_CONFIG_DIR = C.configClaude(); lista = await H['rascunhos']();
      throw new Error('listSessions do SDK não achou a conversa em perfil\\claude\\projects (main.js:1443 chama S.listSessions({ dir }) sem CLAUDE_CONFIG_DIR/env); só acha com a variável definida');
    }
  });
  if (!lista.some(x => x.id === ID)) { process.env.CLAUDE_CONFIG_DIR = C.configClaude(); lista = await H['rascunhos'](); }
  await ok('CE: rascunho listado com título da 1ª mensagem', () => { const x = lista.find(y => y.id === ID); assert.ok(x, 'rascunho não listado: ' + JSON.stringify(lista)); assert.strictEqual(x.titulo, 'Quero um app de receitas com lista de compras'); });

  const dados0 = await H['dados'](); const nomes0 = (dados0.projetos || []).map(p => p.n);
  await ok('CE: nomes inválidos ou repetidos são recusados e nada é criado', async () => {
    for (const nm of ['', 'a/b', 'a:b', '_x', '.x', 'a*b']) { const r = await H['rascunho'](null, 'projeto', ID, nm); assert.strictEqual(r.ok, false, `aceitou "${nm}"`); }
    fs.mkdirSync(path.join(C.projetos(), 'Existe'), { recursive: true });
    const r = await H['rascunho'](null, 'projeto', ID, 'Existe'); assert.strictEqual(r.ok, false); assert.ok(/Já existe/.test(r.erro));
    assert.ok(!fs.existsSync(path.join(C.projetos(), 'Existe', 'CLAUDE.md')), 'mexeu em pasta existente');
    assert.deepStrictEqual(fs.readdirSync(C.projetos()).sort(), ['Existe']);
  });
  await ok('CE: rascunho que não existe devolve erro', async () => { const r = await H['rascunho'](null, 'projeto', '99999999-9999-4999-8999-999999999999', 'Qualquer'); assert.strictEqual(r.ok, false); });

  // launcher: stub script in the TEMP root; spawn is intercepted, so nothing runs and Explorer is untouched
  const lancDir = path.join(C.raiz(), 'lancador'); fs.mkdirSync(lancDir, { recursive: true }); fs.writeFileSync(path.join(lancDir, 'fazer-lancadores.ps1'), '# stub\r\nparam([string]$Raiz = \'\')\r\n');
  spawns.length = 0;
  const NOME = 'Receitas Fáceis';
  let r;
  await ok('CE: criar projeto devolve ok com a pasta dentro de projects\\', async () => {
    r = await H['rascunho'](null, 'projeto', ID, NOME);
    assert.strictEqual(r.ok, true, r.erro); assert.strictEqual(r.n, NOME); assert.strictEqual(r.dir, path.join(C.projetos(), NOME));
  });
  const dir = path.join(C.projetos(), NOME), le = (...p) => fs.readFileSync(path.join(dir, ...p), 'utf8');
  await ok('CE: pasta tem CLAUDE.md importando PARADA e CONTEXTO', () => { const t = le('CLAUDE.md'); assert.ok(t.includes('# ' + NOME), t); assert.ok(t.includes('@docs/PARADA.md') && t.includes('@docs/CONTEXTO.md')); assert.ok(t.includes('Quero um app de receitas'), 'sem a origem'); });
  await ok('CE: docs\\PARADA.md e docs\\CONTEXTO.md criados, docs\\contexto\\ existe', () => {
    assert.ok(/^# PARADA Receitas Fáceis \d{4}-\d\d-\d\d/.test(le('docs', 'PARADA.md')), le('docs', 'PARADA.md')); assert.ok(/fase 1/i.test(le('docs', 'CONTEXTO.md')));
    assert.ok(fs.statSync(path.join(dir, 'docs', 'contexto')).isDirectory()); });
  await ok('CE: a conversa foi levada para a pasta nova (original continua)', () => {
    const novo = path.join(C.perfilClaude(), 'projects', C.chaveProjeto(dir), ID + '.jsonl');
    assert.ok(fs.existsSync(novo), 'não copiou para ' + novo); assert.strictEqual(fs.readFileSync(novo, 'utf8'), fs.readFileSync(arq, 'utf8')); });
  await ok('CE: rascunho some da lista e fcc-rascunhos.json guarda "projeto <nome>"', async () => {
    const L = await H['rascunhos'](); assert.ok(!L.some(x => x.id === ID), 'ainda listado'); assert.ok(L.some(x => x.id === ID2), 'sumiu outro rascunho');
    assert.strictEqual(JSON.parse(fs.readFileSync(C.dados('fcc-rascunhos.json'), 'utf8'))[ID].fim, 'projeto ' + NOME); });
  await ok('CE: projeto novo aparece na lista de projetos', async () => {
    const d = await H['dados'](); const ns = (d.projetos || []).map(p => p.n);
    assert.ok(ns.includes(NOME), 'lista: ' + ns.join(', ')); assert.ok(!nomes0.includes(NOME)); });
  await ok('CE: lançador chamado uma vez, só o script da raiz de teste (nada roda de verdade)', async () => {
    const l = spawns.filter(s => /powershell/i.test(s.cmd)); assert.strictEqual(l.length, 1, JSON.stringify(spawns));
    const f = l[0].args[l[0].args.indexOf('-File') + 1]; assert.strictEqual(f, path.join(C.raiz(), 'lancador', 'fazer-lancadores.ps1'));
    assert.ok(f.startsWith(TMP), 'script fora do temp: ' + f); assert.ok(!/explorer/i.test(JSON.stringify(spawns)));
    assert.strictEqual(l[0].args[l[0].args.indexOf('-Raiz') + 1], C.projetos(), 'lançador sem -Raiz projects'); });
  await ok('CE: lançador antigo (sem -Raiz) não roda: escreveria fora da pasta do FCC', async () => {
    fs.writeFileSync(path.join(lancDir, 'fazer-lancadores.ps1'), '# antigo\r\n$raiz = (Resolve-Path "$aqui\\..\\..").Path\r\n'); spawns.length = 0;
    const r2 = await H['rascunho'](null, 'projeto', ID2, 'Outro Projeto'); assert.strictEqual(r2.ok, true, r2.erro);
    assert.strictEqual(spawns.filter(s => /powershell/i.test(s.cmd)).length, 0, JSON.stringify(spawns)); });
  await ok('CE: nada foi escrito fora do temp (raiz real e FCC intactos)', () => {
    for (const real of [path.resolve(__dirname, '..', '..', NOME), path.resolve(__dirname, '..', '..', '..', NOME)]) assert.ok(!fs.existsSync(real), real); });
}

// =====================================================================================================
// DB: Ollama library list (main.js biblioteca(), through 'mod-dados' + the store screen filter "Todos")
// =====================================================================================================
const card = (id, desc, tams, caps, pulls, quando) => `<li x-test-model class="flex"><a href="/library/${id}" class="group w-full"><div class="flex flex-col"><h2><span class="group-hover:underline" x-test-search-response-title>${id}</span></h2>
  <p class="max-w-lg break-words text-neutral-800 text-md">${desc}</p></div><div class="flex flex-wrap space-x-2">${caps.map(c => `<span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">${c}</span>`).join('')}
  ${tams.map(t => `<span x-test-size class="inline-flex items-center rounded-md bg-[#ddf4ff] px-2 py-[2px] text-xs font-medium text-blue-600 sm:text-[13px]">${t}</span>`).join('')}</div>
  <p class="my-2 flex space-x-5 text-[13px] font-medium text-neutral-500"><span class="flex items-center"><span >${pulls}</span> <span class="hidden sm:flex">&nbsp;Pulls</span></span>
  <span class="flex items-center" title="${quando}"><span x-test-updated>2 months ago</span></span></p></a></li>`;
async function db() {
  const dataVelha = 'Oct 6, 2024 10:00 AM UTC';
  htmlBiblioteca = `<html><body><ul>
${card('zz-modelo-a', 'Meta&#39;s tiny &amp; fast &quot;model&quot;', ['1b', '3b'], ['tools', 'vision'], '2.1M', dataVelha)}
${card('zz-modelo-b', 'Mixture of experts', ['8x7b'], ['thinking'], '350K', dataVelha)}
${card('zz-modelo-c', 'Sem tamanho listado', [], [], '12K', dataVelha)}
${card('zz-modelo-d', 'Pequeno em milhões', ['135m', '8b'], ['tools'], '1.5B', dataVelha)}
${card('qwen3.5', 'Já está no catálogo da casa', ['4b'], ['tools'], '9M', dataVelha)}
</ul><a href="/blog/algo">fora da lista</a></body></html>`;
  pedidosRede.length = 0;
  const d = await H['mod-dados']();
  const cat = d.cat || [], por = (id) => cat.find(x => x.id === id);
  await ok('DB: só ollama.com/library foi pedido (nenhuma rede real) e a lista tem as entradas novas', () => {
    assert.ok(pedidosRede.includes('https://ollama.com/library'), 'não pediu /library: ' + pedidosRede.slice(0, 5));
    assert.ok(pedidosRede.every(u => /^https:\/\/(ollama\.com|registry\.ollama\.ai)\//.test(u)), pedidosRede.join(' '));
    for (const id of ['zz-modelo-a', 'zz-modelo-b', 'zz-modelo-c', 'zz-modelo-d']) assert.ok(por(id), 'falta ' + id + '; tem ' + cat.map(x => x.id).slice(-6)); });
  await ok('DB: entrada sem repetir o catálogo da casa (qwen3.5 só uma vez, sem tipo "mais")', () => {
    assert.strictEqual(cat.filter(x => x.id === 'qwen3.5').length, 1); assert.notStrictEqual(por('qwen3.5').tipo, 'mais'); });
  await ok('DB: nome, descrição (entidades HTML), origem, tipo e baixados', () => {
    const a = por('zz-modelo-a'); assert.strictEqual(a.nome, 'zz-modelo-a'); assert.strictEqual(a.desc, 'Meta\'s tiny & fast "model"'); assert.strictEqual(a.de, 'Ollama'); assert.strictEqual(a.tipo, 'mais');
    assert.strictEqual(a.baixados, '2,1 mi'); assert.strictEqual(por('zz-modelo-b').baixados, '350 mil'); assert.strictEqual(por('zz-modelo-d').baixados, '1,5 bi'); });
  await ok('DB: capacidades (tools=f, vision=v, thinking=p) e data relativa', () => {
    assert.strictEqual(por('zz-modelo-a').caps, 'fv'); assert.strictEqual(por('zz-modelo-b').caps, 'p'); assert.strictEqual(por('zz-modelo-c').caps, '');
    assert.ok(/^há \d+ anos?$/.test(por('zz-modelo-a').atualizado), 'atualizado: ' + por('zz-modelo-a').atualizado); });
  await ok('DB: tamanhos aproximados por variante (1b≈0,9 GB; 3b≈2,2; 8x7b≈35; 135m≈0,4; sem tamanho = latest, 0)', () => {
    const gb = (id) => por(id).v.map(v => v.gb), ts = (id) => por(id).v.map(v => v.t);
    assert.deepStrictEqual(ts('zz-modelo-a'), ['1b', '3b']); assert.deepStrictEqual(gb('zz-modelo-a'), [0.9, 2.2]);
    assert.deepStrictEqual(gb('zz-modelo-b'), [35]); assert.deepStrictEqual(gb('zz-modelo-d'), [0.4, 5.3]);
    assert.deepStrictEqual(ts('zz-modelo-c'), ['latest']); assert.deepStrictEqual(gb('zz-modelo-c'), [0]);
    assert.strictEqual(por('zz-modelo-a').v[0].tag, 'zz-modelo-a:1b'); });
  await ok('DB: segunda abertura da loja usa o cache de 1 dia (não busca /library de novo)', async () => {
    pedidosRede.length = 0; await H['mod-dados'](); assert.ok(!pedidosRede.includes('https://ollama.com/library'), pedidosRede.join(' ')); });

  // store screen (tela\v2\loja.js, same code as the app) with the filter "Todos": library entries are merged with the curated list
  await ok('DB: filtro "Todos" mostra curados + biblioteca; "Populares" só os curados', () => {
    const M = { S: { op: {}, jAba: 0 }, D: { loja: { PC: { placa: 'Teste', vram: 8, ram: 16, disco: 200 }, CAT: cat, INST: {}, FILA: [], BUSCA: [], ACHADOS: [], estado: 'ok' } },
      ico: () => '', esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), draw() { }, agir() { }, salvar() { }, curto: (x) => x };
    const ctx = vm.createContext({ M, window: {}, document: { addEventListener() { }, querySelector: () => null, querySelectorAll: () => [] }, console, setTimeout, localStorage: { getItem: () => null, setItem() { } } });
    vm.runInContext(fs.readFileSync(path.join(ABAS, 'tela', 'v2', 'loja.js'), 'utf8'), ctx);
    const html = (tipo) => { M.S.L = { tipo, tam: 'todos', caps: '', sel: null, vi: null, busca: '', fontes: ['ollama'] }; return M.lojaJanela.html(); };
    const todos = html(''), pop = html('pop');
    const quantos = (h) => +(h.match(/Todos <small>(\d+) modelos/) || h.match(/Populares <small>(\d+) modelos/) || [])[1];
    for (const id of ['zz-modelo-a', 'zz-modelo-b', 'zz-modelo-c', 'zz-modelo-d']) { assert.ok(todos.includes('>' + id + '<') || todos.includes(id), 'Todos sem ' + id); assert.ok(!pop.includes('>' + id + '<'), 'Populares mostra ' + id); }
    assert.ok(todos.includes('Qwen3.5'), 'Todos sem curado'); assert.strictEqual(quantos(todos), cat.length, `Todos: ${quantos(todos)} de ${cat.length}`);
    assert.ok(quantos(pop) < cat.length); });
}

// =====================================================================================================
// BM: house rules in memoria\claude.md
// =====================================================================================================
async function bm() {
  pulado('BM: mudar linha de casa\\memoria\\claude.md vira regra da próxima conversa do Claude', 'regrasCasa()/lerCasa() (main.js:111-119) só são usadas dentro da abertura de conversa (main.js:583, precisa do SDK + claude.exe) e não são exportadas; exportar regrasCasa em main.js:112 (module.exports = { regrasCasa }, só quando não for Electron) permitiria testar');
}

// =====================================================================================================
// BC: local AI MCP client + BM analog for the local AI (memoria\local.md is read again at every request)
// =====================================================================================================
async function bc() {
  const MCPD = path.join(TMP, 'mcp'), CASA_L = path.join(TMP, 'casa-local'), PROJ = path.join(TMP, 'proj-local'), LOG = path.join(TMP, 'mcp-log.txt');
  for (const d of [MCPD, PROJ, path.join(CASA_L, 'memoria')]) fs.mkdirSync(d, { recursive: true });
  const servidor = path.join(TMP, 'servidor-mcp-falso.js');
  fs.writeFileSync(servidor, `const fs = require('fs'), LOG = ${JSON.stringify(LOG)};
let resto = ''; process.stdin.on('data', d => { const ls = (resto + d).split('\\n'); resto = ls.pop(); for (const l of ls) { if (!l.trim()) continue; const m = JSON.parse(l); fs.appendFileSync(LOG, m.method + ' ' + JSON.stringify((m.params || {}).arguments || '') + '\\n'); if (m.id == null) continue;
  const r = (x) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: x }) + '\\n');
  if (m.method === 'initialize') r({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'falso', version: '1' } });
  else if (m.method === 'tools/list') r({ tools: [{ name: 'gravar_nota', description: 'Grava uma nota', inputSchema: { type: 'object', properties: { texto: { type: 'string' } } } }, { name: 'list_notas', description: 'Lista notas', inputSchema: { type: 'object', properties: {} } }] });
  else if (m.method === 'tools/call') r({ content: [{ type: 'text', text: m.params.name === 'list_notas' ? 'NOTAS: nenhuma' : 'NOTA-GRAVADA:' + m.params.arguments.texto }] });
  else r({}); } });
`);
  fs.writeFileSync(path.join(MCPD, 'mcp.json'), JSON.stringify({ mcpServers: { falso: { command: process.execPath, args: [servidor] } } }));
  const logMcp = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch { return ''; } };

  // fake Ollama (same shape as testar-local-trava.js)
  let roteiro = [], pedidos = [];
  const linha = (o) => JSON.stringify(o) + '\n', txt = (t) => linha({ message: { role: 'assistant', content: t }, done: false });
  const fim = () => linha({ message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 10, eval_count: 5, eval_duration: 1e8 });
  const chamada = (name, args) => linha({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name, arguments: args } }] }, done: false });
  const srv = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { pedidos.push(JSON.parse(b)); const passo = roteiro.shift() || [txt('ok'), fim()]; s.writeHead(200, { 'Content-Type': 'application/x-ndjson' }); for (const p of passo) s.write(p); s.end(); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));

  const motor = require(path.join(ABAS, 'local.js'))({ OP: { ctxSimples: '8192', perm: 'pedir' }, OLLAMA_URL: 'http://127.0.0.1:' + srv.address().port, PASTA_CONVERSAS: path.join(TMP, 'conversas-locais'), CASA: CASA_L,
    PENSAR: new Map(), logApp: () => { }, vel: () => { }, apelidos: () => [], vigia: [3, 2, 10], mcpPasta: () => MCPD });
  let permissoes = [], decisao = () => ({ behavior: 'allow' });
  const fila = [], acordar = []; const mandar = (t) => { fila.push({ message: { content: t } }); const a = acordar.shift(); if (a) a(); };
  const prompt = { async *[Symbol.asyncIterator]() { while (true) { if (!fila.length) await new Promise(r => acordar.push(r)); yield fila.shift(); } } };
  const it = motor.query({ prompt, options: { sessao: 'mcp', cwd: PROJ, aba: 1, model: 'falso', canUseTool: async (nome, input) => { permissoes.push({ nome, input, logAntes: logMcp() }); return decisao(nome, input); } } });
  let resultado = null; (async () => { try { for await (const m of it) if (m.type === 'result') resultado = m; } catch { } })();
  const pedido = async (t) => { resultado = null; permissoes = []; const i0 = pedidos.length; mandar(t); await esperaAte(() => resultado, 30000); return { r: resultado, enviados: pedidos.slice(i0) }; };
  const tools = (c) => c.messages.filter(m => m.role === 'tool').map(m => m.content);

  try {
    // 1. perm not auto: asks BEFORE touching the server; after allow the result reaches the model
    roteiro = [[chamada('MCP', { servidor: 'falso', ferramenta: 'gravar_nota', args: { texto: 'comprar leite' } }), fim()], [txt('Gravei a nota.'), fim()]];
    let x = await pedido('anote: comprar leite');
    await ok('BC: perm "pedir": ferramenta MCP que grava gera pedido de permissão (com servidor, ferramenta e args)', () => {
      assert.strictEqual(permissoes.length, 1, 'pedidos de permissão: ' + permissoes.length); assert.strictEqual(permissoes[0].nome, 'MCP');
      assert.strictEqual(permissoes[0].input.servidor, 'falso'); assert.strictEqual(permissoes[0].input.ferramenta, 'gravar_nota'); assert.strictEqual(permissoes[0].input.args.texto, 'comprar leite'); });
    await ok('BC: nada foi chamado no servidor antes da resposta da permissão', () => assert.ok(!/tools\/call/.test(permissoes[0].logAntes), 'log: ' + permissoes[0].logAntes));
    await ok('BC: liberado: servidor recebeu tools/call e o resultado chegou ao modelo', () => {
      assert.ok(/tools\/call \{"texto":"comprar leite"\}/.test(logMcp()), 'log: ' + logMcp());
      assert.strictEqual(x.enviados.length, 2); assert.ok(tools(x.enviados[1]).some(t => t === 'NOTA-GRAVADA:comprar leite'), JSON.stringify(tools(x.enviados[1])));
      assert.strictEqual(x.r && x.r.result, 'Gravei a nota.'); });

    // 2. denied: server never gets the call, model is told it was NOT done
    decisao = () => ({ behavior: 'deny', message: 'não quero' });
    roteiro = [[chamada('MCP', { servidor: 'falso', ferramenta: 'gravar_nota', args: { texto: 'segredo' } }), fim()], [txt('Ok, não gravei.'), fim()]];
    x = await pedido('anote: segredo');
    await ok('BC: negado: pediu permissão, servidor não recebe a chamada, modelo ouve "NÃO FEITO"', () => {
      assert.strictEqual(permissoes.length, 1); assert.ok(!/segredo/.test(logMcp()), 'servidor recebeu: ' + logMcp());
      assert.ok(tools(x.enviados[1]).some(t => /^NÃO FEITO: o usuário negou/.test(t)), JSON.stringify(tools(x.enviados[1]))); });

    // 3. read-only tool name (list_*) and listing run without asking
    decisao = () => ({ behavior: 'allow' });
    roteiro = [[chamada('MCP', { servidor: 'falso', ferramenta: 'list_notas', args: {} }), fim()], [txt('Nenhuma nota.'), fim()]];
    x = await pedido('quais notas tenho?');
    await ok('BC: ferramenta só de leitura (list_*) roda sem pedir permissão e o resultado chega ao modelo', () => {
      assert.strictEqual(permissoes.length, 0, 'pediu permissão: ' + JSON.stringify(permissoes.map(p => p.input))); assert.ok(tools(x.enviados[1]).includes('NOTAS: nenhuma'), JSON.stringify(tools(x.enviados[1]))); });

    // 4. perm "auto" does not skip the question for MCP tools that change things (auto covers Write/Edit/Rodar only)
    roteiro = [[chamada('MCP', { servidor: 'falso', ferramenta: 'gravar_nota', args: { texto: 'terceira' } }), fim()], [txt('Feito.'), fim()]];
    x = await pedido('anote: terceira');
    await ok('BC: perm "pedir" de novo: segunda gravação também pergunta (permissão não vira "sempre" sozinha)', () => assert.strictEqual(permissoes.length, 1));

    // 5. BM analog for the local AI: memoria\local.md is re-read at every request
    fs.writeFileSync(path.join(CASA_L, 'memoria', 'local.md'), 'REGRA-DA-CASA-UM: responda sempre com "ahoy".\n');
    roteiro = [[txt('ahoy'), fim()]]; x = await pedido('oi');
    const sis = (c) => c.messages[0].role === 'system' ? c.messages[0].content : '';
    const s1 = sis(x.enviados[0]);
    fs.writeFileSync(path.join(CASA_L, 'memoria', 'local.md'), 'REGRA-DA-CASA-DOIS: responda sempre com "hello".\n');
    roteiro = [[txt('hello'), fim()]]; x = await pedido('oi de novo');
    const s2 = sis(x.enviados[0]);
    await ok('BM: (IA local) linha mudada em casa\\memoria\\local.md vale no pedido seguinte da mesma conversa', () => {
      assert.ok(s1.includes('REGRA-DA-CASA-UM'), 'sistema 1: ' + s1.slice(0, 200)); assert.ok(s2.includes('REGRA-DA-CASA-DOIS') && !s2.includes('REGRA-DA-CASA-UM'), 'sistema 2: ' + s2.slice(0, 200)); });
  } finally { try { it.close(); } catch { } srv.close(); }
}

(async () => {
  try {
    require(path.join(ABAS, 'main.js'));   // fake electron: registers the ipcMain handlers, opens nothing
    await ok('main.js carrega sem Electron e registra as janelas de rascunho e modelos', () => { for (const k of ['rascunhos', 'rascunho', 'mod-dados', 'dados']) assert.strictEqual(typeof H[k], 'function', 'sem handler ' + k); });
    if (typeof H['rascunho'] === 'function') { await ce(); await db(); await bm(); } else console.log('FALHOU geral: main.js não registrou os handlers');
    await bc();
  } catch (e) { falhas++; console.log('FALHOU geral: ' + (e.stack || e.message)); }
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo');
  process.emit('exit'); await espera(500);   // local.js kills its MCP servers on exit; then the temp folder can go
  try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { console.log('(sobrou ' + TMP + ': ' + e.message + ')'); }
  process.exit(falhas ? 1 : 0);
})();
