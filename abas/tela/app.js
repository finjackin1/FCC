// App UI = CHOSEN interface (docs\prototipos\v2\ESCOLHIDA, 23/10/2026): top, project rail, sheet and windows come
// from prototype code (tela\v2\*, copied unchanged by ferramentas\copiar-prototipo.ps1) via object M (tela\ponte.js).
// Here live real state (M.S / M.P), real actions and conversation: each tab talks to Claude Code via official library
// (main.js: abrirChat); login and "Ver o terminal" use a real terminal (xterm.js + ConPTY).
(async function () {
  const api = window.api;
  const D = await api.dados();
  const TESTE = !!(D.teste.cena || D.teste.autoteste);
  const OP = D.op;
  if (OP.inicio === 'escolha' && !D.demo && !D.atualizou && !D.abrirProjeto && M.desenharEscolha) { M.S.escolha = true; M.desenharEscolha(); }   // 26/10: welcome screen paints before rest of UI
  const ROT = M.ROT;
  const C = window.CHAT;
  const S = Object.assign(M.S, { abas: [{ id: 'inicio', tipo: 'inicio' }], ativa: 0, sel: 0, modal: null, mSel: 0, jAba: 0, conta: { estado: 'conf', email: '', plano: '' },
    modelo: 'sonnet', esf: 'medium', pensar: false, ia: 'claude', iaPadrao: 'claude', pop: null, popM: 0, locais: null, semPainel: OP.painel === '0',
    toast: '', prep: { et: [], pct: 0 }, fechar: null, seq: 1, edit: null, maxi: false, tam: OP.tam === 'min' ? 'min' : 'max', sessao: D.sessao || [], pendente: !!D.pendente, atual: D.autoAtual || null,
    grupos: (D.trilho && D.trilho.grupos) || [], alias: (D.trilho && D.trilho.alias) || {}, fixos: (D.trilho && D.trilho.fixos) || [], filtro: 'todos' });
  // projects: SAME list copied UI uses (M.P); replace = empty and fill (never another list)
  const ICO = {};   // dir -> .exe icon (27/10): kept across project list reloads
  const setProj = (L) => { M.P.length = 0; for (const x of L || []) { if (ICO[x.dir]) x.ico = ICO[x.dir]; M.P.push(x); } if (S.sel >= M.P.length) S.sel = 0; if (!TESTE && api.icones) api.icones(M.P.filter(x => !x.ico).map(x => x.dir)).then(r => { let mudou = false; for (const x of M.P) if (r[x.dir]) { ICO[x.dir] = x.ico = r[x.dir]; mudou = true; } if (mudou) draw(); }).catch(() => { }); };
  S.proj = M.P; setProj(TESTE ? JSON.parse(JSON.stringify(DEMO2.P)) : D.projetos);
  M.D.local.modelo = OP.iaLocal || (OP.ia && OP.ia !== 'claude' ? OP.ia : '');
  const temaDe = (t) => t === 'claro' ? 'claro' : t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro') : 'escuro';
  S.tema = temaDe(OP.tema); document.documentElement.dataset.tema = S.tema;
  const esc = M.esc, ico = M.ico;
  const p = () => S.vazio ? null : S.proj[S.sel];   // as prototype (motor.js): no project, nothing on top
  const aba = () => S.abas[S.ativa];
  const chat = (t) => t && t.tipo === 'chat' && !t.pty;
  const hhmm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  // 24/10 (user request): every new conversation starts Claude Sonnet Medium; changing AI/model/thinking applies ONLY to open conversation.
  // On welcome (no conversation), F4 choice applies only to next conversation opened from there (S.prox), then back to default.
  // 25/10 (user request): AI of every new conversation from Options > Ao abrir > Começar com (Claude, Local AI or choice screen, valid for this session).
  // Switching AI inside a conversation still applies only to it.
  let IA_SES = null;
  const PADRAO = () => ({ ia: IA_SES || (OP.inicio === 'local' ? 'local' : 'claude'), modelo: 'sonnet', esf: 'medium', pensar: nivelP(OP.modoLocal ? OP.modoLocal : OP.pensar === '1' ? 2 : 1) });   // pensar = saved local AI preference
  S.prox = PADRAO();
  const modeloNovo = () => S.prox.ia === 'local' && M.D.local.modelo ? M.D.local.modelo : S.prox.modelo;
  // AI per conversation (23/10, user request): UI shows open conversation's AI; outside conversation, the next ones'
  const iaDaTela = () => { const t = aba(); return chat(t) ? (C.ehLocal(t.modelo) ? 'local' : 'claude') : S.prox.ia; };

  // ---- drawing: top, rail, sheet and windows are prototype's (M.*HTML); conversation has own DOM (fast) ----
  const desenho = {};                    // last HTML of each part: same = don't touch UI
  const por = (id, h) => { if (h === desenho[id]) return false; desenho[id] = h; document.getElementById(id).innerHTML = h; return true; };
  function desenhar() {
    if (M.desenharEscolha) M.desenharEscolha();   // AI choice screen: own layer (escolha.js)
    const t = aba(); if (!TESTE || chat(t)) { S.ia = iaDaTela();   // autotest scenes set S.ia directly
      const x = chat(t) ? t : S.prox; if (!C.ehLocal(x.modelo)) S.modelo = x.modelo; S.esf = x.esf || 'medium'; S.pensar = nivelP(chat(t) && C.ehLocal(t.modelo) ? t.pensar : S.prox.pensar); S.iaPadrao = S.ia; }
    document.documentElement.dataset.tema = S.tema;
    por('topo', M.topoHTML());
    const ls = document.querySelector('#trilho .lista'), rol = ls ? ls.scrollTop : 0;
    const bAnt = document.getElementById('tr-busca'), bFoco = bAnt && document.activeElement === bAnt, bPos = bAnt ? bAnt.selectionStart : 0;
    if (por('trilho', M.trilhoHTML())) { const l2 = document.querySelector('#trilho .lista'); if (l2) l2.scrollTop = S.trBusca ? 0 : rol; const b = document.getElementById('tr-busca'); if (b) { b.value = S.trBusca || ''; if (bFoco) { b.focus(); b.setSelectionRange(bPos, bPos); } } }
    const ini = document.getElementById('inicio');
    // 27/10 bug: checking a "Para testar" box redrew project screen and scroll went back to top → keep scroll of same project
    if (t.tipo === 'inicio') { if (p()) carregarFicha(p()); const ft = document.getElementById('f-txt'), foco = ft && document.activeElement === ft, fa = ini.querySelector('.ficha'), mesma = fa && desenho.fichaDe === (p() && p().n), rolF = mesma ? fa.scrollTop : 0, tla = ini.querySelector('.tl-lista'), rolL = mesma && tla ? tla.scrollTop : 0; desenho.fichaDe = p() && p().n;   // 28/10: test list keeps its scroll on check
      if (por('inicio', M.fichaHTML(p()))) { const f2 = ini.querySelector('.ficha'); if (f2) f2.scrollTop = rolF; const tl2 = ini.querySelector('.tl-lista'); if (tl2) tl2.scrollTop = rolL; const n = document.getElementById('f-txt'); if (n) { n.value = (p() && (S.fichaTx || {})[p().n]) || ''; if (M.alturaFicha) M.alturaFicha(n); if (foco) n.focus(); } pintarAnexos(); } ini.style.display = ''; }
    else if (desenho.inicio !== '') { por('inicio', ''); ini.style.display = 'none'; }
    // conversations and terminals: only active tab shows
    for (const x of S.abas) { if (x.host) x.host.classList.toggle('ativa', x === t); }
    if (chat(t)) desenharChat(t);          // hidden tabs update when shown
    document.getElementById('terms').classList.toggle('fora', !(t.pty));
    por('toast', S.toast ? `<div class="toast">${esc(S.toast)}</div>` : '');
    // windows: prototype's (tela\v2\janelas.js); draw error must not freeze app
    if (desenho.modalAnt === 'baixar' && S.modal !== 'baixar' && !TESTE) api.modFechou();   // left Baixar IA by any path: release Ollama
    desenho.modalAnt = S.modal;
    try { M.D.prep = S.prep; M.D.sessao = S.sessao; M.D.fecharNome = S.fechar != null && S.abas[S.fechar] ? S.abas[S.fechar].titulo : ''; por('modal', M.modalHTML()); }
    catch (err) { api.log('janela ' + S.modal + ': ' + (err.stack || err)); }
    if (M.desenharFluxo) M.desenharFluxo();   // first-run steps (fluxo.js), on top
  }
  // project sheet: instructions, memory and past conversations read from disk (at most every 30 s per project)
  M.carregarFicha = (q) => carregarFicha(q);   // rail (B) opens projects and shows their conversations
  function carregarFicha(q) {
    if (TESTE || !q || (q.fichaT && Date.now() - q.fichaT < 30000)) return; q.fichaT = Date.now();
    api.fichaDados(q.dir).then(r => { Object.assign(q, r); draw(); }).catch(() => { });
  }
  // live account usage with Account window open (23/10): bar grows (CSS transition) and number counts to new value,
  // touching only those elements; new HTML becomes "last draw" so window isn't redone (no flicker, hover kept)
  function usoVivo(lim) {
    if (!lim) return; M.D.lim = lim;
    { const tr = document.getElementById('trilho'), bu = tr && tr.querySelector('.bu'), h = M.trilhoHTML(), n = document.createElement('div'); n.innerHTML = h; const nb = n.querySelector('.bu');
      if (bu && nb) { for (const k of ['.bu-f', '.bu-d']) { const a = bu.querySelector(k), b = nb.querySelector(k); if (a && b) { a.className = b.className; a.style.width = b.style.width; if (b.dataset.dica) a.dataset.dica = b.dataset.dica; } }
        const a = bu.querySelector('.bu-n'), b = nb.querySelector('.bu-n'); if (a && b && a.innerHTML !== b.innerHTML) a.innerHTML = b.innerHTML; desenho.trilho = h; } else if (nb || bu) draw(); }
    const mo = document.getElementById('modal');
    if (S.modal !== 'conta' || !mo.querySelector('[data-uso]')) return draw();
    const h = M.modalHTML(), novo = document.createElement('div'); novo.innerHTML = h;
    // 03/11 bug: patching only the rings while marking whole HTML as drawn left the rest stale (footer "Claude Code —", account tile %).
    // Other blocks of the window body that changed are swapped one by one (no full redraw, no flicker); different layout = full redraw.
    { const velho = document.createElement('div'); velho.innerHTML = desenho.modal || '';
      const caixa = (r) => { const a = r.querySelector('[data-uso]'); return a && a.parentElement && a.parentElement.parentElement; };
      const cv = caixa(velho), cn = caixa(novo), cm = caixa(mo);
      if (!cv || !cn || !cm || cv.children.length !== cn.children.length || cm.children.length !== cn.children.length) return draw();
      for (let i = cn.children.length - 1; i >= 0; i--) {
        const n = cn.children[i];
        if (n.querySelector('[data-uso]') || n.outerHTML === cv.children[i].outerHTML) continue;
        cm.children[i].replaceWith(n.cloneNode(true));
      } }
    for (const el of mo.querySelectorAll('[data-uso]')) {   // account B rings (28/10): ring slides (CSS transition), text swapped, % counts
      const n = novo.querySelector(`[data-uso="${el.dataset.uso}"]`); if (!n) continue;
      el.className = n.className; const vi = el.querySelector('.vl'), nvi = n.querySelector('.vl'); if (vi && nvi) vi.setAttribute('style', nvi.getAttribute('style'));
      const s = el.querySelector('.b-tx'), ns = n.querySelector('.b-tx'); if (s && ns && s.innerHTML !== ns.innerHTML) s.innerHTML = ns.innerHTML;
      const ms = el.querySelector('.b-mio small'), nms = n.querySelector('.b-mio small'); if (ms && nms) ms.textContent = nms.textContent;
      const v = el.querySelector('.b-mio b'), nv = n.querySelector('.b-mio b'); if (!v || !nv || v.textContent === nv.textContent) continue;
      const de = parseInt(v.textContent) || 0, ate = parseInt(nv.textContent), t0 = performance.now();
      if (isNaN(ate)) { v.textContent = nv.textContent; continue; }
      const passo = (a) => { const k = Math.min(1, (a - t0) / 700), e = 1 - Math.pow(1 - k, 3); v.textContent = Math.round(de + (ate - de) * e) + '%'; if (k < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    }
    desenho.modal = h;
  }
  setInterval(() => { if (S.modal !== 'conta' && !TESTE && S.conta && S.conta.estado === 'ok' && document.visibilityState === 'visible') api.limUso('').then(usoVivo).catch(() => { }); }, 20000);
  setInterval(() => { if (S.modal === 'conta' && !TESTE && document.visibilityState === 'visible') api.limUso(chat(aba()) ? aba().id : '').then(usoVivo).catch(() => { }); }, 15000);
  let agendado = false;
  function draw() { if (agendado) return; agendado = true; requestAnimationFrame(() => { agendado = false; desenhar(); }); }

  // ---- conversation: each tab's DOM built once (text box can't be rebuilt: would lose cursor) ----
  function montarChat(t) {
    const host = document.createElement('div'); host.className = 'chatC';
    host.innerHTML = C.esqueletoHTML();     // same skeleton prototype uses (chat.js)
    // v4 B (31/10): top bar first in .esq, pops first in .compC-z, like M.chatHTML does in the prototype (v2/v4.js)
    host.querySelector('.esq').insertAdjacentHTML('afterbegin', '<div class="v4-slot" style="display: contents"></div>');
    host.querySelector('.compC-z').insertAdjacentHTML('afterbegin', '<div class="v4-slot" style="display: contents"></div>');
    document.getElementById('chats').appendChild(host);
    const q = (s) => host.querySelector(s);
    t.host = host; t.el = { rolar: q('.rolar'), col: q('.col'), itens: q('.itens'), slot: q('.slot'), compZ: q('.compC-z'), comp: q('.compC:not(.fim)'), fim: q('.compC.fim'), txt: q('textarea'), lin: q('.lin'), termC: q('.termC'), painel: q('.painelC'), mostra: q('.mostra-painel'), cortina: q('.cortina'), v4topo: q('.esq > .v4-slot'), v4pops: q('.compC-z > .v4-slot') };
    t.cache = {};
    const ta = t.el.txt;
    ta.addEventListener('input', () => { t.texto = ta.value; t.cmdSel = 0; t.cmdFora = false; altura(t); desenharChat(t); });
    ta.addEventListener('click', () => { if (ta.value.startsWith('/')) { t.cmdFora = false; desenharChat(t); } });   // cursor entered/left command word
    ta.addEventListener('keyup', (e) => { if (/^(Arrow|Home|End)/.test(e.key) && ta.value.startsWith('/')) desenharChat(t); });
    t.el.rolar.addEventListener('click', (e) => { const a = e.target.closest('a[href]'); if (a) { e.preventDefault(); api.link(a.getAttribute('href')); } });
  }
  function altura(t) { const ta = t.el.txt; ta.style.height = '24px'; ta.style.height = Math.min(168, ta.scrollHeight) + 'px'; }
  function trocar(el, chave, t, html) { if (t.cache[chave] === html) return false; t.cache[chave] = html; el.innerHTML = html; return true; }
  function trocarBlocos(t, bl) {      // only changed block redone (reply chunk arriving)
    const c = t.cache.bl || (t.cache.bl = []), el = t.el.itens, fs = el.children;
    if (c.length === 0 && fs.length && !fs[0].classList.contains('c-bl')) el.innerHTML = '';
    for (let i = 0; i < bl.length; i++) {
      if (c[i] === bl[i] && fs[i]) continue;
      const d = document.createElement('div'); d.className = fs[i] ? 'c-bl' : 'c-bl c-novo'; d.innerHTML = bl[i];   // only new block animates (vivo.css)
      if (fs[i]) el.replaceChild(d, fs[i]); else el.appendChild(d);
      c[i] = bl[i];
    }
    while (fs.length > bl.length) el.lastChild.remove();
    c.length = bl.length;
  }
  // "/" menu (24/10, user request): command is 1st word, kept apart from request ("/cmd pedido"); menu only shows with
  // cursor inside that word, hides on outside click (t.cmdFora) and never erases typed text
  function cmdsDe(t) { const d = t.texto || '', m = d.match(/^\/(\S*)/); if (!m || t.cmdFora) return null; const ta = t.el && t.el.txt; if (ta && document.activeElement === ta && ta.selectionStart > m[0].length) return null;
    const f = m[1].toLowerCase(); return (t.comandos || []).filter(c => c.n.toLowerCase().includes(f)).slice(0, 60); }
  const comCmd = (t, cmd) => { const ta = t.el.txt, resto = ta.value.replace(/^\/\S*\s*/, ''); ta.value = cmd + (resto || cmd.length > 1 ? ' ' : '') + resto; t.texto = ta.value; t.cmdSel = 0; t.cmdFora = cmd.length > 1;
    ta.focus(); const p = cmd.length + (cmd.length > 1 ? 1 : 0); ta.setSelectionRange(p, p); altura(t); desenharChat(t); };
  // command typed at end ("faça X /rea") moves to front: command first, then request
  const cmdNaFrente = (t, txt) => { const m = txt.match(/^([\s\S]*?)\s+\/([\w:.-]+)\s*$/); return m && !txt.startsWith('/') && (t.comandos || []).some(c => c.n === m[2]) ? `/${m[2]} ${m[1].trim()}` : txt; };
  function desenharChat(t) {
    const el = t.el, ativa = t === aba();
    el.painel.style.display = S.semPainel ? 'none' : '';
    el.mostra.style.display = S.semPainel ? '' : 'none';
    if (!S.semPainel) trocar(el.painel, 'painel', t, C.painelHTML(t, S.proj));
    trocar(el.v4topo, 'v4topo', t, M.v4.barra(t)); trocar(el.v4pops, 'v4pops', t, ativa ? M.v4.pops(t) : '');
    const lim = limiteAtivo() && !C.ehLocal(t.modelo);          // usage limit: curtain in front (local AI has no limit)
    el.cortina.style.display = lim ? '' : 'none'; trocar(el.cortina, 'cortina', t, lim ? C.cortinaHTML(S.limiteAte) : '');
    el.termC.style.display = t.verTerm ? '' : 'none';
    el.rolar.style.display = el.compZ.style.display = t.verTerm ? 'none' : '';
    if (t.verTerm) return;
    const r = el.rolar, noFim = r.scrollTop + r.clientHeight >= r.scrollHeight - 24 || t.irFim;
    if (t.estado === 'abrindo' && !t.itens.length) { if (!el.col.hidden) { el.col.hidden = true; r.insertAdjacentHTML('beforeend', C.abrindoHTML()); } }
    else { if (el.col.hidden) { el.col.hidden = false; const a = r.querySelector('.c-abrindo'); if (a) a.remove(); } trocarBlocos(t, C.itensBlocos(t, OP.passos === '1' || !!t.verPassos)); rodape(t, TESTE); }
    if (noFim) { r.scrollTop = r.scrollHeight; t.irFim = false; }
    // message box
    const fim = t.estado === 'encerrada';
    el.comp.style.display = fim ? 'none' : ''; el.fim.style.display = fim ? '' : 'none';
    if (fim) trocar(el.fim, 'fim', t, `Conversa encerrada às ${t.fimHora || ''}.<button class="c-btn prim" data-act="reabrir">Reabrir <kbd>Enter</kbd></button>`);
    else {
      const ocupado = t.estado === 'trabalhando' || t.estado === 'pede';
      el.txt.placeholder = ocupado ? 'Escreva enquanto ele trabalha…' : 'Responda ao Claude…';
      trocar(el.lin, 'lin', t, C.linhaHTML(t, false));
      let pops = '';
      { const L = cmdsDe(t); if (L && L.length) pops = C.cmdsHTML(L, Math.min(t.cmdSel || 0, L.length - 1)); }
      if (t.cache.pops !== pops) { t.cache.pops = pops; el.comp.querySelectorAll(':scope > .pop').forEach(x => x.remove()); if (pops) el.comp.insertAdjacentHTML('beforeend', pops); const L2 = el.comp.querySelector('.pop.cmds'), hl = L2 && L2.querySelector('.hl'); if (hl && (hl.offsetTop < L2.scrollTop || hl.offsetTop + hl.offsetHeight > L2.scrollTop + L2.clientHeight)) /* scroll only when item leaves view */ hl.scrollIntoView({ block: 'nearest' }); }
    }
  }
  // "Pensando…" spins and counts seconds
  // "working" line: redo HTML only when what matters changes (action, arrow); icon and time swap as text (arrow click not lost)
  function rodape(t, parado) {
    const h = C.rodapeHTML(t, parado), chave = h.replace(/<span class="claude-ast">[^<]*<\/span>/, '').replace(/<div class="c-trab-s">[^<]*<\/div>/, '');
    if (t.cache.slotChave !== chave) { t.cache.slotChave = chave; t.el.slot.innerHTML = h; return; }
    const v = C.rodapeVivo(t, parado), g = t.el.slot.querySelector('.claude-ast'), s = t.el.slot.querySelector('.c-trab-s');
    if (g && g.textContent !== v.g) g.textContent = v.g; if (s && s.textContent !== v.s) s.textContent = v.s;
  }
  setInterval(() => { for (const t of S.abas) if (chat(t) && (t.estado === 'trabalhando' || (t.bg || []).length) && t === aba() && !TESTE) rodape(t); }, 160);

  // ---- real terminal (login tab and "Ver o terminal") ----
  const TEMA_CLARO = { background: '#ffffff', foreground: '#1f1f1f', cursor: '#1f1f1f', cursorAccent: '#ffffff', selectionBackground: '#c8dafc',
    black: '#1f1f1f', red: '#c5221f', green: '#188038', yellow: '#b06000', blue: '#1a73e8', magenta: '#a142f4', cyan: '#007b83', white: '#80868b',
    brightBlack: '#5f6368', brightRed: '#d93025', brightGreen: '#1e8e3e', brightYellow: '#e37400', brightBlue: '#4285f4', brightMagenta: '#9334e6', brightCyan: '#12a4af', brightWhite: '#3c4043' };
  const TEMA_ESCURO = { background: '#202124', foreground: '#e8eaed', cursor: '#e8eaed', cursorAccent: '#202124', selectionBackground: '#394457' };
  function novoTerminal(t, pai) {
    const host = document.createElement('div'); host.className = 'term-area xt ativa';
    const dentro = document.createElement('div'); dentro.className = 'xt-in'; host.appendChild(dentro);
    pai.appendChild(host);
    const term = new Terminal({ fontFamily: '"Cascadia Mono", Consolas, monospace', fontSize: 14, lineHeight: 1.2, cursorBlink: true, allowProposedApi: true, scrollback: 5000,
      theme: OP.tema === 'escuro' ? TEMA_ESCURO : TEMA_CLARO, windowsPty: { backend: 'conpty' } });
    const fit = new FitAddon.FitAddon(); term.loadAddon(fit);
    term.open(dentro);
    try { const gl = new WebglAddon.WebglAddon(); gl.onContextLoss(() => gl.dispose()); term.loadAddon(gl); } catch (e) { api.log('webgl: ' + e.message); }
    term.attachCustomKeyEventHandler(e => !(e.type === 'keydown' && (atalhoGlobal(e) || (e.ctrlKey && (e.key === '`' || e.code === 'Backquote') && (alternarTerminal(t), true)))));
    term.onData(d => { if (t.pty && t.estado === 'encerrada') { if (d === '\r') reabrirLogin(t); return; } if (!TESTE) api.ptyEscrever(t.id, d); });
    t.xt = { host, term, fit };
    return t.xt;
  }
  function ajustar(t) {
    if (!t || !t.xt) return;
    try { t.xt.fit.fit(); if (!TESTE && t.ptyVivo) api.ptyTamanho(t.id, t.xt.term.cols, t.xt.term.rows); } catch { }
  }
  addEventListener('resize', () => ajustar(aba()));
  api.ao('pty:dados', (id, d) => {
    const t = S.abas.find(x => x.id === id); if (!t || !t.xt) return;
    t.xt.term.write(d);
    if (t.pty && t.estado === 'abrindo') { t.estado = 'esperando'; draw(); }
  });
  api.ao('pty:estado', (id, st) => {      // Claude Code hooks (main.js: ajustesDaAba), terminal mode only
    const t = S.abas.find(x => x.id === id); if (!t || !t.ptyVivo) return;
    if (st === 'esperando' && t.estado === 'trabalhando') t.visto = t === aba();
    if (st === 'trabalhando') t.usada = true;
    t.estado = st; draw();
  });
  api.ao('pty:saiu', (id) => {
    const t = S.abas.find(x => x.id === id); if (!t || !t.xt) return;
    t.ptyVivo = false;
    if (t.pty) {
      t.estado = 'encerrada';
      t.xt.term.write(`\r\n\x1b[38;2;128;134;139mSessão encerrada às ${hhmm()}.\x1b[0m\r\n\r\nCtrl+W\x1b[38;2;128;134;139m fecha a aba\x1b[0m\r\n`);
    } else t.xt.term.write(`\r\n\x1b[38;2;128;134;139mO Claude Code fechou. Ctrl+\` volta ao chat.\x1b[0m\r\n`);
    if (t !== aba()) t.visto = false;
    draw();
  });

  // ---- open, messages and permissions ----
  const uuid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
  function novaAba(q, modo, extra) {
    const t = { id: 't' + (S.seq++), tipo: 'chat', p: q, modo, modelo: extra.modelo || modeloNovo(), esf: extra.esf || S.prox.esf, pensar: nivelP(extra.pensar != null ? extra.pensar : S.prox.pensar), estado: 'abrindo', visto: true, t0: Date.now(),
      nomeado: !!extra.nomeado, titulo: extra.titulo || (q ? q.n : modo === 'login' ? 'Entrar na conta' : 'Chat livre'), dir: q ? q.dir : D.livre, sessao: extra.sessao || uuid(), antes: extra.antes,
      itens: [], abertos: {}, streamados: new Set(), texto: '', rel: {}, comandos: [], briefing: hhmm() };
    if (!extra.manterProx) S.prox = PADRAO();
    S.abas.push(t); S.ativa = S.abas.length - 1; S.toast = ''; S.modal = null; S.pop = null;
    return t;
  }
  // autotest: sample conversation is SAME as prototype's (tela\v2\dados-demo.js), so shot matches
  function preencherDemo(t, estado) {
    Object.assign(t, { itens: DEMO2.CONVERSA(), estado: estado === 'esperando' ? 'esperando' : estado === 'permissao' ? 'pede' : 'trabalhando', tok: 48200, seg: 12, t0: Date.now() - 12000, temExe: true });
    if (estado === 'acao' || estado === 'passos') t.itens.push({ k: 'ferr', verbo: 'Leu', alvo: 'docs\\PARADA.md', res: '' });
    if (estado === 'passos') t.verPassos = true;
    if (estado === 'permissao') t.itens.push({ k: 'perm', req: 'r1', tool: 'PowerShell', input: { description: 'Rodar o autoteste do .exe novo', command: 'FCC.exe --autoteste' }, resumo: 'Rodar o autoteste do .exe novo', escolhas: {} });
    if (estado === 'editar') { t.estado = 'esperando'; t.editando = { i: 4 }; const s = C.separaAnexos(t.itens[4].txt); t.anexos = s.A; t.texto = s.txt; t.el.txt.value = t.texto; pintarAnexos(); }
  }
  async function abrir(q, modo, extra = {}) {
    if (modo === 'login') return entrarConta();
    // one project, one tab (22/10, user request): already open = go to its tab
    const ja = q ? S.abas.findIndex(x => x.tipo === 'chat' && x.p && x.p.dir.toLowerCase() === q.dir.toLowerCase()) : -1;
    if (ja >= 0) { irPara(ja); mostrarToast(`${q.n} já está aberto nesta aba.`); return S.abas[ja]; }
    // Continue on project with previously closed conversation: return to it (where user stopped), don't start another
    if (modo === 'continuar' && q && q.ult && q.ult.sessao && !extra.modoChat && !TESTE) extra = { ...extra, sessao: q.ult.sessao, modelo: extra.modelo || q.ult.modelo, esf: extra.esf || q.ult.esf, modoChat: 'resume', voltou: q.ult.quando };
    if (q) { const i = S.proj.indexOf(q); if (i >= 0) S.sel = i; }
    const t = novaAba(q, modo, extra);
    montarChat(t); t.irFim = true; desenhar(); t.el.txt.focus();
    if (TESTE) { preencherDemo(t, extra.estado || 'esperando'); desenhar(); return t; }
    if (modo === 'continuar' && OP.texto && !extra.voltou) { t.el.txt.value = OP.texto; t.texto = OP.texto; altura(t); }   // stays in box: sent only when user sends (23/10, saves tokens)
    api.temPrograma(t.dir).then(x => { t.temExe = x; draw(); });
    const nome = q ? q.n : (modo === 'livre' ? 'chat livre' : '');
    let r = await api.chatAbrir({ id: t.id, dir: t.dir, modo: extra.modoChat || modo, nome, sessao: t.sessao, antes: t.antes, modelo: t.modelo, esf: t.esf, pensar: t.pensar, herdar: extra.herdar });
    if (r && r.semConversa) {               // saved conversation no longer exists: proceed as before (on Continue, with PARADA text)
      t.sessao = uuid(); extra = { ...extra, voltou: null }; if (modo === 'continuar' && OP.texto && !t.el.txt.value) { t.el.txt.value = OP.texto; t.texto = OP.texto; altura(t); }
      r = await api.chatAbrir({ id: t.id, dir: t.dir, modo: modo === 'continuar' ? 'continuar' : 'nova', nome, sessao: t.sessao, modelo: t.modelo, esf: t.esf, pensar: t.pensar });
    }
    if (!S.abas.includes(t)) return null;
    if (r && r.erro) { fecharAba(S.abas.indexOf(t), true); mostrarToast(r.erro); return null; }
    t.sessao = r.sessao; t.comandos = r.comandos || [];
    v4Atualizar(t);   // v4: context ring and changes of a resumed conversation
    if (r.historico && r.historico.length) {
      const novos = t.itens; t.itens = []; histAntes(t, r); for (const m of r.historico) C.aplicar(t, m, false); t.itens.push({ k: 'troca', txt: r.passou ? 'Conversa retomada. Continua numa conversa nova: o Claude sabe onde parou' : extra.voltou ? `Voltou de onde você fechou (${extra.voltou})` : 'Conversa retomada' }, ...novos); t.usada = true;
    } else if (modo === 'livre') t.vazio = `Chat livre com o briefing dos ${S.proj.length} projetos. O que você quer fazer?`;
    else if (modo === 'nova') t.vazio = `Conversa nova em ${q ? q.n : 'chat livre'}.`;
    else if (modo === 'retomar') t.vazio = 'Não achei conversa anterior nesta pasta: esta é nova.';
    t.estado = 'esperando'; t.t0 = Date.now(); t.irFim = true;
    if (t.pendente) { if (!TESTE) api.chatEnviar(t.id, t.pendente); t.pendente = null; t.estado = 'trabalhando'; t.usada = true; }
    salvarSessao(); draw();
    if (extra.primeira) { t.el.txt.value = extra.primeira; t.texto = extra.primeira; enviar(t); }
    return t;
  }
  // ---- welcome → conversation: flight (23/10) ----
  S.fichaTx = S.fichaTx || {};
  const abaDoProj = (q) => q && S.abas.find(x => x.tipo === 'chat' && x.p && x.p.dir.toLowerCase() === q.dir.toLowerCase());
  function voar(fazer) {
    const ini = document.getElementById('inicio'), box = ini && ini.querySelector('.f-comeca');
    if (!box || ini.style.display === 'none' || TESTE) return fazer();
    const rI = ini.getBoundingClientRect(), camada = document.createElement('div'); camada.className = 'voo';
    Object.assign(camada.style, { left: rI.left + 'px', top: rI.top + 'px', width: rI.width + 'px', height: rI.height + 'px' });
    const copia = (e) => { const r = e.getBoundingClientRect(), c = e.cloneNode(true); if (e.matches('.f-comeca')) { const a = e.querySelector('textarea'), b = c.querySelector('textarea'); if (a && b) b.value = a.value; }
      Object.assign(c.style, { left: r.left - rI.left + 'px', top: r.top - rI.top + 'px', width: r.width + 'px', height: r.height + 'px' }); camada.appendChild(c); return { c, r }; };
    const pecas = [...ini.querySelectorAll('.f-cab, .f-aviso, .f-tit, .f-meio > .j-lista, .f-vazio, .f-card')].map(copia), cx = copia(box);
    document.body.appendChild(camada);
    const t = fazer(), alvo = t && t.el && t.el.comp; if (!alvo) { camada.remove(); return t; }
    alvo.style.opacity = '0'; t.host && t.host.classList.add('chega'); const rA = alvo.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      camada.classList.add('anda');
      for (const { c, r } of pecas) {   // nearest edge: left, right, top or bottom
        const d = [[r.right - rI.left, 'x', -1], [rI.right - r.left, 'x', 1], [r.bottom - rI.top, 'y', -1], [rI.bottom - r.top, 'y', 1]].sort((a, b) => a[0] - b[0])[0];
        c.style.transform = d[1] === 'x' ? `translateX(${d[2] * (d[0] + 24)}px)` : `translateY(${d[2] * (d[0] + 24)}px)`; c.style.opacity = '0';
      }
      Object.assign(cx.c.style, { left: rA.left - rI.left + 'px', top: rA.top - rI.top + 'px', width: rA.width + 'px', height: rA.height + 'px', borderRadius: '24px' });
      setTimeout(() => { alvo.style.opacity = ''; camada.remove(); t.host && t.host.classList.remove('chega'); if (t.el && t.el.txt) t.el.txt.focus(); }, 480);
    }));
    return t;
  }
  // welcome box: click with open conversation = back to it as it was; Enter with text = send (in open one or new conversation)
  function caixaFicha(acao, txt, modo) {   // 26/10: text goes with Nova/Continuar button; Enter uses option "enter"
    const q = p(); if (!q) return; const a = abaDoProj(q);
    if (acao === 'enviar' && (S.fichaAnx[q.n] || []).length) { txt = comAnexos(S.fichaAnx[q.n], txt); S.fichaAnx[q.n] = []; pintarAnexos(); }
    if (a) return voar(() => { irPara(S.abas.indexOf(a)); if (txt) { a.el.txt.value = txt; a.texto = txt; enviar(a); } return a; });
    if (acao !== 'enviar' || !txt) return;
    S.fichaTx[q.n] = ''; modo = modo || (OP.enter === 'nova' ? 'nova' : 'continuar');
    voar(() => { abrir(q, modo); const t = aba(); if (t && t.el && t.el.txt) { t.el.txt.value = txt; t.texto = txt; enviar(t); } return t; });
  }
  // click outside / menu (and outside box and / button) closes menu without touching text
  document.addEventListener('mousedown', (e) => { const t = aba(); if (!chat(t) || !t.el || e.target.closest('.pop.cmds') || e.target === t.el.txt || e.target.closest('[data-act="barra"]')) return; if (cmdsDe(t)) { t.cmdFora = true; desenharChat(t); } }, true);
  document.addEventListener('mousedown', (e) => { if (e.target.id === 'f-txt' && p() && abaDoProj(p())) { e.preventDefault(); caixaFicha('ir'); } }, true);   // click box with open conversation = back to it
  document.addEventListener('focusin', (e) => { if (e.target.id === 'f-txt' && p() && abaDoProj(p())) { e.target.blur(); caixaFicha('ir'); } });
  document.addEventListener('input', (e) => { if (e.target.id === 'f-txt' && p()) S.fichaTx[p().n] = e.target.value; if (e.target.id === 'tr-busca') { S.trBusca = e.target.value; draw(); } });
  // rail search: Enter opens 1st result, Esc clears
  document.addEventListener('keydown', (e) => { if (e.target.id !== 'tr-busca') return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); S.trBusca = ''; e.target.value = ''; e.target.blur(); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const r = M.buscaTrilho ? M.buscaTrilho() : [], i = r.length ? S.proj.indexOf(r[0]) : -1; if (i >= 0) { S.sel = i; S.trBusca = ''; e.target.blur(); irPara(0); } } }, true);
  document.addEventListener('keydown', (e) => { if (e.target.id !== 'f-txt' || e.key !== 'Enter' || e.shiftKey) return; e.preventDefault(); e.stopPropagation(); caixaFicha('enviar', e.target.value.trim()); }, true);
  // new conversation gets topic name when it appears (24/10, user request): small talk ("oi") waits for next reply
  const PAPO = /^\s*(oi+|ol[áa]|e a[íi]|bom dia|boa (tarde|noite)|tudo bem\??|obrigad\w*|valeu|blz|beleza|ok|teste?)\s*[!.?]*\s*$/i;
  async function nomear(t) {
    if (TESTE || t.nomeado || t.nomeando || (t.modo !== 'nova' && t.modo !== 'livre' && t.modo !== 'continuar')) return;
    const eu = t.itens.filter(x => x.k === 'eu').map(x => x.txt).filter(x => x && !PAPO.test(x) && !/^\s*\//.test(x));
    if (!eu.length || eu.join(' ').length < 12) return;
    const ia = t.itens.filter(x => x.k === 'ia').map(x => x.md).join('\n');
    t.nomeando = true; const n = await api.chatTitulo(eu.join('\n'), ia, t.modelo, t.sessao, t.dir).catch(() => ''); t.nomeando = false;
    if (n && S.abas.includes(t)) { t.titulo = n; t.nomeado = true; if (t.p) t.p.fichaT = 0; salvarSessao(); draw(); }
  }
  function chatDe(id) { return S.abas.find(x => x.id === id && chat(x)); }
  // account usage limit (applies to all Claude tabs); saved for next app open
  // limit: S.limiteAte = when it returns (seconds); S.limite = "09:50" (what UI shows: top, AI window)
  function limiteAtivo() { return !!S.limiteAte && S.limiteAte * 1000 > (window.RELOGIO_TESTE || Date.now()); }
  // curtain only with limit DETECTED on current account: saved with e-mail; other account, reply accepted or usage < 100% → hides (23/10)
  function guardarLimite(v) { S.limiteAte = v || 0; S.limite = v ? hhmm(new Date(v * 1000)) : null; try { if (v) localStorage.setItem('limite', JSON.stringify({ ate: v, email: (S.conta && S.conta.email) || '' })); else localStorage.removeItem('limite'); } catch { } for (const x of S.abas) if (chat(x)) x.cache.cortina = null; draw(); }
  function restaurarLimite() { try { const g = JSON.parse(localStorage.getItem('limite') || 'null'); if (g && g.ate * 1000 > Date.now() && g.email && g.email === S.conta.email && !TESTE) { S.limiteAte = g.ate; S.limite = hhmm(new Date(g.ate * 1000)); } else localStorage.removeItem('limite'); } catch { } }
  setInterval(() => { if (!S.limiteAte) return; if (!limiteAtivo()) guardarLimite(0); else { for (const x of S.abas) if (chat(x)) x.cache.cortina = null; draw(); } }, 30000);   // "daqui a X min" ticks and curtain leaves by itself
  // local AI speed (main.js: bridge), live while replying and final at end
  // auto mode switched this conversation's model/thinking (main.js aplicarAuto): UI just follows
  api.ao('chat:auto', (id, v) => { const t = chatDe(id); if (!t) return; t.modelo = v.modelo; t.esf = v.esf; salvarSessao(); draw(); });   // 24/10 (user request): silent switch, only AI indicator follows
  api.ao('chat:vel', (id, v) => { const t = chatDe(id); if (!t) return; if (v.fim) { t.tps = v.tps; t.tpsVivo = 0; } else t.tpsVivo = v.tps; draw(); });
  const aoMsg = (id, m) => {
    const t = chatDe(id); if (!t) return;
    if (t.passando && m.type !== 'limite' && !(m.type === 'user' && m.resultados && m.resultados.length) && !(m.type === 'system' && /^(orq_vivo|task_started|task_progress|background_tasks_changed)$/.test(m.subtype))) return;   // noting where it stopped (big conversation): not shown; the tool it was running still finishes on screen
    C.aplicar(t, m, true);
    if (m.type === 'limite' && !C.ehLocal(t.modelo)) { if (m.status === 'rejected' && m.volta) { guardarLimite(m.volta); setTimeout(() => autoTrocar(t, m.volta), 1500); } else if (m.status !== 'rejected' && S.limiteAte) guardarLimite(0); }
    if (S.limiteAte && !C.ehLocal(t.modelo) && (m.type === 'assistant' || (m.type === 'result' && !m.erro))) guardarLimite(0);   // Claude replied: has limit
    if (m.type === 'limite' && m.uso != null && m.tipo) { const x = { pct: Math.round(m.uso * (m.uso <= 1 ? 100 : 1)), volta: m.volta ? hhmm(new Date(m.volta * 1000)) : '', ate: m.volta ? m.volta * 1000 : 0 }; const L = { ...(M.D.lim || {}) }; if (m.tipo === 'five_hour') L.sessao = x; if (m.tipo === 'seven_day') L.semana = x; usoVivo(L); }
    if (m.type === 'result') { t.tpsVivo = 0; if (!C.ehLocal(t.modelo) && !TESTE) { clearTimeout(usoT); usoT = setTimeout(() => api.limUso('').then(usoVivo).catch(() => { }), 1500); } }   // usage bar moves each reply
    if (m.type === 'system' && m.subtype === 'init' && m.session_id && m.session_id !== t.sessao) { t.sessao = m.session_id; salvarSessao(); }   // conversation copied on edit: new id
    if (m.type === 'result') { if (m.uso) t.tok = (t.tok || 0) + m.uso.ent + m.uso.sai; t.rTok = null; t.rUlt = null; }     // tab token mark (Claude and local)
    if ((m.type === 'stream_event' || m.type === 'assistant') && t.estado === 'esperando') { t.estado = 'trabalhando'; t.t0 = Date.now(); }
    if (m.type === 'result' && !m.erro) nomear(t);
    if (m.type === 'result' && !TESTE) v4Atualizar(t);
    if (m.type === 'system' && m.subtype === 'init' && m.session_id && t.modo4 && t.modoSes !== m.session_id && !TESTE) { t.modoSes = m.session_id; api.chatModo(t.id, V4MODO[t.modo4]).catch(() => { }); }   // reopened conversation keeps the chosen mode
    if (m.type === 'result') { if (!t.itens.some(x => x.k === 'perm' && !x.resp)) { if (t.estado === 'trabalhando' && t !== aba()) t.visto = false; t.estado = 'esperando'; soltarFila(t); } }
    if (m.type === 'system' && m.subtype === 'init' && m.comandos && !t.comandos.length) t.comandos = m.comandos.map(n => ({ n, d: '' }));
    draw();
  };
  api.ao('chat:msg', aoMsg);
  api.ao('uso', (u) => usoVivo(u));   // new usage arrives after window opens (main.js doesn't wait for Claude Code)
  // big conversation (main.js verPassagem): 1 = Claude notes where it stopped; 2 = tab continues in new conversation (cheaper)
  api.ao('chat:passagem', (id, x) => { const t = chatDe(id); if (!t) return;
    if (x.fase === 0) { t.passando = false; draw(); return; }
    if (x.fase === 1) { t.passando = true; t.itens.push({ k: 'troca', txt: `Conversa grande (${x.mil} mil tokens): anotando onde parou para seguir numa conversa nova, que gasta menos` }); t.estado = 'trabalhando'; t.t0 = Date.now(); }
    else { t.passando = false; if (x.erro) { t.itens.push({ k: 'erro', txt: 'Não consegui abrir a conversa nova: ' + x.erro }); t.estado = 'encerrada'; } else { t.antes = t.sessao; t.sessao = x.sessao; t.itens.push({ k: 'troca', txt: 'Continua numa conversa nova: o Claude sabe onde parou' }); t.estado = x.pend ? 'trabalhando' : 'esperando'; salvarSessao(); soltarFila(t); } }
    t.irFim = true; draw(); });
  api.ao('chat:ferramentas', (id, x) => { const t = chatDe(id); if (!t) return; t.itens.push({ k: x.erro ? 'erro' : 'troca', txt: x.erro ? 'Não consegui reabrir com as ferramentas: ' + x.erro : x.ligadas ? 'Ferramentas extras ligadas' : 'Ferramentas extras desligadas' }); if (!x.erro && x.ligadas) { t.estado = 'trabalhando'; t.t0 = Date.now(); } t.irFim = true; draw(); });
  api.ao('chat:perm', (id, x) => {
    const t = chatDe(id); if (!t) return;
    const f = C.ferramenta(x.tool, x.input, t.dir);
    t.itens.push({ k: 'perm', req: x.req, tool: x.tool, input: x.input, dir: t.dir, resumo: f.alvo, escolhas: {} });
    t.estado = 'pede'; t.irFim = true; if (t !== aba()) t.visto = false; draw();
  });
  api.ao('chat:perm-fim', (id, req) => { const t = chatDe(id); if (!t) return; const it = t.itens.find(x => x.req === req); if (it && !it.resp) it.resp = 'cancelado'; if (t.estado === 'pede' && !t.itens.some(x => x.k === 'perm' && !x.resp)) t.estado = 'trabalhando'; draw(); });
  api.ao('chat:fim', (id, erro) => {
    const t = chatDe(id); if (!t || t.verTerm) return;
    t.bg = [];   // process gone: background level resets (SDK sends nothing at start)
    if (erro) t.itens.push({ k: 'erro', txt: 'O Claude Code fechou: ' + erro.slice(0, 200) });
    t.estado = 'encerrada'; t.fimHora = hhmm(); filaNaCaixa(t); if (t !== aba()) t.visto = false; draw(); salvarSessao();
  });
  // "Para testar": what user checked on project card goes with message as tested and becomes [x] in PRA-TESTAR.md
  if (!TESTE) { try { S.tst = JSON.parse(localStorage.getItem('tst') || '{}'); } catch { S.tst = {}; } }   // checked and not yet sent survives app close
  M.salvarTestes = () => { if (!TESTE) try { localStorage.setItem('tst', JSON.stringify(S.tst)); } catch { } };
  function comTestes(t, txt) {
    const q = t.p; if (!q || TESTE) return txt; const mk = M.testesDe ? M.testesDe(q) : []; if (!mk.length) return txt;
    api.testesFeitos(q.dir, mk).then(() => api.projetos().then(setProj)).catch(() => { });
    S.tst[q.n] = []; M.salvarTestes();
    return txt + '\n\n[User tested OK (now [x] in PRA-TESTAR.md; do not ask again):\n' + mk.map(x => '- ' + x).join('\n') + ']';
  }
  function enviar(t, daFila) {
    let txt = daFila || cmdNaFrente(t, t.el.txt.value.trim().replace(/^\/\s+/, '')); if ((!txt && !(t.anexos || []).length) || txt === '/' || t.estado === 'encerrada') return; t.cmdFora = false;   // lone "/" in front (no command chosen) isn't sent
    if (!daFila && (t.anexos || []).length) { txt = comAnexos(t.anexos, txt); t.anexos = []; pintarAnexos(); }   // 30/10: attached cards go as @path at the start
    if (!daFila && t.editando) return reenviarEditado(t, txt);
    const caixa = () => { if (daFila) return; t.el.txt.value = ''; t.texto = ''; altura(t); };
    if (!daFila && (t.estado === 'trabalhando' || t.estado === 'pede')) { (t.fila = t.fila || []).push(txt); caixa(); t.irFim = true; desenharChat(t); return; }   // 27/10 user request: sent while it answers = waits in queue, goes when the reply ends
    t.itens.push({ k: 'eu', txt, antes: t.ultUuid }); caixa(); t.vazio = '';
    let txtIA = comTestes(t, txt);
    if (t.herdarClaude) { txtIA = contextoHerdado(t.herdarClaude) + txtIA; t.herdarClaude = null; }   // came from local AI: 1st message carries what was said
    if (t.estado === 'abrindo') { t.pendente = (t.pendente ? t.pendente + '\n\n' : '') + txtIA; t.irFim = true; desenharChat(t); return; }   // sent as soon as conversation opens
    if (t.estado !== 'pede') { t.estado = 'trabalhando'; t.t0 = Date.now(); }
    t.irFim = true; if (!t.usada) { t.usada = true; salvarSessao(); }
    if (!TESTE) api.chatEnviar(t.id, txtIA);
    desenharChat(t); draw();
  }
  function soltarFila(t) { if (t.fila && t.fila.length && t.estado === 'esperando') enviar(t, t.fila.splice(0).join('\n\n')); }
  function filaNaCaixa(t) { if (!t.fila || !t.fila.length) return; const x = t.fila.splice(0).join('\n\n'); t.el.txt.value = t.el.txt.value.trim() ? t.el.txt.value + '\n' + x : x; t.texto = t.el.txt.value; altura(t); }   // stopped/closed: queue goes back to the box, not sent
  function permPendente(t) { for (let i = t.itens.length - 1; i >= 0; i--) if (t.itens[i].k === 'perm' && !t.itens[i].resp) return [t.itens[i], i]; return [null, -1]; }
  function responderPerm(t, acao, item) {
    const [it] = item ? [item] : permPendente(t); if (!it) return;
    if (it.tool === 'AskUserQuestion' && acao !== 'negado') {
      const qs = it.input.questions || []; const answers = {};
      qs.forEach((q, qi) => { const sel = it.escolhas[qi] || []; if (sel.length) answers[q.question] = sel.map(oi => q.options[oi].label).join(', '); });
      if (Object.keys(answers).length < qs.length) return;
      it.resp = 'respondido'; it.resumo = Object.values(answers).join(' · ');
      if (!TESTE) api.chatPerm(t.id, it.req, { acao: 'ok', input: { answers } });
    } else {
      it.resp = acao === 'aprovado' ? 'aprovado' : acao;
      const msg = it.tool === 'ExitPlanMode' ? 'O usuário quer mudanças no plano: pergunte o que mudar.' : it.tool === 'AskUserQuestion' ? 'O usuário preferiu não responder agora.' : 'O usuário negou.';
      if (!TESTE) api.chatPerm(t.id, it.req, acao === 'negado' ? { acao: 'negar', msg } : { acao: acao === 'sempre' ? 'sempre' : 'ok' });
    }
    if (!t.itens.some(x => x.k === 'perm' && !x.resp)) { t.estado = 'trabalhando'; t.t0 = Date.now(); }
    draw();
  }
  // edited message: conversation vanishes from there down and Claude Code reopens from point before it (new copy of
  // conversation: original kept). Files it already changed after that DON'T revert.
  async function reenviarEditado(t, txt) {
    const ed = t.editando; t.editando = null;
    t.itens.splice(ed.i); t.itens.push({ k: 'eu', txt, antes: ed.antes }); t.ultUuid = ed.antes; t.vazio = '';
    t.el.txt.value = ''; t.texto = ''; altura(t); t.irFim = true; t.usada = true;
    if (TESTE) { t.estado = 'trabalhando'; t.t0 = Date.now(); return draw(); }
    t.estado = 'abrindo'; api.chatFechar(t.id); draw();
    const o = { id: t.id, dir: t.dir, nome: t.p ? t.p.n : 'chat livre', modelo: t.modelo, esf: t.esf, pensar: t.pensar };
    const r = ed.antes ? await api.chatAbrir({ ...o, modo: 'resume', sessao: t.sessao, ate: ed.antes }) : await api.chatAbrir({ ...o, modo: 'nova', sessao: uuid() });
    if (!S.abas.includes(t)) return;
    if (!r || r.erro) { t.itens.push({ k: 'erro', txt: (r && r.erro) || 'Não consegui reabrir a conversa para editar.' }); t.estado = 'encerrada'; t.fimHora = hhmm(); return draw(); }
    if (!ed.antes) t.sessao = r.sessao;
    t.estado = 'trabalhando'; t.t0 = Date.now(); api.chatEnviar(t.id, txt); salvarSessao(); draw();
  }
  function interromper(t) {
    if (t.estado !== 'trabalhando' && t.estado !== 'pede') return;
    for (const x of t.itens) if (x.k === 'perm' && !x.resp) x.resp = 'negado';
    t.itens.push({ k: 'interrompido' }); t.estado = 'esperando'; filaNaCaixa(t);
    if (!TESTE) api.chatParar(t.id);
    draw();
  }
  // previous conversation of the tab (passagem) above current one; keeps link for next save (27/10)
  function histAntes(t, r) { if (r.antes) t.antes = r.antes; if (!r.histAntes || !r.histAntes.length) return; for (const m of r.histAntes) C.aplicar(t, m, false); t.itens.push({ k: 'troca', txt: 'Continua numa conversa nova: o Claude sabe onde parou' }); }
  async function reabrir(t) {
    t.estado = 'abrindo'; t.cache = {}; draw();
    const r = await api.chatAbrir({ id: t.id, dir: t.dir, modo: 'resume', sessao: t.sessao, antes: t.antes, modelo: t.modelo, esf: t.esf, pensar: t.pensar });
    if (r && (r.erro || r.semConversa)) {     // conversation that never got a message has nothing to resume: start new one
      const r2 = await api.chatAbrir({ id: t.id, dir: t.dir, modo: 'nova', sessao: uuid(), modelo: t.modelo, esf: t.esf });
      if (r2 && r2.erro) { t.estado = 'encerrada'; mostrarToast(r2.erro); return; } t.sessao = r2.sessao;
    } else if (r.historico && r.historico.length) { t.itens = []; t.streamados = new Set(); histAntes(t, r); for (const m of r.historico) C.aplicar(t, m, false); t.comandos = r.comandos || t.comandos; }
    t.itens.push({ k: 'troca', txt: 'Conversa retomada' }); t.estado = 'esperando'; t.irFim = true;
    if (t.pendente) { api.chatEnviar(t.id, t.pendente); t.pendente = null; t.estado = 'trabalhando'; t.t0 = Date.now(); }
    draw();
  }
  // "Ver o terminal": same conversation in terminal Claude Code (chat closes meanwhile)
  async function alternarTerminal(t) {
    if (!chat(t) || TESTE) { if (chat(t)) { t.verTerm = !t.verTerm; draw(); } return; }
    if (!t.verTerm && C.ehLocal(t.modelo)) return mostrarToast('A IA local conversa direto com o Ollama, sem o Claude Code: não tem terminal.');
    if (!t.verTerm) {
      api.chatFechar(t.id); t.verTerm = true; desenhar();          // area must be visible before measuring terminal
      const x = novoTerminal(t, t.el.termC); ajustar(t); x.term.focus();
      await new Promise(r => requestAnimationFrame(r)); ajustar(t);
      const r = await api.ptyAbrir({ id: t.id, dir: t.dir, modo: t.usada ? 'resume' : 'nova', nome: t.p ? t.p.n : 'chat livre', sessao: t.sessao, ia: C.ehLocal(t.modelo) ? t.modelo : 'claude', modelo: C.ehLocal(t.modelo) ? '' : t.modelo, esf: t.esf, pensar: t.pensar, cols: x.term.cols, rows: x.term.rows });
      if (r && r.erro) { mostrarToast(r.erro); } else { t.ptyVivo = true; t.usada = true; }
    } else {
      api.ptyFechar(t.id); t.ptyVivo = false; if (t.xt) { t.xt.term.dispose(); t.xt.host.remove(); t.xt = null; }
      t.verTerm = false; await reabrir(t); t.el.txt.focus();
    }
  }
  // "Entrar na conta" tab: terminal with claude auth login
  async function abrirLogin() {
    const t = novaAba(null, 'login', {}); t.pty = true; t.modelo = 'opus';
    const x = novoTerminal(t, document.getElementById('terms')); t.host = x.host; desenhar(); ajustar(t); x.term.focus();
    if (TESTE) return t;
    const r = await api.ptyAbrir({ id: t.id, dir: D.temp, modo: 'login', cols: x.term.cols, rows: x.term.rows });
    if (r && r.erro) { fecharAba(S.abas.indexOf(t), true); mostrarToast(r.erro); return null; }
    t.ptyVivo = true; return t;
  }
  // sign in/add account: hidden login (main.js login-iniciar) + wait window; finished in browser → back to Account
  async function entrarConta(email, semJanela) {
    if (!semJanela) S.modal = 'entrando'; S.pop = null; M.D.login = { email, url: '' }; draw(); if (TESTE) return;
    const r = await api.loginIniciar(email); if (r && r.erro) { M.D.login.erro = r.erro; draw(); }
  }
  api.ao('login:url', (u) => { if (M.D.login) { M.D.login.url = u; draw(); } });
  api.ao('login:fim', (r) => { if (S.fluxo && /^c-|login-falhou/.test(S.fluxo)) {   // first-run flow: result becomes next step
      if (r.ok) { S.conta = r.conta; M.D.conta = contaD(); guardarLimite(0); reabrirClaude(); S.fluxo = 'c-ok'; } else if (r.erro === 'cancelado') S.fluxo = 'c-login'; else { M.D.login = { ...(M.D.login || {}), erro: 'O login não terminou: ' + r.erro + '.' }; S.fluxo = 'login-falhou'; }
      return draw(); }
    if (r.ok) { S.conta = r.conta; M.D.conta = contaD(); guardarLimite(0); S.modal = 'conta'; mostrarToast(`Entrou como ${r.conta.email}.`); reabrirClaude(); carregarJanela('conta'); }
    else if (r.erro === 'cancelado') { if (S.modal === 'entrando') { S.modal = 'conta'; carregarJanela('conta'); } }
    else { M.D.login = { ...(M.D.login || {}), erro: `O login não terminou: ${r.erro}` }; S.modal = 'entrando'; draw(); } });
  // account switched: idle Claude conversations reopen on new account (working ones continue and switch when done)
  // after account switch: new list with sliding cards (FLIP) and new account usage fetched immediately
  async function trocou() {
    M.D.lim = {}; const L = await api.contas(), uso = api.limUso('');
    const mo = document.getElementById('modal'), antes = new Map([...mo.querySelectorAll('[data-conta]')].map(e => [e.dataset.conta, e.getBoundingClientRect().top]));
    M.D.contas = L; desenhar();
    for (const e of mo.querySelectorAll('[data-conta]')) { const t0 = antes.get(e.dataset.conta); if (t0 == null) continue; const d = t0 - e.getBoundingClientRect().top; if (!d) continue;
      e.classList.remove('anda'); e.style.transform = `translateY(${d}px)`; e.getBoundingClientRect(); e.classList.add('anda'); e.style.transform = ''; }
    usoVivo(await uso); M.D.contas = await api.contas(); setTimeout(draw, 400);
  }
  // account limit hit: auto-moves to next saved account with limit and sends "continue" to stopped conversation (option, default on)
  let autoT = 0, usoT = 0;
  async function autoTrocar(t, ate) {
    if (TESTE || OP.autoConta === '0' || Date.now() - autoT < 60000) return false; autoT = Date.now();
    const p = await api.contaEsgotou(ate || 0); if (!p) return false;
    mostrarToast(`Limite de ${S.conta.email} acabou: passando para ${p.email}…`);
    const r = await api.contaUsar(p.email); if (!r || !r.ok) { mostrarToast(`Não troquei para ${p.email}: ${(r && r.erro) || 'erro'}.`); return false; }
    S.conta = r.conta; M.D.conta = contaD(); guardarLimite(0); trocou();
    for (const x of S.abas) if (chat(x) && !C.ehLocal(x.modelo) && x !== t && (x.estado === 'esperando' || x.estado === 'encerrada')) { api.chatFechar(x.id); reabrir(x); }
    if (t && S.abas.includes(t)) { api.chatFechar(t.id); await reabrir(t); t.el.txt.value = 'continue'; t.texto = 'continue'; enviar(t); }
    mostrarToast(`Agora em ${p.email}: o trabalho continuou.`); return true;
  }
  function reabrirClaude() { for (const t of S.abas) if (chat(t) && !C.ehLocal(t.modelo) && (t.estado === 'esperando' || t.estado === 'encerrada')) { api.chatFechar(t.id); reabrir(t); } }
  function reabrirLogin(t) { const i = S.abas.indexOf(t); fecharAba(i, true); abrirLogin(); }
  function irPara(i) {
    if (i < 0 || i >= S.abas.length) return; S.ativa = i; S.pop = null; const t = S.abas[i]; if (t.tipo === 'chat') t.visto = true; S.toast = ''; desenhar();
    if (t.xt && (t.pty || t.verTerm)) { ajustar(t); t.xt.term.focus(); } else if (chat(t)) { t.el.rolar.scrollTop = t.el.rolar.scrollHeight; t.el.txt.focus(); }
  }
  function fecharAba(i, forcar) {
    const t = S.abas[i]; if (!t || t.tipo === 'inicio') return;
    if ((t.estado === 'trabalhando' || t.estado === 'pede') && !forcar) { S.fechar = i; S.modal = 'fechar'; draw(); return; }
    guardarConversa(t);
    if (!TESTE) { api.chatFechar(t.id); api.ptyFechar(t.id); }
    if (t.xt) t.xt.term.dispose(); if (t.host) t.host.remove();
    S.abas.splice(i, 1); if (S.ativa >= i) S.ativa = Math.max(0, S.ativa - 1); S.modal = null; S.fechar = null;
    irPara(S.ativa); salvarSessao();
  }
  // project tab closed: save conversation and last message (Continue returns to it; Home shows message)
  function guardarConversa(t) {
    if (chat(t) && !t.p && t.usada && !TESTE) setTimeout(carregarRasc, 1500);   // closed free chat shows in Rascunhos
    if (!chat(t) || !t.p || !t.usada || TESTE) return;
    const u = [...t.itens].reverse().find(x => x.k === 'ia' || x.k === 'eu'); if (!u) return;
    const txt = (u.k === 'ia' ? u.md : 'Você: ' + u.txt).replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim();
    const d = new Date(), quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hhmm(d)}`;
    const x = { dir: t.p.dir, sessao: t.sessao, modelo: t.modelo, esf: t.esf, pensar: t.pensar, quando, txt: txt.length > 220 ? txt.slice(0, 220) + '…' : txt };
    api.conversaFechada(x);
    const q = S.proj.find(y => y.n === t.p.n); if (q) q.ult = x;
  }
  addEventListener('beforeunload', () => { for (const t of S.abas) guardarConversa(t); });
  function salvarSessao() {
    if (TESTE || D.teste.roteiro) return;
    // only conversations that really exist (new conversation with no message has nothing to resume)
    api.sessao(abasSalvas());
  }
  // continue: it was working on it (after an update, this conversation continues by itself)
  const abasSalvas = () => S.abas.filter(t => chat(t) && t.usada).map(t => ({ nome: t.titulo, nomeado: !!t.nomeado, dir: t.dir, proj: t.p ? t.p.n : '', modo: t.modo, sessao: t.sessao, antes: t.antes, modelo: t.modelo, esf: t.esf, pensar: t.pensar, continuar: t.estado === 'trabalhando' || t.estado === 'pede' }));
  // build asked to restart already updated (only with user's approval): save tabs (even with "não lembrar") and close
  // 25/10: project icon at root (launcher) opens FCC on that project: FCC.exe --projeto <name>
  // 25/10 drafts: closed free chat stays on rail (B.js draws; main.js reads from disk)
  S.rasc = [];
  function carregarRasc() { if (TESTE) return; api.rascunhos().then(L => { S.rasc = L || []; draw(); }).catch(() => { }); }
  M.rascunhos = () => (TESTE ? (M.D.rascunhos || []) : S.rasc).filter(c => !S.abas.some(t => t.sessao === c.id));
  M.rascunhoAcao = async (ac, id, v) => {
    if (TESTE) return;
    const c = S.rasc.find(x => x.id === id); if (!c) return;
    const r = await api.rascunho(ac, id, v);
    if (!r || !r.ok) { mostrarToast((r && r.erro) || 'Não deu certo.'); return carregarRasc(); }
    if (ac === 'abrir') return abrir(null, 'livre', { sessao: id, modoChat: 'resume', titulo: c.titulo, nomeado: true });
    if (ac === 'renomear') { c.titulo = v; return draw(); }
    S.rasc = S.rasc.filter(x => x.id !== id);
    if (ac === 'apagar') { mostrarToast(`"${c.titulo}" foi para a Lixeira.`); return draw(); }
    if (ac === 'projeto') { setProj(await api.projetos()); const q = S.proj.find(x => x.n === r.n); mostrarToast(`Projeto ${r.n} criado; a conversa continua nele.`); if (q) abrir(q, 'continuar', { sessao: id, modoChat: 'resume', titulo: c.titulo, nomeado: true }); else draw(); }
  };
  // first-run steps (fluxo.js): real actions; returns true when handled (else flow just navigates)
  // demo: steps advance by themselves on screen, no install, login or download
  function demoFluxo(k, v) {
    const ir = (t, ms) => setTimeout(() => { S.fluxo = t; draw(); }, ms);
    if (k === 'fx-instalar') { S.fluxo = 'c-preparar'; S.fluxoEt = ''; draw(); setTimeout(() => { S.fluxoEt = 'feito'; draw(); ir('c-login', 800); }, 1800); return true; }
    if (k === 'fx-entrar') { S.fluxo = 'c-esperando'; draw(); setTimeout(() => { if (S.fluxo !== 'c-esperando') return; M.D.conta = { email: 'voce@exemplo.com', plano: 'Max' }; S.fluxo = 'c-ok'; draw(); }, 3500); return true; }
    if (k === 'fx-navegador') { mostrarToast('Na demonstração o navegador não abre.'); return true; }
    if (k === 'fx-cancelar') { M.D.login = { erro: 'A entrada foi cancelada.' }; S.fluxo = 'login-falhou'; draw(); return true; }
    if (k === 'fx-claude') { M.agir('escolha:claude'); return true; }
    if (k === 'fx-baixar') { S.fluxoTag = v; S.fluxo = 'l-baixando'; S.baixando[v] = 0; draw();
      const t = setInterval(() => { if (S.fluxo !== 'l-baixando') return clearInterval(t); S.baixando[v] = Math.min(100, S.baixando[v] + 4); draw(); if (S.baixando[v] >= 100) { clearInterval(t); delete S.baixando[v]; ir('pasta', 600); } }, 220); return true; }
    if (k === 'fx-loja' || k === 'fx-outra') { mostrarToast('Na demonstração isso fica desligado.'); return true; }
    if (k === 'fx-ollama') { S.ollama = 'instalando'; draw(); setTimeout(() => { S.ollama = true; draw(); }, 2500); return true; }
    if (k === 'fx-fim') { S.fluxo = null; draw(); mostrarToast('Fim da demonstração. Feche quando quiser: o seu FCC não foi alterado.'); return true; }
    if (k === 'fx-ir' && (v === 'l-preparar' || v === 'l-loja')) { carregarJanela('baixar'); if (S.ollama !== true) S.ollama = false; }
    return false;
  }
  M.fluxoPrograma = (a) => {
    const [k, v] = [a.split(':')[0], a.split(':').slice(1).join(':')];
    if (TESTE) return false;
    if (D.demo) return demoFluxo(k, v);
    if (k === 'fx-instalar') { S.fluxo = 'c-preparar'; S.fluxoEt = ''; draw();
      api.instalarClaude().then(async () => { S.conta = await api.conta(); if (S.conta.estado === 'ausente') S.fluxoEt = 'erro'; else { S.fluxoEt = 'feito'; S.fluxo = S.conta.estado === 'ok' ? (S.primeira ? 'pasta' : null) : 'c-login'; } draw(); }); return true; }
    if (k === 'fx-entrar') { S.fluxo = 'c-esperando'; S.fluxoCam = 'claude'; entrarConta('', true); return true; }
    if (k === 'fx-navegador') { if (M.D.login && M.D.login.url) api.link(M.D.login.url); else entrarConta('', true); return true; }
    if (k === 'fx-cancelar') { api.loginCancelar(); S.fluxo = 'c-login'; draw(); return true; }
    if (k === 'fx-claude') { M.agir('escolha:claude'); return true; }
    if (k === 'fx-baixar') { S.fluxoTag = v; S.fluxo = 'l-baixando'; M.agir('Lbaixar:' + v); S.modal = null; draw(); return true; }
    if (k === 'fx-loja') { S.fluxo = null; S.modal = 'baixar'; S.jAba = 0; draw(); carregarJanela('baixar'); return true; }
    // 27/10 (user request): 1st-run folder step has only "Escolher a pasta"; choosing again replaces the previous choice (main folder never goes into pastas)
    if (k === 'fx-outra') { (async () => { const d = await api.escolherPasta(); if (!d) return; const L = String(OP.pastas || '').split(';').map(x => x.trim()).filter(x => x && x !== S.fluxoPasta);
      if (d.toLowerCase() !== String(D.raiz || '').toLowerCase() && !L.includes(d)) L.push(d); OP.pastas = L.join(';'); S.fluxoPasta = d; const r = await api.opcao('pastas', OP.pastas); if (r) setProj(r); draw(); })(); return true; }
    if (k === 'fx-ollama') { S.ollama = 'instalando'; draw(); api.ollamaInstalar().then(ok => { S.ollama = ok ? true : 'erro'; if (ok) carregarJanela('baixar'); draw(); }); return true; }
    if (k === 'fx-ir' && (v === 'l-preparar' || v === 'l-loja')) { carregarJanela('baixar'); api.ollamaEstado().then(o => { S.ollama = o; draw(); }); }   // catalog and PC (without opening window); keep navigating
    if (k === 'fx-ir' && v === 'c-login' && S.conta.estado === 'ok') { S.fluxo = null; draw(); return true; }
    return false;
  };
  const abrirPorNome = (n) => { const q = S.proj.find(x => x.n.toLowerCase() === String(n).toLowerCase()); if (q) abrir(q, 'continuar'); };
  api.ao('abrir-projeto', abrirPorNome);
  // auto-update progress/result from main (atualizacao.js)
  api.ao('atualizacao', (r) => { if (TESTE) return; S.atual = r; if (r.estado === 'pronta' || r.estado === 'ja-pronta') S.pendente = true; if (r.estado === 'pronta') mostrarToast('Versão nova do FCC baixada e conferida. Entra quando você fechar o programa.'); draw(); });
  api.ao('reiniciar', () => { if (TESTE) return; api.sessao(abasSalvas()); api.janela('fechar'); });
  async function restaurar() {
    const lista = S.sessao; S.modal = null;
    for (const x of lista) {
      const q = S.proj.find(y => y.n === x.proj) || (x.proj && x.dir ? S.proj.find(y => y.dir.toLowerCase() === x.dir.toLowerCase()) : null) || (x.proj ? { n: x.proj, l: x.proj[0].toUpperCase(), dir: x.dir, st: 'livre', itens: [] } : null);   // 25/10: renamed project (CCT→FCC) found by folder; never without letter
      const t = await abrir(q, x.modo, { sessao: x.sessao, modelo: x.modelo || (x.ia && x.ia !== 'claude' ? x.ia : undefined), esf: x.esf, pensar: x.pensar, titulo: x.nome, nomeado: x.nomeado, antes: x.antes, modoChat: 'resume' });
      if (t) t.usada = true;
      if (t && D.atualizou && x.continuar) { const tx = 'O programa foi atualizado e reaberto enquanto você trabalhava. Continue de onde parou (docs\\PARADA.md).'; t.el.txt.value = tx; t.texto = tx; enviar(t); }
    }
    irPara(0);
  }
  function fecharModal() { if (S.modal === 'baixar' && !TESTE) api.modFechou(); S.modal = null; draw(); }   // open Baixar IA keeps Ollama on
  { let ult = performance.now(); setInterval(() => { const a = performance.now(); if (a - ult > 2500 && document.visibilityState === 'visible' && document.hasFocus()) api.log(`tela parada ${Math.round(a - ult)} ms (janela ${S.modal || '-'})`); ult = a; }, 500); }
  let toastTimer = null;
  function mostrarToast(t) { S.toast = t; draw(); clearTimeout(toastTimer); if (!TESTE) toastTimer = setTimeout(() => { S.toast = ''; draw(); }, 5000); }
  M.mostrarToast = mostrarToast;
  if (!TESTE) { M.pastaAcao = (a, x) => api.pastaAcao(a, x); M.pastaRecarregar = () => carregarJanela('pasta'); }

  // ---- window data (M.D): prototype shows sample, here from disk and Claude Code when window opens ----
  const GB = (n) => String(Math.round((+n || 0) * 10) / 10).replace('.', ',');
  const cabeDe = (gb) => { const pc = M.D.pc || {}; if (!pc.vram) return 'cabe'; return gb <= pc.vram * 0.9 ? 'cabe' : gb <= pc.vram + (pc.ram || 16) * 0.5 ? 'meio' : 'nao'; };
  const CABE = { cabe: 'cabe na placa', meio: 'cabe em parte (mais lento)', nao: 'grande demais' };
  // local models read from disk (main.js: modelosDoDisco): instant, no Ollama start
  async function carregarLocais() { const r = TESTE ? { modelos: [] } : await api.iaDisco(); S.locais = r.modelos || []; S.velo = r.velo || S.velo || {}; if (!TESTE) { montarLocal(); montarInst(); } }
  function montarInst() { const ant = lojaD().INST; lojaD().INST = Object.fromEntries((S.locais || []).map(m => [m.n, { gb: m.gb, ...(S.velo[m.n] || {}), usado: (ant[m.n] || {}).usado }])); }
  const lojaD = () => M.D.loja || (M.D.loja = { PC: {}, CAT: [], INST: {}, FILA: S.fila, BUSCA: [], ACHADOS: [], estado: 'carregando' });
  function montarLocal() {
    const L = M.D.local; L.instalados = (S.locais || []).map(m => ({ n: m.n, d: `${m.gb} GB · ${CABE[cabeDe(m.gb)]}` }));
    if ((!L.modelo || !L.instalados.some(x => x.n === L.modelo)) && L.instalados[0]) L.modelo = L.instalados[0].n;
    const m = (S.locais || []).find(x => x.n === L.modelo); L.gb = m ? m.gb : 0; L.cabe = m ? (cabeDe(m.gb) === 'cabe' ? 'cabe inteiro na placa' : CABE[cabeDe(m.gb)]) : '';
  }
  function contaD() { const c = S.conta || {}; return c.estado === 'ok' ? { email: c.email, plano: c.plano, versao: M.D.claudeVersao || '' } : {}; }
  async function carregarJanela(m) {
    M.D.conta = contaD();
    if (TESTE) return;
    try {
      if (m === 'ia' || m === 'conta' || m === 'est') {
        const t = chat(aba()) ? aba() : null, r = await api.iaEstado(t ? t.id : '');
        Object.assign(M.D.local, r.local || {}); M.D.pc = r.pc || M.D.pc; if (r.pc) M.D.local.placaNome = r.pc.placa;
        if (r.lim) { usoVivo(r.lim); if (S.limiteAte && r.lim.sessao && r.lim.sessao.pct < 100 && (!r.lim.semana || r.lim.semana.pct < 100)) guardarLimite(0); } if (r.ctx != null) M.D.memConversa = r.ctx; else if (!t) M.D.memConversa = null;
        if (r.claudeVersao) M.D.claudeVersao = r.claudeVersao; M.D.conta = contaD();
        await carregarLocais();
      }
      if (m === 'conta') M.D.contas = await api.contas();
      if (m === 'est') M.D.est = resumoEst(await api.esDados());
      if (m === 'regras') Object.assign(M.D, await api.regras());
      if (m === 'pasta') { try { M.D.pasta = await api.pastaDados(); } catch (e) { M.D.pasta = { erro: String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '') }; api.log('janela pasta: ' + (e.stack || e)); } }
      if (m === 'opcoes') { Object.assign(M.D, await api.versoes()); M.D.pastas = [D.raiz, ...String(OP.pastas || '').split(';').map(x => x.trim()).filter(Boolean)]; }
      if (m === 'baixar') {
        const d = await api.modDados(), L = lojaD(); M.D.pc = d.pc; M.D.placa = `${d.pc.placa} · ${d.pc.vram} GB`;
        Object.assign(L, { PC: { placa: d.pc.placa, vram: d.pc.vram, ram: d.pc.ram, disco: d.pc.livre }, CAT: d.cat || [], ACHADOS: d.achados || [], estado: d.erro ? 'off' : 'ok' }); S.velo = { ...S.velo, ...(d.velo || {}) };
        await carregarLocais(); for (const m of d.inst || []) if (L.INST[m.id]) L.INST[m.id].usado = m.uso;
        M.D.cat = (d.cat || []).map(c => ({ n: c.id, gb: GB(c.gb) + ' GB', cabe: cabeDe(c.gb), inst: (d.inst || []).some(i => i.id === c.id) }));
        for (const id of d.baixando || []) if (S.baixando[id] == null) S.baixando[id] = 0;
      }
    } catch (e) { api.log('janela ' + m + ': ' + (e.stack || e)); }
    draw();
  }
  async function buscarModelos(tx) {
    if (TESTE || !tx.trim()) return; M.D.buscaTx = tx; M.D.busca = [{ n: 'Procurando nos sites…', d: '' }]; draw();
    const f = { Todos: 'todas', Ollama: 'ollama', 'Hugging Face': 'hf', ModelScope: 'ms' }[S.fonte || 'Todos'];
    const r = await api.modBuscar(tx, f); M.D.busca = (r || []).map(m => ({ id: m.id, n: m.n || m.id, d: [m.fonte === 'hf' ? 'Hugging Face' : m.fonte === 'ms' ? 'ModelScope' : 'Ollama', m.gb ? GB(m.gb) + ' GB' : ''].filter(Boolean).join(' · ') }));
    if (!M.D.busca.length) M.D.busca = [{ n: 'Nada encontrado com esse nome.', d: '' }]; draw();
  }
  api.ao('mod:progresso', (id, x) => { if (S.fluxo === 'l-baixando') draw(); S.baixando[id] = x.pct; const f = filaDe(id); if (f) { f.pct = x.pct; f.gb = x.gb || f.gb; f.vel = x.velo ? x.velo + ' MB/s' : ''; const s = x.velo ? (x.gb - x.feito) * 1e9 / 1048576 / x.velo : 0; f.falta = s ? (s < 90 ? Math.max(1, Math.round(s)) + ' s' : Math.round(s / 60) + ' min') : ''; f.st = 'ativo'; } if (S.modal === 'baixar' || S.modal === 'ia') draw(); });
  api.ao('mod:fim', (id, r) => { delete S.baixando[id]; const f = filaDe(id);
    if (S.fluxo === 'l-baixando' && id === S.fluxoTag && r.ok) carregarLocais().then(() => { M.agir('usarmod:' + id); S.fluxo = S.primeira ? 'pasta' : null; draw(); });   // 1st downloaded AI: becomes Local AI in use
    if (f) { if (r.ok) Object.assign(f, { st: 'ok', pct: 100, vel: '', falta: '' }); else if (r.erro === 'cancelado') { if (f.st !== 'pausado') S.fila.splice(S.fila.indexOf(f), 1); } else Object.assign(f, { st: 'falhou', erro: r.erro || 'erro' }); guardarFila(); }
    if (r.erro !== 'cancelado') mostrarToast(r.ok ? `${id} baixado: já aparece em Meus modelos.` : `${id} não baixou: ${r.erro || 'erro'}.`); carregarLocais().then(() => carregarJanela(S.modal)); });
  // download queue (store): saved; what was downloading when app closed returns paused (Ollama keeps downloaded part)
  S.fila = (() => { try { return (JSON.parse(localStorage.getItem('fila') || '[]') || []).map(x => x.st === 'ativo' ? { ...x, st: 'pausado', vel: '', falta: '' } : x); } catch { return []; } })();
  const guardarFila = () => { try { localStorage.setItem('fila', JSON.stringify(S.fila)); } catch { } };
  const filaDe = (id) => S.fila.find(x => x.n === id);
  M.lojaAcao = async (k, v) => {
    if (TESTE) return draw();
    const L = lojaD(); L.FILA = S.fila; const f = filaDe(v);
    if (k === 'abrir') return carregarJanela('baixar');
    if (k === 'Lbaixar' || k === 'Lnome') { if (f && f.st !== 'ok') return draw(); if (f) S.fila.splice(S.fila.indexOf(f), 1); const c = L.CAT.flatMap(m => m.v).find(x => x.tag === v), b = L.BUSCA.find(x => x.id === v); S.fila.unshift({ n: v, gb: c ? c.gb : b ? b.gb : 0, pct: 0, st: 'ativo' }); api.modBaixar(v); guardarFila(); mostrarToast(`Baixando ${v}: acompanhe em Downloads.`); return draw(); }
    if (k === 'Lpausa' && f) { if (f.st === 'ativo') { f.st = 'pausado'; f.vel = f.falta = ''; api.modCancelar(v); } else { f.st = 'ativo'; f.erro = ''; api.modBaixar(v); } guardarFila(); return draw(); }
    if (k === 'Lcancela' && f) { if (f.st === 'ativo') api.modCancelar(v); S.fila.splice(S.fila.indexOf(f), 1); guardarFila(); return draw(); }
    if (k === 'Llimpar') { S.fila.splice(0, S.fila.length, ...S.fila.filter(x => x.st !== 'ok')); guardarFila(); return draw(); }
    if (k === 'Lbench') { L.bench = v; draw(); const r = await api.modBench(v); L.bench = null; if (r && r.erro) mostrarToast('Não consegui medir: ' + r.erro); else { S.velo[v] = r; montarInst(); mostrarToast(`${v}: ${r.tps} tok/s na sua placa.`); } return draw(); }
    if (k === 'Lbusca') { L.buscando = true; L.BUSCA = []; draw(); const r = await api.modBuscar(v, S.L.fontes); L.buscando = false; L.BUSCA = (r || []).map(m => ({ id: m.id, nome: m.n || m.id, de: m.de || '', gb: m.gb || 0, q: m.q || '', fonte: m.fonte, baixados: m.baixados || '', curtidas: m.curtidas || 0, quando: m.quando || '', caps: m.caps || '', ctx: m.ctx || '' })); return draw(); }
    if (k === 'Lsite') return api.modSite(v);
    if (k === 'Lachado') { const a = L.ACHADOS[+v]; if (!a) return; M.D.gguf = { caminho: a.caminho, nome: a.n.replace(/.gguf$/i, '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-') + ':latest' }; return agir('gguf-adicionar'); }
  };

  // stats: sessions saved by main.js (open → close tab) become window numbers
  function resumoEst(d) {
    const ses = (d && d.sessoes) || [], agora = (d && d.agora) || Date.now(), e = S.est || {};
    const dias = e.per === 'Hoje' ? 1 : e.per === '7 dias' ? 7 : e.per === '30 dias' ? 30 : 3650, ini = agora - dias * 864e5;
    const doIa = (s) => e.ia === 'Tudo' || (e.ia === 'Local') === C.ehLocal(s.mod || 'opus');
    const tokS = (s) => (s.turnos || []).reduce((a, x) => a + (x.ent || 0) + (x.sai || 0), 0);
    const L = ses.filter(s => s.ini >= ini && doIa(s)), ant = ses.filter(s => s.ini >= ini - dias * 864e5 && s.ini < ini && doIa(s));
    const tot = L.reduce((a, s) => a + tokS(s), 0), totAnt = ant.reduce((a, s) => a + tokS(s), 0);
    const fmt = (n) => n >= 1e6 ? GB(n / 1e6) + ' mi' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n);
    const dur = (ms) => { const m = Math.round(ms / 6e4); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
    const tempo = L.reduce((a, s) => a + ((s.fim || agora) - s.ini), 0);
    const diasN = Math.min(dias, 7), nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], porDia = [];
    for (let i = diasN - 1; i >= 0; i--) { const d0 = new Date(agora - i * 864e5); d0.setHours(0, 0, 0, 0); const d1 = +d0 + 864e5; porDia.push([nomes[d0.getDay()], Math.round(L.filter(s => s.ini >= +d0 && s.ini < d1).reduce((a, s) => a + tokS(s), 0) / 1000)]); }
    const mx = Math.max(10, ...porDia.map(x => x[1])), passo = Math.ceil(mx / 4 / 10) * 10 || 10;
    const pp = {}; for (const s of L) pp[s.proj || 'chat livre'] = (pp[s.proj || 'chat livre'] || 0) + tokS(s);
    let proj = Object.entries(pp).sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, Math.round(v / 1000)]); if (proj.length > 5) proj = [...proj.slice(0, 4), ['outros', proj.slice(4).reduce((a, x) => a + x[1], 0)]];
    const loc = L.filter(s => C.ehLocal(s.mod || 'opus')), ttLoc = loc.reduce((a, s) => a + (s.turnos || []).reduce((b, x) => b + (x.sai || 0), 0), 0), msLoc = loc.reduce((a, s) => a + (s.turnos || []).reduce((b, x) => b + (x.ms || 0), 0), 0);
    const delta = totAnt ? Math.round((tot - totAnt) / totAnt * 100) : null;
    return { total: fmt(tot), rotulo: `Tokens ${e.per === 'Hoje' ? 'hoje' : e.per === 'Tudo' ? 'no total' : 'nos últimos ' + e.per}`, delta: delta == null ? '' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% que o período anterior`,
      mini: [['chat', String(L.length), 'conversas'], ['relogio', dur(tempo), 'com a IA'], ['cpu', msLoc ? GB(ttLoc / (msLoc / 1000)) + ' tok/s' : '—', 'IA local'], ['raio', M.D.lim && M.D.lim.sessao ? M.D.lim.sessao.pct + '%' : '—', 'do limite de 5 h']],
      dias: porDia, escala: [4, 3, 2, 1, 0].map(i => i * passo), max: passo * 4 + passo * 0.2, proj,
      recentes: [...L].sort((a, b) => b.ini - a.ini).slice(0, 6).map(s => { const d0 = new Date(s.ini); return [s.proj || 'chat livre', C.ehLocal(s.mod || 'opus') ? s.mod : C.nomeMod(s.mod || 'opus'), `${d0.toDateString() === new Date().toDateString() ? 'hoje' : String(d0.getDate()).padStart(2, '0') + '/' + String(d0.getMonth() + 1).padStart(2, '0')} ${hhmm(d0)}`, dur((s.fim || agora) - s.ini), fmt(tokS(s))]; }) };
  }

  // ---- AI per conversation (23/10): switching touches ONLY open conversation (Claude in one tab and local AI in another don't clash)
  // and becomes default for next conversations; other tabs keep their AI ----
  // 26/10: conversation coming from local AI → Claude: latest messages (same smart window as local.js janela:
  // ~5, more if short, fewer if long; long ones keep start+end) go once, before 1st message
  function contextoHerdado(h) {
    const enx = (x) => x.length > 1600 ? x.slice(0, 900) + '\n[…trecho do meio cortado…]\n' + x.slice(-500) : x;
    const pega = []; let tam = 0;
    for (let i = h.length - 1; i >= 0 && pega.length < 12; i--) { const c = enx(h[i].txt), n = c.length;
      if (pega.length >= 2 && (tam + n > 7000 || (pega.length >= 6 && tam + n > 3500))) break; pega.unshift((h[i].r === 'eu' ? 'Usuário: ' : 'IA local: ') + c); tam += n; }
    return '[Conversa anterior nesta aba, com a IA local (últimas mensagens):\n' + pega.join('\n\n') + '\n]\n\n';
  }
  async function ativarIA(qual) {
    const t = aba(), atual = iaDaTela();
    if (qual === 'local' && !M.D.local.modelo) { await carregarLocais(); if (!M.D.local.modelo) { S.modal = 'baixar'; S.jAba = 0; carregarJanela('baixar'); return mostrarToast('Nenhum modelo no seu PC ainda: baixe um para usar a IA local.'); } }
    S.ia = qual; const novo = qual === 'local' ? M.D.local.modelo : PADRAO().modelo; if (!chat(t)) S.prox.ia = qual;
    if (!TESTE && qual === 'local') { api.opcao('iaLocal', M.D.local.modelo); api.iaAquecer(M.D.local.modelo); }
    if (qual === atual && !(chat(t) && qual === 'local' && t.modelo !== novo)) { draw(); return carregarJanela(S.modal); }
    if (chat(t)) {
      if (t.estado === 'trabalhando' || t.estado === 'pede') { mostrarToast('Esta conversa está trabalhando: espere terminar (ou pare) para trocar a IA dela.'); return draw(); }
      const i = S.abas.indexOf(t), q = t.p;
      // 26/10 (user request): Claude → local keeps the conversation (screen and what local AI knows)
      const velhos = t.itens.filter(x => x.k === 'eu' || x.k === 'ia');
      const herdar = velhos.map(x => ({ r: x.k, txt: x.k === 'eu' ? x.txt : x.md })).filter(x => x.txt);
      fecharAba(i, true);
      const n = await abrir(q, 'nova', { modelo: novo, esf: 'medium', titulo: t.titulo, nomeado: t.nomeado, herdar: herdar.length && qual === 'local' ? herdar : undefined });
      if (n && velhos.length) { n.itens.unshift(...velhos, { k: 'troca', txt: 'Daqui em diante: ' + (qual === 'local' ? 'IA local (' + novo + ')' : 'Claude (' + C.nomeMod(novo) + ')') }); n.usada = true; n.vazio = ''; n.irFim = true;
        if (qual === 'claude') n.herdarClaude = herdar; draw(); }   // local → Claude: Claude gets it with 1st message (contextoHerdado)
      mostrarToast(`Esta conversa agora usa ${qual === 'local' ? 'a IA local (' + M.D.local.modelo + ')' : 'o Claude (' + C.nomeMod(S.modelo) + ')'}. As outras abas continuam como estavam.`);
    } else mostrarToast(`A próxima conversa abre com ${qual === 'local' ? 'a IA local: ' + M.D.local.modelo : 'o Claude: ' + C.nomeMod(S.prox.modelo)}.`);
    if (qual === 'claude' && !TESTE && !S.abas.some(x => chat(x) && C.ehLocal(x.modelo))) api.iaDescarregar('');   // no local conversation open: model unloads
    carregarJanela(S.modal);
  }
  // model and thinking: only open conversation (24/10, user request); on welcome, only next conversation
  function escolherClaude(id) {
    const t = aba(); S.modelo = id;
    if (chat(t) && !C.ehLocal(t.modelo)) { if (t.modelo !== id) { t.modelo = id; if (!TESTE) api.chatModelo(t.id, id); } } else if (!chat(t)) S.prox.modelo = id;
    salvarSessao(); draw();
  }
  function escolherEsf(v) {
    const t = aba(); S.esf = v;
    if (chat(t) && !C.ehLocal(t.modelo)) { if (t.esf !== v) { t.esf = v; if (!TESTE) api.chatEsforco(t.id, v); } } else if (!chat(t)) S.prox.esf = v;
    salvarSessao(); draw();
  }
  // pensar (local AI): saved preference (ini pensar=) + applies now to open local conversation. Before, with a Claude conversation
  // open, the button went nowhere (24/10, user: "não consigo colocar a ia local no modo pensar")
  // local AI mode: 0 fast, 1 normal, 2 think (old saved tabs true/false → 2/0; option moved to OP.modoLocal)
  function nivelP(v) { return v === true ? 2 : v === false ? 0 : Math.min(2, Math.max(0, parseInt(v, 10) || 0)); }
  function escolherPensar(v) {
    const t = aba(); S.pensar = v; S.prox.pensar = v; OP.modoLocal = String(v); if (!TESTE) api.opcao('modoLocal', OP.modoLocal);
    if (chat(t) && C.ehLocal(t.modelo) && nivelP(t.pensar) !== v) { t.pensar = v; if (!TESTE) api.chatPensar(t.id, v); }
    salvarSessao(); draw();
  }
  async function usarModeloLocal(n) {
    M.D.local.modelo = n; montarLocal(); if (!TESTE) api.opcao('iaLocal', n);
    if (iaDaTela() === 'local') await ativarIA('local');   // only open conversation moves to new model
    else draw();
  }

  // ---- options (Options and AI windows): what UI shows -> fcc.ini key ----
  const OPV = { inicio: { 'Tela de escolha': 'escolha', Claude: 'claude', 'IA Local': 'local' }, tema: { Escuro: 'escuro', Claro: 'claro', 'Seguir o Windows': 'auto' }, fechar: { 'Esconder na bandeja': 'bandeja', Sair: 'sair' }, abrir: { Reabrir: '1', Perguntar: 'p', 'Começar limpo': '0' },
    passos: { 'Escondidos (a seta mostra)': '0', 'Sempre à mostra': '1' }, codigo: { 'Escondido, só texto': '0', Aparece: '1' }, ctx: { '16 mil': '16384', '32 mil': '32768', '64 mil': '65536' }, ajudante: { Desligado: '0', 'Código grande': 'grande', 'Código e testes': 'tudo' },
    manter: { '5 min': '5m', '30 min': '30m', '1 h': '1h' }, fimLocal: { 'Descarregar o modelo': 'descarregar', Manter: 'manter' }, perm: { Automático: 'auto', 'Perguntar sempre': 'default', 'Só planejar': 'plan' }, barraUso: { 'Conta em uso': 'atual', 'Todas as contas': 'todas' }, enter: { 'Continuar a anterior': 'continuar', 'Nova conversa': 'nova' } };
  const OPK = { abrir: 'lembrar', ctx: 'ctxSimples' };   // 24/10: local AI memory applies to plain conversation (local Claude Code no longer used)
  const daOP = (k, v) => { const m = OPV[k]; return m ? Object.keys(m).find(x => m[x] === v) : v; };
  if (!TESTE) Object.assign(S.op, { inicio: daOP('inicio', OP.inicio || 'claude'), tema: daOP('tema', OP.tema || 'escuro'), tam: S.tam === 'min' ? 'Mín. 1080 × 608' : 'Máx. 1440 × 810', fechar: daOP('fechar', OP.fechar || 'bandeja'), abrir: daOP('abrir', OP.lembrar || '1'),
    explorer: OP.explorer === '1', autoAtual: OP.autoAtual !== '0', painel: OP.painel !== '0', autoConta: OP.autoConta !== '0', auto: OP.auto !== '0', pctUso: OP.pctUso !== '0', nivel: OP.nivel || 'low', barraUso: daOP('barraUso', OP.barraUso || 'atual'), passos: daOP('passos', OP.passos || '0'), codigo: daOP('codigo', OP.codigo || '0'), ajudante: daOP('ajudante', OP.ajudante || '0') || 'Desligado', ctx: daOP('ctx', String(OP.ctxSimples || '16384')) || '16 mil',
    manter: daOP('manter', OP.manter || '30m'), fimLocal: daOP('fimLocal', OP.fimLocal || 'descarregar'), perm: daOP('perm', OP.perm || 'auto'), enter: daOP('enter', OP.enter || 'continuar'), texto: OP.texto, mcp: TESTE ? D.mcp : (OP.mcp || '') });
  if (!TESTE) Object.assign(M.D, { raiz: D.raiz, mcp: D.mcp, temRegras: D.temRegras, versao: D.versao ? 'versão ' + D.versao : '' });   // from main: paths of this install, which house skills/folders exist (refreshed when Options/Rules open)
  async function salvar(tipo, k) {
    if (TESTE) return;
    if (tipo === 'trilho') return api.trilhoSalvar({ grupos: S.grupos, alias: S.alias, fixos: S.fixos });
    if (tipo === 'est') return carregarJanela('est');
    if (tipo === 'busca') return buscarModelos(M.D.buscaTx || '');
    if (tipo !== 'op') return;
    const v = S.op[k];
    if (k === 'tam') return api.tamanho(S.tam);
    if (k === 'barraUso') { draw(); api.contas().then(L => { M.D.contas = L; draw(); }); }
    if (k === 'explorer' || k === 'autoAtual' || k === 'painel' || k === 'autoConta' || k === 'pctUso' || k === 'auto') { OP[k] = v ? '1' : '0'; if (k === 'painel') S.semPainel = !v; draw(); return api.opcao(k, OP[k]); }
    const ini = OPV[k] ? OPV[k][v] : v, chave = OPK[k] || k; if (ini == null) return;
    OP[chave] = ini; await api.opcao(chave, ini);
    if (k === 'inicio') { IA_SES = null; if (!chat(aba())) S.prox = PADRAO(); draw(); }
    if (k === 'tema') { S.tema = temaDe(ini); for (const t of S.abas) if (t.xt) t.xt.term.options.theme = S.tema === 'escuro' ? TEMA_ESCURO : TEMA_CLARO; draw(); }
    if (k === 'abrir') salvarSessao();
    if (k === 'passos') { for (const t of S.abas) if (chat(t)) t.cache = {}; draw(); }
  }
  function juntar(t, x) { const d = t.el.txt.value; t.el.txt.value = d && !d.endsWith('\n') ? d + '\n' + x : d + x; t.texto = t.el.txt.value; altura(t); t.el.txt.focus(); t.el.txt.setSelectionRange(t.texto.length, t.texto.length); }
  // 28/10: drop files on the text box. Claude reads text/code, PDF and png/jpg/gif/webp; audio, video, Office, zip, exe → forbidden cursor
  const SOLTA_NAO = /^(audio|video)\/|^image\/(?!png|jpeg|gif|webp|svg)|^application\/(?!pdf|json|xml|javascript|x-javascript|x-sh|x-python|x-ipynb|x-yaml|toml|sql|x-httpd-php)/;
  const EXT_NAO = /\.(mp3|wav|ogg|flac|m4a|aac|wma|mp4|mkv|avi|mov|webm|wmv|flv|docx?|xlsx?|pptx?|odt|ods|odp|rtf|zip|rar|7z|tar|gz|exe|dll|msi|iso|bin|bmp|tiff?|ico|psd|heic|ttf|otf|woff2?)$/i;
  const caixaDrop = (el) => el && el.closest && (el.closest('.compC-z') || el.closest('.f-comeca'));
  const soltaOk = (dt) => [...dt.items].filter(i => i.kind === 'file').every(i => !SOLTA_NAO.test(i.type));
  document.addEventListener('dragover', (e) => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = caixaDrop(e.target) && soltaOk(e.dataTransfer) ? 'copy' : 'none'; });
  document.addEventListener('drop', (e) => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault();
    const cx = caixaDrop(e.target); if (!cx || !api.caminho) return;
    const fs = [...e.dataTransfer.files], ok = fs.filter(f => !SOLTA_NAO.test(f.type) && !EXT_NAO.test(f.name)), nao = fs.filter(f => !ok.includes(f));
    // 30/10 (user request): becomes a card above the text (like the Claude app), not @path text; @path goes only to the AI on send
    const novos = ok.map(f => ({ c: api.caminho(f), tam: f.size })).filter(a => a.c);
    if (novos.length) { const t = M.aba(), L = cx.matches('.compC-z') && t && chat(t) ? (t.anexos = t.anexos || []) : p() ? (S.fichaAnx[p().n] = S.fichaAnx[p().n] || []) : null;
      if (L) { for (const a of novos) if (!L.some(x => x.c === a.c)) L.push(a); pintarAnexos(); const a = cx.querySelector('textarea'); if (a) a.focus(); } }
    if (nao.length) mostrarToast(`O Claude não consegue abrir ${nao.length === 1 ? nao[0].name : nao.length + ' arquivos'} (áudio, vídeo, Office e compactados ficam de fora).`); });
  S.fichaAnx = {};
  function pintarAnexos() {   // conversation box (current tab) + project screen box
    const t = aba(); if (chat(t) && t.el && t.el.comp) { const z = t.el.comp.querySelector('.c-anxs'); if (z) z.innerHTML = C.anexosHTML(t.anexos, true); }
    const f = document.getElementById('f-anxs'); if (f) f.innerHTML = p() ? C.anexosHTML(S.fichaAnx[p().n], true).replace(/data-act="anx-x:/g, 'data-act="anx-xf:') : '';
  }
  const comAnexos = (A, txt) => (A && A.length ? C.refsAnexos(A) : '') + (txt || '');
  function focarTexto(t) { if (chat(t) && !t.verTerm && !S.modal) t.el.txt.focus(); }

  // ---- actions: data-act of UI copied from prototype -> real action ----
  async function agir(a) {
    const i0 = a.indexOf(':'); const k = i0 < 0 ? a : a.slice(0, i0), v = i0 < 0 ? '' : a.slice(i0 + 1); const n = parseInt(v, 10); const t = aba();
    const proj = (x) => S.proj[parseInt(x, 10)];
    // rail and sheet
    if (k === 'aba') { const i = S.abas.findIndex(x => x.id === v); if (i >= 0) irPara(i); return; }
    if (k === 'programa') { const q = proj(v); if (!q) return; if (TESTE) return mostrarToast(`${q.n}.exe aberto.`); const x = await api.programa(q.dir); return mostrarToast(x ? `${x} aberto.` : `${q.n} ainda não tem .exe em dist\\.`); }   // project sheet (painel.js)
    if (k === 'sel') { S.sel = n; irPara(0); return; }
    if (k === 'anx-x' || k === 'anx-xf') { const L = k === 'anx-xf' ? p() && S.fichaAnx[p().n] : chat(t) && t.anexos; if (L) L.splice(n, 1); return pintarAnexos(); }
    if (k === 'continuar' || k === 'nova') { const q = proj(v); if (!q) return; const tx = ((S.fichaTx || {})[q.n] || '').trim(); if ((tx || (S.fichaAnx[q.n] || []).length) && q === p()) return caixaFicha('enviar', tx, k); abrir(q, k); return; }
    if (k === 'retomar') { const [pi, sid] = v.split(':'); const q = proj(pi); if (q) abrir(q, 'retomar', sid ? { sessao: sid, modoChat: 'resume' } : {}); return; }
    if (k === 'livre') return abrir(null, 'livre');
    if (k === 'fecharaba') { const i = S.abas.findIndex(x => x.id === v); if (i >= 0) fecharAba(i); return; }
    if (k === 'editar-arq') { const [pi, ...r] = v.split(':'); const q = proj(pi); if (q && !TESTE) api.abrirArq(q.dir, r.join(':')); return; }
    if (k === 'pasta') { const q = v !== '' ? proj(v) : (t.p || (t.tipo === 'inicio' && p())); if (q) { if (!TESTE) api.pasta(q.dir); mostrarToast(`Pasta de ${M.nomeProj ? M.nomeProj(q) : q.n} aberta no Explorer.`); } return; }
    if (k === 'parada') { const q = t.p || (t.tipo === 'inicio' && p()); if (q && q.parada === false) return; if (q) { const ok = TESTE || await api.parada(q.dir); mostrarToast(ok ? `PARADA de ${q.n} aberto no Bloco de notas.` : `${q.n} não tem docs\\PARADA.md.`); } return; }
    // windows
    if (k === 'modal') { const [m, ab] = v.split(':'); S.modal = m; S.jAba = +ab || 0; S.pop = null; draw(); return carregarJanela(m); }
    if (k === 'fecha') { fecharModal(); focarTexto(t); return; }
    if (k === 'fecha-fora') { if (S.modal !== 'preparando') { fecharModal(); focarTexto(t); } return; }
    if (k === 'fecharsim') return fecharAba(S.fechar, true);
    if (k === 'restaurar') return restaurar();
    if (k === 'instalar') { mostrarToast('Instalando o Claude Code…'); S.modal = null; const r = await api.instalarClaude(); S.conta = await api.conta(); if (S.conta.estado === 'ausente') S.modal = 'ausente'; mostrarToast(r === true ? 'Claude Code instalado.' : 'A instalação falhou (relatorios\\preparar.txt).'); return; }
    if (k === 'sairconta') { S.conta = TESTE ? { estado: 'sem' } : await api.sairConta(); M.D.conta = contaD(); return draw(); }
    if (k === 'entrar') return entrarConta(v || '');
    if (k === 'conta-usar') { if (TESTE) return; S.trocando = v; draw(); const r = await api.contaUsar(v); S.trocando = null;
      if (r && r.login) { mostrarToast(`${v}: ${r.erro}. Entre de novo (o e-mail já vai preenchido).`); return entrarConta(v); }
      if (r && r.erro) { mostrarToast('Não troquei: ' + r.erro); return carregarJanela('conta'); }
      S.conta = r.conta; M.D.conta = contaD(); guardarLimite(0); mostrarToast(`Agora na conta ${v}.`); reabrirClaude(); return trocou(); }
    if (k === 'conta-esquecer') { if (!TESTE) M.D.contas = await api.contaEsquecer(v); return draw(); }
    if (k === 'login-abrir') { if (!TESTE) api.loginAbrir(); return; }
    if (k === 'login-cancelar') { if (!TESTE) await api.loginCancelar(); S.modal = 'conta'; return carregarJanela('conta'); }
    // window buttons (user's gesture standard: click / hold 1 s)
    if (k === 'min') return api.janela('min');
    if (k === 'janela') {
      if (v === 'maxi') return api.janela('max');
      if (v === 'tam') { S.tam = S.tam === 'max' ? 'min' : 'max'; S.op.tam = S.tam === 'min' ? 'Mín. 1080 × 608' : 'Máx. 1440 × 810'; if (!TESTE) api.tamanho(S.tam); mostrarToast(S.tam === 'max' ? 'Tamanho Máx. (1440 × 810)' : 'Tamanho Mín. (1080 × 608): a tela inteira × 0,75'); return; }
      if (v === 'bandeja') { if (OP.fechar === 'sair') return api.janela('sair'); return api.janela('bandeja'); }
      if (v === 'sair') { api.sessao(abasSalvas()); return api.janela('sair'); }
      return;
    }
    if (k === 'atual-procurar') { if (TESTE) return; S.atual = { estado: 'procurando' }; draw(); api.atualizarProcurar(); return; }
    if (k === 'reiniciar') { if (!TESTE) { api.sessao(abasSalvas()); api.reiniciar(); } return; }
    // AI (AI window): Claude or local, model, thinking, mode; local AI: models, Ollama
    if (k === 'ia') return ativarIA(v);
    if (k === 'escolha') {   // choice screen: chosen AI becomes the one for new conversations this session
      IA_SES = v; S.prox = PADRAO(); S.escolha = false; S.fluxoCam = v; const fim = S.primeira ? 'pasta' : null;
      if (v === 'claude') S.fluxo = !navigator.onLine ? 'sem-internet' : S.conta.estado === 'ausente' ? 'c-preparar' : S.conta.estado !== 'ok' ? 'c-login' : fim;
      else { S.fluxo = !D.demo && (S.locais || []).length ? fim : 'l-preparar'; if (S.fluxo === 'l-preparar') { carregarJanela('baixar'); if (D.demo) S.ollama = false; else api.ollamaEstado().then(v => { S.ollama = v; draw(); }); } }
      if (S.fluxo === 'c-preparar') return M.agir('fx-instalar');
      return draw(); }
    if (k === 'pm') return escolherClaude(v);
    if (k === 'esf') return escolherEsf(v);
    if (k === 'pensar') return escolherPensar(nivelP(v));
    if (k === 'usarmod') return usarModeloLocal(v);
    if (k === 'apagarmod') { if (TESTE) return; const ok = await api.modApagar(v); mostrarToast(ok ? `${v} apagado: o espaço volta para o disco.` : `Não consegui apagar ${v}.`); if (ok && M.D.local.modelo === v) { M.D.local.modelo = ''; } await carregarLocais(); if (ok && S.iaPadrao === 'local' && !M.D.local.modelo) await ativarIA('claude'); return carregarJanela(S.modal); }
    if (k === 'ollama') { if (TESTE) return; if (v === 'ligar') { mostrarToast('Ligando o Ollama…'); const r = await api.iaLigar(); if (r && r.erro) mostrarToast('O Ollama não ligou: ' + r.erro); return carregarJanela(S.modal); } if (v === 'desligar') await api.iaDesligar(); else await api.iaDescarregar(M.D.local.modelo); return carregarJanela(S.modal); }
    if (k === 'resumir') { const c = chat(t) ? t : S.abas.find(x => chat(x)); if (!c) return mostrarToast('Abra uma conversa para resumir.'); if (C.ehLocal(c.modelo)) return mostrarToast('Na IA local a conversa se ajusta sozinha: o começo mais antigo sai quando ela cresce.'); S.modal = null; c.el.txt.value = '/compact'; c.texto = '/compact'; enviar(c); irPara(S.abas.indexOf(c)); return; }
    if (k === 'avisar') return M.avisarConta();
    if (k === 'usarlocal') { S.modal = 'ia'; S.jAba = 1; draw(); return carregarJanela('ia'); }
    // download AI
    if (k === 'jbaixar') { if (TESTE) return; if (S.baixando[v] != null) { api.modCancelar(v); delete S.baixando[v]; } else { S.baixando[v] = 0; api.modBaixar(v); } return draw(); }
    if (k === 'gguf-escolher') { if (TESTE) return; const r = await api.modArquivo(); if (r) M.D.gguf = { caminho: r.caminho, nome: r.n.replace(/\.gguf$/i, '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-') + ':latest' }; return draw(); }
    if (k === 'gguf-adicionar') { if (TESTE || !M.D.gguf) return mostrarToast('Escolha um arquivo .gguf primeiro.'); mostrarToast(`Copiando ${M.D.gguf.nome} para o Ollama…`); const r = await api.modImportar(M.D.gguf.caminho, M.D.gguf.nome); mostrarToast(r && r.ok ? `${M.D.gguf.nome} adicionado.` : `Não consegui adicionar: ${(r && r.erro) || 'erro'}.`); M.D.gguf = null; await carregarLocais(); return draw(); }
    // rules and memory
    if (k === 'regra-editar' || k === 'regra-pasta') { const r = (M.D.regras || [])[n]; if (r && !TESTE) api.abrirArq(r.caminho, k === 'regra-pasta' ? '..' : ''); return; }
    if (k === 'esquecer') { if (TESTE) return; const ok = await api.esquecer(v); mostrarToast(ok ? 'Nota esquecida (foi para a Lixeira).' : 'Não consegui esquecer essa nota.'); return carregarJanela('regras'); }
    if (k === 'skill-abrir') { if (!TESTE) api.abrirSkill(v); return; }
    // options: project folders
    if (k === 'mcp-pasta') { if (TESTE) return; const d = await api.escolherPasta(); if (!d) return; S.op.mcp = d; await salvar('op', 'mcp'); mostrarToast('Pasta do MCP: ' + d + '. Vale no próximo pedido da IA local.'); return draw(); }
    if (k === 'pasta-por') { if (TESTE) return; const d = await api.escolherPasta(); if (!d) return; const L = String(OP.pastas || '').split(';').map(x => x.trim()).filter(Boolean); if (!L.includes(d)) L.push(d); OP.pastas = L.join(';'); const r = await api.opcao('pastas', OP.pastas); if (r) setProj(r); return carregarJanela('opcoes'); }
    if (k === 'pasta-tirar') { if (TESTE) return; const L = String(OP.pastas || '').split(';').map(x => x.trim()).filter(Boolean); L.splice(n - 1, 1); OP.pastas = L.join(';'); const r = await api.opcao('pastas', OP.pastas); if (r) setProj(r); return carregarJanela('opcoes'); }
    if (!chat(t)) return;
    // conversation
    if (k === 'abre') { t.abertos[v] = !t.abertos[v]; return draw(); }
    if (k === 'passos') { t.verPassos = !t.verPassos; t.irFim = true; return draw(); }
    if (k === 'editar') { const it = t.itens[n]; if (!it || it.k !== 'eu') return;
      const s = C.separaAnexos(it.txt); t.anexos = s.A; pintarAnexos();   // 30/10: attachments come back as cards
      interromper(t); t.editando = { i: n, antes: it.antes || null }; t.el.txt.value = s.txt; t.texto = s.txt; altura(t); t.el.txt.focus(); t.el.txt.setSelectionRange(s.txt.length, s.txt.length); return draw(); }
    if (k === 'desfila') { const x = (t.fila || []).splice(n, 1)[0]; if (x) { t.el.txt.value = t.el.txt.value.trim() ? t.el.txt.value + '\n' + x : x; t.texto = t.el.txt.value; altura(t); t.el.txt.focus(); } return draw(); }   // queued message back to the box
    if (k === 'perm') return responderPerm(t, v);
    if (k === 'resp') { const [ii, qi, oi] = v.split('-').map(Number); const it = t.itens[ii]; if (!it || it.resp) return; const q = it.input.questions[qi];
      let sel = it.escolhas[qi] || []; sel = q.multiSelect ? (sel.includes(oi) ? sel.filter(x => x !== oi) : [...sel, oi]) : [oi]; it.escolhas[qi] = sel;
      if (it.input.questions.length === 1 && !q.multiSelect) return responderPerm(t, 'ok', it); return draw(); }
    if (k === 'permresp') return responderPerm(t, 'ok', t.itens[n]);
    if (k === 'enviar') return enviar(t);
    if (k === 'parar') return interromper(t);
    if (k === 'reabrir') return reabrir(t);
    if (k === 'painel') { S.semPainel = !S.semPainel; S.op.painel = !S.semPainel; if (!TESTE) api.opcao('painel', S.semPainel ? '0' : '1'); return draw(); }
    if (k === 'term') return alternarTerminal(t);
    if (k === 'teste') { const [ii, r] = v.split('-'); t.rel[ii] = r; juntar(t, `Testei "${t.p.itens[ii]}": ${r === 'ok' ? 'funcionou.' : 'falhou — '}`); t.cache.painel = null; return draw(); }
    if (k === 'pedido') { juntar(t, C.PEDIDOS[t.p ? 'proj' : 'livre'][n]); return draw(); }
    if (k === 'abrirp') { const q = S.proj.find(x => x.n === v); if (q) abrir(q, 'continuar'); return; }
    if (k === 'atalho') { if (TESTE) return mostrarToast(v === 'programa' ? `${t.p.n}.exe aberto.` : `Pasta de relatórios de ${t.p.n} aberta.`);
      if (v === 'programa') { const x = await api.programa(t.p.dir); return mostrarToast(x ? `${x} aberto.` : `${t.p.n} ainda não tem .exe em dist\\.`); }
      const ok = await api.relatorios(t.p.dir); return mostrarToast(ok ? `Pasta de relatórios de ${t.p.n} aberta.` : `${t.p.n} não tem pasta de relatórios.`); }
    if (k === 'anexar') { const fs = TESTE ? [] : await api.anexar(); for (const f of fs) juntar(t, /\s/.test(f) ? `@"${f}" ` : `@${f} `); return; }
    if (k === 'barra') { t.cmdFora = false; if (t.el.txt.value.startsWith('/')) { t.el.txt.focus(); t.el.txt.setSelectionRange(1, 1); return desenharChat(t); } return comCmd(t, '/'); }
    if (k === 'cmd') return comCmd(t, '/' + v);
  }
  // copied UI talks to app through here (tela\ponte.js)
  M.app = { conversa: () => { const t = aba(); return t && t.tipo !== 'inicio' ? t : null; }, projSel: () => p(),
    conversaDe: (x) => S.abas.find(t => chat(t) && t.p && t.p.n === x.n) || null, livres: () => S.abas.filter(t => t.tipo === 'chat' && !t.p),
    agir, draw, salvar };
  document.addEventListener('mousedown', (e) => {   // 26/10: click outside open window closes it (user request)
    if (!S.modal || ['preparando', 'ausente', 'entrando'].includes(S.modal) || e.button !== 0 || e.target.closest('.jan,.iam,.pop,.dica,.toast,.menu,[data-parar]')) return;
    e.stopPropagation(); e.preventDefault(); fecharModal(); const fim = (x) => { x.stopPropagation(); x.preventDefault(); }; addEventListener('click', fim, { capture: true, once: true });
  }, true);
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) { if (S.menu) { S.menu = null; draw(); } return; }
    if (el.dataset.act === 'fecha-fora' && e.target.closest('.jan,[data-parar]')) return;
    if (e.target.tagName === 'INPUT') return;
    e.stopPropagation(); M.agir(el.dataset.act);
  });
  // 27/10 (user request): double click on icon opens program WITHOUT entering chat → 1st click on icon waits the double click interval
  { let tmr = null; document.addEventListener('click', (e) => { const im = e.target.closest && e.target.closest('img.pico'), el = im && im.closest('[data-act]'); if (!el || TESTE) return;
    e.stopImmediatePropagation(); clearTimeout(tmr); if (e.detail <= 1) tmr = setTimeout(() => M.agir(el.dataset.act), 280); }, true); }
  // 27/10 (user request): right button twice on project (rail, tab, icon) = open its folder
  { let ult = 0, alvo = null; document.addEventListener('contextmenu', (e) => {
    const im = e.target.closest('img.pico'), pj = e.target.closest('[data-proj]'), ab = e.target.closest('[data-act^="aba:"]');
    const q = im ? S.proj.find(x => x.n === im.dataset.exe) : pj ? S.proj[+pj.dataset.proj] : ab ? (S.abas.find(t => t.id === ab.dataset.act.slice(4)) || {}).p : (e.target.closest('.f-cab') && p());
    if (!q) return; e.preventDefault();
    const agora = performance.now(); if (alvo === q && agora - ult < 450) { ult = 0; alvo = null; if (!TESTE) api.pasta(q.dir); mostrarToast(`Pasta de ${M.nomeProj ? M.nomeProj(q) : q.n} aberta no Explorer.`); } else { ult = agora; alvo = q; } }); }
  document.addEventListener('dblclick', (e) => { const im = e.target.closest && e.target.closest('img.pico'); if (!im) return; e.preventDefault(); e.stopImmediatePropagation(); const q = S.proj.find(x => x.n === im.dataset.exe); if (q) api.programa(q.dir).then(n => mostrarToast(n ? `Abrindo ${n}` : `${q.n} não tem programa em dist`)); }, true);   // 27/10: double click on project icon = open its .exe
  document.addEventListener('dblclick', (e) => { const el = e.target.closest('[data-proj]'); if (el && !el.dataset.act.startsWith('aba:')) { S.sel = +el.dataset.proj; abrir(p(), 'continuar'); } });   // double click on project opens it
  api.ao('max', (m) => { S.maxi = m; draw(); });
  api.ao('conta', (c) => { if (D.demo && !(M.D.conta && M.D.conta.email)) return; const outra = c.email !== (S.conta && S.conta.email); S.conta = c; M.D.conta = contaD(); if (outra && S.limiteAte) guardarLimite(0); draw(); });   // switched account: limit belonged to the other
  api.ao('tamanho', (t) => { S.tam = t; S.op.tam = t === 'min' ? 'Mín. 1080 × 608' : 'Máx. 1440 × 810'; draw(); });

  // ---- keyboard ----
  function atalhoGlobal(e) {
    const k = e.key;
    if (e.ctrlKey && k === 'Tab') { irPara((S.ativa + (e.shiftKey ? -1 : 1) + S.abas.length) % S.abas.length); return true; }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && /^[1-9]$/.test(k)) { irPara(Math.min(+k - 1, S.abas.length - 1)); return true; }
    if (e.ctrlKey && !e.shiftKey && (k === 'w' || k === 'W')) { fecharAba(S.ativa); return true; }
    if (e.ctrlKey && !e.shiftKey && (k === 't' || k === 'T')) { abrir(null, 'livre'); return true; }
    return false;
  }
  function teclaChat(e, t) {
    const k = e.key, ta = t.el.txt, naCaixa = document.activeElement === ta;
    if (e.ctrlKey && (k === '`' || e.code === 'Backquote')) { alternarTerminal(t); return true; }
    if (e.ctrlKey && (k === 'b' || k === 'B')) { agir('painel'); return true; }
    if (e.ctrlKey && (k === 'o' || k === 'O')) { t.abertos.todos = !t.abertos.todos; draw(); return true; }
    if (t.verTerm) return false;
    if (t.estado === 'encerrada') { if (k === 'Enter') { reabrir(t); return true; } return false; }
    if (k === 'Escape' && t.editando) { t.editando = null; ta.value = ''; t.texto = ''; altura(t); draw(); return true; }
    const L = cmdsDe(t);
    if (L && L.length && naCaixa) {
      t.cmdSel = Math.min(t.cmdSel || 0, L.length - 1);
      if (k === 'ArrowDown') { t.cmdSel = (t.cmdSel + 1) % L.length; desenharChat(t); return true; }
      if (k === 'ArrowUp') { t.cmdSel = (t.cmdSel - 1 + L.length) % L.length; desenharChat(t); return true; }
      if (k === 'Tab' || (k === 'Enter' && !e.shiftKey && t.texto.split(/\s/)[0] !== '/' + L[t.cmdSel].n)) { agir('cmd:' + L[t.cmdSel].n); return true; }
      if (k === 'Escape') { t.cmdFora = true; desenharChat(t); return true; }   // close menu, text stays
    }
    const [pend] = permPendente(t);
    if (pend && !ta.value) {
      if (pend.tool === 'AskUserQuestion') { const q = (pend.input.questions || [])[0]; if (/^[1-9]$/.test(k) && q && q.options[+k - 1]) { agir(`resp:${t.itens.indexOf(pend)}-0-${+k - 1}`); return true; } if (k === 'Enter') { responderPerm(t, 'ok', pend); return true; } }
      else if (k === '1' || (k === 'Enter' && !e.shiftKey)) { responderPerm(t, pend.tool === 'ExitPlanMode' ? 'aprovado' : 'ok'); return true; }
      else if (k === '2' && pend.tool !== 'ExitPlanMode') { responderPerm(t, 'sempre'); return true; }
      if (k === 'Escape') { responderPerm(t, 'negado'); return true; }
    }
    if (k === 'Escape') { interromper(t); return true; }
    if (k === 'Enter' && !e.shiftKey && naCaixa) { enviar(t); return true; }
    if (!naCaixa && !e.ctrlKey && !e.altKey && (k.length === 1 || k === 'Enter' || k === 'Backspace')) { ta.focus(); return false; }   // typing anywhere goes to box
    return false;
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('.xterm') && !S.modal) return;   // terminal handles it (global shortcuts go through its handler)
    if (atalhoGlobal(e)) { e.preventDefault(); return; }
    const k = e.key, t = aba();
    if (e.target.tagName === 'INPUT' && e.target.closest('.jan')) {      // window boxes (model search): normal typing, Enter runs action
      if (k === 'Enter' && e.target.id === 'j-busca') { e.preventDefault(); buscarModelos(e.target.value); }
      else if (k === 'Enter' && e.target.id === 'j-mcp') { e.preventDefault(); S.op.mcp = e.target.value.trim().replace(/^"|"$/g, '').replace(/[\\/]mcp\.json$/i, '').replace(/[\\/]+$/, ''); salvar('op', 'mcp'); mostrarToast(S.op.mcp ? 'Pasta do MCP salva.' : 'Pasta do MCP: a da casa (CCT\\casa).'); }
      else if (k === 'Enter' && e.target.id === 'j-texto') { e.preventDefault(); const v = e.target.value.trim().replace(/"/g, "'"); if (v) { S.op.texto = v; salvar('op', 'texto'); mostrarToast('Texto ao continuar salvo.'); } }
      else if (k === 'Escape') { e.preventDefault(); e.target.blur(); }
      return;
    }
    if (S.modal) {
      if (k === 'Escape' && S.modal !== 'preparando') { fecharModal(); focarTexto(t); }
      if (k === 'Enter' && S.modal === 'restaurar') restaurar();
      if (k === 'F4' || k === 'F2' || k === 'F1') { e.preventDefault(); M.agir(k === 'F4' ? 'modal:ia' : k === 'F2' ? 'modal:opcoes' : 'modal:ajuda'); return; }
      e.preventDefault(); return;
    }
    if (S.menu && k === 'Escape') { S.menu = null; draw(); e.preventDefault(); return; }
    if (k === 'F4' || (e.altKey && (k === 'p' || k === 'P'))) { e.preventDefault(); M.agir('modal:ia'); return; }
    if (k === 'F1') { e.preventDefault(); M.agir('modal:ajuda'); return; }
    if (k === 'F2') { e.preventDefault(); M.agir('modal:opcoes'); return; }
    if (chat(t)) { if (teclaChat(e, t)) e.preventDefault(); return; }
    if (t.tipo === 'chat') { if (t.xt) t.xt.term.focus(); return; }
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { if (k === 'Escape') e.target.blur(); return; }   // typing in welcome box or search: letter is text, not shortcut (24/10)
    const L = S.proj;
    if (e.ctrlKey || e.altKey) return;
    if (k.length === 1 || k === 'Enter') e.preventDefault();       // Home key must not land in text box of tab it opens
    if (k === 'F3') { e.preventDefault(); abrir(null, 'livre'); }
    else if (!L.length) { }
    else if (k === 'ArrowDown' || k === 'ArrowUp') {          // walk in rail order (pinned, groups, ungrouped)
      e.preventDefault(); const ord = (M.ordem ? M.ordem() : L.map(x => x.n)), at = ord.indexOf(p() && p().n), nx = ord[(at + (k === 'ArrowDown' ? 1 : -1) + ord.length) % ord.length];
      const i = L.findIndex(x => x.n === nx); if (i >= 0) { S.sel = i; draw(); } }
    else if (k === 'Enter' || k === '1') abrir(p(), 'continuar');
    else if (k === '2') abrir(p(), 'retomar');
    else if (k === '3') abrir(p(), 'nova');
    else if (k === '4') agir('pasta');
    else if (k === '5') agir('parada');
    else if (/^[a-z]$/i.test(k)) { const i = L.findIndex(q => q.l === k.toUpperCase()); if (i >= 0) { S.sel = i; draw(); } }
  });
  // refresh list when back to Home (PARADA and PRA-TESTAR may have changed)
  let ultLeitura = Date.now();
  setInterval(async () => {
    if (TESTE || Date.now() - ultLeitura < 20000) return; ultLeitura = Date.now();
    const nome = p() && p().n; const L = await api.projetos(); for (const q of L) { const v = S.proj.find(x => x.n === q.n); if (v) for (const k of ['instr', 'mem', 'conversas', 'fichaT']) if (v[k] !== undefined) q[k] = v[k]; } setProj(L); const i = S.proj.findIndex(q => q.n === nome); S.sel = i >= 0 ? i : 0;
    for (const t of S.abas) if (chat(t) && t.p) { const q = S.proj.find(x => x.n === t.p.n); if (q) t.p = q; }
    draw();
  }, 5000);

  // ---- v4 B "Painéis" (31/10): real data for tela\v2\v4.js (M.V4D); scenes keep the prototype demo (no M.V4D in TESTE) ----
  const V4MODO = { perguntar: 'default', editar: 'acceptEdits', planejar: 'plan', auto: 'auto' };
  const V4GRUPO = { messages: ['Conversa', 'var(--acento)'], memory_files: ['Regras e memória', 'var(--local)'], skills: ['Regras e memória', 'var(--local)'], custom_agents: ['Regras e memória', 'var(--local)'],
    system_tools: ['Ferramentas', 'var(--amb)'], mcp_tools: ['Ferramentas', 'var(--amb)'], mcp_instructions: ['Ferramentas', 'var(--amb)'], system_prompt: ['Sistema', 'var(--fg3)'] };
  const mil = (n) => Math.round((n || 0) / 1000);
  function v4Atualizar(t) {
    if (!t || !t.id || t.tipo !== 'chat') return;
    api.chatCtx(t.id).then(r => { if (!r) return; const g = {};
      for (const x of r.partes || []) { const k = V4GRUPO[x.id] || ['Sistema', 'var(--fg3)']; (g[k[0]] = g[k[0]] || [k[0], 0, k[1]])[1] += x.tokens; }
      const total = r.total || (C.ehLocal(t.modelo) ? parseInt(OP.ctxSimples || '16384', 10) : 200000);
      t.ctx4 = { usado: mil(r.usado), total: mil(total), partes: Object.values(g).filter(x => mil(x[1]) > 0).map(x => [x[0], mil(x[1]), x[2]]) }; draw(); }).catch(() => { });
    api.chatMud(t.id).then(r => { t.mud4 = Array.isArray(r) ? r : []; draw(); }).catch(() => { });
  }
  const V4D = {
    inicio: (v) => { v.com = []; v.isolada = false; v.ladoQ = ''; v.ladoR = ''; v.comTxt = ''; },
    modo: (t) => (t && t.modo4) || ({ default: 'perguntar', plan: 'planejar', acceptEdits: 'editar' }[OP.perm] || 'auto'),
    setModo: (t, m) => { if (!t) return; t.modo4 = m; if (t.id) api.chatModo(t.id, V4MODO[m]).then(r => { if (r && r.erro) mostrarToast('Não troquei o modo: ' + r.erro); }); },
    ctx: (t) => (t && t.ctx4) || { usado: 0, total: 200, partes: [] },
    arqs: (t) => (t && t.mud4) || [],
    terminal: () => '',
    dock: (t, x) => { if (x === 'terminal') { if (t) alternarTerminal(t); return false; } if (x === 'mudancas') v4Atualizar(t); },
    arquivos: (t) => { const d = t && t.dir; if (!d) return { dirs: [], files: [] }; const c = (S.fs4 = S.fs4 || {});
      if (!c[d] || Date.now() - c[d].em > 10000) { c[d] = Object.assign(c[d] || { dirs: [], files: [] }, { em: Date.now() }); api.arquivos(d).then(r => { c[d] = Object.assign(r, { em: Date.now() }); draw(); }).catch(() => { }); }
      return c[d]; },
    abrir: (t, nome) => { if (t && t.dir) api.abrirArq(t.dir, nome); },
    lado: (t, q) => api.chatLado(t.id, q).then(r => r && r.txt ? esc(r.txt).replace(/\n/g, '<br>') : esc((r && r.erro) || 'Não consegui responder agora.')).catch(e => esc(e.message)),
    mandar: (t, lista) => { if (!t || !lista.length) return;
      const txt = 'Comentários sobre as mudanças:\n' + lista.map(c => `- ${c.f}${c.lin ? ` (linha \`${c.lin.trim().slice(0, 120)}\`)` : ''}: ${c.txt}`).join('\n');
      if (t.estado === 'trabalhando' || t.estado === 'pede') { (t.fila = t.fila || []).push(txt); mostrarToast('Comentários na fila: vão quando ele terminar.'); } else enviar(t, txt); },
    resumir: (t) => { if (t) enviar(t, '/compact'); },
    isolada: () => mostrarToast('A cópia isolada ainda não está ligada no programa.'),
  };
  if (!TESTE) { M.V4D = V4D; M.v4.reset(); }

  // ---- scenes: SAME as chosen prototype, same data (tela\v2\dados-demo.js), for screenshot check ----
  const P0 = (estado) => abrir(S.proj[0], 'continuar', { estado });
  const CENAS = Object.assign({}, M.CENAS, {        // rail and window ones come ready from prototype (tela\v2\trilho.js / janelas.js)
    inicio: () => { }, ficha: () => { }, vazio: () => { S.vazio = true; },
    abertas: async () => { await P0(); await abrir(S.proj[2], 'continuar'); S.sel = 1; irPara(0); },
    chat: () => P0(), trabalhando: () => P0('trabalhando'), passos: () => P0('passos'), acao: () => P0('acao'), editar: () => P0('editar'), permissao: () => P0('permissao'),
    local: async () => { S.iaPadrao = 'local'; S.prox.ia = 'local'; await abrir(S.proj[0], 'continuar', { estado: 'trabalhando', modelo: 'qwen3:8b' }); },
    limite: async () => { window.RELOGIO_TESTE = +new Date(2026, 9, 25, 7, 38); S.limiteAte = Math.floor(+new Date(2026, 9, 25, 9, 50) / 1000); S.limite = '09:50'; await P0(); },   // fixed clock, same as prototype
    fechar: async () => { await P0('trabalhando'); S.fechar = 1; S.modal = 'fechar'; },
    preparando: () => { S.prep = JSON.parse(JSON.stringify(DEMO2.D.prep)); S.modal = 'preparando'; },
    restaurar: () => { S.sessao = DEMO2.D.sessao; S.modal = 'restaurar'; }, ausente: () => { S.modal = 'ausente'; },
    atualizacao: async () => { S.pendente = true; await P0(); },
  });
  delete CENAS.minimo; delete CENAS.botoes;            // Min. size is window zoom (main.js), not UI scene
  delete CENAS.v4term; delete CENAS.v4split; delete CENAS.v4agenda;   // v4: Terminal tab opens the real terminal; side by side = stage 2; agenda is C only
  M.CENAS = CENAS;
  const OP_PROTO = JSON.parse(JSON.stringify(S.op));
  async function cena(nome) {
    for (const t of S.abas.slice(1)) { if (t.xt) t.xt.term.dispose(); if (t.host) t.host.remove(); }
    OP.passos = '0'; window.RELOGIO_TESTE = 0; M.v4.reset();
    setProj(JSON.parse(JSON.stringify(DEMO2.P)));
    Object.assign(S, { tlAb: null, escolha: false, escolhaHover: null, fluxo: null, fluxoTour: 0, ollama: undefined, abas: [S.abas[0]], exp: ['FCC'], prox: { ia: 'claude', modelo: 'sonnet', esf: 'medium', pensar: 1 }, ativa: 0, sel: 0, modal: null, jAba: 0, modelo: 'sonnet', esf: 'medium', pensar: 1, ia: 'claude', iaPadrao: 'claude', semPainel: false, conta: { estado: 'ok', email: DEMO2.D.conta.email, plano: DEMO2.D.conta.plano },
      toast: '', vazio: false, maxi: false, tam: 'max', limite: null, limiteAte: 0, pendente: false, atual: null, fechar: null, menu: null, ren: null, filtro: 'todos', memSel: 0, fonte: undefined, baixando: { 'gemma3:12b': 42 },
      fixos: ['FCC'], alias: {}, grupos: JSON.parse(JSON.stringify([{ id: 'g1', n: 'Programas da casa', ab: true, itens: ['Painel', 'Controles', 'Bancada', 'Teclado'] }, { id: 'g2', n: 'Áudio e vídeo', ab: true, itens: ['Som', 'Espelho', 'Narrador'] }])),
      est: { per: '7 dias', ia: 'Tudo' }, op: JSON.parse(JSON.stringify(OP_PROTO)), tema: 'escuro', L: { tipo: 'pop', tam: 'todos', caps: '', sel: null, vi: null, busca: '' } });
    M.D = JSON.parse(JSON.stringify(DEMO2.D)); M.ultModal = null;
    await CENAS[nome](); desenhar(); for (const t of S.abas) if (chat(t)) { t.el.rolar.scrollTop = t.el.rolar.scrollHeight; }
    const t = aba(); if (chat(t)) { t.el.txt.blur(); if (t.texto) { t.el.txt.value = t.texto; altura(t); } desenhar(); }
    await new Promise(r => setTimeout(r, 350));
    if (D.teste.medir) { const m = {}; for (const s of D.teste.medir.split(',')) { const e = document.querySelector(s); if (e) m[s] = e.getBoundingClientRect(); } api.log('medir ' + nome + ' ' + JSON.stringify(m)); }
  }

  // ---- start ----
  if (TESTE) {
    window.__cct = { S, desenhar, draw, rodape };      // test scripts measure and build states through here
    document.documentElement.classList.add('cena');     // shot without mid-animation (same as prototype with #cena=)
    if (D.teste.autoteste) {
      for (const nome of Object.keys(CENAS)) { await cena(nome); document.getAnimations().forEach(a => { try { a.finish(); } catch { } });   /* entry animations (conta rings/tiles ~0.9 s) end before shot, like prototype's 1.5 s wait */ await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); await api.captura(`${D.teste.autoteste}\\${nome}.png`); }
      // real terminal: opens cmd in hidden tab and checks output
      const t = { id: 'tx', tipo: 'chat', pty: true, estado: 'abrindo', visto: true, titulo: 'teste', dir: D.temp, modelo: 'opus', modo: 'teste' };
      S.abas.push(t); const x = novoTerminal(t, document.getElementById('terms')); t.host = x.host; S.ativa = S.abas.length - 1; desenhar(); ajustar(t);
      let saida = ''; api.ao('pty:dados', (id, d) => { if (id === 'tx') saida += d; });
      const r = await api.ptyAbrir({ id: 'tx', dir: D.temp, modo: 'teste', cols: x.term.cols, rows: x.term.rows });
      await new Promise(res => setTimeout(res, 2500));
      await cena('chat'); const tc = aba(); let t0 = performance.now(); for (let i = 0; i < 50; i++) desenhar(); const tDes = (performance.now() - t0) / 50;
      tc.estado = 'trabalhando'; t0 = performance.now(); aoMsg(tc.id, { type: 'stream_event', event: { type: 'message_start', msg: 'perf' } }); aoMsg(tc.id, { type: 'stream_event', event: { type: 'content_block_start', index: 0, bloco: 'text' } });
      for (let i = 0; i < 600; i++) { aoMsg(tc.id, { type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'palavra ' + i + (i % 40 ? ' ' : '\n\n') } } }); if (i % 20 === 0) await new Promise(r => setTimeout(r, 0)); }
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const tRaj = performance.now() - t0;
      const jan = {}; for (const n of ['ia', 'baixar', 'opcoes', 'est', 'conta', 'regras']) { S.modal = n; S.jAba = 0; t0 = performance.now(); desenhar(); jan[n] = (performance.now() - t0).toFixed(1); S.modal = null; desenhar(); }
      S.ativa = 0; t0 = performance.now(); for (let i = 0; i < 8; i++) { S.sel = i % S.proj.length; desenhar(); } const tSel = (performance.now() - t0) / 8;
      const perf = `desempenho: desenhar ${tDes.toFixed(2)} ms · trocar projeto ${tSel.toFixed(1)} ms · janelas ${JSON.stringify(jan)} · 600 pedaços de texto ${Math.round(tRaj)} ms`; api.log(perf);
      api.fimTeste(`${perf}\ncenas: ${Object.keys(CENAS).length} capturadas\nterminal: ${r && r.ok && /terminal ok/.test(saida) ? 'ok' : 'FALHOU ' + JSON.stringify(r) + ' ' + saida.slice(0, 200)}\n`);
      return;
    }
    await cena(D.teste.cena in CENAS ? D.teste.cena : 'inicio');
    return;
  }
  api.ao('preparo', (pr) => { S.prep = pr; if (S.modal === 'preparando') draw(); });
  S.modal = 'preparando'; S.prep = { et: [], pct: 0 }; desenhar();
  carregarLocais().then(() => {          // local AI active: warm up; if model no longer on disk, back to Claude
    if (S.iaPadrao !== 'local') return;
    if (M.D.local.modelo && S.locais.some(m => m.n === M.D.local.modelo)) return api.iaAquecer(M.D.local.modelo);
    S.iaPadrao = S.ia = 'claude'; S.prox.ia = 'claude'; mostrarToast('O modelo local não está mais instalado: as próximas conversas abrem com o Claude.'); draw();
  });
  const r = await api.preparar();
  S.conta = r.conta; M.D.conta = contaD(); restaurarLimite(); if (!TESTE && r.conta && r.conta.estado === 'ok') { api.contas().then(L => { M.D.contas = L; draw(); }); api.limUso('').then(usoVivo).catch(() => { }); }   // rail usage bar already on open
  await new Promise(res => setTimeout(res, r.falhou ? 3000 : 0));
  S.modal = null;
  setProj(await api.projetos());
  if (D.demo) {   // first-run demo (FCC.exe --demo-primeira): like a new PC, no account and no local AI
    S.conta = { estado: 'sem', email: '', plano: '' }; M.D.conta = {}; S.escolha = true; S.primeira = true; draw(); carregarRasc();
    return mostrarToast('Demonstração da 1ª vez: nada é instalado, baixado nem logado de verdade. O PC e o catálogo são os reais.');
  }
  // choice screen: always (option) or on 1st run on another PC (no account and no local AI)
  const ini = OP.inicio || (S.conta.estado !== 'ok' && !(S.locais || []).length ? 'escolha' : 'claude');
  if (S.conta.estado === 'ausente') S.modal = 'ausente';
  else if (ini === 'escolha' && !D.atualizou && !D.abrirProjeto) { S.escolha = true; S.primeira = !OP.inicio; }   // 1st run (no saved option): after AI come folder and tour
  else if (S.conta.estado === 'sem' && S.prox.ia !== 'local') { S.modal = 'conta'; M.D.conta = {}; }
  else if (S.sessao.length && D.atualizou && !D.teste.roteiro) { draw(); return restaurar(); }   // only update reopens; opening app = clean chat (23/10)
  draw(); carregarRasc();
  if (D.abrirProjeto && !TESTE) abrirPorNome(D.abrirProjeto);
})();
