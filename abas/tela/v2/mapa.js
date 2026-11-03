// "Pasta do FCC" window (look B "Mapa da pasta", chosen 02/11/2026; source FCC/docs/prototipos/perfil/ESCOLHIDA).
// THIS FILE IS APP UI CODE (copied by copiar-prototipo.ps1). Data = M.D.pasta (app: api.pastaDados, abas/pasta.js);
// actions = M.pastaAcao(acao, arg) in app, demo stub here. Load after janelas.js (needs M.J and M.agir).
(function () {
  const { S, esc } = M;
  const novoEstado = () => ({ sel: 'perfil', salvar: true, fase: '', envio: null, semPerfil: false, ocupado: false, entra: true });
  if (!S.pa) S.pa = novoEstado();
  const P = () => M.D && M.D.pasta;
  const enc = encodeURIComponent, att = (s) => esc(String(s == null ? '' : s)).replace(/"/g, '&quot;');
  const NOME = { perfil: 'Perfil', projects: 'Projetos', conta: 'Conta', ferramentas: 'Ferramentas' };
  const TIT = { perfil: 'Perfil', projects: 'Projetos', conta: 'Conta', ferramentas: 'Ferramentas', sistema: 'No sistema', enviar: 'Enviar a um amigo', remover: 'Remover o FCC' };
  const lista = (itens, f) => `<div class="pa-cartao">${itens.map(f).join('')}</div>`;
  const lin = (miolo, fim = '', pre = '') => `<div class="pa-lin">${pre}<div class="pa-t">${miolo}</div>${fim}</div>`;
  const tx = (b, s) => `<b>${esc(b)}</b>${s ? `<small>${esc(s)}</small>` : ''}`;
  const tam = (t) => `<span class="pa-tam">${esc(t || '')}</span>`;
  const sec = (t, b) => `<div class="pa-sec">${t}${b != null && b !== '' ? ` <b>${esc(b)}</b>` : ''}</div>`;
  const dica = (t) => `<div class="pa-dica">${t}</div>`;
  const vazio = (b, t, extra = '') => `<div class="pa-vazio"><b>${b}</b>${t}${extra}</div>`;
  const barra = () => `<div class="pa-barra"><i></i></div>`;
  const amb = (p) => (p.contas || []).some((c) => c[2] === 'amb');
  const linConta = (c) => lin(tx(c[0], c[1]), c[2] === 'amb' ? `<button class="c-btn" data-act="modal:conta">Entrar</button>` : '', `<span class="pa-ponto ${c[2] === 'amb' ? 'amb' : 'ok'}"></span>`);

  // ---- detail of each block ----
  const avisoOutro = (p) => {
    const o = p.outro; if (!o) return '';
    const f = o.ferramentas || [], er = o.erros || [];
    const partes = [];
    if (f.length) partes.push(`Faltam ${f.length === 1 ? 'a ferramenta' : f.length + ' ferramentas'}: ${f.join(', ')}. Peça ao Claude numa conversa para baixar.`);
    if (er.length) partes.push(`Não consegui ajustar ${er.length === 1 ? '1 item' : er.length + ' itens'} para a pasta nova.`);
    if (amb(p)) partes.push('Uma conta precisa entrar de novo.');
    return `<div class="pa-aviso"><span class="pa-ponto amb"></span><div class="pa-t"><b>Este perfil veio de outro PC</b><small>Conversas ajustadas para a pasta nova. ${esc(partes.join(' '))}</small></div>${amb(p) ? `<button class="c-btn" data-act="modal:conta">Entrar na conta</button>` : ''}</div>`;
  };
  const perfil = (p) => {
    if (!p.perfil && !S.pa.semPerfil) return vazio('Sem perfil ainda', `O FCC está limpo: sem regras, skills ou memórias.<br>Coloque a pasta <code>perfil</code> de outro PC em ${esc(p.raiz)} ou comece assim mesmo.`,
      `<div class="pa-botoes"><button class="c-btn prim" data-act="pa:abrir:raiz">Abrir a pasta do FCC</button><button class="c-btn pa-lev" data-act="pa:sem-perfil">Começar sem perfil</button></div>`);
    const pf = p.perfil || { tam: '0 KB', itens: [] };
    return `<div>${avisoOutro(p)}${sec('O que está no perfil', pf.tam)}${pf.itens.length ? lista(pf.itens, (i) => lin(tx(i[0], i[1]), tam(i[2]))) : `<div class="pa-cartao">${lin(tx('Vazio por enquanto', 'O Claude preenche conforme vocês trabalham'))}</div>`}</div>
      <div>${sec('Memória')}<div class="pa-cartao">${lin(tx('Memória automática', 'O Claude anota sozinho o que aprende. As anotações ficam no perfil.'), `<button class="j-chave ${p.auto ? 'on' : ''}" data-act="pa:auto" role="switch" aria-checked="${!!p.auto}" aria-label="Memória automática" data-dica="MEMÓRIA AUTOMÁTICA|Desligada, o Claude só sabe o que está nas regras e no PARADA"><i></i></button>`)}</div></div>
      <div>${sec('Contas', '')}${(p.contas || []).length ? lista(p.contas, linConta) : `<div class="pa-cartao">${lin(tx('Nenhuma conta ainda'), `<button class="c-btn" data-act="modal:conta">Entrar na conta</button>`)}</div>`}${dica('As contas ficam fora do perfil, na pasta conta. Para outro PC: copie as pastas perfil e projects. Para enviar a alguém, use "Enviar a um amigo", que tira o que é pessoal.')}</div>`;
  };
  const projetos = (p) => (p.projetos || []).length
    ? `<div>${sec('Em projects', p.nProjetos)}${lista(p.projetos, (i) => lin(tx(i[0]), tam(i[1])))}${dica('Os projetos ficam fora do perfil: ao trocar de PC, copie as duas pastas.')}</div>`
    : vazio('Nenhum projeto ainda', 'Os projetos que você criar no FCC ficam na pasta projects.');
  const conta = (p) => `<div><div class="pa-aviso ok"><span class="pa-ponto ok"></span><div class="pa-t"><b>Os logins ficam aqui, separados do perfil</b><small>Enviar o perfil a alguém nunca leva a sua conta.</small></div></div>
      ${sec('Contas')}${(p.contas || []).length ? lista(p.contas, linConta) : `<div class="pa-cartao">${lin(tx('Nenhuma conta ainda'), `<button class="c-btn" data-act="modal:conta">Entrar na conta</button>`)}</div>`}</div>`;
  const ferramentas = (p) => (p.dentro || []).length
    ? `<div>${sec('Programas nesta pasta', p.dentroTam)}${lista(p.dentro, (i) => lin(tx(i[0], i[1]), tam(i[2]) + (i[3] ? `<span class="pa-tag" data-dica="ESSENCIAL|O FCC precisa dele para funcionar">Essencial</span>` : `<button class="c-btn pa-lev" data-act="pa:tirar:${enc(i[0])}" data-dica="REMOVER|Vai para a Lixeira. Dá para baixar de novo">Remover</button>`)))}${dica('Programas que o Claude baixou para trabalhar. Se faltar algum, peça numa conversa.')}</div>`
    : vazio('Nenhuma ferramenta baixada', 'Quando o Claude baixar um programa para trabalhar, ele aparece aqui.');
  const sistema = (p) => (p.sistema || []).length
    ? `<div>${dica('Fora da pasta do FCC. Removendo o FCC, isto continua no PC. A decisão é sua, item por item.')}${lista(p.sistema, (i) => lin(tx(i.nome, i.sub), `<span class="pa-tag" data-dica="${i.origem === 'Detectado' ? 'DETECTADO|Apareceu no PC durante uma conversa. Pode ter sido você quem instalou' : 'INSTALADO PELO FCC|O FCC instalou porque precisava'}">${esc(i.origem)}</span><button class="c-btn pa-lev" data-act="pa:desinst:${enc(i.id)}" data-dica="DESINSTALAR|Abre o desinstalador desse programa">Desinstalar</button><button class="c-btn pa-lev" data-act="pa:ignorar:${enc(i.id)}" data-dica="IGNORAR|Tira da lista sem desinstalar">Ignorar</button>`))}</div>`
    : vazio('Nada instalado ainda', 'Quando o Claude instalar algo no Windows, aparece aqui, com a conversa em que aconteceu.');
  const enviar = (p) => {
    const f = S.pa.fase, e = S.pa.envio;
    if (f === 'gerando') return vazio('Preparando a cópia', 'Retirando o que é pessoal e conferindo o resultado.', barra());
    if (f === 'pronto' && e) {
      const av = [];
      if (e.retidos > 0) av.push(`${e.retidos === 1 ? '1 arquivo ficou' : e.retidos + ' arquivos ficaram'} de fora por parecer pessoal.`);
      if (e.caminhosPessoais > 0) av.push(`${e.caminhosPessoais === 1 ? '1 trecho ainda cita' : e.caminhosPessoais + ' trechos ainda citam'} pastas deste PC. Confira antes de enviar.`);
      return `<div><div class="pa-aviso ok"><span class="pa-ponto ok"></span><div class="pa-t"><b>Cópia pronta: ${esc(e.tam)}</b><small>${esc(e.pasta)}</small></div><button class="c-btn" data-act="pa:abrir:envio">Mostrar na pasta</button></div>
        ${av.length ? `<div class="pa-aviso"><span class="pa-ponto amb"></span><div class="pa-t"><b>Confira antes de enviar</b><small>${esc(av.join(' '))}</small></div></div>` : dica('Conferida: nenhum login, e-mail, conversa ou caminho pessoal.')}</div>`;
    }
    const ev = p.envio || {};
    return `<div class="pa-dois"><div>${sec('Vai junto')}${lista([['Regras e preferências', ev.regras], ['Skills, sem o que foi aprendido', ev.skills]], (i) => lin(tx(i[0]), tam(i[1]), '<span class="pa-ponto ok"></span>'))}</div>
      <div>${sec('Fica só com você')}${lista(['Contas e login', 'Conversas', 'Memórias e lições', 'Projetos', 'Dados do programa'], (i) => lin(tx(i), '', '<span class="pa-ponto vm"></span>'))}</div></div>
      ${dica('A cópia vai para uma pasta que você escolhe, fora da pasta do FCC.')}`;
  };
  const remover = (p) => {
    if (S.pa.fase === 'andamento') return vazio('Removendo o FCC', 'Parando conversas e ajudantes. O FCC fecha e a pasta vai para a Lixeira.', barra());
    const si = p.sistema || [];
    return `<div class="pa-aviso vm"><span class="pa-ponto vm"></span><div class="pa-t"><b>Tudo em ${esc(p.raiz)} vai para a Lixeira</b><small>Inclui perfil, projetos e contas. Depois de esvaziar a Lixeira, não tem volta.</small></div></div>
      <div class="pa-dois"><div>${sec('Sai junto', p.total)}${lista(p.blocos || [], (b) => lin(tx(NOME[b.id] || b.id), tam(b.tam), `<span class="pa-ponto" style="background:var(--c-${cor(b.id)})"></span>`))}${dica('Também saem os atalhos, o item do menu do Windows e o início automático do FCC.')}</div>
      <div>${sec('Continua no PC', si.length)}${si.length ? lista(si, (i) => lin(tx(i.nome, i.origem))) : `<div class="pa-cartao">${lin(tx('Nada fora da pasta'))}</div>`}${si.length ? dica('Veja em No sistema, se quiser desinstalar algum.') : ''}</div></div>
      <div>${sec('Antes de remover')}<div class="pa-cartao"><button class="pa-lin pa-marca-lin" data-act="pa:salvar" role="checkbox" aria-checked="${!!S.pa.salvar}"><span class="pa-marca ${S.pa.salvar ? 'on' : ''}">${S.pa.salvar ? M.ico('ok') : ''}</span><span class="pa-t"><b>Salvar perfil e projetos em outra pasta</b><small>Escolha a pasta ao confirmar. Precisa de ${esc(p.precisa || '')} livres.</small></span></button></div></div>`;
  };
  const cor = (id) => ({ perfil: 'perfil', projects: 'proj', conta: 'conta', ferramentas: 'ferr' })[id] || 'sis';
  const CORPO = { perfil, projects: projetos, conta, ferramentas, sistema, enviar, remover };

  const botoes = (p) => {
    const s = S.pa.sel;
    if (s === 'enviar' && !S.pa.fase) return `<button class="c-btn prim" data-act="pa:preparar" data-dica="PREPARAR CÓPIA|Pergunta onde guardar e gera a cópia sem nada pessoal">Preparar cópia</button>`;
    if (s === 'enviar' && S.pa.fase === 'pronto') return `<button class="c-btn pa-lev" data-act="pa:preparar">Gerar de novo</button>`;
    if (s === 'remover' && !S.pa.fase) return `<button class="c-btn perigo pa-segura" data-pa-segura="1" data-dica="SEGURE 1 S|Solte antes para desistir"><i></i><span>Segure para remover o FCC</span></button>`;
    if ((s === 'perfil' && (p.perfil || S.pa.semPerfil)) || s === 'ferramentas') return `<button class="c-btn pa-lev" data-act="pa:abrir:${s}">Abrir a pasta</button>`;
    return '';
  };

  // keeps scroll of both columns across redraws (app re-renders the whole window)
  let rolar = null;
  const guardarRolagem = () => {
    const j = document.querySelector('.jan.pasta'); if (!j) { rolar = null; return; }
    const c = j.querySelector('.pa-corpo'), m = j.querySelector('.pa-mapa');
    const pa = j.querySelector('.pa'); rolar = { sel: pa ? pa.dataset.paSel : '', c: c ? c.scrollTop : 0, m: m ? m.scrollTop : 0 };
  };
  const aplicarRolagem = () => {
    if (!rolar) return; const j = document.querySelector('.jan.pasta'); if (!j) return;
    const m = j.querySelector('.pa-mapa'); if (m) m.scrollTop = rolar.m;
    const c = j.querySelector('.pa-corpo'); if (c && rolar.sel === S.pa.sel) c.scrollTop = rolar.c;
  };

  const html = () => {
    guardarRolagem(); queueMicrotask(aplicarRolagem); requestAnimationFrame(() => requestAnimationFrame(() => { aplicarRolagem(); rolar = null; }));
    const p = P();
    if (!p) return `<div class="pa pa-medindo"><span class="gira"></span>Medindo a pasta</div>`;
    if (p.erro) return `<div class="pa pa-medindo pa-erro">Não consegui medir a pasta: ${esc(p.erro)}<button class="c-btn pa-lev" data-act="pa:medir">Tentar de novo</button></div>`;
    const s = S.pa.sel, rem = s === 'remover', env = s === 'enviar', entra = S.pa.entra; S.pa.entra = false;
    const op = (id) => (env && id !== 'perfil' ? ' pa-apaga' : '');
    const nSis = (p.sistema || []).length;
    return `<div class="pa" data-pa-sel="${s}">
      <div class="pa-mapa">
        <div class="pa-tit"><span title="${att(p.raiz)}">${esc(p.raiz)}</span><span>${esc(p.total)}</span></div>
        <div class="pa-prop" data-dica="ESPAÇO|Quanto cada pasta ocupa">${(() => { const L = p.blocos || [], soma = L.reduce((a, x) => a + (+x.gb || 0), 0);   // flex-grow sum < 1 leaves the bar partly empty: normalize small totals
          const fx = (b) => soma >= 1 ? Math.max(+b.gb || 0, .02) : soma > 0 ? Math.max((+b.gb || 0) / soma, .02) : 1;
          return L.map((b) => `<i class="${op(b.id)}" style="flex:${fx(b)};background:var(--c-${cor(b.id)})"></i>`).join(''); })()}</div>
        ${(p.blocos || []).map((b) => `<button class="pa-bloco ${s === b.id ? 'on' : ''}${op(b.id)}" style="--cor:var(--c-${cor(b.id)})" data-act="pa:ir:${b.id}" data-dica="${att((NOME[b.id] || b.id).toUpperCase() + '|' + b.d)}"><span class="pa-q"></span><span class="pa-t"><b>${NOME[b.id] || esc(b.id)}</b><small>${esc(b.d)}</small></span><span class="pa-tam">${esc(b.tam)}</span></button>`).join('')}
        <div class="pa-tit pa-fora-tit"><span>Fora do FCC</span></div>
        <button class="pa-bloco pa-fora ${s === 'sistema' ? 'on' : ''}${env ? ' pa-apaga' : ''}" style="--cor:var(--c-sis)" data-act="pa:ir:sistema" data-dica="NO SISTEMA|O que o Claude instalou no Windows, fora da pasta"><span class="pa-q"></span><span class="pa-t"><b>No sistema</b><small>O que foi instalado no Windows</small></span><span class="pa-tam">${nSis}</span></button>
        <div class="pa-acoes">
          <button class="c-btn ${env ? 'prim' : ''}" data-act="pa:ir:enviar" data-dica="ENVIAR A UM AMIGO|Gera uma cópia sem nada pessoal">Enviar a um amigo</button>
          <button class="c-btn perigo ${rem ? 'on' : ''}" data-act="pa:ir:remover" data-dica="REMOVER O FCC|Mostra o que sai e o que fica antes de confirmar">Remover o FCC</button>
        </div>
      </div>
      <div class="pa-det"><div class="pa-topo"><h2>${TIT[s]}</h2><span class="pa-esp"></span>${botoes(p)}</div><div class="pa-corpo ${entra ? 'pa-entra' : ''}">${CORPO[s](p)}</div></div>
    </div>`;
  };
  M.J.pasta = { tit: 'Pasta do FCC', ico: 'pasta', sem: true, html };

  // ---- actions ----
  const toast = (m) => { if (!m) return; if (M.mostrarToast) return M.mostrarToast(m); S.toast = m; M.draw(); setTimeout(() => { if (S.toast === m) { S.toast = ''; M.draw(); } }, 3500); };
  const trocaDemo = (f) => { M.D = Object.assign({}, M.D, { pasta: f(Object.assign({}, P())) }); };
  const demo = async (acao, arg) => {   // prototype only: what the app would answer
    await new Promise((r) => setTimeout(r, acao === 'enviar' ? 1400 : 200));
    if (acao === 'auto') return { ok: true, auto: !!arg };
    if (acao === 'abrir') return { ok: true };
    if (acao === 'desinstalar') return { ok: true, msg: 'Abriria o desinstalador' };
    if (acao === 'tirar') { trocaDemo((p) => Object.assign(p, { dentro: p.dentro.filter((d) => d[0] !== arg) })); return { ok: true }; }
    if (acao === 'ignorar') { trocaDemo((p) => Object.assign(p, { sistema: p.sistema.filter((d) => d.id !== arg) })); return { ok: true }; }
    if (acao === 'enviar') return { ok: true, pasta: 'D:\\Downloads\\perfil-para-enviar', tam: '14 MB', retidos: 0, caminhosPessoais: 0 };
    if (acao === 'remover') return { ok: true };
    return { ok: false, msg: 'ação desconhecida' };
  };
  const chamar = async (acao, arg) => {
    S.pa.ocupado = true;
    try { return await (M.pastaAcao ? M.pastaAcao(acao, arg) : demo(acao, arg)) || { ok: false, msg: 'sem resposta' }; }
    catch (e) { return { ok: false, msg: (e && e.message) || String(e) }; }
    finally { S.pa.ocupado = false; }
  };
  const recarregar = () => { if (M.pastaRecarregar) M.pastaRecarregar(); else M.draw(); };

  async function fazer(k, x) {
    const p = P();
    if (k === 'medir') { if (M.D) M.D.pasta = null; M.draw(); return recarregar(); }
    if (S.pa.ocupado && (k === 'ir' || k === 'salvar')) return;   // an action is running (e.g. removal): keep the screen where it is
    if (k === 'ir') { if (S.pa.sel !== x) { S.pa.sel = x; S.pa.fase = ''; S.pa.entra = true; } return M.draw(); }
    if (k === 'salvar') { S.pa.salvar = !S.pa.salvar; return M.draw(); }
    if (k === 'sem-perfil') { S.pa.semPerfil = true; S.pa.entra = true; return M.draw(); }
    if (!p || S.pa.ocupado) return;
    if (k === 'auto') {
      const v = !p.auto; p.auto = v; M.draw();
      const r = await chamar('auto', v);
      if (!r.ok) { p.auto = !v; toast('Não consegui mudar a memória: ' + r.msg); } else if (typeof r.auto === 'boolean') p.auto = r.auto;
      return M.draw();
    }
    if (k === 'abrir') { const r = await chamar('abrir', x); if (!r.ok) toast('Não consegui abrir a pasta: ' + r.msg); return; }
    if (k === 'desinst') { const r = await chamar('desinstalar', x); toast(r.ok ? r.msg : 'Não consegui desinstalar: ' + r.msg); return; }
    if (k === 'tirar' || k === 'ignorar') {
      const r = await chamar(k, x);
      if (!r.ok) return toast((k === 'tirar' ? 'Não consegui remover: ' : 'Não consegui tirar da lista: ') + r.msg);
      if (k === 'tirar') p.dentro = (p.dentro || []).filter((d) => d[0] !== x); else p.sistema = (p.sistema || []).filter((d) => d.id !== x);   // drop the row now; the re-measure comes later
      M.draw();
      toast(k === 'tirar' ? `${x} foi para a Lixeira` : 'Saiu da lista. Continua instalado no PC.');
      return recarregar();
    }
    if (k === 'preparar') {
      S.pa.fase = 'gerando'; S.pa.envio = null; S.pa.entra = true; M.draw();
      const r = await chamar('enviar');
      if (S.pa.sel !== 'enviar') return;
      if (r.ok) { S.pa.envio = r; S.pa.fase = 'pronto'; } else { S.pa.fase = ''; if (!r.cancelado) toast('Não consegui preparar a cópia: ' + r.msg); }
      S.pa.entra = true; return M.draw();
    }
  }
  async function removerFCC() {
    if (S.pa.ocupado || S.pa.sel !== 'remover' || S.pa.fase) return;
    S.pa.fase = 'andamento'; S.pa.entra = true; M.draw();
    const r = await chamar('remover', { salvar: !!S.pa.salvar });
    if (r.ok) return;   // app closes by itself
    S.pa.fase = ''; S.pa.entra = true; M.draw();
    if (!r.cancelado) toast('Não consegui remover: ' + r.msg);
  }

  const agirBase = M.agir;
  M.agir = (a) => {
    if (a === 'modal:pasta') { S.pa = novoEstado(); return agirBase(a); }
    if (a.startsWith('pa:')) { const r = a.slice(3), i = r.indexOf(':'); const k = i < 0 ? r : r.slice(0, i), x = i < 0 ? '' : decodeURIComponent(r.slice(i + 1)); fazer(k, x); return; }
    return agirBase(a);
  };

  // ---- hold to remove (1 s, house standard): mouse or Space/Enter held ----
  let seg = null;
  const soltar = () => { clearTimeout(seg); seg = null; document.querySelectorAll('.pa-segura.segurando').forEach((b) => b.classList.remove('segurando')); };
  const segurar = (b) => { if (seg) return; b.classList.add('segurando'); seg = setTimeout(() => { seg = null; removerFCC(); }, 1000); };
  document.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-pa-segura]'); if (b && e.button === 0) segurar(b); }, true);
  ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, soltar, true));
  document.addEventListener('pointerout', (e) => { if (seg && e.target.closest('[data-pa-segura]') && !e.target.closest('[data-pa-segura]').contains(e.relatedTarget)) soltar(); }, true);
  window.addEventListener('blur', soltar);

  // ---- keyboard: motor.js eats every key while a modal is open and redraws (focus lost); this window handles its own ----
  const focaveis = (j) => [...j.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
  const refocar = (act) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const j = document.querySelector('.jan.pasta'); if (!j) return;
    const el = j.querySelector(`[data-act="${CSS.escape(act)}"]`) || j.querySelector('.pa-bloco.on'); if (el) el.focus({ preventScroll: false });
  }));
  window.addEventListener('keydown', (e) => {
    if (S.modal !== 'pasta') return;
    const k = e.key;
    if (k === 'Escape' || /^F\d+$/.test(k) || e.ctrlKey || e.altKey || e.metaKey) { soltar(); return; }
    e.stopImmediatePropagation();
    const j = document.querySelector('.jan.pasta'); if (!j) return;
    const f = document.activeElement;
    if (k === 'Tab') {
      const l = focaveis(j); if (!l.length) return e.preventDefault();
      const i = l.indexOf(f);
      if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === l.length - 1)) { e.preventDefault(); l[e.shiftKey ? l.length - 1 : 0].focus(); }
      return;
    }
    if ((k === 'Enter' || k === ' ') && f && j.contains(f)) {
      e.preventDefault();
      if (f.matches('[data-pa-segura]')) { if (!e.repeat) segurar(f); return; }
      const act = f.dataset.act; if (!act || e.repeat) return;
      M.agir(act); refocar(act);
    }
  }, true);
  window.addEventListener('keyup', (e) => { if (seg && (e.key === 'Enter' || e.key === ' ')) soltar(); }, true);

  // ---- appearance scenes (each sets S.pa fully; cena() resets M.D to demo data) ----
  const com = (mud) => () => { S.modal = 'pasta'; S.pa = Object.assign(novoEstado(), { entra: false }, mud.pa || {}); M.D = Object.assign({}, M.D, { pasta: mud.d === 'nada' ? null : Object.assign({}, M.D.pasta, mud.d || {}) }); };
  const env = { pasta: 'D:\\Downloads\\perfil-para-enviar', tam: '14 MB', retidos: 0, caminhosPessoais: 0 };
  Object.assign(M.CENAS, {
    pasta: com({}), 'pasta-medindo': com({ d: 'nada' }), 'pasta-erro': com({ d: { erro: 'EPERM: operation not permitted, scandir' } }),
    'pasta-vazio': () => { com({})(); M.D.pasta.blocos = M.D.pasta.blocos.map((b) => Object.assign({}, b, { tam: '0 KB', gb: 0 })); },   // fresh install: bar must still fill
    'pasta-novo': com({ d: { perfil: null, outro: null } }),
    'pasta-outro': com({ d: { outro: { ferramentas: ['Node.js', '.NET SDK'], erros: [] } } }),
    'pasta-projects': com({ pa: { sel: 'projects' } }), 'pasta-conta': com({ pa: { sel: 'conta' } }), 'pasta-ferramentas': com({ pa: { sel: 'ferramentas' } }),
    'pasta-sistema': com({ pa: { sel: 'sistema' } }), 'pasta-sistema-vazio': com({ pa: { sel: 'sistema' }, d: { sistema: [] } }),
    'pasta-enviar': com({ pa: { sel: 'enviar' } }), 'pasta-enviar-gerando': com({ pa: { sel: 'enviar', fase: 'gerando' } }),
    'pasta-enviar-pronto': com({ pa: { sel: 'enviar', fase: 'pronto', envio: env } }),
    'pasta-enviar-aviso': com({ pa: { sel: 'enviar', fase: 'pronto', envio: Object.assign({}, env, { retidos: 2, caminhosPessoais: 3 }) } }),
    'pasta-remover': com({ pa: { sel: 'remover' } }), 'pasta-remover-andamento': com({ pa: { sel: 'remover', fase: 'andamento' } }),
  });
})();
