// Windows of look B, CHOSEN (23/10/2026): frame A "Por cima" (proposal's window.MOLDURA). THIS FILE IS THE UI CODE
// OF THE APP (copy via abas\ferramentas\copiar-prototipo.ps1). Everything shown comes from M.D; changes call M.agir (real
// action in app) or M.salvar('op', key) (saved option). Switching tab SLIDES content; window only "appears" on open.
(function () {
  const { S, ico, esc } = M;
  const D = () => M.D;
  if (!S.op) S.op = { mcp: 'C:\\FCC\\perfil\\dados\\mcp', inicio: 'Claude', tema: 'Escuro', tam: 'Máx. 1440 × 810', fechar: 'Esconder na bandeja', abrir: 'Reabrir', explorer: false, autoAtual: true, passos: 'Escondidos (a seta mostra)', codigo: 'Escondido, só texto', painel: true,
    ctx: '16 mil', ajudante: 'Desligado', manter: '30 min', barraUso: 'Conta em uso', autoConta: true, pctUso: true, auto: true, fimLocal: 'Descarregar o modelo', perm: 'Automático', enter: 'Continuar a anterior', memoria: true, texto: 'Continue de onde parou (docs\\PARADA.md).' };
  S.est = S.est || { per: '7 dias', ia: 'Tudo' }; S.baixando = S.baixando || {}; S.memSel = S.memSel || 0;
  const seg = (k, ops) => `<div class="j-seg">${ops.map(o => `<button class="${S.op[k] === o ? 'on' : ''}" data-act="jop:${k}:${o}">${esc(o)}</button>`).join('')}</div>`;
  const chave = (k) => `<button class="j-chave ${S.op[k] ? 'on' : ''}" data-act="jop:${k}:"><i></i></button>`;
  const lin = (rot, dica, ctrl) => `<div class="j-lin"><div class="j-rot">${rot}${dica ? `<small>${dica}</small>` : ''}</div>${ctrl}</div>`;
  const barra = (pct, cor) => `<div class="j-barra"><i style="width:${pct}%;${cor ? 'background:' + cor : ''}"></i></div>`;
  const cartao = (tit, corpo, dir = '') => `<div class="j-grupo">${tit ? `<div class="j-gt">${tit}${dir}</div>` : ''}<div class="j-gc">${corpo}</div></div>`;
  // account window B (28/10/2026): reset moments come as ms (main.js lim.*.ate); demo lim.demo = fixed clock (real lim never has it); countdown text refreshed every 20 s ([data-falta])
  M.agora = () => window.RELOGIO_TESTE || (D().lim || {}).demo || Date.now(); const H = 36e5, MIN = 6e4, DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const hh = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const quando = (t) => { const d = new Date(t), dd = Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date(M.agora()).setHours(0, 0, 0, 0)) / 864e5); return (dd === 0 ? 'hoje' : dd === 1 ? 'amanhã' : DIAS[d.getDay()]) + ' às ' + hh(t); };
  const falta = (t) => { let m = Math.max(0, Math.round((t - M.agora()) / MIN)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); m %= 60;
    if (h < 24) return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') + ' min' : ''); const d = Math.floor(h / 24), r = h % 24; return d + (d === 1 ? ' dia' : ' dias') + (r ? ' e ' + r + ' h' : ''); };
  M.falta = falta;
  const vale = (x) => x && x.ate > M.agora();   // old saved usage may have no/old reset time: show the "volta" text instead
  const usoAt = () => { const l = D().lim || {}; return S.limite ? { ...l, sessao: { ...(l.sessao || {}), pct: 100 } } : l; };
  const ini = (e) => esc(e[0].toUpperCase());
  const melhorConta = () => (D().contas || []).filter(x => x.email !== (D().conta || {}).email && !x.expirou && x.uso && x.uso.sessao && x.uso.sessao.pct < 100).sort((a, b) => a.uso.sessao.pct - b.uso.sessao.pct)[0];
  const semConta = () => `<div class="cx-vazio"><span class="cx-av g">${ico('user')}</span><b>Nenhuma conta conectada</b><small>Entre para usar o Claude. O navegador abre uma vez; depois a conta fica salva neste PC.<br>Sem conta, a IA local continua funcionando.</small><div class="cx-bt"><button class="c-btn prim" data-act="entrar">Entrar na conta</button><button class="c-btn" data-act="usarlocal">Usar a IA local</button></div></div>`;
  const anel = (k, x, nome) => { const tem = x && x.pct != null, ac = tem && x.pct >= 100, R = 52, CIR = 2 * Math.PI * R, v = tem ? Math.min(100, x.pct) : 0;
    const big = !tem ? '—' : vale(x) ? `<span data-falta="${x.ate}">${falta(x.ate)}</span>` : esc(x.volta || '—'), sub = !tem ? 'aparece depois da 1ª resposta do Claude' : vale(x) ? quando(x.ate) : '';
    return `<div class="b-anel ${k} ${ac ? 'acabou' : ''}" data-uso="${k}"><svg viewBox="0 0 128 128"><circle class="tr" cx="64" cy="64" r="${R}"/><circle class="vl" cx="64" cy="64" r="${R}" style="stroke-dasharray:${CIR};--off:${CIR * (1 - v / 100)};--cir:${CIR}"/></svg>
      <div class="b-mio"><b>${tem ? v + '%' : '—'}</b><small>${ac ? 'acabou' : 'usado'}</small></div><div class="b-tx"><b>${nome}</b><span>${!tem ? 'Ainda sem dados' : ac ? 'Libera em' : vale(x) ? 'Zera em' : 'Zera'}</span><div class="b-big">${big}</div>${sub ? `<small>${sub}</small>` : ''}</div></div>`; };
  const tileConta = (x, atual, uAt) => { const on = x.email === atual, uu = (on ? uAt : x.uso) || {}, s = uu.sessao, w = uu.semana;
    const est = !s ? 'sem dados de uso ainda' : s.pct >= 100 ? 'libera em ' + (vale(s) ? falta(s.ate) : s.volta || '—') : 100 - s.pct + '% livre';
    const fim = x.expirou ? `<button class="c-btn" data-act="conta-usar:${esc(x.email)}">Entrar</button>` : on ? `<em>${ico('ok')}em uso</em>` : S.trocando === x.email ? '<span class="gira"></span>' : `<button class="c-btn prim" data-act="conta-usar:${esc(x.email)}">Usar</button>`;
    return `<div class="b-tile ${on ? 'on' : ''} ${x.expirou ? 'exp' : ''}"><div class="b-t1"><span class="cx-av p">${ini(x.email)}</span><div><b>${esc(x.email)}</b><small>${esc(x.plano || '—')}</small></div>${on ? '' : `<button class="ib" data-act="conta-esquecer:${esc(x.email)}" data-dica="TIRAR DA LISTA|Não sai da conta no site">${ico('x')}</button>`}</div>
      <div class="b-mini"><i class="s" style="--v:${s ? Math.min(100, s.pct) : 0}%"></i><i class="w" style="--v:${w ? Math.min(100, w.pct) : 0}%"></i></div><div class="b-t2"><small>${x.expirou ? 'precisa entrar de novo' : est}</small>${fim}</div></div>`; };
  setInterval(() => document.querySelectorAll('[data-falta]').forEach(e => { e.textContent = falta(+e.dataset.falta); }), 20000);
  // "Esperar": warns when the 5 h limit frees (toast + Windows notification)
  M.avisarConta = () => { const x = usoAt().sessao; if (!vale(x)) return; S.avisoConta = x.ate; clearTimeout(M._avisoT);
    M._avisoT = setTimeout(() => { S.avisoConta = 0; S.toast = 'O limite de 5 horas liberou. Pode voltar a usar o Claude.'; M.draw(); try { new Notification('FCC', { body: S.toast }); } catch (e) { } }, Math.min(x.ate - M.agora() + 5000, 2 ** 31 - 1)); M.draw(); };
  const ESF = [['low', 'Baixo', 'responde logo; para coisa simples'], ['medium', 'Médio', 'equilíbrio · o padrão'], ['high', 'Alto', 'pensa mais antes de mexer'], ['xhigh', 'Muito alto', 'para problema difícil · mais lento'], ['max', 'Máximo', 'pensa o quanto precisar · gasta mais do limite']];
  const MOD = [['fable', 'Fable 5.1', 'o mais capaz, para trabalho longo e difícil', 'mais lento'], ['opus', 'Opus 5.5', 'raciocínio complexo · o de sempre', ''], ['sonnet', 'Sonnet 5.5', 'dia a dia, mais rápido', 'rápido'], ['haiku', 'Haiku 5.5', 'rápido, para coisa simples', 'o mais rápido']];

  // ---- AI: Claude | No seu PC (only one active) ----
  function ativa(qual) {
    const on = S.ia === qual, cl = qual === 'claude';
    return `<div class="ia-ativa ${on ? 'on' : 'liga'} ${cl ? '' : 'loc'}"${on ? '' : ` data-act="ia:${qual}" data-dica="${cl ? 'USAR O CLAUDE' : 'USAR A IA LOCAL'}|Clique: a conversa aberta passa para ${cl ? 'o Claude' : 'a IA local'}|As outras abas continuam na IA delas"`}><span class="ia-ic">${ico(cl ? 'nuvem' : 'cpu')}</span><div><b>${cl ? 'Claude' : 'IA no seu PC'}${on ? '<em>ativa</em>' : ''}</b>
      <small>${cl ? 'Na nuvem da Anthropic · usa o limite da sua conta' : 'Roda no seu PC pelo Ollama · nada sai daqui · sem limite'}</small></div>
      ${on ? `<span class="ia-ok">${ico('ok')}Em uso</span>` : `<span class="ia-liga">Clique para usar</span>`}</div>${on ? '' : `<div class="j-nota">${ico('ajuda')}Vale só para a conversa aberta (ela recomeça com ${cl ? 'o Claude' : 'a IA local'}). Conversa nova sempre começa no Claude Sonnet Médio.</div>`}`;
  }
  const iaClaude = () => {
    const e = ESF.find(x => x[0] === S.esf) || ESF[1], d = D();
    return ativa('claude') +
      cartao('Automático', lin('Escolher sozinho', 'modelo e pensamento a cada mensagem, pelo tipo do pedido · aprende com as suas trocas', chave('auto')) + `<div class="j-nota">${ico('ajuda')}Troca calada: só o botão da IA na conversa acompanha. Escolher abaixo mexe só na conversa aberta.</div>`) +
      cartao('Modelo', `<div class="ia-mods">${MOD.map(m => `<button class="ia-mod ${S.modelo === m[0] ? 'on' : ''}" data-act="pm:${m[0]}"><b>${m[1]}</b><small>${m[2]}</small>${m[3] ? `<i>${m[3]}</i>` : ''}${S.modelo === m[0] ? ico('ok', 'v') : ''}</button>`).join('')}</div>`) +
      cartao('Pensamento', `<div class="ia-esf">${ESF.map((x, i) => `<button class="${x[0] === S.esf ? 'on' : ''}" data-act="esf:${x[0]}"><i style="height:${6 + i * 4}px"></i><span>${x[1]}</span></button>`).join('')}</div><div class="j-nota">${esc(e[2])}</div>`) +
      cartao('IA local ajudando', lin('Usar a IA local para', 'o Claude passa o código para ela e confere · gasta menos do seu limite', seg('ajudante', ['Desligado', 'Código grande', 'Código e testes'])) + `<div class="j-nota">${ico('ajuda')}Usa o melhor modelo de código que você tem instalado (a Loja mostra os sugeridos primeiro).</div>`) +
      cartao('Conversa aberta', `<div class="j-uso"><div><b>Memória usada</b><small>${d.memConversa == null ? 'abra uma conversa para ver' : 'o que ele ainda lembra desta conversa'}</small></div>${barra(d.memConversa || 0)}<span>${d.memConversa == null ? '—' : d.memConversa + '%'}</span></div><button class="c-btn" data-act="resumir">${ico('volta')}Resumir agora</button>`) +
      cartao('Permissões', lin('Quando ele quer mexer em algo', 'vale para as próximas conversas', seg('perm', ['Automático', 'Perguntar sempre', 'Só planejar'])) + `<div class="j-nota">Automático = igual ao seu terminal: só pergunta o que você mandaria perguntar.</div>`);
  };
  M.jseg = seg;                        // No seu PC tab (loja.js) uses option selectors from here

  // ---- Options: nav on left + groups in cards ----
  const OPC = [['Geral', 'eng', () => cartao('Janela', lin('Tamanho', 'como no ExitLag · segure o maximizar para trocar', seg('tam', ['Máx. 1440 × 810', 'Mín. 1080 × 608'])) + lin('Botão fechar (✕)', 'segurar 1 s sempre sai do programa', seg('fechar', ['Esconder na bandeja', 'Sair']))) +
      cartao('Ao abrir', lin('Começar com', 'a IA de toda conversa nova · dá para trocar em cada conversa', seg('inicio', ['Tela de escolha', 'Claude', 'IA Local'])) + lin('Abrir o Explorer junto', 'ao continuar um projeto', chave('explorer'))) +
      cartao('Contas', lin('Barra de uso', 'no pé do trilho: 5 h e semana na mesma barra', seg('barraUso', ['Conta em uso', 'Todas as contas'])) + lin('Mostrar a porcentagem', 'os números ao lado da barra', chave('pctUso')) + lin('Trocar de conta sozinho', 'acabou o limite: passa para outra conta e continua', chave('autoConta')))],
    ['Aparência', 'painel', () => cartao('Tema', `<div class="op-temas">${['Escuro', 'Claro', 'Seguir o Windows'].map(x => `<button class="${S.op.tema === x ? 'on' : ''}" data-act="jop:tema:${x}"><i class="t-${x[0]}"></i>${x}</button>`).join('')}</div>`) + cartao('Conversa', lin('Painel do projeto', 'à direita da conversa (Ctrl+B)', chave('painel')))],
    ['Conversa', 'chat', () => cartao('Ao continuar', lin('Texto', 'o que vai quando você aperta Continuar', `<div class="j-inp"><input id="j-texto" value="${esc(S.op.texto)}" spellcheck="false" title="Enter salva"></div>`) + lin('Enter na tela do projeto', 'escreveu e apertou Enter: segue a última conversa ou começa outra', seg('enter', ['Continuar a anterior', 'Nova conversa']))) +
      cartao('O que aparece', lin('Passos do Claude', 'Leu, Rodou, Editou…', seg('passos', ['Escondidos (a seta mostra)', 'Sempre à mostra'])) + lin('Código nas respostas', '', seg('codigo', ['Escondido, só texto', 'Aparece'])))],
    ['Projetos', 'pasta', () => cartao('Pastas com projetos', `<div class="j-lista">${(D().pastas || []).map((p, i) => `<div class="j-it">${ico('pasta')}<span>${esc(p)}</span>${i === 0 ? '<small>principal</small>' : `<button class="ib" data-act="pasta-tirar:${i}">${ico('x')}</button>`}</div>`).join('')}</div><button class="c-btn" data-act="pasta-por">${ico('mais')}Adicionar pasta</button><div class="j-nota">Toda pasta com CLAUDE.md vira projeto; as que começam com _ ficam de fora. Nomes e grupos do trilho só mudam aqui no programa (as pastas continuam iguais).</div>`)],
    ['Atualização', 'atual', () => cartao('Este programa', estadoAtual() + lin('Procurar atualização sozinho', 'ao abrir, no GitHub · baixa e confere; entra quando você fechar', chave('autoAtual'))) +
      cartao('Claude Code', lin('Versão', 'atualiza sozinho', `<span class="j-val">${esc(D().claudeVersao || '—')}</span>`))]];
  // update state: S.pendente (new build waiting) or S.atual = { estado: procurando|baixando|em-dia|erro, pct, erro, quando }
  const estadoAtual = () => {
    const a = S.atual || {}, ocupado = a.estado === 'procurando' || a.estado === 'baixando', hora = a.quando ? new Date(a.quando).toTimeString().slice(0, 5) : '';
    const [luz, tit, sub] = S.pendente ? ['on', 'Versão nova pronta' + (a.versao ? ' (' + a.versao + ')' : ''), 'conferida · entra quando você fechar (volta sozinho, com as conversas)']
      : a.estado === 'procurando' ? ['vai', 'Procurando versão nova…', 'no GitHub do FCC']
      : a.estado === 'baixando' ? ['vai', 'Baixando a versão nova… ' + (a.pct || 0) + '%', 'confere o arquivo antes de guardar']
      : a.estado === 'erro' ? ['erro', 'Não deu para procurar', a.erro || '']
      : ['', 'Em dia', (D().versao || '') + (hora ? ' · conferido às ' + hora : '')];
    const bt = S.pendente ? '<button class="c-btn prim" data-act="reiniciar">Reiniciar agora</button>' : `<button class="c-btn" data-act="atual-procurar"${ocupado ? ' disabled' : ''}>${ico('atual')}Procurar agora</button>`;
    return `<div class="j-estado"><span class="j-luz ${luz}"></span><div><b>${esc(tit)}</b><small>${esc(sub)}</small></div>${bt}</div>`;
  };
  const opcoes = () => `<div class="op-tela"><div class="op-nav">${OPC.map((x, i) => `<button class="${i === S.jAba ? 'on' : ''}" data-act="jaba:${i}">${ico(x[1])}${x[0]}</button>`).join('')}</div><div class="op-pag ${M.ultDir || ''}"><h3>${OPC[S.jAba][0]}</h3>${OPC[S.jAba][2]()}</div></div>`;

  // ---- Stats: big number + cards + grid chart + table ----
  const CORES = ['#d97757', '#8ab4f8', '#81c995', '#fdd663', '#9aa0a6'];
  const est = () => {
    const E = D().est || {}, dias = E.dias || [], proj = E.proj || [], tot = proj.reduce((s, p) => s + p[1], 0) || 1, mx = Math.max(1, ...dias.map(d => d[1]));
    return `<div class="es-top"><div class="j-seg">${['Hoje', '7 dias', '30 dias', 'Tudo'].map(x => `<button class="${S.est.per === x ? 'on' : ''}" data-act="jest:per:${x}">${x}</button>`).join('')}</div><div class="j-seg">${['Tudo', 'Claude', 'Local'].map(x => `<button class="${S.est.ia === x ? 'on' : ''}" data-act="jest:ia:${x}">${x}</button>`).join('')}</div></div>
      <div class="es-heroi"><div><small>${esc(E.rotulo || '')}</small><b>${esc(E.total || '0')}</b><span class="up">${esc(E.delta || '')}</span></div>
        <div class="es-mini">${(E.mini || []).map(x => `<div>${ico(x[0])}<b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join('')}</div></div>
      <div class="es-dois"><div class="j-grupo"><div class="j-gt">Uso por dia<span class="j-gd">mil tokens</span></div><div class="j-gc"><div class="es-graf"><div class="es-grade">${(E.escala || []).map(v => `<div><span>${v}</span></div>`).join('')}</div>
          <div class="es-barras">${dias.map(d => `<div class="${d[1] === mx ? 'top' : ''}"><em>${d[1]}</em><i style="height:${Math.round(d[1] / (E.max || mx) * 100)}%"></i><span>${d[0]}</span></div>`).join('')}</div></div></div></div>
        <div class="j-grupo"><div class="j-gt">Por projeto</div><div class="j-gc"><div class="es-pilha">${proj.map((p, i) => `<i style="flex:${p[1]};background:${CORES[i % 5]}"></i>`).join('')}</div>${proj.map((p, i) => `<div class="es-leg"><span style="background:${CORES[i % 5]}"></span>${esc(p[0])}<small>${p[1]} mil · ${Math.round(p[1] / tot * 100)}%</small></div>`).join('')}</div></div></div>
      <div class="j-grupo"><div class="j-gt">Conversas recentes</div><div class="j-gc"><div class="es-tab"><div class="es-th"><span>Projeto</span><span>IA</span><span>Quando</span><span>Duração</span><span>Tokens</span></div>
        ${(E.recentes || []).map(x => `<div class="es-tr"><span>${esc(x[0])}</span><span><i class="es-ia ${M.ehLocal(x[1]) && !/^(Fable|Opus|Sonnet|Haiku)/.test(x[1]) ? 'loc' : ''}">${esc(x[1])}</i></span><span>${esc(x[2])}</span><span>${esc(x[3])}</span><span>${esc(x[4])}</span></div>`).join('')}</div></div></div>`;
  };

  // ---- Rules and memory (like Claude Desktop: instructions + memory it keeps + skills) ----
  const regras = () => { const R = D().regras || [], r = R[S.memSel] || {};
    return [
    `<div class="rg"><div class="rg-lista">${R.map((m, i) => `<button class="${i === S.memSel ? 'on' : ''}" data-act="memsel:${i}">${ico('doc')}<div><b>${esc(m.n)}</b><small>${esc(m.arq)}</small></div></button>`).join('')}</div>
      <div class="rg-ver"><div class="j-gt">${esc(r.n || '')}<span class="j-gd">${esc(r.pasta || '')}\\${esc(r.arq || '')}</span></div><div class="rg-tx">${esc(r.tx || '')}</div><div class="j-botoes"><button class="c-btn prim" data-act="regra-editar:${S.memSel}">${ico('lapis')}Editar no Bloco de notas</button><button class="c-btn" data-act="regra-pasta:${S.memSel}">${ico('pasta')}Abrir a pasta</button></div>
      <div class="j-nota">Valem para todas as conversas, em todos os projetos. As do projeto ficam na ficha dele (Instruções).</div></div></div>`,
    cartao('Memória do Claude', `<div class="j-nota">O que ele guardou sobre você e o seu jeito de trabalhar. Esquecer manda a nota para a Lixeira.</div>` +
      `${(D().memorias || []).length ? `<div class="j-lista">${D().memorias.map(x => `<div class="j-it">${ico('lampada')}<span>${esc(x.tx)}</span><small>${esc(x.quando)}</small><button class="ib" data-act="esquecer:${esc(x.id)}" title="Esquecer">${ico('x')}</button></div>`).join('')}</div>` : '<div class="j-nota">Nenhuma nota ainda.</div>'}`, `<span class="j-gd">${ico('pasta')}${esc(D().memPasta || '')}</span>`),
    cartao('Skills da casa', `<div class="j-lista">${(D().skills || []).map(s => `<div class="j-it">${ico('raio')}<span>${esc(s.n)}</span><small>${esc(s.d)}</small><button class="ib" data-act="skill-abrir:${esc(s.n)}" title="Abrir">${ico('seta')}</button></div>`).join('')}</div><div class="j-nota">Ligam sozinhas quando o assunto aparece. O original fica em CCT\\memoria\\skills (sobrevive à formatação).</div>`)][S.jAba]; };

  const J = {
    ia: { tit: 'IA', ico: 'raio', tecla: 'F4', abas: [`${ico('nuvem')}Claude`, `${ico('cpu')}No seu PC`], html: () => [iaClaude, M.lojaLocal][S.jAba]() },
    opcoes: { tit: 'Opções', ico: 'eng', tecla: 'F2', html: opcoes, sem: true },
    est: { tit: 'Estatísticas', ico: 'graf', tecla: 'F8', html: est },
    regras: { tit: 'Regras e memória', ico: 'doc', abas: ['Regras', 'Memória do Claude', 'Skills'], html: regras },
    ajuda: { tit: 'Atalhos', ico: 'ajuda', tecla: 'F1', html: () => {
      const G = [['Navegar', [['↑ ↓ · Enter', 'escolhe e abre o projeto'], ['Ctrl+Tab · Ctrl+1…9', 'troca de conversa'], ['Ctrl+T', 'nova conversa (chat livre)']]],
        ['Conversa', [['Enter · Shift+Enter', 'envia · pula linha'], ['Esc', 'interrompe / cancela a edição'], ['/', 'comandos e skills']]],
        ['Janela', [['F4', 'IA (Claude ou no seu PC)'], ['F2 · F8 · F9', 'opções · estatísticas · conta']]]];
      return `<div class="j-cols">${G.map(([t, L]) => `<div class="j-grupo"><div class="j-gt">${t}</div><div class="j-gc">${L.map(x => `<div class="j-at"><kbd>${x[0]}</kbd><span>${x[1]}</span></div>`).join('')}</div></div>`).join('')}</div>`; } },
    baixar: M.lojaJanela,                 // model store: loja.js (proposal B "Vitrine", 23/10)
    // Account, proposal B "anéis" (chosen 28/10/2026): two rings, big answer = WHEN it frees (live countdown); limit over → "what to do now"; accounts as tiles
    conta: { tit: 'Conta', ico: 'user', tecla: 'F9', html: () => { const c = D().conta || {}; if (!c.email) return semConta(); const u = usoAt(), b = melhorConta(), ul = S.limite && u.sessao && u.sessao.ate > M.agora() ? u.sessao.ate : 0;
      return `<div class="b-topo"><span class="cx-av">${ini(c.email)}</span><div><b>${esc(c.email)}</b><small>${c.plano ? `<em class="cx-plano">${esc(c.plano)}</em>` : ''}em uso agora</small></div><span class="j-gd"><span class="j-luz on"></span>ao vivo</span></div>
      <div class="b-aneis">${anel('s', u.sessao, 'Sessão de 5 horas')}${anel('w', u.semana, 'Semana')}</div>
      ${S.limite ? `<div class="b-agora"><b>O que fazer agora</b><div class="b-ops">${b ? `<button class="b-op" data-act="conta-usar:${esc(b.email)}"><span class="cx-av p">${ini(b.email)}</span><div><b>Trocar para ${esc(b.email.split('@')[0])}</b><small>${100 - b.uso.sessao.pct}% livre agora · 1 clique</small></div></button>` : ''}<button class="b-op loc" data-act="usarlocal"><span class="cx-av p g">${ico('cpu')}</span><div><b>Usar a IA local</b><small>sem limite, no seu PC</small></div></button><button class="b-op ${S.avisoConta ? 'on' : ''}" data-act="avisar"><span class="cx-av p g">${ico('relogio')}</span><div><b>${S.avisoConta ? 'Aviso marcado' : 'Esperar'}</b><small>${ul ? 'aviso quando liberar (' + hh(ul) + ')' : 'aviso quando liberar'}</small></div></button></div></div>` : ''}
      <div class="b-sec">Contas neste PC <small>trocar não abre o navegador</small></div><div class="b-tiles">${(D().contas || []).map(x => tileConta(x, c.email, u)).join('')}
        <button class="b-tile novo" data-act="entrar">${ico('mais')}<b>Adicionar conta</b><small>o navegador abre uma vez</small></button></div>
      <div class="cx-pe"><span>${ico('ok')}Claude Code ${esc(c.versao || '—')}</span><button class="cx-lk perigo" data-act="sairconta">Sair da conta</button></div>`; } },
  };
  // system windows (smaller, same frame): preparing PC, last-time conversations, close while working, Claude Code missing
  // saved accounts (main.js: each login saved; switch = 1 click, no browser). Expired: sign in again with e-mail prefilled
  // usage bar (rail foot, 23/10): 5 h and week on SAME bar, very distinct colors, hover says which; option: current account or all
  const usoDe = (l) => ({ s: l && l.sessao ? l.sessao.pct : null, w: l && l.semana ? l.semana.pct : null });
  // both measures on SAME bar: larger behind (full, glowing), smaller inside (thin); inner one always covered.
  // Color = identity (orange 5 h, blue week), not position. Hover on each says what it is.
  const barra2 = (u, dica) => { const S5 = { k: 's', v: u.s, n: 'SESSÃO DE 5 H', d: 'Limite das próximas horas' }, W = { k: 'w', v: u.w, n: 'SEMANA', d: 'Limite da semana' };
    const [fora, dentro] = (W.v || 0) >= (S5.v || 0) ? [W, S5] : [S5, W], dc = (x) => dica ? ` data-dica="${x.n} · ${x.v ?? '—'}%|${x.d} (${dica})"` : '';
    return `<div class="bu-tr"><i class="bu-f c-${fora.k}" style="width:${fora.v || 0}%"${dc(fora)}></i><i class="bu-d c-${dentro.k}" style="width:calc((100% - 6px) * ${(dentro.v || 0) / 100})"${dc(dentro)}></i></div>`; };
  M.barraUso = () => { const C = D().contas || [], todas = S.op.barraUso === 'Todas as contas' && C.length > 1, atual = (D().conta || {}).email;
    let u = usoDe(S.limite ? { sessao: { pct: 100 }, semana: (D().lim || {}).semana } : D().lim), rot = 'conta em uso';
    if (todas) { const L = C.map(x => x.email === atual ? usoDe(D().lim) : usoDe(x.uso)), m = (k) => Math.round(L.reduce((a, x) => a + (x[k] || 0), 0) / L.length); u = { s: m('s'), w: m('w') }; rot = `${C.length} contas somadas`; }
    // bar space never vanishes: no number yet, empty track and "—"
    return `<div class="bu ${S.op.pctUso === false ? 'sem-n' : ''}">${barra2(u, rot)}${S.op.pctUso === false ? '' : `<span class="bu-n"><b class="s" data-dica="SESSÃO DE 5 H|${rot}">${u.s ?? '—'}${u.s != null ? '%' : ''}</b><b class="w" data-dica="SEMANA|${rot}">${u.w ?? '—'}${u.w != null ? '%' : ''}</b></span>`}</div>`; };
  const SIS = {
    entrando: () => { const l = D().login || {}; return { tit: l.erro ? 'Não deu para entrar' : 'Entrando na conta', ico: 'user', corpo: l.erro ? `<div class="j-txt">${esc(l.erro)}</div><div class="j-botoes"><button class="c-btn prim" data-act="entrar">Tentar de novo</button><button class="c-btn" data-act="modal:conta">Voltar para a Conta</button></div>`
      : `<div class="et-esp"><span class="gira"></span><div><b>Conclua no navegador${l.email ? ' com ' + esc(l.email) : ''}</b><small>Quando terminar e fechar o navegador, eu volto sozinho para a Conta.</small></div></div><div class="j-botoes">${l.url ? '<button class="c-btn" data-act="login-abrir">Abrir o navegador de novo</button>' : ''}<button class="c-btn" data-act="login-cancelar">Cancelar</button></div>` }; },
    preparando: () => { const p = D().prep || { et: [], pct: 0 };
      return { tit: 'Preparando', ico: 'atual', corpo: `<div class="j-nota">${esc(p.aviso || 'A cada abertura confiro o que ele precisa no Windows e instalo o que faltar.')}</div>${barra(p.pct)}<div class="j-lista">${p.et.map(x => `<div class="j-it">${x.st === 'ok' ? `<i class="j-ok">${ico('ok')}</i>` : x.st === 'falhou' ? `<i class="j-no">${ico('x')}</i>` : x.st === 'rodando' ? '<i class="gira"></i>' : '<i class="j-luz"></i>'}<span>${esc(x.nome)}</span><small>${esc(x.txt)}</small></div>`).join('')}</div>` }; },
    restaurar: () => { const L = D().sessao || [], n = L.length;
      return { tit: 'Conversas da última vez', ico: 'volta', corpo: `<div class="j-txt">${n === 1 ? '1 conversa estava aberta' : `${n} conversas estavam abertas`} quando você fechou: <b>${L.map(x => esc(x.nome)).join(' · ')}</b>. ${n === 1 ? 'Ela volta' : 'Cada uma volta'} de onde estava.</div><div class="j-botoes"><button class="c-btn prim" data-act="restaurar">${n === 1 ? 'Reabrir' : `Reabrir as ${n}`}<kbd>Enter</kbd></button><button class="c-btn" data-act="fecha">Agora não</button></div>` }; },
    fechar: () => ({ tit: 'Fechar a conversa', ico: 'x', corpo: `<div class="j-txt">O Claude ainda está trabalhando em <b>${esc(D().fecharNome || '')}</b>. Fechar agora interrompe o que ele está fazendo; a conversa fica salva e volta pelo Retomar.</div><div class="j-botoes"><button class="c-btn perigo" data-act="fecharsim">Fechar mesmo assim</button><button class="c-btn prim" data-act="fecha">Cancelar</button></div>` }),
    ausente: () => ({ tit: 'Falta o Claude Code', ico: 'ajuda', corpo: `<div class="j-txt">Não achei o Claude Code neste Windows e a instalação automática falhou (relatorios\\preparar.txt).</div><div class="j-botoes"><button class="c-btn prim" data-act="instalar">Instalar agora</button><button class="c-btn" data-act="fecha">Fechar</button></div>` }),
  };
  M.J = J;
  const base = M.modalHTML;
  M.modalHTML = () => {
    if (SIS[S.modal]) { const s = SIS[S.modal](), nova = M.ultModal !== S.modal; M.ultModal = S.modal; M.ultAba = null; M.janNova = nova; return window.MOLDURA(S.modal + ' sis', { tit: s.tit, ico: s.ico }, `<div class="j-corpo">${s.corpo}</div>`); }
    const j = J[S.modal]; if (!j) { M.ultModal = null; M.ultAba = null; return base(); }
    // animation: window only "appears" on open; switching tab slides content toward chosen tab (user request, 23/10)
    const nova = M.ultModal !== S.modal, dir = !nova && M.ultAba != null && M.ultAba !== S.jAba ? (S.jAba > M.ultAba ? 'slide-dir' : 'slide-esq') : '';
    M.ultModal = S.modal; M.ultAba = S.jAba; M.janNova = nova; M.ultDir = dir ? (dir === 'slide-dir' ? 'slide-baixo' : 'slide-cima') : '';
    const corpo = `${j.abas ? `<div class="j-abas">${j.abas.map((a, i) => `<button class="${i === S.jAba ? 'on' : ''}" data-act="jaba:${i}">${a}${S.modal === 'ia' && ((i === 0 && S.ia === 'claude') || (i === 1 && S.ia === 'local')) ? '<span class="j-pt"></span>' : ''}</button>`).join('')}</div>` : ''}<div class="j-corpo ${j.sem ? 'sem' : ''} ${j.abas ? dir : ''}">${j.html()}</div>`;
    return window.MOLDURA(S.modal, j, corpo);
  };
  const agirBase = M.agir;
  M.agir = (a) => {
    const [k, x, y] = a.split(':');
    if (k === 'modal' && x === 'ia') { S.modal = 'ia'; S.jAba = S.ia === 'local' ? 1 : 0; S.pop = null; return M.draw(); }
    if (k === 'jaba') { S.jAba = +x; return M.draw(); }
    if (k === 'jop') { S.op[x] = y === '' || y == null ? !S.op[x] : y; if (x === 'tema') S.tema = y === 'Claro' ? 'claro' : 'escuro'; if (x === 'tam') S.tam = y.startsWith('Mín') ? 'min' : 'max'; M.salvar && M.salvar('op', x); return M.draw(); }
    if (k === 'memsel') { S.memSel = +x; return M.draw(); }
    if (k === 'jest') { S.est[x] = y; M.salvar && M.salvar('est', x); return M.draw(); }
    if (k === 'jfonte') { S.fonte = x; M.salvar && M.salvar('busca', x); return M.draw(); }
    if ((k === 'pm' || k === 'esf' || k === 'pensar' || k === 'ia') && J[S.modal]) { const m = S.modal, ab = S.jAba; agirBase(a); S.modal = m; S.jAba = ab; return M.draw(); }
    agirBase(a);
  };
  Object.assign(M.CENAS, Object.fromEntries(Object.keys(J).map(n => [n, () => { S.modal = n; }])), {
    'ia-claude': () => { S.modal = 'ia'; S.jAba = 0; }, 'ia-pc': () => { S.modal = 'ia'; S.jAba = 1; }, 'ia-pc-ativa': () => { S.ia = 'local'; S.modal = 'ia'; S.jAba = 1; }, 'ia-limite': () => { S.limite = '09:50'; S.modal = 'ia'; S.jAba = 0; },
    'opcoes-aparencia': () => { S.modal = 'opcoes'; S.jAba = 1; }, 'opcoes-atual': () => { S.pendente = true; S.modal = 'opcoes'; S.jAba = 4; }, 'opcoes-atual-dia': () => { S.pendente = false; S.atual = { estado: 'em-dia', quando: new Date(2026, 10, 3, 9, 41).getTime() }; S.modal = 'opcoes'; S.jAba = 4; },
    'opcoes-atual-baixando': () => { S.pendente = false; S.atual = { estado: 'baixando', pct: 42 }; S.modal = 'opcoes'; S.jAba = 4; }, 'opcoes-atual-erro': () => { S.pendente = false; S.atual = { estado: 'erro', erro: 'sem resposta do GitHub (sem internet?)' }; S.modal = 'opcoes'; S.jAba = 4; },
    'regras-memoria': () => { S.modal = 'regras'; S.jAba = 1; }, 'regras-skills': () => { S.modal = 'regras'; S.jAba = 2; },
    'loja-detalhe': () => { S.modal = 'baixar'; S.jAba = 0; S.L.sel = 'qwen3'; }, 'loja-filtro': () => { S.modal = 'baixar'; S.L.tam = 'cabe'; S.L.caps = 'f'; }, 'loja-livre': () => { S.modal = 'baixar'; S.L.tipo = 'livre'; }, 'loja-busca': () => { S.modal = 'baixar'; S.L.busca = 'coder'; S.L.tipo = null; },
    'loja-modelos': () => { S.modal = 'baixar'; S.jAba = 1; }, 'loja-downloads': () => { S.modal = 'baixar'; S.jAba = 2; }, 'loja-adicionar': () => { S.modal = 'baixar'; S.jAba = 3; }, 'loja-erro': () => { S.modal = 'baixar'; M.D.loja.estado = 'off'; }, 'conta-contas': () => { S.modal = 'conta'; }, 'conta-limite': () => { const s = M.D.lim.sessao; s.pct = 100; S.limite = new Date(s.ate).toTimeString().slice(0, 5); S.modal = 'conta'; }, 'conta-sem': () => { M.D.conta = {}; S.modal = 'conta'; }, 'conta-expirou': () => { M.D.contas[1].expirou = true; S.modal = 'conta'; }, entrando: () => { S.modal = 'entrando'; M.D.login = { email: 'voce@exemplo.com', url: 'x' }; }, 'ia-pc-ligado': () => { S.ia = 'local'; S.modal = 'ia'; S.jAba = 1; Object.assign(M.D.local, { ligado: true, carregado: true }); }, botoes: () => { }, minimo: () => { S.tam = 'min'; S.op.tam = 'Mín. 1080 × 608'; } });
  document.addEventListener('keydown', (e) => { if (e.key === 'F8') { e.preventDefault(); M.agir('modal:est'); } if (e.key === 'F9') { e.preventDefault(); M.agir('modal:conta'); } }, true);
})();
