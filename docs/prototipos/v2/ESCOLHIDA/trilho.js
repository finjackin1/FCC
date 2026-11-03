// Layout B "Trilho de projetos", CHOSEN (23/10/2026). THIS FILE IS THE APP UI CODE: app loads
// a copy of it (abas\ferramentas\copiar-prototipo.ps1). Data from M (prototype: motor.js with sample; app: tela\ponte.js
// with real). Actions: data-act -> M.agir. Change needing save -> M.salvar(tipo) (no-op in prototype).
(function () {
  const { S, P, ico, esc, ast } = M;
  const def = { ia: 'claude', fixos: [], alias: {}, menu: null, ren: null, filtro: 'todos', grupos: [] };
  for (const k in def) if (S[k] === undefined) S[k] = def[k];
  const nome = (x) => S.alias[x.n] || x.n;
  const pj = (n) => P.find(x => x.n === n);
  const semGrupo = () => P.filter(x => !S.fixos.includes(x.n) && !S.grupos.some(g => g.itens.includes(x.n))).map(x => x.n);
  const precisa = (x) => x.st === 'testar' || x.st === 'decidir';
  const ESF = { low: 'Baixo', medium: 'Médio', high: 'Alto', xhigh: 'Muito alto', max: 'Máximo' };
  const salvar = (t) => M.salvar && M.salvar(t);
  M.nomeProj = nome;
  // short local model name (Hugging Face one has owner, -GGUF and quant): hf.co/x/Qwen3-8B-GGUF:Q4_K_M -> Qwen3-8B
  M.curto = (m) => String(m || '').replace(/^hf\.co\/[^/]+\//i, '').replace(/:(latest|[QqIi][\w.-]*)$/, '').replace(/-GGUF$/i, '');
  // order projects appear on rail (arrow keys follow it)
  M.ordem = () => [...S.fixos, ...S.grupos.flatMap(g => g.ab ? g.itens : []), ...semGrupo()].filter(n => { const x = pj(n); return x && (S.filtro === 'todos' || precisa(x)); });

  // single AI button (rail foot, sheet and message box): shows active AI; opens AI window (F4)
  M.chipModelo = (t) => { const loc = t && t.modelo ? M.ehLocal(t.modelo) : S.ia === 'local', ml = (t && loc && t.modelo) || (M.D.local && M.D.local.modelo) || '';
    const md = t && !loc && t.modelo && !M.ehLocal(t.modelo) ? t.modelo : S.modelo, es = t && !loc && t.esf ? t.esf : S.esf;   // in conversation: ITS model (AI per conversation, auto mode)
    return `<button class="bia ${loc ? 'loc' : ''}" data-act="iamenu" data-loc="${loc ? 1 : 0}" data-dica="IA ATIVA|${loc ? 'No seu PC: ' + esc(ml) + ' · sem limite' : 'Claude: ' + M.nomeMod(md) + ' · pensamento ' + ESF[es]}${S.op && S.op.auto && !loc ? ' · automático' : ''}|Clique: escolher Claude ou IA Local|F4: configurações completas">${ico(loc ? 'cpu' : 'nuvem')}<b>${loc ? esc(M.curto(ml)) : M.nomeMod(md)}</b><span class="e">${loc ? ['Rápido', 'Normal', 'Pensar'][+S.pensar || 0] : ESF[es]}</span>${ico('baixo', 'mini')}</button>`; };
  // 25/10 (user request): AI button opens short menu with Claude and Local AI; each one's gear opens full window (F4)
  let iaBtn = null, iaTecla = false; const iam = () => document.querySelector('.iam');
  const fecharIaMenu = () => { const m = iam(); if (m) m.remove(); };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act="iamenu"]'); if (b) { iaBtn = b; iaTecla = e.detail === 0; return; } if (iam() && (!e.target.closest('.iam') || e.target.closest('.iam-loja'))) setTimeout(fecharIaMenu); }, true);
  document.addEventListener('keydown', (e) => { const m = iam(); if (!m) return; const it = [...m.querySelectorAll('.iam-it')], i = it.indexOf(document.activeElement.closest('.iam-it'));
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); fecharIaMenu(); if (iaBtn) iaBtn.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); it[(i + (e.key === 'ArrowDown' ? 1 : it.length - 1)) % it.length].focus(); }
    else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); M.agir(it[i].dataset.act); } }, true);
  function abrirIaMenu() {
    if (iam()) return fecharIaMenu(); if (!iaBtn) return;
    const loc = iaBtn.dataset.loc === '1', ml = (M.D.local && M.D.local.modelo) || '', r = iaBtn.getBoundingClientRect();
    const semConta = !(M.D.conta && M.D.conta.email);   // no account: Claude shows with lock and leads to 'Isso usa o Claude' notice
    const L = [['claude', 'Claude', semConta ? 'entrar para usar · a mais inteligente' : M.nomeMod(S.modelo) + ' · pensamento ' + ESF[S.esf], 'nuvem', !loc, 0], ['local', 'IA Local', ml ? M.curto(ml) + ' · no seu PC, sem limite' : 'nenhum modelo ainda: baixar na loja', 'cpu', loc, 1]];
    const d = document.createElement('div'); d.className = 'iam'; d.setAttribute('role', 'menu');
    d.innerHTML = L.map(([k, n, s, ic, on, ab]) => `<div class="iam-it ${on ? 'on' : ''} ${k === 'local' ? 'loc' : ''}" role="menuitem" tabindex="0" data-act="${k === 'claude' && semConta ? 'fx-ir:bloqueado' : 'ia:' + k}" data-dica="${n.toUpperCase()}|Clique: ${k === 'claude' && semConta ? 'precisa entrar na conta do Claude' : on ? 'já é a IA ativa' : 'passa a conversa para ' + (k === 'local' ? 'a IA Local' : 'o Claude')}">
      <span class="iam-ic">${ico(ic)}</span><div class="iam-tx"><b>${n}</b><small>${esc(s)}</small></div>${k === 'claude' && semConta ? '<span class="iam-cad">' + M.arteE.I('cad') + '</span>' : on ? ico('ok', 'iam-v') : ''}
      <button class="ib iam-cfg" data-act="iacfg:${ab}" data-dica="CONFIGURAR ${n.toUpperCase()}|Abre o menu completo: modelo, pensamento${k === 'local' ? ', loja de modelos' : ', conta'}">${ico('eng')}</button></div>`).join('')
      + `<div class="iam-sep"></div><div class="iam-it loc iam-loja" role="menuitem" tabindex="0" data-act="Lloja:0" data-dica="LOJA DE MODELOS|Clique: abre a loja para baixar IAs que rodam no seu PC"><span class="iam-ic">${ico('mais')}</span><div class="iam-tx"><b>Loja de modelos</b><small>baixar IAs para o seu PC · grátis</small></div></div>`;   // 26/10: visible store entry (user request)
    document.body.appendChild(d);
    const w = d.offsetWidth, h = d.offsetHeight, cima = r.top - h - 6 >= 8 && r.bottom + h + 6 > innerHeight - 8;
    d.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px'; d.style.top = (cima ? r.top - h - 6 : r.bottom + 6) + 'px'; d.style.transformOrigin = (cima ? 'bottom ' : 'top ') + 'left';
    if (iaTecla) (d.querySelector('.iam-it.on') || d.querySelector('.iam-it')).focus();   // visible focus only when opened via keyboard
  }
  const agIa = M.agir;
  M.agir = (a) => {
    if (a === 'iamenu') return abrirIaMenu();
    if (a === 'voltar-escolha') { fecharIaMenu(); Object.assign(S, { escolha: true, modal: null, fluxo: null, pop: null }); return M.draw(); }   // 26/10: back to welcome screen
    if (a.startsWith('iacfg:')) { fecharIaMenu(); S.modal = 'ia'; S.jAba = +a.slice(6); S.pop = null; return M.draw(); }
    if ((a.startsWith('ia:') || a.startsWith('fx-') || a.startsWith('Lloja:')) && iam()) { fecharIaMenu(); }
    return agIa(a);
  };
  M.iaDe = (a) => a && a.modelo ? (M.ehLocal(a.modelo) ? M.curto(a.modelo) + ' · no seu PC' : M.nomeMod(a.modelo) + ' · ' + ESF[a.esf || 'medium']) : '';
  M.F4 = 'modal:ia';

  function item(x) {
    const a = M.conversaDe(x), sel = M.projAtual() === x, i = P.indexOf(x);
    const st = a ? (a.estado === 'trabalhando' ? '<span class="gira"></span>' : '<span class="aberta" title="conversa aberta"></span>') : '';
    const n = S.ren === x.n ? `<input class="ren" value="${esc(nome(x))}" data-ren="${esc(x.n)}">` : `<div>${esc(nome(x))}</div>`;
    return `<div class="pj ${sel ? 'sel' : ''}" draggable="true" data-arr="${esc(x.n)}" data-act="sel:${i}" data-proj="${i}"><div class="ic">${M.icoProj(x)}<span class="dot d-${x.st}"></span></div>
      <div class="n">${n}<small>${a ? (a.estado === 'trabalhando' ? 'trabalhando · ' : '') + esc(M.iaDe(a)) : M.ROT[x.st] + (S.alias[x.n] ? ' · ' + esc(x.n) : '')}</small></div><span class="st">${a && M.ehLocal(a.modelo) ? ico('cpu') : ''}${st}</span>
      <button class="mais" data-act="menu:${esc(x.n)}" title="Mais">⋯</button></div>`;
  }
  const lista = (ns) => ns.map(pj).filter(x => x && (S.filtro === 'todos' || precisa(x))).map(item).join('');
  function menuHTML() {
    if (!S.menu) return ''; const x = pj(S.menu.n); if (!x) return ''; const fixo = S.fixos.includes(x.n);
    return `<div class="menu" style="top:${S.menu.y}px" data-parar="1">
      <button data-act="fixar:${esc(x.n)}">${ico('raio')}${fixo ? 'Desafixar' : 'Fixar no topo'}</button><button data-act="renomear:${esc(x.n)}">${ico('lapis')}Renomear</button>
      <div class="m-sep"></div><div class="m-tit">Mover para</div>${S.grupos.map(g => `<button data-act="mover:${esc(x.n)}:${g.id}">${ico('pasta')}${esc(g.n)}${g.itens.includes(x.n) ? ico('ok', 'v') : ''}</button>`).join('')}
      <button data-act="mover:${esc(x.n)}:">${ico('x')}Sem grupo</button><button data-act="novogrupo:${esc(x.n)}">${ico('mais')}Novo grupo com ele</button>
      <div class="m-sep"></div><button data-act="sel:${P.indexOf(x)}">${ico('doc')}Instruções e memória</button><button data-act="pasta:${P.indexOf(x)}">${ico('pasta')}Abrir a pasta</button></div>`;
  }

  // ---- pieces (app draws each in its place; prototype joins all in LAYOUT) ----
  M.topoHTML = () => { const q = M.projAtual(), t = M.aba();
    return `<div class="marca">${ast()}Claude Code</div><div class="onde">${q ? `<b>${esc(nome(q))}</b>${t && t.nomeado ? esc(t.titulo) : esc(q.dir ||'D:\\Projetos\\' + q.n)}` : t ? `<b>${esc(t.titulo || 'Chat livre')}</b>` : ''}</div>
      ${S.limite && S.ia === 'claude' ? `<button class="estado lim" data-act="modal:ia">${ico('relogio')}Claude volta às ${S.limite}</button>` : ''}${S.pendente ? `<button class="estado nova" data-act="modal:opcoes:4">${ico('atual')}Versão nova</button>` : ''}
      <button class="ib f-volta" data-act="voltar-escolha" data-dica="ESCOLHER IA|Clique: volta para a tela de escolha entre Claude e IA Local">${ico('seta')}</button><button class="ib" data-act="modal:est" data-dica="ESTATÍSTICAS|F8">${ico('graf')}</button><button class="ib" data-act="modal:opcoes" data-dica="OPÇÕES|F2">${ico('eng')}</button><button class="ib" data-act="modal:ajuda" data-dica="ATALHOS|F1">${ico('ajuda')}</button>
      ${M.botoesJanela()}`; };
  M.trilhoHTML = () => {
    const nPrec = P.filter(precisa).length, livres = M.livres ? M.livres() : [];
    let h = `<button class="novo" data-act="livre">${ico('lapis')}Nova conversa<kbd>Ctrl+T</kbd></button><div class="busca">${ico('busca')}<input id="tr-busca" placeholder="Buscar projetos" spellcheck="false" autocomplete="off"></div>
      <div class="filtros"><button class="${S.filtro === 'todos' ? 'on' : ''}" data-act="filtro:todos">Todos</button><button class="${S.filtro === 'precisa' ? 'on' : ''}" data-act="filtro:precisa">Precisam de você<span>${nPrec}</span></button></div><div class="lista">`;
    if (livres.length) h += `<div class="sec">Chats livres</div>${livres.map(a => `<div class="pj ${M.aba() === a ? 'sel' : ''}" data-act="aba:${a.id}"><div class="ic">${ico('chat')}</div><div class="n"><div>${esc(a.titulo)}</div><small>${a.estado === 'trabalhando' ? 'trabalhando · ' : ''}${esc(M.iaDe(a) || 'chat livre')}</small></div><span class="st">${a.estado === 'trabalhando' ? '<span class="gira"></span>' : ''}</span><button class="mais" data-act="fecharaba:${a.id}" title="Fechar">${ico('x')}</button></div>`).join('')}`;
    const bt = (S.trBusca || '').trim().toLowerCase(), pont = (x) => (nome(x) + ' ' + x.n).toLowerCase().includes(bt) ? 2 : (x.d || '').toLowerCase().includes(bt) ? 1 : 0, achou = bt ? P.filter(x => pont(x)).sort((a, b) => pont(b) - pont(a)) : [];   // name before description
    M.buscaTrilho = () => achou;
    if (bt) h += achou.length ? `<div class="sec">Resultados <small>${achou.length}</small></div>${achou.map(pj => item(pj)).join('')}` : `<div class="tr-nada">Nenhum projeto com "${esc(S.trBusca)}".</div>`;
    else if (!S.vazio && P.length) {
      if (S.fixos.length) h += `<div class="sec">Fixados</div>${lista(S.fixos)}`;
      for (const g of S.grupos) {
        const gn = S.ren === 'g:' + g.id ? `<input class="ren" value="${esc(g.n)}" data-ren="g:${g.id}">` : `<span>${esc(g.n)}</span>`;
        h += `<div class="grp" data-grupo="${g.id}" data-act="grupo:${g.id}"><span class="chev ${g.ab ? 'ab' : ''}">${ico('seta')}</span>${gn}<small>${g.itens.length}</small><button class="mais" data-act="renomear:g:${g.id}" title="Renomear o grupo">${ico('lapis')}</button></div>${g.ab ? lista(g.itens) : ''}`;
      }
      const sg = semGrupo(); if (sg.length) h += `<div class="grp sem" data-grupo="">${S.grupos.length ? 'Sem grupo' : 'Projetos'}<small>${sg.length}</small></div>${lista(sg)}`;
      h += `<button class="novo-g" data-act="novogrupo:">${ico('mais')}Novo grupo</button>`;
    }
    return h + `</div>${menuHTML()}<div class="pe"><div class="lin2" data-act="modal:pasta" data-dica="PASTA DO FCC|Perfil, projetos, ferramentas, enviar a um amigo e remover"><span class="ic2">${ico('pasta')}</span>Pasta do FCC</div><div class="lin2" data-act="modal:regras" data-dica="REGRAS E MEMÓRIA|Regras da casa, memória do Claude e skills"><span class="ic2">${ico('doc')}</span>Regras e memória</div>
      <div class="lin2" data-act="modal:conta"><span class="av">${esc(((M.D.conta && M.D.conta.email) || '?')[0].toUpperCase())}</span>${esc((M.D.conta && M.D.conta.email) || 'Entrar na conta')}${M.D.conta && M.D.conta.plano ? ' · ' + esc(M.D.conta.plano) : ''}</div>${M.barraUso ? M.barraUso() : ''}</div>`;
  };
  // project sheet (like Claude Desktop project page): start/continue, past conversations, instructions and memory
  M.fichaHTML = (q) => {
    if (S.vazio || !q) return `<div class="vz">Nenhum projeto. Crie uma pasta com CLAUDE.md em ${esc(M.D.raiz || 'D:\\Projetos')}.</div>`;
    const i = P.indexOf(q), a = M.conversaDe(q), conv = q.conversas || [], mem = q.mem || [];
    return `<div class="ficha"><div class="f-meio">
      <div class="f-cab"><div class="big">${M.icoProj(q)}</div><div><h1>${S.ren === q.n ? `<input class="ren grande" value="${esc(nome(q))}" data-ren="${esc(q.n)}">` : `${esc(nome(q))}<button class="ib" data-act="renomear:${esc(q.n)}" title="Renomear">${ico('lapis')}</button>`}</h1>
        <div class="d">${esc(q.d)}${q.d ? ' · ' : ''}pasta ${esc(q.n)} · <span class="pil p-${q.st}">${M.ROT[q.st]}</span></div></div></div>
      <div class="f-comeca"><textarea class="ph f-txt" id="f-txt" rows="2" spellcheck="false" placeholder="Como posso ajudar em ${esc(nome(q))}?" data-proj="${i}"></textarea><div class="f-lin">${M.chipModelo(a || null)}<span class="vao"></span>${a ? `<button class="c-btn prim" data-act="aba:${a.id}">${ico('chat')}Ir para a conversa<kbd>Enter</kbd></button>` : `<button class="c-btn" data-act="nova:${i}">${ico('chat')}Nova conversa${S.op && S.op.enter === 'Nova conversa' ? '<kbd>Enter</kbd>' : ''}</button><button class="c-btn prim" data-act="continuar:${i}">${ico('play')}Continuar de onde parou${S.op && S.op.enter === 'Nova conversa' ? '' : '<kbd>Enter</kbd>'}</button>`}</div></div>
      ${q.itens && q.itens.length ? tstCard(q) : q.voce ? `<div class="f-aviso">${ico('user')}<div><small>Você precisa</small>${esc(q.voce)}</div></div>` : ''}
      <div class="f-tit">Conversas anteriores</div>${conv.length ? `<div class="j-lista">${conv.map(x => `<div class="j-it">${ico('chat')}<span>${esc(x.txt)}</span><small>${esc(x.quando)}${x.tok ? ' · ' + esc(x.tok) + ' tokens' : ''}</small><button class="c-btn" data-act="retomar:${i}:${esc(x.id)}">Retomar</button></div>`).join('')}</div>` : `<div class="f-vazio">Nenhuma conversa ainda neste projeto.</div>`}</div>
      <div class="f-lado">
        <div class="f-card"><div class="f-ct">${ico('doc')}Instruções do projeto<button class="ib" data-act="editar-arq:${i}:CLAUDE.md" title="Editar">${ico('lapis')}</button></div><div class="f-cx">CLAUDE.md</div><div class="f-tx">${esc(q.instr || q.d)}</div></div>
        <div class="f-card"><div class="f-ct">${ico('lampada')}Memória<button class="ib" data-act="pasta:${i}" title="Abrir a pasta">${ico('pasta')}</button></div>
          ${mem.map(x => `<div class="f-mem" data-act="editar-arq:${i}:${esc(x.arq || '')}">${ico('doc')}<span>${esc(x.n)}</span><small>${esc(x.d)}</small></div>`).join('')}</div>
      </div></div>`;
  };
  // prototype: all together (app doesn't use LAYOUT: real conversation has own DOM)
  window.LAYOUT = (S, M) => {
    const t = M.aba();
    let h = `<div class="topo">${M.topoHTML()}</div><div class="corpo"><div class="trilho">${M.trilhoHTML()}</div><div class="palco">`;
    if (t) h += M.chatHTML(t);
    else h += M.fichaHTML(M.p());
    return h + '</div></div>';
  };

  // project icon = icon of its .exe (27/10, user request; app fills q.ico); double click on it opens the .exe
  M.icoProj = (q) => q.ico ? `<img class="pico" src="${q.ico}" data-exe="${esc(q.n)}" draggable="false" alt="" data-dica="${esc(nome(q))}|Dois cliques: abre o programa · direito duas vezes: abre a pasta">` : q.l;

  // welcome box = real text box (26/10, user request): grows with text up to 8 lines then scrolls; click anywhere in box types
  M.alturaFicha = (n) => { if (!n) return; n.style.height = '48px'; const h = Math.min(192, Math.max(48, n.scrollHeight)); n.style.height = h + 'px'; n.style.overflowY = n.scrollHeight > 192 ? 'auto' : 'hidden'; };
  document.addEventListener('input', (e) => { if (e.target.id === 'f-txt') M.alturaFicha(e.target); });
  document.addEventListener('mousedown', (e) => { const b = e.target.closest && e.target.closest('.f-comeca'); if (!b || e.target.closest('textarea, button, [data-act]')) return; const t = b.querySelector('textarea'); if (!t) return; e.preventDefault(); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });

  // "Para testar" (25/10, user request): collapsed shows 1st item; click opens list with checkboxes. Checked = tested: go with
  // next message in that project (app marks [x] in PRA-TESTAR.md and tells AI). S.tst[projeto] = checked texts.
  S.tst = S.tst || {};
  M.testesDe = (q) => (S.tst[q.n] || []).filter(x => (q.itens || []).includes(x));
  function tstCard(q) {
    const ab = S.tstAb === q.n, mk = M.testesDe(q);
    return `<div class="f-card tst ${ab ? 'ab' : ''}"><button class="f-ct tst-cab" data-act="tstab:${esc(q.n)}">${ico('ok')}Para testar<span class="q">${mk.length ? mk.length + ' de ' : ''}${q.itens.length}</span><span class="chev ${ab ? 'ab' : ''}">${ico('seta')}</span></button>
      ${ab ? `<div class="tst-lista${S.tstT && Date.now() - S.tstT < 500 ? ' abrindo' : ''}">` + q.itens.map((x, k) => `<label class="pn-item tst-it ${mk.includes(x) ? 'feito' : ''}"><input type="checkbox" data-tst="${esc(q.n)}" data-k="${k}" ${mk.includes(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('') + `<div class="tst-dica">${mk.length ? 'Os marcados vão como testados na próxima mensagem.' : 'Marque o que já testou; vai junto da próxima mensagem.'}</div></div>`
        : `<div class="tst-res"><span>${esc(q.itens[0])}</span>${q.itens.length > 1 ? `<small>+${q.itens.length - 1}</small>` : ''}</div>`}</div>`;
  }
  document.addEventListener('change', (e) => {
    const c = e.target.closest && e.target.closest('input[data-tst]'); if (!c) return;
    const q = P.find(x => x.n === c.dataset.tst); if (!q) return; const it = q.itens[+c.dataset.k];
    const L = S.tst[q.n] = (S.tst[q.n] || []).filter(x => x !== it); if (c.checked) L.push(it);
    if (M.salvarTestes) M.salvarTestes(); M.draw();
  });

  // rail actions (UI part only; rest goes to M.agir below)
  const agirBase = M.agir;
  M.agir = (a) => {
    const [k, ...r] = a.split(':'), v = r.join(':');
    if (k !== 'menu') S.menu = null;
    if (k === 'menu') { const el = document.querySelector(`[data-arr="${CSS.escape(v)}"]`); S.menu = S.menu && S.menu.n === v ? null : { n: v, y: el ? Math.min(el.offsetTop + el.offsetHeight - el.parentElement.scrollTop + 120, 420) : 200 }; return M.draw(); }
    if (k === 'fixar') { S.fixos = S.fixos.includes(v) ? S.fixos.filter(x => x !== v) : [...S.fixos, v]; S.grupos.forEach(g => g.itens = g.itens.filter(x => x !== v)); salvar('trilho'); return M.draw(); }
    if (k === 'renomear') { S.ren = v; M.draw(); const i = document.querySelector('input.ren'); if (i) { i.focus(); i.select(); } return; }
    if (k === 'mover') { const [n, g] = [r[0], r[1]]; S.fixos = S.fixos.filter(x => x !== n); S.grupos.forEach(x => x.itens = x.itens.filter(y => y !== n)); if (g) S.grupos.find(x => x.id === g).itens.push(n); salvar('trilho'); return M.draw(); }
    if (k === 'novogrupo') { const id = 'g' + Date.now(); S.grupos.push({ id, n: 'Grupo novo', ab: true, itens: [] }); if (v) M.agir(`mover:${v}:${id}`); S.ren = 'g:' + id; salvar('trilho'); M.draw(); const i = document.querySelector('input.ren'); if (i) { i.focus(); i.select(); } return; }
    if (k === 'grupo') { const g = S.grupos.find(x => x.id === v); g.ab = !g.ab; salvar('trilho'); return M.draw(); }
    if (k === 'filtro') { S.filtro = v; return M.draw(); }
    if (k === 'tstab') { S.tstAb = S.tstAb === v ? null : v; S.tstT = Date.now(); return M.draw(); }
    if (k === 'avisar') return M.avisarConta();
    if (k === 'usarlocal') { S.modal = 'ia'; S.jAba = 1; return M.draw(); }
    agirBase(a);
  };
  const salvarRen = (el) => { const v = el.value.trim(); const k = el.dataset.ren; if (/^[rp]:/.test(k)) { S.ren = null; if (v && M.rascunhoAcao) M.rascunhoAcao(k[0] === 'r' ? 'renomear' : 'projeto', k.slice(2), v); else M.draw(); return; } if (k.startsWith('g:')) { const g = S.grupos.find(x => x.id === k.slice(2)); if (g && v) g.n = v; } else { if (v && v !== k) S.alias[k] = v; else delete S.alias[k]; } S.ren = null; salvar('trilho'); M.draw(); };
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('input.ren');
    if (el) { e.stopImmediatePropagation(); if (e.key === 'Enter') salvarRen(el); if (e.key === 'Escape') { S.ren = null; M.draw(); } return; }
  }, true);
  document.addEventListener('focusout', (e) => { if (e.target.matches && e.target.matches('input.ren') && S.ren) salvarRen(e.target); });
  document.addEventListener('click', (e) => { if (e.target.closest('input.ren')) e.stopImmediatePropagation(); }, true);
  // drag: drop on project = joins its group, before it; on group title = goes to group end
  let arr = null;
  document.addEventListener('dragstart', (e) => { const el = e.target.closest && e.target.closest('[data-arr]'); if (el) { arr = el.dataset.arr; e.dataTransfer.effectAllowed = 'move'; el.classList.add('arrastando'); } });
  document.addEventListener('dragover', (e) => { if (arr && e.target.closest('[data-arr],[data-grupo]')) { e.preventDefault(); document.querySelectorAll('.alvo').forEach(x => x.classList.remove('alvo')); e.target.closest('[data-arr],[data-grupo]').classList.add('alvo'); } });
  document.addEventListener('drop', (e) => {
    const alvo = e.target.closest('[data-arr],[data-grupo]'); if (!arr || !alvo) return; e.preventDefault(); const n = arr; arr = null;
    S.fixos = S.fixos.filter(x => x !== n); S.grupos.forEach(g => g.itens = g.itens.filter(x => x !== n));
    if (alvo.dataset.grupo != null) { const g = S.grupos.find(x => x.id === alvo.dataset.grupo); if (g) g.itens.push(n); }
    else { const an = alvo.dataset.arr; const g = S.grupos.find(x => x.itens.includes(an)); if (S.fixos.includes(an)) S.fixos.splice(S.fixos.indexOf(an), 0, n); else if (g) g.itens.splice(g.itens.indexOf(an), 0, n); }
    salvar('trilho'); M.draw();
  });
  document.addEventListener('dragend', () => { if (arr) { arr = null; M.draw(); } });
  Object.assign(M.CENAS, { menu: () => { S.menu = { n: 'Som', y: 420 }; }, renomear: () => { S.alias.Painel = 'Hub da casa'; S.ren = 'Espelho'; }, grupos: () => { S.grupos[1].ab = false; S.alias.Painel = 'Hub da casa'; S.filtro = 'todos'; }, precisa: () => { S.filtro = 'precisa'; } });
})();
