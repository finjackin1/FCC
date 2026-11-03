// v4 (30/10/2026): ideas from Claude Code Desktop (redesign 14/04/2026) as a layer over ESCOLHIDA (v2 + v3 B).
// window.V4 = 'A' (safe: same layout + new pieces) | 'B' (bold: right dock with tabs) | 'C' (unexpected: two conversations side by side).
// New pieces (all variants): permission mode chip (Ctrl+Shift+M), context ring with breakdown, Mudanças (files changed + diff with
// line comments sent as a batch, Ctrl+Shift+D), Pergunta de lado (Ctrl+;, doesn't enter the conversation), Resumido/Detalhado (Ctrl+O).
// Program (31/10): real data via M.V4D (tela/ponte4.js); absent = prototype demo below. App draws its own chat DOM, so the top bar and pops
// come from M.v4.barra/pops (app.js), not from M.chatHTML.
(function () {
  const { S, esc } = M, V = window.V4 || 'B', C = window.CHAT;
  document.documentElement.classList.add('v4-' + V);
  const SV = { d: '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">', f: '</svg>' };
  const I = {
    escudo: '<path d="M8 2l5 2v4c0 3-2.2 5.2-5 6-2.8-.8-5-3-5-6V4z"/>', mao: '<path d="M5 8V4.5a1 1 0 012 0V8m0-1V3.5a1 1 0 012 0V8m0-.5V4.5a1 1 0 012 0V9c0 3-2 5-4.5 5S4 12.5 3.5 11L2.6 8.8a1 1 0 011.8-.8L5 9"/>',
    lapis: '<path d="M10.5 3.5l2 2L6 12H4v-2z"/>', mapa: '<path d="M2 4l4-1.5 4 1.5 4-1.5v9.5l-4 1.5-4-1.5-4 1.5z M6 2.5v9.5 M10 4v9.5"/>', raio: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/>',
    mud: '<path d="M4 2.5v11 M12 2.5v11 M2 5h4 M10 11h4 M10 5h4"/>', term: '<path d="M2.5 3.5h11v9h-11z M5 7l2 1.5L5 10 M8.5 10.5h3"/>', arq: '<path d="M4 2h5l3 3v9H4z M9 2v3h3"/>',
    proj: '<path d="M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z"/>', rel: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/>', lado: '<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/>',
    olho: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>', mais: '<path d="M8 3.5v9 M3.5 8h9"/>', x: '<path d="M4 4l8 8M12 4l-8 8"/>',
    copia: '<path d="M5.5 5.5h7v7h-7z M3.5 10.5v-7h7"/>', split: '<path d="M2.5 3.5h11v9h-11z M8 3.5v9"/>', ok: '<path d="M3.5 8.5l3 3 6-7"/>', seta: '<path d="M6 4l4 4-4 4"/>', enviar: '<path d="M8 13V3 M4 7l4-4 4 4"/>',
  };
  const ico = (n) => SV.d + (I[n] || '') + SV.f;
  M.ico4 = ico;

  // ---- demo data (the FCC conversation that "closed the coder loopholes" today) ----
  const MODOS = [['perguntar', 'Perguntar antes', 'mao', 'Pede sua permissão para editar arquivos e rodar comandos'], ['editar', 'Aceitar edições', 'lapis', 'Edita arquivos sozinho; comandos ainda pedem permissão'],
    ['planejar', 'Só planejar', 'mapa', 'Lê e monta um plano; não muda nada até você aprovar'], ['auto', 'Automático', 'raio', 'Decide sozinho o que é seguro; pede só o arriscado']];
  const CTX = { usado: 76, total: 200, partes: [['Regras e memória', 14, 'var(--local)'], ['Conversa', 46, 'var(--acento)'], ['Resultados de ferramentas', 9, 'var(--amb)'], ['Sistema', 7, 'var(--fg3)']] };
  const ARQS = [
    { f: 'abas\\local.js', a: 48, r: 9, h: [['@', 'turno() · linha 465'], [' ', 'const escritos = new Set();'], ['-', 'let rodouDepois = true, cobraRodar = 0;'], ['+', 'let rodouDepois = true, passou = true, cobraRodar = 0;'], ['+', 'const maxV = () => prog ? 30 : 14;'], [' ', ''],
      ['@', 'portão do programador · linha 506'], ['-', 'if (!rodouDepois && cobraRodar < 2) {'], ['+', 'if (!passou && cobraRodar < 6) {'], [' ', '  cobraRodar++;'], ['+', '  // só entrega depois de um teste que passa'], [' ', '  cutucar(msg); continue;'], [' ', '}']] },
    { f: 'abas\\ferramentas\\testar-local-programar.js', a: 98, r: 0, novo: true, h: [['@', 'arquivo novo'], ['+', "// Teste (30/10): o modo programador é REGRA, não conselho."], ['+', "'use strict';"], ['+', "const http = require('http');"]] },
    { f: 'casa\\memoria\\programar.md', a: 3, r: 1, h: [['@', 'linha 4'], ['-', '4. Falhou: leia o erro e corrija.'], ['+', '4. Falhou: leia o erro, corrija o CÓDIGO e rode de novo.'], ['+', '   Repita até dar OK.']] },
  ];
  const AGEND = [['Resumo das pendências', 'seg a sex · 08:00', 'rodou hoje 08:00 · ok'], ['Prova da IA local', 'toda noite · 02:00', 'rodou hoje 02:00 · 3/20'], ['Faxina das pastas', 'domingo · 10:00', 'pulou dom 26/10 · PC desligado']];
  const R = () => M.V4D || null, T = () => M.aba && M.aba();
  const ctx = () => (R() && R().ctx(T())) || CTX, arqs = () => (R() ? R().arqs(T()) : ARQS);
  const somaA = () => arqs().reduce((s, x) => s + x.a, 0), somaR = () => arqs().reduce((s, x) => s + x.r, 0);

  const V40 = { modo: 'editar', vista: 'resumido', dock: 'projeto', arq: 0, com: [{ arq: 0, lin: 8, txt: 'Por que 6 e não 3 cobranças?' }], comAberto: null, lado: false, ladoResp: false, pop: '', isolada: true, split: false, voo: '',
    ladoQ: 'O que "passou" quer dizer no portão?', ladoR: 'É o último teste rodado <b>depois</b> da última mudança no código: terminou sem erro e mostrou algo na tela. Rodar o arquivo sozinho, sem saída, não conta.', comTxt: 'Use a mesma regra no Rodar de .ps1' };
  S.v4 = Object.assign(JSON.parse(JSON.stringify(V40)), S.v4 || {});
  const v = S.v4;
  if (R()) R().inicio(v);   // program: no demo comment, isolada off, mode from the conversation

  // ---- pieces ----
  const anel = (p, tam = 18) => { const r = tam / 2 - 2, c = 2 * Math.PI * r; return `<svg class="v4-anel" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" class="f"/><circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" class="u" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${tam / 2} ${tam / 2})"/></svg>`; };
  const pct = () => { const c = ctx(); return c.total ? Math.round(c.usado / c.total * 100) : 0; };
  const modo = () => MODOS.find(m => m[0] === (R() ? R().modo(T()) : v.modo)) || MODOS[1];
  const chipModo = () => `<button class="v4-chip ${modo()[0] === 'planejar' ? 'plano' : modo()[0] === 'auto' ? 'auto' : ''}" data-act="v4:pop:modo" title="Modo de permissão (Ctrl+Shift+M)">${ico(modo()[2])}<span>${modo()[1]}</span></button>`;
  const chipCtx = () => `<button class="v4-ctx" data-act="v4:pop:ctx" title="Contexto usado: ${ctx().usado} mil de ${ctx().total} mil tokens">${anel(pct())}<span>${pct()}%</span></button>`;
  const popModo = () => `<div class="v4-pop modo"><div class="v4-pt">Modo de permissão<kbd>Ctrl+Shift+M</kbd></div>${MODOS.map(m => `<button class="v4-op ${m[0] === modo()[0] ? 'on' : ''}" data-act="v4:modo:${m[0]}">${ico(m[2])}<span><b>${m[1]}</b><small>${m[3]}</small></span>${m[0] === modo()[0] ? `<i class="v4-ok">${ico('ok')}</i>` : ''}</button>`).join('')}</div>`;
  const popCtx = () => `<div class="v4-pop ctx"><div class="v4-pt">Contexto da conversa</div><div class="v4-ctx-g">${anel(pct(), 56)}<div><b>${pct()}%</b><small>${ctx().usado} mil de ${ctx().total} mil tokens</small></div></div>
    <div class="v4-barra">${ctx().partes.map(p => `<i style="width:${p[1] / ctx().total * 100}%;background:${p[2]}"></i>`).join('')}</div>${ctx().partes.map(p => `<div class="v4-pl"><i style="background:${p[2]}"></i>${p[0]}<span>${p[1]} mil</span></div>`).join('')}
    <div class="v4-dica">Perto de 80% o Claude começa a esquecer o começo. <button class="v4-lk" data-act="v4:resumir">Resumir a conversa</button></div></div>`;
  const lado = () => `<div class="v4-lado"><div class="v4-lado-c">${ico('lado')}<b>Pergunta de lado</b><span>lê a conversa, não entra nela</span><button class="v4-x" data-act="v4:lado" title="Fechar (Esc)">${ico('x')}</button></div>
    ${v.ladoQ ? `<div class="v4-lado-q">${esc(v.ladoQ)}</div>${v.ladoResp ? `<div class="v4-lado-r">${v.ladoR}</div>` : '<div class="v4-lado-r esp"><i></i><i></i><i></i></div>'}` : ''}
    <div class="v4-lado-in"><input placeholder="Outra pergunta de lado…" spellcheck="false"><kbd>Enter</kbd></div></div>`;
  const vista = () => `<div class="v4-vista" title="Como mostrar os passos (Ctrl+O)">${[['resumido', 'Resumido'], ['detalhado', 'Detalhado']].map(x => `<button class="${v.vista === x[0] ? 'on' : ''}" data-act="v4:vista:${x[0]}">${x[1]}</button>`).join('')}</div>`;

  // diff: unified, line comment "+" on hover, comments shown under the line, batch send
  function diff(i, compacto) {
    const a = arqs()[i] || { h: [] }; let n = 0, h = `<div class="v4-diff">`;
    a.h.forEach((l, k) => { if (l[0] === '@') { h += `<div class="v4-hunk">${esc(l[1])}</div>`; return; } n++;
      const cs = v.com.filter(c => c.arq === i && c.lin === k);
      h += `<div class="v4-l ${l[0] === '+' ? 'v4-lp' : l[0] === '-' ? 'v4-lm' : ''}"><span class="v4-n">${n}</span><span class="v4-s">${l[0] === ' ' ? '' : l[0]}</span><code>${esc(l[1]) || '&nbsp;'}</code>${compacto ? '' : `<button class="v4-add" data-act="v4:com:${i}:${k}" title="Comentar esta linha">${ico('mais')}</button>`}</div>`;
      cs.forEach(c => { h += `<div class="v4-com">${ico('lado')}<span>${esc(c.txt)}</span><button class="v4-x" data-act="v4:apagacom:${v.com.indexOf(c)}" title="Apagar comentário">${ico('x')}</button></div>`; });
      if (v.comAberto && v.comAberto.arq === i && v.comAberto.lin === k) h += `<div class="v4-com edit"><textarea rows="2" placeholder="Comentário para o Claude sobre esta linha…" spellcheck="false">${esc(v.comTxt)}</textarea><div><button class="v4-b" data-act="v4:comcancela">Cancelar</button><button class="v4-b prim" data-act="v4:comok">Comentar</button></div></div>`;
    });
    return h + '</div>';
  }
  const listaArqs = () => arqs().map((a, i) => `<button class="v4-arq ${v.arq === i ? 'on' : ''}" data-act="v4:arq:${i}">${ico('arq')}<span>${esc(a.f.split('\\').pop())}<small>${esc(a.f.includes('\\') ? a.f.slice(0, a.f.lastIndexOf('\\')) : '')}</small></span><em class="v4p">+${a.a}</em>${a.r ? `<em class="v4m">−${a.r}</em>` : ''}${a.novo ? '<em class="nv">novo</em>' : ''}</button>`).join('');
  const enviarCom = () => v.com.length ? `<div class="v4-env"><span>${v.com.length} comentário${v.com.length > 1 ? 's' : ''} para o Claude</span><button class="v4-b prim" data-act="v4:mandacom">${ico('enviar')}Mandar<kbd>Ctrl+Enter</kbd></button></div>` : '';
  const cartaoMud = (abre) => `<div class="v4-card"><div class="v4-ct">${ico('mud')}Mudanças<span class="v4-ad"><em class="v4p">+${somaA()}</em><em class="v4m">−${somaR()}</em></span></div>${arqs().map((a, i) => `<button class="v4-mini" data-act="${abre}:${i}"><span>${esc(a.f.split('\\').pop())}</span><em class="v4p">+${a.a}</em>${a.r ? `<em class="v4m">−${a.r}</em>` : ''}</button>`).join('')}</div>`;
  const cartaoCtx = () => `<div class="v4-card ctxc" data-act="v4:pop:ctx"><div class="v4-ct">${anel(pct(), 16)}Contexto<span>${pct()}%</span></div><div class="v4-barra">${ctx().partes.map(p => `<i style="width:${p[1] / ctx().total * 100}%;background:${p[2]}"></i>`).join('')}</div><small>${ctx().usado} mil de ${ctx().total} mil tokens</small></div>`;
  const isolada = () => `<button class="v4-iso ${v.isolada ? 'on' : ''}" data-act="v4:isolada" title="Cópia isolada (git worktree): a conversa mexe numa cópia da pasta; você junta quando aprovar">${ico('copia')}<span><b>Cópia isolada</b><small>${v.isolada ? 'mexe numa cópia · juntar quando aprovar' : 'mexe direto na pasta do projeto'}</small></span><i class="v4-sw"></i></button>`;
  const agendadas = () => `<div class="v4-ag">${AGEND.map(a => `<div class="v4-ag-i">${ico('rel')}<span><b>${a[0]}</b><small>${a[1]}</small><small class="h ${/pulou/.test(a[2]) ? 'av' : ''}">${a[2]}</small></span><button class="v4-b" data-act="v4:agora" title="Rodar agora">Rodar agora</button></div>`).join('')}<button class="v4-b novo" data-act="v4:agnova">${ico('mais')}Nova tarefa agendada</button></div>`;
  const terminal = () => R() ? R().terminal(T()) : `<div class="v4-term"><div>PS D:\\Projetos\\FCC&gt; node abas\\ferramentas\\testar-local-programar.js</div><div class="ok">ok    1 só no chat: mandou salvar</div><div class="ok">ok    2 teste falhou: não deixou entregar</div><div class="ok">ok    5 nunca testou: aviso do programa</div><div>Tudo certo</div><div class="cur">PS D:\\Projetos\\FCC&gt; <i></i></div></div>`;
  const FS = { dirs: ['abas', 'casa', 'docs', 'familias', 'memoria'], files: ['CLAUDE.md', 'fcc-abas.json', 'package.json'] };
  const arquivos = () => { const fs = R() ? R().arquivos(T()) : FS; return `<div class="v4-fs">${fs.dirs.map(d => `<div class="d"${R() ? ` data-act="v4:abre:${esc(d)}"` : ''}>${ico('proj')}${esc(d)}</div>`).join('')}${fs.files.map(f => `<div class="f"${R() ? ` data-act="v4:abre:${esc(f)}"` : ''}>${ico('arq')}${esc(f)}</div>`).join('')}</div>`; };

  // ---- message box row: mode chip on the left, context ring replaces "N tokens" ----
  const lin0 = C.linhaHTML;
  C.linhaHTML = (t, pa) => lin0(t, pa).replace('<span class="esp"></span>', chipModo() + '<span class="esp"></span>').replace(/<button class="tk"[^>]*>[^<]*<\/button>/, chipCtx());

  // ---- right panel ----
  const pai0 = C.painelHTML;
  const DOCK = [['projeto', 'Projeto', 'proj'], ['mudancas', 'Mudanças', 'mud'], ['terminal', 'Terminal', 'term'], ['arquivos', 'Arquivos', 'arq']];
  if (V === 'A') C.painelHTML = (t, todos) => { const h = pai0(t, todos), i = h.indexOf('<h4>'); return h.slice(0, i) + cartaoCtx() + cartaoMud('v4:folha') + h.slice(i); };
  if (V === 'B') C.painelHTML = (t, todos) => {
    const abas = `<div class="v4-tabs">${DOCK.map(d => `<button class="${v.dock === d[0] ? 'on' : ''}" data-act="v4:dock:${d[0]}" title="${d[1]}${d[0] === 'mudancas' ? ' (Ctrl+Shift+D)' : d[0] === 'terminal' ? ' (Ctrl+`)' : ''}">${ico(d[2])}<span>${d[1]}</span>${d[0] === 'mudancas' ? `<em>${arqs().length}</em>` : ''}</button>`).join('')}<button class="ib v4-esc" data-act="painel" title="Esconder (Ctrl+B)">${M.ico('painel')}</button></div>`;
    const resumo = `<div class="v4-res"><button class="v4-r1" data-act="v4:pop:ctx">${anel(pct(), 28)}<span><b>${pct()}%</b><small>contexto</small></span></button><button class="v4-r1" data-act="v4:dock:mudancas"><div class="v4-ad v4-big"><em class="v4p">+${somaA()}</em><em class="v4m">−${somaR()}</em></div><span><small>${arqs().length} arquivos</small></span></button></div>`;
    let corpo = '';
    if (v.dock === 'projeto') { const h = pai0(t, todos); corpo = resumo + isolada() + h.slice(h.indexOf('</div>') + 6); }
    if (v.dock === 'mudancas') corpo = `<div class="v4-arqs">${listaArqs()}</div><div class="v4-dz">${diff(v.arq)}</div>${enviarCom()}`;
    if (v.dock === 'terminal') corpo = terminal();
    if (v.dock === 'arquivos') corpo = arquivos();
    return abas + `<div class="v4-dc ${v.dock}">${corpo}</div>`;
  };

  // ---- conversation: top bar (B, C), diff sheet (A), pops and side question above the box ----
  const chat0 = M.chatHTML;
  const popsDe = (t, outro) => (v.pop === 'modo' && !outro ? popModo() : '') + (v.pop === 'ctx' && !outro ? popCtx() : '') + (v.lado && !outro ? lado() : '');
  const barraDe = (t, outro) => {
    const q = t.p, tit = esc((t.titulo && !(q && t.titulo === q.n) && t.titulo) || (q ? 'Conversa em ' + M.nomeProj(q) : 'Chat livre'));
    const barra = `<div class="v4-topo"><span class="v4-tt">${q ? `<i style="background:${M.corDe(q.n)}"></i>` : ''}<span class="v4-tx">${tit}</span></span>${V !== 'C' && v.isolada && q ? `<span class="v4-tag" title="Esta conversa mexe numa cópia isolada da pasta">${ico('copia')}cópia isolada</span>` : ''}<span class="esp"></span>${vista()}<button class="ib v4-ib" data-act="v4:lado" title="Pergunta de lado (Ctrl+;)">${ico('lado')}</button>${V === 'B' ? `<button class="ib v4-ib ${v.split ? 'on' : ''}" data-act="v4:split" title="Duas conversas lado a lado">${ico('split')}</button>` : ''}${outro ? `<button class="ib v4-ib" data-act="v4:fechasplit" title="Fechar este lado">${ico('x')}</button>` : ''}</div>`;
    return barra;
  };
  M.v4 = { barra: barraDe, pops: popsDe, reset: () => { for (const k of Object.keys(v)) delete v[k]; Object.assign(v, JSON.parse(JSON.stringify(V40))); if (R()) R().inicio(v); } };
  const umChat = (t, outro) => {
    let h = chat0(t);
    h = h.replace('<div class="compC-z">', `<div class="compC-z">${popsDe(t, outro)}`);
    h = h.replace('<div class="esq">', `<div class="esq">${barraDe(t, outro)}`);
    if (V === 'A' && v.voo === 'folha' && !outro) h = h.replace('<div class="esq">', `<div class="esq"><div class="v4-folha"><div class="v4-fc">${ico('mud')}<b>Mudanças desta conversa</b><span class="v4-ad"><em class="v4p">+${somaA()}</em><em class="v4m">−${somaR()}</em></span><span class="esp"></span><button class="v4-x" data-act="v4:fechavoo" title="Fechar (Esc)">${ico('x')}</button></div><div class="v4-fb"><div class="v4-arqs col">${listaArqs()}</div><div class="v4-dz">${diff(v.arq)}${enviarCom()}</div></div></div>`);
    return h;
  };
  M.chatHTML = (t) => {
    const outro = (V === 'C' || v.split) && S.abas.find(a => a !== t);
    if (!outro) return umChat(t);
    const p0 = S.painel; S.painel = false; const h = `<div class="v4-split">${umChat(t)}<div class="v4-div"></div>${umChat(outro, true)}</div>`; S.painel = p0;
    return h + (V === 'C' ? faixa(t) : '');
  };
  // C: icon strip on the right edge; each icon opens a flyout over the conversations
  const FAIXA = [['projeto', 'Projeto', 'proj'], ['mudancas', 'Mudanças', 'mud'], ['agendadas', 'Agendadas', 'rel'], ['terminal', 'Terminal', 'term']];
  function faixa(t) {
    const f = `<div class="v4-faixa">${FAIXA.map(x => `<button class="${v.voo === x[0] ? 'on' : ''}" data-act="v4:voo:${x[0]}" title="${x[1]}">${ico(x[2])}${x[0] === 'mudancas' ? `<em>${arqs().length}</em>` : ''}</button>`).join('')}<span class="esp"></span><button data-act="v4:pop:ctx" title="Contexto ${pct()}%">${anel(pct(), 20)}</button></div>`;
    if (!v.voo || v.voo === 'folha') return f;
    const tt = FAIXA.find(x => x[0] === v.voo), w = v.voo === 'mudancas' ? 'larga' : '';
    let c = '';
    if (v.voo === 'projeto') { const h = pai0(t, S.abas.map(a => a.p).filter(Boolean)); c = isolada() + h.slice(h.indexOf('</div>') + 6); }
    if (v.voo === 'mudancas') c = `<div class="v4-arqs">${listaArqs()}</div><div class="v4-dz">${diff(v.arq)}</div>${enviarCom()}`;
    if (v.voo === 'agendadas') c = agendadas();
    if (v.voo === 'terminal') c = terminal();
    return f + `<div class="v4-voo ${w}"><div class="v4-fc">${ico(tt[2])}<b>${tt[1]}</b><span class="esp"></span><button class="v4-x" data-act="v4:fechavoo" title="Fechar (Esc)">${ico('x')}</button></div><div class="v4-vc">${c}</div></div>`;
  }

  // ---- actions ----
  const ag = M.agir;
  M.agir = (a) => {
    if (!a.startsWith('v4:')) { if (v.pop && a !== 'painel') v.pop = ''; return ag(a); }
    const [, k, x, y] = a.split(':');
    if (k === 'pop') v.pop = v.pop === x ? '' : x;
    else if (k === 'modo') { if (R()) R().setModo(T(), x); else v.modo = x; v.pop = ''; }
    else if (k === 'vista') { v.vista = x; const t = M.aba(); if (t) t.verPassos = x === 'detalhado'; }
    else if (k === 'lado') { v.lado = !v.lado; v.ladoResp = false; if (R()) { if (v.lado) { v.ladoQ = ''; setTimeout(() => { const i = document.querySelector('.v4-lado-in input'); if (i) i.focus(); }, 0); } }
      else if (v.lado) setTimeout(() => { v.ladoResp = true; M.draw(); }, 900); }
    else if (k === 'pergunta') { const i = document.querySelector('.v4-lado-in input'), q = i ? i.value.trim() : ''; if (!q || !R()) return; v.ladoQ = q; v.ladoResp = false; const t = T();
      R().lado(t, q).then(r => { if (v.ladoQ !== q) return; v.ladoR = r; v.ladoResp = true; M.draw(); }); }
    else if (k === 'abre') { if (R()) R().abrir(T(), a.slice('v4:abre:'.length)); return; }
    else if (k === 'dock') { if (R() && R().dock(T(), x) === false) return; v.dock = x; S.painel = true; }
    else if (k === 'arq') v.arq = +x;
    else if (k === 'folha') { v.voo = 'folha'; v.arq = +x; }
    else if (k === 'voo') v.voo = v.voo === x ? '' : x;
    else if (k === 'fechavoo') v.voo = '';
    else if (k === 'com') v.comAberto = { arq: +x, lin: +y };
    else if (k === 'comcancela') v.comAberto = null;
    else if (k === 'comok') { const ta = document.querySelector('.v4-com.edit textarea'); v.com.push({ ...v.comAberto, txt: ta ? ta.value : '' }); v.comAberto = null; }
    else if (k === 'apagacom') v.com.splice(+x, 1);
    else if (k === 'mandacom') { if (R()) R().mandar(T(), v.com.map(c => { const f = arqs()[c.arq], l = f && f.h[c.lin]; return { f: f ? f.f : '', lin: l ? l[0] + ' ' + l[1] : '', txt: c.txt }; })); else { S.toast = `${v.com.length} comentários mandados ao Claude`; setTimeout(() => { S.toast = ''; M.draw(); }, 1800); } v.com = []; }
    else if (k === 'isolada') { if (R()) { R().isolada(T(), v); } else v.isolada = !v.isolada; }
    else if (k === 'split') v.split = !v.split;
    else if (k === 'fechasplit') v.split = false;
    else if (k === 'resumir') { v.pop = ''; if (R()) R().resumir(T()); else { S.toast = 'Resumindo a conversa…'; setTimeout(() => { S.toast = ''; M.draw(); }, 1500); } }
    else if (k === 'agora' || k === 'agnova') { S.toast = k === 'agora' ? 'Rodando agora…' : 'Nova tarefa agendada (abre a janela)'; setTimeout(() => { S.toast = ''; M.draw(); }, 1500); }
    M.draw();
  };
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && e.shiftKey && k === 'm') { e.preventDefault(); const i = MODOS.findIndex(m => m[0] === modo()[0]); M.agir('v4:modo:' + MODOS[(i + 1) % MODOS.length][0]); }
    else if (e.key === 'Enter' && e.target.closest && e.target.closest('.v4-lado-in')) { e.preventDefault(); e.stopImmediatePropagation(); M.agir('v4:pergunta'); }
    else if (e.ctrlKey && e.shiftKey && k === 'd') { e.preventDefault(); M.agir(V === 'B' ? 'v4:dock:mudancas' : V === 'C' ? 'v4:voo:mudancas' : 'v4:folha:0'); }
    else if (e.ctrlKey && !e.shiftKey && k === 'o') { e.preventDefault(); M.agir('v4:vista:' + (v.vista === 'resumido' ? 'detalhado' : 'resumido')); }
    else if (e.ctrlKey && (e.key === ';' || e.code === 'Slash' || e.code === 'Semicolon')) { e.preventDefault(); M.agir('v4:lado'); }
    else if (e.ctrlKey && e.key === 'Enter' && v.com.length && document.querySelector('.v4-env')) { e.preventDefault(); M.agir('v4:mandacom'); }
    else if (e.key === 'Escape' && (v.pop || v.lado || v.voo || v.comAberto)) { e.stopImmediatePropagation(); v.pop = ''; v.lado = false; v.voo = ''; v.comAberto = null; M.draw(); }
  }, true);

  // ---- scenes (#cena=…): photos without touching ----
  const CN = M.CENAS, seq = (r, f) => (r && r.then ? r.then(f) : f()), dois = () => seq(M.CENAS.abertas(), () => { S.ativa = S.abas[0] && S.abas[0].id; S.sel = 0; S.toast = ''; const b = S.abas[1]; if (b) b.itens = [{ k: 'eu', txt: 'O ícone novo ficou borrado no 125%.' }, { k: 'ia', html: '<p>Gerei o .ico com 16, 24, 32 e 48 px. Antes só tinha 256, e o Windows encolhia.</p>' }]; }), base = () => seq(M.CENAS.chat(), () => { if (V === 'C') return dois(); });
  Object.assign(CN, {
    v4: () => base(), v4modo: () => seq(base(), () => { v.pop = 'modo'; }), v4ctx: () => seq(base(), () => { v.pop = 'ctx'; }),
    v4lado: () => seq(base(), () => { v.lado = true; v.ladoResp = true; }),
    v4diff: () => seq(base(), () => { v.arq = 0; v.comAberto = { arq: 0, lin: 11 }; if (V === 'A') v.voo = 'folha'; if (V === 'B') v.dock = 'mudancas'; if (V === 'C') v.voo = 'mudancas'; }),
    v4term: () => seq(base(), () => { if (V === 'B') v.dock = 'terminal'; if (V === 'C') v.voo = 'terminal'; }),
    v4agenda: () => seq(base(), () => { if (V === 'C') v.voo = 'agendadas'; }),
    v4split: () => seq(dois(), () => { if (V === 'B') v.split = true; }),
    v4trab: () => V === 'C' ? seq(dois(), () => { S.abas[0].estado = 'trabalhando'; S.abas[0].t0 = Date.now() - 12000; v.modo = 'auto'; }) : seq(M.CENAS.trabalhando(), () => { v.modo = 'auto'; }),
  });
})();
