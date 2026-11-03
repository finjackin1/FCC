// CHOSEN 24/10 (v3 proposal B, docs/prototipos/v3) "Projetos e conversas" (bold, recommended): rail shows CONVERSATIONS, not just projects.
// On top, "Agora" = open conversations (any project, with topic name and AI). Each project expands (arrow) and shows its
// latest conversations (auto name) + "Nova conversa". Whoever needs you becomes a notice on top, not a hidden filter.
(function () {
  const { S, P, ico, esc } = M;
  S.exp = S.exp || ['FCC'];
  const nome = (x) => M.nomeProj(x), precisa = (x) => x.st === 'testar' || x.st === 'decidir';
  const titulo = (c) => c.titulo || c.txt;
  // pending dots (25/10, user request; fixed colors: skill interface-web §4). Order = urgency; 1st paints icon dot.
  const PEND = { decidir: ['DECISÃO SUA', 'O projeto espera você decidir ou dar aval'], teste: ['TESTE SEU', 'Tem itens em PRA-TESTAR esperando você testar'],
    publicar: ['PRONTO PARA PUBLICAR', 'Versão pronta esperando seu aval para publicar'], trabalhando: ['IA TRABALHANDO', 'Uma conversa deste projeto está trabalhando agora'],
    mudancas: ['MUDANÇAS NÃO PUBLICADAS', 'Tem código novo depois da última versão publicada'], publicado: ['PUBLICADO', 'A última versão já está publicada no GitHub'],
    parado: ['PARADO', 'Sem pendência nem tarefa agora'] };
  M.PEND = PEND; S.filtro = 'todos';
  M.pendDe = (x) => { const L = new Set(x.pend || (x.st === 'testar' ? ['teste'] : x.st === 'decidir' ? ['decidir'] : ['parado']));
    const a = M.conversaDe && M.conversaDe(x); if (a && a.estado === 'trabalhando') { L.add('trabalhando'); L.delete('parado'); } if (!L.size) L.add('parado');
    return Object.keys(PEND).filter(k => L.has(k)); };
  const bolinhas = (x) => `<span class="pend">${M.pendDe(x).map(k => `<i class="pc-${k}" data-dica="${PEND[k][0]}|${PEND[k][1]}"></i>`).join('')}</span>`;   // app: session title (auto name) or summary
  const pj = (n) => P.find(x => x.n === n);
  const semGrupo = () => P.filter(x => !S.fixos.includes(x.n) && !S.grupos.some(g => g.itens.includes(x.n))).map(x => x.n);
  function conv(a) {
    const q = a.p, cor = q ? M.corDe(q.n) : 'var(--fg3)';
    return `<div class="cv ${M.aba() === a ? 'sel' : ''} ${a.estado === 'trabalhando' ? 'trab' : ''}" data-act="aba:${a.id}" style="--cor:${cor}"><span class="cv-ic">${q ? M.icoProj(q) : ico('chat')}</span>
      <div class="n"><div>${esc(a.titulo && a.titulo !== (q && q.n) ? a.titulo : (q ? 'Conversa em ' + nome(q) : 'Chat livre'))}</div><small>${a.estado === 'trabalhando' ? '<i class="vivo"></i>trabalhando · ' : a.estado === 'pede' ? '<i class="pede"></i>pede você · ' : ''}${esc(M.iaDe(a) || '')}</small></div>
      <button class="mais" data-act="fecharaba:${a.id}" title="Fechar">${ico('x')}</button></div>`;
  }
  function proj(x) {
    const i = P.indexOf(x), a = M.conversaDe(x), ab = S.exp.includes(x.n), sel = M.projAtual() === x && !M.aba();
    const n = S.ren === x.n ? `<input class="ren" value="${esc(nome(x))}" data-ren="${esc(x.n)}">` : `<div>${esc(nome(x))}</div>`;
    let h = `<div class="pj ${sel ? 'sel' : ''} ${ab ? 'ab' : ''}" draggable="true" data-arr="${esc(x.n)}" data-act="sel:${i}" data-proj="${i}">
      <button class="chev2" data-act="exp:${esc(x.n)}" title="Mostrar conversas">${ico('seta')}</button><div class="ic">${M.icoProj(x)}</div>
      <div class="n">${n}<small>${bolinhas(x)}${M.ROT[x.st]}${(x.conversas || []).length ? ' · ' + x.conversas.length + ' conversas' : ''}</small></div><span class="st">${a ? `<span class="aberta" title="conversa aberta"></span>` : ''}</span>
      <button class="mais" data-act="menu:${esc(x.n)}" title="Mais">⋯</button></div>`;
    if (ab && M.carregarFicha) M.carregarFicha(x);   // app: reads conversations from disk (at most every 30 s)
    if (ab) h += `<div class="sub${S.expT && S.expT.n === x.n && Date.now() - S.expT.t < 500 ? ' abrindo' : ''}" style="--cor:${M.corDe(x.n)}">${(x.conversas || []).slice(0, 3).map((c) => `<div class="sc" data-act="retomar:${i}:${esc(c.id)}"><span>${esc(titulo(c))}</span><small>${esc(c.quando.replace(/ \d\d:\d\d$/, ''))}</small></div>`).join('')}
      <div class="sc nova" data-act="nova:${i}">${ico('mais')}Nova conversa</div></div>`;
    return h;
  }
  // 25/10 (user request): free chat never lost. Closed, becomes draft here until user renames, deletes or turns into project.
  function rascunho(c) {
    const k = S.ren === 'r:' + c.id ? 'r' : S.ren === 'p:' + c.id ? 'p' : '';
    const n = k === 'r' ? `<input class="ren" value="${esc(c.titulo)}" data-ren="r:${esc(c.id)}">` : k === 'p' ? `<input class="ren" value="" placeholder="Nome do projeto novo" data-ren="p:${esc(c.id)}">` : `<div>${esc(c.titulo)}</div>`;
    return `<div class="cv rasc" data-act="rascunho:${esc(c.id)}" style="--cor:var(--fg3)"><span class="cv-ic">${ico('doc')}</span>
      <div class="n">${n}<small>${k === 'p' ? 'Enter cria a pasta e leva a conversa' : esc(c.quando)}</small></div>
      <button class="mais" data-act="renomear:r:${esc(c.id)}" title="Renomear">${ico('lapis')}</button><button class="mais" data-act="renomear:p:${esc(c.id)}" title="Virar projeto">${ico('pasta')}</button><button class="mais" data-act="rascapagar:${esc(c.id)}" title="Apagar (vai para a Lixeira)">${ico('x')}</button></div>`;
  }
  const lista = (ns) => ns.map(pj).filter(Boolean).map(proj).join('');
  const base = M.trilhoHTML;
  M.trilhoHTML = () => {
    const o = base();
    if ((S.trBusca || '').trim() || S.vazio) return o;
    const iL = o.indexOf('<div class="filtros">'), iM = o.indexOf('<div class="menu"'), iP = o.indexOf('<div class="pe">'), fim = iM >= 0 ? iM : iP;
    const prec = P.filter(precisa), abertas = S.abas.filter(a => a.id !== 'inicio' && a.tipo !== 'inicio' && a.tipo !== 'login'), livres = M.livres ? M.livres() : [];
    let h = o.slice(0, iL);
    h += '<div class="lista">';
    if (abertas.length) h += `<div class="sec">Agora <small>${abertas.length}</small></div>${abertas.map(conv).join('')}`;
    const ra = M.rascunhos ? M.rascunhos() : [], rv = ra.slice(0, 4), rx = S.rascTodos ? ra.slice(4) : [];
    if (ra.length) h += `<div class="sec">Rascunhos <small>${ra.length}</small></div>${rv.map(rascunho).join('')}${rx.length ? `<div class="grp-c${S.rascT && Date.now() - S.rascT < 500 ? ' abrindo' : ''}">${rx.map(rascunho).join('')}</div>` : ''}${ra.length > 4 ? `<div class="sc nova" data-act="rasctodos:">${S.rascTodos ? 'Mostrar menos' : 'Ver todos (' + ra.length + ')'}</div>` : ''}`;
    const so = (ns) => ns;   // 25/10 (user request): no 'projetos esperam você' button; dots show what each needs
    if (S.fixos.length) h += `<div class="sec">Fixados</div>${lista(so(S.fixos))}`;
    for (const g of S.grupos) {
      const gn = S.ren === 'g:' + g.id ? `<input class="ren" value="${esc(g.n)}" data-ren="g:${g.id}">` : `<span>${esc(g.n)}</span>`;
      h += `<div class="grp" data-grupo="${g.id}" data-act="grupo:${g.id}"><span class="chev ${g.ab ? 'ab' : ''}">${ico('seta')}</span>${gn}<small>${g.itens.length}</small><button class="mais" data-act="renomear:g:${g.id}" title="Renomear o grupo">${ico('lapis')}</button></div>${g.ab ? `<div class="grp-c${S.grpT && S.grpT.n === g.id && Date.now() - S.grpT.t < 500 ? ' abrindo' : ''}">${lista(so(g.itens))}</div>` : ''}`;
    }
    const sg = so(semGrupo()); if (sg.length) h += `<div class="grp sem" data-grupo="">${S.grupos.length ? 'Sem grupo' : 'Projetos'}<small>${sg.length}</small></div>${lista(sg)}`;
    h += `<button class="novo-g" data-act="novogrupo:">${ico('mais')}Novo grupo</button>`;
    return h + '</div>' + o.slice(fim);
  };
  const ag = M.agir;
  M.rascunhos = M.rascunhos || (() => (M.D.rascunhos || []).filter(c => !S.abas.some(t => t.sessao === c.id)));
  M.rascunhoAcao = M.rascunhoAcao || ((ac, id, v) => { const L = M.D.rascunhos || [], c = L.find(x => x.id === id); if (!c) return; if (ac === 'renomear' && v) c.titulo = v; if (ac === 'apagar' || (ac === 'projeto' && v)) L.splice(L.indexOf(c), 1); if (ac === 'abrir') M.agir('livre:'); M.draw(); });
  M.agir = (a) => { if (a.startsWith('rascunho:')) return M.rascunhoAcao('abrir', a.slice(9)); if (a.startsWith('rascapagar:')) return M.rascunhoAcao('apagar', a.slice(11)); if (a === 'rasctodos:') { S.rascTodos = !S.rascTodos; S.rascT = Date.now(); return M.draw(); } if (a.startsWith('grupo:')) S.grpT = { n: a.slice(6), t: Date.now() }; if (a.startsWith('exp:')) { const n = a.slice(4); S.exp = S.exp.includes(n) ? S.exp.filter(x => x !== n) : [...S.exp, n]; return M.draw(); } return ag(a); };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act^="exp:"]'); if (b) { e.stopPropagation(); e.preventDefault(); const n = b.dataset.act.slice(4); S.expT = { n, t: Date.now() }; S.exp = S.exp.includes(n) ? S.exp.filter(x => x !== n) : [...S.exp, n]; if (M.salvar) M.salvar('trilho'); M.draw(); } }, true);
  Object.assign(M.CENAS, { 'b-fechado': () => { S.exp = []; } });
})();
