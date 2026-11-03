'use strict';
// Screen tests, part B (02/11): drives the REAL renderer (tela\app.js + tela\v2\*.js) in the real main.js, offscreen.
//   BE start-screen text box · BO "/" menu · AY tooltips inside window · BT click doesn't redraw unrelated DOM · BR streaming doesn't touch old messages/box
// Uso: node ferramentas\testar-tela-b.js   (relaunches itself in Electron; fake root in os.tmpdir(), removed at end)
// Isolation: FCC_RAIZ = temp root with 3 fake projects; main.js in --roteiro mode (QUIETO: nothing saved, no Explorer);
// USERPROFILE/PATH stripped so acharClaude() finds nothing; IPC that would touch Claude/Ollama is replaced by stubs; no Claude/Ollama is ever started.
const path = require('path'), fs = require('fs'), os = require('os'), assert = require('assert');
const ABAS = path.join(__dirname, '..');

if (!process.versions.electron) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-telab-'));
  let st = 1;
  try {
    const r = require('child_process').spawnSync(require(path.join(ABAS, 'node_modules', 'electron')), [__filename],
      { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 180000, env: { ...process.env, FCC_TESTE_RAIZ: raiz } });
    st = r.status === null ? 1 : r.status;
  } finally { try { fs.rmSync(raiz, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { } }
  process.exit(st);
}

// ---- fake root + environment (before main.js is loaded) ----
const raiz = process.env.FCC_TESTE_RAIZ;
for (const n of ['Alfa', 'Beta', 'Gama']) {
  const d = path.join(raiz, 'projects', n); fs.mkdirSync(path.join(d, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), `# ${n}: projeto de teste\n`); fs.writeFileSync(path.join(d, 'docs', 'PARADA.md'), `# PARADA ${n}\nParado: x\n`);
}
fs.mkdirSync(path.join(raiz, 'perfil', 'dados'), { recursive: true }); fs.writeFileSync(path.join(raiz, 'perfil', 'dados', 'fcc.ini'), 'inicio=claude\r\n');
fs.mkdirSync(path.join(raiz, 'home'), { recursive: true });
process.env.FCC_RAIZ = raiz; process.env.USERPROFILE = path.join(raiz, 'home'); process.env.HOME = path.join(raiz, 'home');
process.env.PATH = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');   // no claude.exe / ollama.exe reachable
process.argv.push('--roteiro', 'espera:3600000');   // test mode of main.js (QUIETO); script never runs steps, we drive the window ourselves

const { app, BrowserWindow, ipcMain } = require('electron');
require(path.join(ABAS, 'main.js'));
const trocar = (canal, fn) => { try { ipcMain.removeHandler(canal); } catch { } ipcMain.handle(canal, fn); };
const CONTA = { estado: 'ok', email: 'teste@teste.t', plano: 'pro' };
const COMANDOS = [{ n: 'rea', d: 'comando de teste' }, { n: 'review', d: 'outro' }, { n: 'init', d: 'outro' }];
const HISTORICO = [{ type: 'user', texto: 'pergunta antiga um', uuid: 'u1' }, { type: 'assistant', id: 'h1', uuid: 'u2', content: [{ type: 'text', text: 'resposta antiga um' }] },
  { type: 'user', texto: 'pergunta antiga dois', uuid: 'u3' }, { type: 'assistant', id: 'h2', uuid: 'u4', content: [{ type: 'text', text: 'resposta antiga dois' }] }];
const ENVIADOS = [];   // what the screen sent to "Claude": [id, text]
trocar('conta', () => CONTA); trocar('preparar', () => ({ conta: CONTA, falhou: false })); trocar('ia-lista', () => ({ erro: 'nenhum modelo baixado no Ollama', modelos: [] }));
trocar('contas', () => []); trocar('lim-uso', () => null); trocar('ollama-estado', () => false); trocar('chat-titulo', () => '');
trocar('chat-abrir', (e, o) => ({ sessao: o.sessao || 's-teste', comandos: COMANDOS, historico: HISTORICO }));
ipcMain.removeAllListeners('chat-enviar'); ipcMain.on('chat-enviar', (e, id, txt) => ENVIADOS.push([id, txt]));
ipcMain.removeAllListeners('chat-fechar');

let falhas = 0, puladas = 0;
const ok = (nome, f) => Promise.resolve().then(f).then(() => console.log('ok    ' + nome), (e) => { falhas++; console.log('FALHOU ' + nome + ': ' + e.message); });
const pula = (nome, motivo) => { puladas++; console.log(`pulado ${nome}: ${motivo}`); };
const espera = (ms) => new Promise(r => setTimeout(r, ms));
let w, wc;
const js = (c) => wc.executeJavaScript(c);

// ---- input like a hand (sendInputEvent, same as main.js rodarRoteiro) ----
const CODIGO = { Enter: 'Return', Esc: 'Escape' };
async function tecla(k) {
  const kc = CODIGO[k] || k;
  wc.sendInputEvent({ type: 'keyDown', keyCode: kc }); if (k.length === 1) wc.sendInputEvent({ type: 'char', keyCode: k }); wc.sendInputEvent({ type: 'keyUp', keyCode: kc }); await espera(120);
}
async function digita(txt) { for (const c of txt) await tecla(c); }
async function centro(sel) { return js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()`); }
async function mouseEm(x, y) { wc.sendInputEvent({ type: 'mouseMove', x, y }); await espera(60); }
async function clica(sel) {
  const r = await centro(sel); if (!r) throw new Error('não achei ' + sel);
  await mouseEm(r.x, r.y); wc.sendInputEvent({ type: 'mouseDown', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await espera(80);
  wc.sendInputEvent({ type: 'mouseUp', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await espera(300);
}
const foco = (sel) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (e) e.focus(); return !!e; })()`);
const caixaVal = () => js(`(() => { const t = M.aba(); return t && t.el ? t.el.txt.value : null; })()`);
// writes a draft in the conversation box the way typing does (value + input event)
const rascunho = (v) => js(`(() => { const ta = M.aba().el.txt; ta.focus(); ta.value = ${JSON.stringify(v)}; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.setSelectionRange(ta.value.length, ta.value.length); })()`);
const volta = async () => { await js(`M.S.modal = null; M.S.menu = null; M.S.pop = null; M.draw()`); await espera(150); };

// ---- 1. BE: start screen box ----
async function inicioBE() {
  await js(`M.app.draw()`); await espera(300);
  const antes = await js(`M.S.sel`);
  await ok('BE1 caixa do início existe, projeto escolhido é o 1º', async () => { assert.ok(await js(`!!document.getElementById('f-txt')`), 'sem #f-txt'); assert.strictEqual(antes, 0); });
  await foco('#f-txt'); await espera(100);
  await ok('BE2 foco está na caixa', async () => assert.strictEqual(await js(`document.activeElement && document.activeElement.id`), 'f-txt'));
  await tecla('a'); await tecla('p'); await espera(250);
  const r = JSON.parse(await js(`JSON.stringify({ v: document.getElementById('f-txt').value, sel: M.S.sel, nome: M.p() && M.p().n, foco: document.activeElement.id })`));
  await ok('BE3 "a" e "p" vão para a caixa', () => assert.strictEqual(r.v, 'ap', 'caixa = ' + JSON.stringify(r.v)));
  await ok('BE4 projeto escolhido não muda (Alfa tem letra A)', () => { assert.strictEqual(r.sel, antes, 'sel mudou para ' + r.sel + ' (' + r.nome + ')'); assert.strictEqual(r.foco, 'f-txt'); });
  await tecla('Esc'); await espera(150);
  await ok('BE5 Esc sai da caixa; o texto fica; ainda sem mudar de projeto', async () => {
    const x = JSON.parse(await js(`JSON.stringify({ foco: document.activeElement && document.activeElement.id, v: document.getElementById('f-txt').value, sel: M.S.sel })`));
    assert.notStrictEqual(x.foco, 'f-txt', 'ainda na caixa'); assert.strictEqual(x.v, 'ap'); assert.strictEqual(x.sel, antes);
  });
  await tecla('a'); await espera(200);
  await ok('BE6 fora da caixa, "a" volta a escolher o projeto (controle)', async () => { const n = await js(`M.p() && M.p().n`); assert.strictEqual(n, 'Alfa'); });
  await js(`(() => { const t = document.getElementById('f-txt'); t.value = ''; M.S.fichaTx = {}; M.S.sel = 0; M.draw(); })()`); await espera(200);
}

// ---- 2. AY: tooltips stay inside window ----
async function dicasAY(estado) {
  const alvos = JSON.parse(await js(`JSON.stringify((() => { const W = innerWidth, H = innerHeight, out = [];
    for (const e of document.querySelectorAll('[data-dica],[title],[data-tit],[data-act]')) { const b = e.getBoundingClientRect(); if (b.width < 4 || b.height < 4 || b.right > W || b.bottom > H || b.left < 0 || b.top < 0) continue;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const dir = W - b.right < 90, baixo = H - b.bottom < 90; if (!dir && !baixo) continue;
      out.push({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), dir, baixo, a: (e.dataset.act || e.id || e.className || e.tagName).toString().slice(0, 30), dica: !!(e.dataset.dica || e.title || e.dataset.tit || (window.dicaDe && window.dicaDe(e.dataset.act || ''))) }); }
    return out; })())`));
  const vistos = new Set(), lista = [];
  for (const a of alvos) { const k = a.x + ',' + a.y; if (vistos.has(k)) continue; vistos.add(k); lista.push(a); }
  lista.sort((a, b) => (b.dir && b.baixo) - (a.dir && a.baixo) || b.x - a.x || b.y - a.y);
  const fora = [], testados = []; const escolha = [...lista.filter(a => a.dir && a.baixo), ...lista.filter(a => a.dir && !a.baixo).slice(0, 7), ...lista.filter(a => !a.dir && a.baixo).slice(0, 7)];
  for (const a of escolha.slice(0, 16)) {
    await mouseEm(5, 405); await espera(80);
    await mouseEm(a.x, a.y); await espera(800);
    const r = JSON.parse(await js(`JSON.stringify((() => { const d = document.querySelector('.dica'); if (!d) return null; const b = d.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, W: innerWidth, H: innerHeight }; })())`));
    if (!r) continue;   // element without tooltip text
    testados.push(a.a);
    if (r.l < 0 || r.t < 0 || r.r > r.W || r.b > r.H) fora.push(`${a.a} (${a.x},${a.y}) caixa ${Math.round(r.l)},${Math.round(r.t)}–${Math.round(r.r)},${Math.round(r.b)} janela ${r.W}x${r.H}`);
  }
  await mouseEm(5, 405); await espera(100);
  await ok(`AY ${estado}: ${testados.length} dicas perto das bordas direita/baixo, todas inteiras dentro da janela`, () => { assert.ok(testados.length >= 3, 'poucas dicas testadas: ' + testados.length + ' de ' + escolha.length + ' alvos'); assert.deepStrictEqual(fora, []); });
}

// ---- 3. BT: clicks don't rebuild unrelated DOM ----
// tags every element of the page parts; later counts how many are still the same node
const MARCA = `(() => { window.__marca = window.__marca || 0; const n = ++window.__marca; const r = {};
  for (const [k, s] of Object.entries({ topo: '#topo', trilho: '#trilho', conversas: '#chats', ficha: '#inicio' })) { const e = document.querySelector(s); let c = 0; if (e) for (const x of e.querySelectorAll('*')) { x.__m = n; c++; } r[k] = c; }
  window.__html = {}; for (const [k, s] of Object.entries({ topo: '#topo', trilho: '#trilho', ficha: '#inicio' })) window.__html[k] = document.querySelector(s).innerHTML; document.querySelector('#trilho').__raiz = n; return JSON.stringify(r); })()`;
const CONFERE = `(() => { const n = window.__marca; const r = {};
  for (const [k, s] of Object.entries({ topo: '#topo', trilho: '#trilho', conversas: '#chats', ficha: '#inicio' })) { const e = document.querySelector(s); let c = 0, t = 0; if (e) for (const x of e.querySelectorAll('*')) { t++; if (x.__m === n) c++; } r[k] = [c, t]; }
  r.mudou = {}; for (const k of ['topo', 'trilho', 'ficha']) r.mudou[k] = document.querySelector({ topo: '#topo', trilho: '#trilho', ficha: '#inicio' }[k]).innerHTML !== window.__html[k];
  return JSON.stringify(r); })()`;
async function cliqueBT(nome, sel, regras) {
  const ant = JSON.parse(await js(MARCA));
  await js(`window.__anim0 = document.getAnimations().length`);
  await clica(sel); await espera(200);
  const dep = JSON.parse(await js(CONFERE));
  // animations running right now that are finite (entrance animations) and where they are
  const anim = JSON.parse(await js(`JSON.stringify(document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming(); return t && t.iterations !== Infinity && a.playState === 'running' && a.effect.target; }).map(a => { const e = a.effect.target; const p = e.closest ? (e.closest('#topo') ? 'topo' : e.closest('#trilho') ? 'trilho' : e.closest('#chats') ? 'conversas' : e.closest('#inicio') ? 'ficha' : e.closest('#modal') ? 'modal' : 'outro') : 'outro'; return p + ':' + (a.animationName || a.transitionProperty || '?'); }))`));
  return { nome, ant, dep, anim, regras };
}
// 'tudo' = every node survives; 'sePouco' = every node survives unless the part's HTML really changed (selection class etc.)
function confere(res, parte, quer) {
  const [c, t] = res.dep[parte]; if (quer === 'sePouco' && res.dep.mudou[parte]) return;
  assert.strictEqual(c, t, `${parte}: só ${c} de ${t} nós seguiram os mesmos` + (quer === 'sePouco' ? ' com o HTML igual' : ''));
}
async function telaBT() {
  // two conversations open (stubs answer chat-abrir); then clicks on project / conversation / buttons
  await volta(); await js(`M.S.sel = 0; M.S.ativa = 0; M.draw()`); await espera(200);
  const nomes = await js(`JSON.stringify(M.P.map(p => p.n))`); const iAlfa = JSON.parse(nomes).indexOf('Alfa'), iBeta = JSON.parse(nomes).indexOf('Beta');
  await js(`M.agir('nova:${iAlfa}')`); await espera(700);
  await js(`M.S.ativa = 0; M.app.draw()`); await espera(300);
  await js(`M.agir('sel:${iBeta}')`); await espera(300);
  await js(`M.agir('nova:${iBeta}')`); await espera(700);
  const abas = JSON.parse(await js(`JSON.stringify(M.S.abas.map(a => a.id + ':' + a.tipo + ':' + (a.p ? a.p.n : '')))`));
  await ok('BT0 duas conversas abertas (Alfa e Beta) para o teste', () => assert.strictEqual(abas.length, 3, JSON.stringify(abas)));
  if (abas.length !== 3) return;
  await js(`M.S.ativa = 0; M.draw()`); await espera(1200);   // settle entrance animations
  const idAlfa = abas[1].split(':')[0], idBeta = abas[2].split(':')[0];
  const rel = [];
  // 0) click the project already chosen: nothing may be redone, not even the sheet
  const jaSel = await js(`document.querySelector('#trilho .pj.sel').dataset.act`);
  rel.push(await cliqueBT('clicar no projeto já escolhido', `#trilho .pj[data-act="${jaSel}"]`)); rel[0].tudoIgual = true;
  await espera(900);
  // a) click another project in the rail (welcome sheet changes, rest stays)
  const proj = await js(`(() => { const e = document.querySelector('#trilho .pj:not(.sel)'); return e ? e.dataset.act : null; })()`);
  rel.push(await cliqueBT('clicar noutro projeto', `#trilho .pj[data-act="${proj}"]`));
  await espera(900);
  // b) click an open conversation in the rail (goes to its tab)
  rel.push(await cliqueBT('clicar numa conversa da barra', `#trilho .cv[data-act="aba:${idAlfa}"]`));
  await espera(900);
  // c) click another conversation
  rel.push(await cliqueBT('clicar noutra conversa da barra', `#trilho .cv[data-act="aba:${idBeta}"]`));
  await espera(900);
  // d) back to project (welcome), then buttons: expand arrow, rail search focus
  rel.push(await cliqueBT('clicar num projeto (volta à ficha)', `#trilho .pj[data-act="${proj}"]`));
  await espera(900);
  const chev = await js(`(() => { const e = document.querySelector('#trilho .pj .chev2'); return !!e; })()`);
  if (chev) { rel.push(await cliqueBT('abrir a seta de conversas', `#trilho .pj .chev2`)); await espera(900); }
  console.log('      (BT medido: ' + rel.map(r => `${r.nome} → conversas ${r.dep.conversas.join('/')}, topo ${r.dep.topo.join('/')}, barra ${r.dep.trilho.join('/')}, ficha ${r.dep.ficha.join('/')}; animando: ${r.anim.join(',') || 'nada'}`).join(' | ') + ')');
  for (const r of rel) {
    await ok(`BT ${r.nome}: conversas abertas não são refeitas`, () => confere(r, 'conversas', 'tudo'));
    await ok(`BT ${r.nome}: barra de cima só é refeita se o conteúdo mudou`, () => confere(r, 'topo', 'sePouco'));
    await ok(`BT ${r.nome}: barra lateral só é refeita se o conteúdo mudou`, () => confere(r, 'trilho', 'sePouco'));
    if (r.tudoIgual) await ok(`BT ${r.nome}: nem a ficha é refeita`, () => confere(r, 'ficha', 'sePouco'));
    await ok(`BT ${r.nome}: nenhuma animação de entrada fora da ficha / lista aberta`, () => {
      const indevidas = r.anim.filter(a => !/^ficha:/.test(a) && !/^(trilho):(abre|aparece)$/.test(a) && !/^modal:/.test(a) && !/dica-in/.test(a));   // tooltip fade-in is the mouse hovering, not a redraw
      assert.deepStrictEqual(indevidas, [], 'animando: ' + indevidas.join(', '));
    });
  }
  await ok('BT a barra lateral: o contêiner e a lista (rolagem) seguem os mesmos nós em cada clique', async () => {
    // rail may repaint its rows when selection changes (class .sel), but the container and search box must be the same nodes
    const r = JSON.parse(await js(`JSON.stringify({ raiz: document.querySelector('#trilho').__raiz === window.__marca, busca: !!document.getElementById('tr-busca') })`));
    assert.ok(r.raiz && r.busca);
  });
}

// ---- 4. BO: "/" menu in the conversation box ----
async function menuBO() {
  await volta(); const t = JSON.parse(await js(`JSON.stringify((() => { const a = M.S.abas.findIndex(x => x.p && x.p.n === 'Alfa'); return a; })())`));
  await js(`M.S.ativa = ${t}; M.draw()`); await espera(500);
  await ok('BO0 conversa Alfa aberta, comandos carregados', async () => { const r = JSON.parse(await js(`JSON.stringify({ tipo: M.aba().tipo, n: (M.aba().comandos || []).length, est: M.aba().estado })`)); assert.strictEqual(r.tipo, 'chat'); assert.strictEqual(r.n, 3); assert.strictEqual(r.est, 'esperando'); });
  await rascunho('oi mundo'); await espera(200);
  const taMesmo = await js(`window.__ta = M.aba().el.txt; 1`);
  await clica('.chatC.ativa [data-act="barra"]'); await espera(250);
  let v = await caixaVal();
  await ok('BO1 botão "/" com texto: "/" na frente, texto fica', () => { assert.ok(v.startsWith('/'), 'valor: ' + JSON.stringify(v)); assert.ok(v.includes('oi mundo'), 'texto sumiu: ' + JSON.stringify(v)); });
  await ok('BO2 menu de comandos aparece com os 3 comandos', async () => assert.strictEqual(await js(`document.querySelectorAll('.chatC.ativa .pop.cmds .pop-it').length`), 3));
  await clica('.chatC.ativa .pop.cmds [data-act="cmd:rea"]'); await espera(250);
  v = await caixaVal();
  await ok('BO3 escolher o comando: "/rea oi mundo"', () => assert.strictEqual(v, '/rea oi mundo'));
  await ok('BO4 menu fechou depois da escolha', async () => assert.strictEqual(await js(`document.querySelectorAll('.chatC.ativa .pop.cmds').length`), 0));
  // reopen menu, click outside
  await js(`(() => { const t = M.aba(); t.cmdFora = false; const ta = t.el.txt; ta.focus(); ta.setSelectionRange(2, 2); ta.dispatchEvent(new Event('click')); })()`); await espera(250);
  await ok('BO5 cursor na palavra do comando reabre o menu (controle)', async () => assert.ok(await js(`document.querySelectorAll('.chatC.ativa .pop.cmds .pop-it').length`) > 0));
  const fora = await centro('.chatC.ativa .rolar'); await mouseEm(fora.x, fora.y);
  wc.sendInputEvent({ type: 'mouseDown', x: fora.x, y: fora.y, button: 'left', clickCount: 1 }); await espera(60); wc.sendInputEvent({ type: 'mouseUp', x: fora.x, y: fora.y, button: 'left', clickCount: 1 }); await espera(300);
  v = await caixaVal();
  await ok('BO6 clicar fora fecha o menu e o texto fica', async () => { assert.strictEqual(await js(`document.querySelectorAll('.chatC.ativa .pop.cmds').length`), 0, 'menu continua'); assert.strictEqual(v, '/rea oi mundo'); });
  // Esc closes
  await js(`(() => { const t = M.aba(); t.cmdFora = false; const ta = t.el.txt; ta.focus(); ta.setSelectionRange(2, 2); ta.dispatchEvent(new Event('click')); })()`); await espera(250);
  const abriu = await js(`document.querySelectorAll('.chatC.ativa .pop.cmds .pop-it').length`);
  await tecla('Esc'); await espera(250); v = await caixaVal();
  await ok('BO7 Esc fecha o menu e o texto fica', async () => { assert.ok(abriu > 0, 'menu não abriu antes do Esc'); assert.strictEqual(await js(`document.querySelectorAll('.chatC.ativa .pop.cmds').length`), 0, 'menu continua'); assert.strictEqual(v, '/rea oi mundo'); assert.strictEqual(await js(`M.aba().estado`), 'esperando', 'Esc interrompeu a conversa'); });
  await ok('BO8 a caixa é o mesmo nó durante tudo isso', async () => assert.ok(await js(`window.__ta === M.aba().el.txt && window.__ta.isConnected`)));
  // "texto /rea" sent becomes "/rea texto"
  await rascunho('faça isto /rea'); await espera(200);
  const n0 = ENVIADOS.length;
  await foco('.chatC.ativa textarea'); await tecla('Enter'); await espera(400);
  const env = ENVIADOS.slice(n0);
  await ok('BO9 enviar "faça isto /rea" manda "/rea faça isto"', async () => {
    assert.strictEqual(env.length, 1, 'enviados: ' + JSON.stringify(env)); assert.strictEqual(env[0][1], '/rea faça isto');
    const ult = JSON.parse(await js(`JSON.stringify(M.aba().itens.filter(i => i.k === 'eu').pop())`)); assert.strictEqual(ult.txt, '/rea faça isto');
  });
  await ok('BO10 depois de enviar a caixa fica vazia', async () => assert.strictEqual(await caixaVal(), ''));
  await js(`(() => { const t = M.aba(); t.estado = 'esperando'; t.cmdFora = false; })()`);   // turn ends (no reply in this test)
}

// ---- 5. BR: reply streams, old nodes and box stay ----
async function respostaBR() {
  await volta(); await js(`M.S.ativa = M.S.abas.findIndex(x => x.p && x.p.n === 'Beta'); M.draw()`); await espera(800);
  const id = await js(`M.aba().id`);
  await ok('BR0 conversa Beta aberta com histórico', async () => { const r = JSON.parse(await js(`JSON.stringify({ tipo: M.aba().tipo, est: M.aba().estado, n: M.aba().itens.length })`)); assert.strictEqual(r.tipo, 'chat'); assert.strictEqual(r.est, 'esperando'); assert.ok(r.n >= 4, 'itens: ' + r.n); });
  // user sends a message through the real box (Enter), then reply streams
  await rascunho('pergunta nova'); await foco('.chatC.ativa textarea'); await tecla('Enter'); await espera(400);
  await ok('BR1 mensagem enviada e conversa trabalhando', async () => assert.strictEqual(await js(`M.aba().estado`), 'trabalhando'));
  // watch: tag old nodes, observe removals
  await js(`(() => { const host = M.aba().host; window.__velhos = [...host.querySelectorAll('.itens *')]; window.__host = host; window.__ta = M.aba().el.txt; window.__removidos = [];
    window.__obs = new MutationObserver(ms => { for (const m of ms) for (const n of m.removedNodes) if (window.__velhos.includes(n) || n === window.__ta || (n.contains && (n.contains(window.__ta) || window.__velhos.some(v => n.contains(v))))) window.__removidos.push((n.className || n.nodeName || '?').toString().slice(0, 40)); });
    window.__obs.observe(document.getElementById('chats'), { childList: true, subtree: true }); window.__nVelhos = window.__velhos.length; })()`);
  const velhos = await js(`window.__nVelhos`);
  await ok('BR2 há mensagens antigas para vigiar', () => assert.ok(velhos >= 6, 'nós vigiados: ' + velhos));
  const manda = (m) => { w.webContents.send('chat:msg', id, m); };
  manda({ type: 'stream_event', event: { type: 'message_start', msg: 'm-novo' } }); await espera(80);
  manda({ type: 'stream_event', event: { type: 'content_block_start', index: 0, bloco: 'text' } }); await espera(80);
  const pedacos = ['Vou ', 'responder ', 'em ', 'vários ', 'pedaços.\n\n', 'Segundo ', 'parágrafo ', 'com ', 'mais ', 'texto ', 'para ', 'a ', 'tela ', 'crescer.'];
  let digitado = '';
  for (let i = 0; i < pedacos.length; i++) {
    manda({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: pedacos[i] } } });
    if (i % 3 === 0 && digitado.length < 6) { const c = 'abcdef'[digitado.length]; await foco('.chatC.ativa textarea'); await tecla(c); digitado += c; }   // user types while it answers
    await espera(70);
  }
  await espera(300);
  const meio = JSON.parse(await js(`JSON.stringify({ md: (M.aba().itens.filter(i => i.k === 'ia').pop() || {}).md, v: M.aba().el.txt.value, mesmo: window.__ta === M.aba().el.txt, est: M.aba().estado, tela: M.aba().host.querySelector('.itens').innerText.includes('crescer') })`));
  await ok('BR3 o texto da resposta chegou na tela enquanto corria', () => { assert.ok(meio.md && meio.md.includes('crescer'), 'md: ' + meio.md); assert.ok(meio.tela, 'texto não apareceu na conversa'); });
  await ok('BR4 a caixa digitada durante a resposta guarda o texto, mesmo nó', () => { assert.strictEqual(meio.v, digitado, 'caixa: ' + JSON.stringify(meio.v) + ' esperado ' + digitado); assert.ok(meio.mesmo, 'caixa trocada'); assert.ok(digitado.length >= 2); });
  manda({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 } }); await espera(60);
  manda({ type: 'assistant', id: 'm-novo', uuid: 'u9', content: [{ type: 'text', text: pedacos.join('') }] }); await espera(60);
  manda({ type: 'result' }); await espera(500);
  const fim = JSON.parse(await js(`JSON.stringify({ rem: window.__removidos, velhosOk: window.__velhos.every(n => n.isConnected), mesmo: window.__ta === M.aba().el.txt && window.__ta.isConnected, v: M.aba().el.txt.value, est: M.aba().estado, nIa: M.aba().itens.filter(i => i.k === 'ia').length })`));
  await ok('BR5 nenhuma mensagem antiga foi removida da conversa durante a resposta', () => { assert.deepStrictEqual(fim.rem, [], 'removidos: ' + fim.rem.join(', ')); assert.ok(fim.velhosOk, 'nós antigos desligados da página'); });
  await ok('BR6 caixa de texto: mesmo nó e mesmo valor no fim da resposta', () => { assert.ok(fim.mesmo); assert.strictEqual(fim.v, digitado); });
  await ok('BR7 resposta terminou (estado volta a esperando; 1 mensagem nova)', () => { assert.strictEqual(fim.est, 'esperando'); assert.strictEqual(fim.nIa, 3, 'mensagens da IA: ' + fim.nIa); });
  await js(`window.__obs.disconnect()`);
}

app.on('window-all-closed', () => { });
app.whenReady().then(async () => {
  const guarda = setTimeout(() => { console.log('FALHOU geral: passou de 150 s'); app.exit(1); }, 150000);
  try {
    for (let i = 0; i < 150 && !w; i++) { await espera(200); w = BrowserWindow.getAllWindows()[0]; }
    if (!w) throw new Error('janela não abriu');
    wc = w.webContents;
    if (w.isVisible && w.getBounds().x > -3000) throw new Error('janela não está fora da tela: ' + JSON.stringify(w.getBounds()));   // safety: never a visible window
    let pronto = false; for (let i = 0; i < 150 && !pronto; i++) { await espera(200); pronto = await js(`!!(window.M && M.P && M.P.length === 3 && M.app && !M.S.modal && document.getElementById('f-txt'))`).catch(() => false); }
    if (!pronto) throw new Error('tela não ficou pronta');
    await espera(1200);
    await inicioBE();
    await dicasAY('início');
    await telaBT();
    await menuBO();
    await dicasAY('conversa');
    await respostaBR();
  } catch (e) { falhas++; console.log('FALHOU geral: ' + e.message); }
  clearTimeout(guarda);
  console.log((falhas ? `${falhas} falha(s)` : 'Tudo certo') + (puladas ? `, ${puladas} pulado(s)` : '')); app.exit(falhas ? 1 : 0);
});
