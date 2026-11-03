// Motor comum das 3 propostas da interface 2 (22/10/2026). Dados de exemplo, estado, pedaços de tela iguais nas 3
// (conversa, linha "trabalhando", caixa de mensagem, janelinha de modelo, cortina do limite, janelas) e teclado.
// Cada proposta define window.LAYOUT(S, M) e o próprio CSS. Estado por endereço: proposta-X.html#cena=trabalhando
(function () {
  const { esc, I, ico, ast } = window.B;
  const ROT = { testar: 'você testa', decidir: 'você decide', livre: 'livre', parado: 'parado' };

  const { P, D, CONVERSA } = window.DEMO2;
  const MODELOS = [['fable', 'Fable 5.1', 'o mais capaz, para trabalho longo e difícil'], ['opus', 'Opus 5.5', 'raciocínio complexo · o de sempre'], ['sonnet', 'Sonnet 5.5', 'dia a dia, mais rápido'], ['haiku', 'Haiku 5.5', 'rápido, para coisa simples']];
  const LOCAIS = [['qwen3:8b', '5 GB · cabe na placa'], ['Qwen2.5-Coder-7B', '6 GB · cabe na placa']];
  const ESF = [['low', 'Baixo'], ['medium', 'Médio'], ['high', 'Alto'], ['xhigh', 'Muito alto'], ['max', 'Máximo']];
  const nomeMod = (id) => (MODELOS.find(m => m[0] === id) || [0, id])[1];
  const ehLocal = (id) => !MODELOS.some(m => m[0] === id);

  // ---- estado ----
  const S = {
    ia: 'claude', fixos: ['FCC'], alias: {}, grupos: [{ id: 'g1', n: 'Programas da casa', ab: true, itens: ['Painel', 'Controles', 'Bancada', 'Teclado'] }, { id: 'g2', n: 'Áudio e vídeo', ab: true, itens: ['Som', 'Espelho', 'Narrador'] }],
    tam: 'max', maxi: false, baixando: { 'gemma3:12b': 42 }, jAba: 0, sel: 0, ativa: null, abas: [], modal: null, pop: null, popM: 1, mSel: 0, toast: '', busca: '', painel: true, trilho: true, tema: 'escuro',
    modelo: 'sonnet', esf: 'medium', pensar: 1, limite: null, pendente: false, conta: 'ok', prep: 0, paleta: false, pSel: 0, vazio: false,
  };
  const p = () => S.vazio ? null : P[S.sel];
  const aba = () => S.abas.find(a => a.id === S.ativa) || null;
  function abrir(q, extra = {}) {
    const ja = S.abas.find(a => a.p === q);
    if (ja) { S.ativa = ja.id; toast(`${q.n} já está aberto.`); return ja; }
    const t = { id: 'a' + (S.abas.length + 1), p: q, itens: CONVERSA(), estado: 'esperando', verPassos: false, editando: null, modelo: extra.modelo || S.modelo, esf: S.esf, tok: 48200, tps: '', t0: Date.now() - 12000, seg: 12, texto: '', ...extra };
    S.abas.push(t); S.ativa = t.id; S.pop = null; return t;
  }
  let tt; function toast(m) { S.toast = m; clearTimeout(tt); tt = setTimeout(() => { S.toast = ''; M.draw(); }, 3500); }

  // ---- pedaços iguais nas 3 propostas ----
  const GER = { Leu: 'Lendo', Editou: 'Editando', Buscou: 'Buscando', Rodou: 'Rodando' };
  function conversaHTML(t) {
    let h = '', g = [];
    const fecha = () => { if (!g.length) return; const vs = [...new Set(g.map(x => x.verbo))].join(' e '); h += `<button class="c-lin">${ico('doc')}${vs} ${g.length} ${g.length > 1 ? 'itens' : 'item'}${ico('seta', 'seta')}</button>`; g = []; };
    t.itens.forEach((l, i) => {
      if (l.k !== 'ferr') fecha();
      if (!t.verPassos && (l.k === 'ferr' || l.k === 'pensou')) return;
      if (t.editando != null && i === t.editando) h += '<div class="c-sai">';   // o que some ao reenviar fica apagado
      if (l.k === 'eu') h += `<div class="c-eu">${esc(l.txt)}<button class="c-ed" data-act="editar:${i}" title="Editar e reenviar">${ico('lapis')}</button></div>`;
      else if (l.k === 'ia') h += `<div class="c-ia">${l.html}</div>`;
      else if (l.k === 'pensou') h += `<button class="c-lin">${ico('lampada')}Pensou por ${l.seg} s${ico('seta', 'seta')}</button>`;
      else if (l.k === 'ferr') g.push(l);
      else if (l.k === 'perm') h += `<div class="c-perm"><div class="tt">${ico('escudo')}O Claude quer rodar um comando</div><div class="oq">${esc(l.txt)}<span>PowerShell</span></div><div class="bs"><button class="c-btn prim" data-act="perm">Permitir <kbd>1</kbd></button><button class="c-btn" data-act="perm">Sempre nesta pasta <kbd>2</kbd></button><button class="c-btn" data-act="perm">Negar <kbd>Esc</kbd></button></div></div>`;
      else if (l.k === 'feito') h += `<div class="c-feito">${ico('ok')}${esc(l.txt)}</div>`;
    });
    fecha(); if (t.editando != null) h += '</div>';
    if (t.estado === 'trabalhando') {
      const ul = t.itens[t.itens.length - 1], at = ul && ul.k === 'ferr' && !ul.res ? `${GER[ul.verbo] || ul.verbo} ${ul.alvo}` : 'Pensando';
      const seg = Math.max(1, Math.round((Date.now() - t.t0) / 1000));
      h += `<div class="c-trab">${ast(M.giro())}<div class="c-trab-t"><button class="c-ativ ${t.verPassos ? 'ab' : ''}" data-act="passos"><span>${esc(at)}</span>${ico('seta', 'seta')}</button><div class="c-trab-s">${seg} s pensando${ehLocal(t.modelo) ? ' · 14 tokens/s' : ''} · Esc interrompe</div></div></div>`;
    }
    return h;
  }
  function chipModelo(t, onde) {
    const m = t ? t.modelo : S.modelo, loc = ehLocal(m), e = t ? t.esf : S.esf;
    return `<button class="chip ${loc ? 'loc' : ''} ${S.pop === onde ? 'aberto' : ''}" data-act="pop:${onde}" title="Modelo e pensamento (F4)">${ico(loc ? 'cpu' : 'nuvem')}<b>${esc(loc ? m : nomeMod(m))}</b><span class="e">${loc ? ['Rápido', 'Normal', 'Pensar'][+S.pensar || 0] : (ESF.find(x => x[0] === e) || [0, ''])[1]}</span>${ico('baixo', 'mini')}</button>`;
  }
  function popHTML(t) {
    const m = t ? t.modelo : S.modelo, loc = ehLocal(m);
    let h = `<div class="pop" data-parar="1"><div class="pop-tit">Claude <span>usa o limite da conta</span></div>`;
    MODELOS.forEach((x, i) => { h += `<div class="pop-it ${i === S.popM ? 'hl' : ''} ${S.limite ? 'off' : ''}" data-act="pm:${x[0]}"><span class="pop-n">${x[1]}</span><span class="pop-d">${S.limite ? 'volta às ' + S.limite : x[2]}</span>${x[0] === m ? ico('ok', 'v') : ''}</div>`; });
    h += `<div class="pop-sep"></div><div class="pop-tit">No seu PC <span>sem limite · aparece na hora</span></div>`;
    LOCAIS.forEach((x, i) => { h += `<div class="pop-it loc ${i + 4 === S.popM ? 'hl' : ''}" data-act="pm:${x[0]}"><span class="pop-n">${ico('cpu')}${x[0]}</span><span class="pop-d">${x[1]}</span>${x[0] === m ? ico('ok', 'v') : ''}</div>`; });
    h += `<div class="pop-it lnk" data-act="modelos"><span class="pop-n">${ico('atual')}Baixar e gerenciar modelos…</span></div><div class="pop-sep"></div>`;
    h += loc ? `<div class="pop-tit">Modo</div><div class="seg2">${['Rápido', 'Normal', 'Pensar'].map((n, i) => `<button class="${(+S.pensar || 0) === i ? 'on' : ''}" data-act="pensar:${i}">${n}</button>`).join('')}</div>`
      : `<div class="pop-tit">Pensamento <b>${(ESF.find(x => x[0] === (t ? t.esf : S.esf)) || [0, ''])[1]}</b></div><div class="seg">${ESF.map(x => `<button class="${x[0] === (t ? t.esf : S.esf) ? 'on' : ''}" data-act="esf:${x[0]}"><i style="height:${4 + ESF.indexOf(x) * 3}px"></i></button>`).join('')}</div>`;
    return h + `<div class="pop-rod"><span>${t ? 'Vale para esta conversa' : 'Vale para as próximas'}</span><span>↑↓ modelo · ←→ ${loc ? 'modo' : 'pensamento'}</span></div></div>`;
  }
  function caixaHTML(t) {
    const ocupado = t.estado === 'trabalhando';
    return `<div class="caixa ${t.editando != null ? 'editando' : ''}">${t.editando != null ? `<div class="ed-aviso">${ico('lapis')}Editando a mensagem · Enter reenvia · Esc cancela</div>` : ''}<div class="c-anxs">${window.CHAT.anexosHTML(t.anexos, true)}</div><div class="txt">${t.texto ? esc(t.texto) : `<span class="ph">${ocupado ? 'Escreva enquanto ele trabalha…' : 'Responda ao Claude…'}</span>`}</div>
      <div class="lin"><button class="ib">${ico('clipe')}</button><button class="ib" style="font-weight:600">/</button><span class="tk">${(t.tok / 1000).toFixed(0)} mil tokens</span>${ehLocal(t.modelo) ? '<span class="tk">14 tokens/s</span>' : ''}${M.chipModelo(t, 'caixa')}
      ${ocupado ? `<button class="env parar" data-act="parar">${ico('parar')}</button>` : `<button class="env ${t.texto ? '' : 'off'}" data-act="enviar">${ico('cima')}</button>`}</div>${S.pop === 'caixa' ? popHTML(t) : ''}</div>`;
  }
  function cortinaHTML(t) {
    if (!S.limite || ehLocal(t.modelo)) return '';
    return `<div class="cortina"><div class="ct-caixa"><div class="ct-ic">${ico('relogio')}</div><div class="ct-tit">Limite de uso atingido</div><div class="ct-txt">Este projeto só pode ser usado com o Claude quando o limite voltar, <b>às ${S.limite}</b> (daqui a 2 h 05 min).</div>
      <button class="c-btn prim" data-act="usarlocal">${ico('cpu')}Usar a IA local</button><div class="ct-dica">A IA local roda no seu PC e não depende do limite.</div></div></div>`;
  }
  function painelHTML(t) {
    const q = t.p;
    let h = `<div class="pn-cab">${esc(q.n)}<button class="ib" data-act="painel" title="Esconder (Ctrl+B)">${ico('painel')}</button></div><div class="pn-sub"><span class="pil p-${q.st}">${ROT[q.st]}</span>PARADA de ${q.dt} (${q.id})</div>`;
    if (q.voce) h += `<h4>Você precisa</h4><div class="pn-txt">${esc(q.voce)}</div>`;
    if (q.itens.length) { h += `<h4>Para testar<span>${q.itens.length}</span></h4>`; q.itens.forEach(x => { h += `<div class="pn-item"><span>${esc(x)}</span><button class="ib ok">${ico('ok')}</button><button class="ib no">${ico('x')}</button></div>`; }); }
    return h + `<h4>Atalhos</h4><div class="pn-ats"><button>${ico('play')}Programa</button><button>${ico('pasta')}Pasta</button><button>${ico('doc')}PARADA</button><button>${ico('doc')}Relatórios</button></div>`;
  }
  // janelas por cima (gosto dele: telas extras como janela)
  function modalHTML() {
    if (!S.modal) return '';
    let h = '';
    if (S.modal === 'opcoes') {
      const L = [['Tema', S.tema], ['Ao fechar o programa', 'lembrar as abas'], ['Texto ao continuar', 'Continue de onde parou (docs\\PARADA.md).'], ['Passos do Claude', 'escondidos (a seta mostra)'], ['Código nas respostas', 'escondido, só texto'], ['Pastas de projetos', 'D:\\Projetos']];
      h = `<div class="m-caixa"><div class="m-cab">Opções<button class="ib" data-act="fecha">${ico('x')}</button></div>${L.map((x, i) => `<div class="m-op ${i === S.mSel ? 'hl' : ''}"><span>${x[0]}</span><b>${esc(x[1])}</b>${ico('seta', 'seta')}</div>`).join('')}<div class="m-rod">↑↓ escolhe · Enter muda · Esc fecha</div></div>`;
    } else if (S.modal === 'preparando') {
      const et = ['Visual C++', 'winget', 'Claude Code', 'Regras e skills', 'Ollama (IA local)', 'Conta'];
      h = `<div class="m-caixa"><div class="m-cab">Preparando</div>${et.map((x, i) => `<div class="m-et ${i < 3 ? 'ok' : ''}">${i < 3 ? ico('ok') : '<i class="pt"></i>'}<span>${x}</span><b>${i < 3 ? 'ok' : 'esperando'}</b></div>`).join('')}<div class="m-barra"><i style="width:50%"></i></div><div class="m-rod">Num PC recém-formatado a 1ª vez leva alguns minutos; depois, 1 segundo.</div></div>`;
    } else if (S.modal === 'atualizacao') {
      h = `<div class="m-caixa"><div class="m-cab">Versão nova pronta<button class="ib" data-act="fecha">${ico('x')}</button></div><div class="m-txt">O programa novo já foi testado (autoteste e aparência). Ele entra quando você fechar o programa: abre de novo sozinho, com as abas, e a conversa que estava trabalhando continua.</div>
        <div class="m-botoes"><button class="c-btn prim" data-act="fecha">Reiniciar agora</button><button class="c-btn" data-act="fecha">Quando eu fechar</button></div></div>`;
    } else if (S.modal === 'ajuda') {
      const A = [['Enter / 2 cliques', 'abre o projeto (um projeto, uma aba)'], ['Ctrl+Tab · Ctrl+1…9', 'troca de conversa'], ['F4', 'modelo e pensamento'], ['F2 · F8 · F9', 'opções · estatísticas · conta'], ['Ctrl+B', 'painel do projeto'], ['Esc', 'interrompe / cancela a edição']];
      h = `<div class="m-caixa"><div class="m-cab">Atalhos<button class="ib" data-act="fecha">${ico('x')}</button></div>${A.map(x => `<div class="m-op"><kbd>${x[0]}</kbd><b>${x[1]}</b></div>`).join('')}</div>`;
    }
    return `<div class="modal" data-act="fecha-fora">${h}</div>`;
  }

  // ---- ações ----
  function agir(a) {
    const [k, v] = [a.split(':')[0], a.split(':').slice(1).join(':')]; const t = aba();
    if (k !== 'pop' && k !== 'pm' && k !== 'esf' && k !== 'pensar') S.pop = null;
    if (k === 'sel') { S.sel = +v; S.ativa = null; }
    else if (k === 'abrir' || k === 'continuar' || k === 'nova' || k === 'retomar') { S.paleta = false; abrir(P[parseInt(v)]); }
    else if (k === 'ia') { S.ia = v; const t = aba(); if (t) t.modelo = v === 'local' ? 'qwen3:8b' : S.modelo; }
    else if (k === 'jbaixar') { if (S.baixando[v] != null) delete S.baixando[v]; else S.baixando[v] = 3; }
    else if (['usarmod', 'apagarmod', 'ollama', 'resumir', 'reiniciar', 'atual-procurar', 'pasta-por', 'pasta-tirar', 'regra-editar', 'regra-pasta', 'esquecer', 'skill-abrir', 'gguf-escolher', 'gguf-adicionar', 'entrar', 'sairconta'].includes(k)) toast('No programa: ' + k + (v ? ' ' + v : '') + '.');
    else if (k === 'livre' || k === 'pasta' || k === 'editar-arq' || k === 'fecharaba') toast(k === 'livre' ? 'Chat livre (no programa: abre uma conversa nova).' : k === 'fecharaba' ? 'Fecha a conversa.' : 'No programa: abre no Explorer / Bloco de notas.');
    else if (k === 'aba') S.ativa = v;
    else if (k === 'inicio') S.ativa = null;
    else if (k === 'fechar') { S.abas = S.abas.filter(x => x.id !== v); if (S.ativa === v) S.ativa = S.abas.length ? S.abas[S.abas.length - 1].id : null; }
    else if (k === 'pop') S.pop = S.pop === v ? null : v;
    else if (k === 'pm') { const loc = ehLocal(v); if (t && loc !== ehLocal(t.modelo)) { const q = t.p; S.abas = S.abas.filter(x => x !== t); abrir(q, { modelo: v, itens: [], estado: 'esperando' }); } else if (t) t.modelo = v; else S.modelo = v; S.pop = null; }
    else if (k === 'esf') { if (t) t.esf = v; else S.esf = v; }
    else if (k === 'pensar') S.pensar = +v || 0;
    else if (k === 'passos') { if (t) t.verPassos = !t.verPassos; }
    else if (k === 'editar') { if (t) { const s = window.CHAT.separaAnexos(t.itens[+v].txt); t.editando = { i: +v }; t.anexos = s.A; t.texto = s.txt; } }
    else if (k === 'enviar') { if (t && t.texto) { if (t.editando) t.itens.splice(t.editando.i); t.itens.push({ k: 'eu', txt: t.texto }); t.texto = ''; t.editando = null; t.estado = 'trabalhando'; t.t0 = Date.now(); } }
    else if (k === 'parar') { if (t) t.estado = 'esperando'; }
    else if (k === 'perm') { if (t) { const pm = t.itens.find(x => x.k === 'perm' && !x.resp); if (pm) pm.resp = 'ok'; t.estado = 'trabalhando'; } }
    else if (k === 'usarlocal') { S.pop = 'caixa'; S.popM = 4; }
    else if (k === 'painel') S.painel = !S.painel;
    else if (k === 'trilho') S.trilho = !S.trilho;
    else if (k === 'modal') { const [m, ab] = v.split(':'); S.modal = m; S.mSel = 0; S.jAba = +ab || 0; S.pop = null; }
    else if (k === 'fecha' || k === 'fecha-fora') S.modal = null;
    else if (k === 'paleta') { S.paleta = !S.paleta; S.pSel = 0; }
    else if (k === 'atualizar') S.modal = 'atualizacao';
    else if (k === 'janela') { if (v === 'maxi') { S.maxi = !S.maxi; toast(S.maxi ? 'Maximizado (no programa: ocupa a tela toda).' : 'Restaurado.'); } else if (v === 'tam') { S.tam = S.tam === 'max' ? 'min' : 'max'; S.maxi = false; toast(S.tam === 'max' ? 'Tamanho Máx. (1440 × 810)' : 'Tamanho Mín. (1080 × 608): a tela inteira × 0,75'); } else if (v === 'bandeja') toast('Escondido na bandeja: as conversas continuam. Segure 1 s para sair.'); else if (v === 'sair') toast('Saindo do programa… (no programa: fecha de verdade)'); }
    else if (k === 'min') toast('Minimizado (no programa vai para a barra de tarefas).');
    else if (k === 'jaba') S.jAba = +v;
    else if ((k === 'modelos' || k === 'est') && window.MOLDURA) { S.modal = k === 'est' ? 'est' : 'baixar'; S.jAba = 0; S.pop = null; }
    else if (k === 'modelos' || k === 'est') toast(k === 'est' ? 'Estatísticas: a janela de sempre (já escolhida).' : 'Modelos: a janela de sempre (já escolhida).');
    M.draw();
  }
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (!el) { if (S.pop) { S.pop = null; M.draw(); } return; } if (el.dataset.act === 'fecha-fora' && e.target.closest('.m-caixa,.jan')) return; e.stopPropagation(); M.agir(el.dataset.act); });
  document.addEventListener('dblclick', (e) => { const el = e.target.closest('[data-proj]'); if (el) agir('abrir:' + el.dataset.proj); });
  document.addEventListener('keydown', (e) => {
    const k = e.key, t = aba();
    if (S.modal) { if (k === 'Escape') S.modal = null; if (k === 'ArrowDown') S.mSel = Math.min(5, S.mSel + 1); if (k === 'ArrowUp') S.mSel = Math.max(0, S.mSel - 1); e.preventDefault(); return M.draw(); }
    if (e.ctrlKey && (k === 'k' || k === 'K')) { e.preventDefault(); return agir('paleta'); }
    if (S.paleta) { if (k === 'Escape') S.paleta = false; if (k === 'ArrowDown') S.pSel = Math.min(P.length - 1, S.pSel + 1); if (k === 'ArrowUp') S.pSel = Math.max(0, S.pSel - 1); if (k === 'Enter') { S.paleta = false; abrir(P[S.pSel]); } e.preventDefault(); return M.draw(); }
    if (k === 'F4') { e.preventDefault(); return M.agir(M.F4 || ('pop:' + (t ? 'caixa' : 'barra'))); }
    if (S.pop) { if (k === 'Escape') S.pop = null; if (k === 'ArrowDown') S.popM = Math.min(5, S.popM + 1); if (k === 'ArrowUp') S.popM = Math.max(0, S.popM - 1); e.preventDefault(); return M.draw(); }
    if (k === 'F1') { e.preventDefault(); return agir('modal:ajuda'); } if (k === 'F2') { e.preventDefault(); return agir('modal:opcoes'); }
    if (e.ctrlKey && k === 'Tab') { e.preventDefault(); const ids = [null, ...S.abas.map(a => a.id)]; S.ativa = ids[(ids.indexOf(S.ativa) + 1) % ids.length]; return M.draw(); }
    if (e.ctrlKey && /^[1-9]$/.test(k)) { e.preventDefault(); const a = S.abas[+k - 1]; if (a) S.ativa = a.id; return M.draw(); }
    if (e.ctrlKey && (k === 'b' || k === 'B')) { e.preventDefault(); return agir('painel'); }
    if (t) { if (k === 'Escape') { if (t.editando) { t.editando = null; t.texto = ''; } else t.estado = 'esperando'; } else if (k === 'Enter') agir('enviar'); else if (k === 'Backspace') t.texto = t.texto.slice(0, -1); else if (k.length === 1 && !e.ctrlKey) t.texto += k; e.preventDefault(); return M.draw(); }
    if (k === 'ArrowDown' || k === 'ArrowRight') S.sel = (S.sel + 1) % P.length; else if (k === 'ArrowUp' || k === 'ArrowLeft') S.sel = (S.sel - 1 + P.length) % P.length;
    else if (k === 'Enter') abrir(p()); else return; e.preventDefault(); M.draw();
  });

  // ---- cenas (todas as telas e estados) ----
  const CENAS = {
    inicio: () => { }, ficha: () => { S.sel = 0; }, vazio: () => { S.vazio = true; },
    abertas: () => { abrir(P[0]); abrir(P[2]); S.ativa = null; S.sel = 1; },
    chat: () => { abrir(P[0]); }, trabalhando: () => { abrir(P[0], { estado: 'trabalhando' }); },
    passos: () => { const t = abrir(P[0], { estado: 'trabalhando' }); t.verPassos = true; t.itens.push({ k: 'ferr', verbo: 'Leu', alvo: 'docs\\PARADA.md', res: '' }); },
    acao: () => { const t = abrir(P[0], { estado: 'trabalhando' }); t.itens.push({ k: 'ferr', verbo: 'Leu', alvo: 'docs\\PARADA.md', res: '' }); },
    editar: () => { const t = abrir(P[0]); const s = window.CHAT.separaAnexos(t.itens[4].txt); t.editando = { i: 4 }; t.anexos = s.A; t.texto = s.txt; },
    permissao: () => { const t = abrir(P[0], { estado: 'trabalhando' }); t.estado = 'pede'; t.itens.push({ k: 'perm', req: 'r1', tool: 'PowerShell', input: { description: 'Rodar o autoteste do .exe novo', command: 'iniciar-claude.exe --autoteste' }, resumo: 'Rodar o autoteste do .exe novo', escolhas: {} }); },
    local: () => { S.ia = 'local'; abrir(P[0], { modelo: 'qwen3:8b', estado: 'trabalhando' }); },
    limite: () => { window.RELOGIO_TESTE = +new Date(2026, 9, 25, 7, 38); S.limite = '09:50'; abrir(P[0]); },   // relógio fixo: a foto não depende da hora
    opcoes: () => { S.modal = 'opcoes'; }, ajuda: () => { S.modal = 'ajuda'; }, preparando: () => { S.modal = 'preparando'; }, restaurar: () => { S.modal = 'restaurar'; }, fechar: () => { abrir(P[0], { estado: 'trabalhando' }); S.modal = 'fechar'; }, ausente: () => { S.modal = 'ausente'; },
    atualizacao: () => { S.pendente = true; abrir(P[0]); },
  };
  const botoesJanela = B.ligar({ get S() { return S; }, agir: (a) => M.agir(a) });
  // conversa desenhada pelo chat.js DO PROGRAMA (mesmo código, mesmo conversa.css): o protótipo só passa o conteúdo pronto
  const chatHTML = (t) => { const C = window.CHAT; t.abertos = t.abertos || {}; t.rel = t.rel || {}; t.vazio = '';
    const lim = S.limite && !ehLocal(t.modelo);
    return `<div class="chatC ativa">${C.esqueletoHTML({ itens: C.itensBlocos(t, !!t.verPassos).map(b => `<div class="c-bl">${b}</div>`).join(''), slot: C.rodapeHTML(t, true), ph: t.estado === 'trabalhando' || t.estado === 'pede' ? 'Escreva enquanto ele trabalha…' : 'Responda ao Claude…', texto: esc(t.texto || ''), anexos: C.anexosHTML(t.anexos, true),
      lin: C.linhaHTML(t, false), painel: S.painel ? C.painelHTML(t, P) : '', semPainel: !S.painel, cortina: lim ? C.cortinaHTML(Math.floor(new Date(new Date(window.RELOGIO_TESTE || Date.now()).toDateString() + ' ' + S.limite).getTime() / 1000)) : '' })}</div>`; };
  const M = window.M = { S, P, D, chatHTML, botoesJanela, conversaDe: (x) => S.abas.find(a => a.p === x), projAtual: () => aba() ? aba().p : p(), livres: () => [], salvar: null, esc, ico, ast, ROT, aba, p, nomeMod, ehLocal, conversaHTML, caixaHTML, chipModelo, popHTML, cortinaHTML, painelHTML, modalHTML, CENAS, agir, modalHTML, giro: () => ['·', '✢', '✳', '✶', '✻', '✽'][Math.floor(Date.now() / 160) % 6],
    draw() { document.documentElement.dataset.tema = S.tema; const ap = document.getElementById('app'); ap.classList.toggle('min', S.tam === 'min'); /* Mín. sem zoom: compacto.css arruma */ ap.innerHTML = window.LAYOUT(S, M) + M.modalHTML() + (S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ''); } };
  window.addEventListener('DOMContentLoaded', () => {
    const h = new URLSearchParams(location.hash.slice(1)); if (h.get('tema')) S.tema = h.get('tema'); if (h.get('tam') === 'min') S.tam = 'min';
    const c = h.get('cena'); if (c) document.documentElement.classList.add('cena'); if (c && CENAS[c]) CENAS[c](); M.draw();
    if (!c) setInterval(() => { if (aba() && aba().estado === 'trabalhando') { const g = document.querySelector('.c-trab .ast'), s = document.querySelector('.c-trab-s'); if (g) g.textContent = M.giro(); if (s) s.textContent = s.textContent.replace(/^\d+/, Math.round((Date.now() - aba().t0) / 1000)); } }, 160);
  });
})();