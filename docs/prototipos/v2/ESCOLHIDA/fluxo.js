// First-run flow (25/10/2026, prototype docs\prototipos\primeira-vez, approved with choice screen). S.fluxo = current step.
// Claude: c-preparar (installs Claude Code) → c-login → c-esperando → c-ok. 21/11: FCC is Claude-only (no choice screen, no local AI steps).
// Then: folder → tour (over real UI). Standalone: bloqueado (Claude thing without account), sem-internet, login-falhou.
// data-act "fx…" actions: app handles in M.fluxoPrograma (app.js); prototype just navigates.
(function () {
  const { S } = M;
  // icons + Claude art (moved from the removed choice screen escolha.js, 21/11)
  const P = {
    ast: '<g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2"/></g>',
    nuvem: '<path d="M4.5 12.5h7a3 3 0 0 0 .4-6A4 4 0 0 0 4.2 7a2.8 2.8 0 0 0 .3 5.5z"/>',
    eng: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7 3.4 3.4"/>',
    ok: '<path d="M3 8.5l3.2 3L13 4.5"/>', x: '<path d="M4 4l8 8M12 4l-8 8"/>', min: '<path d="M3.5 8h9"/>', max: '<rect x="3.5" y="3.5" width="9" height="9" rx="1"/>',
    cad: '<rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>', pasta: '<path d="M2 4.5h4l1.2 1.5H14v6.5H2z"/>',
    seta: '<path d="M6 3.5 10.5 8 6 12.5"/>', volta: '<path d="M10 3.5 5.5 8 10 12.5"/>', chat: '<path d="M2.5 3.5h11v7.5H7l-3 2.5v-2.5H2.5z"/>', lapis: '<path d="M10.5 2.5l3 3L6 13H3v-3z"/>',
    baixo: '<path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10"/>', raio: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>', wifi: '<path d="M2 6.5a9 9 0 0 1 12 0M4.3 9a5.5 5.5 0 0 1 7.4 0M6.6 11.4a2 2 0 0 1 2.8 0"/><path d="M2 2l12 12"/>',
    escudo: '<path d="M8 1.8 13 4v4c0 3-2.2 5.2-5 6.2C5.2 13.2 3 11 3 8V4z"/>',
  };
  const I = (n, c = '') => `<svg class="ico ${c}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;

  // ---- Claude art: coral ember → plum, big breathing asterisk, chat bubbles rising ----
  const arteC = (o = {}) => { const fx = o.x ?? 300, fy = o.y ?? 220, fs = o.s ?? 1;
    const raios = Array.from({ length: 12 }, (_, i) => { const L = [168, 120, 150, 112, 172, 126, 156, 116, 164, 122, 148, 118][i]; return `<rect x="-11" y="${-L}" width="22" height="${L}" rx="11" transform="rotate(${i * 30})"/>`; }).join('');
    const bolhas = [[430, 600, 150, 46, 0], [470, 700, 190, 52, 2.2], [400, 520, 120, 40, 4.1], [540, 460, 120, 40, 5.6], [580, 640, 100, 36, 7]].map(([x, y, w, h, d]) =>
      `<g class="bolha" style="animation-delay:-${d}s"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/><rect x="${x + 18}" y="${y + h / 2 - 3}" width="${w * .55}" height="6" rx="3" class="lin"/></g>`).join('');
    return `<svg class="arte arte-c" viewBox="0 0 720 770" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <radialGradient id="c-f" cx="52%" cy="42%" r="78%"><stop offset="0" stop-color="#ff9a6b"/><stop offset=".28" stop-color="#ee5a52"/><stop offset=".56" stop-color="#9c2a5e"/><stop offset=".82" stop-color="#3a1534"/><stop offset="1" stop-color="#14161d"/></radialGradient>
      <radialGradient id="c-luz" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd7c2" stop-opacity=".9"/><stop offset="1" stop-color="#ffd7c2" stop-opacity="0"/></radialGradient>
      <linearGradient id="c-r" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffe0d2"/></linearGradient>
      <filter id="c-bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
      <filter id="c-gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0"/></filter></defs>
      <rect width="720" height="770" fill="url(#c-f)"/>
      <circle class="orbe o1" cx="140" cy="160" r="120" fill="#ff7849" opacity=".45" filter="url(#c-bl)"/><circle class="orbe o2" cx="600" cy="520" r="150" fill="#e0306a" opacity=".4" filter="url(#c-bl)"/>
      <circle cx="${fx}" cy="${fy}" r="${230 * fs}" fill="url(#c-luz)" opacity=".35"/>
      <g transform="translate(${fx} ${fy}) scale(${fs})"><g class="ast-g"><g fill="#ffb59a" opacity=".55" filter="url(#c-bl)">${raios}</g><g fill="url(#c-r)">${raios}</g><circle r="30" fill="#fff"/></g></g>
      <g class="bolhas" fill="#ffffff" fill-opacity=".1" stroke="#fff" stroke-opacity=".18">${bolhas}</g>
      <rect width="720" height="770" filter="url(#c-gr)"/></svg>`;
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const OK = `<span class="fx-ok"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg></span>`;
  const card = (h, larga) => `<div class="fx-cx"><div class="fx-card ${larga ? 'larga' : ''}">${h}</div></div>`;
  const fundo = () => `<div class="fx-fundo">${arteC({ x: 70, y: 120, s: .78 })}</div>`;
  const marca = (cl, ic) => `<div class="fx-marca ${cl}">${I(ic)}</div>`;
  const B = (t, a, c = '') => `<button class="fx-btn ${c}" data-act="${a}">${t}</button>`, Lk = (t, a) => `<button class="fx-lnk" data-act="${a}">${t}</button>`;
  const it = (n, d, st) => `<div class="fx-it"><div class="tx"><b>${n}</b><small>${d}</small></div>${st === 'ok' ? OK : st === 'gira' ? '<span class="fx-gira"></span>' : `<span class="st">${st}</span>`}</div>`;
  const T = {
    'c-preparar': () => fundo() + card(`${marca('cl', 'ast')}<h1>Preparando o Claude</h1><p>Instalo o que falta neste PC. Leva menos de um minuto e é só desta vez.</p>
      <div class="fx-chk">${it('Claude Code', 'o programa oficial da Anthropic que conversa com o Claude', S.fluxoEt === 'feito' ? 'ok' : S.fluxoEt === 'erro' ? 'falhou' : 'gira')}${it('Pasta de projetos', esc(M.D.raiz || 'Claude-Projects') + ' · ícones de cada projeto', 'ok')}</div>
      <div class="fx-acoes">${S.fluxoEt === 'erro' ? B('Tentar de novo', 'fx-instalar', 'prim') : ''}${B(I('volta') + 'Voltar', 'fx-voltar')}</div>`),
    'c-login': () => fundo() + card(`${marca('cl', 'ast')}<h1>Entre na sua conta do Claude</h1><p>O navegador abre na página da Anthropic. Entre lá e volte: o FCC percebe sozinho. Funciona com os planos Pro e Max.</p>
      <div class="fx-acoes">${B('Abrir o navegador<kbd>Enter</kbd>', 'fx-entrar', 'prim')}${B('Voltar', 'fx-voltar')}</div>`),
    'c-esperando': () => fundo() + card(`${marca('cl', 'ast')}<h1>Esperando você entrar…</h1><p>Termine no navegador. Esta tela muda sozinha quando você entrar.</p>
      <div class="fx-chk">${it('Aguardando a Anthropic', 'abriu no navegador · a página da conta do Claude', 'gira')}</div>
      <div class="fx-acoes">${B('Abrir o navegador de novo', 'fx-navegador')}${B('Cancelar', 'fx-cancelar')}</div>`),
    'c-ok': () => { const c = M.D.conta || {}; return fundo() + card(`<div class="fx-suc"><svg viewBox="0 0 36 36"><path d="M9 19l6 6 12-13"/></svg></div><h1>Pronto, você entrou!</h1><p>Tudo do Claude está liberado: projetos, conversas, resumo e limite de uso.</p>
      <div class="fx-conta"><span class="av">${esc((c.email || '?')[0].toUpperCase())}</span><div><b>${esc(c.email || '')}</b><small>Plano ${esc(c.plano || '—')}</small></div></div>
      <div class="fx-acoes">${B('Continuar<kbd>Enter</kbd>', 'fx-ir:pasta', 'prim')}</div>`); },
    pasta: () => fundo() + card(`${marca('cl', 'pasta')}<h1>Onde ficam os seus projetos?</h1><p>Cada pasta com um CLAUDE.md lá dentro vira um projeto no FCC. Escolha onde eles ficam:</p>
      ${S.fluxoPasta ? `<button class="fx-op on" data-act="fx-outra"><span class="rd"></span><div><b><code>${esc(S.fluxoPasta)}</code></b><small>${(M.P || []).length} projetos achados · clique para trocar</small></div></button>` : `<button class="fx-op" data-act="fx-outra"><span class="rd"></span><div><b>Escolher a pasta…</b><small>abre o Explorer para você escolher</small></div></button>`}
      <div class="fx-acoes">${B('Continuar<kbd>Enter</kbd>', 'fx-tour', 'prim')}</div>`),
    tour: () => '',   // drawn by tour(): over real UI
    bloqueado: () => `<div class="fx-veu"><div class="fx-card">${marca('cl', 'cad')}<h1>Isso usa o Claude</h1><p>Resumir a conversa, ver o limite de uso e trocar de conta precisam de uma conta do Claude (Pro ou Max).</p>
      <div class="fx-acoes">${B('Entrar no Claude', 'fx-ir:c-login', 'prim')}${B('Agora não', 'fx-fim')}</div></div></div>`,
    'sem-internet': () => fundo() + card(`${marca('', 'wifi')}<h1>Sem internet agora</h1><p>O Claude precisa de internet para entrar e conversar. Confira a conexão e tente de novo.</p>
      <div class="fx-acoes">${B('Tentar de novo', 'fx-claude', 'prim')}${B('Agora não', 'fx-fim')}</div>`),
    'login-falhou': () => fundo() + card(`${marca('', 'x')}<h1>Não deu para entrar</h1><p>${esc((M.D.login && M.D.login.erro) || 'A entrada foi cancelada ou o link expirou.')} Nada foi alterado: é só tentar de novo.</p>
      <div class="fx-acoes">${B('Tentar de novo', 'fx-entrar', 'prim')}${B('Agora não', 'fx-voltar')}</div>`),
  };
  // tour: 3 tips pinned to real elements (rail, AI button, message box)
  const ALVOS = [['.trilho .lista', 'Seus projetos', 'Cada projeto tem bolinhas de cor dizendo o que precisa: amarelo = testar, vermelho = decidir, verde = publicado. Passe o mouse para ver.', 'dir'],
    ['.f-comeca .bia, .bia', 'Modelo e pensamento', 'Este botão mostra o modelo do Claude e o pensamento. Clique (ou F4) para trocar.', 'baixo'],
    ['.f-comeca', 'Pode começar', 'Escreva aqui. Fechou uma conversa livre? Ela fica em Rascunhos e vira projeto quando você quiser.', 'baixo']];
  function tour() {
    const [sel, t, d, lado] = ALVOS[S.fluxoTour || 0], alvo = document.querySelector(sel); if (!alvo) return '';
    const r = alvo.getBoundingClientRect(), x = lado === 'dir' ? r.right + 16 : Math.max(8, Math.min(innerWidth - 316, r.left)), y = lado === 'dir' ? r.top : (r.bottom + 170 < innerHeight ? r.bottom + 12 : r.top - 170);
    return `<div class="fx-foco" style="left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>
      <div class="fx-dica" style="left:${x}px;top:${y}px"><b>${t}</b><p>${d}</p><div class="rod3"><span class="n">${(S.fluxoTour || 0) + 1} de 3</span>${Lk('Pular', 'fx-fim')}${B((S.fluxoTour || 0) < 2 ? 'Próxima' : 'Começar', 'fx-tour', 'prim')}</div></div>`;
  }
  let el = null, ult = null, ultTour = null;
  const SOBRE = new Set(['tour', 'bloqueado']);
  const caber = () => { if (!el) return; const t = document.querySelector('.topo'); el.style.top = (t ? t.getBoundingClientRect().bottom : 40) + 'px'; };
  M.desenharFluxo = () => {
    const f = S.fluxo;
    if (!f || !T[f]) { if (el) { el.remove(); el = null; ult = null; } return; }
    if (!el || !el.isConnected) { el = document.createElement('div'); el.id = 'fluxo'; document.body.appendChild(el); }
    el.className = SOBRE.has(f) ? 'sobre' : 'cheio'; caber();
    const h = f === 'tour' ? tour() : T[f](), nova = f !== ult || (f === 'tour' && S.fluxoTour !== ultTour);
    if (nova || el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = `<div class="fx-tela ${nova ? 'entra' : ''}">${h}</div>`; }   // entry only when step changes
    ult = f; ultTour = S.fluxoTour;
  };
  addEventListener('resize', () => { caber(); if (S.fluxo === 'tour') M.desenharFluxo(); });
  document.addEventListener('keydown', (e) => { if (!el || !S.fluxo) return;
    if (e.key === 'Enter') { const b = el.querySelector('.fx-btn.prim'); if (b) { e.preventDefault(); e.stopImmediatePropagation(); b.click(); } }
    else if (e.key === 'Escape' && S.fluxo !== 'tour') { e.preventDefault(); e.stopImmediatePropagation(); M.agir('fx-voltar'); } }, true);
  // prototype: just navigates; app swaps for real actions (M.fluxoPrograma returns true when handled)
  const ir = (t) => { S.fluxo = t; if (t && t.startsWith('c-')) S.fluxoCam = 'claude'; M.draw(); };
  const ag = M.agir;
  M.agir = (a) => {
    if (!a.startsWith('fx')) return ag(a);
    if (M.fluxoPrograma && M.fluxoPrograma(a)) return;
    const [k, v] = [a.split(':')[0], a.split(':').slice(1).join(':')];
    if (k === 'fx-ir') return ir(v);
    if (k === 'fx-voltar') { S.fluxo = null; return M.draw(); }
    if (k === 'fx-instalar') return ir('c-login'); if (k === 'fx-entrar') return ir('c-esperando'); if (k === 'fx-cancelar') return ir('login-falhou');
    if (k === 'fx-claude') return ir('c-login');
    if (k === 'fx-tour') { if (S.fluxo !== 'tour') { S.fluxoTour = 0; return ir('tour'); } if ((S.fluxoTour || 0) < 2) { S.fluxoTour++; return M.draw(); } return ir(null); }
    if (k === 'fx-fim') return ir(null);
    return M.draw();
  };
  // autotest scenes (one per step; app and prototype use same sample data)
  const C = {}; for (const t of Object.keys(T)) C['fluxo-' + t] = () => { S.fluxo = t; S.fluxoCam = 'claude'; S.fluxoTour = 0; S.fluxoEt = ''; S.fluxoPasta = ''; };
  Object.assign(M.CENAS || (M.CENAS = {}), C);
  if (!window.api) { const d0 = M.draw; M.draw = (...a) => { const r = d0.apply(M, a); M.desenharFluxo(); return r; }; }
})();
