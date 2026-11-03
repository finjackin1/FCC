// Local AI "No seu PC" + MODEL STORE: proposal B "Vitrine", CHOSEN (23/10/2026). App UI code (copy via
// abas\ferramentas\copiar-prototipo.ps1). Data in M.D.loja { PC, CAT, INST, FILA, BUSCA, ACHADOS, estado } and M.D.local; actions
// touching PC go to M.lojaAcao(k, arg) (app: tela\app.js; prototype: demo engine at end of this file).
(function () {
  const { S, ico, esc } = M;
  S.L = S.L || { tipo: 'pop', tam: 'todos', caps: '', sel: null, vi: null, busca: '' };
  const D = () => M.D.loja || { PC: {}, CAT: [], INST: {}, FILA: [], BUSCA: [], ACHADOS: [] };
  // ---- accounts ----
  const vram = () => D().PC.vram || 8;
  const cabe = (gb) => !gb ? 'cabe' : gb + 1.2 <= vram() ? 'cabe' : gb <= vram() + (D().PC.ram || 16) * .5 ? 'meio' : 'nao';
  // estimated tok/s: ~memory read per token. MoE (e.g. 30b-a3b) reads only active part; partly in PC RAM, limited by RAM
  const tps = (gb, v) => { const c = cabe(gb), at = v && v.ativo ? gb * v.ativo : gb; return !gb ? 0 : c === 'cabe' ? Math.round(160 / at) : c === 'meio' ? Math.max(2, Math.round(40 / at)) : 0; };
  const CABE = { cabe: 'cabe na placa', meio: 'em parte · lento', nao: 'grande demais' };
  const fmt = (gb) => !gb ? '—' : (gb < 10 ? gb.toFixed(1) : Math.round(gb)).toString().replace('.', ',') + ' GB';
  const inst = (v) => !!(D().INST[v.tag] || D().INST[v.tag + ':latest']);
  const melhorV = (m) => [...m.v].reverse().find(v => cabe(v.gb) === 'cabe') || m.v[0];
  const catDe = (tag) => { for (const m of D().CAT) { const v = m.v.find(x => x.tag === tag || x.tag + ':latest' === tag); if (v) return { m, v }; } return null; };
  const ativos = () => D().FILA.filter(x => x.st === 'ativo' || x.st === 'pausado').length;
  function sugestoes(tipo) {      // "Comece por aqui": tools + fits GPU + trending; what's already on PC drops out
    return D().CAT.filter(m => m.tipo !== 'mais' && (!tipo || m.tipo === tipo)).map(m => { const v = melhorV(m); let s = 0; const por = [];
      if (m.caps.includes('f')) { s += 3; por.push('funciona com o Claude Code'); } if (cabe(v.gb) === 'cabe') { s += 4; por.push(`roda inteiro na sua ${D().PC.placa || 'placa'}`); } else s -= 3;
      if (m.cod) { s += m.cod * 2; por.unshift('bom para programar'); } if (m.hot) { s += 2; por.push('em alta'); } if (inst(v)) s -= 10; return { m, v, s, por: por.slice(0, 2).join(' · ') }; }).sort((a, b) => b.s - a.s).slice(0, 3).filter(x => x.s > 0);
  }
  // ---- pieces ----
  const P = M.lojaPeca = {
    fit: (gb) => { const c = cabe(gb); return `<span class="lj-fit ${c}" title="${c === 'cabe' ? 'Roda inteiro na placa de vídeo: rápido' : c === 'meio' ? 'Parte vai para a memória do PC: funciona, mas lento' : 'Não cabe na placa nem na memória'}"><i></i>${CABE[c]}</span>`; },
    caps: (c) => [...(c || '')].filter(k => k !== 'f').map(k => `<span class="lj-cap">${{ v: 'Imagens', p: 'Pensa' }[k]}</span>`).join(''),
    cc: (caps) => (caps || '').includes('f') ? `<span class="lj-cc" title="Usa ferramentas: o Claude Code consegue ler, editar e rodar coisas com ele">${ico('ok')}Claude Code</span>` : `<span class="lj-cc nao" title="Sem ferramentas: só conversa, não mexe em arquivos">só conversa</span>`,
    qual: (n) => `<span class="lj-qual" title="Qualidade ${n} de 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`,
    tps: (gb, v) => { const t = tps(gb, v); return t ? `~${t} tok/s` : '—'; },
    barra: (pct, st) => `<div class="lj-barra ${st || ''}"><i style="width:${pct}%"></i></div>`,
    disco: () => { const f = D().FILA.filter(x => x.st !== 'ok').reduce((a, x) => a + (x.gb || 0) * (1 - x.pct / 100), 0); return `<span class="lj-disco">${ico('pasta')}${fmt(D().PC.disco)} livres${f ? ` · ${fmt(f)} a baixar` : ''}</span>`; },
    dl: (x) => `<div class="lj-dl ${x.st}"><div class="lj-dl-n"><b>${esc(x.n)}</b><small>${x.st === 'ativo' ? `${x.pct}%${x.gb ? ' de ' + fmt(x.gb) : ''}${x.vel ? ' · ' + x.vel : ''}${x.falta ? ' · faltam ' + x.falta : ''}` : x.st === 'pausado' ? `pausado em ${x.pct}% · continua de onde parou` : x.st === 'falhou' ? `parou em ${x.pct}%: ${esc(x.erro || 'erro')}` : `pronto${x.gb ? ' · ' + fmt(x.gb) : ''}`}</small>${x.st !== 'ok' ? P.barra(x.pct, x.st) : ''}</div>
      ${x.st === 'ativo' ? `<button class="ib" data-act="Lpausa:${esc(x.n)}" title="Pausar">${ico('parar')}</button>` : x.st === 'pausado' ? `<button class="ib" data-act="Lpausa:${esc(x.n)}" title="Continuar">${ico('play')}</button>` : x.st === 'falhou' ? `<button class="c-btn" data-act="Lpausa:${esc(x.n)}">${ico('volta')}Tentar de novo</button>` : `<button class="c-btn" data-act="usarmod:${esc(x.n)}">Usar</button>`}
      <button class="ib" data-act="Lcancela:${esc(x.n)}" title="${x.st === 'ok' ? 'Tirar da lista' : 'Cancelar'}">${ico('x')}</button></div>`,
    vazio: (t, d, b) => `<div class="lj-vazio">${ico('cpu')}<b>${t}</b><small>${d}</small>${b || ''}</div>`,
    carregando: () => `<div class="lj-carr">${[1, 2, 3, 4, 5, 6].map(() => '<div class="lj-sk"><i></i><i></i><i></i></div>').join('')}</div>`,
    erroOllama: () => `<div class="lj-aviso">${ico('escudo')}<div><b>O Ollama não respondeu</b><small>A loja precisa dele para baixar. Ele liga sozinho em alguns segundos.</small></div><button class="c-btn prim" data-act="ollama:ligar">Ligar agora</button></div>`,
  };
  const nota = (m) => (m.cod || 0) * 2 + (cabe(melhorV(m).gb) === 'cabe' ? 4 : cabe(melhorV(m).gb) === 'meio' ? 1 : -3);   // suggested for coding on this PC come first
  const lista = () => D().CAT.filter(m => (!S.L.tipo || m.tipo === S.L.tipo) && (!S.L.busca || (m.nome + ' ' + m.desc + ' ' + m.id).toLowerCase().includes(S.L.busca.toLowerCase()))
    && [...S.L.caps].every(k => m.caps.includes(k)) && (S.L.tam === 'todos' || m.v.some(v => S.L.tam === 'cabe' ? cabe(v.gb) === 'cabe' : S.L.tam === 'leve' ? v.gb && v.gb <= 4 : v.gb > 4 && v.gb <= 10))).sort((a, b) => nota(b) - nota(a));
  // ---- No seu PC ----
  M.lojaLocal = () => {
    const L = M.D.local || {}, I = Object.entries(D().INST), mod = L.modelo && D().INST[L.modelo] ? L.modelo : I.length ? I[0][0] : null, x = mod ? D().INST[mod] : null, cd = mod && catDe(mod);
    const pensa = !cd || cd.m.caps.includes('p'), vel = x && (x.tps ? x.tps : L.tps ? parseInt(L.tps) : null);
    const heroi = !mod ? `<div class="lb-heroi"><span class="lb-ic">${ico('cpu')}</span><div><b>Nenhum modelo no seu PC</b><small>A loja já separou os que cabem na sua ${esc(D().PC.placa || 'placa')}.</small></div><button class="c-btn prim" data-act="Lloja:0">${ico('cpu')}Abrir a loja</button></div>`
      : `<div class="lb-heroi on ${S.ia === 'local' ? 'ativa' : 'liga'}"${S.ia === 'local' ? '' : ' data-act="ia:local" data-dica="USAR A IA LOCAL|Clique: a conversa aberta passa para a IA no seu PC|As outras abas continuam na IA delas"'}><span class="lb-ic">${ico('cpu')}</span><div><small class="lb-rot"><span class="j-luz ${L.carregado ? 'on' : ''}"></span>${S.ia !== 'local' ? 'desativada · clique no cartão para usar' : L.carregado ? 'ativa · carregado na placa' : 'ativa · carrega ao abrir uma conversa'}</small><b class="lb-mod" title="${esc(mod)}">${esc(M.curto ? M.curto(mod) || mod : mod)}</b><small>${cd ? esc(cd.m.nome + ' ' + cd.v.t) + ' · ' : ''}${fmt(x.gb)} · ${P.cc(cd ? cd.m.caps : '')}</small></div>
        <div class="lb-vel"><b>${vel || '—'}</b><small>tok/s</small></div><div class="lb-vel"><b>${esc((x.primeira || L.primeira || '—').replace(' s', ''))}${(x.primeira || L.primeira) ? '<i> s</i>' : ''}</b><small>1ª palavra</small></div><div class="lb-vel"><b>${L.carregado && L.placa ? esc(L.placa.replace(' GB', '').replace(/ /g, '')) : fmt(x.gb).replace(' GB', '')}</b><small>GB da placa</small></div></div>
        <div class="lb-troca">${I.map(([n, y]) => `<button class="${n === mod ? 'on' : ''}" data-act="usarmod:${esc(n)}" title="${esc(n)}"><b>${esc(M.curto ? M.curto(n) || n : n)}</b><small>${y.tps ? y.tps + ' tok/s' : fmt(y.gb)}</small></button>`).join('')}<button data-act="Lloja:0" class="lb-lojab">${ico('mais')}<b>Loja</b>${ativos() ? `<span class="lj-badge">${ativos()}</span>` : '<small>mais modelos</small>'}</button></div>`;
    const niveis = cd && cd.m.niveis, NV = [['low', 'Baixo', 'responde logo'], ['medium', 'Médio', 'equilíbrio'], ['high', 'Alto', 'pensa bastante · mais lento']];
    const modo = niveis ? `<div class="lj-modo tres">${NV.map(([k, r, d]) => `<button class="${(S.op.nivel || 'low') === k ? 'on' : ''}" data-act="nivel:${k}"><b>${ico(k === 'low' ? 'raio' : 'lampada')}${r}${k === 'low' ? '<em>padrão</em>' : ''}</b><small>${d}</small></button>`).join('')}</div><div class="lj-medido">Este modelo sempre pensa antes de responder; escolha quanto.</div>` : `<div class="lj-modo tres"><button class="${!+S.pensar ? 'on' : ''}" data-act="pensar:0"><b>${ico('raio')}Rápido</b><small>direto ao ponto · curto</small></button>
      <button class="${+S.pensar === 1 ? 'on' : ''}" data-act="pensar:1"><b>${ico('raio')}Normal<em>padrão</em></b><small>resposta completa e organizada</small></button>
      <button class="${+S.pensar === 2 ? 'on' : ''}" data-act="pensar:2" ${pensa ? '' : 'disabled title="Este modelo não pensa"'}><b>${ico('lampada')}Pensar</b><small>${pensa ? 'raciocina antes · mais elaborada · mais lento' : 'este modelo não pensa'}</small></button></div>
      <div class="lj-medido">Sempre em português. Mesmo modelo nos três; muda o quanto ele se esforça na resposta.</div>`;
    const cart = (t, c) => `<div class="j-grupo"><div class="j-gt">${t}</div><div class="j-gc">${c}</div></div>`;
    return heroi + cart('Como ele responde', modo) + `<div class="lb-2">${cart('Memória da conversa', M.jseg('ctx', ['16 mil', '32 mil', '64 mil']) + '<div class="lj-medido">mais = lembra mais, responde mais devagar</div>')}${cart('Fica carregado', M.jseg('manter', ['5 min', '30 min', '1 h']) + '<div class="lj-medido">depois sai da placa sozinho</div>')}</div>`
      // 24/10 (user request): MCP folder = where mcp.json lives; no server in it, CCT starts official file server on that folder
      + cart('Ferramentas MCP', `<div class="lb-mcp"><div class="j-inp">${ico('pasta')}<input id="j-mcp" value="${esc(S.op.mcp || '')}" placeholder="Pasta do MCP (Enter salva)" spellcheck="false"></div><button class="c-btn" data-act="mcp-pasta">Escolher…</button></div><div class="lj-medido">${esc(L.mcpInfo || 'servidores do mcp.json dessa pasta · sem nenhum: "arquivos" (acesso à pasta)')}</div>`)
      + `<div class="lb-rodape"><span class="j-luz ${L.ligado ? 'on' : ''}"></span><span>${L.ligado ? `Ollama ligado · porta ${L.porta || 11434}` : 'Ollama desligado · liga sozinho ao abrir uma conversa local'}${L.pasta ? ' · modelos em ' + esc(L.pasta) : ''}</span>${L.carregado ? '<button class="c-btn" data-act="ollama:descarregar">Descarregar</button>' : ''}${L.ligado ? '<button class="c-btn" data-act="ollama:desligar">Desligar</button>' : '<button class="c-btn" data-act="ollama:ligar">Ligar</button>'}</div>`;
  };
  // ---- store ----
  // info like Locally Uncensored: author · downloads · updated; features; context; format; license; source
  const FONTES = [['ollama', 'Ollama oficial'], ['comunidade', 'Ollama comunidade'], ['hf', 'Hugging Face'], ['unsloth', 'Unsloth'], ['bartowski', 'Bartowski'], ['lmstudio-community', 'LM Studio Community'], ['mradermacher', 'mradermacher'], ['ms', 'ModelScope']];
  S.L.fontes = S.L.fontes || FONTES.map(f => f[0]);
  const linhaInfo = (de, baixados, quando, curtidas) => [esc(de), baixados ? esc(baixados) : '', curtidas ? `♥ ${curtidas >= 1000 ? (curtidas / 1000).toFixed(1).replace('.', ',') + ' mil' : curtidas}` : '', quando ? esc(quando) : ''].filter(Boolean).join(' · ');
  const ctxTx = (c) => !c ? '' : /^\d+$/.test(String(c)) ? c + 'K' : String(c);
  const card = (m, grande, por) => { const v = melhorV(m), ja = inst(v), dl = D().FILA.find(x => x.n === v.tag && x.st !== 'ok');
    return `<div class="lb-card ${grande ? 'g' : ''} ${S.L.sel === m.id ? 'sel' : ''}" data-act="Lsel:${esc(m.id)}"><div class="lb-c1"><span class="lb-av t-${m.tipo}">${esc(m.nome[0].toUpperCase())}</span><div><b>${esc(m.nome)}</b><small title="${esc(m.de)}">${linhaInfo(m.de, m.baixados ? m.baixados + ' downloads' : '', m.atualizado)}</small></div>${m.hot ? '<span class="lb-hot">em alta</span>' : ''}</div>
      ${grande ? `<div class="lb-por">${ico('ok')}${esc(por)}</div>` : `<p>${esc(m.desc)}</p>`}<div class="lb-tags">${P.cc(m.caps)}${P.caps(m.caps)}<span class="lj-cap">${ctxTx(v.ctx || m.ctx)} contexto</span></div>
      <div class="lb-c2">${P.fit(v.gb)}<span>${P.tps(v.gb, v)}</span>${ja ? `<em class="lj-ja">${ico('ok')}instalado</em>` : dl ? `<span class="lj-pct">${dl.st === 'ativo' ? dl.pct + '%' : dl.st === 'pausado' ? 'pausado' : 'falhou'}</span>` : `<button class="c-btn ${grande ? 'prim' : ''}" data-act="Lbaixar:${esc(v.tag)}">${ico('baixo')}${fmt(v.gb)}</button>`}</div></div>`; };
  function ficha() {
    const m = D().CAT.find(z => z.id === S.L.sel); if (!m) return '';
    const vi = S.L.vi != null && m.v[S.L.vi] ? S.L.vi : m.v.indexOf(melhorV(m)), v = m.v[vi], dl = D().FILA.find(x => x.n === v.tag), ja = inst(v), oc = (v.gb || 0) + 1.2;
    const info = [['Downloads', m.baixados || '—'], ['Atualizado', m.atualizado || '—'], ['Contexto', ctxTx(v.ctx || m.ctx) + ' tokens'], ['Entrada', v.ent || (m.caps.includes('v') ? 'texto, imagem' : 'texto')], ['Formato', 'GGUF · Q4_K_M'], ['Licença', m.lic], ['Parâmetros', v.t.toUpperCase().replace('B', ' B').replace('-A', ' · ativos ')], ['Fonte', m.id.includes('/') ? 'Ollama comunidade' : 'Ollama oficial']];
    return `<div class="lb-ficha" data-act="Lnada"><div class="lb-f1"><span class="lb-av t-${m.tipo}">${esc(m.nome[0].toUpperCase())}</span><div><b>${esc(m.nome)}</b><small>${linhaInfo(m.de, '', '')}</small></div><button class="ib" data-act="Lsel:null" title="Fechar (Esc)">${ico('x')}</button></div>
      <p>${esc(m.desc)}</p><div class="lb-tags">${P.cc(m.caps)}${P.caps(m.caps)}</div>
      <div class="lb-info">${info.map(([r, x]) => `<div><small>${r}</small><b title="${esc(x)}">${esc(x)}</b></div>`).join('')}</div>
      <div class="j-gt">Tamanho</div><div class="lb-vars">${m.v.map((x, i) => `<button class="${i === vi ? 'on' : ''}" data-act="Lvar:${i}"><b>${esc(x.t)}${x.rec ? '<em>sugerido</em>' : ''}${inst(x) ? '<em class="ja">instalado</em>' : ''}</b><small>${fmt(x.gb)} · ${P.tps(x.gb, x)}${x.ctx ? ' · ' + ctxTx(x.ctx) : ''}</small>${P.qual(x.qual)}${P.fit(x.gb)}</button>`).join('')}</div>
      <div class="lb-placa"><small>Na sua ${esc(D().PC.placa || 'placa de vídeo')}</small><div class="lb-vram"><i style="width:${Math.min(100, oc / vram() * 100)}%" class="${cabe(v.gb)}"></i></div><small>${fmt(oc)} de ${vram()} GB ${cabe(v.gb) === 'cabe' ? '· sobra para o Windows' : '· passa da placa: parte vai para a memória (lento)'}</small></div>
      <button class="lb-link" data-act="Lsite:ollama.com/${m.id.includes('/') ? '' : 'library/'}${esc(m.id)}">Página do modelo no ollama.com ↗</button>
      <div class="lb-fim">${ja ? `<em class="lj-ja">${ico('ok')}instalado</em><button class="c-btn prim" data-act="usarmod:${esc(v.tag)}">Usar agora</button>` : dl && dl.st !== 'ok' ? P.dl(dl) : `<span class="lj-disco">${ico('pasta')}sobram ${fmt((D().PC.disco || 0) - (v.gb || 0))}</span><button class="c-btn prim" data-act="Lbaixar:${esc(v.tag)}">${ico('baixo')}Baixar ${fmt(v.gb)}</button>`}</div></div>`;
  }
  const cardSite = (x) => { const dl = D().FILA.find(z => z.n === x.id && z.st !== 'ok'), f = FONTES.find(z => z[0] === x.fonte);
    return `<div class="lb-card"><div class="lb-c1"><span class="lb-av">${esc((x.nome || x.id)[0].toUpperCase())}</span><div><b title="${esc(x.id)}">${esc(x.nome || x.id)}</b><small title="${esc(x.de)}">${linhaInfo(x.de, x.baixados, x.quando, x.curtidas)}</small></div></div>
      <div class="lb-tags">${f ? `<span class="lj-cap fonte">${f[1]}</span>` : ''}${x.caps && x.caps.includes('f') ? P.cc('f') : ''}${P.caps(x.caps)}${x.ctx ? `<span class="lj-cap">${esc(ctxTx(x.ctx))} contexto</span>` : ''}${x.q ? `<span class="lj-cap">${esc(x.q)}</span>` : ''}</div>
      <div class="lb-c2">${P.fit(x.gb)}<span>${P.tps(x.gb, x)}</span>${dl ? `<span class="lj-pct">${dl.pct}%</span>` : `<button class="c-btn" data-act="Lbaixar:${esc(x.id)}">${ico('baixo')}${fmt(x.gb) === '—' ? 'Baixar' : fmt(x.gb)}</button>`}</div></div>`; };
  function vitrine() {
    if (!S.L.fontes) S.L.fontes = FONTES.map(f => f[0]);     // new state (scene, reset) without source list
    const F = D().FILA.filter(x => x.st !== 'ok');
    const filtros = `<div class="lb-esq"><div class="lj-busca" data-act="Lnada">${ico('busca')}<input id="lj-busca" value="${esc(S.L.busca)}" placeholder="Buscar (Enter)" spellcheck="false"></div>
      <div class="lb-g"><small>Tipo</small>${[['pop', 'Populares', 'os mais usados'], ['livre', 'Sem filtro', 'sem recusas'], ['', 'Todos', '']].map(([k, r, d]) => `<button class="lb-op ${(S.L.tipo || '') === k ? 'on' : ''}" data-act="Lset:tipo:${k}">${r}<small>${d}</small></button>`).join('')}</div>
      <div class="lb-g"><small>Tamanho</small>${[['todos', 'Qualquer'], ['cabe', 'Cabe na minha placa'], ['leve', 'Leve · até 4 GB'], ['medio', 'Médio · 4 a 10 GB']].map(([k, r]) => `<button class="lb-op ${S.L.tam === k ? 'on' : ''}" data-act="Lset:tam:${k}">${r}</button>`).join('')}</div>
      <div class="lb-g"><small>Precisa</small>${[['f', 'Funcionar com o Claude Code'], ['v', 'Ler imagens'], ['p', 'Pensar antes']].map(([k, r]) => `<button class="lb-ck ${S.L.caps.includes(k) ? 'on' : ''}" data-act="Lcap:${k}"><i>${ico('ok')}</i>${r}</button>`).join('')}</div>
      <div class="lb-g"><small>Buscar em · ${S.L.fontes.length} de ${FONTES.length}</small><div class="lb-fontes">${FONTES.map(([k, r]) => `<button class="${S.L.fontes.includes(k) ? 'on' : ''}" data-act="Lfonte:${k}">${r}</button>`).join('')}</div></div>
      <div class="lb-doca" data-act="jaba:2"><small>Downloads</small>${F.slice(0, 2).map(x => `<div><b>${esc(x.n)}</b><span>${x.st === 'ativo' ? x.pct + '%' + (x.falta ? ' · ' + x.falta : '') : x.st === 'pausado' ? 'pausado' : 'falhou'}</span>${P.barra(x.pct, x.st)}</div>`).join('') || '<span>nada baixando</span>'}</div></div>`;
    let dir;
    if (D().estado === 'off') dir = P.erroOllama();
    else if (D().estado === 'carregando' || !D().CAT.length) dir = P.carregando();
    else { const l = lista(), B = S.L.busca ? D().BUSCA.filter(x => !x.fonte || S.L.fontes.includes(x.fonte)) : [], sug = !S.L.busca && S.L.tam === 'todos' && !S.L.caps ? sugestoes(S.L.tipo) : [], tit = S.L.busca ? `"${esc(S.L.busca)}" no catálogo` : S.L.tipo === 'livre' ? 'Sem filtro' : S.L.tipo === 'pop' ? 'Populares' : 'Todos';
      dir = (sug.length ? `<div class="lb-tit">Comece por aqui <small>escolhidos para a sua ${esc(D().PC.placa || 'placa')}</small></div><div class="lb-sug">${sug.map(s => card(s.m, 1, s.por)).join('')}</div>` : '')
        + (l.length ? `<div class="lb-tit">${tit} <small>${l.length} modelos</small></div><div class="lb-grade">${l.map(m => card(m)).join('')}</div>` : '')
        + (S.L.busca ? `<div class="lb-tit">Nos sites <small>${S.L.fontes.length === FONTES.length ? 'todas as fontes' : S.L.fontes.map(k => FONTES.find(f => f[0] === k)[1]).join(' · ')}</small></div>${D().buscando ? P.carregando() : B.length ? `<div class="lb-grade">${B.map(cardSite).join('')}</div>` : '<div class="j-nota">Nada nos sites com esse nome.</div>'}` : '')
        + (!l.length && !S.L.busca ? P.vazio('Nada com esses filtros', 'Tire um filtro para ver mais.', '<button class="c-btn" data-act="Lset:caps:">Limpar filtros</button>') : ''); }
    // click outside sheet (filters, grid, empty) closes sheet; inside, nothing (data-act Lnada)
    return `<div class="lb-loja" ${S.L.sel ? 'data-act="Lsel:null"' : ''}>${filtros}<div class="lb-dir">${dir}</div>${ficha()}</div>`;
  }
  const instalados = () => { const I = Object.entries(D().INST); if (!I.length) return P.vazio('Nenhum modelo no seu PC', 'Escolha um na loja.', `<button class="c-btn prim" data-act="jaba:0">${ico('cpu')}Ir para a loja</button>`);
    return `<div class="lj-topo2"><b>${I.length} ${I.length === 1 ? 'modelo' : 'modelos'} no seu PC</b>${P.disco()}</div>` + I.map(([n, x]) => { const cd = catDe(n), on = n === (M.D.local || {}).modelo, b = D().bench === n;
      return `<div class="lj-inst ${on ? 'on' : ''}">${ico('cpu')}<div><b title="${esc(n)}">${esc(n)}</b><small>${fmt(x.gb)}${b ? '' : x.tps ? ` · ${x.tps} tok/s medido · 1ª palavra ${esc(x.primeira || '—')}` : ' · velocidade não medida'}${x.usado ? ' · usado ' + esc(x.usado) : ''}</small>${b ? `<span class="lj-bench"><span class="gira"></span>Medindo na sua placa… (carrega o modelo; não gasta limite)</span>` : ''}</div>
        ${P.cc(cd ? cd.m.caps : '')}${P.fit(x.gb)}<button class="ib" data-act="Lbench:${esc(n)}" title="Medir a velocidade">${ico('raio')}</button>${on ? `<em>${ico('ok')}em uso</em>` : `<button class="c-btn" data-act="usarmod:${esc(n)}">Usar</button>`}<button class="ib" data-act="apagarmod:${esc(n)}" title="Apagar do disco">${ico('x')}</button></div>`; }).join(''); };
  const downloads = () => { const F = D().FILA; if (!F.length) return P.vazio('Nenhum download', 'O que você baixar aparece aqui, com pausar e continuar.');
    return `<div class="lj-topo2"><b>${F.filter(x => x.st !== 'ok').length} na fila</b>${P.disco()}${F.some(x => x.st === 'ok') ? '<button class="c-btn" data-act="Llimpar">Limpar os prontos</button>' : ''}</div>${F.map(P.dl).join('')}<div class="j-nota">Pausar guarda o que já veio: continuar segue dali, mesmo depois de fechar o programa.</div>`; };
  const adicionar = () => { const A = D().ACHADOS || [], g = M.D.gguf;
    return `<div class="lj-add lj-sol">${ico('atual')}<b>${g ? esc(g.caminho) : 'Arquivo .gguf do seu PC'}</b>${g ? `<small>vai entrar no Ollama como <b>${esc(g.nome)}</b></small><button class="c-btn prim" data-act="gguf-adicionar">Adicionar</button>` : `<small>copia para a pasta do Ollama</small><button class="c-btn" data-act="gguf-escolher">Escolher arquivo…</button>`}</div>
      <div class="lj-add j-grupo"><div class="j-gt">Achados em outros programas</div><div class="j-gc">${A.length ? A.map((x, i) => `<div class="lj-inst">${ico('pasta')}<div><b>${esc(x.n)}</b><small>${esc(x.de)} · ${fmt(x.gb)} · ${esc(x.caminho)}</small></div>${P.fit(x.gb)}<button class="c-btn" data-act="Lachado:${i}">Adicionar</button></div>`).join('') : '<div class="j-nota">Nenhum .gguf no LM Studio, GPT4All, Jan, Msty nem em Downloads.</div>'}</div></div>
      <div class="lj-add j-grupo"><div class="j-gt">Pelo nome</div><div class="j-gc"><div class="lj-busca">${ico('baixo')}<input id="lj-nome" placeholder="ex.: llama3.1:8b ou hf.co/usuario/modelo-GGUF:Q4_K_M (Enter baixa)" spellcheck="false"></div></div></div>`; };
  M.lojaJanela = { tit: 'Loja de modelos', ico: 'cpu', get sem() { return S.jAba === 0; }, get abas() { return ['Loja', 'Meus modelos', `Downloads${ativos() ? `<span class="lj-badge">${ativos()}</span>` : ''}`, 'Adicionar']; },
    html: () => S.jAba === 0 ? vitrine() : [null, instalados, downloads, adicionar][S.jAba]() };
  // ---- UI-only actions; those touching PC go to M.lojaAcao ----
  const base = M.agir;
  M.agir = (a) => {
    const i = a.indexOf(':'), k = i < 0 ? a : a.slice(0, i), v = i < 0 ? '' : a.slice(i + 1);
    if (k === 'Lnada') return;
    if (k === 'nivel') { S.op.nivel = v; if (M.salvar) M.salvar('op', 'nivel'); return M.draw(); }
    if (k === 'Lset') { const [x, y] = v.split(':'); S.L[x] = y || (x === 'tipo' ? null : ''); if (x !== 'caps') S.L.sel = null; return M.draw(); }
    if (k === 'Lfonte') { S.L.fontes = S.L.fontes || []; S.L.fontes = S.L.fontes.includes(v) ? S.L.fontes.filter(x => x !== v) : [...S.L.fontes, v]; if (!S.L.fontes.length) S.L.fontes = [v]; return S.L.busca && M.lojaAcao ? M.lojaAcao('Lbusca', S.L.busca) : M.draw(); }
    if (k === 'Lsite') return M.lojaAcao ? M.lojaAcao('Lsite', v) : undefined;
    if (k === 'Lcap') { S.L.caps = S.L.caps.includes(v) ? S.L.caps.replace(v, '') : S.L.caps + v; return M.draw(); }
    if (k === 'Lsel') { S.L.sel = v === 'null' ? null : v; S.L.vi = null; return M.draw(); }
    if (k === 'Lvar') { S.L.vi = +v; return M.draw(); }
    if (k === 'Lloja') { S.modal = 'baixar'; S.jAba = +v || 0; S.L.sel = null; return M.lojaAcao ? M.lojaAcao('abrir') : M.draw(); }
    if (/^(Lbaixar|Lpausa|Lcancela|Lbench|Lbusca|Llimpar|Lachado|Lnome)$/.test(k) && M.lojaAcao) return M.lojaAcao(k, v);
    return base(a);
  };
  // prototype: demo (app swaps M.lojaAcao for real one in telaapp.js)
  M.lojaAcao = (k, v) => { const F = D().FILA, f = (n) => F.find(z => z.n === n);
    if (k === 'Lbaixar' || k === 'Lnome') { if (!f(v)) { const c = catDe(v); F.unshift({ n: v, gb: c ? c.v.gb : 5, pct: 2, vel: '41 MB/s', falta: '3 min', st: 'ativo' }); } }
    if (k === 'Lpausa') { const z = f(v); if (z) z.st = z.st === 'ativo' ? 'pausado' : 'ativo'; }
    if (k === 'Lcancela') { const i = F.findIndex(z => z.n === v); if (i >= 0) F.splice(i, 1); }
    if (k === 'Llimpar') M.D.loja.FILA = F.filter(z => z.st !== 'ok');
    if (k === 'Lbench') { D().bench = v; setTimeout(() => { D().bench = null; M.draw(); }, 2500); }
    M.draw(); };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.modal === 'baixar' && S.L.sel) { S.L.sel = null; M.draw(); e.stopPropagation(); e.preventDefault(); return; }
    if (e.key !== 'Enter' || !e.target || !/^lj-(busca|nome)$/.test(e.target.id)) return;
    e.stopPropagation(); e.preventDefault(); const tx = e.target.value.trim();
    if (e.target.id === 'lj-nome') { if (tx) M.agir('Lnome:' + tx); return; }
    S.L.busca = tx; S.L.sel = null; if (tx) M.agir('Lbusca:' + tx); else M.draw();
  }, true);
})();
