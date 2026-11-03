// Shared UI pieces (ESCOLHIDA, 23/10/2026): icons, escape, window buttons in user's standard (click/hold) and tooltip.
// Used by prototype (motor.js) and APP (copy in abas\tela\v2\ by copiar-prototipo.ps1). Gestures call
// M.agir('janela:maxi|tam|bandeja|sair'): prototype shows notice, app does it for real.
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = {
    casa: '<path d="M2.5 7.5 8 3l5.5 4.5V13h-3.5V9.5h-4V13H2.5z"/>', mais: '<path d="M8 3v10M3 8h10"/>', x: '<path d="M4 4l8 8M12 4l-8 8"/>',
    pasta: '<path d="M2 4.5h4l1.2 1.5H14v6.5H2z"/>', doc: '<path d="M4 2h5l3 3v9H4zM9 2v3h3"/>',
    cpu: '<path d="M4.5 4.5h7v7h-7zM6.5 2v2.5M9.5 2v2.5M6.5 11.5V14M9.5 11.5V14M2 6.5h2.5M2 9.5h2.5M11.5 6.5H14M11.5 9.5H14"/>',
    nuvem: '<path d="M4.5 12h7a2.5 2.5 0 0 0 .3-5A3.5 3.5 0 0 0 5 6.2 3 3 0 0 0 4.5 12z"/>',
    eng: '<g transform="scale(.6667)"><path vector-effect="non-scaling-stroke" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle vector-effect="non-scaling-stroke" cx="12" cy="12" r="3"/></g>',
    ajuda: '<path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1M8 11.2v.1"/>',
    busca: '<path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM10.6 10.6 14 14"/>', chat: '<path d="M2.5 3h11v8h-7l-3 2.5V11h-1z"/>',
    play: '<path d="M5 3.5v9l7-4.5z"/>', volta: '<path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5V5h2.5"/>', seta: '<path d="M6 3.5 10.5 8 6 12.5"/>',
    baixo: '<path d="M4 6l4 4 4-4"/>', lapis: '<path d="M10.5 2.5l3 3L6 13H3v-3z"/>', clipe: '<path d="M10.5 5 6 9.5a1.4 1.4 0 0 0 2 2L13 6.5a2.8 2.8 0 0 0-4-4L4 7.5a4.2 4.2 0 0 0 6 6L13.5 10"/>',
    cima: '<path d="M8 13V3M4 7l4-4 4 4"/>', parar: '<path d="M5 5h6v6H5z"/>', escudo: '<path d="M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z"/>',
    relogio: '<path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 4.8V8l2.2 1.6"/>', graf: '<path d="M3 13V8M6.5 13V4M10 13V9.5M13.5 13V6"/>',
    ok: '<path d="M3.5 8.5l3 3 6-7"/>', seta2: '<path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"/>', atual: '<path d="M8 2.5v7M5 6.5l3 3 3-3M3 12.5h10"/>',
    painel: '<path d="M2.5 3h11v10h-11zM10 3v10"/>', trilho: '<path d="M2.5 3h11v10h-11zM6 3v10"/>', raio: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>',
    min: '<path d="M3.5 8h9"/>', maxi: '<path d="M3.5 3.5h9v9h-9z"/>', rest: '<path d="M5.5 5.5h7v7h-7zM3.5 10.5v-7h7"/>', tam: '<path d="M1.5 3.5h13v9h-13z"/><path d="M4.5 6h7v4h-7z"/>',
    lampada: '<path d="M6 12.5h4M6.5 14h3M8 2a4 4 0 0 0-2.3 7.3c.5.4.8.9.8 1.5V11h3v-.2c0-.6.3-1.1.8-1.5A4 4 0 0 0 8 2z"/>', user: '<path d="M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 13.5c.6-2.5 2.6-3.5 5-3.5s4.4 1 5 3.5"/>',
  };
  const ico = (n, c = '') => `<svg class="ico ${c}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;
  const ast = (g = '✻') => `<span class="ast">${g}</span>`;
  window.B = { esc, I, ico, ast, ligar(M) {
  const S = M.S;
  // window buttons in user's standard (interface-polida): bar-height cells, only icon lights; ExitLag size (Max./Min.);
  // close 40 at edge: click hides to tray, HOLD 1 s quits (color grows from center)
  const botoesJanela = () => `<div class="win"><button class="bc" data-act="min" data-dica="MINIMIZAR|Clique: vai para a barra de tarefas">${ico('min')}</button><button class="bc tam" data-segurar="tam" data-dica="${S.maxi ? 'RESTAURAR' : 'MAXIMIZAR'}|Clique: ${S.maxi ? 'volta ao tamanho escolhido' : 'ocupa a tela toda'}|Segure 1 s: tamanho ${S.tam === 'max' ? 'Mín. 1080 × 608 (tudo × 0,75)' : 'Máx. 1440 × 810'}|Agora: ${S.tam === 'max' ? 'Máx. 1440 × 810' : 'Mín. 1080 × 608'}"><i class="enche"></i>${ico(S.maxi ? 'rest' : 'maxi')}</button><button class="bc fechar" data-segurar="sair" data-dica="FECHAR|Clique: esconde na bandeja (as conversas continuam)|Segure 1 s: sai do programa"><i class="enche"></i>${ico('x')}</button></div>`;
  // click and hold (user's standard): release before 1 s = click; 1 s held = other action (color fills from center)
  const GESTO = { sair: { clique: () => M.agir('janela:bandeja'), segurar: () => M.agir('janela:sair') }, tam: { clique: () => M.agir('janela:maxi'), segurar: () => M.agir('janela:tam') } };
  let seg = null;
  document.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-segurar]'); if (!b) return; const g = GESTO[b.dataset.segurar]; b.classList.add('segurando'); seg = { b, t: setTimeout(() => { b.classList.remove('segurando'); seg = null; g.segurar(); }, 1000), g }; });
  document.addEventListener('pointerup', () => { if (!seg) return; clearTimeout(seg.t); seg.b.classList.remove('segurando'); const g = seg.g; seg = null; g.clique(); });
  // tooltip after 0.6 s rest: uppercase title + what each gesture does. Common tooltips (title) use same box: Windows one
  // went outside the app (23/10, user request)
  let dt = null; document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-dica],[title],[data-tit],[data-act]'); clearTimeout(dt); const v = document.querySelector('.dica'); if (v) v.remove(); if (!el) return;
    if (!el.dataset.dica && !el.title && !el.dataset.tit) { const d = window.dicaDe ? window.dicaDe(el.dataset.act || '') : ''; if (!d) return; el.dataset.dica = d; }   // 25/10: every element explains what it does
    if (el.title) { el.dataset.tit = el.title; el.removeAttribute('title'); }
    dt = setTimeout(() => { if (!el.isConnected) return; const [tit, ...ls] = el.dataset.dica ? el.dataset.dica.split('|') : ['', el.dataset.tit], r = el.getBoundingClientRect(), d = document.createElement('div'); d.className = 'dica'; d.innerHTML = (tit ? `<b>${esc(tit)}</b>` : '') + ls.map(x => `<div>${esc(x)}</div>`).join(''); document.body.appendChild(d); const w = d.offsetWidth, h = d.offsetHeight, cima = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h >= 8;   // edge: always inside window
    d.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px'; d.style.top = Math.max(8, Math.min(innerHeight - h - 8, cima ? r.top - 6 - h : r.bottom + 6)) + 'px'; }, 600); });
  return botoesJanela; } };
})();
// 25/10 (user request): tooltip for every clickable lacking one. Key = data-act prefix; function gets the rest.
(function () {
  const T = { est: 'ESTATÍSTICAS|Uso de tokens e conversas|F8', opcoes: 'OPÇÕES|F2', ajuda: 'ATALHOS DE TECLADO|F1', conta: 'CONTA|F9', ia: 'IA|Claude ou modelo no seu PC|F4', regras: 'REGRAS E MEMÓRIA|Regras da casa, memória do Claude e skills' };
  const D = {
    aba: 'CONVERSA ABERTA|Clique: vai para ela', abre: 'Mostra os detalhes desta ação', abrirp: 'Abre este projeto',
    atalho: (v) => v === 'programa' ? 'Abre o programa do projeto (.exe)' : v === 'relatorios' ? 'Abre a pasta de relatórios (logs)' : 'Atalho do projeto',
    cmd: 'Usa este comando ou skill', 'conta-usar': 'Troca para esta conta (sem abrir o navegador)', continuar: 'CONTINUAR|Retoma a última conversa deste projeto de onde parou|Enter',
    entrar: 'Entra numa conta do Claude (abre o navegador)', esf: 'PENSAMENTO|Quanto a IA pensa antes de responder: mais = melhor e mais lento', fecha: 'Fecha esta janela',
    'fecha-fora': '', fecharsim: 'Fecha mesmo com conversas trabalhando',
    fixar: 'Fixa ou desafixa o projeto no topo', 'gguf-adicionar': 'Adiciona este arquivo .gguf à IA local', 'gguf-escolher': 'Escolhe um modelo .gguf do disco',
    grupo: 'GRUPO|Clique: abre ou fecha|Arraste projetos para dentro', instalar: 'Instala o Claude Code', jaba: 'Troca de aba nesta janela', jest: 'Muda o período das estatísticas',
    jop: 'Muda esta opção (vale na hora)', Lachado: 'Adiciona à IA local este modelo achado no PC', Lbaixar: 'Baixa esta versão do modelo', Lcap: 'Filtra por capacidade', Lfonte: 'Filtra pela origem do modelo',
    livre: 'NOVA CONVERSA|Chat livre, fora de projeto|Ctrl+T · fechado, fica em Rascunhos', Llimpar: 'Tira da lista os downloads prontos', Lloja: 'Abre a loja de modelos locais', Lnada: '',
    'login-abrir': 'Abre o navegador de novo para entrar', 'login-cancelar': 'Cancela a entrada na conta', Lsel: 'Mostra os detalhes deste modelo', Lset: 'Filtra pelo tipo de modelo',
    Lsite: 'Abre a página do modelo no navegador', Lvar: 'Escolhe o tamanho ou versão do modelo', 'mcp-pasta': 'Escolhe a pasta com o mcp.json', memsel: 'Mostra este arquivo',
    modal: (v) => T[v] || '', modelos: 'Baixar e gerenciar modelos locais', mover: 'Move o projeto para este grupo', mx: 'Mais opções', nivel: 'Nível de economia da IA local',
    nova: 'NOVA CONVERSA|Começa uma conversa nova neste projeto', novogrupo: 'Cria um grupo para organizar projetos', ollama: 'Liga o Ollama (IA local)',
    parada: 'Abre o PARADA.md e o PRA-TESTAR.md no Bloco de notas', pasta: 'Abre a pasta do projeto no Explorer', 'pasta-por': 'Adiciona uma pasta de onde os projetos são lidos',
    'pasta-tirar': 'Tira esta pasta da lista', pedido: 'Escreve este pedido pronto na caixa', pensar: 'Responder rápido ou pensar antes', perm: 'Responde ao pedido de permissão',
    permresp: 'Envia as respostas escolhidas', pm: 'Escolhe este modelo', pp: 'Responder rápido ou pensar antes', rascunho: 'RASCUNHO|Chat livre guardado|Clique: reabre de onde parou',
    rasctodos: 'Mostra ou esconde os rascunhos mais antigos', 'regra-editar': 'Abre no Bloco de notas', 'regra-pasta': 'Abre a pasta deste arquivo', reiniciar: 'Reinicia o programa já atualizado',
    restaurar: 'Reabre as conversas que estavam abertas', resumir: 'Resume a conversa para liberar memória', retomar: 'Volta nesta conversa de onde parou', sairconta: 'Sai desta conta neste PC',
    sel: 'PROJETO|Clique: mostra a ficha|2 cliques ou Enter: abre a conversa|⋯: fixar, renomear, mover', term: 'Alterna entre o chat e o terminal do Claude Code',
    tstab: 'PARA TESTAR|Clique: abre a lista com caixas|Os marcados vão como testados na próxima mensagem', usarlocal: 'Passa esta conversa para a IA local (no seu PC)', usarmod: 'Usa este modelo na IA local',
  };
  window.DICAS = D;   // outside M: app recreates M (ponte.js) after base.js
  window.dicaDe = (act) => { const i = act.indexOf(':'), k = i < 0 ? act : act.slice(0, i), v = i < 0 ? '' : act.slice(i + 1), d = D[k]; return typeof d === 'function' ? d(v) : d || ''; };
})();
