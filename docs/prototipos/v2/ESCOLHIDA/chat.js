// Tab conversation = proposal C "Chat com painel" (docs\prototipos\chat\ESCOLHIDA): same markup as prototype.
// Here: templates, Claude Code messages → conversation items, and HTML of each part. State and DOM live in app.js.
window.CHAT = (() => {
  const MODELOS = [
    { id: 'fable', n: 'Fable 5.1', d: 'o mais capaz, para trabalho longo e difícil' },
    { id: 'opus', n: 'Opus 5.5', d: 'raciocínio complexo · o de sempre' },
    { id: 'sonnet', n: 'Sonnet 5.5', d: 'dia a dia, mais rápido' },
    { id: 'haiku', n: 'Haiku 5.5', d: 'rápido, para coisa simples' },
  ];
  const ESF = [['low', 'Baixo', 'responde rápido e pensa pouco'], ['medium', 'Médio', 'equilíbrio · o padrão do Opus 5.5'], ['high', 'Alto', 'pensa mais antes de agir'],
    ['xhigh', 'Muito alto', 'para problema difícil · mais lento'], ['max', 'Máximo', 'pensa o quanto precisar · gasta mais do limite']];
  const ROT = { testar: 'você testa', decidir: 'você decide', livre: 'livre', parado: 'parado' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ehLocal = (m) => !MODELOS.some(x => x.id === m);
  const nomeMod = (m) => (MODELOS.find(x => x.id === m) || { n: m }).n;
  const fmtN = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : n >= 1e4 ? Math.round(n / 1e3) + ' mil' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',') + ' mil' : String(Math.round(n));
  const modoN = (a) => ['Rápido', 'Normal', 'Pensar'][+a.pensar || 0];
  const nomeEsf = (v) => (ESF.find(e => e[0] === v) || ESF[1])[1];

  const I = {
    relogio: '<path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 4.8V8l2.2 1.6"/>',
    lampada: '<path d="M6 12.5h4M6.5 14h3M8 2a4 4 0 0 0-2.3 7.3c.5.4.8.9.8 1.5V11h3v-.2c0-.6.3-1.1.8-1.5A4 4 0 0 0 8 2z"/>', seta: '<path d="M6 3.5 10.5 8 6 12.5"/>',
    doc: '<path d="M4 2h5l3 3v9H4zM9 2v3h3"/>', term: '<path d="M2.5 3h11v10h-11zM5 6.5 7 8.5 5 10.5M8.5 10.5h3"/>', lapis: '<path d="M10.5 3 13 5.5 6 12.5H3.5V10z"/>',
    busca: '<path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM10.6 10.6 14 14"/>', nuvem: '<path d="M4.5 12h7a2.5 2.5 0 0 0 .3-5A3.5 3.5 0 0 0 5 6.2 3 3 0 0 0 4.5 12z"/>',
    ok: '<path d="M3 8.5l3 3 7-7"/>', x: '<path d="M4 4l8 8M12 4l-8 8"/>', parar: '<path d="M5 5h6v6H5z" fill="currentColor"/>', escudo: '<path d="M8 2 13 4v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z"/>',
    cima: '<path d="M8 13V3M3.5 7.5 8 3l4.5 4.5"/>', clipe: '<path d="M10.5 5 6 9.5a1.4 1.4 0 0 0 2 2L13 6.5a2.8 2.8 0 0 0-4-4L4 7.5a4.2 4.2 0 0 0 6 6l3-3"/>',
    painel: '<path d="M2.5 3h11v10h-11zM10 3v10"/>', baixo: '<path d="M4 6l4 4 4-4"/>', play: '<path d="M5 3.5v9l7-4.5z"/>', pasta: '<path d="M2 4.5h4l1.2 1.5H14v6.5H2z"/>',
    cpu: '<path d="M4.5 4.5h7v7h-7zM6.5 2v2.5M9.5 2v2.5M6.5 11.5V14M9.5 11.5V14M2 6.5h2.5M2 9.5h2.5M11.5 6.5H14M11.5 9.5H14"/>', chat: '<path d="M2.5 3h11v8h-7l-3 2.5V11h-1z"/>',
  };
  const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
  const claude = () => '<span class="claude-ast">✻</span>';
  // 30/10 (user request): dropped file shows as a card, like the Claude app, not as @path text. The AI still gets
  // "@path" at the message start (Claude Code reads it); the screen splits those back into cards (resumed chats too).
  function separaAnexos(txt) {
    const A = []; let r = String(txt == null ? '' : txt);
    for (;;) { const m = r.match(/^\s*@(?:"([^"]+)"|(\S+))[ \t]*\n?/); if (!m) break; const c = m[1] || m[2]; if (!/^[a-z]:[\\/]/i.test(c)) break; A.push({ c }); r = r.slice(m[0].length); }
    return { A, txt: A.length ? r.replace(/^\s+/, '') : String(txt == null ? '' : txt) };
  }
  const refsAnexos = (A) => (A || []).map(a => /\s/.test(a.c) ? `@"${a.c}"` : '@' + a.c).join(' ') + ((A || []).length ? '\n' : '');
  const urlArq = (c) => 'file:///' + String(c).replace(/\\/g, '/').split('/').map((x, i) => i ? encodeURIComponent(x) : x).join('/');
  const kb = (n) => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
  function anexoHTML(a, i) {
    const nome = String(a.c).split(/[\\/]/).pop(), ext = ((nome.match(/\.(\w{1,5})$/) || [])[1] || '').toUpperCase(), img = /^(PNG|JPE?G|GIF|WEBP|SVG)$/.test(ext);
    const tipo = img ? 'Imagem' : ext === 'PDF' ? 'PDF' : /^(TXT|MD|LOG|CSV)$/.test(ext) ? 'Texto' : ext ? 'Código' : 'Arquivo';
    return `<span class="anx${img ? ' img' : ''}" title="${esc(a.c)}">${img ? `<img src="${esc(a.src || urlArq(a.c))}" alt="">` : `<i>${esc(ext || '•••')}</i>`}<span class="anx-t"><b>${esc(nome)}</b><em>${tipo}${a.tam != null ? ' · ' + kb(a.tam) : ''}</em></span>${i != null ? `<button class="anx-x" data-act="anx-x:${i}" title="Tirar o anexo">${ico('x')}</button>` : ''}</span>`;
  }
  const anexosHTML = (A, rem) => (A || []).map((a, i) => anexoHTML(a, rem ? i : null)).join('');

  // ---- reply markdown (raw HTML becomes text) ----
  if (window.marked) marked.use({ gfm: true, breaks: true, renderer: { html: (t) => esc(t.text || t.raw || '') } });
  const md = (s) => window.marked ? marked.parse(String(s || '')) : `<p>${esc(s)}</p>`;

  // ---- tool → conversation line ("Leu docs\PARADA.md") ----
  function relativo(f, dir) { f = String(f || ''); if (dir && f.toLowerCase().startsWith(dir.toLowerCase() + '\\')) return f.slice(dir.length + 1); return f; }
  function ferramenta(nome, inp, dir) {
    inp = inp || {};
    const v = (verbo, alvo, ic) => ({ verbo, alvo: String(alvo || '').slice(0, 160), ico: ic });
    switch (nome) {
      case 'Read': return v('Leu', relativo(inp.file_path, dir), 'doc');
      case 'Write': return v('Criou', relativo(inp.file_path, dir), 'lapis');
      case 'Edit': case 'MultiEdit': case 'NotebookEdit': return v('Editou', relativo(inp.file_path || inp.notebook_path, dir), 'lapis');
      case 'Bash': case 'PowerShell': return v('Rodou', inp.description || 'um comando', 'term');
      case 'Grep': return v('Buscou', inp.pattern, 'busca');
      case 'Glob': return v('Procurou', inp.pattern, 'busca');
      case 'WebFetch': return v('Abriu', (String(inp.url || '').match(/^https?:\/\/([^/]+)/) || [])[1] || inp.url, 'nuvem');
      case 'WebSearch': return v('Pesquisou', inp.query, 'busca');
      case 'Task': case 'Agent': return v('Chamou um agente', inp.description, 'chat');
      case 'Skill': return v('Usou a skill', inp.skill || inp.command, 'doc');
      case 'TodoWrite': return v('Anotou', 'a lista de tarefas', 'doc');
      default: { const m = nome.match(/^mcp__(.+?)__(.+)$/); return m ? v('Usou', `${m[2]} (${m[1]})`, 'doc') : v('Usou', nome, 'doc'); }
    }
  }
  function resumoResultado(nome, r) {
    if (r.erro) return 'falhou';
    if (nome === 'Read') return `${r.linhas} ${r.linhas === 1 ? 'linha' : 'linhas'}`;
    if (nome === 'Grep' || nome === 'Glob') { const n = r.txt && !/^No (files|matches)/i.test(r.txt) ? r.linhas : 0; return n ? `${n} ${n === 1 ? 'resultado' : 'resultados'}` : 'nada'; }
    if (nome === 'Write' || nome === 'Edit' || nome === 'MultiEdit') return 'salvo';
    return 'ok';
  }

  // ---- Claude Code message (already trimmed by main.js) → conversation items ----
  // itens: eu · pensou{seg,txt} · ferr{id,nome,verbo,alvo,res,ico} · ia{md} · troca · perm{req,tool,input,resp} · interrompido · erro
  function aplicar(t, m, aoVivo = true) {
    const I = t.itens;
    // conversation point before each user message: editing a message reopens conversation from there (main.js: resumeSessionAt)
    const antes = t.ultUuid; if ((m.type === 'assistant' || m.type === 'user') && m.uuid) t.ultUuid = m.uuid;
    if (m.type === 'stream_event') {
      const e = m.event;
      if (e.uso) { const R = t.rTok || (t.rTok = {}); const id = e.msg || t.rUlt; if (id) { t.rUlt = id; const v = R[id] || { ent: 0, sai: 0 }; if (e.uso.ent) v.ent = e.uso.ent; if (e.uso.sai) v.sai = e.uso.sai; R[id] = v; } }   // tokens of this reply, live (23/10)
      if (e.type === 'message_start') { t.vivo = { id: e.msg, blocos: {} }; t.streamados.add(e.msg); }
      else if (e.type === 'content_block_start' && t.vivo) {
        if (e.bloco === 'text') { const it = { k: 'ia', md: '' }; I.push(it); t.vivo.blocos[e.index] = it; }
        else if (e.bloco === 'thinking') { const it = { k: 'pensou', txt: '', t0: Date.now(), seg: 0 }; I.push(it); t.vivo.blocos[e.index] = it; }
      } else if (e.type === 'content_block_delta' && t.vivo) {
        const it = t.vivo.blocos[e.index]; if (!it) return;
        if (e.delta.type === 'text_delta') { it.md += e.delta.text || ''; it.html = null; }
        else if (e.delta.type === 'thinking_delta') it.txt += e.delta.thinking || '';
      } else if (e.type === 'content_block_stop' && t.vivo) {
        const it = t.vivo.blocos[e.index]; if (it && it.k === 'pensou') it.seg = Math.max(1, Math.round((Date.now() - it.t0) / 1000));
        if (it && it.k === 'ia' && !it.md.trim()) I.splice(I.indexOf(it), 1);
      }
      return;
    }
    if (m.type === 'assistant') {
      const jaVeio = t.streamados.has(m.id);
      for (const b of m.content) {
        if (b.type === 'tool_use') {
          if (b.name === 'AskUserQuestion' || b.name === 'ExitPlanMode') continue;   // become card (permission)
          I.push({ k: 'ferr', id: b.id, nome: b.name, ...ferramenta(b.name, b.input, t.dir), res: '', outra: /orq\.py/.test((b.input && b.input.command) || '') });   // outra = worker on the other account
        } else if (!jaVeio && b.type === 'text' && b.text.trim() && !/^\W*(PENDENTE|PRONTO)\W*$/.test(b.text)) I.push({ k: 'ia', md: b.text });
        else if (!jaVeio && b.type === 'thinking' && aoVivo === false && b.thinking) I.push({ k: 'pensou', txt: b.thinking, seg: 0 });
      }
      return;
    }
    if (m.type === 'user') {
      for (const r of m.resultados || []) { const it = I.find(x => x.k === 'ferr' && x.id === r.id); if (it) it.res = resumoResultado(it.nome, r); }
      const tx = (m.texto || '').trim();
      if (!tx || (m.resultados && m.resultados.length)) return;
      const loc = tx.match(/^<local-command-stdout>([\s\S]*?)<\/local-command-stdout>$/);
      if (loc) { const s = loc[1].trim(); if (s && !/^Set (model|effort)/i.test(s)) I.push({ k: 'troca', txt: s.replace(/`/g, '').slice(0, 200) }); return; }
      if (m.meta || tx.startsWith('<') || /^Caveat:/.test(tx) || /^\[FCC\]/.test(tx)) return;
      const fala = tx.replace(/^\[New conversation:[^\]]*\]\s*/, '');   // handoff texts are for Claude, not history
      if (!fala || /^Continue the task now\b/.test(fala)) return;
      if (!aoVivo) I.push({ k: 'eu', txt: fala, antes });            // in history; live, bubble already entered when user sent
      return;
    }
    if (m.type === 'system' && m.subtype === 'orq_vivo') { t.orq = m.lista; return; }   // orq.py workers: live status from main.js (ajudantes.js)
    // background helpers: t.tarefas = every task seen (start time, progress); t.bg = ids still running (level signal, replace)
    if (m.type === 'system' && /^(background_tasks_changed|task_started|task_progress)$/.test(m.subtype)) {
      const T = t.tarefas || (t.tarefas = {}), de = (id) => T[id] || (T[id] = { t0: Date.now(), n: 0 });
      if (m.subtype === 'background_tasks_changed') { t.bg = m.tarefas.map(x => { Object.assign(de(x.id), { desc: x.desc, tipo: x.tipo }); return x.id; }); return; }
      const v = de(m.id); for (const k of ['ferrId', 'desc', 'tipo', 'ult', 'resumo']) if (m[k]) v[k] = m[k]; if (m.n) v.n = m.n; v.tUlt = Date.now();
      return;
    }
    if (m.type === 'system' && m.subtype === 'compact_boundary') I.push({ k: 'troca', txt: 'Conversa resumida para liberar memória' });
    if (m.type === 'result' && m.erro && m.subtype !== 'error_during_execution') I.push({ k: 'erro', txt: m.texto || 'O Claude parou com erro.' });
    if (m.type === 'limite' && m.status === 'rejected') { const d = new Date((m.volta || 0) * 1000); I.push({ k: 'erro', txt: `Limite de uso atingido. Volta às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}.` }); }
  }

  // ---- HTML: conversation (.col) ----
  const tempo = (s) => s < 60 ? s + ' s' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' min';   // up to 59 s; then 1:05 min
  const giroG = ['·', '✢', '✳', '✶', '✻', '✽'];
  const giro = (parado) => parado ? '✻' : giroG[Math.floor(Date.now() / 160) % giroG.length];
  function permTitulo(p) {
    if (p.tool === 'Bash' || p.tool === 'PowerShell') return ['O Claude quer rodar um comando', p.input.description || p.input.command, p.tool];
    if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(p.tool)) return ['O Claude quer mudar um arquivo', relativo(p.input.file_path || p.input.notebook_path, p.dir), p.tool === 'Write' ? 'criar' : 'editar'];
    if (p.tool === 'WebFetch') return ['O Claude quer abrir uma página', p.input.url, 'internet'];
    if (p.tool === 'WebSearch') return ['O Claude quer pesquisar na internet', p.input.query, 'pesquisa'];
    const f = ferramenta(p.tool, p.input, p.dir); return [`O Claude quer usar ${p.tool.replace(/^mcp__(.+?)__/, '')}`, f.alvo, p.tool.startsWith('mcp__') ? 'conector' : 'ferramenta'];
  }
  function permHTML(p, i) {
    if (p.resp) {
      const r = { ok: ['ok', 'Permitido'], sempre: ['ok', 'Permitido sempre nesta pasta'], negado: ['x', 'Negado'], respondido: ['ok', 'Respondido'], aprovado: ['ok', 'Plano aprovado'], cancelado: ['x', 'Cancelado'] }[p.resp];
      return `<div class="c-feito">${ico(r[0])}${r[1]}: ${esc(p.resumo || '')}</div>`;
    }
    if (p.tool === 'AskUserQuestion') {
      let h = `<div class="c-perm">`;
      (p.input.questions || []).forEach((q, qi) => {
        const sel = (p.escolhas || {})[qi] || [];
        h += `<div class="tt">${ico('chat')}${esc(q.question)}</div><div class="bs perg">`;
        (q.options || []).forEach((o, oi) => { h += `<button class="c-btn ${sel.includes(oi) ? 'prim' : ''}" data-act="resp:${i}-${qi}-${oi}" title="${esc(o.description || '')}">${esc(o.label)} <kbd>${qi === 0 && oi < 9 ? oi + 1 : ''}</kbd></button>`; });
        h += `</div>`;
      });
      const multi = (p.input.questions || []).some(q => q.multiSelect) || (p.input.questions || []).length > 1;
      h += multi ? `<div class="bs"><button class="c-btn prim" data-act="permresp:${i}">Responder <kbd>Enter</kbd></button><button class="c-btn" data-act="perm:negado">Pular <kbd>Esc</kbd></button></div>` : `<div class="bs"><button class="c-btn" data-act="perm:negado">Pular <kbd>Esc</kbd></button></div>`;
      return h + '</div>';
    }
    if (p.tool === 'ExitPlanMode') return `<div class="c-perm"><div class="tt">${ico('escudo')}O Claude preparou um plano</div><div class="oq plano c-ia">${md(p.input.plan || '')}</div><div class="bs"><button class="c-btn prim" data-act="perm:aprovado">Aprovar <kbd>1</kbd></button><button class="c-btn" data-act="perm:negado">Pedir mudanças <kbd>Esc</kbd></button></div></div>`;
    const [tt, oq, tipo] = permTitulo(p);
    return `<div class="c-perm"><div class="tt">${ico('escudo')}${esc(tt)}</div><div class="oq">${esc(oq)}<span>${esc(tipo)}</span></div>
            <div class="bs"><button class="c-btn prim" data-act="perm:ok">Permitir <kbd>1</kbd></button><button class="c-btn" data-act="perm:sempre">Sempre nesta pasta <kbd>2</kbd></button><button class="c-btn" data-act="perm:negado">Negar <kbd>Esc</kbd></button></div></div>`;
  }
  // "Pensando…" line kept apart (spins 6x/s without redrawing conversation, which would lose text selection)
  // what it's doing now (last tool without result yet; writing; else thinking)
  const GER = { Leu: 'Lendo', Criou: 'Criando', Editou: 'Editando', Rodou: 'Rodando', Buscou: 'Buscando', Procurou: 'Procurando', Abriu: 'Abrindo', Pesquisou: 'Pesquisando',
    'Chamou um agente': 'Chamando um agente', 'Usou a skill': 'Usando a skill', Anotou: 'Anotando', Usou: 'Usando' };
  function atividade(t) {
    const l = t.itens[t.itens.length - 1];
    if (l && l.k === 'ferr' && !l.res) {
      if (l.outra) { const w = orqAgora(t); return w ? `${w.outra ? 'Na outra conta' : 'Ajudante'}: ${orqTexto(t)}` : `Rodando na outra conta: ${l.alvo}`.trim(); }
      const tf = (l.nome === 'Agent' || l.nome === 'Task') && Object.values(t.tarefas || {}).find(x => x.ferrId === l.id);
      return `${GER[l.verbo] || l.verbo} ${l.alvo}`.trim() + (tf && tf.n ? ` (${progresso(tf)})` : '');
    }
    if (l && l.k === 'ia' && t.vivo && Object.values(t.vivo.blocos).includes(l)) return 'Escrevendo a resposta';
    return 'Pensando';
  }
  // orq.py workers: the one that moved last speaks; "Lendo main.js · 5 ações"
  const orqAgora = (t) => (t.orq || []).reduce((a, w) => !a || w.t > a.t ? w : a, null);
  const orqTexto = (t) => { const L = t.orq, n = L.reduce((s, w) => s + w.n, 0); return `${orqAgora(t).ult || 'Começando'}${n ? ` · ${n} ${n === 1 ? 'ação' : 'ações'}` : ''}${L.length > 1 ? ` · ${L.length} ajudantes` : ''}`; };
  // silence is said out loud: a helper with no news for 2 min doesn't look like it's advancing
  const semNovidade = (ms) => { const m = Math.floor((Date.now() - ms) / 60000); return ms && m >= 2 ? ` · sem novidade há ${m} min` : ''; };
  // helper progress: "5 ações, agora lendo" (last tool in pt-BR gerund) or its own one-line summary
  function progresso(x) { const u = x.ult && ferramenta(x.ult, {}).verbo; return x.resumo || `${x.n} ${x.n === 1 ? 'ação' : 'ações'}${u ? ', agora ' + (GER[u] || u).toLowerCase() : ''}`; }
  // turn ended but helper still runs in background: Claude comes back by itself when it ends (30/10 user report: "para e volta sozinho")
  const emFundo = (t) => t.estado !== 'trabalhando' && t.estado !== 'abrindo' && t.estado !== 'encerrada' && (t.bg || []).length > 0;
  function fundoInfo(t) {
    const L = t.bg.map(id => ({ id, ...(t.tarefas || {})[id] })), fe = (x) => x.ferrId && t.itens.find(i => i.k === 'ferr' && i.id === x.ferrId);
    const w = orqAgora(t), nome = (x) => w ? (w.outra ? 'Trabalhando na outra conta' : 'Ajudante trabalhando') : fe(x) && fe(x).outra ? 'Trabalhando na outra conta' : x.tipo === 'local_agent' ? 'Ajudante trabalhando' : 'Rodando em segundo plano';
    const t0 = Math.min(...L.map(x => x.t0 || Date.now())), x = L[0];
    const novo = L.reduce((a, y) => (y.tUlt || 0) > ((a && a.tUlt) || 0) ? y : a, null);   // with several, the one that moved last speaks
    return { tit: L.length > 1 ? `${L.length} ajudantes trabalhando` : `${nome(x)}: ${x.desc || ''}`.replace(/: $/, ''), t0, n: L.reduce((s, y) => s + (y.n || 0), 0), prog: w ? orqTexto(t) : novo && (novo.n || novo.resumo) ? progresso(novo) : '', tUlt: w ? w.t : novo ? novo.tUlt : 0 };
  }
  // 1st line: icon · what it's doing · arrow (shows all steps); 2nd: time · Esc. Icon has fixed width: text doesn't shift.
  // vivo = only what changes by itself (spinning icon and time): UI swaps these texts without redoing arrow button (redo 6x/s lost click)
  const tokResp = (t) => { let n = 0; for (const v of Object.values(t.rTok || {})) n += v.ent + v.sai; return n; };
  const rodapeVivo = (t, parado) => emFundo(t) ? (f => ({ g: giro(parado), s: `${tempo(Math.max(1, Math.round((Date.now() - f.t0) / 1000)))}${f.prog ? ' · ' + f.prog : f.n ? ` · ${f.n} ações` : ''}${semNovidade(f.tUlt)} · o Claude continua quando terminar` }))(fundoInfo(t)) : ({ g: giro(parado), s: `${tempo(t.seg != null ? t.seg : Math.max(1, Math.round((Date.now() - t.t0) / 1000)))} pensando${tokResp(t) ? ` · ${fmtN(tokResp(t))} tokens` : ''}${ehLocal(t.modelo) && t.tpsVivo ? ` · ${t.tpsVivo} tokens/s` : ''} · Esc interrompe` });
  // queued messages (sent while it answers): below the reply, go when it ends; ✕ puts it back in the box
  const filaHTML = (t) => (t.fila || []).map((x, i) => `<div class="c-eu c-nafila">${esc(x)}<span class="c-fila-t">Na fila: vai quando ele terminar</span><button class="c-ed" data-act="desfila:${i}" title="Tirar da fila (volta para a caixa)">${ico('x')}</button></div>`).join('');
  function rodapeHTML(t, parado) { const f = filaHTML(t); return rodapeSo(t, parado) + (f ? `<div class="c-filas">${f}</div>` : ''); }
  function rodapeSo(t, parado) {
    const v = rodapeVivo(t, parado);
    if (t.estado === 'trabalhando') return `<div class="c-trab"><span class="claude-ast">${v.g}</span><div class="c-trab-t"><button class="c-ativ ${t.verPassos ? 'ab' : ''}" data-act="passos" title="${t.verPassos ? 'Esconder' : 'Mostrar'} tudo o que ele está fazendo"><span class="c-ativ-t">${esc(atividade(t))}</span>${ico('seta', 'seta')}</button>
      <div class="c-trab-s">${v.s}</div></div></div>`;
    if (emFundo(t)) return `<div class="c-trab"><span class="claude-ast">${v.g}</span><div class="c-trab-t"><div class="c-ativ"><span class="c-ativ-t">${esc(fundoInfo(t).tit)}</span></div><div class="c-trab-s">${v.s}</div></div></div>`;
    if (t.estado === 'abrindo' && t.itens.length) return `<div class="c-trab">${claude()}Abrindo o Claude Code…</div>`;
    return '';
  }
  // conversation goes in blocks (one per message or step group): UI swaps only changed block
  // (redoing whole conversation per reply chunk cost ~0.3 s on long conversation and froze everything)
  function itensBlocos(t, passos) {
    let h = '', grupo = []; const B = [];
    // editing a message: it and what follows are dimmed (what vanishes on resend)
    const ei = t.editando ? (t.editando.i != null ? t.editando.i : t.editando) : -1; let bi = -1;
    const corta = () => { if (h) { B.push(ei >= 0 && bi >= ei ? `<div class="c-sai">${h}</div>` : h); h = ''; } };
    const fechar = () => {
      if (!grupo.length) return; const [i0, a] = grupo[0]; bi = i0; const ab = t.abertos[i0] || t.abertos.todos;
      const vs = [...new Set(grupo.map(g => g[1].verbo))], vb = (vs.length > 1 ? vs.slice(0, -1).join(', ') + ' e ' + vs[vs.length - 1] : vs[0]).toLowerCase();
      h += `<button class="c-lin ${ab ? 'ab' : ''}" data-act="abre:${i0}">${ico(a.ico || 'doc')}${vb[0].toUpperCase() + vb.slice(1)} ${grupo.length} ${grupo.length > 1 ? 'itens' : 'item'}${ico('seta', 'seta')}</button>`;
      if (ab) h += `<div class="c-det">${grupo.map(g => `<div><span>${esc(g[1].alvo)}</span><span class="r">${esc(g[1].res)}</span></div>`).join('')}</div>`;
      grupo = []; corta();
    };
    t.itens.forEach((l, i) => {
      corta(); if (l.k !== 'ferr') fechar(); bi = i;
      if (!passos && (l.k === 'pensou' || l.k === 'ferr')) return;      // hidden steps (option, default): only what it writes stays
      if (l.k === 'eu') { const s = separaAnexos(l.txt); h += `<div class="c-eu${s.txt ? '' : ' so-anx'}">${s.A.length ? `<div class="c-anxs">${anexosHTML(s.A)}</div>` : ''}${esc(s.txt)}<button class="c-ed" data-act="editar:${i}" title="Editar e reenviar (a conversa volta a este ponto)">${ico('lapis')}</button></div>`; }
      else if (l.k === 'troca' || l.k === 'dim') h += `<div class="c-troca">${esc(l.txt)}</div>`;
      else if (l.k === 'pensou') {
        if (!l.seg && t.estado === 'trabalhando' && t.vivo && Object.values(t.vivo.blocos).includes(l)) return;   // still thinking: "Pensando…" line already shows
        const ab = (t.abertos[i] || t.abertos.todos) && l.txt;
        h += `<button class="c-lin ${ab ? 'ab' : ''}" data-act="abre:${i}">${ico('lampada')}Pensou${l.seg ? ` por ${tempo(l.seg)}` : ''}${l.txt ? ico('seta', 'seta') : ''}</button>${ab ? `<div class="c-det">${esc(l.txt)}</div>` : ''}`;
      }
      else if (l.k === 'ferr') grupo.push([i, l]);
      else if (l.k === 'ia') { if (!l.html) l.html = md(l.md); h += `<div class="c-ia">${l.html}</div>`; }
      else if (l.k === 'interrompido') h += `<div class="c-feito">${ico('parar')}Interrompido por você</div>`;
      else if (l.k === 'erro') h += `<div class="c-feito c-erro">${ico('x')}${esc(l.txt)}</div>`;
      else if (l.k === 'perm') h += permHTML(l, i);
    });
    corta(); fechar();
    if (!B.length && t.vazio && t.estado !== 'trabalhando') B.push(`<div class="c-troca">${esc(t.vazio)}</div>`);
    return B;
  }
  const itensHTML = (t, passos) => itensBlocos(t, passos).join('');
  const abrindoHTML = () => `<div class="c-abrindo"><div class="c-trab">${claude()}Abrindo o Claude Code…</div></div>`;

  // ---- "Modelo e pensamento" mini window ----
  function popHTML(a, noChat, locais, popM) {
    const ei = Math.max(0, ESF.findIndex(e => e[0] === a.esf)), loc = ehLocal(a.modelo);
    const lista = [...MODELOS, ...locais.map(m => ({ id: m.n, n: m.n, d: 'no seu PC, sem internet · bem mais lento', local: true }))];
    let h = `<div class="pop" data-parar="1"><div class="pop-tit">Modelo</div>`;
    lista.forEach((m, i) => {
      if (m.local && !lista[i - 1].local) h += `<div class="pop-sep"></div><div class="pop-tit">No seu PC · o Claude fica desconectado</div>`;
      const d = m.local && noChat && !loc ? 'abre numa aba nova · bem mais lento' : (!m.local && noChat && loc ? m.d + ' · abre numa aba nova' : m.d);
      h += `<div class="pop-it ${m.local ? 'loc' : ''} ${i === popM ? 'hl' : ''}" data-act="pm:${i}"><span class="pop-n">${m.local ? ico('cpu') : ''}${esc(m.n)}</span><span class="pop-d">${d}</span>${m.id === a.modelo ? ico('ok', 'ok') : ''}</div>`;
    });
    // models screen entry (always, even without local model yet)
    if (!lista.some(m => m.local)) h += `<div class="pop-sep"></div><div class="pop-tit">No seu PC · o Claude fica desconectado</div>`;
    h += `<div class="pop-it pop-mais" data-act="mx:abrir:"><svg class="ico " viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10"/></svg><span class="pop-n">Baixar e gerenciar modelos…</span></div>`;
    if (loc) {        // local AI: think (reasons first, much slower) or fast reply (direct)
      h += `<div class="pop-sep"></div><div class="pop-tit">Modo<span class="pop-v">${modoN(a)}</span></div><div class="seg2">${['Rápido', 'Normal', 'Pensar'].map((n, i) => `<button class="${(+a.pensar || 0) === i ? 'on' : ''}" data-act="pp:${i}">${n}</button>`).join('')}</div>`;
      h += `<div class="pop-d2">${['direto ao ponto · curto', 'resposta completa e organizada', 'raciocina antes · mais elaborada · mais lento'][+a.pensar || 0]}</div>`;
    } else {
      h += `<div class="pop-sep"></div><div class="pop-tit">Pensamento<span class="pop-v">${ESF[ei][1]}</span></div><div class="seg">`;
      ESF.forEach((e, i) => { h += `<button class="${i === ei ? 'on' : ''} ${i <= ei ? 'ate' : ''}" data-act="pe:${i}" title="${e[1]}"><i style="height:${6 + i * 3}px"></i></button>`; });
      h += `</div><div class="pop-d2">${ESF[ei][2]}</div>`;
    }
    h += `<div class="pop-rod"><span>${noChat ? 'Vale para esta conversa' : 'Vale para as próximas abas'}</span><span>↑↓ modelo · ←→ ${loc ? 'modo' : 'pensamento'}</span></div></div>`;
    return { html: h, lista };
  }
  function cmdsHTML(lista, sel) {
    return `<div class="pop cmds">${lista.map((c, i) => `<div class="pop-it ${i === sel ? 'hl' : ''}" data-act="cmd:${esc(c.n)}"><span class="pop-n">/${esc(c.n)}</span><span class="pop-d">${esc(c.d)}</span></div>`).join('')}<div class="pop-rod"><span>Comandos e skills</span><span>↑↓ escolhe · Tab completa</span></div></div>`;
  }
  // ---- limit curtain: Claude conversation stays behind it until limit returns (local AI has no limit) ----
  function cortinaHTML(volta) {
    const ms = window.RELOGIO_TESTE || Date.now(), d = new Date(volta * 1000), agora = new Date(ms), hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const amanha = new Date(agora); amanha.setDate(agora.getDate() + 1);
    const dia = d.toDateString() === agora.toDateString() ? `às ${hm}` : d.toDateString() === amanha.toDateString() ? `amanhã às ${hm}` : `em ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${hm}`;
    const min = Math.max(1, Math.round((volta * 1000 - ms) / 60000)), falta = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') + ' min' : ''}`;
    return `<div class="ct-caixa"><div class="ct-ic">${ico('relogio')}</div><div class="ct-tit">Limite de uso atingido</div><div class="ct-txt">Este projeto só pode ser usado com o Claude quando o limite voltar, <b>${dia}</b> (daqui a ${falta}).</div>
      <button class="c-btn prim" data-act="usarlocal">${ico('cpu')}Usar a IA local</button><div class="ct-dica">A IA local roda no seu PC e não depende do limite: com ela tudo funciona.</div></div>`;
  }  // conversation skeleton (same in app and prototype); o = ready content (prototype) or empty (app fills)
  function esqueletoHTML(o = {}) {
    const ver = (x) => x ? '' : ' style="display: none;"';
    return `<div class="esq"><button class="mostra-painel" data-act="painel" title="Mostrar o painel (Ctrl+B)"${ver(o.semPainel)}>${ico('painel')}</button><div class="rolar"><div class="col"><div class="itens">${o.itens || ''}</div><div class="slot">${o.slot || ''}</div></div></div>
      <div class="compC-z"><div class="compC"${ver(!o.fim)}>${o.pops || ''}<div class="c-anxs">${o.anexos || ''}</div><textarea class="txt" rows="1" spellcheck="false" placeholder="${o.ph || ''}">${o.texto || ''}</textarea><div class="lin">${o.lin || ''}</div></div><div class="compC fim"${ver(o.fim)}>${o.fim || ''}</div></div><div class="termC" style="display: none;"></div><div class="cortina"${ver(o.cortina)}>${o.cortina || ''}</div></div><div class="painelC"${ver(!o.semPainel)}>${o.painel || ''}</div>`;
  }
  // ---- message box row buttons ----
  function linhaHTML(t, popAberto) {
    const loc = ehLocal(t.modelo), ocupado = t.estado === 'trabalhando' || t.estado === 'pede', vazio = !(t.texto || '').trim();
    return `${t.editando ? '<span class="ed-aviso">Editando a mensagem · Enter reenvia · Esc cancela</span>' : ''}<button class="ib" data-act="anexar" title="Anexar arquivo">${ico('clipe')}</button><button class="ib" data-act="barra" title="Comandos e skills (/)" style="font-weight:600">/</button><span class="esp"></span>
      ${(t.tok || 0) + tokResp(t) ? `<button class="tk" data-act="modal:est" title="Tokens desta conversa, ao vivo (abre as Estatísticas)">${fmtN((t.tok || 0) + tokResp(t))} tokens</button>` : ''}${loc && t.tps ? `<span class="tk vel" title="Velocidade da última resposta da IA local (tokens por segundo, contando o pensamento)">${t.tps} tokens/s</span>` : ''}${window.M && M.chipModelo ? M.chipModelo(t) : ''}
      ${ocupado ? `<button class="env parar" data-act="parar" title="Interromper (Esc)">${ico('parar')}</button>` : `<button class="env ${vazio ? 'off' : ''}" data-act="enviar" title="Enviar (Enter)">${ico('cima')}</button>`}`;
  }
  // ---- panel ----
  const PEDIDOS = { proj: ['Continue de onde parou.', 'O que falta eu testar?', 'Refaça o .exe.', 'Onde paramos?'], livre: ['Qual projeto eu testo primeiro?', 'Resuma o que precisa de mim.'] };
  function painelHTML(t, todos) {
    const q = t.p;
    let h = `<div class="cab">${q ? esc(q.n) : 'Chat livre'}<button class="ib" data-act="painel" title="Esconder (Ctrl+B)">${ico('painel')}</button></div>`;
    if (q) {
      h += `<div class="sub"><span class="pil p-${q.st}">${ROT[q.st]}</span>${q.dt ? `PARADA de ${q.dt} (${q.id})` : 'sem PARADA'}</div>`;
      if (q.voce) h += `<h4>Você precisa</h4><div class="txt">${esc(q.voce)}</div>`;
      if (q.itens && q.itens.length) {
        h += `<h4>Para testar<span>${q.itens.length}</span></h4>`;
        q.itens.forEach((x, i) => { const r = (t.rel || {})[i]; h += `<div class="item ${r || ''}"><span class="it-t">${esc(x)}</span><button class="ok" data-act="teste:${i}-ok" title="Funcionou">${ico('ok')}</button><button class="no" data-act="teste:${i}-no" title="Falhou">${ico('x')}</button></div>`; });
        h += `<div class="pc-dica">✓ ou ✗ escreve o relato na caixa de mensagem; você completa e envia.</div>`;
      }
      h += `<h4>Atalhos</h4><div class="ats">${t.temExe !== false ? `<button data-act="atalho:programa">${ico('play')}Programa</button>` : ''}<button data-act="pasta">${ico('pasta')}Pasta</button>${q.parada !== false ? `<button data-act="parada">${ico('doc')}PARADA</button>` : ''}<button data-act="atalho:relatorios">${ico('doc')}Relatórios</button></div>`;
    } else {
      const ps = todos.filter(p => p.st === 'testar' || p.st === 'decidir');
      h += `<div class="sub">briefing de hoje, ${esc(t.briefing || '')}</div><h4>Precisam de você<span>${ps.length}</span></h4>`;
      ps.forEach(p => { h += `<button class="proj" data-act="abrirp:${esc(p.n)}"><i class="i-${p.st}"></i><b>${esc(p.n)}</b><span>${ROT[p.st]}</span></button>`; });
    }
    h += `<h4>Pedidos rápidos</h4><div class="peds">${(q ? PEDIDOS.proj : PEDIDOS.livre).map((x, i) => `<button data-act="pedido:${i}">${esc(x)}</button>`).join('')}</div>`;
    h += `<div class="rod"><button data-act="term">${ico('term')}${t.verTerm ? 'Voltar ao chat' : 'Ver o terminal'}<kbd>Ctrl+\`</kbd></button></div>`;
    return h;
  }
  return { separaAnexos, refsAnexos, anexosHTML, MODELOS, ESF, PEDIDOS, tempo, modoN, ehLocal, nomeMod, nomeEsf, ico, aplicar, itensHTML, itensBlocos, rodapeHTML, rodapeVivo, abrindoHTML, popHTML, cmdsHTML, linhaHTML, cortinaHTML, esqueletoHTML, painelHTML, ferramenta, md };
})();
