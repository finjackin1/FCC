// Bridge between UI COPIED FROM PROTOTYPE (tela\v2\*, by ferramentas\copiar-prototipo.ps1) and app (23/10/2026).
// Prototype has object M with state, sample data and fake actions; here M is the same, but app.js wires
// real state (M.S = app's S, M.P = project list) and real actions (M.app.agir). No UI code rewritten.
(function () {
  const B = window.B, C = window.CHAT;
  const S = {}, P = [];
  const M = window.M = {
    S, P, D: { local: {}, lim: {}, conta: {} }, CENAS: {}, app: null,
    esc: B.esc, ico: B.ico, ast: B.ast, I: B.I,
    ROT: { testar: 'você testa', decidir: 'você decide', livre: 'livre', parado: 'parado' },
    nomeMod: (id) => C.nomeMod(id), ehLocal: (id) => C.ehLocal(id),
    aba: () => (M.app ? M.app.conversa() : null),
    p: () => (M.app ? M.app.projSel() : null),
    conversaDe: (x) => (M.app ? M.app.conversaDe(x) : null),
    projAtual: () => { const t = M.aba(), q = t && t.p ? t.p : M.p(); return q ? (M.P.find(x => x.dir && q.dir && x.dir.toLowerCase() === q.dir.toLowerCase()) || q) : q; },   // same list object (list reread from disk)
    livres: () => (M.app ? M.app.livres() : []),
    agir: (a) => M.app && M.app.agir(a),
    draw: () => M.app && M.app.draw(),
    modalHTML: () => '',
    salvar: (tipo, k) => M.app && M.app.salvar(tipo, k),
  };
  M.botoesJanela = B.ligar(M);
})();
