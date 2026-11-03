// AI choice screen (25/10/2026, final approved: base A + background and info from B + sample window from C).
// Shows on 1st run (no account and no local AI) or always, if Options > Ao abrir > Começar com = "Tela de escolha".
// Each AI owns HALF the window: mouse anywhere on it opens seam art outward + sample + what you get.
// Own layer (#escolha, in body): survives UI redraws (entry plays once). Actions: escolha:claude / escolha:local.
(function () {
  const { S } = M;
  const P = {
    ast: '<g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2"/></g>',
    nuvem: '<path d="M4.5 12.5h7a3 3 0 0 0 .4-6A4 4 0 0 0 4.2 7a2.8 2.8 0 0 0 .3 5.5z"/>',
    cpu: '<rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M6.5 6.5h3v3h-3zM6 1.5V4M10 1.5V4M6 12v2.5M10 12v2.5M1.5 6H4M1.5 10H4M12 6h2.5M12 10h2.5"/>',
    eng: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7 3.4 3.4"/>',
    ok: '<path d="M3 8.5l3.2 3L13 4.5"/>', x: '<path d="M4 4l8 8M12 4l-8 8"/>', min: '<path d="M3.5 8h9"/>', max: '<rect x="3.5" y="3.5" width="9" height="9" rx="1"/>',
    cad: '<rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>', pasta: '<path d="M2 4.5h4l1.2 1.5H14v6.5H2z"/>',
    seta: '<path d="M6 3.5 10.5 8 6 12.5"/>', volta: '<path d="M10 3.5 5.5 8 10 12.5"/>', chat: '<path d="M2.5 3.5h11v7.5H7l-3 2.5v-2.5H2.5z"/>', lapis: '<path d="M10.5 2.5l3 3L6 13H3v-3z"/>',
    baixo: '<path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10"/>', raio: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>', wifi: '<path d="M2 6.5a9 9 0 0 1 12 0M4.3 9a5.5 5.5 0 0 1 7.4 0M6.6 11.4a2 2 0 0 1 2.8 0"/><path d="M2 2l12 12"/>',
    placa: '<rect x="1.5" y="4.5" width="13" height="7" rx="1.5"/><circle cx="6" cy="8" r="1.8"/><path d="M10 7h2.5M10 9h2.5M4 11.5v2M7 11.5v2"/>', escudo: '<path d="M8 1.8 13 4v4c0 3-2.2 5.2-5 6.2C5.2 13.2 3 11 3 8V4z"/>',
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

  // ---- Local AI art: board and chip in center, circuit traces with running pulses, fine grid ----
  const arteL = (o = {}) => { const fx = o.x ?? 420, fy = o.y ?? 210, fs = o.s ?? 1;
    const trilhas = [];
    [[-60, -90, -60, -260, 140, -300], [0, -90, 0, -330], [60, -90, 60, -200, 220, -230], [90, -40, 300, -40, 340, -120], [90, 20, 360, 20], [90, 60, 220, 60, 270, 190],
     [60, 90, 60, 330], [0, 90, 0, 220, -120, 280], [-60, 90, -60, 180, -300, 210], [-90, 40, -340, 40], [-90, -20, -230, -20, -280, -150], [-90, -60, -160, -60, -200, -260]].forEach((p, i) => {
      const pts = []; for (let k = 0; k < p.length; k += 2) pts.push(p[k] + ',' + p[k + 1]); const d = 'M' + pts.join(' L');
      trilhas.push(`<path d="${d}"/><path class="pulso-t" style="animation-delay:-${(i * .37).toFixed(2)}s" d="${d}"/><circle class="no" cx="${p[p.length - 2]}" cy="${p[p.length - 1]}" r="5" style="animation-delay:-${(i * .5).toFixed(1)}s"/>`);
    });
    const pinos = Array.from({ length: 6 }, (_, i) => { const o = -75 + i * 30; return `<rect x="${o - 4}" y="-104" width="8" height="16" rx="2"/><rect x="${o - 4}" y="88" width="8" height="16" rx="2"/><rect x="-104" y="${o - 4}" width="16" height="8" rx="2"/><rect x="88" y="${o - 4}" width="16" height="8" rx="2"/>`; }).join('');
    return `<svg class="arte arte-l" viewBox="0 0 720 770" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <radialGradient id="l-f" cx="48%" cy="42%" r="80%"><stop offset="0" stop-color="#3fb6ff"/><stop offset=".3" stop-color="#2a63d8"/><stop offset=".6" stop-color="#1a2f78"/><stop offset=".85" stop-color="#111a3a"/><stop offset="1" stop-color="#14161d"/></radialGradient>
      <pattern id="l-grade" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#9fd8ff" stroke-opacity=".08"/></pattern>
      <linearGradient id="l-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f6ff"/><stop offset="1" stop-color="#9ad7ff"/></linearGradient>
      <filter id="l-bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>
      <filter id="l-gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0"/></filter></defs>
      <rect width="720" height="770" fill="url(#l-f)"/><rect width="720" height="770" fill="url(#l-grade)"/>
      <circle class="orbe o1" cx="580" cy="150" r="130" fill="#22d3ee" opacity=".35" filter="url(#l-bl)"/><circle class="orbe o2" cx="120" cy="560" r="150" fill="#5b9dff" opacity=".4" filter="url(#l-bl)"/>
      <g transform="translate(${fx} ${fy}) scale(${fs})"><g class="trilhas" fill="none" stroke="#bfe6ff" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${trilhas.join('')}</g>
        <g class="chip-g"><rect x="-130" y="-130" width="260" height="260" rx="40" fill="#7cc8ff" opacity=".5" filter="url(#l-bl)"/><g fill="#cfeaff">${pinos}</g>
        <rect x="-90" y="-90" width="180" height="180" rx="26" fill="url(#l-chip)"/><rect x="-56" y="-56" width="112" height="112" rx="16" fill="#1d3f8f"/>
        <rect x="-36" y="-36" width="72" height="72" rx="10" fill="none" stroke="#7fd3ff" stroke-width="3"/><circle r="10" fill="#7fd3ff" class="nucleo"/></g></g>
      <rect width="720" height="770" filter="url(#l-gr)"/></svg>`;
  };

  M.arteE = { C: arteC, L: arteL, I };   // flow (fluxo.js) uses same arts and icons
  const G = (L) => L.map(([i, t, m]) => `<div class="${m ? 'menos' : ''}">${I(i)}<span>${t}</span></div>`).join('');
  M.escolhaHTML = () => `<div class="ep"><div class="bv"><div class="grade"></div><div class="lado c">${arteC({ x: 70, y: 120, s: .78 })}</div><div class="lado l">${arteL({ x: 650, y: 120, s: .78 })}</div><div class="emenda"></div>
    <div class="topo-e"><div class="kick">BEM-VINDO AO FCC</div><h1>Com qual IA você quer começar?</h1><div class="sub">Dá para usar as duas e trocar em cada conversa.</div></div>
    <div class="metade c" data-lado="claude" data-act="escolha:claude" tabindex="0" role="button" aria-label="Começar com o Claude" data-dica="CLAUDE|Clique: entrar com a conta e começar|As conversas novas abrem no Claude">
      <div class="marca-d">Claude</div>
      <div class="flut"><span class="mk">${I('ast')}</span><b>Claude</b><small>A mais inteligente · precisa de conta</small><span class="ir">${M.D.conta && M.D.conta.email ? 'Começar' : 'Entrar com a conta'} ${I('seta')}</span></div>
      <div class="prev"><div class="pt"><i></i><i></i><i></i></div><div class="eu">o login quebrou depois da atualização</div>
        <div class="ia"><span class="av" style="background:linear-gradient(135deg,var(--acento),var(--acento2))">${I('ast')}</span><span><span class="digita">Achei: o token vence antes da página voltar. </span><br><em>Corrigi em auth.js (3 linhas) e testei.</em></span></div></div>
      <div class="ganha">${G([['raio', 'Projetos grandes, código e decisões'], ['chat', 'Lê e mexe nos arquivos do projeto'], ['nuvem', 'Precisa de internet e conta Pro ou Max', 1], ['escudo', 'Limite de uso por 5 h e por semana', 1]])}</div></div>
    <div class="metade l" data-lado="local" data-act="escolha:local" tabindex="0" role="button" aria-label="Começar com a IA Local" data-dica="IA LOCAL|Clique: ${(S.locais || []).length ? 'começar com a IA do seu PC' : 'escolher e baixar uma IA'}|As conversas novas abrem na IA Local">
      <div class="marca-d">IA Local</div>
      <div class="flut"><span class="mk">${I('cpu')}</span><b>IA Local</b><small>No seu PC · grátis e sem internet</small><span class="ir">${(S.locais || []).length ? 'Começar' : 'Escolher e baixar'} ${I('seta')}</span></div>
      <div class="prev"><div class="pt"><i></i><i></i><i></i></div><div class="eu">resume esse texto em 3 linhas</div>
        <div class="ia"><span class="av" style="background:linear-gradient(135deg,var(--local),var(--local2))">${I('cpu')}</span><span><span class="digita">Claro. 1) O relatório mostra que… </span><br><em>Respondido no seu PC, sem internet.</em></span></div>
        <div class="bx">${esc(M.D.local && M.D.local.modelo || 'qwen3:8b')} · roda na sua placa<div class="barra-p"><i style="width:100%"></i></div></div></div>
      <div class="ganha">${G([['escudo', 'Privada: nada sai do seu PC'], ['raio', 'Sem conta, sem limite, sem internet'], ['cpu', 'Roda na sua placa de vídeo'], ['baixo', 'Mais simples e lenta · 2 a 20 GB', 1]])}</div></div>
  </div></div>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let el = null;
  const caber = () => { if (!el) return; const t = document.querySelector('.topo'); const top = t ? t.getBoundingClientRect().bottom : 40; el.style.top = top + 'px';
    const p = el.querySelector('.ep'); if (p) p.style.transform = `scale(${Math.min(el.clientWidth / 1440, el.clientHeight / 770)})`; };
  const marcar = (l) => { S.escolhaHover = l || null; if (!el || el.dataset.hover === (l || '')) return; el.dataset.hover = l || ''; };
  // called after each draw: create once (with entry), remove with soft exit
  M.desenharEscolha = () => {
    if (!S.escolha) { if (el) { const x = el; el = null; if (document.documentElement.classList.contains('cena')) x.remove(); else { x.classList.add('sai'); setTimeout(() => x.remove(), 300); } } return; }
    if (el && el.isConnected) { el.dataset.hover = S.escolhaHover || ''; const h = M.escolhaHTML(); if (el._h !== h) { el.innerHTML = el._h = h; } return caber(); }   // account/models load later: refresh labels
    el = document.createElement('div'); el.id = 'escolha'; el.className = 'entra'; el.dataset.hover = S.escolhaHover || ''; el.innerHTML = el._h = M.escolhaHTML(); document.body.appendChild(el);
    setTimeout(() => el && el.classList.remove('entra'), 900); caber();
  };
  addEventListener('resize', caber);
  document.addEventListener('mouseover', (e) => { if (!el || !el.contains(e.target)) return; const m = e.target.closest('[data-lado]'); marcar(m ? m.dataset.lado : null); });
  document.addEventListener('mouseleave', () => marcar(null));
  document.addEventListener('keydown', (e) => { if (!el || !S.escolha) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const l = e.key === 'ArrowLeft' ? 'claude' : 'local'; marcar(l); el.querySelector(`[data-lado="${l}"]`).focus(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'Enter') { const l = el.dataset.hover || 'claude'; e.preventDefault(); e.stopImmediatePropagation(); M.agir('escolha:' + l); } }, true);
  Object.assign(M.CENAS || (M.CENAS = {}), { escolha: () => { S.escolha = true; }, 'escolha-claude': () => { S.escolha = true; S.escolhaHover = 'claude'; } });
  // prototype: engine redraws via M.draw; app calls M.desenharEscolha at end of own draw
  if (!window.api) { const d0 = M.draw; M.draw = (...a) => { const r = d0.apply(M, a); M.desenharEscolha(); return r; }; }
  const ag = M.agir; M.agir = (a) => { if (a.startsWith('escolha:') && !window.api) { const v = a.slice(8); S.escolha = false; S.fluxoCam = v; S.fluxo = v === 'local' ? 'l-preparar' : 'c-login'; return M.draw(); } return ag(a); };
})();