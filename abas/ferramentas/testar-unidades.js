// Test: loja tok/s (MoE), auto mode rules, local "/" commands, internet gate, gpt-oss think level. Fake Ollama, temp dirs, no network.
// Run: node abas\ferramentas\testar-unidades.js
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const ABAS = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-unid-')), PROJ = path.join(TMP, 'proj'); fs.mkdirSync(PROJ);
const limpa = () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { } };

let n = 0; const falhas = [];
const confere = (nome, ok, det) => { n++; console.log((ok ? 'ok   ' : 'FALHOU') + ` ${n} ${nome}` + (ok ? '' : ': ' + (det === undefined ? '' : typeof det === 'string' ? det : JSON.stringify(det)))); if (!ok) falhas.push(nome); };

// ---- AS: loja.js tps() uses `ativo` (MoE) ----
{
  // browser code: load in vm with minimal M/document stubs
  const M = { S: {}, ico: () => '', esc: (s) => String(s), D: { loja: { PC: { vram: 12, ram: 32 }, CAT: [], INST: {}, FILA: [], BUSCA: [], ACHADOS: [] } } };
  const ctx = vm.createContext({ M, document: { addEventListener() { } }, console });
  // M.ico/esc destructured at load, so they must exist before
  ctx.M.S = {}; M.S = {};
  try { vm.runInContext(fs.readFileSync(path.join(ABAS, 'tela', 'v2', 'loja.js'), 'utf8'), ctx); } catch (e) { confere('AS loja.js carrega no vm', false, e.message); }
  const P = M.lojaPeca;
  const src = fs.readFileSync(path.join(ABAS, 'main.js'), 'utf8');
  const at = parseFloat((src.match(/id: 'qwen3-coder'[^\n]*?ativo: ([\d.]+) \}/) || [])[1]);
  confere('AS catálogo: qwen3-coder tem ativo 0.1', at === 0.1, at);
  if (P) {
    const gb = 18.6;   // 30b q4: does not fit 12 GB GPU, fits with 32 GB RAM ("meio")
    const com = P.tps(gb, { ativo: at }), sem = P.tps(gb, { ativo: 0 });
    const num = (s) => parseInt((String(s).match(/~(\d+)/) || [])[1]);
    confere('AS MoE com ativo: ~20 tok/s (não ~2)', num(com) >= 15 && num(com) <= 30, com);
    confere('AS denso sem ativo: ~2 tok/s (contraste)', num(sem) === 2, sem);
    confere('AS gb 0 / grande demais: traço', P.tps(0, {}) === '—' && P.tps(200, { ativo: 0.1 }) === '—', [P.tps(0, {}), P.tps(200, { ativo: 0.1 })]);
  }
}

// ---- AZ: auto.js rules ----
{
  const arq = path.join(TMP, 'auto.json'), logs = [];
  const mk = () => require('../auto.js')(arq, (m) => logs.push(m));
  const A = mk();
  const novo = () => ({ modelo: 'sonnet', esf: 'low', auto: {} });
  const ESC = A.ESCADA, idx = (m, e) => ESC.findIndex(x => x[0] === m && x[1] === e);
  let c = novo(), r = A.escolher(c, 'oi');
  confere('AZ "oi" -> Haiku', r && r.modelo === 'haiku', r);
  c = novo(); r = A.escolher(c, 'mude a cor do botão para azul');
  // 25/10 ladder: change request = Opus low (step 3), thinking up only for hard/big
  confere('AZ pedido de mudança -> Opus', r && r.modelo === 'opus' && r.tipo === 'tarefa', r);
  confere('AZ pedido de mudança -> pensamento baixo (escada de 25/10; lista AZ diz Médio, desatualizada)', r && r.esf === 'low', r && r.esf);
  c = novo(); r = A.escolher(c, 'o app trava e dá crash quando abro');
  confere('AZ bug/travamento -> Opus', r && r.modelo === 'opus' && r.tipo === 'difícil', r);
  confere('AZ bug/travamento -> pensamento médio (escada de 25/10; lista AZ diz Alto, desatualizada)', r && r.esf === 'medium', r && r.esf);
  // teach: after a change request the user switches to Opus high → next similar request gets taught step
  c = novo(); r = A.escolher(c, 'mude a cor do botão para azul'); c.modelo = r.modelo; c.esf = r.esf;
  const antes = idx(c.modelo, c.esf);
  A.trocouNaMao(c, 'opus', 'high'); c.modelo = 'opus'; c.esf = 'high';
  r = A.escolher(c, 'troque o texto do rodapé');
  const depois = r ? idx(r.modelo, r.esf) : idx(c.modelo, c.esf);
  confere('AZ trocar na mão ensina: próximo pedido parecido sobe um degrau', depois === antes + 1, { antes, depois, r });
  // learning persists on disk and is read by a new instance
  const B = mk(), c2 = novo(), r2 = B.escolher(c2, 'troque a fonte do título');
  confere('AZ aprendizado salvo no json e lido por outra instância', fs.existsSync(arq) && idx(r2 ? r2.modelo : 'sonnet', r2 ? r2.esf : 'low') === antes + 1, r2);
}

// ---- BJ / BB / AR: local.js with fake Ollama ----
let roteiro = [], pedidos = [];
const linha = (o) => JSON.stringify(o) + '\n', txt = (t) => linha({ message: { role: 'assistant', content: t }, done: false });
const fim = () => linha({ message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 10, eval_count: 5, eval_duration: 1e8 });
const chamada = (name, args) => linha({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name, arguments: args } }] }, done: false });
const srv = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  pedidos.push(JSON.parse(b)); const passo = roteiro.shift() || [txt('ok'), fim()];
  s.writeHead(200, { 'Content-Type': 'application/x-ndjson' }); for (const p of passo) s.write(p); s.end(); }); });

// internet stub: DuckDuckGo never reached; everything else (fake Ollama on 127.0.0.1) goes through
let webChamadas = []; const fetchReal = globalThis.fetch;
globalThis.fetch = (u, o) => { if (/duckduckgo/i.test(String(u))) { webChamadas.push(String(u)); return Promise.resolve(new Response('<html></html>', { status: 200 })); } return fetchReal(u, o); };

srv.listen(0, async () => {
  const OP = { ctxSimples: '4096', perm: 'auto' };
  const motor = require('../local.js')({ OP, OLLAMA_URL: 'http://127.0.0.1:' + srv.address().port, PASTA_CONVERSAS: path.join(TMP, 'conversas-locais'), CASA: path.join(TMP, 'casa'),
    PENSAR: new Map(), logApp: () => { }, vel: () => { }, apelidos: () => [], vigia: [1.5, 1, 5], breve: 'BREVE-TESTE' });
  const sessoes = [];
  const sessao = (nome, model) => {
    const fila = [], acordar = []; const mandar = (t) => { fila.push({ message: { content: t } }); const a = acordar.shift(); if (a) a(); };
    const prompt = { async *[Symbol.asyncIterator]() { while (true) { if (!fila.length) await new Promise(r => acordar.push(r)); yield fila.shift(); } } };
    const it = motor.query({ prompt, options: { sessao: nome, cwd: PROJ, aba: 1, model, canUseTool: async () => ({ behavior: 'allow' }) } });
    const msgs = []; let resultado = null; (async () => { for await (const m of it) { msgs.push(m); if (m.type === 'result') resultado = m; } })();
    sessoes.push(it);
    return async (t) => { resultado = null; const i0 = pedidos.length, w0 = webChamadas.length; mandar(t); const t0 = Date.now();
      while (!resultado && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 30));
      return { r: resultado, ms: Date.now() - t0, enviados: pedidos.slice(i0), web: webChamadas.slice(w0) }; };
  };
  const nomesFerr = (c) => (c.tools || []).map(t => t.function.name);
  const ferrResult = (c) => c.messages.filter(m => m.role === 'tool').map(m => m.content).join('\n');

  try {
    // BJ: "/" commands answer instantly, 0 requests to Ollama
    { const pedir = sessao('bj', 'falso');
      for (const cmd of ['/skills', '/memoria', '/ajuda']) {
        const x = await pedir(cmd);
        confere(`BJ ${cmd}: responde na hora, 0 pedidos ao Ollama`, !!x.r && !x.r.is_error && typeof x.r.result === 'string' && x.r.result.length > 0 && x.enviados.length === 0 && x.ms < 2000, { r: x.r && x.r.result, env: x.enviados.length, ms: x.ms });
      }
      const x = await pedir('/ajuda'); confere('BJ /ajuda: lista os comandos', /Comandos:.*\/skills/.test(x.r.result), x.r.result);
      confere('02/11 /ajuda sem /ultracave, /caveman nem /normal (modo removido)', !/\/(ultracave|caveman|normal)\b/.test(x.r.result), x.r.result);
      const u = await pedir('/ultracave'); confere('02/11 /ultracave não liga mais modo nenhum', !/Modo ultracave|ligado/i.test((u.r && u.r.result) || ''), u.r && u.r.result); }
    // 02/11: brevity line always in the local AI system prompt (replaces Ultracave)
    { roteiro = [[txt('ok'), fim()]]; const x = await sessao('breve', 'falso')('diga oi'); const sys = ((x.enviados[0] || {}).messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
      confere('02/11 linha de brevidade vai no pedido da IA local', /BREVE-TESTE/.test(sys), sys.slice(0, 200)); }

    // BB: internet gate. Without the ask: tool not offered and, if the model calls it anyway, refused (no fetch)
    { const pedir = sessao('bb1', 'falso');
      roteiro = [[chamada('WebSearch', { query: 'capital da frança' }), fim()], [txt('Sem internet agora.'), fim()]];
      const x = await pedir('qual a capital da frança');
      confere('BB sem pedir internet: ferramentas de web nem são enviadas', x.enviados.length === 2 && !nomesFerr(x.enviados[0]).some(f => /^Web/.test(f)) && nomesFerr(x.enviados[0]).length > 0, nomesFerr(x.enviados[0] || {}));
      confere('BB sem pedir internet: chamada recusada ("internet só quando ele pedir")', x.enviados.length === 2 && /internet só quando ele pedir/.test(ferrResult(x.enviados[1])), x.enviados[1] && ferrResult(x.enviados[1]));
      confere('BB sem pedir internet: nada foi buscado na rede', x.web.length === 0, x.web); }
    // with the ask: tool offered and runs (DuckDuckGo stubbed: no network)
    { const pedir = sessao('bb2', 'falso');
      roteiro = [[chamada('WebSearch', { query: 'gatos' }), fim()], [txt('Achei.'), fim()]];
      const x = await pedir('pesquise na internet gatos');
      confere('BB "pesquise na internet X": ferramenta de web é enviada', x.enviados.length === 2 && nomesFerr(x.enviados[0]).includes('WebSearch'), nomesFerr(x.enviados[0] || {}));
      confere('BB "pesquise na internet X": busca roda (sem recusa; rede simulada)', x.enviados.length === 2 && !/internet só quando/.test(ferrResult(x.enviados[1])) && /Nada encontrado/.test(ferrResult(x.enviados[1])) && x.web.length === 1, { web: x.web, res: x.enviados[1] && ferrResult(x.enviados[1]) }); }

    // AR: gpt-oss thinking level (OP.nivel) goes to Ollama as think low/medium/high; default low
    { const pedir = sessao('ar', 'gpt-oss:20b'), pedirOutro = sessao('ar2', 'falso');
      const think = async (nivel) => { if (nivel === undefined) delete OP.nivel; else OP.nivel = nivel; roteiro = [[txt('ok'), fim()]]; const x = await pedir('diga oi ' + nivel); return x.enviados[0] && x.enviados[0].think; };
      confere('AR gpt-oss sem nível escolhido: think = "low"', await think(undefined) === 'low');
      confere('AR gpt-oss nível medium: think = "medium"', await think('medium') === 'medium');
      confere('AR gpt-oss nível high: think = "high"', await think('high') === 'high');
      confere('AR gpt-oss nível low: think = "low"', await think('low') === 'low');
      confere('AR gpt-oss nível inválido: volta para "low"', await think('xyz') === 'low');
      OP.nivel = 'high'; roteiro = [[txt('ok'), fim()]]; const o = await pedirOutro('diga oi');
      confere('AR outro modelo: think continua booleano (nível não vaza)', o.enviados[0] && o.enviados[0].think === false, o.enviados[0] && o.enviados[0].think);
      const src = fs.readFileSync(path.join(ABAS, 'main.js'), 'utf8');
      confere('AR catálogo: gpt-oss marcado com niveis', /id: 'gpt-oss'[^\n]*niveis: 1/.test(src)); }
  } catch (e) { confere('execução sem erro inesperado', false, e && e.stack || String(e)); }

  for (const it of sessoes) try { it.close(); } catch { }
  srv.close(); globalThis.fetch = fetchReal; limpa();
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo'); process.exit(falhas.length ? 1 : 0);
});
