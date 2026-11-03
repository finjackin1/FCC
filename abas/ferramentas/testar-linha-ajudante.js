// Test (01/11): what the conversation line says for each kind of helper. Runs tela\chat.js pure (no window).
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { window: {}, document: { createElement: () => ({}) }, console, Date, Math, setTimeout }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tela', 'chat.js'), 'utf8'), ctx);
const C = ctx.window.CHAT; let falhas = 0;
const tem = (txt, s, nome) => { const ok = txt.includes(s); console.log((ok ? 'ok   ' : 'FALHA ') + nome + ': ' + txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 150)); if (!ok) falhas++; };
const nao = (txt, s, nome) => { const ok = !txt.includes(s); console.log((ok ? 'ok   ' : 'FALHA ') + nome); if (!ok) falhas++; };
const aba = (o) => ({ itens: [], estado: 'esperando', dir: 'A:\\x', t0: Date.now(), ...o });
const agora = Date.now();

// 1 subagent in background: progress with last tool
let t = aba(); C.aplicar(t, { type: 'system', subtype: 'task_started', id: 'a', desc: 'Procurar erros', tipo: 'local_agent' }, true);
C.aplicar(t, { type: 'system', subtype: 'background_tasks_changed', tarefas: [{ id: 'a', desc: 'Procurar erros', tipo: 'local_agent' }] }, true);
C.aplicar(t, { type: 'system', subtype: 'task_progress', id: 'a', n: 5, ult: 'Read' }, true);
tem(C.rodapeHTML(t), 'Ajudante trabalhando: Procurar erros', 'subagente, título');
tem(C.rodapeVivo(t).s, '5 ações, agora lendo', 'subagente, progresso');
nao(C.rodapeVivo(t).s, 'sem novidade', 'subagente recente não reclama');
// its own summary wins
C.aplicar(t, { type: 'system', subtype: 'task_progress', id: 'a', n: 6, ult: 'Read', resumo: 'Lendo os testes de áudio' }, true);
tem(C.rodapeVivo(t).s, 'Lendo os testes de áudio', 'subagente, resumo dele');
// silence is told
t.tarefas.a.tUlt = agora - 200000; tem(C.rodapeVivo(t).s, 'sem novidade há 3 min', 'subagente calado');
// 2 subagents: the one that moved last speaks
C.aplicar(t, { type: 'system', subtype: 'background_tasks_changed', tarefas: [{ id: 'a', desc: 'A', tipo: 'local_agent' }, { id: 'b', desc: 'B', tipo: 'local_agent' }] }, true);
C.aplicar(t, { type: 'system', subtype: 'task_progress', id: 'b', n: 2, ult: 'Grep' }, true);
tem(C.rodapeHTML(t), '2 ajudantes trabalhando', 'dois, título'); tem(C.rodapeVivo(t).s, '2 ações, agora buscando', 'dois, quem mexeu por último');

// orq.py worker in background
t = aba(); C.aplicar(t, { type: 'system', subtype: 'background_tasks_changed', tarefas: [{ id: 'o', desc: 'Rodar auditoria', tipo: 'local_bash' }] }, true);
C.aplicar(t, { type: 'system', subtype: 'orq_vivo', lista: [{ id: 'w1', ult: 'Lendo main.js', n: 3, t: agora, outra: true }] }, true);
tem(C.rodapeHTML(t), 'Trabalhando na outra conta', 'outra conta, título'); tem(C.rodapeVivo(t).s, 'Lendo main.js · 3 ações', 'outra conta, passo');
// fell back to the active account: must not claim "other account"
C.aplicar(t, { type: 'system', subtype: 'orq_vivo', lista: [{ id: 'w1', ult: 'Editando app.js', n: 4, t: agora, outra: false }] }, true);
nao(C.rodapeHTML(t), 'outra conta', 'conta ativa não diz outra conta'); tem(C.rodapeVivo(t).s, 'Editando app.js · 4 ações', 'conta ativa, passo');
C.aplicar(t, { type: 'system', subtype: 'orq_vivo', lista: [{ id: 'w1', ult: 'Lendo x', n: 4, t: agora - 180000, outra: true }, { id: 'w2', ult: 'Buscando y', n: 1, t: agora - 130000, outra: true }] }, true);
tem(C.rodapeVivo(t).s, 'Buscando y · 5 ações · 2 ajudantes', 'dois workers'); tem(C.rodapeVivo(t).s, 'sem novidade há 2 min', 'workers calados');
// plain background shell: no invented progress
t = aba(); C.aplicar(t, { type: 'system', subtype: 'background_tasks_changed', tarefas: [{ id: 's', desc: 'Empacotar', tipo: 'local_bash' }] }, true);
tem(C.rodapeHTML(t), 'Rodando em segundo plano: Empacotar', 'shell, título'); nao(C.rodapeVivo(t).s, 'sem novidade', 'shell não inventa silêncio');
// line clears
C.aplicar(t, { type: 'system', subtype: 'background_tasks_changed', tarefas: [] }, true); tem(String(C.rodapeHTML(t) === ''), 'true', 'acabou, linha some');

console.log(falhas ? `FALHOU: ${falhas}` : 'Tudo certo'); process.exit(falhas ? 1 : 0);
