// Claude auto mode (23/10/2026, user request): each message picks model + thinking by request type,
// with minimum tokens. Choice made HERE, by rules (0 tokens: no asking another model), and it learns:
//  - user switched model/thinking by hand right after  → that request type goes up or down a step;
//  - next message complains ("não funcionou", "de novo"…) → previous request type goes up a step;
//  - request solved easily on a high step (few tools, short reply) several times → goes down a step;
//  - request that became long work on a low step → goes up now, midway (escalate) and for next time.
// Switching MODEL loses conversation cache (all reread from scratch); switching only thinking doesn't. So, with big conversation,
// model only goes up (going down would cost more tokens than it saves).
'use strict';
const fs = require('fs');

// 24/10 (user request): no Fable and no thinking above High in auto; High only while task needs it
// 25/10 (user request): Low thinking is default for each model; Medium/High only for hard/big (thinking counts as output, the costly part)
const ESCADA = [['haiku', 'low'], ['sonnet', 'low'], ['sonnet', 'medium'], ['opus', 'low'], ['opus', 'medium'], ['opus', 'high']];
const NOME = { haiku: 'Haiku 5.5', sonnet: 'Sonnet 5.5', opus: 'Opus 5.5', fable: 'Fable 5.1' }, ESF = { low: 'Baixo', medium: 'Médio', high: 'Alto', xhigh: 'Muito alto', max: 'Máximo' };
// type → initial step (learning adds or subtracts); LARGEST match wins
const TIPOS = [
  ['grande', 5, /\b(projeto novo|do zero|reescrev\w*|refa(z|zer|ça) tudo|sistema (inteiro|completo)|arquitetura|migr(ar|e|ação) (tudo|o projeto))\b/i],
  ['difícil', 4, /(n[ãa]o funciona|bug|trav(a|ou|ando)|crash|fecha sozinho|investig|engenharia reversa|decompil|hook|otimiz|desempenho|lento|demora|refator|vazamento|race|concorr)/i],
  ['tarefa', 3, /\b(fa[çc]a|faz|cri(e|a|ar)|implement\w*|adicion\w*|coloc\w*|mud(e|ar)|troqu\w*|corrij\w*|consert\w*|arrum\w*|remov\w*|tir(e|ar)|ajust\w*|melhor(e|ar)|build|empacot\w*|instal\w*|escrev\w*|gere|gerar|configur\w*|integr\w*)\b/i],
  ['pergunta', 1, /(\?\s*$|^(o que|como|por ?que|qual|quais|quando|onde|quanto|explic\w*|me (diz|fala|explica)|existe|dá pra|da pra|é possível))/i],
  ['papo', 0, /^(oi|ol[áa]|bom dia|boa (tarde|noite)|obrigad\w*|valeu|blz|beleza|kk+|haha|tchau|t[áa] bom)\b/i],
];
const CONTINUAR = /^\s*(continu(e|ar)|segue|siga|pode (come[çc]ar|seguir|continuar|fazer)|manda ver|vai)\b/i;
const CURTA = /^\s*(sim|n[ãa]o|ok|isso|pode|claro|a|b|c|d|\d+|op[çc][ãa]o \w+)\s*[.!]?\s*$/i;     // reply to a question from user: stays where it is
const QUEIXA = /(n[ãa]o (funcionou|deu certo|era isso|resolveu|mudou nada)|errad|de novo|piorou|n[ãa]o entendeu|continua (igual|errado|dando)|ainda (n[ãa]o|est[áa]|t[áa]) )/i;

module.exports = function (arq, logApp) {
  let A = null;
  const ler = () => { if (A) return A; try { A = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { A = {}; } A.tipos = A.tipos || {}; A.hist = A.hist || []; return A; };
  const salvar = () => { try { A.hist = A.hist.slice(-300); fs.writeFileSync(arq, JSON.stringify(A, null, 1), 'utf8'); } catch (e) { logApp('auto: ' + e.message); } };
  const T = (tipo) => { const a = ler(); return a.tipos[tipo] || (a.tipos[tipo] = { aj: 0, folga: 0, n: 0 }); };
  const degrauDe = (m, e) => { let i = ESCADA.findIndex(x => x[0] === m && x[1] === e); if (i >= 0) return i; i = ESCADA.findIndex(x => x[0] === m); return i < 0 ? 3 : i; };
  const ajustar = (tipo, d, porque) => { if (!tipo) return; const t = T(tipo); const v = Math.max(-3, Math.min(3, t.aj + d)); if (v !== t.aj) { t.aj = v; t.folga = 0; ler().hist.push({ q: Date.now(), tipo, aj: v, porque }); salvar(); } };

  function tipoDe(txt, ant) {
    const s = String(txt || '').trim();
    if (CURTA.test(s) && ant) return { tipo: ant.tipo, manter: true };
    if (CONTINUAR.test(s)) return { tipo: ant ? ant.tipo : 'tarefa', base: ant ? null : 3 };
    let tipo = null, base = -1;
    for (const [n, b, re] of TIPOS) if (b > base && re.test(s)) { tipo = n; base = b; }
    if (!tipo) { tipo = s.length < 80 ? 'pergunta' : 'tarefa'; base = s.length < 80 ? 1 : 3; }
    const extra = (s.length > 900 ? 1 : 0) + ((s.match(/^\s*([-*•]|\d+[.)])\s/mg) || []).length >= 3 ? 1 : 0);    // long request or with several items
    return { tipo, base: Math.min(ESCADA.length - 1, base + extra) };
  }

  // before each message: c = { modelo, esf, auto: { ant, ctx } } → { modelo, esf, tipo, aviso } or null (no change)
  function escolher(c, txt) {
    const ant = c.auto.ant, k = tipoDe(txt, ant);
    if (ant && QUEIXA.test(txt)) ajustar(ant.tipo, +1, 'reclamou da resposta');
    if (k.manter) { c.auto.ant = { ...ant, t: Date.now() }; return null; }
    const t = T(k.tipo); t.n++;
    const base = k.base != null ? k.base : Math.min(ant.degrau, ESCADA.length - 1);
    let alvo = Math.max(0, Math.min(ESCADA.length - 1, base + (k.base != null ? t.aj : 0)));
    let [modelo, esf] = ESCADA[alvo];
    const agora = degrauDe(c.modelo, c.esf);
    // big conversation: lowering model rereads all without cache (costs more); only thinking goes down
    if (modelo !== c.modelo && alvo < agora && (c.auto.ctx || 0) > 25000) { modelo = c.modelo; esf = ESCADA[alvo][1]; if (!ESCADA.some(x => x[0] === modelo && x[1] === esf)) esf = c.esf; }
    c.auto.ant = { tipo: k.tipo, degrau: alvo, t: Date.now(), ferr: 0, modelo, esf, trocas: 0 };
    ler().hist.push({ q: Date.now(), tipo: k.tipo, modelo, esf }); salvar();
    if (modelo === c.modelo && esf === c.esf) return null;
    return { modelo, esf, tipo: k.tipo, aviso: `Automático: ${NOME[modelo]} · pensamento ${ESF[esf]} (${k.tipo})` };
  }
  // mid-reply: "simple" request that became long work → go up now (and learn)
  function escalar(c) {
    const a = c.auto.ant; if (!a || a.escalou) return null;
    a.ferr = (a.ferr || 0) + 1;
    if (a.ferr < 15 || degrauDe(c.modelo, c.esf) >= 3) return null;
    a.escalou = true; ajustar(a.tipo, +1, 'virou trabalho longo');
    return { modelo: 'opus', esf: 'medium', aviso: `Automático: ${NOME.opus} · pensamento Médio (o pedido ficou maior do que parecia)` };
  }
  // end of reply: solved easily on high step, several times → down a step for that type
  function fim(c, uso) {
    const a = c.auto.ant; if (!a) return; c.auto.ctx = uso && uso.ent || c.auto.ctx;
    if (a.degrau >= 3 && (a.ferr || 0) <= 2 && uso && uso.sai < 1500) { const t = T(a.tipo); t.folga++; if (t.folga >= 6) ajustar(a.tipo, -1, 'resolveu com folga 6 vezes'); else salvar(); }
  }
  // user switched by hand: last request type learns where user wants it
  function trocouNaMao(c, modelo, esf) {
    const a = c.auto.ant; if (!a || Date.now() - a.t > 15 * 60000) return;
    const novo = degrauDe(modelo || c.modelo, esf || c.esf), era = degrauDe(c.modelo, c.esf);
    if (novo !== era) ajustar(a.tipo, novo > era ? +1 : -1, 'trocou na mão');
  }
  // Claude itself switched (trocar_modelo tool, per-task plan): store WHEN and WHERE TO, per request type.
  // 1st switch right at start (≤ 1 tool) = initial choice was wrong; 3 times same direction → type changes step
  function trocaDoClaude(c, modelo, esf, tarefa) {
    const a = c.auto.ant || (c.auto.ant = { tipo: 'tarefa', degrau: degrauDe(c.modelo, c.esf), t: Date.now(), ferr: 0, trocas: 0 });
    const de = degrauDe(c.modelo, c.esf), para = degrauDe(modelo, esf);
    ler().hist.push({ q: Date.now(), tipo: a.tipo, troca: `${c.modelo}/${c.esf}→${modelo}/${esf}`, ferr: a.ferr || 0, seg: Math.round((Date.now() - a.t) / 1000), tarefa: String(tarefa || '').slice(0, 80) });
    if (!a.trocas && (a.ferr || 0) <= 1 && para !== de) { const t = T(a.tipo); t.puxa = (t.puxa || 0) + (para > de ? 1 : -1); if (Math.abs(t.puxa) >= 3) { const d = Math.sign(t.puxa); t.puxa = 0; ajustar(a.tipo, d, 'o Claude corrigiu a escolha inicial 3 vezes'); } }
    a.trocas = (a.trocas || 0) + 1; salvar();
  }
  // learned summary for Claude (few words): which step it usually goes to per type
  function dicas() {
    const H = ler().hist.filter(x => x.troca).slice(-150), P = {};
    for (const x of H) { const k = x.tipo, alvo = x.troca.split('→')[1]; (P[k] = P[k] || {})[alvo] = (P[k][alvo] || 0) + 1; }
    const L = Object.entries(P).map(([k, v]) => { const [m, n] = Object.entries(v).sort((a, b) => b[1] - a[1])[0]; return n >= 3 ? `${k}→${m}` : null; }).filter(Boolean);
    return L.length ? 'Aprendido: ' + L.join(', ') + '.' : '';
  }
  return { escolher, escalar, fim, trocouNaMao, trocaDoClaude, dicas, tipoDe, ESCADA };
};
