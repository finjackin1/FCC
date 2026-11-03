// Test (30/10): coder mode is a RULE, not advice. Fake Ollama, temp folder, real node for Rodar.
// Run: node abas\ferramentas\testar-local-programar.js
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-prog-')), PROJ = path.join(TMP, 'proj');
fs.mkdirSync(PROJ);

let roteiro = [], pedidos = [];
const linha = (o) => JSON.stringify(o) + '\n', txt = (t) => linha({ message: { role: 'assistant', content: t }, done: false });
const fim = () => linha({ message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 10, eval_count: 5, eval_duration: 1e8 });
const chamada = (name, args) => linha({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name, arguments: args } }] }, done: false });
const diz = (t) => ({ partes: [txt(t), fim()] }), usa = (n, a) => ({ partes: [chamada(n, a), fim()] });
const srv = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  pedidos.push(JSON.parse(b)); const passo = roteiro.shift() || diz('Pronto.');
  s.writeHead(200, { 'Content-Type': 'application/x-ndjson' }); for (const p of passo.partes) s.write(p); s.end(); }); });

const falhas = []; const confere = (nome, ok) => { console.log((ok ? 'ok   ' : 'FALHA') + ' ' + nome); if (!ok) falhas.push(nome); };

srv.listen(0, async () => {
  const motor = require('../local.js')({ OP: { ctxSimples: '8192', perm: 'auto', programar: 'auto' }, OLLAMA_URL: 'http://127.0.0.1:' + srv.address().port, PASTA_CONVERSAS: path.join(TMP, 'conversas-locais'), CASA: path.join(TMP, 'casa'),
    PENSAR: new Map(), logApp: () => { }, vel: () => { }, apelidos: () => [], vigia: [5, 5] });
  const fila = [], acordar = []; const mandar = (t) => { fila.push({ message: { content: t } }); const a = acordar.shift(); if (a) a(); };
  const prompt = { async *[Symbol.asyncIterator]() { while (true) { if (!fila.length) await new Promise(r => acordar.push(r)); yield fila.shift(); } } };
  const it = motor.query({ prompt, options: { sessao: 'teste', cwd: PROJ, aba: 1, model: 'falso', canUseTool: async () => ({ behavior: 'allow' }) } });
  const msgs = []; let resultado = null; (async () => { for await (const m of it) { msgs.push(m); if (m.type === 'result') resultado = m; } })();
  const pedido = async (t) => { resultado = null; const i0 = pedidos.length, m0 = msgs.length; mandar(t); const t0 = Date.now(); while (!resultado && Date.now() - t0 < 60000) await new Promise(r => setTimeout(r, 50));
    return { r: resultado, enviados: pedidos.slice(i0), telas: msgs.slice(m0).filter(m => m.type === 'assistant').map(m => m.message.content.filter(c => c.type === 'text').map(c => c.text).join('')) }; };
  const cutucadas = (x) => x.enviados.map(c => c.messages[c.messages.length - 1]).filter(m => m.role === 'user' && /^\(programa\)/.test(m.content)).map(m => m.content);
  const temRodar = (c) => (c.tools || []).some(f => f.function.name === 'Rodar');
  const p = (f) => path.join(PROJ, f);

  // 1. code pasted in chat, nothing saved, request names the file → must save
  roteiro = [diz('```js\nmodule.exports={soma:(a,b)=>a+b}\n```'), usa('Write', { file_path: p('soma.js'), content: 'module.exports={soma:(a,b)=>a+b};\n' }),
    usa('Write', { file_path: p('_teste_soma.js'), content: "const {soma}=require('./soma.js');if(soma(2,3)!==5)process.exit(1);console.log('OK');\n" }),
    usa('Rodar', { arquivo: '_teste_soma.js' }), diz('Feito.'), diz('Criei soma.js e testei: OK.')];
  let x = await pedido('crie soma.js que exporta soma(a, b)');
  confere('1 só no chat: mandou salvar', /não salvou nenhum arquivo/.test(cutucadas(x)[0] || ''));
  confere('1 teste passou: revisão e entrega sem aviso', x.r && /testei: OK/.test(x.r.result) && !/Aviso do programa/.test(x.r.result));
  confere('1 teste _teste_ apagado no fim', !fs.existsSync(p('_teste_soma.js')) && fs.existsSync(p('soma.js')));

  // 2. test FAILS → can't deliver; fix + rerun the SAME test (not blocked as repeat) → passes
  roteiro = [usa('Write', { file_path: p('dobro.js'), content: 'module.exports={dobro:(n)=>n+2};\n' }),
    usa('Write', { file_path: p('_teste_dobro.js'), content: "const {dobro}=require('./dobro.js');if(dobro(5)!==10){console.error('falhou');process.exit(1)}console.log('OK');\n" }),
    usa('Rodar', { arquivo: '_teste_dobro.js' }), diz('Pronto, funciona.'),
    usa('Edit', { file_path: p('dobro.js'), old_string: 'n+2', new_string: 'n*2' }), usa('Rodar', { arquivo: '_teste_dobro.js' }), diz('Corrigido.'), diz('dobro.js corrigido, teste OK.')];
  x = await pedido('crie dobro.js com a função dobro(n)');
  const c2 = cutucadas(x);
  confere('2 teste falhou: não deixou entregar', /FALHOU/.test(c2[0] || ''));
  confere('2 mesmo teste rodou de novo depois da correção', x.enviados.some(c => c.messages.some(m => m.role === 'tool' && /^OK/.test(m.content) && /código de saída 0/.test(m.content))));
  confere('2 entregou sem aviso', x.r && /teste OK/.test(x.r.result) && !/Aviso do programa/.test(x.r.result));

  // 3. module run alone (no output) is not a test
  roteiro = [usa('Write', { file_path: p('tri.js'), content: 'module.exports={tri:(n)=>n*3};\n' }), usa('Rodar', { arquivo: 'tri.js' }), diz('Pronto.')];
  x = await pedido('crie tri.js com tri(n)');
  confere('3 rodar módulo sem saída não conta como teste', /FALHOU \(ou não imprimiu nada\)/.test(cutucadas(x)[0] || ''));

  // 4. request doesn't look like programming, but it writes code → coder mode turns on (instructions + Rodar tool)
  roteiro = [usa('Write', { file_path: p('notas.js'), content: 'console.log([7,8,9].reduce((a,b)=>a+b,0));\n' }), usa('Rodar', { arquivo: 'notas.js' }), diz('Soma 24.'), diz('Fiz notas.js, rodei: 24.')];
  x = await pedido('faz um negócio que soma as notas 7 8 9');
  confere('4 sem cara de código: 1º pedido sem Rodar', !temRodar(x.enviados[0]));
  confere('4 escreveu código: modo programador ligou', x.enviados[1] && temRodar(x.enviados[1]) && x.enviados[1].messages.some(m => m.role === 'tool' && /modo programador ligado pelo programa/.test(m.content)));

  // 5. never tests → after the nudges the PROGRAM warns him (doesn't depend on the model admitting it)
  roteiro = [usa('Write', { file_path: p('nunca.js'), content: 'module.exports={x:1};\n' }), ...Array(10).fill(0).map(() => diz('Pronto, funciona.'))];
  x = await pedido('crie nunca.js');
  confere('5 nunca testou: cobrou várias vezes', cutucadas(x).filter(c => /não rodou depois/.test(c)).length >= 5);
  confere('5 nunca testou: aviso do programa na tela e na resposta', x.telas.some(t => /Aviso do programa: o código mudou e NÃO passou/.test(t)) && /Aviso do programa/.test(x.r.result));

  // 6. plain chat question: no gate, no Rodar
  roteiro = [diz('Oi! Tudo bem.')];
  x = await pedido('oi, tudo bem?');
  confere('6 conversa normal: sem cobrança e sem Rodar', x.enviados.length === 1 && !temRodar(x.enviados[0]));

  // 7. qwen3-coder writes its native call as TEXT (<function=Write><parameter=…>) → the program runs it; a cut one (param not closed) is NOT run
  roteiro = [diz('Vou criar o arquivo.\n\n<function=Write>\n<parameter=file_path>\n' + p('q3.js') + '\n</parameter>\n<parameter=content>\nmodule.exports={q:3};\n</parameter>\n</function>'),
    diz('<function=Write>\n<parameter=file_path>\n' + p('cortado.js') + '\n</parameter>\n<parameter=content>\nmodule.exports={'),
    usa('Write', { file_path: p('_teste_q3.js'), content: "if(require('./q3.js').q!==3)process.exit(1);console.log('OK');\n" }), usa('Rodar', { arquivo: '_teste_q3.js' }), diz('Feito.'), diz('q3.js criado, teste OK.')];
  x = await pedido('crie q3.js que exporta q = 3');
  confere('7 formato qwen3 em texto: gravou o arquivo', fs.existsSync(p('q3.js')) && /q:3/.test(fs.readFileSync(p('q3.js'), 'utf8')));
  confere('7 chamada cortada: não gravou', !fs.existsSync(p('cortado.js')));

  // 8. promises early spend the nudges; tools ran since → at final review "Vou corrigir…:" is still nudged (real 30b: duracao, calculadora)
  roteiro = [diz('Vou criar o arquivo:'), diz('Vou criar o arquivo:'), usa('Write', { file_path: p('r.js'), content: 'module.exports={r:1};\n' }),
    usa('Write', { file_path: p('_teste_r.js'), content: "if(require('./r.js').r<1)process.exit(1);console.log('OK');\n" }), usa('Rodar', { arquivo: '_teste_r.js' }),
    diz('Feito.'), diz('Achei um problema. Vou corrigir o arquivo r.js:'), usa('Edit', { file_path: p('r.js'), old_string: 'r:1', new_string: 'r:2' }), usa('Rodar', { arquivo: '_teste_r.js' }), diz('r.js corrigido, teste OK.')];
  x = await pedido('crie r.js que exporta r = 2');
  confere('8 promessa na revisão depois de gastar cobranças: cobrou e corrigiu', /r:2/.test(fs.readFileSync(p('r.js'), 'utf8')) && /teste OK/.test(x.r.result));

  it.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { }
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo'); process.exit(falhas.length ? 1 : 0);
});
