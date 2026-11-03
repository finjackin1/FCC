// First-run flow (25/10/2026, prototype docs\prototipos\primeira-vez, approved with choice screen). S.fluxo = current step.
// Claude: c-preparar (installs Claude Code) → c-login → c-esperando → c-ok · Local AI: l-preparar (your PC) → l-loja (1st AI) → l-baixando
// Then: folder → tour (over real UI). Standalone: bloqueado (Claude thing without account), sem-internet, placa-fraca, login-falhou.
// data-act "fx…" actions: app handles in M.fluxoPrograma (app.js); prototype just navigates.
(function () {
  const { S } = M; const E = M.arteE, I = E.I;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n1 = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  const pc = () => { const L = M.D.loja && M.D.loja.PC; return (L && L.placa ? L : M.D.pc) || { placa: '', vram: 0, ram: 0, disco: 0 }; };
  const OK = `<span class="fx-ok"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg></span>`;
  const card = (h, larga) => `<div class="fx-cx"><div class="fx-card ${larga ? 'larga' : ''}">${h}</div></div>`;
  const fundo = (l) => `<div class="fx-fundo">${l === 'local' ? E.L({ x: 650, y: 120, s: .78 }) : E.C({ x: 70, y: 120, s: .78 })}</div>`;
  const marca = (cl, ic) => `<div class="fx-marca ${cl}">${I(ic)}</div>`;
  const B = (t, a, c = '') => `<button class="fx-btn ${c}" data-act="${a}">${t}</button>`, Lk = (t, a) => `<button class="fx-lnk" data-act="${a}">${t}</button>`;
  const it = (n, d, st, loc) => `<div class="fx-it"><div class="tx"><b>${n}</b><small>${d}</small></div>${st === 'ok' ? OK : st === 'gira' ? `<span class="fx-gira ${loc ? 'loc' : ''}"></span>` : `<span class="st">${st}</span>`}</div>`;
  // 1st AI: those fitting this PC's GPU, one per model, most requested first
  function sugestoes() {
    const p = pc(), cat = (M.D.loja && M.D.loja.CAT) || [], cabe = (g) => p.vram ? g <= p.vram * .9 : g <= 3, meio = (g) => p.vram && g <= p.vram + (p.ram || 16) * .5;
    const L = [], vistos = new Set();
    for (const m of [...cat].sort((a, b) => (b.hot || 0) - (a.hot || 0))) { if (vistos.has(m.id)) continue;
      const v = [...m.v].filter(x => cabe(x.gb)).sort((a, b) => b.gb - a.gb)[0] || (L.length < 3 && [...m.v].filter(x => meio(x.gb)).sort((a, b) => a.gb - b.gb)[0]);
      if (v) { vistos.add(m.id); L.push({ m, v, fit: cabe(v.gb) ? 'cabe' : 'meio' }); } if (L.length === 3) break; }
    return L;
  }
  const pct = () => { const t = S.fluxoTag; const f = (S.fila || (M.D.loja && M.D.loja.FILA) || []).find(x => x.n === t || x.id === t); return Math.round(f ? f.pct || 0 : (S.baixando && S.baixando[t]) || 0); };
  const T = {
    'c-preparar': () => fundo('claude') + card(`${marca('cl', 'ast')}<h1>Preparando o Claude</h1><p>Instalo o que falta neste PC. Leva menos de um minuto e é só desta vez.</p>
      <div class="fx-chk">${it('Claude Code', 'o programa oficial da Anthropic que conversa com o Claude', S.fluxoEt === 'feito' ? 'ok' : S.fluxoEt === 'erro' ? 'falhou' : 'gira')}${it('Pasta de projetos', esc(M.D.raiz || 'Claude-Projects') + ' · ícones de cada projeto', 'ok')}</div>
      <div class="fx-acoes">${S.fluxoEt === 'erro' ? B('Tentar de novo', 'fx-instalar', 'prim') : ''}${B(I('volta') + 'Voltar', 'fx-voltar')}</div>`),
    'c-login': () => fundo('claude') + card(`${marca('cl', 'ast')}<h1>Entre na sua conta do Claude</h1><p>O navegador abre na página da Anthropic. Entre lá e volte: o FCC percebe sozinho. Funciona com os planos Pro e Max.</p>
      <div class="fx-acoes">${B('Abrir o navegador<kbd>Enter</kbd>', 'fx-entrar', 'prim')}${B('Voltar', 'fx-voltar')}${Lk('Prefiro a IA Local', 'fx-ir:l-preparar')}</div>`),
    'c-esperando': () => fundo('claude') + card(`${marca('cl', 'ast')}<h1>Esperando você entrar…</h1><p>Termine no navegador. Esta tela muda sozinha quando você entrar.</p>
      <div class="fx-chk">${it('Aguardando a Anthropic', 'abriu no navegador · a página da conta do Claude', 'gira')}</div>
      <div class="fx-acoes">${B('Abrir o navegador de novo', 'fx-navegador')}${B('Cancelar', 'fx-cancelar')}</div>`),
    'c-ok': () => { const c = M.D.conta || {}; return fundo('claude') + card(`<div class="fx-suc"><svg viewBox="0 0 36 36"><path d="M9 19l6 6 12-13"/></svg></div><h1>Pronto, você entrou!</h1><p>Tudo do Claude está liberado: projetos, conversas, resumo e limite de uso.</p>
      <div class="fx-conta"><span class="av">${esc((c.email || '?')[0].toUpperCase())}</span><div><b>${esc(c.email || '')}</b><small>Plano ${esc(c.plano || '—')}</small></div></div>
      <div class="fx-acoes">${B('Continuar<kbd>Enter</kbd>', 'fx-ir:pasta', 'prim')}</div>`); },
    'l-preparar': () => { const p = pc(), pronto = !!(M.D.loja && (M.D.loja.CAT || []).length); return fundo('local') + card(`${marca('lo', 'cpu')}<h1>Olhando o seu PC</h1><p>A IA Local roda na sua placa de vídeo. Vejo o que cabe aqui para sugerir o modelo certo.</p>
      <div class="fx-chk">${it('Placa de vídeo', p.placa ? esc(p.placa) + (p.vram ? ' · ' + n1(p.vram) + ' GB' : ' · sem memória própria') : 'medindo…', p.placa ? 'ok' : 'gira', 1)}${it('Memória e disco', p.ram ? n1(p.ram) + ' GB de RAM · ' + n1(p.disco || 0) + ' GB livres' : 'medindo…', p.ram ? 'ok' : 'gira', 1)}${it('Ollama · catálogo de modelos', S.ollama === false ? 'o motor que roda a IA no seu PC: falta instalar (gratuito, ~1,7 GB, só para o seu usuário)' : S.ollama === 'erro' ? 'a instalação falhou: tente de novo' : S.ollama === 'instalando' ? 'instalando…' : 'o motor da IA no seu PC e o que dá para baixar', S.ollama === false ? 'falta' : S.ollama === 'erro' ? 'falhou' : S.ollama === 'instalando' || !pronto ? 'gira' : 'ok', 1)}</div>
      <div class="fx-acoes">${S.ollama === false || S.ollama === 'erro' ? B('Instalar o Ollama<kbd>Enter</kbd>', 'fx-ollama', 'prim loc') : pronto && S.ollama !== 'instalando' ? B('Continuar<kbd>Enter</kbd>', p.vram >= 2 ? 'fx-ir:l-loja' : 'fx-ir:placa-fraca', 'prim loc') : ''}${B(I('volta') + 'Voltar', 'fx-voltar')}</div>`); },
    'l-loja': () => { const p = pc(), L = sugestoes(); return fundo('local') + card(`<h1>Escolha a sua primeira IA</h1><p>Separei as que rodam bem neste PC. Dá para baixar outras depois, na loja.</p>
      <div class="fx-pc">${p.placa ? `<span>${I('placa')}${esc(p.placa)} · ${n1(p.vram || 0)} GB</span>` : ''}${p.ram ? `<span>${I('cpu')}${n1(p.ram)} GB de RAM</span>` : ''}${p.disco ? `<span>${I('pasta')}${n1(p.disco)} GB livres</span>` : ''}</div>
      <div class="fx-mods">${L.map(({ m, v, fit }, i) => `<button class="fx-mod ${i === 0 ? 'rec' : ''}" data-act="fx-baixar:${esc(v.tag)}">${i === 0 ? '<span class="tag">Recomendada</span>' : ''}<b>${esc(m.nome)} ${esc(String(v.t).toUpperCase())}</b><span class="de">${esc(m.de || '')}</span><p>${esc(m.desc || '')}</p>
        <span class="cabe ${fit === 'meio' ? 'meio' : ''}"><i></i>${fit === 'meio' ? 'cabe em parte (mais lento)' : 'cabe na placa'}</span><div class="rod"><span class="gb">${n1(v.gb)} GB</span><span class="fx-btn ${i === 0 ? 'loc' : ''}">${I('baixo')}Baixar</span></div></button>`).join('') || it('Carregando o catálogo…', 'um instante', 'gira', 1)}</div>
      <div class="fx-acoes">${B(I('volta') + 'Voltar', 'fx-ir:l-preparar')}${Lk('Ver a loja completa', 'fx-loja')}</div>`, true); },
    'l-baixando': () => { const p = pct(); return fundo('local') + card(`${marca('lo', 'baixo')}<h1>Baixando ${esc(S.fluxoTag || '')}</h1><p>Pode deixar baixando. Quando terminar, a IA Local já fica pronta para usar.</p>
      <div style="margin-top:24px"><div style="display:flex;justify-content:space-between;font-size:13px"><b>${p}%</b><span style="color:#8a92aa">${p >= 100 ? 'preparando…' : 'baixando'}</span></div><div class="fx-barra"><i style="width:${p}%"></i></div></div>
      <div class="fx-chk">${it('Enquanto isso', 'A IA Local não manda nada para a internet: tudo fica no seu PC.', '')}</div>
      <div class="fx-acoes">${B('Escolher outra', 'fx-ir:l-loja')}</div>`); },
    pasta: () => { const loc = S.fluxoCam === 'local'; return fundo(S.fluxoCam) + card(`${marca(loc ? 'lo' : 'cl', 'pasta')}<h1>Onde ficam os seus projetos?</h1><p>Cada pasta com um CLAUDE.md lá dentro vira um projeto no FCC. Escolha onde eles ficam:</p>
      ${S.fluxoPasta ? `<button class="fx-op on" data-act="fx-outra"><span class="rd"></span><div><b><code>${esc(S.fluxoPasta)}</code></b><small>${(M.P || []).length} projetos achados · clique para trocar</small></div></button>` : `<button class="fx-op" data-act="fx-outra"><span class="rd"></span><div><b>Escolher a pasta…</b><small>abre o Explorer para você escolher</small></div></button>`}
      <div class="fx-acoes">${B('Continuar<kbd>Enter</kbd>', 'fx-tour', 'prim ' + (loc ? 'loc' : ''))}</div>`); },
    tour: () => '',   // drawn by tour(): over real UI
    bloqueado: () => `<div class="fx-veu"><div class="fx-card">${marca('cl', 'cad')}<h1>Isso usa o Claude</h1><p>Resumir a conversa, ver o limite de uso e trocar de conta precisam de uma conta do Claude (Pro ou Max). Todo o resto continua funcionando com a IA Local.</p>
      <div class="fx-acoes">${B('Entrar no Claude', 'fx-ir:c-login', 'prim')}${B('Continuar com a IA Local', 'fx-fim')}</div></div></div>`,
    'sem-internet': () => fundo('local') + card(`${marca('', 'wifi')}<h1>Sem internet agora</h1><p>O Claude precisa de internet para entrar e conversar. A IA Local funciona sem: quer começar por ela? Dá para entrar no Claude depois.</p>
      <div class="fx-acoes">${B('Usar a IA Local', 'fx-ir:l-preparar', 'loc')}${B('Tentar de novo', 'fx-claude')}</div>`),
    'placa-fraca': () => { const p = pc(); return fundo('local') + card(`${marca('am', 'placa')}<h1>Este PC não tem placa de vídeo dedicada</h1><p>A IA Local vai funcionar, mas devagar (umas 3 palavras por segundo). Para este PC eu recomendo um modelo pequeno, ou usar o Claude.</p>
      <div class="fx-pc"><span>${I('placa')}${esc(p.placa || 'placa integrada')}</span>${p.ram ? `<span>${I('cpu')}${n1(p.ram)} GB de RAM</span>` : ''}</div>
      <div class="fx-acoes">${B('Ver modelos pequenos', 'fx-ir:l-loja', 'loc')}${B('Usar o Claude', 'fx-claude')}</div>`); },
    'login-falhou': () => fundo('claude') + card(`${marca('', 'x')}<h1>Não deu para entrar</h1><p>${esc((M.D.login && M.D.login.erro) || 'A entrada foi cancelada ou o link expirou.')} Nada foi alterado: é só tentar de novo.</p>
      <div class="fx-acoes">${B('Tentar de novo', 'fx-entrar', 'prim')}${B('Voltar ao começo', 'fx-voltar')}${Lk('Usar a IA Local', 'fx-ir:l-preparar')}</div>`),
  };
  // tour: 3 tips pinned to real elements (rail, AI button, message box)
  const ALVOS = [['.trilho .lista', 'Seus projetos', 'Cada projeto tem bolinhas de cor dizendo o que precisa: amarelo = testar, vermelho = decidir, verde = publicado. Passe o mouse para ver.', 'dir'],
    ['.f-comeca .bia, .bia', 'Claude ou IA Local', 'Este botão troca a IA a qualquer hora. A engrenagem de cada uma abre as configurações.', 'baixo'],
    ['.f-comeca', 'Pode começar', 'Escreva aqui. Fechou uma conversa livre? Ela fica em Rascunhos e vira projeto quando você quiser.', 'baixo']];
  function tour() {
    const [sel, t, d, lado] = ALVOS[S.fluxoTour || 0], alvo = document.querySelector(sel); if (!alvo) return '';
    const r = alvo.getBoundingClientRect(), x = lado === 'dir' ? r.right + 16 : Math.max(8, Math.min(innerWidth - 316, r.left)), y = lado === 'dir' ? r.top : (r.bottom + 170 < innerHeight ? r.bottom + 12 : r.top - 170);
    return `<div class="fx-foco" style="left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>
      <div class="fx-dica" style="left:${x}px;top:${y}px"><b>${t}</b><p>${d}</p><div class="rod3"><span class="n">${(S.fluxoTour || 0) + 1} de 3</span>${Lk('Pular', 'fx-fim')}${B((S.fluxoTour || 0) < 2 ? 'Próxima' : 'Começar', 'fx-tour', 'prim ' + (S.fluxoCam === 'local' ? 'loc' : ''))}</div></div>`;
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
  const ir = (t) => { S.fluxo = t; if (t && t.startsWith('c-')) S.fluxoCam = 'claude'; if (t && t.startsWith('l-')) S.fluxoCam = 'local'; M.draw(); };
  const ag = M.agir;
  M.agir = (a) => {
    if (!a.startsWith('fx')) return ag(a);
    if (M.fluxoPrograma && M.fluxoPrograma(a)) return;
    const [k, v] = [a.split(':')[0], a.split(':').slice(1).join(':')];
    if (k === 'fx-ir') return ir(v);
    if (k === 'fx-voltar') { S.fluxo = null; S.escolha = true; return M.draw(); }
    if (k === 'fx-instalar') return ir('c-login'); if (k === 'fx-entrar') return ir('c-esperando'); if (k === 'fx-cancelar') return ir('login-falhou');
    if (k === 'fx-claude') return ir('c-login'); if (k === 'fx-baixar') { S.fluxoTag = v; return ir('l-baixando'); }
    if (k === 'fx-tour') { if (S.fluxo !== 'tour') { S.fluxoTour = 0; return ir('tour'); } if ((S.fluxoTour || 0) < 2) { S.fluxoTour++; return M.draw(); } return ir(null); }
    if (k === 'fx-fim' || k === 'fx-loja') return ir(null);
    if (k === 'fx-ollama') { S.ollama = true; return M.draw(); }
    return M.draw();
  };
  // autotest scenes (one per step; app and prototype use same sample data)
  const C = {}; for (const t of Object.keys(T)) C['fluxo-' + t] = () => { S.fluxo = t; S.fluxoCam = t.startsWith('l-') || t === 'placa-fraca' ? 'local' : 'claude'; S.fluxoTour = 0; S.fluxoTag = 'qwen3:8b'; S.fluxoEt = ''; S.fluxoPasta = ''; S.ollama = undefined; };
  C['fluxo-l-ollama'] = () => { S.fluxo = 'l-preparar'; S.fluxoCam = 'local'; S.ollama = false; };   // PC without Ollama: Install button
  Object.assign(M.CENAS || (M.CENAS = {}), C);
  if (!window.api) { const d0 = M.draw; M.draw = (...a) => { const r = d0.apply(M, a); M.desenharFluxo(); return r; }; }
})();
