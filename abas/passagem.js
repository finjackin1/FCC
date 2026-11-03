// Big conversation handoff (02/11/2026, user request: at the token limit it moves by itself, closes the old one, opens the new one).
// Over the limit (fcc.ini passagem=, 0 = off), at the end of a reply or between tools: Claude notes the state, answers PENDENTE (work left) or PRONTO
// (nothing left / waiting for the user), then the tab moves to a new conversation. PENDENTE = new conversation resumes alone. Pure: main.js gives the wiring.
const fs = require('fs'), path = require('path');
const MARCA = /^\W*(PENDENTE|PRONTO)\W*$/i;
const FOLGA = 20000;   // conversation born from a handoff must grow this much first: a big CLAUDE.md can't cause an endless chain

module.exports = ({ limite, aberta, trocar, aviso, espera = 60000 }) => {
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
    pedido: (mil, rel) => `[FCC] Context ${mil}k tokens: a NEW conversation replaces this one now. Stop the current task here and run no more tools except what this needs. Overwrite ${rel} (≤8 lines, terse English) with the exact state: task in progress, done, remaining, next step, pending decisions, last question asked to the user, files touched; keep items still pending from that file. Reply with one word only: PENDENTE if work remains that needs nothing from the user, PRONTO if nothing remains or you are waiting for the user.`,
    // noMeio = Claude just called a tool (message reaches it at the next tool result; tested 02/11). Never on a final text: phase 1 would hide that reply from the user.
    ver(c, noMeio) {
      if (!aberta(c)) return;
      if (c.passando === 1) return noMeio ? undefined : aposResposta(c);
      const lim = limite();
      if (c.passando || !(lim > 0) || !(c.ctxAgora > lim) || c.perms.size) return;
      if (c.o.passagem && c.ctxAgora - (c.ctx0 || 0) < FOLGA) return;
      const par = path.join(c.o.dir, 'docs', 'PARADA.md');
      c.arqPassagem = fs.existsSync(par) ? par : path.join(c.o.dir, '.claude', `passagem-${String(c.sessao).slice(0, 8)}.md`);
      c.passando = 1; c.passMeio = !!noMeio; c.passT0 = Date.now(); c.parou = false;
      const mil = Math.round(c.ctxAgora / 1000);
      aviso(c, mil);
      c.fila.por(this.pedido(mil, path.relative(c.o.dir, c.arqPassagem)));
    },
  };
};
