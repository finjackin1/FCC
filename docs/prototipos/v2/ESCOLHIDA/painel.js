// Project sheet = proposal B "painel novo" (27/10/2026, user chose B from docs\prototipos\testar).
// Top: name + Pasta / Abrir o programa (Escolher IA moved to top bar 28/10); text box; below, half "Para testar" (big box, only its list scrolls),
// half previous conversations + instructions/memory. Checked item sinks to "Testados"; goes with next message (app: comTestes).
(function () {
  const { S, P, esc, ico } = M;
  const nome = (q) => S.alias[q.n] || q.n;
  S.tst = S.tst || {};
  const marcados = (q) => (S.tst[q.n] || []).filter(x => q.itens.includes(x));
  const faltam = (q) => q.itens.filter(x => !marcados(q).includes(x));
  const aberto = (q) => S.tlAb === q.n;

  // ---- list: pending on top, divider, tested below ----
  function itemHTML(q, x) {
    const k = q.itens.indexOf(x), m = marcados(q).includes(x);
    return `<label class="tl-it ${m ? 'feito' : ''}" data-tk="${k}"><input type="checkbox" data-tl="${esc(q.n)}" data-k="${k}" ${m ? 'checked' : ''}><span class="tl-ck">${ico('ok')}</span><span class="tl-tx">${esc(x)}</span></label>`;
  }
  function listaHTML(q) {
    const f = faltam(q), m = marcados(q);
    let h = `<div class="tl-lista dentro">`;
    h += f.length ? f.map(x => itemHTML(q, x)).join('') : `<div class="tl-fim" data-tk="fim">${ico('ok')}Tudo testado. Vai junto da próxima mensagem.</div>`;
    if (m.length) h += `<div class="tl-sep" data-tk="sep"><span>Testados · ${m.length}</span><small>vão na próxima mensagem; o Claude lê e tira daqui</small></div>` + m.map(x => itemHTML(q, x)).join('');
    return h + '</div>';
  }
  const anel = (q, r) => { const t = q.itens.length, m = marcados(q).length, c = 2 * Math.PI * r, s = r * 2 + 8;
    return `<svg class="tl-anel" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="tr"/><circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="vl" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - (t ? m / t : 0))}"/></svg>`; };
  // closed: ring + faded glimpse of the list; open: list fills the column
  function caixa(q) {
    const f = faltam(q), m = marcados(q);
    if (!aberto(q)) return `<button class="tb" data-act="tl:${esc(q.n)}"><div class="tb-top">${anel(q, 34)}<div class="tb-num"><b>${f.length}</b><span>${f.length === 1 ? 'teste falta' : 'testes faltam'}</span>${m.length ? `<small>${m.length} já marcado${m.length > 1 ? 's' : ''}</small>` : ''}</div></div>
      <div class="tb-tit">Para testar</div><div class="tb-vis">${f.slice(0, 4).map(x => `<div>${esc(x)}</div>`).join('')}</div><div class="tb-abre">${ico('baixo')}Abrir a lista</div></button>`;
    return `<div class="tb ab"><button class="tb-cab" data-act="tl:${esc(q.n)}">${anel(q, 11)}<b>Para testar</b><span>${f.length} ${f.length === 1 ? 'falta' : 'faltam'}</span><span class="chev">${ico('cima')}</span></button>${listaHTML(q)}</div>`;
  }

  const conversasHTML = (q, i) => { const c = q.conversas || []; return c.length ? `<div class="j-lista">${c.map(x => `<div class="j-it">${ico('chat')}<span>${esc(x.txt)}</span><small>${esc(x.quando)}${x.tok ? ' · ' + esc(x.tok) + ' tokens' : ''}</small><button class="c-btn" data-act="retomar:${i}:${esc(x.id)}">Retomar</button></div>`).join('')}</div>` : `<div class="f-vazio">Nenhuma conversa ainda neste projeto.</div>`; };
  const cabHTML = (q) => `<div class="f-cab"><div class="big">${M.icoProj(q)}</div><div><h1>${S.ren === q.n ? `<input class="ren grande" value="${esc(nome(q))}" data-ren="${esc(q.n)}">` : `${esc(nome(q))}<button class="ib" data-act="renomear:${esc(q.n)}" title="Renomear">${ico('lapis')}</button>`}</h1>
      <div class="d">${esc(q.d)}${q.d ? ' · ' : ''}pasta ${esc(q.n)} · <span class="pil p-${q.st}">${M.ROT[q.st]}</span></div></div></div>`;
  const comecaHTML = (q, i) => { const a = M.conversaDe(q), ent = S.op && S.op.enter === 'Nova conversa';
    return `<div class="f-comeca"><div class="c-anxs" id="f-anxs"></div><textarea class="ph f-txt" id="f-txt" rows="2" spellcheck="false" placeholder="Como posso ajudar em ${esc(nome(q))}?" data-proj="${i}"></textarea><div class="f-lin">${M.chipModelo(a || null)}<span class="vao"></span>${a ? `<button class="c-btn prim" data-act="aba:${a.id}">${ico('chat')}Ir para a conversa<kbd>Enter</kbd></button>` : `<button class="c-btn" data-act="nova:${i}">${ico('chat')}Nova conversa${ent ? '<kbd>Enter</kbd>' : ''}</button><button class="c-btn prim" data-act="continuar:${i}">${ico('play')}Continuar de onde parou${ent ? '' : '<kbd>Enter</kbd>'}</button>`}</div></div>`; };
  const memHTML = (q, i) => (q.mem || []).map(x => `<div class="f-mem" data-act="editar-arq:${i}:${esc(x.arq || '')}">${ico('doc')}<span>${esc(x.n)}</span><small>${esc(x.d)}</small></div>`).join('');
  const temTst = (q) => q.itens && q.itens.length;

  // project switch: same entry animation as vivo.js (which only knows the old sheet markup)
  let fUlt = null, fT = 0; const entrou = (q) => { if (q.n !== fUlt) { fUlt = q.n; fT = Date.now(); } return Date.now() - fT < 500 ? ' f-entra' : ''; };
  const fi0 = M.fichaHTML;
  M.fichaHTML = (q) => {
    if (S.vazio || !q) return fi0(q);
    const i = P.indexOf(q), cl = (aberto(q) ? ' tl-ab' : '') + entrou(q) + '" style="--cor:' + (M.corDe ? M.corDe(q.n) : '');
    return `<div class="ficha tl vb${cl}"><div class="vb-topo">${cabHTML(q)}<div class="vb-at"><button class="c-btn" data-act="pasta:${i}">${ico('pasta')}Pasta</button>${q.prog ? `<button class="c-btn" data-act="programa:${i}">${ico('play')}Abrir o programa</button>` : ''}</div></div>${comecaHTML(q, i)}
      <div class="vb-grade"><div class="vb-esq">${temTst(q) ? caixa(q) : `<div class="tb vazia">${ico('ok')}<b>Nada para testar</b><span>${esc(q.voce ? 'Você precisa: ' + q.voce : 'Quando o Claude pedir um teste, ele aparece aqui.')}</span></div>`}</div>
        <div class="vb-dir"><div class="vb-card vb-conv"><div class="f-ct">${ico('chat')}Conversas anteriores<span class="q">${(q.conversas || []).length}</span></div>${conversasHTML(q, i)}</div>
          <div class="vb-card"><div class="f-ct">${ico('lampada')}Instruções e memória<button class="ib" data-act="pasta:${i}" title="Abrir a pasta">${ico('pasta')}</button></div><div class="f-mem" data-act="editar-arq:${i}:CLAUDE.md">${ico('doc')}<span>CLAUDE.md</span><small>instruções do projeto</small></div>${memHTML(q, i)}</div></div></div></div>`;
  };

  // ---- animations (only on their own event; normal redraw does not replay) ----
  const lista = () => document.querySelector('.tl-lista');
  const d0 = M.draw;   // redraw keeps list scroll
  M.draw = (...a) => { const l = lista(), st = l ? l.scrollTop : 0; const r = d0.apply(M, a); const n = lista(); if (n && l) n.scrollTop = st; return r; };
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  function abrirAnim() {
    [...document.querySelectorAll('.tl-lista > *')].forEach((e, j) => { if (e.getBoundingClientRect().top > innerHeight) return;
      e.animate([{ opacity: 0, transform: 'translateY(-14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 380 + j * 25, delay: j * 28, easing: EASE, fill: 'backwards' }); });
  }
  function fecharAnim(fim) {
    const its = [...document.querySelectorAll('.tl-lista > *')]; if (!its.length) return fim();
    const lr = lista().getBoundingClientRect(); let u = null;
    its.forEach((e, j) => { const r = e.getBoundingClientRect(); if (r.bottom < lr.top || r.top > lr.bottom) { e.style.opacity = 0; return; }
      u = e.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px) scale(.94)' }], { duration: 200, delay: Math.max(0, (its.length - j) * 12 - 40), easing: 'ease-in', fill: 'forwards' }); });
    u ? u.finished.then(fim) : fim();
  }
  // check: item sinks and moves down to "Testados"; the others move up (FLIP)
  function mover(q, k, marcar) {
    const antes = new Map([...document.querySelectorAll('.tl-lista [data-tk]')].map(e => [e.dataset.tk, e.getBoundingClientRect()]));
    const it = q.itens[k], L = S.tst[q.n] = (S.tst[q.n] || []).filter(x => x !== it); if (marcar) L.push(it);
    if (M.salvarTestes) M.salvarTestes(); M.draw();
    for (const e of document.querySelectorAll('.tl-lista [data-tk]')) {
      const a = antes.get(e.dataset.tk), b = e.getBoundingClientRect();
      if (!a) { e.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 160, easing: EASE, fill: 'backwards' }); continue; }
      const dy = a.top - b.top;
      if (e.dataset.tk === String(k)) {
        e.classList.add('vai'); const f = marcar ? .9 : 1.04, op = marcar ? .45 : 1;
        e.animate([{ transform: `translateY(${dy}px)`, opacity: 1 }, { transform: `translateY(${dy}px) scale(${f})`, opacity: op, offset: .22 }, { transform: `translateY(0) scale(${f})`, opacity: op, offset: .78 }, { transform: 'none', opacity: 1 }], { duration: 720, easing: 'cubic-bezier(.45,.05,.25,1)' }).finished.then(() => e.classList.remove('vai'));
      } else if (dy) e.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 380, delay: 140, easing: EASE, fill: 'backwards' });
    }
  }
  document.addEventListener('change', (e) => {
    const c = e.target.closest && e.target.closest('input[data-tl]'); if (!c) return;
    e.stopImmediatePropagation(); const q = P.find(x => x.n === c.dataset.tl); if (q) mover(q, +c.dataset.k, c.checked);
  }, true);

  function alternar(n) {
    if (S.tlAb === n) return fecharAnim(() => { S.tlAb = null; M.draw(); });
    S.tlAb = n; M.draw(); abrirAnim();
  }
  // prototype only: sent message takes checked items away (the program does it for real in app.js comTestes)
  function enviarTestes(q) {
    if (window.api || !q) return; const m = marcados(q); if (!m.length) return;
    q.itens = q.itens.filter(x => !m.includes(x)); S.tst[q.n] = []; S.tlAb = null;
    setTimeout(() => { S.toast = `${m.length} ${m.length > 1 ? 'testes foram' : 'teste foi'} junto da mensagem; o Claude leu e tirou da lista.`; M.draw(); setTimeout(() => { S.toast = ''; M.draw(); }, 3500); }, 60);
  }
  const ag0 = M.agir;
  M.agir = (a) => {
    const [k, ...r] = a.split(':'), v = r.join(':');
    if (k === 'tl') return alternar(v);
    if (k === 'programa' && !window.api) { S.toast = 'Abriria o programa do projeto.'; M.draw(); setTimeout(() => { S.toast = ''; M.draw(); }, 2500); return; }
    if (['continuar', 'nova', 'retomar'].includes(k)) enviarTestes(P[parseInt(v)]);
    if (k === 'aba') { const t = S.abas.find(x => x.id === v); if (t) enviarTestes(t.p); }
    if (S.tlAb && k !== 'tl') S.tlAb = null;
    return ag0(a);
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.tlAb && !S.modal) { e.preventDefault(); e.stopImmediatePropagation(); return alternar(S.tlAb); }
    if (e.key === 'Enter' && !e.shiftKey && !M.aba() && !S.modal && !S.paleta && M.p() && !(e.target.closest && e.target.closest('input.ren'))) enviarTestes(M.p());
  }, true);
  if (M.CENAS) Object.assign(M.CENAS, { 'tl-aberta': () => { S.tlAb = 'FCC'; } });
})();
