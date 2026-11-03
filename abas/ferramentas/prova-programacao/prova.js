// Runs the programming exam on the local AI (real Ollama), each task in its own temp folder, then the hidden test.
// node prova.js --modelo qwen3-coder:30b [--so id1,id2] [--programar auto|nunca] [--gabarito] [--vazio] [--manter]
//  --gabarito: writes the reference solutions and tests them (must be 20/20); --vazio: setup only (must be 0/20).
// Results: resultados\<date>-<model>.json + one line per task on screen. Home memory is a temp COPY (real one untouched).
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const TAREFAS = require('./tarefas.js');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const FCC = path.resolve(__dirname, '..', '..', '..'), CASA_REAL = path.join(FCC, 'casa');
const so = arg('so') ? String(arg('so')).split(',') : null, L = TAREFAS.filter(t => !so || so.includes(t.id));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-prova-'));
const preparar = (t) => { const d = path.join(TMP, t.id); fs.mkdirSync(d, { recursive: true });
  for (const [f, c] of Object.entries(t.arquivos || {})) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), c, 'utf8'); } return d; };

(async () => {
  if (arg('gabarito') || arg('vazio')) {
    let ok = 0; for (const t of L) { const d = preparar(t); if (arg('gabarito')) for (const [f, c] of Object.entries(t.gabarito)) fs.writeFileSync(path.join(d, f), c, 'utf8');
      const e = t.teste(d); if (!e) ok++; console.log((e ? 'falha ' : 'ok    ') + t.id + (e ? ': ' + e.split('\n')[0].slice(0, 150) : '')); }
    console.log(`\n${ok}/${L.length}`); fs.rmSync(TMP, { recursive: true, force: true }); return;
  }
  const modelo = arg('modelo', 'qwen2.5-coder:7b');
  // temp home: copies of the local AI prompt files + lessons (the AI may write lessons/memories: they stay in the copy)
  const CASA = path.join(TMP, 'casa'); fs.mkdirSync(path.join(CASA, 'memoria'), { recursive: true }); fs.mkdirSync(path.join(CASA, 'aprendizado'), { recursive: true }); fs.mkdirSync(path.join(CASA, 'skills'), { recursive: true });
  for (const f of fs.readdirSync(path.join(CASA_REAL, 'memoria'))) if (/\.md$/i.test(f) && fs.statSync(path.join(CASA_REAL, 'memoria', f)).isFile()) fs.copyFileSync(path.join(CASA_REAL, 'memoria', f), path.join(CASA, 'memoria', f));
  try { fs.cpSync(path.join(CASA_REAL, 'memoria', 'programar'), path.join(CASA, 'memoria', 'programar'), { recursive: true }); } catch { }
  try { fs.copyFileSync(path.join(CASA_REAL, 'aprendizado', 'APRENDIZADOS.md'), path.join(CASA, 'aprendizado', 'APRENDIZADOS.md')); } catch { }
  const motor = require('../../local.js')({ OP: { ctxSimples: arg('ctx', '16384'), perm: 'auto', manter: '30m', programar: arg('programar', 'auto') }, OLLAMA_URL: 'http://127.0.0.1:11434', CCT: TMP, CASA,
    PENSAR: new Map(), logApp: (x) => console.log('   [log] ' + x), vel: () => { }, apelidos: () => [] });
  const R = [], t00 = Date.now();
  for (const t of L) {
    const d = preparar(t), fila = [{ message: { content: t.pedido } }];
    const prompt = { async *[Symbol.asyncIterator]() { while (fila.length) yield fila.shift(); await new Promise(() => { }); } };
    const it = motor.query({ prompt, options: { sessao: 'prova-' + t.id, cwd: d, aba: 1, model: modelo, canUseTool: async () => ({ behavior: 'allow' }) } });
    const t0 = Date.now(), ferr = []; let res = null;
    const lim = setTimeout(() => it.close(), parseInt(arg('limite', '1200'), 10) * 1000);
    for await (const m of it) { if (m.type === 'assistant') for (const c of m.message.content) if (c.type === 'tool_use') ferr.push(c.name); if (m.type === 'result') { res = m; break; } }
    clearTimeout(lim); it.close();
    const erro = t.teste(d), seg = Math.round((Date.now() - t0) / 1000);
    R.push({ id: t.id, ok: !erro, erro: erro || '', seg, ferramentas: ferr.length, rodou: ferr.filter(n => /PowerShell|Rodar/.test(n)).length, tokens: res && res.usage ? res.usage.output_tokens : 0, resposta: String((res && res.result) || '').slice(0, 300) });
    console.log(`${erro ? 'FALHA' : 'ok   '} ${t.id.padEnd(12)} ${String(seg).padStart(4)} s · ${ferr.length} ferramentas${erro ? ' · ' + erro.split('\n')[0].slice(0, 140) : ''}`);
  }
  const ok = R.filter(x => x.ok).length, nome = `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}-${modelo.replace(/[^\w.-]/g, '_')}-${arg('programar', 'auto')}.json`;
  fs.mkdirSync(path.join(__dirname, 'resultados'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'resultados', nome), JSON.stringify({ modelo, programar: arg('programar', 'auto'), nota: `${ok}/${R.length}`, minutos: Math.round((Date.now() - t00) / 60000), tarefas: R }, null, 1), 'utf8');
  console.log(`\nNota: ${ok}/${R.length} · ${Math.round((Date.now() - t00) / 60000)} min · resultados\\${nome}`);
  if (!arg('manter')) fs.rmSync(TMP, { recursive: true, force: true }); else console.log('pastas: ' + TMP);
  process.exit(0);
})();
