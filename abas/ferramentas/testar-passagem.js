// Test (02/11): handoff state machine + helpers kept inside the conversation. Isolated: temp folder only.
// With --vivo: real Claude Code on haiku (costs a little quota): over the limit mid-task, note written, new conversation resumes alone and finishes.
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const PASS = require('../passagem.js');
let falhas = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FALHA ') + t); if (!c) falhas++; };
const dorme = (ms) => new Promise(r => setTimeout(r, ms));
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-pass-')); fs.mkdirSync(path.join(d, 'docs'));
const nota = path.join(d, 'docs', 'PARADA.md'); fs.writeFileSync(nota, 'velho');

function montar(lim = 1000, espera = 200) {
  const trocas = [], avisos = [];
  const P = PASS({ limite: () => lim, aberta: (c) => !c.fechado, trocar: (c) => trocas.push({ cont: c.continuar }), aviso: (c, mil) => avisos.push(mil), espera });
  const conversa = (x = {}) => ({ o: { dir: d }, sessao: 'abc', perms: new Map(), fila: { itens: [], por(t) { this.itens.push(t); } }, ctxAgora: 5000, ...x });
  return { P, trocas, avisos, conversa };
}

async function unidade() {
  { const { P, conversa, avisos } = montar(); const c = conversa({ ctxAgora: 500 }); P.ver(c); ok(!c.passando && !avisos.length, 'abaixo do limite não faz nada'); }
  { const { P, conversa } = montar(0); const c = conversa(); P.ver(c); ok(!c.passando, 'limite 0 desliga'); }
  { const { P, conversa } = montar(); const c = conversa(); c.perms.set('x', 1); P.ver(c); ok(!c.passando, 'com pergunta aberta espera'); }
  { const { P, conversa, trocas } = montar(); const c = conversa(); P.ver(c); ok(c.passando === 1 && c.fila.itens.length === 1 && /PENDENTE/.test(c.fila.itens[0]), 'fim de resposta: pede a anotação');
    c.ultResp = 'PRONTO'; P.ver(c); ok(trocas.length === 1 && trocas[0].cont === false, 'PRONTO: troca e fica esperando o usuário'); }
  { const { P, conversa, trocas } = montar(); const c = conversa(); P.ver(c, true); P.ver(c, true); ok(c.passMeio && c.fila.itens.length === 1, 'no meio da tarefa: pede só uma vez');
    c.ultResp = 'PENDENTE'; P.ver(c); ok(trocas.length === 1 && trocas[0].cont === true, 'PENDENTE: troca e continua sozinha'); }
  { const { P, conversa, trocas } = montar(); const c = conversa(); P.ver(c, true); c.parou = true; c.ultResp = 'PENDENTE'; P.ver(c); ok(trocas[0].cont === false, 'usuário parou: não continua sozinha'); }
  { const { P, conversa, trocas } = montar(); const c = conversa(); P.ver(c, true); await dorme(20); fs.writeFileSync(nota, 'novo'); c.ultResp = 'ok'; P.ver(c); ok(trocas.length === 1 && trocas[0].cont === true, 'resposta fora do combinado mas nota gravada: troca'); }
  { const { P, conversa, trocas } = montar(); await dorme(30); const c = conversa(); P.ver(c, true); await dorme(20); c.ultResp = 'Terminei a tarefa'; c.msgT = Date.now(); P.ver(c); ok(!trocas.length, 'fim de tarefa antes de ler o pedido: não troca ainda');
    c.msgT = Date.now(); await dorme(120); c.msgT = Date.now(); await dorme(120); ok(!trocas.length, 'Claude ainda ativo: não troca'); c.ultResp = 'PRONTO'; P.ver(c); ok(trocas.length === 1, 'troca quando responde'); await dorme(300); ok(trocas.length === 1, 'só troca uma vez'); }
  { const { P, conversa, trocas } = montar(); const c = conversa(); P.ver(c, true); c.ultResp = 'erro'; c.passT0 = Date.now() + 1000; c.msgT = 0; P.ver(c); await dorme(300); ok(trocas.length === 1, 'nenhuma resposta veio: troca mesmo assim, a aba não trava'); }
  { const { P, conversa } = montar(); const c = conversa({ o: { dir: d, passagem: true }, ctx0: 4000 }); P.ver(c); ok(!c.passando, 'conversa nova já grande não troca em cadeia'); c.ctxAgora = 25000; P.ver(c); ok(c.passando === 1, 'conversa nova que cresceu troca'); }
  { const { P, conversa, trocas } = montar(); await dorme(30); const c = conversa(); P.ver(c, true); await dorme(20); c.ultResp = 'x'; c.msgT = Date.now(); P.ver(c); await dorme(120); c.msgT = Date.now(); await dorme(120); ok(!trocas.length, 'Claude ativo adia a troca forçada'); await dorme(350); ok(trocas.length === 1, 'parou de vez: a troca forçada ainda acontece'); }
  { const { P, conversa, trocas } = montar(); const c = conversa({ fechado: true }); P.ver(c); ok(!c.passando && !trocas.length, 'conversa fechada não faz nada'); }
  { const { P, conversa } = montar(); fs.renameSync(nota, nota + '.x'); const c = conversa(); P.ver(c); ok(/passagem-abc\.md$/.test(c.arqPassagem), 'projeto sem PARADA usa nota própria'); fs.renameSync(nota + '.x', nota); }
}
function fiacao() {   // main.js really passes the switches and calls this module
  const m = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  ok(/CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = '1'/.test(m), 'ajudante preso à conversa ligado');
  ok(/BASH_MAX_TIMEOUT_MS = '3600000'/.test(m), 'comando longo pode durar até 1 hora');
  ok(/PASSAGEM\.ver\(c, true\)/.test(m) && /PASSAGEM\.ver\(c\)/.test(m), 'confere o limite no meio e no fim');
  ok(/AJUDANTES\.pararDaAba\(o\.id\)/.test(m), 'fim de resposta encerra ajudante que sobrou');
}
async function vivo() {
  const S = await import('@anthropic-ai/claude-agent-sdk'), claude = path.join(os.homedir(), '.local', 'bin', 'claude.exe');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-pass-vivo-')); fs.mkdirSync(path.join(dir, 'docs')); fs.writeFileSync(path.join(dir, 'docs', 'PARADA.md'), 'nothing yet');
  const env = { ...process.env, CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1' }; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_(CHILD_SESSION|ENTRYPOINT|MESSAGING_|SESSION_|SSE_PORT)|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
  const fila = () => { const it = []; let a = null, fim = false; return { por(t) { it.push({ type: 'user', message: { role: 'user', content: t }, parent_tool_use_id: null, session_id: '' }); if (a) { a(); a = null; } }, fechar() { fim = true; if (a) a(); }, iter: (async function* () { for (;;) { while (it.length) yield it.shift(); if (fim) return; await new Promise(r => a = r); } })() }; };
  const abrir = (o) => { const f = fila(), sessao = crypto.randomUUID(); return { o, sessao, fila: f, perms: new Map(), q: S.query({ prompt: f.iter, options: { cwd: dir, env, sessionId: sessao, pathToClaudeCodeExecutable: claude, settingSources: [], strictMcpConfig: true, model: process.env.FCC_MODELO || 'haiku', effort: 'low', permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true, includePartialMessages: true, systemPrompt: 'Follow instructions literally.' } }) }; };
  let velha = abrir({ dir }), nova = null, trocou = null, acabou;
  const pronto = new Promise(r => acabou = r), passos = () => [1, 2, 3, 4, 5, 6].filter(n => fs.existsSync(path.join(dir, `p${n}.txt`)));
  const P = PASS({ limite: () => 1000, aberta: (c) => !c.fechado, aviso: () => { }, trocar: (c) => { trocou = { continuar: c.continuar, feitos: passos().length }; c.fechado = true; c.fila.fechar(); try { c.q.close(); } catch { } nova = abrir({ dir, passagem: true }); ouvir(nova); nova.fila.por(`[New conversation: state in docs\\PARADA.md; read it and continue.]\n\nContinue the task now; do not stop until it is done or you need the user.`); } });
  function ouvir(c) { (async () => { try { for await (const m of c.q) { c.msgT = Date.now();
    if (m.type === 'stream_event' && !m.parent_tool_use_id && m.event.type === 'message_start') { const u = m.event.message.usage; c.ctxAgora = u.input_tokens + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0); if (c.ctx0 == null) c.ctx0 = c.ctxAgora; }
    if (m.type === 'assistant' && !m.parent_tool_use_id && m.message.content.some(b => b.type === 'tool_use')) P.ver(c, true);
    if (process.env.FCC_DEPURA) { const quem = c === nova ? 'NOVA' : 'velha'; if (m.type === 'assistant') for (const b of m.message.content) console.log(quem, b.type === 'tool_use' ? 'tool ' + b.name + ' ' + JSON.stringify(b.input).slice(0, 90) : b.type === 'text' ? 'texto ' + b.text.slice(0, 200) : b.type); if (m.type === 'user' && Array.isArray(m.message.content)) for (const b of m.message.content) if (b.type === 'tool_result') console.log(quem, 'res', JSON.stringify(b.content).slice(0, 120)); if (m.type === 'result') console.log(quem, 'RESULT', m.subtype, String(m.result).slice(0, 200)); }
    if (m.type === 'result') { c.ultResp = m.result; if (c === nova) return acabou(); P.ver(c); } } } catch (e) { if (!c.fechado) { console.log('erro', e.message); acabou(); } } })(); }
  ouvir(velha);
  velha.fila.por('Task with 6 steps. For each N from 1 to 6, in order, each in its own message, use Write to create pN.txt in the working directory containing N, one tool call at a time, never ending your turn before the last. When all 6 exist, reply FIM.');
  await Promise.race([pronto, dorme(240000)]);
  try { nova && nova.fila.fechar(); nova && nova.q.close(); } catch { }
  const f = passos(), par = fs.readFileSync(path.join(dir, 'docs', 'PARADA.md'), 'utf8');
  ok(trocou && trocou.feitos < 6, `trocou no meio da tarefa (${trocou && trocou.feitos} de 6 passos feitos)`);
  ok(trocou && trocou.continuar === true, 'Claude disse que faltava trabalho');
  ok(par !== 'nothing yet', 'nota gravada na conversa velha');
  ok(f.length === 6, `conversa nova terminou sozinha (${f.length} de 6)`);
  console.log('nota:', par.slice(0, 300).replace(/\n/g, ' | '));
}
(async () => {
  await unidade(); fiacao();
  if (process.argv.includes('--vivo')) await vivo();
  console.log(falhas ? `FALHOU: ${falhas}` : 'Tudo certo'); process.exit(falhas ? 1 : 0);
})();
