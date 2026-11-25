// Big conversation handoff (02/11/2026, user request: at the token limit it moves by itself, closes the old one, opens the new one).
// Over the limit (fcc.ini passagem=, 0 = off), at the end of a reply or between tools: Claude notes the state, answers PENDENTE (work left) or PRONTO
// (nothing left / waiting for the user), then the tab moves to a new conversation. PENDENTE = new conversation resumes alone. Pure: main.js gives the wiring.
const fs = require('fs'), path = require('path');
const MARCA = /^\W*(PENDENTE|PRONTO)\W*$/i;
const FOLGA = 20000;   // conversation born from a handoff must grow this much first: a big CLAUDE.md can't cause an endless chain
// 14/11 (his request, smoother handoff): from SUAVE x limit it waits for the reply to end (task done, no tools running) before switching;
// only past DURO x limit it switches in the middle of a task too.
const SUAVE = 0.8, DURO = 1.25;
// last exchanges of the old conversation, carried verbatim (user) / cut (Claude) into the new one. msgs = raw SDK session messages.
function recentes(msgs, n = 8, maxEu = 1000, maxIa = 500, total = 12000) {
  const txt = (c) => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : '';
  const temRes = (c) => Array.isArray(c) && c.some(b => b && b.type === 'tool_result');
  const corta = (t, m) => { t = String(t || '').replace(/\n{3,}/g, '\n\n').trim(); return t.length > m ? t.slice(0, m) + '…' : t; };
  const turnos = [];
  for (const m of msgs || []) {
    const c = m && m.message && m.message.content;
    if (m.type === 'user' && !m.isMeta && !m.parent_tool_use_id && !temRes(c)) {
      let t = txt(c).replace(/^\[New conversation:[^\]]*\](?:\s*Last exchanges of the previous conversation[\s\S]*?\[\/end of previous exchanges\])?\s*/, '').trim();
      if (!t || /^\[FCC\] Context \d+k tokens/.test(t) || /^Continue the task now;/.test(t) || /^<(command|local-command)/.test(t)) { turnos.push(null); continue; }
      turnos.push({ eu: t, ia: '' });
    } else if (m.type === 'assistant' && !m.parent_tool_use_id && turnos.length && turnos[turnos.length - 1]) { const t = txt(c).trim(); if (t) turnos[turnos.length - 1].ia = t; }
  }
  const L = turnos.filter(Boolean).slice(-n); let out = [], tam = 0;
  for (const x of L.reverse()) { const b = `USER: ${corta(x.eu, maxEu)}\nYOU: ${corta(x.ia, maxIa) || '(no text reply)'}`; if (tam + b.length > total) break; out.unshift(b); tam += b.length; }
  return out.join('\n\n');
}

module.exports = Object.assign(({ limite, aberta, trocar, aviso, espera = 60000 }) => {
  function fim(c, continuar) { clearTimeout(c.passTimer); c.passando = 2; c.continuar = !c.parou && !!continuar; return trocar(c); }
  function aposResposta(c) {
    const m = String(c.ultResp || '').match(MARCA);
    if (m) return fim(c, /PENDENTE/i.test(m[1]));
    let nota = false; try { nota = fs.statSync(c.arqPassagem).mtimeMs >= c.passT0; } catch { }
    if (nota) return fim(c, c.passMeio);
    // order not read yet (turn ended first) or answered off-script: order becomes the next turn; if none comes, move anyway so the tab never hangs
    clearTimeout(c.passTimer);
    const armar = () => { c.passTimer = setTimeout(() => { if (c.passando !== 1 || !aberta(c)) return; if (Date.now() - (c.msgT || 0) >= espera) fim(c, c.passMeio); else armar(); }, espera); }; armar();
  }
  return {
    pedido: (mil, rel) => `[FCC] Context ${mil}k tokens: a NEW conversation replaces this one now. Stop the current task here and run no more tools except what this needs. Overwrite ${rel} (≤14 lines, terse English) with the exact state: task in progress, done, remaining, next step, last question asked to the user, files touched; keep items still pending from that file. Also, so nothing is lost: "Decided:" what the user decided or asked in this conversation that is not yet in the code or docs; "Read:" files/lines already read and the facts that matter (path:line + 1 fact each); "Tried:" what was tried and failed, and why. Reply with one word only: PENDENTE if work remains that needs nothing from the user, PRONTO if nothing remains or you are waiting for the user.`,
    // noMeio = Claude just called a tool (message reaches it at the next tool result; tested 02/11). Never on a final text: phase 1 would hide that reply from the user.
    ver(c, noMeio) {
      if (!aberta(c)) return;
      if (c.passando === 1) return noMeio ? undefined : aposResposta(c);
      const lim = limite();
      if (c.passando || !(lim > 0) || !(c.ctxAgora > lim * SUAVE) || c.perms.size) return;
      if (noMeio && !(c.ctxAgora > lim * DURO)) return;   // between soft and hard limit: only when the reply ends (task done)
      if (c.o.passagem && c.ctxAgora - (c.ctx0 || 0) < FOLGA) return;
      const par = path.join(c.o.dir, 'docs', 'PARADA.md');
      c.arqPassagem = fs.existsSync(par) ? par : path.join(c.o.dir, '.claude', `passagem-${String(c.sessao).slice(0, 8)}.md`);
      c.passando = 1; c.passMeio = !!noMeio; c.passT0 = Date.now(); c.parou = false;
      const mil = Math.round(c.ctxAgora / 1000);
      aviso(c, mil);
      c.fila.por(this.pedido(mil, path.relative(c.o.dir, c.arqPassagem)));
    },
  };
}, { recentes });
