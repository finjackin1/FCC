'use strict';
// Main-process checks (02/11): CE draft -> project, BM house rules (FCC is Claude-only since 21/11).
// Run: node abas\ferramentas\testar-principal.js  (plain node; main.js is loaded with a fake electron, nothing opens)
// Everything lives in os.tmpdir(): FCC_RAIZ and the fake home point there, fetch/spawn are stubbed, no network, no real Claude.
const path = require('path'), fs = require('fs'), os = require('os'), assert = require('assert'), Module = require('module');
const cp = require('child_process'), vm = require('vm');
const ABAS = path.join(__dirname, '..');

const TMP = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'fcc-principal-'))   // real path: the SDK keys sessions by the canonical path (8.3 names would not match);
const RAIZ = path.join(TMP, 'raiz'), CASA_DIR = path.join(RAIZ, 'perfil', 'casa'), HOME = path.join(TMP, 'home');
for (const d of [RAIZ, HOME, path.join(HOME, 'AppData', 'Roaming'), path.join(HOME, 'AppData', 'Local')]) fs.mkdirSync(d, { recursive: true });
Object.assign(process.env, { FCC_RAIZ: RAIZ, USERPROFILE: HOME, HOME, APPDATA: path.join(HOME, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(HOME, 'AppData', 'Local') });
delete process.env.CLAUDE_CONFIG_DIR;

let falhas = 0, n = 0;
const ok = async (nome, f) => { const i = ++n; try { await f(); console.log(`ok    ${i} ${nome}`); } catch (e) { falhas++; console.log(`FALHOU ${i} ${nome}: ${e.message}`); } };
const pulado = (nome, motivo) => console.log(`pulado ${++n} ${nome}: ${motivo}`);
const espera = (ms) => new Promise(r => setTimeout(r, ms));

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
global.fetch = async (url, o) => {
  const u = String(url);
  pedidosRede.push(u);
  const resp = (corpo, ok = true) => ({ ok, status: ok ? 200 : 404, text: async () => corpo, json: async () => JSON.parse(corpo || '{}') });
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
// BM: house rules in memoria\claude.md
// =====================================================================================================
async function bm() {
  pulado('BM: mudar linha de casa\\memoria\\claude.md vira regra da próxima conversa do Claude', 'regrasCasa()/lerCasa() (main.js:111-119) só são usadas dentro da abertura de conversa (main.js:583, precisa do SDK + claude.exe) e não são exportadas; exportar regrasCasa em main.js:112 (module.exports = { regrasCasa }, só quando não for Electron) permitiria testar');
}

// 25/11: rename a project by completo (folder + conversations/memory + non-negotiable order in CLAUDE.md), icon from .exe
async function ren() {
  const PJ = path.join(RAIZ, 'projects'), velho = path.join(PJ, 'Velho'), novo = path.join(PJ, 'Novo'), base = path.join(RAIZ, 'perfil', 'claude', 'projects');
  const chave = (d) => String(d).replace(/[^a-zA-Z0-9]/g, '-');
  fs.mkdirSync(path.join(velho, 'docs'), { recursive: true }); fs.writeFileSync(path.join(velho, 'CLAUDE.md'), '# Velho: teste\nregra\n');
  fs.mkdirSync(path.join(base, chave(velho)), { recursive: true }); fs.writeFileSync(path.join(base, chave(velho), 's1.jsonl'), '{}');
  await ok('REN: nome inválido e pasta repetida são recusados', async () => {
    assert.ok((await H['projeto-renomear'](null, velho, 'a/b')).erro); assert.ok((await H['projeto-renomear'](null, velho, 'Velho')).erro);
    fs.mkdirSync(path.join(PJ, 'Outro')); assert.ok((await H['projeto-renomear'](null, velho, 'Outro')).erro); });
  await ok('REN: renomeia pasta, leva conversas e grava a ordem inegociável no CLAUDE.md e na memória', async () => {
    const r = await H['projeto-renomear'](null, velho, 'Novo'); assert.strictEqual(r.dir, novo, JSON.stringify(r));
    assert.ok(!fs.existsSync(velho) && fs.existsSync(novo));
    assert.ok(fs.existsSync(path.join(base, chave(novo), 's1.jsonl')), 'conversas não foram junto');
    const t = fs.readFileSync(path.join(novo, 'CLAUDE.md'), 'utf8'); assert.ok(/INEGOCIÁVEL/.test(t) && /Nomes antigos: Velho\. Nome novo: Novo/.test(t) && t.includes('# Velho: teste'), t);
    const m = path.join(base, chave(novo), 'memory'); assert.ok(fs.existsSync(path.join(m, 'renomear-pendente.md'))); assert.ok(/renomear-pendente\.md/.test(fs.readFileSync(path.join(m, 'MEMORY.md'), 'utf8'))); });
  await ok('REN: renomear de novo antes do Claude agir junta os nomes antigos e não duplica o bloco', async () => {
    const r = await H['projeto-renomear'](null, novo, 'Terceiro'); const d = path.join(PJ, 'Terceiro'); assert.strictEqual(r.dir, d);
    const t = fs.readFileSync(path.join(d, 'CLAUDE.md'), 'utf8'); assert.ok(/Nomes antigos: Velho \| Novo\. Nome novo: Terceiro/.test(t), t); assert.strictEqual(t.split('FCC-RENOMEAR: inicio').length, 2);
    const idx = fs.readFileSync(path.join(base, chave(d), 'memory', 'MEMORY.md'), 'utf8'); assert.strictEqual(idx.split('renomear-pendente.md').length, 2, idx); });
  await ok('ICONE: lê o ícone de dentro do .exe do projeto', async () => {
    const exe = process.execPath, d = path.join(PJ, 'ComExe', 'dist'); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(exe, path.join(d, 'ComExe.exe'));
    const r = await H['icones'](null, [path.join(PJ, 'ComExe')]); assert.ok(/^data:image\//.test(r[path.join(PJ, 'ComExe')] || ''), 'sem ícone'); });
}

(async () => {
  try {
    require(path.join(ABAS, 'main.js'));   // fake electron: registers the ipcMain handlers, opens nothing
    await ok('main.js carrega sem Electron e registra as janelas de rascunho', () => { for (const k of ['rascunhos', 'rascunho', 'dados']) assert.strictEqual(typeof H[k], 'function', 'sem handler ' + k); });
    if (typeof H['rascunho'] === 'function') { await ce(); await bm(); await ren(); } else console.log('FALHOU geral: main.js não registrou os handlers');
  } catch (e) { falhas++; console.log('FALHOU geral: ' + (e.stack || e.message)); }
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo');
  process.emit('exit'); await espera(500);
  try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { console.log('(sobrou ' + TMP + ': ' + e.message + ')'); }
  process.exit(falhas ? 1 : 0);
})();
