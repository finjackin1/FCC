// Test (30/10): local AI must not stop midway and must remember the task. Fake Ollama, temp folder, no model.
// Run: node abas\ferramentas\testar-local-trava.js
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-trava-')), PROJ = path.join(TMP, 'proj');
fs.mkdirSync(PROJ); fs.writeFileSync(path.join(PROJ, 'grande.txt'), ('linha comprida de teste '.repeat(8) + '\n').repeat(400));

let roteiro = [], pedidos = [];
const linha = (o) => JSON.stringify(o) + '\n', txt = (t) => linha({ message: { role: 'assistant', content: t }, done: false });
const fim = (r = 'stop') => linha({ message: { role: 'assistant', content: '' }, done: true, done_reason: r, prompt_eval_count: 10, eval_count: 5, eval_duration: 1e8 });
const chamada = (name, args) => linha({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name, arguments: args } }] }, done: false });
const srv = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  const corpo = JSON.parse(b); pedidos.push(corpo); const passo = roteiro.shift() || { partes: [txt('ok'), fim()] };
  s.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
  (async () => { for (const p of passo.partes) { if (p === 'PAUSA') { await new Promise(r => setTimeout(r, 3000)); continue; } s.write(p); }
    if (passo.pendura) return; if (passo.corta) return setTimeout(() => s.destroy(), 300); s.end(); })(); }); });

const falhas = []; const confere = (nome, ok) => { console.log((ok ? 'ok   ' : 'FALHA') + ' ' + nome); if (!ok) falhas.push(nome); };

srv.listen(0, async () => {
  const motor = require('../local.js')({ OP: { ctxSimples: '4096', perm: 'auto' }, OLLAMA_URL: 'http://127.0.0.1:' + srv.address().port, PASTA_CONVERSAS: path.join(TMP, 'conversas-locais'), CASA: path.join(TMP, 'casa'),
    PENSAR: new Map(), logApp: () => { }, vel: () => { }, apelidos: () => [], vigia: [1.5, 1, 5] });
  const fila = [], acordar = []; const mandar = (t) => { fila.push({ message: { content: t } }); const a = acordar.shift(); if (a) a(); };
  const prompt = { async *[Symbol.asyncIterator]() { while (true) { if (!fila.length) await new Promise(r => acordar.push(r)); yield fila.shift(); } } };
  const it = motor.query({ prompt, options: { sessao: 'teste', cwd: PROJ, aba: 1, model: 'falso', canUseTool: async () => ({ behavior: 'allow' }) } });
  const msgs = []; let resultado = null; (async () => { for await (const m of it) { msgs.push(m); if (m.type === 'result') { resultado = m; } } })();
  const pedido = async (t) => { resultado = null; const i0 = pedidos.length, m0 = msgs.length; mandar(t); const t0 = Date.now(); while (!resultado && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 50));
    return { r: resultado, enviados: pedidos.slice(i0), telas: msgs.slice(m0).filter(m => m.type === 'assistant').map(m => m.message.content.filter(c => c.type === 'text').map(c => c.text).join('')) }; };
  const ultUser = (c) => c.messages.filter(m => m.role === 'user').pop().content;

  // 1. stream closes without "done" in the middle → program asks to continue, final = both halves
  roteiro = [{ partes: [txt('Primeira metade')], corta: true }, { partes: [txt(' e segunda metade.'), fim()] }];
  let x = await pedido('explique o arquivo');
  confere('1 cortada: pediu continuação', x.enviados.length === 2 && /^\(programa\) Sua resposta foi cortada/.test(ultUser(x.enviados[1])));
  confere('1 cortada: resposta final emendada', x.r && x.r.result === 'Primeira metade e segunda metade.');

  // 2. stall (Ollama silent) → watchdog stops it and continues; request does NOT hang
  roteiro = [{ partes: [txt('Começo')], pendura: true }, { partes: [txt(' fim.'), fim()] }];
  x = await pedido('outra coisa qualquer');
  confere('2 travou: não ficou parado para sempre', !!x.r && x.r.result === 'Começo fim.');

  // 3. promise without tool → nudge → tool runs → answer
  roteiro = [{ partes: [txt('Vou ler o arquivo grande.txt:'), fim()] }, { partes: [chamada('Read', { file_path: 'grande.txt', limit: 3 }), fim()] }, { partes: [txt('Li, tem linhas.'), fim()] }];
  x = await pedido('leia o grande.txt');
  confere('3 prometeu: cutucou para chamar ferramenta', x.enviados.length === 3 && /não chamou nenhuma ferramenta/.test(ultUser(x.enviados[1])));
  confere('3 prometeu: leu e respondeu', x.r.result === 'Li, tem linhas.' && x.enviados[2].messages.some(m => m.role === 'tool' && /linha comprida/.test(m.content)));

  // 4. tool call written as text → runs
  roteiro = [{ partes: [txt('{"name": "Glob", "arguments": {"pattern": "*.txt"}}'), fim()] }, { partes: [txt('Achei grande.txt.'), fim()] }];
  x = await pedido('quais txt tem aqui');
  confere('4 chamada em texto: rodou Glob', x.enviados.length === 2 && x.enviados[1].messages.some(m => m.role === 'tool' && /grande\.txt/.test(m.content)));

  // 5. big tool results (ctx 4096) → the request itself always stays in what is sent
  roteiro = [{ partes: [chamada('Read', { file_path: 'grande.txt' }), fim()] }, { partes: [chamada('Read', { file_path: 'grande.txt', offset: 2 }), fim()] }, { partes: [chamada('Read', { file_path: 'grande.txt', offset: 3 }), fim()] }, { partes: [txt('Pronto.'), fim()] }];
  x = await pedido('PEDIDO-MARCA analise o grande.txt inteiro');
  confere('5 contexto cheio: pedido continua na conversa', x.enviados.length === 4 && x.enviados.every(c => c.messages.some(m => m.role === 'user' && /PEDIDO-MARCA/.test(m.content))));
  confere('5 contexto cheio: cabe no limite', x.enviados.every(c => JSON.stringify(c.messages).length < 4096 * 3.2 + 3000));

  // 6. stalls twice → stops, says so on screen; next request gets [tarefa interrompida] with what was done
  roteiro = [{ partes: [chamada('Glob', { pattern: '*.txt' }), fim()] }, { partes: [], pendura: true }, { partes: [], pendura: true }];
  x = await pedido('TAREFA-X procure os txt e resuma');
  confere('6 travou 2x: avisou na tela', x.telas.some(t => /Parei no meio: .*continue/.test(t)));
  roteiro = [{ partes: [txt('Retomando.'), fim()] }];
  x = await pedido('continue');
  const u = ultUser(x.enviados[0]);
  confere('6 continue: lembra pedido, o que fez e por que parou', /\[tarefa interrompida\] Pedido: TAREFA-X/.test(u) && /Glob \*\.txt/.test(u) && /sem mandar nada/.test(u));
  const j = JSON.parse(fs.readFileSync(path.join(TMP, 'conversas-locais', 'teste.json'), 'utf8'));
  confere('6 continue: tarefa nova marcada pronta', j.tarefa && j.tarefa.estado === 'pronto');

  // 7. nudges don't become "his requests" in history
  confere('7 cutucadas fora da lista de pedidos dele', !x.enviados[0].messages.some(m => /\[antes nesta conversa[\s\S]*\(programa\)/.test(m.content)));

  // 8. "Vou criar…:" then silence while Ollama holds the tool call (3 s > VIGIA_N 1 s) → NOT a stall, Write runs
  roteiro = [{ partes: [txt('Vou criar o arquivo novo.txt:'), 'PAUSA', chamada('Write', { file_path: 'novo.txt', content: 'oi' }), fim()] }, { partes: [txt('Criei.'), fim()] }];
  x = await pedido('crie novo.txt com oi');
  confere('8 silêncio após "vou criar:": esperou a chamada e salvou', x.enviados.length === 2 && fs.existsSync(path.join(PROJ, 'novo.txt')) && !x.enviados.some(c => /cortada/.test(ultUser(c))));

  it.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { }
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo'); process.exit(falhas.length ? 1 : 0);
});
