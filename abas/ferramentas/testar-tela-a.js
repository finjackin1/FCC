'use strict';
// Real program renderer (tela\app.js + tela\v2\*.js) driven offscreen, state asserted (02/11): PRA-TESTAR items AQ, AT, AU, AX, BF, BH, BU.
// Uso: node abas\ferramentas\testar-tela-a.js   (relaunches itself in Electron; temp FCC_RAIZ with 3 fake projects, removed at the end)
// Isolation: main.js runs in-process in test mode (--roteiro => QUIETO, window at x=-4000); AI/account/Ollama IPC handlers are replaced
// by stubs that record calls, so no Claude, no Ollama, no login is ever touched. Source files are not modified.
const path = require('path'), fs = require('fs'), os = require('os'), assert = require('assert');
const ABAS = path.join(__dirname, '..');

// ---- parent (plain node): temp root, runs Electron on this file, removes root ----
if (!process.versions.electron) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-tela-a-'));
  let st = 1;
  try {
    const r = require('child_process').spawnSync(require(path.join(ABAS, 'node_modules', 'electron')), [__filename], { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 180000, env: { ...process.env, FCC_TESTE_TELA_A: raiz, FCC_RAIZ: raiz } });
    st = r.status === null ? 1 : r.status;
  } finally { for (let i = 0; i < 5; i++) { try { fs.rmSync(raiz, { recursive: true, force: true }); break; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); } } }
  process.exit(st);
}

// ---- child (Electron) ----
const RAIZ = process.env.FCC_TESTE_TELA_A;
if (!RAIZ) { console.log('FALHOU geral: rode com node (ele cria a pasta temporária)'); process.exit(1); }
process.env.FCC_RAIZ = RAIZ;
const { app, BrowserWindow, ipcMain } = require('electron');
let falhas = 0, pulos = 0;
const ok = (nome, f) => Promise.resolve().then(f).then(() => console.log('ok    ' + nome), (e) => { falhas++; console.log('FALHOU ' + nome + ': ' + e.message); });
const pulado = (n, motivo) => { pulos++; console.log(`pulado ${n}: ${motivo}`); };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

// fake projects: Estoque (name match for "estoque"), Beta (description match, listed first because it "needs testing"), Gama
const proj = (n, d, parada) => {
  const dir = path.join(RAIZ, 'projects', n); fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), `# ${n}: ${d}\r\n`, 'utf8'); fs.writeFileSync(path.join(dir, 'docs', 'PARADA.md'), parada, 'utf8');
};
proj('Estoque', 'controle de pecas e pedidos', '# PARADA\r\nParado: tudo certo.\r\nProximo passo: nada.\r\n');
proj('Beta', 'painel do estoque e das vendas', '# PARADA\r\nParado: falta testar o painel.\r\nProximo passo: testar.\r\n');
proj('Gama', 'jogo de cartas', '# PARADA\r\nParado: tudo certo.\r\nProximo passo: nada.\r\n');
// dummy claude.exe (not a real executable): any version probe by the program fails fast and never starts Claude
fs.mkdirSync(path.join(RAIZ, 'ferramentas', 'claude'), { recursive: true }); fs.writeFileSync(path.join(RAIZ, 'ferramentas', 'claude', 'claude.exe'), 'nao e um programa', 'utf8');
process.argv.push('--roteiro', 'espera:3600000');   // test mode only (QUIETO + real data); the script itself just idles

require(path.join(ABAS, 'main.js'));

// ---- stubs: nothing reaches Claude, Ollama or the account; every call is recorded ----
const CHAMADAS = [];
const REG = (canal, a) => CHAMADAS.push({ canal, a });
const CONTA = { estado: 'ok', email: 'teste@fcc.test', plano: 'Pro' };
const MODELOS = [{ n: 'qwen3:8b', gb: 5.2 }, { n: 'gemma3:4b', gb: 3.3 }];
const h = (canal, f) => { ipcMain.removeHandler(canal); ipcMain.handle(canal, (e, ...a) => { REG(canal, a); return f(...a); }); };
const on = (canal) => { ipcMain.removeAllListeners(canal); ipcMain.on(canal, (e, ...a) => REG(canal, a)); };
h('preparar', () => ({ conta: CONTA, falhou: false })); h('conta', () => CONTA); h('contas', () => []); h('lim-uso', () => null); h('icones', () => ({}));
h('ia-disco', () => ({ modelos: MODELOS, ollama: true, velo: {} }));
h('ia-estado', () => ({ local: { ligado: true, nosso: false, porta: 11434 }, pc: { placa: 'Placa de teste', vram: 12, ram: 32, livre: 100 }, lim: null, claudeVersao: '0.0.0' }));
h('ia-descarregar', () => true); h('ollama-estado', () => true);
h('chat-abrir', (o) => ({ sessao: o.sessao, comandos: [], historico: [] }));
h('chat-modelo', () => true); h('chat-esforco', () => true); h('chat-pensar', () => true);
on('chat-fechar'); on('chat-enviar'); on('ia-aquecer');

// ---- helpers over the real page ----
let win; const erros = [];
const js = (c) => win.webContents.executeJavaScript(c);
const EST = `(() => { const S = M.S; return JSON.stringify({ ativa: S.ativa, sel: S.sel, selN: (S.proj[S.sel] || {}).n, prox: S.prox, ia: S.ia, modelo: S.modelo, esf: S.esf, pensar: S.pensar, modal: S.modal, trBusca: S.trBusca || '', toast: S.toast || '',
  ini: (() => { const e = document.getElementById('inicio'); return !!e && e.style.display !== 'none' && !!e.querySelector('.ficha'); })(), abas: S.abas.map(t => ({ id: t.id, tipo: t.tipo, n: t.p ? t.p.n : null, modelo: t.modelo, esf: t.esf, pensar: t.pensar, estado: t.estado, itens: t.itens ? t.itens.length : 0, ativa: !!(t.host && t.host.classList.contains('ativa')) })) }); })()`;
const est = async () => JSON.parse(await js(EST));
const ate = async (cond, ms = 6000, msg = 'tempo esgotado') => { const t0 = Date.now(); for (;;) { let v = false; try { v = await js(cond); } catch { } if (v) return; if (Date.now() - t0 > ms) throw new Error(msg + ' (' + cond.slice(0, 90) + ')'); await espera(80); } };
const clica = async (sel) => { const r = await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`); if (!r) throw new Error('não achei ' + sel); await espera(250); };
const agir = async (a) => { await js(`M.agir(${JSON.stringify(a)})`); await espera(250); };
const idx = (n) => js(`M.P.findIndex(x => x.n === ${JSON.stringify(n)})`);
const tecla = async (k) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode: k }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode: k }); await espera(250); };
const nomesTrilho = () => js(`[...document.querySelectorAll('#trilho .lista .pj .n > div')].map(e => e.textContent)`);
const conv = (est_, n) => est_.abas.find(a => a.tipo === 'chat' && a.n === n);
async function abrirConv(n) { await agir('continuar:' + await idx(n)); await ate(`M.S.abas.some(t => t.tipo === 'chat' && t.p && t.p.n === ${JSON.stringify(n)} && t.estado === 'esperando')`, 6000, 'conversa ' + n + ' não abriu'); await espera(200); }
async function limpar() {   // close every conversation, back to project sheet, no window, no search
  for (const id of await js(`M.S.abas.filter(t => t.tipo === 'chat').map(t => t.id)`)) await js(`M.agir('fecharaba:${id}')`);
  await js(`M.S.modal = null; M.S.trBusca = ''; M.app.draw()`); await espera(300);
}
async function f4(aba) {   // F4 window on tab 0 (Claude) or 1 (No seu PC)
  await agir('modal:ia'); await agir('jaba:' + aba);
  await ate(`document.querySelector('#modal .jan')`, 4000, 'janela F4 não abriu');
}
const fechaF4 = async () => { await js(`M.S.modal = null; M.app.draw()`); await espera(200); };

async function principal() {
  const t0 = Date.now(); while (!BrowserWindow.getAllWindows().length) { if (Date.now() - t0 > 20000) throw new Error('janela não abriu'); await espera(100); }
  win = BrowserWindow.getAllWindows()[0];
  win.webContents.on('console-message', (e, ...a) => { const m = e.message || a[1], nv = e.level || a[0]; if ((nv === 'error' || nv === 3) && /Uncaught|is not a function|is not defined|Cannot read/.test(String(m))) erros.push(String(m).slice(0, 160)); });
  await ate(`window.M && M.S && M.P && M.P.length === 3 && !M.S.modal && M.S.abas.length === 1`, 30000, 'programa não ficou pronto');
  await ate(`M.D && M.D.local && M.D.local.modelo`, 8000, 'modelos locais (stub) não chegaram');
  await espera(500);

  const iE = await idx('Estoque'), iB = await idx('Beta'), iG = await idx('Gama');

  // ---- BF 1: new conversation = Claude Sonnet medium; BU 1: defaults Normal / Jeito de falar Normal (fresh state) ----
  const e0 = await est();
  await ok('1 BF começa com Claude Sonnet Médio (próxima conversa)', () => { assert.deepStrictEqual([e0.prox.ia, e0.prox.modelo, e0.prox.esf], ['claude', 'sonnet', 'medium']); });
  await f4(1);
  await ok('2 BU F4 › No seu PC: modo padrão = Normal; sem "Jeito de falar" (Ultracave removido 02/11)', async () => {
    const r = JSON.parse(await js(`JSON.stringify({ norm: !!document.querySelector('#modal [data-act="pensar:1"].on'), pens: !!document.querySelector('#modal [data-act="pensar:2"].on'), fala: [...document.querySelectorAll('#modal .j-fala .on')].map(e => e.textContent) })`));
    assert.ok(r.norm && !r.pens, 'Normal não está marcado: ' + JSON.stringify(r)); assert.deepStrictEqual(r.fala, []);
    assert.ok(!/Jeito de falar|Ultracave/.test(await js(`document.querySelector('#modal').textContent`)), 'ainda aparece Jeito de falar/Ultracave');
  });
  await fechaF4();
  await abrirConv('Gama');
  const e1 = await est();
  await ok('3 BF conversa nova abre em Sonnet / Médio', () => { const c = conv(e1, 'Gama'); assert.ok(c); assert.deepStrictEqual([c.modelo, c.esf], ['sonnet', 'medium']); });
  await limpar();

  // ---- AQ: rail search ----
  await ok('4 AQ digitar no #tr-busca filtra: nome antes da descrição', async () => {
    const o = JSON.parse(await js(`JSON.stringify(M.P.map(x => x.n))`)); assert.ok(o.indexOf('Beta') < o.indexOf('Estoque'), 'pré-condição: Beta deveria vir antes de Estoque no trilho: ' + o);
    win.webContents.focus(); await js(`document.getElementById('tr-busca').focus()`);
    for (const c of 'estoque') { win.webContents.sendInputEvent({ type: 'char', keyCode: c }); await espera(40); }
    await espera(300);
    let v = await js(`document.getElementById('tr-busca').value`);
    if (v !== 'estoque') { await js(`(() => { const b = document.getElementById('tr-busca'); b.value = 'estoque'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`); await espera(300); console.log('nota: digitação real não chegou, usei evento input'); }
    assert.deepStrictEqual(await nomesTrilho(), ['Estoque', 'Beta'], 'ordem/filtro: ' + JSON.stringify(await nomesTrilho()));
  });
  await ok('5 AQ Enter abre o primeiro resultado (Estoque): busca limpa, projeto selecionado', async () => {
    await tecla('Return'); const e = await est();
    assert.strictEqual(e.selN, 'Estoque'); assert.strictEqual(e.trBusca, ''); assert.strictEqual(await js(`document.getElementById('tr-busca').value`), ''); assert.ok(e.ini, 'folha do projeto não está na tela');
    assert.ok((await nomesTrilho()).length >= 3, 'lista completa não voltou');
  });
  await ok('6 AQ Esc limpa a busca e mostra a lista toda', async () => {
    win.webContents.focus(); await js(`document.getElementById('tr-busca').focus()`);
    for (const c of 'gama') { win.webContents.sendInputEvent({ type: 'char', keyCode: c }); await espera(40); }
    await espera(300); if (await js(`document.getElementById('tr-busca').value`) !== 'gama') { await js(`(() => { const b = document.getElementById('tr-busca'); b.value = 'gama'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`); await espera(300); }
    assert.deepStrictEqual(await nomesTrilho(), ['Gama']);
    await tecla('Escape'); const e = await est();
    assert.strictEqual(e.trBusca, ''); assert.strictEqual(await js(`document.getElementById('tr-busca').value`), ''); assert.strictEqual((await nomesTrilho()).length, 3);
  });

  // ---- AT: project with open conversation ----
  await abrirConv('Gama');
  await ok('7 AT clicar no projeto com conversa aberta mostra a folha do projeto', async () => {
    assert.strictEqual((await est()).ativa > 0, true, 'conversa não estava na frente');
    await clica(`#trilho .pj[data-proj="${iG}"]`); const e = await est();
    assert.strictEqual(e.ativa, 0); assert.ok(e.ini, 'folha não visível'); assert.ok(!conv(e, 'Gama').ativa, 'conversa continua na frente');
    assert.ok((await js(`document.getElementById('inicio').textContent`)).includes('Gama'));
  });
  await ok('8 AT clicar na caixa da folha volta para a conversa', async () => {
    await js(`document.getElementById('f-txt').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`); await espera(400);
    const e = await est(); assert.ok(e.ativa > 0, 'não voltou'); assert.ok(conv(e, 'Gama').ativa); assert.strictEqual(e.ini, false, 'folha continua visível');
  });
  await ok('9 AT trocar de projeto e voltar mostra a folha (não a conversa)', async () => {
    await clica(`#trilho .pj[data-proj="${iB}"]`); let e = await est();
    assert.strictEqual(e.selN, 'Beta'); assert.strictEqual(e.ativa, 0); assert.ok((await js(`document.getElementById('inicio').textContent`)).includes('Beta'));
    await clica(`#trilho .pj[data-proj="${iG}"]`); e = await est();
    assert.strictEqual(e.selN, 'Gama'); assert.strictEqual(e.ativa, 0); assert.ok(e.ini, 'folha não visível'); assert.ok(!conv(e, 'Gama').ativa);
  });
  await limpar();

  // ---- AU: F4 cards ----
  await ok('10 AU F4 sem conversa: cartão da IA local ativa a local; cartão do Claude volta', async () => {
    await clica(`#trilho .pj[data-proj="${iG}"]`); await f4(1);
    await clica('#modal [data-act="ia:local"]'); let e = await est();
    assert.strictEqual(e.prox.ia, 'local'); assert.strictEqual(e.ia, 'local'); assert.strictEqual(e.abas.length, 1, 'abriu conversa sem querer');
    await agir('jaba:0'); await ate(`document.querySelector('#modal [data-act="ia:claude"]')`, 3000, 'cartão do Claude não apareceu');
    await clica('#modal [data-act="ia:claude"]'); e = await est(); assert.strictEqual(e.prox.ia, 'claude'); assert.strictEqual(e.ia, 'claude');
    await fechaF4();
  });
  await abrirConv('Gama');
  await ok('11 AU F4 com conversa Claude: cartão da IA local passa a conversa para o modelo local', async () => {
    await f4(1); await clica('#modal [data-act="ia:local"]');
    await ate(`M.S.abas.some(t => t.tipo === 'chat' && t.estado === 'esperando' && t.modelo === 'qwen3:8b')`, 5000, 'conversa não passou para qwen3:8b');
    const e = await est(); assert.strictEqual(e.ia, 'local'); assert.strictEqual(conv(e, 'Gama').modelo, 'qwen3:8b'); assert.strictEqual(e.abas.filter(a => a.tipo === 'chat').length, 1);
  });
  await ok('12 AU F4: cartão de outro modelo local (usarmod) troca o modelo da conversa aberta', async () => {
    await f4(1); await clica('#modal [data-act="usarmod:gemma3:4b"]');
    await ate(`M.S.abas.some(t => t.tipo === 'chat' && t.estado === 'esperando' && t.modelo === 'gemma3:4b')`, 5000, 'conversa não passou para gemma3:4b');
    const e = await est(); assert.strictEqual(conv(e, 'Gama').modelo, 'gemma3:4b'); assert.strictEqual(e.ia, 'local');
  });
  await ok('13 AU F4: cartão do Claude devolve a conversa ao Claude Sonnet', async () => {
    await f4(0); await clica('#modal [data-act="ia:claude"]');
    await ate(`M.S.abas.some(t => t.tipo === 'chat' && t.estado === 'esperando' && t.modelo === 'sonnet')`, 5000, 'conversa não voltou ao Claude');
    const e = await est(); assert.strictEqual(e.ia, 'claude'); assert.strictEqual(conv(e, 'Gama').modelo, 'sonnet');
  });
  await agir('usarmod:qwen3:8b');   // setup: local model back to the first one (Claude conversation open: only the saved choice moves)
  await limpar();

  // ---- AX: AI per conversation ----
  await abrirConv('Gama'); await abrirConv('Beta');
  await ok('14 AX conversa B passa para local: conversa A continua no Claude', async () => {
    await f4(1); await clica('#modal [data-act="ia:local"]');
    await ate(`M.S.abas.some(t => t.tipo === 'chat' && t.p && t.p.n === 'Beta' && t.estado === 'esperando' && t.modelo === 'qwen3:8b')`, 5000, 'Beta não passou para local');
    await fechaF4(); const e = await est();
    assert.strictEqual(conv(e, 'Gama').modelo, 'sonnet', 'A mudou'); assert.strictEqual(conv(e, 'Beta').modelo, 'qwen3:8b');
  });
  await ok('15 AX botão de IA da tela segue a aba: A mostra Claude, B mostra local', async () => {
    await agir('aba:' + (await est()).abas.find(a => a.n === 'Gama').id); await espera(200); assert.strictEqual((await est()).ia, 'claude');
    await agir('aba:' + (await est()).abas.find(a => a.n === 'Beta').id); await espera(200); assert.strictEqual((await est()).ia, 'local');
  });
  await ok('16 AX trilho (conversas abertas): Gama mostra Claude Sonnet, Beta mostra "no seu PC"', async () => {
    const t = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('#trilho .cv')].map(e => e.textContent.replace(/\\s+/g, ' ').trim()))`));
    assert.ok(t.find(x => /Gama/.test(x) && /Sonnet/.test(x)), JSON.stringify(t)); assert.ok(t.find(x => /Beta/.test(x) && /no seu PC/.test(x)), JSON.stringify(t));
  });
  await limpar();

  // ---- BF 2: F4 changes only the open conversation ----
  await abrirConv('Gama'); await abrirConv('Beta');
  await ok('17 BF F4 muda modelo e pensamento só da conversa aberta (outras e próxima intactas)', async () => {
    await f4(0); await clica('#modal [data-act="pm:opus"]'); await clica('#modal [data-act="esf:high"]'); await fechaF4(); const e = await est();
    assert.deepStrictEqual([conv(e, 'Beta').modelo, conv(e, 'Beta').esf], ['opus', 'high']);
    assert.deepStrictEqual([conv(e, 'Gama').modelo, conv(e, 'Gama').esf], ['sonnet', 'medium'], 'a outra conversa mudou');
    assert.deepStrictEqual([e.prox.modelo, e.prox.esf], ['sonnet', 'medium'], 'a próxima conversa mudou');
    const bid = conv(e, 'Beta').id; assert.ok(CHAMADAS.some(c => c.canal === 'chat-modelo' && c.a[0] === bid && c.a[1] === 'opus'), 'main não foi avisado do modelo');
    assert.ok(CHAMADAS.some(c => c.canal === 'chat-esforco' && c.a[0] === bid && c.a[1] === 'high'), 'main não foi avisado do esforço');
  });
  await ok('18 BF conversa nova depois disso abre em Sonnet / Médio', async () => {
    await abrirConv('Estoque'); const e = await est(); const c = conv(e, 'Estoque'); assert.deepStrictEqual([c.modelo, c.esf], ['sonnet', 'medium']);
    assert.deepStrictEqual([conv(e, 'Beta').modelo, conv(e, 'Beta').esf], ['opus', 'high']);
  });
  await ok('19 BF F4 na folha (sem conversa) vale só para a próxima conversa, depois volta ao padrão', async () => {
    await js(`M.S.ativa = 0; M.app.draw()`); await espera(300); await clica(`#trilho .pj[data-proj="${iG}"]`);   // sheet of Gama (has a conversation open)
    assert.strictEqual((await est()).ativa, 0);
    await f4(0); await clica('#modal [data-act="pm:haiku"]'); await fechaF4(); let e = await est();
    assert.strictEqual(e.prox.modelo, 'haiku'); assert.strictEqual(conv(e, 'Beta').modelo, 'opus'); assert.strictEqual(conv(e, 'Gama').modelo, 'sonnet'); assert.strictEqual(conv(e, 'Estoque').modelo, 'sonnet');
    await limpar(); await abrirConv('Gama'); e = await est(); assert.strictEqual(conv(e, 'Gama').modelo, 'haiku', 'a próxima conversa não usou o escolhido');
    assert.strictEqual(e.prox.modelo, 'sonnet', 'o padrão não voltou');
  });
  await limpar();

  // ---- BH: chat:auto event ----
  await abrirConv('Gama'); await abrirConv('Beta');
  await ok('20 BH chat:auto muda só modelo/esforço dessa aba e não põe mensagem', async () => {
    const a = await est(), gid = conv(a, 'Gama').id, bid = conv(a, 'Beta').id;
    win.webContents.send('chat:auto', gid, { modelo: 'haiku', esf: 'low' }); await espera(500); const e = await est();
    assert.deepStrictEqual([conv(e, 'Gama').modelo, conv(e, 'Gama').esf], ['haiku', 'low']);
    assert.strictEqual(conv(e, 'Gama').itens, conv(a, 'Gama').itens, 'mensagem nova na conversa');
    assert.deepStrictEqual(conv(e, 'Beta'), conv(a, 'Beta'), 'a outra aba mudou'); assert.strictEqual(e.toast, a.toast, 'apareceu aviso');
    assert.strictEqual(conv(e, 'Gama').estado, conv(a, 'Gama').estado);
    win.webContents.send('chat:auto', 'nao-existe', { modelo: 'opus', esf: 'max' }); await espera(300); assert.deepStrictEqual((await est()).abas, e.abas, 'id desconhecido mexeu em algo');
    void bid;
  });
  await limpar();

  // ---- BU: Pensar kept + next local conversation starts with it ----
  await abrirConv('Gama');
  await ok('21 BU F4 › No seu PC › Pensar fica marcado com conversa Claude aberta (e é salvo)', async () => {
    await f4(1); await clica('#modal [data-act="pensar:2"]');
    const r = JSON.parse(await js(`JSON.stringify({ pens: !!document.querySelector('#modal [data-act="pensar:2"].on'), norm: !!document.querySelector('#modal [data-act="pensar:1"].on'), p: M.S.pensar, prox: M.S.prox.pensar })`));
    assert.ok(r.pens && !r.norm, 'Pensar não ficou marcado: ' + JSON.stringify(r)); assert.strictEqual(r.p, 2); assert.strictEqual(r.prox, 2);
    const ini = fs.readFileSync(path.join(RAIZ, 'perfil', 'dados', 'fcc.ini'), 'utf8'); assert.ok(/^modoLocal=2\s*$/m.test(ini), 'não gravou modoLocal=2 no fcc.ini');
  });
  await ok('22 BU a conversa que passa para local já começa com Pensar', async () => {
    await clica('#modal [data-act="ia:local"]'); await ate(`M.S.abas.some(t => t.tipo === 'chat' && t.estado === 'esperando' && t.modelo === 'qwen3:8b')`, 5000, 'não passou para local');
    const e = await est(); assert.strictEqual(conv(e, 'Gama').pensar, 2);
    const ab = [...CHAMADAS].reverse().find(c => c.canal === 'chat-abrir' && c.a[0].modelo === 'qwen3:8b'); assert.ok(ab && ab.a[0].pensar === 2, 'chat-abrir sem pensar=2');
  });
  await ok('23 BU próxima conversa local aberta pela folha também começa com Pensar', async () => {
    await limpar(); await clica(`#trilho .pj[data-proj="${iB}"]`); await f4(1); await clica('#modal [data-act="ia:local"]'); await fechaF4();
    await abrirConv('Beta'); const e = await est(); assert.strictEqual(conv(e, 'Beta').modelo, 'qwen3:8b'); assert.strictEqual(conv(e, 'Beta').pensar, 2);
  });
  await limpar();

  await ok('24 nenhum erro de JavaScript na tela durante o teste', () => assert.strictEqual(erros.length, 0, erros.join(' | ')));
  void iE; void pulado;
}

app.on('window-all-closed', () => { });
const guarda = setTimeout(() => { console.log('FALHOU geral: tempo total esgotado'); app.exit(1); }, 150000);
app.whenReady().then(async () => {
  try { await principal(); } catch (e) { falhas++; console.log('FALHOU geral: ' + e.message); }
  clearTimeout(guarda);
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo' + (pulos ? ` (${pulos} pulado)` : '')); app.exit(falhas ? 1 : 0);
});
