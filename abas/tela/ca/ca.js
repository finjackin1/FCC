/* FCC interface nova (24/11/2026) = protótipo B (docs\prototipos\claude-assistente\B.html + comum.js), ligada ao programa:
   conversas reais pelo window.api (main.js abrirChat), itens e HTML da conversa por tela\chat.js (CHAT). */
(async () => {
const api = window.api, C = window.CHAT;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const P = {
  mais: 'M12 5v14M5 12h14', busca: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.6-4.6',
  pasta: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
  chat: 'M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-9l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z',
  lapis: 'M14.5 4.5l5 5L9 20H4v-5zM12.5 6.5l5 5', seta: 'M12 19V5M6 11l6-6 6 6', chev: 'M9 6l6 6-6 6', volta: 'M15 6l-6 6 6 6',
  diff: 'M6.5 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM9 8.5h6M12 5.5v6M9 16h6',
  previa: 'M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM8 20.5h8',
  passos: 'M9.5 6.5h10M9.5 12h10M9.5 17.5h10M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  term: 'M5 4.5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM7.5 9.5l3 2.5-3 2.5M12.5 15h4',
  arq: 'M6.5 3.5h7.5l4.5 4.5v12.5h-12zM14 3.5V8h4.5', barra: 'M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM9.5 4.5v15',
  opcoes: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  min: 'M6 12h12', max: 'M7.5 6.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z', fechar: 'M7 7l10 10M17 7L7 17',
  ck: 'M5 12.5l4.5 4.5L19 7.5', lua: 'M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  faisca: 'M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M5.6 18.4l3.2-3.2M15.2 8.8l3.2-3.2',
  escudo: 'M12 3.5l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5z',
  tres: 'M6 12h.01M12 12h.01M18 12h.01', recarregar: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4', modo: 'M12 3.5l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5z',
  ajuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  mic: 'M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v3.5', clipe: 'M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7', parar: 'M7 7h10v10H7z', casa: 'M4 11l8-6.5 8 6.5M6 9.5V19.5h12V9.5',
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24"><path d="${P[n]}"/></svg>`;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hhmm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const uuid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
const quandoDe = ms => { if (!ms) return ''; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'agora' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : m < 2880 ? 'ontem' : Math.round(m / 1440) + ' d'; };
const ler = (k, v) => { try { const x = JSON.parse(localStorage.getItem(k)); return x == null ? v : x; } catch { return v; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

/* ---------- dados reais ---------- */
const D = await api.dados(), OP = D.op;
let PROJ = D.projetos || [], RASC = [], CONTA = { estado: 'conf', email: '', plano: '' }, LIM = null, CONTAS = [];
const NOTAS = ler('ca-notas', []);
const salvarNotas = () => gravar('ca-notas', NOTAS);
const CONVS = []; let seq = 1;
const abertosG = new Set(ler('ca-grupos', []));
const cor = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 66%)`; };
const letra = p => esc((p.l || p.n || '?')[0].toUpperCase());
// 25/11 (pedido dele): ícone do .exe do projeto no lugar da letra (igual à interface antiga); duplo clique no ícone abre o programa
const ICO = {};
const buscarIcones = () => { const f = PROJ.filter(p => p.prog && !(p.dir in ICO)).map(p => p.dir); if (!f.length) return; f.forEach(d => ICO[d] = ''); api.icones(f).then(r => { let mudou = false; for (const d in r) if (r[d]) { ICO[d] = r[d]; mudou = true; } if (mudou) refazLado(); }).catch(() => { }); };
// 24/11 (pedido dele): só 2 modos. Automático = faz tudo sozinho (só o perigoso pergunta); Perguntar antes = pede licença antes de instalar, editar ou rodar algo no PC
const MODOS = { auto: ['Automático', 'Faz tudo sozinho, sem perguntar', 'auto'], perguntar: ['Perguntar antes', 'Pede licença antes de instalar, editar ou rodar algo no PC', 'default'], plano: ['Planejar', 'Só lê e monta um plano; muda algo só depois que você aprovar', 'plan'] };
const modoPadrao = () => OP.perm === 'auto' ? 'auto' : 'perguntar';   // Planejar vale só para a conversa (nunca vira padrão)
const cfg = { projeto: null, modelo: ['fable', 'opus', 'sonnet', 'haiku'].includes(OP.modelo) ? OP.modelo : 'sonnet', esf: OP.esforco || 'medium', modo: OP.perm === 'auto' ? 'auto' : 'perguntar', anexos: [] };
const pensarPadrao = () => OP.pensar === '1' ? 2 : 1;
const recolhidas = new Set(ler('ca-recolhidas', []));
let atual = { tipo: 'inicio' }, busca = '', painelAberto = null;
const projDe = dir => PROJ.find(p => p.dir.toLowerCase() === String(dir || '').toLowerCase());
const convDe = id => CONVS.find(t => t.id === id);
const tAtual = () => atual.tipo === 'conv' ? convDe(atual.id) : null;
const estadoLado = t => t.estado === 'trabalhando' || t.estado === 'abrindo' ? 'trabalhando' : t.estado === 'pede' ? 'esperando' : !t.visto ? 'nova' : '';
const rotEstado = e => ({ esperando: 'Esperando você', trabalhando: 'Claude está trabalhando', nova: 'Resposta nova, ainda não vista' }[e] || 'Pronta');
const casa = t => !busca || String(t).toLowerCase().includes(busca.toLowerCase());
const rascLivres = () => RASC.filter(r => !CONVS.some(t => t.sessao === r.id));
const ocupada = t => t.estado === 'trabalhando' || t.estado === 'pede';
const pedePerm = t => t.itens.some(x => x.k === 'perm' && !x.resp);
const abreGrupo = dir => { abertosG.add(dir); gravar('ca-grupos', [...abertosG]); };
const pastasOP = () => String(OP.pastas || '').split(';').map(x => x.trim()).filter(Boolean);
const chatOpts = t => ({ id: t.id, dir: t.dir, nome: t.p ? t.p.n : 'chat livre', modelo: t.modelo, esf: t.esf, pensar: t.pensar });

/* ---------- janela ---------- */
const temaDe = t => t === 'claro' ? 'claro' : t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro') : 'escuro';
document.documentElement.dataset.tema = temaDe(OP.tema);
document.body.innerHTML = `<div class="janela">
  <div class="titulo">
    <button class="ib" data-acao="barra">${ic('barra')}</button>
    <div class="marca">${ic('faisca')}FCC</div><div class="esp"></div>
    <button class="atualizar" data-acao="atualizarAgora" data-dica="Versão nova pronta|Clique para aplicar. Nada recarrega ou fecha sem o seu clique." hidden>Atualizar agora</button>
    <button class="ib" data-acao="ajuda" data-dica="Ajuda|Tours, atalhos e onde fica cada coisa">${ic('ajuda')}</button>
    <button class="ib" data-acao="tema" data-dica="Tema|Alternar claro e escuro">${ic(document.documentElement.dataset.tema === 'escuro' ? 'sol' : 'lua')}</button>
    <div class="win"><button class="bc" data-acao="minimizar" data-dica="Minimizar">${ic('min')}</button><button class="bc mx" data-dica="Maximizar|Clique: maximiza. Segure 1 s: troca o tamanho (Máx. 1440 × 810 / Mín. 1080 × 608)"><span class="enche"></span>${ic('max')}</button><button class="bc x" data-dica="Fechar|Clique: vai para a bandeja. Segure 1 s: sai"><span class="enche"></span>${ic('fechar')}</button></div>
  </div>
  <div class="corpo"><aside class="lado" id="lado"></aside>
    <main class="centro"><div class="cab" id="cab"></div><div class="palco" id="palco"></div></main>
    <aside class="paineis" id="paineis"></aside></div></div>`;

/* ---------- barra lateral (fixa ou automática, como B.html) ---------- */
let fixa = localStorage.getItem('ca-barra-fixa') === '1', esconde;
document.body.classList.toggle('fixa', fixa);
function marcaBotao() { const b = $('.titulo [data-acao="barra"]'); b.classList.toggle('on', fixa);
  b.dataset.dica = fixa ? 'Barra lateral fixa|Clique para esconder e mostrar só ao passar o mouse na borda (Ctrl+B)' : 'Barra lateral automática|Aparece ao passar o mouse na borda esquerda. Clique para deixar sempre à mostra (Ctrl+B)'; }
function barraB(forca) { const l = $('#lado');
  if (forca === true) { if (!fixa) l.classList.add('mostra'); return; }
  fixa = !fixa; localStorage.setItem('ca-barra-fixa', fixa ? '1' : '0'); l.classList.remove('mostra'); document.body.classList.toggle('fixa', fixa); marcaBotao(); }
const aoAbrir = () => { if (!fixa) $('#lado').classList.remove('mostra'); };
{ marcaBotao(); const b = document.createElement('div'); b.className = 'borda'; b.dataset.dica = 'Projetos, mensagens e rascunhos|Passe o mouse aqui ou Ctrl+B'; $('.corpo').appendChild(b);
  b.onmouseenter = () => { clearTimeout(esconde); barraB(true); };
  const l = $('#lado'); l.onmouseenter = () => clearTimeout(esconde);
  l.onmouseleave = () => { if (fixa) return; esconde = setTimeout(() => { if (document.activeElement?.id !== 'busca' && !$('.menu') && !TOUR) l.classList.remove('mostra'); }, 350); };
  document.addEventListener('mousedown', e => { if (!fixa && !l.contains(e.target) && !e.target.closest('.menu') && !e.target.closest('.borda') && !e.target.closest('.tour')) l.classList.remove('mostra'); }); }

function itemConv(t, sub) {
  const at = atual.tipo === 'conv' && atual.id === t.id, e = estadoLado(t);
  return `<button class="item ${sub ? 'sub' : ''} ${at ? 'ativo' : ''}" data-acao="abrir" data-id="${t.id}" data-dica="${esc(t.titulo)}|${rotEstado(e)}">
    ${sub ? '' : `<span class="est ${e}"></span>`}<span class="nome">${esc(t.titulo)}</span>${sub ? `<span class="est ${e}"></span>` : `<span class="q">${quandoDe(t.t0)}</span>`}</button>`;
}
function secao(id, titulo, add, corpo) {
  return `<div class="secao ${recolhidas.has(id) ? 'recolhida' : ''}" data-sec="${id}"><div class="secao-cab"><button class="t" data-acao="secao">${titulo}</button>${add ? `<button class="ib" data-acao="${add[0]}" data-dica="${add[1]}">${ic('mais')}</button>` : ''}<button class="ib" style="opacity:1;width:20px" data-acao="secao" tabindex="-1">${ic('chev', 'chev')}</button></div>
    <div class="secao-corpo"><div>${corpo}</div></div></div>`;
}
function ladoHTML() { buscarIcones();
  const pj = PROJ.map(p => {
    const cs = CONVS.filter(t => t.p === p), vis = cs.filter(t => casa(t.titulo) || casa(p.n));
    if (busca && !vis.length && !casa(p.n)) return '';
    const es = cs.map(estadoLado), aviso = es.includes('esperando') ? 'esperando' : es.includes('trabalhando') ? 'trabalhando' : es.includes('nova') ? 'nova' : '';
    const ab = abertosG.has(p.dir) || (busca && vis.length);
    const ult = p.ult && p.ult.sessao && !cs.some(t => t.sessao === p.ult.sessao) ? `<button class="item sub" data-acao="ultima" data-dir="${esc(p.dir)}" data-dica="Última conversa|${esc((p.ult.txt || '').slice(0, 120))}">${ic('volta')}<span class="nome">Última conversa${p.ult.quando ? ' · ' + esc(p.ult.quando) : ''}</span></button>` : '';
    return `<div class="grupo ${ab ? 'aberto' : ''}" data-pj="${esc(p.dir)}"><button class="item" data-acao="grupo" data-dica="${esc(p.n)}|${esc(p.dir)}">${ic('chev', 'chev')}${ICO[p.dir] ? `<img class="pico" src="${ICO[p.dir]}" data-dir="${esc(p.dir)}" draggable="false" alt="">` : `<span class="cor" style="background:${cor(p.n)}">${letra(p)}</span>`}<span class="nome">${esc(p.n)}</span>${ab ? '' : `<span class="est ${aviso}"></span>`}</button>
      <div class="grupo-filhos"><div>${vis.map(t => itemConv(t, true)).join('')}${ult}<button class="item sub" data-acao="nova" data-pj="${esc(p.dir)}" style="color:var(--fg3)">${ic('mais')}<span class="nome">Nova conversa aqui</span></button></div></div></div>`;
  }).join('') || `<div class="vazio-lado">${busca ? 'Nada encontrado' : 'Nenhum projeto'}</div>`;
  const livres = CONVS.filter(t => !t.p && casa(t.titulo)).map(t => itemConv(t)).join('');
  const fechadas = rascLivres().filter(r => casa(r.titulo)).map(r => `<button class="item" data-acao="msgFechada" data-id="${esc(r.id)}" data-dica="${esc(r.titulo)}|Conversa fechada: clique para continuar"><span class="est"></span><span class="nome">${esc(r.titulo)}</span><span class="q">${esc(r.quando || '')}</span></button>`).join('');
  const ms = livres + fechadas || '<div class="vazio-lado">Nenhuma mensagem</div>';
  const rs = NOTAS.filter(r => casa(r.titulo)).map(r => `<button class="item ${atual.tipo === 'nota' && atual.id === r.id ? 'ativo' : ''}" data-acao="nota" data-id="${r.id}" data-dica="${esc(r.titulo)}|Rascunho, ainda não enviado">${ic('lapis')}<span class="nome">${esc(r.titulo)}</span><span class="q">${quandoDe(r.quando)}</span></button>`).join('') || '<div class="vazio-lado">Nenhum rascunho</div>';
  return secao('pj', 'Projetos', ['novoProjeto', 'Novo projeto|Escolher uma pasta'], pj) + secao('ms', 'Mensagens', ['nova', 'Nova mensagem|Conversa solta, sem projeto'], ms) + secao('rs', 'Rascunhos', ['novaNota', 'Novo rascunho|Anotar uma ideia para mandar depois'], rs);
}
function contaHTML() {
  const pct = LIM && LIM.sessao ? LIM.sessao.pct : null, nome = CONTA.email ? CONTA.email.split('@')[0] : 'Conta';
  const sub = CONTA.estado !== 'ok' ? (CONTA.estado === 'conf' ? 'Conferindo a conta…' : 'Não entrou') : `${esc(CONTA.plano || 'Claude')}${pct != null ? ` · ${pct}% das 5 h` : ''}`;
  return `<button class="item" data-acao="conta" data-dica="Conta e limites|${pct != null ? pct + '% das 5 horas usados' : 'Ver a conta'}"><span class="av">${esc(nome[0].toUpperCase())}</span><span class="nome"><b>${esc(nome)}</b><span>${sub}</span></span>
    <svg class="anel" viewBox="0 0 22 22"><circle class="f" cx="11" cy="11" r="8"/><circle class="v" cx="11" cy="11" r="8" stroke-dasharray="50.3" stroke-dashoffset="${50.3 * (1 - (pct || 0) / 100)}"/></svg></button>`;
}
let ladoUlt = '';
const refazLado = () => { ladoUlt = ''; desenharLado(); };
function desenharLado(primeira) {
  const lado = $('#lado'), lh = ladoHTML(), ch = contaHTML(), h = lh + ch + busca;
  if (h === ladoUlt && !primeira) return; ladoUlt = h;
  const rol = $('.lado-lista', lado)?.scrollTop || 0, foco = document.activeElement?.id === 'busca';
  lado.innerHTML = `<div class="lado-topo"><button class="btn lar" data-acao="nova" data-dica="Nova conversa|Ctrl+N">${ic('mais')}Nova conversa</button>
    <label class="busca" data-dica="Buscar|Ctrl+K">${ic('busca')}<input id="busca" placeholder="Buscar" value="${esc(busca)}"></label></div>
    <div class="lado-lista ${primeira ? 'carrega' : ''}">${lh}</div><div class="conta">${ch}</div>`;
  $('.lado-lista', lado).scrollTop = rol;
  if (primeira) $$('.lado-lista .item, .lado-lista .secao-cab', lado).forEach((e, i) => e.style.animationDelay = Math.min(i * 22, 400) + 'ms');
  const b = $('#busca'); b.oninput = () => { busca = b.value; desenharLado(); }; if (foco) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
}

/* ---------- cabeçalho ---------- */
const ABAS = ['Passos', 'Mudanças', 'Prévia', 'Terminal', 'Arquivos'];
let cabUlt = '';   // draw() runs every frame while Claude answers: only touch the DOM when the header changed
const porCab = (h) => { if (h !== cabUlt) $('#cab').innerHTML = cabUlt = h; };
function desenharCab() {
  const t = tAtual();
  const volta = atual.tipo !== 'inicio' ? `<button class="ib" data-acao="inicio" data-dica="Início|Voltar à tela inicial">${ic('casa')}</button>` : '';
  if (!t) { porCab(volta + (atual.tipo === 'nota' ? `<div class="tit"><span class="pj">${ic('lapis')}Rascunhos</span></div>` : '') + '<div class="esp"></div>'); return; }
  const pn = [['passos', 'Passos', 'Passos|Pensamentos e o que ele rodou, leu e mudou: aparecem aqui em vez do chat']].concat(t.p ? [['diff', 'Mudanças', 'Mudanças|O que o Claude mudou nos arquivos'], ['previa', 'Prévia', 'Prévia|Ver o programa ou site rodando'], ['term', 'Terminal', 'Terminal|Comandos que o Claude rodou'], ['arq', 'Arquivos', 'Arquivos|Pasta do projeto']] : [])
    .map(([i, n, d]) => `<button class="ib ${painelAberto === n ? 'on' : ''}" data-acao="painel" data-pn="${n}" data-dica="${d}">${ic(i)}${i === 'diff' && t.mudou ? '<span class="bolinha"></span>' : ''}</button>`).join('');
  $$('#paineis .pn-aba').forEach(a => a.hidden = !t.p && a.dataset.pn !== 'Passos');
  porCab(`${volta}<div class="tit">${t.p ? `<span class="pj"><span class="cor" style="background:${cor(t.p.n)}">${letra(t.p)}</span>${esc(t.p.n)}</span>` : `<span class="pj">${ic('chat')}Mensagens</span>`}<span class="tit-t">${esc(t.titulo)}</span></div><div class="esp"></div>${pn}<button class="ib" data-acao="maisConv" data-dica="Mais|Renomear, fechar">${ic('tres')}</button>`);
}

/* ---------- caixa de mensagem ---------- */
const nomeMod = m => C.nomeMod(m).replace(/ \d.*$/, '');
function caixaHTML(nova, texto = '') {
  const t = nova ? null : tAtual(), o = t || cfg, pj = nova && cfg.projeto ? projDe(cfg.projeto) : null, modo = MODOS[t ? t.modo4 : cfg.modo] ? (t ? t.modo4 : cfg.modo) : cfg.modo;
  const anx = C.anexosHTML((t ? t.anexos : cfg.anexos) || [], true);
  return `<div class="caixa-zona"><div class="caixa"><div class="c-anxs">${anx}</div>${t && t.editando ? '<div style="font-size:12px;color:var(--fg3);margin-bottom:4px">Editando a mensagem · Enter reenvia (a conversa volta a este ponto) · Esc cancela</div>' : ''}<textarea id="txt" rows="1" spellcheck="false" placeholder="${nova ? 'O que vamos fazer?' : 'Responder…'}">${esc(texto)}</textarea>
    <div class="caixa-rod"><button class="ib" style="width:28px;height:28px" data-acao="anexar" data-dica="Anexar|Arquivo ou imagem (arraste ou cole com Ctrl+V)">${ic('clipe')}</button><button class="ib" style="width:28px;height:28px" data-acao="ditar" data-dica="Ditar|Você fala e o Windows escreve (Win+H)">${ic('mic')}</button>
    ${nova ? `<button class="chip" data-acao="escolherPasta" data-dica="Onde|Projeto ou conversa solta">${pj ? `<span class="cor" style="background:${cor(pj.n)};width:14px;height:14px;font-size:9px">${letra(pj)}</span>${esc(pj.n)}` : `${ic('chat')}Sem projeto`}${ic('chev', 'chev')}</button>` : ''}
    <button class="chip modo-${modo === 'auto' ? 'tudo' : modo}" data-acao="modo" data-dica="Permissão|${MODOS[modo][1]}">${ic('modo')}${MODOS[modo][0]}${ic('chev', 'chev')}</button>
    <div class="esp"></div>${t && t.ctx ? ctxHTML(t) : ''}
    <button class="chip" data-acao="modelo" data-dica="Modelo e pensamento|Troque por tarefa: pequeno no papo, maior no difícil">${nomeMod(o.modelo)} · ${C.nomeEsf(o.esf).toLowerCase()}${ic('chev', 'chev')}</button>
    <button class="enviar" data-acao="enviar" data-ic="seta">${ic('seta')}</button></div></div></div>`;
}
const ctxHTML = t => { const c = t.ctx, mil = n => Math.round(n / 1000) + ' mil'; return `<button class="chip ctx-chip ${c.pct >= 80 ? 'alto' : c.pct >= 60 ? 'medio' : ''}" data-acao="resumir" data-dica="Contexto ${c.pct}%|${mil(c.usados)} de ${mil(c.max)} tokens usados. Clique para resumir a conversa (/compact) e liberar espaço"><i style="--p:${c.pct}%"></i>${c.pct}%</button>`; };
function botaoEnviar() {
  const b = $('.enviar'), x = $('#txt'); if (!b || !x) return; const t = tAtual();
  const temAnx = ((t ? t.anexos : cfg.anexos) || []).length, parar = t && (ocupada(t)) && !x.value.trim() && !temAnx;
  b.classList.toggle('parar', !!parar); b.disabled = !parar && !x.value.trim() && !temAnx;
  const icone = parar ? 'parar' : 'seta'; if (b.dataset.ic !== icone) { b.dataset.ic = icone; b.innerHTML = ic(icone); }
  b.dataset.dica = parar ? 'Parar|Segure 1 segundo (ou segure Esc)' : t && t.estado === 'trabalhando' ? 'Enviar|Ele responde na hora e segue a tarefa' : t && t.estado === 'pede' ? 'Enviar|Vai para a fila: sai quando ele terminar' : 'Enviar|Enter (Shift+Enter quebra linha)';
}
function ligarCaixa() {
  const x = $('#txt'); if (!x) return;
  const ajusta = () => { x.style.height = 'auto'; x.style.height = Math.min(x.scrollHeight, 200) + 'px'; const t = tAtual(); if (t) t.texto = x.value; else atual.texto = x.value; botaoEnviar(); };
  x.oninput = () => { ajusta(); verPop(x); }; ajusta();
  x.onblur = () => setTimeout(fecharPop, 150);
  x.onpaste = async e => { const fs = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); if (!fs.length) return; e.preventDefault();
    const L = tAtual() || cfg; L.anexos = L.anexos || [];
    for (const f of fs) { let c = api.caminho(f); if (!c) c = await api.colarImagem(new Uint8Array(await f.arrayBuffer()), (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*/, '')); if (c) L.anexos.push({ c, tam: f.size }); }
    refazerCaixa(); };
  x.onkeydown = e => { if (POP && teclaPop(e, x)) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); A.enviar(); }
    if (e.key === 'Escape') { const t = tAtual(); if (t && t.editando) { e.stopPropagation(); t.editando = null; t.texto = ''; t.anexos = []; refazerCaixa(''); renderConv(t, true); } } };
  setTimeout(() => x.focus({ preventScroll: true }), 60);
}
// popup da caixa: "/" no começo = comandos e skills; "@" = arquivo do projeto
let POP = null, popSeq = 0;
// antes da 1ª conversa o Claude ainda não mandou a lista: usa esta
const CMDS_PADRAO = [
  { n: 'compact', d: 'Resume a conversa para liberar espaço' },
  { n: 'context', d: 'Mostra quanto do espaço da conversa já foi usado' },
  { n: 'init', d: 'Cria o CLAUDE.md do projeto' },
  { n: 'review', d: 'Revisa as mudanças do código' },
  { n: 'security-review', d: 'Procura falhas de segurança nas mudanças' }];
function verPop(x) {
  const v = x.value.slice(0, x.selectionStart), t = tAtual(), cmd = /^\/(\S*)$/.exec(v), arq = /(^|\s)@([^\s@]*)$/.exec(v);
  if (cmd) { const q = cmd[1].toLowerCase(), L0 = (t && t.comandos) || ler('ca-cmds', []), L = L0.length ? L0 : CMDS_PADRAO;
    const lista = L.filter(c => c.n.toLowerCase().includes(q)).sort((a, b) => b.n.toLowerCase().startsWith(q) - a.n.toLowerCase().startsWith(q)).slice(0, 30).map(c => ({ n: '/' + c.n, d: c.d }));
    return mostrarPop(x, { tipo: '/', ini: 0, fim: v.length, lista }); }
  if (arq) { const n = ++popSeq, dir = t ? t.dir : (cfg.projeto || D.livre);
    return api.arquivosBusca(dir, arq[2]).then(L => { if (n === popSeq) mostrarPop(x, { tipo: '@', ini: v.length - arq[2].length - 1, fim: v.length, lista: (L || []).map(p => ({ n: p.split('\\').pop(), d: p, v: p })) }); }).catch(() => { }); }
  fecharPop();
}
function mostrarPop(x, p) {
  fecharPop(); if (!p.lista.length) return; POP = { ...p, sel: 0 };
  const el = document.createElement('div'); el.className = 'pop'; el.id = 'pop'; x.closest('.caixa').appendChild(el);
  el.onmousedown = e => { e.preventDefault(); const it = e.target.closest('[data-i]'); if (it) escolherPop(x, +it.dataset.i); };
  desenharPop();
}
function desenharPop() { const el = $('#pop'); if (!el || !POP) return;
  el.innerHTML = POP.lista.map((c, i) => `<div class="pop-it ${i === POP.sel ? 'hl' : ''}" data-i="${i}"><span class="pop-n">${esc(c.n)}</span><span class="pop-d">${esc(c.d)}</span></div>`).join('') + `<div class="pop-rod"><span>${POP.tipo === '/' ? 'Comandos e skills' : 'Arquivos do projeto'}</span><span>↑↓ escolhe · Enter ou Tab usa · Esc fecha</span></div>`;
  $('.pop-it.hl', el)?.scrollIntoView({ block: 'nearest' }); }
function fecharPop() { POP = null; $('#pop')?.remove(); }
function teclaPop(e, x) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = POP.lista.length; POP.sel = (POP.sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; desenharPop(); return true; }
  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); escolherPop(x, POP.sel); return true; }
  if (e.key === 'Escape') { e.stopPropagation(); fecharPop(); return true; }
  return false;
}
function escolherPop(x, i) { const p = POP, c = p && p.lista[i]; if (!c) return;
  const ins = p.tipo === '/' ? c.n + ' ' : '@' + c.v + ' ';
  x.value = x.value.slice(0, p.ini) + ins + x.value.slice(p.fim); const pos = p.ini + ins.length; x.setSelectionRange(pos, pos);
  fecharPop(); x.dispatchEvent(new Event('input')); x.focus(); }
function refazerCaixa(texto) { const z = $('.caixa-zona'); if (!z) return; const v = texto != null ? texto : $('#txt').value; z.outerHTML = caixaHTML(atual.tipo !== 'conv', v); ligarCaixa(); }
// arrastar arquivo = anexo (cartão), como na interface antiga
document.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', e => { const fs = [...(e.dataTransfer?.files || [])]; if (!fs.length || !$('.caixa')) return; e.preventDefault();
  const L = (tAtual() || cfg); L.anexos = L.anexos || []; for (const f of fs) { const c = api.caminho(f); if (c) L.anexos.push({ c, tam: f.size }); } refazerCaixa(); });

/* ---------- palco ---------- */
const hora = new Date().getHours(), saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
let rcAba = 0;
function inicioHTML() {
  const card = (acao, id, top, t, q, est, extra = '') => `<button class="rc-card" data-acao="${acao}" data-id="${esc(id)}" ${extra} data-dica="${esc(t)}"><span class="top">${top}<span class="esp"></span>${est ? `<span class="est ${est}"></span>` : ''}</span><b>${esc(t)}</b><span class="q">${esc(q)}</span></button>`;
  const pjs = [...CONVS.filter(t => t.p).map(t => card('abrir', t.id, `<span class="cor mini" style="background:${cor(t.p.n)}"></span>${esc(t.p.n)}`, t.titulo, 'aberta · ' + quandoDe(t.t0), estadoLado(t))),
    ...PROJ.filter(p => p.ult && p.ult.sessao && !CONVS.some(t => t.sessao === p.ult.sessao)).sort((a, b) => String(b.ult.quando).localeCompare(String(a.ult.quando))).map(p => card('ultima', p.dir, `<span class="cor mini" style="background:${cor(p.n)}"></span>${esc(p.n)}`, (p.ult.txt || 'Última conversa').slice(0, 120), p.ult.quando || '', '', `data-dir="${esc(p.dir)}"`))].slice(0, 6);
  const mss = [...CONVS.filter(t => !t.p).map(t => card('abrir', t.id, `${ic('chat')}Mensagem`, t.titulo, 'aberta', estadoLado(t))), ...rascLivres().map(r => card('msgFechada', r.id, `${ic('chat')}Mensagem`, r.titulo, r.quando || ''))].slice(0, 6);
  const pags = [pjs.join('') || '<div class="vazio-lado">Nenhuma conversa de projeto ainda</div>', mss.join('') || '<div class="vazio-lado">Nenhuma mensagem ainda</div>',
    NOTAS.slice(0, 5).map(r => card('nota', r.id, `${ic('lapis')}Rascunho`, r.titulo, quandoDe(r.quando))).join('') + `<button class="rc-card" data-acao="novaNota" style="align-items:center;justify-content:center;flex-direction:row;color:var(--fg3);border-style:dashed">${ic('mais')}Novo rascunho</button>`];
  const nomes = [['pasta', 'Projetos', pjs.length], ['chat', 'Mensagens', mss.length], ['lapis', 'Rascunhos', NOTAS.length]];
  setTimeout(() => posTraco(false), 0);
  return `<div class="recentes"><div class="rc-abas">${nomes.map(([i, n, q], k) => `<button class="rc-aba ${k === rcAba ? 'on' : ''}" data-acao="rcAba" data-k="${k}">${ic(i)}${n}<span class="n">${q}</span></button>`).join('')}<span class="rc-traco"></span></div>
    <div class="rc-janela"><div class="rc-trilho" style="transform:translateX(${-100 * rcAba}%)">${pags.map(p => `<div class="rc-pag">${p}</div>`).join('')}</div></div></div>`;
}
function posTraco(anima) { const a = $('.rc-aba.on'), t = $('.rc-traco'); if (!a || !t) return; if (!anima) t.style.transition = 'none'; t.style.left = a.offsetLeft + 'px'; t.style.width = a.offsetWidth + 'px'; t.getBoundingClientRect(); t.style.transition = ''; }
function vistaHTML() {
  if (atual.tipo === 'nova' || atual.tipo === 'inicio') {
    const pj = cfg.projeto ? projDe(cfg.projeto) : null, nome = CONTA.email ? CONTA.email.split('@')[0] : '';
    const sug = pj ? ['Continue de onde parou.', 'O que falta eu testar?', 'Revise o código.'] : ['Explique um assunto', 'Escreva um texto', 'Planeje a semana'];
    return `<div class="vista"><div class="vazia"><h1 class="saudacao">${ic('faisca')}${saud}${nome ? ", " + esc(nome) : ""}</h1>${caixaHTML(true, atual.texto || '')}
      ${atual.tipo === 'inicio' ? inicioHTML() : `<div class="sugestoes">${sug.map(s => `<button class="btn" data-acao="sugestao">${s}</button>`).join('')}</div>`}</div></div>`;
  }
  if (atual.tipo === 'nota') {
    const r = NOTAS.find(x => x.id === atual.id);
    return `<div class="vista"><div class="nota"><input id="n-tit" value="${esc(r.titulo)}" placeholder="Título"><textarea id="n-txt" placeholder="Escreva a ideia…">${esc(r.texto)}</textarea>
      <div class="nota-rod">${ic('ck')}<span id="n-salvo">Salvo</span><div class="esp"></div><button class="btn perigo" data-acao="apagarNota">Apagar</button><button class="btn prim" data-acao="usarNota">${ic('seta')}Começar conversa com isso</button></div></div></div>`;
  }
  const t = tAtual();
  return `<div class="vista"><div class="fio" id="fio"><div class="fio-in"><div id="itens" style="display:contents"></div><div id="rodape"></div></div></div>${caixaHTML(false, t.texto || '')}</div>`;
}
function mostrar(sem) {
  const palco = $('#palco'), antes = $('.caixa', palco)?.getBoundingClientRect();
  palco.innerHTML = vistaHTML(); desenharCab();
  const v = $('.vista', palco); if (!sem) v.classList.add('troca-entra');
  const cx = $('.caixa', palco);
  if (antes && cx) { const d = cx.getBoundingClientRect(), dy = antes.top - d.top, dx = antes.left - d.left;
    if (Math.abs(dy) > 4) { v.classList.remove('troca-entra'); cx.style.transition = 'none'; cx.style.transform = `translate(${dx}px,${dy}px)`; cx.getBoundingClientRect(); cx.style.transition = 'transform .38s cubic-bezier(.2,.8,.2,1)'; cx.style.transform = ''; $$('.fio-in > *, .sugestoes, .saudacao, .recentes', palco).forEach(e => e.style.animationDelay = '.12s'); } }
  const t = tAtual(); if (t) { t.visto = true; t.cacheB = []; t.irFim = true; if (painelAberto !== 'Passos' && ler('ca-passos-lado', false)) painel('Passos'); renderConv(t, true); tourConvSePrimeira(); }
  ligarCaixa();
  if (atual.tipo === 'nota') { const r = NOTAS.find(x => x.id === atual.id), ti = $('#n-tit'), x = $('#n-txt'); let tm;
    // o texto vale na hora (sair ou "Começar conversa" antes de 0,5 s não perde nada); só o gravar e o aviso esperam
    const salva = () => { r.titulo = ti.value || 'Sem título'; r.texto = x.value; r.quando = Date.now(); $('#n-salvo').textContent = 'Salvando…'; clearTimeout(tm); tm = setTimeout(() => { salvarNotas(); const s = $('#n-salvo'); if (s) s.textContent = 'Salvo'; desenharLado(); }, 500); };
    ti.oninput = salva; x.oninput = salva; }
  desenharLado();
}

/* ---------- conversa: desenho em blocos (só o que mudou) ---------- */
function blocos(box, B, cache) {
  const filhos = box.children;
  B.forEach((h, i) => { if (cache[i] === h) return; cache[i] = h; let d = filhos[i]; if (!d) { d = document.createElement('div'); d.style.display = 'contents'; box.appendChild(d); } d.innerHTML = h; });
  while (filhos.length > B.length) box.lastChild.remove(); cache.length = B.length;
}
function renderConv(t, forca) {
  if (tAtual() !== t) return; const box = $('#itens'), rod = $('#rodape'), f = $('#fio'); if (!box) return;
  const perto = f.scrollHeight - f.scrollTop - f.clientHeight < 80;
  if (forca || !t.cacheB) t.cacheB = []; blocos(box, C.itensBlocos(t, false), t.cacheB);
  const r = C.rodapeHTML(t, false); if (rod.dataset.h !== r) { rod.dataset.h = r; rod.innerHTML = r; }
  if (t.irFim || perto) { f.style.scrollBehavior = 'auto'; f.scrollTop = f.scrollHeight; f.style.scrollBehavior = ''; t.irFim = false; }
  botaoEnviar();
  if (painelAberto === 'Passos') renderPassos(t, forca);
}
// painel "Passos": pensamentos e ferramentas fora do chat (mesmo desenho em blocos, só o que mudou)
function renderPassos(t, forca) {
  const pag = $('.pn-pag[data-pag="Passos"]'); if (!pag) return;
  if (pag.dataset.conv !== t.id || forca) { pag.dataset.conv = t.id; pag.innerHTML = '<div class="pn-passos"><div class="pn-passos-in"></div><div class="pn-vazio" hidden>Nenhum passo ainda: quando o Claude pensar, ler, rodar ou mudar algo, aparece aqui.</div></div>'; t.cacheP = []; pag.scrollTop = pag.scrollHeight; }
  const box = $('.pn-passos-in', pag), perto = pag.scrollHeight - pag.scrollTop - pag.clientHeight < 80;
  const B = C.itensBlocos(t, 'so'); blocos(box, B, t.cacheP || (t.cacheP = []));
  $('.pn-vazio', pag).hidden = B.some(h => /c-lin/.test(h));
  if (perto) pag.scrollTop = pag.scrollHeight;
}
let pend = false;
function draw() { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; const t = tAtual(); if (t) { renderConv(t); desenharCab(); } desenharLado(); }); }
setInterval(() => { const t = tAtual(); if (!t || (t.estado !== 'trabalhando' && !(t.bg || []).length)) return; const v = C.rodapeVivo(t, false), a = $('#rodape .claude-ast'), s = $('#rodape .c-trab-s'); if (a) a.textContent = v.g; if (s) s.textContent = v.s; }, 200);

/* ---------- abrir, enviar, permissões (porta de app.js) ---------- */
let PREP = null;
function novaConv(p, modo, extra = {}) {
  const t = { id: 'c' + (seq++), p, modo, dir: p ? p.dir : D.livre, sessao: extra.sessao || uuid(), antes: extra.antes, titulo: extra.titulo || (p ? p.n : 'Mensagem'), nomeado: !!extra.nomeado,
    modelo: extra.modelo || cfg.modelo, esf: extra.esf || cfg.esf, pensar: extra.pensar != null ? extra.pensar : pensarPadrao(), modo4: extra.modo4 || cfg.modo,
    itens: [], abertos: {}, streamados: new Set(), estado: 'abrindo', t0: Date.now(), fila: [], visto: true, usada: false, anexos: [], texto: '' };
  CONVS.push(t); return t;
}
async function abrir(p, modo, extra = {}) {
  const t = novaConv(p, modo, extra);
  if (!extra.fundo) { atual = { tipo: 'conv', id: t.id }; if (!p && painelAberto && painelAberto !== 'Passos') painel(null); mostrar(); aoAbrir(); }
  if (extra.primeira) { t.pendUid = uuid(); t.itens.push({ k: 'eu', txt: extra.primeira, uid: t.pendUid }); t.pendente = extra.primeira; t.usada = true; t.titulo = extra.titulo || tituloDe(extra.primeira); draw(); }
  await PREP;
  let r = await api.chatAbrir({ ...chatOpts(t), modo: extra.modoChat || modo, sessao: t.sessao, antes: t.antes }).catch(e => ({ erro: e.message }));
  if (r && r.semConversa) { t.sessao = uuid(); r = await api.chatAbrir({ ...chatOpts(t), modo: p ? 'nova' : 'livre', sessao: t.sessao }).catch(e => ({ erro: e.message })); }
  if (!CONVS.includes(t)) return null;
  if (!r || r.erro) { fecharConv(t, true); aviso((r && r.erro) || 'Não consegui abrir o Claude Code.'); return null; }
  t.sessao = r.sessao || t.sessao;
  if (r.comandos && r.comandos.length) { t.comandos = r.comandos; gravar('ca-cmds', r.comandos); }
  if (r.historico && r.historico.length) {
    const novos = t.itens; t.itens = []; if (r.antes) t.antes = r.antes;
    for (const m of r.histAntes || []) C.aplicar(t, m, false); if ((r.histAntes || []).length) t.itens.push({ k: 'troca', txt: 'Continua numa conversa nova: o Claude sabe onde parou' });
    for (const m of r.historico) C.aplicar(t, m, false);
    t.itens.push({ k: 'troca', txt: extra.voltou ? `Voltou de onde você fechou (${extra.voltou})` : 'Conversa retomada' }, ...novos); t.usada = true;
  } else if (!t.itens.length) t.vazio = p ? `Conversa nova em ${p.n}.` : 'Conversa nova.';
  t.estado = 'esperando'; t.t0 = Date.now(); t.irFim = true; t.cacheB = [];
  api.chatModo(t.id, MODOS[t.modo4][2]).catch(() => { });
  if (t.pendente) { api.chatEnviar(t.id, t.pendente, t.pendUid); t.pendente = null; t.pendUid = null; t.estado = 'trabalhando'; t.t0 = Date.now(); }
  salvarSessao(); draw(); if (tAtual() === t) renderConv(t, true);
  return t;
}
const tituloDe = x => { x = String(x).replace(/\s+/g, ' ').trim(); return x.length > 38 ? x.slice(0, 38).trim() + '…' : x || 'Conversa'; };
function comAnexos(L, txt) { return C.refsAnexos(L) + txt; }
function enviarNova() {
  const x = $('#txt'), txt = x.value.trim(); if (!txt && !cfg.anexos.length) return;
  if (CONTA.estado !== 'ok' && CONTA.estado !== 'conf') return (A.contaNova(), aviso('Entre na conta do Claude primeiro.'));
  const msg = comAnexos(cfg.anexos, txt); cfg.anexos = []; atual.texto = '';
  const p = cfg.projeto ? projDe(cfg.projeto) : null;
  const m4 = cfg.modo; if (cfg.modo === 'plano') cfg.modo = modoPadrao();
  abrir(p, p ? 'nova' : 'livre', { primeira: msg, modo4: m4 }).then(t => { if (t) { const e = $(`.lado [data-id="${t.id}"]`); e?.classList.add('surge'); } });
  if (p) { abreGrupo(p.dir); }
}
function enviar(t, daFila) {
  const x = $('#txt'); let txt = daFila || (x ? x.value.trim() : '');
  if (!daFila && (t.anexos || []).length) { txt = comAnexos(t.anexos, txt); t.anexos = []; }
  if (!txt) return;
  const limpa = () => { if (daFila || !x) return; x.value = ''; t.texto = ''; refazerCaixa(''); };
  if (!daFila && t.editando) { limpa(); return reenviarEditado(t, txt); }
  if (t.estado === 'encerrada') { limpa(); const u = uuid(); t.itens.push({ k: 'eu', txt, uid: u }); t.irFim = true; return reabrir(t, txt, u); }
  if (!daFila && t.estado === 'trabalhando') {   // 24/11 (pedido dele): espera 2,5 s antes de mandar; clicar nela devolve o texto para a caixa
    if (t.espera) liberarEspera(t);
    limpa(); t.espera = { txt, t0: Date.now(), timer: setTimeout(() => liberarEspera(t), 2500) }; t.irFim = true; renderConv(t, true); return;
  }
  if (!daFila && t.estado === 'pede') { t.fila.push(txt); limpa(); t.irFim = true; draw(); return; }
  const uid = t.estado === 'abrindo' && t.pendUid ? t.pendUid : uuid();
  t.itens.push({ k: 'eu', txt, antes: t.ultUuid, uid }); limpa(); t.vazio = '';
  if (t.estado === 'abrindo') { t.pendUid = uid; t.pendente = (t.pendente ? t.pendente + '\n\n' : '') + txt; t.irFim = true; draw(); return; }
  t.estado = 'trabalhando'; t.t0 = Date.now(); t.irFim = true;
  if (!t.usada) { t.usada = true; salvarSessao(); }
  api.chatEnviar(t.id, txt, uid); draw();
}
function liberarEspera(t) {
  const e = t.espera; if (!e) return; clearTimeout(e.timer); t.espera = null;
  if (!CONVS.includes(t)) return;
  if (t.estado !== 'trabalhando' && t.estado !== 'pede') { enviar(t, e.txt); return; }   // Claude finished meanwhile: normal send
  const lado = { k: 'lado', txt: '', esp: true }; t.itens.push({ k: 'eu', txt: e.txt, antes: t.ultUuid }, lado); t.irFim = true; draw();
  const pronto = r => { r = r || {}; if (r.erro === 'sem-lado') t.itens.splice(t.itens.indexOf(lado), 1); else { lado.esp = false; lado.txt = r.txt || r.erro || 'Não consegui responder agora.'; } t.irFim = true; draw(); };
  api.chatJunto(t.id, e.txt).then(pronto, err => pronto({ erro: err.message }));
}
async function reabrir(t, txt, uid) {
  t.estado = 'abrindo'; draw();
  let r = await api.chatAbrir({ ...chatOpts(t), modo: 'resume', sessao: t.sessao, antes: t.antes }).catch(e => ({ erro: e.message }));
  if (r && (r.erro || r.semConversa)) { t.sessao = uuid(); r = await api.chatAbrir({ ...chatOpts(t), modo: 'nova', sessao: t.sessao }).catch(e => ({ erro: e.message })); }
  if (!r || r.erro) { t.itens.push({ k: 'erro', txt: (r && r.erro) || 'Não consegui reabrir a conversa.' }); t.estado = 'encerrada'; return draw(); }
  t.sessao = r.sessao || t.sessao; t.estado = 'trabalhando'; t.t0 = Date.now(); api.chatEnviar(t.id, txt, uid); salvarSessao(); draw();
}
async function reenviarEditado(t, txt) {
  const ed = t.editando; t.editando = null;
  const uid = uuid(); t.itens.splice(ed.i); t.itens.push({ k: 'eu', txt, antes: ed.antes, uid }); t.ultUuid = ed.antes; t.vazio = ''; t.irFim = true; t.usada = true; t.cacheB = [];
  t.estado = 'abrindo'; api.chatFechar(t.id); draw();
  const o = chatOpts(t);
  const r = ed.antes ? await api.chatAbrir({ ...o, modo: 'resume', sessao: t.sessao, ate: ed.antes }) : await api.chatAbrir({ ...o, modo: 'nova', sessao: uuid() });
  if (!CONVS.includes(t)) return;
  if (!r || r.erro) { t.itens.push({ k: 'erro', txt: (r && r.erro) || 'Não consegui reabrir a conversa para editar.' }); t.estado = 'encerrada'; return draw(); }
  if (!ed.antes) t.sessao = r.sessao;
  t.estado = 'trabalhando'; t.t0 = Date.now(); api.chatEnviar(t.id, txt, uid); salvarSessao(); draw();
}
function interromper(t) {
  if (t.estado !== 'trabalhando' && t.estado !== 'pede') return;
  for (const x of t.itens) if (x.k === 'perm' && !x.resp) x.resp = 'negado';
  t.itens.push({ k: 'interrompido' }); t.estado = 'esperando'; filaNaCaixa(t);
  api.chatParar(t.id); draw();
}
// parar pede 1 s segurando (mesma animação do ✕), para não cancelar sem querer
let segPara = null;
function segurarParar() { const t = tAtual(); if (segPara || !t) return; $('.enviar')?.classList.add('segurando'); segPara = setTimeout(() => { soltarParar(); if (tAtual() === t) interromper(t); }, 1000); }
function soltarParar() { clearTimeout(segPara); segPara = null; $('.enviar')?.classList.remove('segurando'); }
document.addEventListener('mousedown', e => { if (e.button === 0 && e.target.closest('.enviar.parar')) segurarParar(); });
document.addEventListener('mouseup', soltarParar);
document.addEventListener('mouseout', e => { const b = e.target.closest('.enviar'); if (b && !b.contains(e.relatedTarget)) soltarParar(); });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && e.target.closest('.enviar.parar')) segurarParar(); });
document.addEventListener('keyup', e => { if (['Escape', 'Enter', ' '].includes(e.key)) soltarParar(); });
addEventListener('blur', soltarParar);
function soltarFila(t) { if (t.fila.length && t.estado === 'esperando') enviar(t, t.fila.splice(0).join('\n\n')); }
function filaNaCaixa(t) { if (!t.fila.length) return; const x = t.fila.splice(0).join('\n\n'); t.texto = t.texto && t.texto.trim() ? t.texto + '\n' + x : x; if (tAtual() === t) refazerCaixa(t.texto); }
function responderPerm(t, acao, item) {
  let it = item; if (!it) for (let i = t.itens.length - 1; i >= 0; i--) if (t.itens[i].k === 'perm' && !t.itens[i].resp) { it = t.itens[i]; break; }
  if (!it) return;
  if (it.tool === 'AskUserQuestion' && acao !== 'negado') {
    const qs = it.input.questions || [], answers = {};
    qs.forEach((q, qi) => { const sel = it.escolhas[qi] || []; if (sel.length) answers[q.question] = sel.map(oi => q.options[oi].label).join(', '); });
    if (Object.keys(answers).length < qs.length) return;
    it.resp = 'respondido'; it.resumo = Object.values(answers).join(' · ');
    api.chatPerm(t.id, it.req, { acao: 'ok', input: { answers } });
  } else {
    it.resp = acao;
    if (acao === 'cadeia' || acao === 'sempre') for (const x of t.itens) if (x.k === 'perm' && !x.resp && x.tool !== 'AskUserQuestion' && x.tool !== 'ExitPlanMode') x.resp = acao;
    const msg = it.tool === 'ExitPlanMode' ? 'O usuário quer mudanças no plano: pergunte o que mudar.' : it.tool === 'AskUserQuestion' ? 'O usuário preferiu não responder agora.' : 'O usuário negou.';
    api.chatPerm(t.id, it.req, acao === 'negado' ? { acao: 'negar', msg } : { acao: acao === 'sempre' ? 'sempre' : acao === 'cadeia' || acao === 'aprovado' ? 'cadeia' : 'ok' });
  }
  if (!pedePerm(t)) { t.estado = 'trabalhando'; t.t0 = Date.now(); }
  draw();
}
const PAPO = /^\s*(oi+|ol[áa]|e a[íi]|bom dia|boa (tarde|noite)|tudo bem\??|obrigad\w*|valeu|blz|beleza|ok|teste?)\s*[!.?]*\s*$/i;
async function nomear(t) {
  if (t.nomeado || t.nomeando) return;
  const eu = t.itens.filter(x => x.k === 'eu').map(x => C.separaAnexos(x.txt).txt).filter(x => x && !PAPO.test(x) && !/^\s*\//.test(x));
  if (!eu.length || eu.join(' ').length < 12) return;
  const ia = t.itens.filter(x => x.k === 'ia').map(x => x.md).join('\n');
  t.nomeando = true; const n = await api.chatTitulo(eu.join('\n'), ia, t.modelo, t.sessao, t.dir).catch(() => ''); t.nomeando = false;
  if (n && CONVS.includes(t)) { t.titulo = n; t.nomeado = true; salvarSessao(); draw(); }
}
function guardarConversa(t) {
  if (!t.usada) return;
  if (!t.p) { setTimeout(carregarRasc, 1500); return; }
  const u = [...t.itens].reverse().find(x => x.k === 'ia' || x.k === 'eu'); if (!u) return;
  const txt = (u.k === 'ia' ? u.md : 'Você: ' + u.txt).replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim();
  const d = new Date(), quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hhmm(d)}`;
  const x = { dir: t.p.dir, sessao: t.sessao, modelo: t.modelo, esf: t.esf, pensar: t.pensar, quando, txt: txt.length > 220 ? txt.slice(0, 220) + '…' : txt };
  api.conversaFechada(x); t.p.ult = x;
}
function fecharConv(t, forca) {
  if (!forca && (ocupada(t)) && !confirm('O Claude ainda está trabalhando nesta conversa. Fechar mesmo assim?')) return;
  guardarConversa(t); api.chatFechar(t.id);
  CONVS.splice(CONVS.indexOf(t), 1);
  if (atual.tipo === 'conv' && atual.id === t.id) { atual = { tipo: 'inicio' }; painel(null); mostrar(); } else desenharLado();
  salvarSessao();
}
const abasSalvas = () => CONVS.filter(t => t.usada).map(t => ({ nome: t.titulo, nomeado: !!t.nomeado, dir: t.dir, proj: t.p ? t.p.n : '', modo: t.modo, sessao: t.sessao, antes: t.antes, modelo: t.modelo, esf: t.esf, pensar: t.pensar, continuar: ocupada(t), texto: t.texto || '', ativa: t === tAtual() }));
const salvarSessao = () => api.sessao(abasSalvas());
addEventListener('beforeunload', () => { salvarNotas(); for (const t of CONVS) guardarConversa(t); });
function carregarRasc() { api.rascunhos().then(L => { RASC = L || []; draw(); if (atual.tipo === 'inicio') mostrar(true); }).catch(() => { }); }
function usoVivo(u) { if (u && (u.sessao || u.semana)) { LIM = u; draw(); } }
// time left until a limit window resets ('' when unknown or already over)
function falta(j) { const min = Math.ceil(((j && j.ate || 0) - Date.now()) / 60000); if (min <= 0) return ''; const d = Math.floor(min / 1440), h = Math.floor(min % 1440 / 60); return d ? `${d} d ${h} h` : h ? `${h} h ${min % 60} min` : `${min} min`; }
function lerUso() { api.limUso('').then(usoVivo).catch(() => { }); }

/* ---------- mensagens do main ---------- */
api.ao('chat:msg', (id, m) => {
  const t = convDe(id); if (!t) return;
  C.aplicar(t, m, true);
  if (m.type === 'limite' && m.uso != null && m.tipo) { const x = { pct: Math.round(m.uso * (m.uso <= 1 ? 100 : 1)), volta: m.volta ? hhmm(new Date(m.volta * 1000)) : '', ate: m.volta ? m.volta * 1000 : 0 }; const L = { ...(LIM || {}) }; if (m.tipo === 'five_hour') L.sessao = x; if (m.tipo === 'seven_day') L.semana = x; usoVivo(L); }
  if (m.type === 'limite' && m.status === 'rejected') setTimeout(() => autoTrocar(t, m.volta), 1500);
  if (m.type === 'system' && m.subtype === 'init' && m.session_id && m.session_id !== t.sessao) { t.sessao = m.session_id; salvarSessao(); }
  if (m.type === 'result') { if (m.uso) t.tok = (t.tok || 0) + m.uso.ent + m.uso.sai; t.rTok = null; t.rUlt = null; setTimeout(() => lerUso(), 1500); }
  if ((m.type === 'stream_event' || m.type === 'assistant') && t.estado === 'esperando') { t.estado = 'trabalhando'; t.t0 = Date.now(); }
  if (m.type === 'assistant' && (m.content || []).some(b => b.type === 'tool_use' && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(b.name))) t.mudou = true;
  if (m.type === 'result' && !m.erro) nomear(t);
  if (m.type === 'result') {
    if (!pedePerm(t)) { if (t.estado === 'trabalhando' && t !== tAtual()) t.visto = false; t.estado = 'esperando'; soltarFila(t); }
    if (painelAberto && tAtual() === t) preencherPainel(painelAberto);
  }
  draw();
});
api.ao('chat:ctx', (id, x) => { const t = convDe(id); if (!t || !x || !x.max) return; t.ctx = x; if (tAtual() !== t) return;
  const v = $('.ctx-chip'); if (v) v.outerHTML = ctxHTML(t); else $('.caixa-rod [data-acao="modelo"]')?.insertAdjacentHTML('beforebegin', ctxHTML(t)); });
api.ao('chat:modo', (id, modo) => { const t = convDe(id); if (!t) return; const k = modo === 'plan' ? 'plano' : modo === 'auto' ? 'auto' : 'perguntar'; if (t.modo4 === k) return;
  if (t.modo4 === 'plano') t.itens.push({ k: 'troca', txt: 'Plano aprovado: agora ele pode mudar arquivos (' + MODOS[k][0] + ')' });
  t.modo4 = k; if (tAtual() === t) refazerCaixa(); draw(); });
api.ao('abrir-conv', id => { if (convDe(id)) A.abrir({ dataset: { id } }); });
api.ao('chat:perm', (id, x) => { const t = convDe(id); if (!t) return; const f = C.ferramenta(x.tool, x.input, t.dir);
  t.itens.push({ k: 'perm', req: x.req, tool: x.tool, ia: x.ia, input: x.input, dir: t.dir, resumo: x.tool === 'ExitPlanMode' ? '' : f.alvo, escolhas: {} });
  t.estado = 'pede'; t.irFim = true; if (t !== tAtual()) t.visto = false; draw(); });
api.ao('chat:perm-fim', (id, req, resp) => { const t = convDe(id); if (!t) return; const it = t.itens.find(x => x.req === req); if (it && !it.resp) it.resp = resp || 'cancelado'; if (t.estado === 'pede' && !pedePerm(t)) t.estado = 'trabalhando'; draw(); });
api.ao('chat:fim', (id, erro) => { const t = convDe(id); if (!t) return; t.bg = []; if (erro) t.itens.push({ k: 'erro', txt: 'O Claude Code fechou: ' + erro.slice(0, 200) }); t.estado = 'encerrada'; filaNaCaixa(t); if (t !== tAtual()) t.visto = false; draw(); salvarSessao(); });
api.ao('chat:auto', (id, v) => { const t = convDe(id); if (!t) return; t.modelo = v.modelo; t.esf = v.esf; salvarSessao(); if (tAtual() === t) refazerCaixa(); });
api.ao('chat:passagem', (id, x) => { const t = convDe(id); if (!t) return;
  if (x.fase === 1) { t.itens.push({ k: 'troca', txt: `Conversa grande (${x.mil} mil tokens): anotando onde parou para seguir numa conversa nova` }); t.estado = 'trabalhando'; t.t0 = Date.now(); }
  else if (x.fase === 2 || x.fase == null) { if (x.erro) { t.itens.push({ k: 'erro', txt: 'Não consegui abrir a conversa nova: ' + x.erro }); t.estado = 'encerrada'; } else if (x.sessao) { t.antes = t.sessao; t.sessao = x.sessao; t.itens.push({ k: 'troca', txt: 'Continua numa conversa nova: o Claude sabe onde parou' }); t.estado = x.pend ? 'trabalhando' : 'esperando'; salvarSessao(); soltarFila(t); } }
  t.irFim = true; draw(); });
api.ao('previa:abrir', id => { const t = convDe(id); if (t && t === tAtual()) { if (painelAberto !== 'Prévia') painel('Prévia'); } else if (!$('#prev-if')) preencherPainel('Prévia'); });   // Claude asked for its browser (navegador_*)
api.ao('uso', usoVivo);
api.ao('rasc-mudou', carregarRasc);
api.ao('abrir-projeto', n => { const p = PROJ.find(x => x.n.toLowerCase() === String(n).toLowerCase()); if (p) A.ultima(null, p); });
api.ao('abrir-livre', (sessao, titulo) => abrir(null, 'livre', { sessao, modoChat: 'resume', titulo: titulo || 'Assistente', nomeado: true }));
api.ao('atualizacao', r => { if (r.estado === 'pronta') aviso('Versão nova do FCC baixada.'); });
api.ao('versao-pronta', () => { const b = $('.titulo .atualizar'); if (b) b.hidden = false; });
api.ao('tela-recarregar', () => { salvarSessao(); api.recarregarPronto(); });
api.ao('tela-atualizada', () => aviso('Aparência do FCC atualizada sem fechar.'));
// 25/11: window stays visible saying what is happening until it closes (before it vanished and seemed to do nothing)
api.ao('reiniciar', () => { salvarSessao(); botaoAtual('Atualizando…');
  document.body.insertAdjacentHTML('beforeend', '<div class="tampa atualizando"><div class="at-caixa"><span class="at-gira"></span><div><b>Atualizando o FCC…</b><small>Ele fecha e abre sozinho em alguns segundos, com as conversas onde estavam.</small></div></div></div>');
  setTimeout(() => api.janela('atualizar'), 600); });
api.ao('atualizando', () => botaoAtual('Atualizando…'));
function botaoAtual(t) { const b = $('.titulo .atualizar'); if (b) { b.hidden = false; b.disabled = true; b.textContent = t; } }

/* ---------- painéis à direita ---------- */
$('#paineis').innerHTML = `<div class="pn"><div class="pn-abas">${ABAS.map(a => `<button class="pn-aba" data-acao="aba" data-pn="${a}">${a}</button>`).join('')}<span class="pn-traco"></span><div class="esp"></div><button class="ib" data-acao="fecharPainel" data-dica="Fechar painel|Esc">${ic('fechar')}</button></div>
  <div class="pn-trilho">${ABAS.map(a => `<div class="pn-pag" data-pag="${a}"></div>`).join('')}</div></div>`;
const arqAbertas = new Set();
const quandoMud = ms => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
async function preencherPainel(nome) {
  const t = tAtual(); if (!t || (!t.p && nome !== 'Passos' && nome !== 'Prévia')) return; const pag = $(`.pn-pag[data-pag="${nome}"]`);
  if (nome === 'Passos') return renderConv(t, true);
  if (nome === 'Mudanças') {
    const L = await api.chatMud(t.id).catch(() => []); t.mudou = false; desenharCab();
    if (!L.length) { pag.innerHTML = '<div class="pn-vazio">Nada mudado por esta conversa ainda. Aqui aparece o histórico de arquivos editados e de comandos que mexem no PC, esteja onde estiver.</div>'; return; }
    const a = L.reduce((s, x) => s + x.a, 0), r = L.reduce((s, x) => s + x.r, 0);
    pag.innerHTML = `<div class="diff-cab"><span>${L.length} ${L.length === 1 ? 'mudança' : 'mudanças'} · <span class="mais">+${a}</span> <span class="menos">−${r}</span></span><div class="esp"></div></div>` +
      L.map(x => `<div class="diff-arq"><div class="diff-arq-cab" data-acao="mudAbre">${ic(x.tipo === 'cmd' ? 'term' : 'arq')}<span class="nome"><b>${esc(x.tipo === 'cmd' ? x.f : x.f.split('\\').pop())}</b><small>${esc(x.tipo === 'cmd' ? 'Comando · ' + (x.onde || '') : x.onde)}${x.t ? ' · ' + esc(quandoMud(x.t)) : ''}${x.novo ? ' · novo' : ''}</small></span>${x.tipo === 'cmd' ? '' : `<button class="btn" data-acao="abrirArq" data-f="${esc(x.abs || x.f)}">Abrir</button>`}</div><div class="linhas">${x.h.map(([s, l, ref]) => `<div class="ln ${s === '+' ? 'a' : s === '-' ? 'd' : s === '@' ? 'h' : ''}"><i></i>${esc(l)}${ref ? `<button class="btn desf" data-acao="mudDesfazer" data-ref="${esc(ref)}">Desfazer</button>` : ''}</div>`).join('')}</div></div>`).join('');
  } else if (nome === 'Prévia') {
    const url = localStorage.getItem('ca-previa:' + t.dir) || 'http://localhost:5173';
    if (pag.dataset.dir === t.dir) return; pag.dataset.dir = t.dir;
    // 24/11: <webview> = Claude's own browser too (navegador_* tools in main.js drive this same page)
    pag.innerHTML = `<div class="prev-barra"><button class="ib" data-acao="recarregar" data-dica="Recarregar">${ic('recarregar')}</button><div class="prev-url"><span class="ponto"></span><input id="prev-url" value="${esc(url)}" spellcheck="false"></div></div><div class="prev-tela"><webview id="prev-if" src="${esc(url)}" partition="persist:previa" allowpopups></webview><div class="pn-vazio prev-falhou" hidden>Nada respondendo neste endereço. Peça ao Claude para rodar o projeto ou digite outro endereço.</div></div>`;
    const wv = $('#prev-if'), dir = t.dir;
    const falhou = v => { $('.prev-falhou', pag).hidden = !v; $('.prev-url .ponto', pag).classList.toggle('falhou', v); };
    wv.addEventListener('did-start-loading', () => falhou(false)); wv.addEventListener('did-fail-load', e => { if (e.isMainFrame && e.errorCode !== -3) falhou(true); });
    const anda = e => { if (!/^https?:/.test(e.url)) return; $('#prev-url').value = e.url; localStorage.setItem('ca-previa:' + dir, e.url); };
    wv.addEventListener('did-navigate', anda); wv.addEventListener('did-navigate-in-page', e => e.isMainFrame && anda(e));
    $('#prev-url').onkeydown = e => { if (e.key !== 'Enter') return; let u = e.target.value.trim(); if (/^\d+$/.test(u)) u = 'http://localhost:' + u; if (!/^https?:\/\//.test(u)) u = (/^(localhost|127\.)/.test(u) ? 'http://' : 'https://') + u; e.target.value = u; wv.loadURL(u).catch(() => { }); };
  } else if (nome === 'Terminal') {
    const L = t.itens.filter(x => x.k === 'ferr' && (x.nome === 'Bash' || x.nome === 'PowerShell'));
    pag.innerHTML = L.length ? `<div class="term">${L.map(x => `<div class="term-bloco"><span class="p">${esc(t.p.n)} ${x.nome === 'Bash' ? '$' : '&gt;'}</span> <span class="cmd-b">${esc((x.inp && x.inp.command) || x.alvo)}</span>\n${x.out ? `<span class="${x.erro ? 'erro' : ''}">${esc(String(x.out).split('\n').slice(0, 80).join('\n'))}</span>` : x.res ? '' : '<span class="cursor"></span>'}</div>`).join('')}</div>` : '<div class="pn-vazio">O Claude ainda não rodou comandos nesta conversa.</div>';
  } else if (nome === 'Arquivos') {
    const y = pag.scrollTop, h = await arvoreHTML(t, '', 0); pag.innerHTML = `<div class="arvore">${h || '<div class="pn-vazio">Pasta vazia.</div>'}</div>`; pag.scrollTop = y;
  }
}
// folder tree: each folder expands in place, indented (arqAbertas = open folders, relative to the project)
async function arvoreHTML(t, rel, nivel) {
  const r = await api.arquivos(t.dir + (rel ? '\\' + rel : '')).catch(() => ({ dirs: [], files: [] })); let h = '';
  for (const d of r.dirs) { const p = rel ? rel + '\\' + d : d, ab = arqAbertas.has(p);
    h += `<button class="item arv${ab ? ' aberto' : ''}" style="padding-left:${10 + nivel * 16}px" data-acao="arqDir" data-n="${esc(p)}">${ic('chev', 'chev')}${ic('pasta')}<span class="nome">${esc(d)}</span></button>${ab ? await arvoreHTML(t, p, nivel + 1) : ''}`; }
  for (const f of r.files) h += `<button class="item arv" style="padding-left:${28 + nivel * 16}px" data-acao="arqAbrir" data-n="${esc(rel ? rel + '\\' + f : f)}">${ic('arq')}<span class="nome">${esc(f)}</span></button>`;
  return h;
}
function painel(nome) {
  const pn = $('#paineis');
  if (painelAberto === nome || !nome) { painelAberto = null; pn.classList.remove('aberto'); desenharCab(); gravar('ca-passos-lado', false); return; }
  const primeira = !painelAberto; painelAberto = nome; gravar('ca-passos-lado', nome === 'Passos');
  pn.classList.add('aberto');
  const i = ABAS.indexOf(nome), tr = $('.pn-trilho', pn), aba = $$('.pn-aba', pn)[i], traco = $('.pn-traco', pn);
  if (primeira) { tr.style.transition = 'none'; traco.style.transition = 'none'; }
  tr.style.transform = `translateX(${-460 * i}px)`; $$('.pn-aba', pn).forEach(a => a.classList.toggle('on', a === aba));
  traco.style.left = aba.offsetLeft + 'px'; traco.style.width = aba.offsetWidth + 'px';
  if (primeira) { tr.getBoundingClientRect(); tr.style.transition = ''; traco.style.transition = ''; }
  preencherPainel(nome); desenharCab();
}

/* ---------- menus, dicas, avisos, janelas ---------- */
let menuAberto = null;
function menu(ancora, html, onOp, cima) {
  fecharMenu(); const m = document.createElement('div'); m.className = 'menu'; m.innerHTML = html; document.body.appendChild(m);
  const r = ancora.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  let x = Math.min(r.left, innerWidth - mw - 8), y = cima || r.bottom + mh + 8 > innerHeight ? r.top - mh - 6 : r.bottom + 6;
  m.style.left = Math.max(8, x) + 'px'; m.style.top = Math.max(8, y) + 'px'; m.style.transformOrigin = y < r.top ? 'bottom left' : 'top left';
  m.onclick = e => { const o = e.target.closest('[data-op]'); if (o) { onOp(o.dataset.op, o); if (!o.dataset.fica) fecharMenu(); } };
  menuAberto = m; ancora.classList.add('on'); m.ancora = ancora; const p = $('.op', m); p && p.focus({ preventScroll: true });
}
function fecharMenu() { if (menuAberto) { menuAberto.ancora.classList.remove('on'); menuAberto.remove(); menuAberto = null; } }
const op = (k, nome, sub, sel, icone) => `<button class="op ${sel ? 'sel' : ''}" data-op="${esc(k)}">${icone ? ic(icone) : ''}<span class="nome">${nome}${sub ? `<small>${sub}</small>` : ''}</span>${ic('ck', 'ck')}</button>`;
function aviso(t) { $$('.aviso').forEach(e => e.remove()); const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; document.body.appendChild(a); setTimeout(() => { a.style.transition = 'opacity .3s'; a.style.opacity = 0; setTimeout(() => a.remove(), 300); }, 3200); }
let dicaT, dicaEl;
document.addEventListener('mouseover', e => { const a = e.target.closest('[data-dica]'); clearTimeout(dicaT); dicaEl?.remove(); dicaEl = null; if (!a || menuAberto || TOUR) return;
  dicaT = setTimeout(() => { const [t, s] = a.dataset.dica.split('|'); dicaEl = document.createElement('div'); dicaEl.className = 'dica'; dicaEl.innerHTML = s ? `<b>${esc(t)}</b>${esc(s)}` : esc(t); document.body.appendChild(dicaEl);
    const r = a.getBoundingClientRect(), w = dicaEl.offsetWidth, h = dicaEl.offsetHeight; let y = r.bottom + 8; if (y + h > innerHeight - 8) y = r.top - h - 8;
    dicaEl.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) + 'px'; dicaEl.style.top = y + 'px'; }, 500); });
document.addEventListener('mousedown', () => { clearTimeout(dicaT); dicaEl?.remove(); });
function janela(titulo, corpo, chave) {
  fecharMenu(); const v = $('.tampa'); if (v && chave && v.dataset.k === chave) { $('.jan-corpo', v).innerHTML = corpo; return; } v?.remove();
  const t = document.createElement('div'); t.className = 'tampa'; t.dataset.k = chave || ''; t.innerHTML = `<div class="jan"><div class="jan-cab">${titulo}<div class="esp"></div><button class="ib" data-acao="fecharJan" data-dica="Fechar|Esc">${ic('fechar')}</button></div><div class="jan-corpo">${corpo}</div></div>`;
  t.onmousedown = e => { if (e.target === t) fecharJan(); }; document.body.appendChild(t);
}
function fecharJan() { const t = $('.tampa'); if (!t) return; t.style.transition = 'opacity .15s'; t.style.opacity = 0; setTimeout(() => t.remove(), 150); }

let LOGIN_ON = false;
let opAba = 0;
function mostrarSeVazia() { if (atual.tipo === 'inicio' || atual.tipo === 'nova') { atual.texto = $('#txt')?.value || atual.texto; mostrar(true); } }
async function trocarConta(email) { aviso('Trocando de conta…'); const r = await api.contaUsar(email).catch(e => ({ erro: e.message }));
  if (r && r.login) { aviso(email + ': precisa entrar de novo.'); return A.contaNova({ dataset: { email } }); }
  if (r && r.erro) return aviso('Não troquei: ' + r.erro);
  CONTA = (r && r.conta) || await api.conta(); CONTAS = await api.contas(); LIM = null; lerUso(); refazLado(); mostrarSeVazia();
  aviso('Agora na conta ' + email + '. Conversas novas usam esta conta.'); if ($('.tampa')?.dataset.k === 'contas') A.contas(); }
// limite da conta acabou: passa para a próxima conta guardada com limite e manda "continue" (opção, ligada por padrão)
let autoT = 0;
async function autoTrocar(t, ate) {
  if (OP.autoConta === '0' || Date.now() - autoT < 60000) return; autoT = Date.now();
  const de = CONTA.email, p = await api.contaEsgotou(ate || 0).catch(() => null); if (!p) return aviso('O limite de ' + de + ' acabou e não há outra conta com limite.');
  aviso('Limite de ' + de + ' acabou: passando para ' + p.email + '…');
  const r = await api.contaUsar(p.email).catch(e => ({ erro: e.message })); if (!r || r.erro || r.login) return aviso('Não troquei para ' + p.email + ': ' + ((r && r.erro) || 'precisa entrar de novo') + '.');
  CONTA = r.conta || await api.conta(); CONTAS = await api.contas(); LIM = null; lerUso(); refazLado();
  for (const x of CONVS) if (x !== t && x.estado === 'esperando') { api.chatFechar(x.id); x.estado = 'encerrada'; }   // reabrem na conta nova ao mandar a próxima mensagem
  if (CONVS.includes(t)) { api.chatFechar(t.id); t.itens.push({ k: 'eu', txt: 'continue' }); t.irFim = true; await reabrir(t, 'continue'); }
  aviso('Agora em ' + p.email + ': o trabalho continuou.');
}
api.ao('login:url', () => { const b = $('#login-abrir'); if (b) b.disabled = false; if (BOAS && $('#boas')) boasDesenha('Termine a entrada no navegador; o FCC percebe sozinho.', true); });
api.ao('preparo', p => { if (!BOAS || !p || !p.et) return; const v = p.et.find(x => x.st === 'rodando'); if (v) { BOAS.inst = 'Instalando ' + v.nome + '…' + (p.cor === 'amb' && p.aviso ? ' ' + p.aviso : ''); boasDesenha(); } });
api.ao('login:fim', async r => { LOGIN_ON = false; const est = $('#login-est');
  if (BOAS && $('#boas')) { BOAS.ocupado = false; if (r.ok) { CONTA = r.conta; CONTAS = (await api.contas().catch(() => null)) || CONTAS; lerUso(); refazLado(); boasEntrou(); } else boasDesenha(r.erro === 'cancelado' ? '' : 'O login não terminou: ' + r.erro); return; }
  if (r.ok) { CONTA = r.conta; CONTAS = (await api.contas().catch(() => null)) || CONTAS; lerUso(); refazLado(); mostrarSeVazia(); aviso('Entrou como ' + r.conta.email + '.'); if ($('.tampa')?.dataset.k === 'login') A.contas(); }
  else if (r.erro !== 'cancelado' && est) { est.textContent = 'O login não terminou: ' + r.erro; const b = $('#login-ir'); if (b) b.disabled = false; } });
api.ao('conta', c => { if (!c) return; const outra = c.email !== CONTA.email; CONTA = c; if (outra) { LIM = null; api.contas().then(L => { CONTAS = L || []; }).catch(() => { }); } refazLado(); });
api.ao('tamanho', t => { OP.tam = t; });

async function porPasta(d) { if (!d) return false; const L = pastasOP(); if (!L.includes(d)) L.push(d); OP.pastas = L.join(';'); const r = await api.opcao('pastas', OP.pastas); if (r) { PROJ = r; refazLado(); } return true; }

/* ---------- primeiro uso (24/11, pedido dele): entrar na conta → tutorial enquanto instala o que falta → pasta de projetos ---------- */
let BOAS = null;   // { faltam, ocupado, inst, instalou, inst$ }
const instalarFundo = () => api.preparar(true).then(r => aviso(r && !r.falhou ? 'Tudo instalado.' : 'Algo não instalou: veja relatorios\\preparar.txt.')).catch(() => { });
function boas(faltam) { BOAS = { faltam: faltam || [] }; $('#boas')?.remove(); const el = document.createElement('div'); el.className = 'boas'; el.id = 'boas'; document.body.appendChild(el); boasDesenha(); }
function boasDesenha(msg, abriu) {
  const el = $('#boas'), B = BOAS; if (!el || !B) return; const F = B.faltam, semClaude = F.some(f => f.id === 'claude');
  const falta = F.length ? `<div class="boas-falta"><b>Falta neste PC</b>${F.map(f => `<span>${ic('mais')}${esc(f.nome)}</span>`).join('')}<small>${esc(B.inst || (semClaude ? 'O Claude Code é preciso para entrar. Ao clicar no botão eu instalo tudo isso (1 a 3 minutos).' : 'Ao clicar no botão eu instalo isso em segundo plano, enquanto você vê o tutorial.'))}</small></div>` : '';
  el.innerHTML = `<div class="boas-card"><h1 class="saudacao">${ic('faisca')}Bem-vindo ao FCC</h1><p>Entre com sua conta do Claude para começar. O navegador abre no site do Claude; quando você terminar lá, o FCC percebe sozinho.</p>${falta}
    <button class="btn prim boas-bt" data-acao="boasEntrar"${B.ocupado ? ' disabled' : ''}>${B.ocupado ? 'Esperando…' : F.length ? 'Instalar e entrar' : 'Entrar com o Claude'}</button>
    <p class="fraco">${esc(msg || '')}${abriu ? ' <button class="lnk" data-acao="loginAbrir">Abrir o navegador de novo</button>' : ''}</p></div>`;
}
function boasEntrou() {
  const B = BOAS, el = $('#boas'); if (!B) return; el?.classList.add('sai'); setTimeout(() => el?.remove(), 260);
  B.inst$ = B.faltam.length && !B.instalou ? instalarFundo() : Promise.resolve();
  aviso('Entrou como ' + CONTA.email + '.'); irInicio(); mostrar(true);
  const depois = () => B.inst$.then(boasPasta);
  if (ler('ca-tour-inicio', false)) depois(); else setTimeout(() => tour(TOURS.inicio, 'inicio', depois), 400);
}
function boasPasta() { BOAS = null; if (ler('ca-boas-pasta', false)) return; gravar('ca-boas-pasta', true);
  janela('Seus projetos', '<p>Você já tem uma pasta com seus projetos?</p><p class="fraco">Cada pasta dentro dela vira um projeto na barra lateral. Dá para mudar depois em Opções, Projetos.</p>' +
    '<div class="bts-jan"><button class="btn" data-acao="fechar">Depois</button><button class="btn" data-acao="boasCriar">Criar uma pasta</button><button class="btn prim" data-acao="boasTenho">Tenho, escolher</button></div>', 'pastas'); }
// conta já entrou mas falta algo no PC: pergunta antes de instalar
function perguntarFaltam(F) {
  janela('Falta algo neste PC', '<p>Para tudo funcionar falta instalar: <b>' + F.map(f => esc(f.nome)).join(', ') + '</b>.</p><p class="fraco">Instalo em segundo plano; você pode continuar usando o FCC.</p>' +
    '<div class="bts-jan"><button class="btn" data-acao="fechar">Agora não</button><button class="btn prim" data-acao="instalarFaltam">Instalar</button></div>', 'faltam'); }

const cart = (ico, nome, sub, direita = '') => '<div class="op-cart"><span class="op-ico">' + ic(ico) + '</span><span class="nome">' + nome + '<small>' + sub + '</small></span>' + direita + '</div>';

function exportar(t) {
  const md = ['# ' + t.titulo, ''];
  for (const x of t.itens) { if (x.k === 'eu') md.push('## Você', '', x.txt, ''); else if (x.k === 'ia') md.push('## Claude', '', x.md, ''); else if (x.k === 'lado') md.push('> ' + String(x.txt).replace(/\n/g, '\n> '), ''); else if (x.k === 'troca') md.push('*' + x.txt + '*', ''); }
  api.exportar(t.titulo, md.join('\n')).then(p => { if (p && p.erro) aviso('Não salvei: ' + p.erro); else if (p) aviso('Conversa salva em ' + p); }).catch(() => { });
}
async function voltarArquivos(t, i) {
  const it = t.itens[i]; if (!it || !it.uid) return; if (ocupada(t)) return aviso('Espere o Claude terminar (ou pare) para voltar arquivos.');
  const r = await api.chatVoltar(t.id, it.uid, it.txt, true).catch(e => ({ error: e.message }));
  if (!r || !r.canRewind) return aviso('Não dá para voltar daqui: ' + ((r && r.error) || 'sem ponto salvo para esta mensagem.'));
  const L = r.filesChanged || []; if (!L.length) return aviso('Nenhum arquivo mudou depois desta mensagem.');
  janela('Voltar arquivos', '<p>Voltar <b>' + L.length + (L.length === 1 ? ' arquivo' : ' arquivos') + '</b> para como ' + (L.length === 1 ? 'estava' : 'estavam') + ' antes desta mensagem? <span class="fraco">(+' + (r.insertions || 0) + ' −' + (r.deletions || 0) + ')</span></p>' +
    '<p class="fraco" style="max-height:160px;overflow:auto;white-space:pre-line">' + L.slice(0, 40).map(f => esc(String(f).split(/[\\/]/).slice(-2).join('\\'))).join('\n') + (L.length > 40 ? '\n…' : '') + '</p>' +
    '<p class="fraco">A conversa continua igual; só os arquivos voltam.</p><div class="bts-jan"><button class="btn" data-acao="fecharJan">Cancelar</button><button class="btn prim" data-acao="voltarOk" data-i="' + i + '">Voltar arquivos</button></div>', 'voltar');
}

/* ---------- ações ---------- */
const A = {
  barra() { barraB(); },
  tema(b) { const n = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro'; document.documentElement.dataset.tema = n; OP.tema = n; api.opcao('tema', n); b.innerHTML = ic(n === 'escuro' ? 'sol' : 'lua'); },
  minimizar() { api.janela('min'); }, maximizar() { api.janela('max'); },
  abrir(b) { if (atual.tipo === 'conv' && atual.id === b.dataset.id) return aoAbrir(); atual = { tipo: 'conv', id: b.dataset.id }; arqAbertas.clear(); const t = tAtual(); if (!t.p && painelAberto) painel(null); else if (painelAberto) preencherPainel(painelAberto); mostrar(); aoAbrir(); },
  ultima(b, pp) { const p = (pp && pp.dir) ? pp : projDe(b && b.dataset.dir); if (!p) return; const u = p.ult || {};
    if (u.sessao) abrir(p, 'continuar', { sessao: u.sessao, modelo: u.modelo, esf: u.esf, pensar: u.pensar, modoChat: 'resume', voltou: u.quando, titulo: 'Última conversa' }); else abrir(p, 'continuar'); },
  async msgFechada(b) { const id = b.dataset.id, c = RASC.find(x => x.id === id); if (!c) return; const r = await api.rascunho('abrir', id); if (!r || !r.ok) return aviso((r && r.erro) || 'Não deu certo.'); abrir(null, 'livre', { sessao: id, modoChat: 'resume', titulo: c.titulo, nomeado: true }); },
  nota(b) { atual = { tipo: 'nota', id: b.dataset.id }; painel(null); mostrar(); aoAbrir(); },
  nova(b) { cfg.projeto = b?.dataset?.pj || (tAtual()?.p?.dir || null); atual = { tipo: 'nova' }; painel(null); mostrar(); aoAbrir(); },
  inicio() { atual = { tipo: 'inicio' }; painel(null); mostrar(); },
  secao(b) { const s = b.closest('.secao'), id = s.dataset.sec; recolhidas.has(id) ? recolhidas.delete(id) : recolhidas.add(id); gravar('ca-recolhidas', [...recolhidas]); s.classList.toggle('recolhida'); },
  grupo(b, e) { if (e && e.detail > 1 && e.target.closest('img.pico')) return; const g = b.closest('.grupo'), d = g.dataset.pj; abertosG.has(d) ? abertosG.delete(d) : abertosG.add(d); gravar('ca-grupos', [...abertosG]); g.classList.toggle('aberto', abertosG.has(d)); setTimeout(() => { refazLado(); }, 260); },
  async novoProjeto() { const d = await api.escolherPasta(); if (!d) return; const L = pastasOP();
    if (!projDe(d)) { if (!L.includes(d)) L.push(d); OP.pastas = L.join(';'); const r = await api.opcao('pastas', OP.pastas); if (r) PROJ = r; }
    const p = projDe(d); if (!p) return aviso('Essa pasta não virou projeto. Escolha uma pasta dentro do seu local de projetos ou uma pasta de projeto.'); abreGrupo(p.dir); A.nova({ dataset: { pj: p.dir } }); },
  novaNota() { const r = { id: 'r' + Date.now(), titulo: 'Sem título', texto: '', quando: Date.now() }; NOTAS.unshift(r); salvarNotas(); atual = { tipo: 'nota', id: r.id }; painel(null); mostrar(); $(`.lado [data-id="${r.id}"]`)?.classList.add('surge'); setTimeout(() => $('#n-tit')?.select(), 80); },
  apagarNota() { const i = NOTAS.findIndex(r => r.id === atual.id); $(`.lado [data-id="${atual.id}"]`)?.classList.add('some'); setTimeout(() => { NOTAS.splice(i, 1); salvarNotas(); atual = { tipo: 'inicio' }; mostrar(); aviso('Rascunho apagado'); }, 220); },
  usarNota() { const r = NOTAS.find(x => x.id === atual.id); atual = { tipo: 'nova', texto: r.texto || (r.titulo === 'Sem título' ? '' : r.titulo) }; mostrar(); },
  sugestao(b) { const x = $('#txt'); x.value = b.textContent; x.dispatchEvent(new Event('input')); x.focus(); },
  rcAba(b) { rcAba = +b.dataset.k; $$('.rc-aba').forEach((x, i) => x.classList.toggle('on', i === rcAba)); $('.rc-trilho').style.transform = `translateX(${-100 * rcAba}%)`; posTraco(true); },
  painel(b) { painel(b.dataset.pn); }, aba(b) { painel(b.dataset.pn); }, fecharPainel() { painel(null); },
  abrirArq(b) { const t = tAtual(); if (t) api.abrirArq(t.dir, b.dataset.f); },
  mudAbre(b) { b.parentElement.classList.toggle('aberto'); },
  arqDir(b) { const n = b.dataset.n; arqAbertas.has(n) ? arqAbertas.delete(n) : arqAbertas.add(n); preencherPainel('Arquivos'); },
  arqAbrir(b) { const t = tAtual(); if (t) api.abrirArq(t.dir, b.dataset.n); },
  recarregar() { const f = $('#prev-if'); if (f) f.reload(); },
  enviar() { const t = tAtual(); if (!t) return enviarNova(); const b = $('.enviar'); if (b && b.classList.contains('parar')) return; enviar(t); },   // parar = só segurando
  ditar() { $('#txt')?.focus(); api.ditado().then(ok => { if (!ok) aviso('Não consegui abrir a digitação por voz. Tente Win+H.'); }); },
  resumir() { const t = tAtual(); if (!t) return; if (ocupada(t)) return aviso('Espere o Claude terminar para resumir.'); enviar(t, '/compact'); aviso('Resumindo a conversa para liberar espaço…'); },
  async mudDesfazer(b) { const t = tAtual(); if (!t) return; b.disabled = true; const r = await api.mudDesfazer(t.id, b.dataset.ref).catch(e => ({ erro: e.message }));
    if (!r || r.erro) { b.disabled = false; return aviso('Não desfiz: ' + ((r && r.erro) || 'erro')); } aviso('Trecho desfeito.'); preencherPainel('Mudanças'); },
  async voltarOk(b) { const t = tAtual(), it = t && t.itens[+b.dataset.i]; if (!it) return fecharJan(); b.disabled = true;
    const r = await api.chatVoltar(t.id, it.uid, it.txt, false).catch(e => ({ error: e.message })); fecharJan();
    if (!r || r.error || r.canRewind === false) return aviso('Não voltei: ' + ((r && r.error) || 'erro'));
    const s = C.separaAnexos(it.txt).txt.trim(); t.itens.push({ k: 'troca', txt: 'Arquivos voltaram para antes de "' + (s.length > 40 ? s.slice(0, 40) + '…' : s) + '"' }); t.irFim = true; t.mudou = true; draw(); aviso('Arquivos voltaram.'); },
  async anexar() { const L = await api.anexar(); if (!L || !L.length) return; const o = tAtual() || cfg; o.anexos = o.anexos || []; for (const c of L) o.anexos.push({ c }); refazerCaixa(); },
  escolherPasta(b) { menu(b, '<div class="tm">Onde</div>' + PROJ.map(p => op(p.dir, esc(p.n), esc(p.dir), cfg.projeto === p.dir)).join('') + '<hr>' + op('', 'Sem projeto', 'Vai para Mensagens', !cfg.projeto, 'chat'), k => { cfg.projeto = k || null; atual.texto = $('#txt').value; mostrar(true); }, true); },
  modo(b) { const t = tAtual(); menu(b, '<div class="tm">Permissão</div>' + Object.entries(MODOS).map(([k, [n, s]]) => op(k, n, s, (MODOS[t ? t.modo4 : cfg.modo] ? (t ? t.modo4 : cfg.modo) : cfg.modo) === k)).join(''), k => {
    if (t) { t.modo4 = k; if (t.estado !== 'abrindo') api.chatModo(t.id, MODOS[k][2]).catch(() => { }); } if (k === 'plano') { if (!t) cfg.modo = k; } else { cfg.modo = k; OP.perm = MODOS[k][2]; api.opcao('perm', OP.perm); } refazerCaixa(); }, true); },   // o último modo escolhido vira o padrão das próximas conversas e das próximas aberturas
  modelo(b) { const t = tAtual(), o = t || cfg;
    menu(b, '<div class="tm">Modelo</div>' + C.MODELOS.map(m => op('m' + m.id, m.n, m.d, o.modelo === m.id)).join('') + '<hr><div class="tm">Pensamento</div>' + C.ESF.map(([v, n, d]) => op('e' + v, n, d, o.esf === v)).join(''),
      k => { const v = k.slice(1); if (k[0] === 'm') { o.modelo = v; if (t) api.chatModelo(t.id, v).catch(() => { }); } else { o.esf = v; if (t) api.chatEsforco(t.id, v).catch(() => { }); } if (t) salvarSessao(); refazerCaixa(); }, true); },
  maisConv(b) { const t = tAtual(); if (!t) return;
    menu(b, op('r', 'Renomear', 0, 0, 'lapis') + (t.p ? op('pa', 'Abrir a pasta do projeto', 0, 0, 'pasta') + op('px', 'Abrir o programa', 'O .exe em dist\\', 0, 'previa') + op('pp', 'Abrir o PARADA', 'Onde o projeto parou', 0, 'arq') : '') + op('x', 'Exportar conversa', 'Salva como arquivo .md', 0, 'seta') + '<hr>' + op('f', 'Fechar conversa', t.p ? 'Fica em "Última conversa" do projeto' : 'Fica em Mensagens', 0, 'fechar'), k => {
      if (k === 'f') fecharConv(t);
      else if (k === 'x') exportar(t);
      else if (k === 'pa') api.pasta(t.dir);
      else if (k === 'px') api.programa(t.p.dir).then(x => aviso(x ? x + ' aberto.' : t.p.n + ' ainda não tem .exe em dist\\.'));
      else if (k === 'pp') api.parada(t.p.dir).then(x => { if (!x) aviso(t.p.n + ' não tem docs\\PARADA.md.'); });
      else if (k === 'r') { janela('Renomear conversa', `<input id="ren" class="campo" style="width:100%;height:36px;border-radius:8px;border:1px solid var(--linha);background:var(--sup);color:var(--fg);padding:0 10px;font:inherit" value="${esc(t.titulo)}"><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn prim" data-acao="renOk">Salvar</button></div>`);
        const i = $('#ren'); i.select(); i.onkeydown = e => { if (e.key === 'Enter') A.renOk(); }; } }); },
  renOk() { const t = tAtual(), v = $('#ren')?.value.trim(); if (t && v) { t.titulo = v; t.nomeado = true; salvarSessao(); desenharCab(); desenharLado(); } fecharJan(); },
  // 25/11 (pedido dele): renomear o projeto por completo. Aviso antes: na próxima vez o Claude renomeia tudo do projeto antes de atender o pedido (inegociável)
  renProj(b) { const p = projDe(b.dataset.dir); if (!p) return;
    if (CONVS.some(t => t.p === p)) return aviso('Feche as conversas abertas de ' + p.n + ' antes de renomear.');
    janela('Renomear projeto', '<p>Novo nome para <b>' + esc(p.n) + '</b>:</p><input id="renp" class="campo" style="width:100%;height:36px;border-radius:8px;border:1px solid var(--linha);background:var(--sup);color:var(--fg);padding:0 10px;font:inherit" value="' + esc(p.n) + '">' +
      '<div style="margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--linha);background:var(--sup);font-size:12.5px;line-height:1.5"><b>Atenção:</b> o FCC renomeia a pasta agora. Na próxima vez que o Claude mexer neste projeto, ele vai <b>renomear todos os arquivos, pastas e textos</b> com o nome antigo <b>antes de atender o seu pedido</b>. Isso é inegociável: vale mesmo que você peça outra coisa.</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn" data-acao="fecharJan">Cancelar</button><button class="btn prim" data-acao="renProjOk" data-dir="' + esc(p.dir) + '">Renomear</button></div>');
    const i = $('#renp'); i.select(); i.onkeydown = e => { if (e.key === 'Enter') A.renProjOk($('[data-acao="renProjOk"]')); }; },
  async renProjOk(b) { const d = b.dataset.dir, v = $('#renp')?.value.trim(); if (!v || b.disabled) return; b.disabled = true;
    const r = await api.projetoRenomear(d, v).catch(() => ({ erro: 'Não deu para renomear.' })); b.disabled = false;
    if (r.erro) return aviso(r.erro);
    fecharJan(); if (abertosG.delete(d)) abreGrupo(r.dir); if (cfg.projeto === d) cfg.projeto = r.dir; delete ICO[d];
    PROJ = (await api.projetos().catch(() => null)) || PROJ; refazLado(); aviso(r.aviso || 'Renomeado para ' + v + '. Na próxima conversa o Claude renomeia o resto antes de tudo.'); },
  async excProj(b) { const p = projDe(b.dataset.dir); if (!p) return;
    if (CONVS.some(t => t.p === p)) return aviso('Feche as conversas abertas de ' + p.n + ' antes de excluir.');
    if (OP.excRapido === '1') return A.excProjOk({ dataset: { dir: p.dir } });   // opção: sem confirmação
    // 25/11 (pedido dele): 1º segurar 2 s, depois "Certeza?" Sim/Não com 1 clique
    janela('Excluir projeto', '<p>Excluir o projeto <b>' + esc(p.n) + '</b>?</p><p class="fraco" style="margin-top:6px">A pasta vai para a Lixeira do Windows (dá para restaurar de lá).</p>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn" data-acao="fecharJan">Cancelar</button><button class="btn perigo seg2" id="exc-seg"><span>Segure 2 s para excluir</span></button></div>', 'excluir');
    const b2 = $('#exc-seg'); let tm;
    const solta = () => { b2.classList.remove('segurando'); clearTimeout(tm); };
    b2.onmousedown = e => { if (e.button) return; b2.classList.add('segurando'); tm = setTimeout(() => {
      $('.tampa .jan-corpo').innerHTML = '<p>Certeza? <b>' + esc(p.n) + '</b> vai para a Lixeira.</p><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn" data-acao="fecharJan">Não</button><button class="btn perigo" data-acao="excProjOk" data-dir="' + esc(p.dir) + '">Sim</button></div>'; }, 2000); };
    b2.onmouseup = solta; b2.onmouseleave = solta; },
  async excProjOk(b) { const p = projDe(b.dataset.dir); if (!p || b.disabled) return; b.disabled = true; fecharJan();
    const r = await api.projetoExcluir(p.dir).catch(() => ({ erro: 'Não deu para excluir.' })); if (r.erro) return aviso(r.erro);
    abertosG.delete(p.dir); gravar('ca-grupos', [...abertosG]); if (cfg.projeto === p.dir) cfg.projeto = null;
    PROJ = (await api.projetos().catch(() => null)) || PROJ.filter(x => x !== p); refazLado(); aviso(p.n + ' foi para a Lixeira.'); },
  async conta(b) {
    const lim = LIM ? `<div class="lim">${LIM.sessao ? `<div class="lim-l">5 horas<span>${LIM.sessao.pct}%${falta(LIM.sessao) ? ' · zera em ' + falta(LIM.sessao) : ''}</span></div><div class="lim-b"><i style="width:${Math.min(100, LIM.sessao.pct)}%"></i></div>` : ''}${LIM.semana ? `<div class="lim-l">Semana<span>${LIM.semana.pct}%${falta(LIM.semana) ? ' · zera em ' + falta(LIM.semana) : ''}</span></div><div class="lim-b"><i style="width:${Math.min(100, LIM.semana.pct)}%"></i></div>` : ''}</div><hr>` : '';
    const outras = CONTAS.filter(c => c.email && c.email !== CONTA.email);
    menu(b, `<div class="tm">${esc(CONTA.email || 'Sem conta')}${CONTA.plano ? ' · ' + esc(CONTA.plano) : ''}</div>${lim}` + outras.map(c => op('u' + c.email, 'Usar ' + esc(c.email), esc(c.plano || '') + (c.expirou ? ' · precisa entrar de novo' : ''), 0, 'volta')).join('') + '<hr>' + op('a', 'Adicionar conta', CONTA.email ? 'Entra com outro e-mail pelo navegador' : 'Entra com seu e-mail pelo navegador', 0, 'mais') + op('g', 'Gerenciar contas', 'Trocar, entrar de novo, sair ou remover', 0, 'tres') + op('o', 'Opções', 'Janela, conversas, pastas, atualização', 0, 'opcoes'),
      async k => { if (k === 'o') return A.opcoes(); if (k === 'a') return A.contaNova(); if (k === 'g') return A.contas();
        if (k[0] === 'u') trocarConta(k.slice(1)); }, true); },
  async contas() { CONTAS = (await api.contas().catch(() => null)) || CONTAS || [];
    const L = CONTAS.filter(c => c.email); if (CONTA.email && !L.some(c => c.email === CONTA.email)) L.unshift({ email: CONTA.email, plano: CONTA.plano });
    // usage per account: the active one is live (LIM), the others are the last saved reading; a window already over counts as 0%
    const pctUso = j => j ? (j.ate && j.ate < Date.now() ? 0 : j.pct) : null;
    // 25/11 (his report): 'Renova dd/mm' was a guess (subscriptionCreatedAt's day repeated monthly) and was wrong; Claude Code has no billing/expiry date.
    // Shown now: the real subscription date from the login (oauthAccount.subscriptionCreatedAt), not the day the account entered the FCC
    const assinou = iso => { const d = new Date(iso); return !iso || isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
    const usoL = (c, at) => { const u = at ? LIM : c.uso, p5 = u && pctUso(u.sessao), ps = u && pctUso(u.semana), zs = falta(u && u.semana), z5 = falta(u && u.sessao);
      return `<span class="conta-uso"><span>5 h <b>${p5 == null ? '—' : p5 + '%'}</b></span><span>Semana <b>${ps == null ? '—' : ps + '%'}</b></span><span>5 h zera em <b>${z5 || '—'}</b></span><span>Semana zera em <b>${zs || '—'}</b></span></span>`; };
    const lin = c => { const at = CONTA.estado === 'ok' && c.email === CONTA.email, e = esc(c.email);
      return `<div class="op-cart conta-l"><span class="av">${esc(c.email[0].toUpperCase())}</span><span class="nome">${e}${at ? ' <em class="tag">em uso</em>' : ''}<small>${esc(c.plano || 'Claude')}${c.expirou ? ' · precisa entrar de novo' : c.quando ? ' · usada ' + esc(c.quando) : ''}</small>${usoL(c, at)}</span><span class="conta-dir"><span class="rn" data-dica="Data da assinatura|Dia em que a assinatura desta conta foi feita, como a Anthropic informa no login. Não é a data de vencimento">Assinou em <b>${assinou(c.assinou) || '—'}</b></span><span class="bts">
        ${at ? '<button class="btn" data-acao="contaSair">Sair</button>' : c.expirou ? `<button class="btn" data-acao="contaNova" data-email="${e}">Entrar de novo</button>` : `<button class="btn" data-acao="contaUsar" data-email="${e}">Usar</button>`}
        ${at ? '' : `<button class="btn perigo" data-acao="contaEsquecer" data-email="${e}" data-dica="Remover do FCC|Apaga o login guardado desta conta; dá para entrar de novo depois">Remover</button>`}</span></span></div>`; };
    janela('Contas', '<p class="fraco jan-sub">Suas contas do Claude, quanto já usou de cada uma e quando assinou.</p>' + (L.length ? L.map(lin).join('') : '<p class="fraco">Nenhuma conta guardada ainda.</p>') +
      `<div class="bts-jan">${L.length > 1 ? `<label class="auto-conta" data-dica="Trocar de conta sozinho|Quando o limite de uma conta acabar, passa para outra guardada e continua o trabalho">Trocar sozinho<button class="chave mini ${OP.autoConta !== '0' ? 'on' : ''}" data-acao="chave" data-k="autoConta"></button></label>` : ''}<button class="btn prim" data-acao="contaNova">${ic('mais')}Adicionar conta</button></div>`, 'contas'); },
  contaUsar(b) { trocarConta(b.dataset.email); },
  async contaSair() { aviso('Saindo da conta…'); CONTA = (await api.sairConta().catch(() => null)) || { estado: 'sem' }; LIM = null; refazLado(); mostrarSeVazia(); aviso('Você saiu da conta.'); fecharJan(); if (CONTA.estado !== 'ok') boas([]); },
  async contaEsquecer(b) { const e = b.dataset.email; if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Remover mesmo?'; setTimeout(() => { if (b.isConnected) { b.dataset.certeza = ''; b.textContent = 'Remover'; } }, 4000); return; }
    CONTAS = (await api.contaEsquecer(e).catch(() => null)) || CONTAS.filter(c => c.email !== e); aviso(e + ' removida do FCC.'); A.contas(); },
  async contaNova(b) { const email = (b && b.dataset && b.dataset.email) || '';
    janela('Entrar na conta', `<p>${email ? 'Entrar de novo como <b>' + esc(email) + '</b>.' : 'Abre o navegador para você entrar na conta do Claude. Se quiser, escreva o e-mail antes.'}</p>
      ${email ? '' : '<input id="login-email" class="campo-txt" placeholder="e-mail (opcional)" spellcheck="false">'}<p class="fraco" id="login-est"></p>
      <div class="bts-jan"><button class="btn" data-acao="loginCancelar">Cancelar</button><button class="btn" data-acao="loginAbrir" id="login-abrir" disabled>Abrir no navegador</button><button class="btn prim" data-acao="loginIr" data-email="${esc(email)}" id="login-ir">Entrar</button></div>`, 'login');
    const i = $('#login-email'); if (i) { i.focus(); i.onkeydown = e => { if (e.key === 'Enter') A.loginIr($('#login-ir')); }; } else A.loginIr($('#login-ir')); },
  async loginIr(b) { if (!b || b.disabled) return; const email = (b.dataset.email || $('#login-email')?.value || '').trim(); b.disabled = true; const est = $('#login-est'); est.textContent = 'Abrindo o navegador… termine a entrada lá; o FCC percebe sozinho.';
    LOGIN_ON = true; const r = await api.loginIniciar(email).catch(e => ({ erro: e.message })); if (r && r.erro) { LOGIN_ON = false; est.textContent = 'Não deu: ' + r.erro; b.disabled = false; } },
  loginAbrir() { api.loginAbrir(); },
  fechar() { fecharJan(); },
  instalarFaltam() { fecharJan(); aviso('Instalando em segundo plano…'); instalarFundo(); },
  async boasEntrar() { const B = BOAS; if (!B || B.ocupado) return; B.ocupado = true; boasDesenha();
    if (B.faltam.some(f => f.id === 'claude')) { const r = await api.preparar(true).catch(() => null); B.instalou = true; B.inst = '';
      if (!r || r.faltam.length || r.falhou) { B.ocupado = false; B.faltam = (r && r.faltam) || B.faltam; return boasDesenha('A instalação não terminou: veja relatorios\\preparar.txt e tente de novo.'); }
      B.faltam = []; CONTA = r.conta; if (CONTA.estado === 'ok') { B.ocupado = false; return boasEntrou(); } }
    boasDesenha('Abrindo o navegador…'); LOGIN_ON = true; const r = await api.loginIniciar('').catch(e => ({ erro: e.message }));
    if (r && r.erro) { LOGIN_ON = false; B.ocupado = false; boasDesenha('Não deu: ' + r.erro); } },
  async boasTenho() { if (await porPasta(await api.escolherPasta())) { fecharJan(); aviso('Pronto: seus projetos estão na barra lateral.'); } },
  async boasCriar() { const d = await api.criarPastaProjetos(); if (await porPasta(d)) { fecharJan(); aviso('Criei ' + d + '. Coloque seus projetos lá.'); } },
  async loginCancelar() { if (LOGIN_ON) await api.loginCancelar().catch(() => { }); LOGIN_ON = false; fecharJan(); },
  opcoes() { const nomeP = p => esc(String(p).split(/[\\/]/).filter(Boolean).pop() || 'Projetos');
    const bt = (acao, txt) => '<button class="btn" data-acao="' + acao + '">' + txt + '</button>';
    const tema = OP.tema || 'claro', temas = { claro: 'Claro', escuro: 'Escuro', auto: 'Seguir o Windows' };
    const paginas = [
      ['Aparência', 'sol', 'Como o FCC se parece', '<div class="op-temas">' + Object.entries(temas).map(([v, n]) => '<button class="' + (v === tema ? 'on' : '') + '" data-acao="escolha" data-k="tema" data-v="' + v + '"><span class="op-mini ' + v + '"><i></i><b></b><b></b><em></em></span>' + n + '</button>').join('') + '</div>'],
      ['Projetos', 'pasta', 'De onde vem a lista de projetos', cart('casa', nomeP(D.raiz || ''), esc(D.raiz || ''), '<em class="tag">principal</em>') +
        pastasOP().map((p, i) => cart('pasta', nomeP(p), esc(p), '<button class="btn perigo" data-acao="pastaTirar" data-i="' + i + '">Tirar</button>')).join('') +
        '<button class="op-mais" data-acao="pastaPor">' + ic('mais') + 'Adicionar outra pasta de projetos</button>' +
        cart('fechar', 'Excluir sem confirmação', 'Ligado: Excluir manda direto para a Lixeira, sem segurar e sem "Certeza?"', '<button class="chave ' + (OP.excRapido === '1' ? 'on' : '') + '" data-acao="chave" data-k="excRapido"></button>')],
      ['Atualização', 'recarregar', 'Versão ' + esc(D.versao || ''), cart('recarregar', 'Atualizar sozinho', 'Baixa a versão nova do GitHub e aplica ao fechar', '<button class="chave ' + (OP.autoAtual !== '0' ? 'on' : '') + '" data-acao="chave" data-k="autoAtual"></button>') +
        cart('busca', 'Procurar agora', 'Confere se saiu versão nova', bt('procurarAtual', 'Procurar'))],
      ['Seu FCC', 'casa', 'Memória, uso e a pasta do programa', cart('passos', 'Memória e skills', 'O que o Claude guarda sobre você e as skills instaladas', bt('memoria', 'Abrir')) + cart('faisca', 'Estatísticas', 'Tokens, conversas e tempo por projeto', bt('estat', 'Ver')) + cart('pasta', 'Pasta do FCC', 'Espaço usado, ferramentas, enviar cópia ou remover', bt('pastaFcc', 'Abrir')) +
        cart('chat', 'Avisar quando terminar', 'Aviso do Windows quando o Claude responde e o FCC não está na frente', '<button class="chave ' + (OP.avisoFim !== '0' ? 'on' : '') + '" data-acao="chave" data-k="avisoFim"></button>')],
    ];
    janela('Opções', '<nav class="op-nav" style="--i:' + opAba + '"><i></i>' + paginas.map(([n, ico], i) => '<button class="' + (i === opAba ? 'on' : '') + '" data-acao="opAba" data-i="' + i + '">' + ic(ico) + n + '</button>').join('') + '</nav>' +
      '<div class="op-vista"><div class="op-trilho" style="--i:' + opAba + '">' + paginas.map(([n, , sub, corpo], i) => '<section class="' + (i === opAba ? 'on' : '') + '"' + (i === opAba ? '' : ' inert') + '><h3>' + n + '</h3><p class="fraco">' + sub + '</p>' + corpo + '</section>').join('') + '</div></div>', 'opcoes'); },
  opAba(b) { opAba = +b.dataset.i; $$('.op-nav button').forEach((x, i) => x.classList.toggle('on', i === opAba)); $$('.op-trilho section').forEach((x, i) => { x.classList.toggle('on', i === opAba); x.inert = i !== opAba; });
    for (const e of $$('.op-nav, .op-trilho')) e.style.setProperty('--i', opAba); },
  chave(b) { b.classList.toggle('on'); const on = b.classList.contains('on'), k = b.dataset.k;
    if (k === 'tema') A.tema($('.titulo [data-acao="tema"]'));
    else if (['autoAtual', 'autoConta', 'excRapido', 'avisoFim'].includes(k)) { OP[k] = on ? '1' : '0'; api.opcao(k, OP[k]); } },
  escolha(b) { const k = b.dataset.k, v = b.dataset.v; $$('button', b.parentNode).forEach(x => x.classList.toggle('on', x === b));
    OP[k] = v; api.opcao(k, v);
    if (k === 'tema') { document.documentElement.dataset.tema = temaDe(v); const tb = $('.titulo [data-acao="tema"]'); if (tb) tb.innerHTML = ic(temaDe(v) === 'escuro' ? 'sol' : 'lua'); } },
  async pastaPor() { if (await porPasta(await api.escolherPasta())) A.opcoes(); },
  async pastaTirar(b) { const L = pastasOP(); L.splice(+b.dataset.i, 1); OP.pastas = L.join(';'); const r = await api.opcao('pastas', OP.pastas); if (r) { PROJ = r; refazLado(); } A.opcoes(); },
  async atualizarAgora(b) { botaoAtual('Atualizando…'); const r = await api.atualizarAgora().catch(() => 'erro');
    if (r === 'depois') { botaoAtual('Atualiza ao terminar'); return aviso('O Claude está trabalhando: o FCC atualiza sozinho quando ele terminar.'); }
    if (r === 'erro') { b.disabled = false; b.textContent = 'Atualizar agora'; return aviso('Não deu para atualizar agora. Entra quando você fechar o programa.'); }
    if (r === 'nada') { b.hidden = true; b.disabled = false; b.textContent = 'Atualizar agora'; return aviso('Esta versão já entrou.'); }
    if (!$('.tampa.atualizando')) { b.hidden = true; b.disabled = false; b.textContent = 'Atualizar agora'; aviso('FCC atualizado.'); } },
  async procurarAtual() { aviso('Procurando versão nova…'); const r = await api.atualizarProcurar().catch(() => null); if (!r || !r.estado) return aviso('Não deu para procurar agora.');
    aviso(['nada', 'ok', 'em-dia'].includes(r.estado) ? 'O FCC já está na versão mais nova.' : r.estado === 'pronta' || r.estado === 'ja-pronta' ? 'Versão ' + (r.versao || 'nova') + ' pronta: entra quando você fechar o FCC.' : r.estado === 'erro' ? 'Não deu para procurar agora. Confira a internet e tente de novo.' : r.msg || 'Procurando…'); },
  // 24/11: trazido da interface antiga (memória, estatísticas, Pasta do FCC, programa do projeto)
  async memoria() { const r = await api.regras().catch(() => ({})), L = r.memorias || [], S = r.skills || [];
    janela('Memória e skills', '<h3>Regras</h3>' + ((r.regras || []).length ? '' : '<p class="fraco">Nenhuma regra ainda.</p>') + (r.regras || []).map(x => cart('arq', esc(x.n), esc(x.pasta + '\\' + x.arq), '<button class="btn" data-acao="abrirCaminho" data-f="' + esc(x.caminho) + '">Abrir</button>')).join('') +
      '<h3>Memórias <span class="fraco">' + L.length + '</span></h3>' + (L.length ? L.map(m => cart('passos', esc(m.tx || 'Sem descrição'), esc(m.quando || ''), '<button class="btn" data-acao="abrirCaminho" data-f="' + esc(m.id) + '">Abrir</button><button class="btn perigo" data-acao="esquecer" data-f="' + esc(m.id) + '">Esquecer</button>')).join('') : '<p class="fraco">Nenhuma memória guardada.</p>') +
      '<h3>Skills <span class="fraco">' + S.length + '</span></h3>' + (S.length ? S.map(s => cart('mais', esc(s.n), esc(s.d || ''), '<button class="btn" data-acao="skill" data-n="' + esc(s.n) + '">Abrir</button>')).join('') : '<p class="fraco">Nenhuma skill instalada.</p>'), 'memoria'); },
  abrirCaminho(b) { const f = b.dataset.f, i = f.lastIndexOf('\\'); api.abrirArq(f.slice(0, i), f.slice(i + 1)); },
  async esquecer(b) { const ok = await api.esquecer(b.dataset.f).catch(() => false); aviso(ok ? 'Memória esquecida (foi para a Lixeira).' : 'Não consegui esquecer essa memória.'); A.memoria(); },
  skill(b) { api.abrirSkill(b.dataset.n); },
  async estat(b) { const per = b && b.dataset.per ? +b.dataset.per : 7, d = await api.esDados().catch(() => ({})), ses = d.sessoes || [], ag = d.agora || Date.now(), ini = ag - per * 864e5;
    const tok = s => (s.turnos || []).reduce((a, x) => a + (x.ent || 0) + (x.sai || 0), 0), L = ses.filter(s => s.ini >= ini), tot = L.reduce((a, s) => a + tok(s), 0);
    const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n);
    const min = Math.round(L.reduce((a, s) => a + ((s.fim || ag) - s.ini), 0) / 6e4), pp = {};
    for (const s of L) pp[s.proj || 'Mensagens'] = (pp[s.proj || 'Mensagens'] || 0) + tok(s);
    const P = Object.entries(pp).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = Math.max(1, ...P.map(x => x[1]));
    const seg = [[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(([v, n]) => '<button class="' + (v === per ? 'on' : '') + '" data-acao="estat" data-per="' + v + '">' + n + '</button>').join('');
    janela('Estatísticas', '<div class="linha-op"><span class="nome">Período</span><div class="seg">' + seg + '</div></div>' +
      '<div class="est-num"><div><b>' + fmt(tot) + '</b><small>tokens</small></div><div><b>' + L.length + '</b><small>conversas</small></div><div><b>' + (min < 60 ? min + ' min' : Math.floor(min / 60) + ' h ' + min % 60) + '</b><small>tempo</small></div></div>' +
      '<h3>Por projeto</h3>' + (P.length ? P.map(([n, v]) => '<div class="lim-l">' + esc(n) + '<span>' + fmt(v) + '</span></div><div class="lim-b"><i style="width:' + Math.round(v / mx * 100) + '%"></i></div>').join('') : '<p class="fraco">Nada neste período.</p>'), 'estat'); },
  async pastaFcc() { janela('Pasta do FCC', '<p class="fraco">Medindo…</p>', 'pasta'); const d = await api.pastaDados().catch(e => ({ erro: e.message }));
    if ($('.tampa')?.dataset.k !== 'pasta') return; if (d.erro) return janela('Pasta do FCC', '<p class="fraco">' + esc(d.erro) + '</p>', 'pasta');
    const bt = (a, v, t, p) => '<button class="btn' + (p ? ' perigo' : '') + '" data-acao="pastaAcao" data-a="' + a + '" data-v="' + esc(v) + '">' + t + '</button>';
    janela('Pasta do FCC', cart('casa', 'Tudo junto · ' + esc(d.total), esc(d.raiz), bt('abrir', 'raiz', 'Abrir')) +
      '<h3>O que ocupa espaço</h3>' + d.blocos.map(x => cart(x.id === 'ferramentas' ? 'term' : x.id === 'conta' ? 'escudo' : 'pasta', esc(x.d), esc(x.tam), x.id === 'perfil' || x.id === 'ferramentas' ? bt('abrir', x.id, 'Abrir') : '')).join('') +
      '<h3>Ferramentas baixadas <span class="fraco">' + esc(d.dentroTam) + '</span></h3>' + (d.dentro.length ? d.dentro.map(([n, q, t, ess]) => cart('term', esc(n) + ' · ' + esc(t), esc(q || ''), ess ? '<em class="tag">necessária</em>' : bt('tirar', n, 'Tirar', 1))).join('') : '<p class="fraco">Nenhuma.</p>') +
      (d.sistema.length ? '<h3>Instalado no Windows pelo Claude</h3>' + d.sistema.map(x => cart('escudo', esc(x.nome), esc(x.sub), bt('desinstalar', x.id, 'Desinstalar') + bt('ignorar', x.id, 'Ignorar'))).join('') : '') +
      '<h3>Levar ou remover</h3>' + cart('arq', 'Enviar cópia do perfil', 'Regras ' + esc(d.envio.regras) + ' · skills ' + esc(d.envio.skills) + ', sem logins', bt('enviar', '', 'Escolher pasta')) +
      cart('fechar', 'Remover o FCC deste PC', 'Precisa de ' + esc(d.precisa) + ' para guardar perfil e projetos antes', bt('remover', '', 'Remover', 1)), 'pasta'); },
  async pastaAcao(b) { const a = b.dataset.a, v = b.dataset.v;
    if (a === 'remover' && !confirm('Remover o FCC deste PC? Antes, escolha onde guardar seu perfil e projetos.')) return;
    if (a === 'tirar' && !confirm('Mandar ' + v + ' para a Lixeira? Ela se baixa de novo quando precisar.')) return;
    b.disabled = true; const r = await api.pastaAcao(a, a === 'remover' ? { salvar: true } : v).catch(e => ({ ok: false, msg: e.message })); b.disabled = false;
    if (r && r.cancelado) return; if (!r || !r.ok) return aviso('Não deu certo: ' + ((r && r.msg) || 'erro'));
    aviso(r.msg || (a === 'enviar' ? 'Cópia pronta em ' + r.pasta : 'Feito.')); if (a !== 'abrir') A.pastaFcc(); },
  fecharJan,
};
// itens da conversa (markup de chat.js usa data-act)
function acaoConversa(a) {
  const t = tAtual(); if (!t) return; const [k, v] = [a.split(':')[0], a.split(':').slice(1).join(':')];
  if (k === 'abre') { const i = +v, pad = (t.padrao || {})[i]; t.abertos[i] = !(t.abertos[i] != null ? t.abertos[i] : pad); t.anima = { i, ate: Date.now() + 400 }; renderConv(t); }
  else if (k === 'perm') responderPerm(t, v);
  else if (k === 'resp') { const [i, qi, oi] = v.split('-').map(Number), it = t.itens[i], q = it.input.questions[qi]; let sel = it.escolhas[qi] || [];
    sel = q.multiSelect ? (sel.includes(oi) ? sel.filter(x => x !== oi) : [...sel, oi]) : [oi]; it.escolhas[qi] = sel;
    if (it.input.questions.length === 1 && !q.multiSelect) responderPerm(t, 'ok', it); else renderConv(t); }
  else if (k === 'permresp') responderPerm(t, 'ok', t.itens[+v]);
  else if (k === 'editar') { const i = +v, it = t.itens[i]; if (ocupada(t)) return aviso('Espere o Claude terminar (ou pare) para editar.'); const s = C.separaAnexos(it.txt); t.editando = { i, antes: it.antes }; t.anexos = s.A; t.texto = s.txt; refazerCaixa(s.txt); renderConv(t, true); }
  else if (k === 'passos') { painel('Passos'); }
  else if (k === 'voltar') voltarArquivos(t, +v);
  else if (k === 'espera') { const e = t.espera; if (e) { clearTimeout(e.timer); t.espera = null; t.texto = (t.texto && t.texto.trim() ? t.texto + '\n' : '') + e.txt; refazerCaixa(t.texto); $('#txt')?.focus(); renderConv(t, true); } }
  else if (k === 'desfila') { const x = t.fila.splice(+v, 1)[0]; if (x != null) { t.texto = (t.texto ? t.texto + '\n' : '') + x; refazerCaixa(t.texto); } renderConv(t); }
  else if (k === 'anx-x') { (t.anexos || []).splice(+v, 1); refazerCaixa(); }
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-act]');
  if (c) { if (c.dataset.act.startsWith('anx-x') && !tAtual()) { cfg.anexos.splice(+c.dataset.act.split(':')[1], 1); refazerCaixa(); } else acaoConversa(c.dataset.act); return; }
  const b = e.target.closest('[data-acao]');
  if (menuAberto && !e.target.closest('.menu') && b !== menuAberto.ancora) fecharMenu(); else if (menuAberto && b === menuAberto.ancora) { fecharMenu(); return; }
  if (b && A[b.dataset.acao]) A[b.dataset.acao](b, e);
});
// 25/11 (pedido dele): botão direito no projeto = menu (abrir pasta, renomear, excluir); duplo clique no ícone = abre o programa (.exe)
document.addEventListener('contextmenu', e => { const g = e.target.closest('#lado .grupo > .item'); if (!g) return; e.preventDefault();
  const p = projDe(g.closest('.grupo').dataset.pj); if (!p) return; const fake = { dataset: { dir: p.dir } };
  menu(g, '<div class="tm">' + esc(p.n) + '</div>' + op('pa', 'Abrir pasta', 0, 0, 'pasta') + op('r', 'Renomear', 'Renomeia o projeto por completo', 0, 'lapis') + '<hr>' + op('x', 'Excluir', 'Manda a pasta para a Lixeira', 0, 'fechar'),
    k => { if (k === 'pa') api.pasta(p.dir); else if (k === 'r') A.renProj(fake); else if (k === 'x') A.excProj(fake); });
  const m = menuAberto; if (m) { m.style.left = Math.max(8, Math.min(e.clientX, innerWidth - m.offsetWidth - 8)) + 'px'; m.style.top = Math.max(8, Math.min(e.clientY, innerHeight - m.offsetHeight - 8)) + 'px'; m.style.transformOrigin = 'top left'; } });
document.addEventListener('dblclick', e => { const im = e.target.closest('img.pico'); if (!im) return; e.preventDefault(); e.stopPropagation(); const p = projDe(im.dataset.dir); if (p) api.programa(p.dir).then(n => aviso(n ? 'Abrindo ' + n : p.n + ' não tem programa em dist.')); }, true);
let segura; const bx = $('.bc.x');
bx.onmousedown = () => { bx.classList.add('segurando'); segura = setTimeout(() => { segura = null; for (const t of CONVS) guardarConversa(t); api.janela('sair'); }, 1000); };
bx.onmouseup = () => { bx.classList.remove('segurando'); if (segura) { clearTimeout(segura); segura = null; api.janela('bandeja'); } };
bx.onmouseleave = () => { bx.classList.remove('segurando'); if (segura) { clearTimeout(segura); segura = null; } };
let segMx; const bm = $('.bc.mx');   // segurar o maximizar 1 s troca o tamanho (mesma animação do ✕)
bm.onmousedown = () => { bm.classList.add('segurando'); segMx = setTimeout(() => { segMx = null; bm.classList.remove('segurando'); const n = OP.tam === 'min' ? 'max' : 'min'; OP.tam = n; api.tamanho(n); aviso(n === 'min' ? 'Tamanho: Mín. 1080 × 608' : 'Tamanho: Máx. 1440 × 810'); }, 1000); };
bm.onmouseup = () => { bm.classList.remove('segurando'); if (segMx) { clearTimeout(segMx); segMx = null; api.janela('max'); } };
bm.onmouseleave = () => { bm.classList.remove('segurando'); if (segMx) { clearTimeout(segMx); segMx = null; } };
// teclas mostradas nos cartões de permissão, pergunta e plano (só com a caixa vazia, para não roubar o que ele digita)
function teclaPerm(e) {
  const t = tAtual(), x = e.target;
  if (!t || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || menuAberto || $('.tampa') || (x.matches('input, textarea') && (x.id !== 'txt' || x.value))) return false;
  const p = t.itens.find(i => i.k === 'perm' && !i.resp), k = e.key; if (!p) return false;
  if (p.tool === 'AskUserQuestion') {
    const q = (p.input.questions || [])[0];
    if (/^[1-9]$/.test(k) && q && q.options[+k - 1]) acaoConversa(`resp:${t.itens.indexOf(p)}-0-${+k - 1}`);
    else if (k === 'Enter' && !x.closest('button')) responderPerm(t, 'ok', p); else return false;
  } else {
    const a = p.tool === 'ExitPlanMode' ? { 1: 'aprovado' }[k] : { 1: 'cadeia', 2: 'ok', 3: 'sempre' }[k];
    if (!a) return false; responderPerm(t, a, p);
  }
  return true;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (menuAberto) return fecharMenu(); if ($('.tampa')) return fecharJan(); const t = tAtual(); if (t && (ocupada(t)) && !pedePerm(t)) { if (!e.repeat) segurarParar(); return; }
    if (t && pedePerm(t)) return responderPerm(t, 'negado'); if (painelAberto) return painel(null); if (!fixa && $('#lado').classList.contains('mostra')) return $('#lado').classList.remove('mostra'); }
  if (teclaPerm(e)) return e.preventDefault();
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); A.nova(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); A.barra(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); barraB(true); setTimeout(() => $('#busca').focus(), 50); }
  if (menuAberto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const os = $$('.op', menuAberto), i = os.indexOf(document.activeElement); os[(i + (e.key === 'ArrowDown' ? 1 : -1) + os.length) % os.length].focus(); }
});

/* ---------- tutoriais de primeiro uso (24/11): tour com destaque + "Onde fica…" + atalhos ---------- */
// passo = [alvo (seletor; '' = cartão no meio), título, texto, antes()]. Num tour, passo cujo alvo não existe é pulado.
const mostraLado = () => { clearTimeout(esconde); barraB(true); };
const irInicio = () => { if (atual.tipo !== 'inicio') A.inicio(); };
const TOURS = {
  inicio: [
    ['', 'Bem-vindo ao FCC', 'Um tour rápido para você saber onde fica cada coisa. Use as setas ou Enter para andar; Esc pula. Dá para ver de novo no botão ? do topo.', irInicio],
    ['#lado .lado-lista', 'Projetos, Mensagens e Rascunhos', 'Projetos são suas pastas. Mensagens são conversas soltas, sem projeto. Rascunhos são ideias para mandar depois. Clique no nome de uma seção para recolher.', mostraLado],
    ['#lado .lado-topo', 'Nova conversa e busca', 'Nova conversa: Ctrl+N. Buscar projetos e conversas: Ctrl+K.', mostraLado],
    ['.titulo [data-acao="barra"]', 'Barra lateral', 'Ela se esconde sozinha: passe o mouse na borda esquerda ou aperte Ctrl+B. Este botão deixa ela sempre à mostra.'],
    ['.caixa', 'Caixa de mensagem', 'Escreva e aperte Enter. Shift+Enter quebra a linha. Pode arrastar arquivos e imagens para a janela.'],
    ['.caixa [data-acao="escolherPasta"]', 'Onde', 'Em qual projeto a conversa acontece. "Sem projeto" vira uma conversa solta, em Mensagens.'],
    ['.caixa [data-acao="modo"]', 'Permissão', 'Começa em "Perguntar": o Claude pede sua licença antes de editar ou rodar algo. Clique aqui e escolha "Automático" para ele fazer tudo sem pedir. Dá para trocar a qualquer momento, em cada conversa.'],
    ['.caixa [data-acao="modelo"]', 'Modelo e pensamento', 'Modelo menor para papo, maior para o difícil. Dá para trocar no meio da conversa.'],
    ['.recentes', 'Recentes', 'Conversas abertas e a última de cada projeto. Clique para continuar de onde parou.'],
    ['#lado .conta', 'Conta e Opções', 'O anel mostra quanto do limite de 5 horas já foi usado. Clique para ver os limites, trocar de conta e abrir as Opções (tema, pastas, atualização).', mostraLado],
    ['.win', 'Janela', '✕ esconde o FCC na bandeja, perto do relógio. Segure o ✕ por 1 segundo para fechar de vez.'],
    ['.titulo [data-acao="ajuda"]', 'Ajuda', 'Tours de novo, atalhos do teclado e "Onde fica…" para achar qualquer coisa.'],
  ],
  conv: [
    ['#cab .tit', 'Sua conversa', 'Projeto e nome da conversa. O nome aparece sozinho depois das primeiras mensagens.'],
    ['#fio', 'Só as respostas', 'Aqui ficam só as suas mensagens e as respostas do Claude. Passe o mouse numa mensagem sua para editar e reenviar.'],
    ['#cab [data-pn="Passos"]', 'Passos', 'O que o Claude pensa, lê, roda e muda fica neste painel, ao lado da conversa.'],
    ['#cab [data-pn="Mudanças"]', 'Mudanças, Prévia, Terminal e Arquivos', 'Só em conversas de projeto: o que mudou nos arquivos, o site ou programa rodando, os comandos e a pasta.'],
    ['#cab [data-acao="maisConv"]', 'Mais', 'Renomear, abrir a pasta do projeto e fechar a conversa.'],
    ['.enviar', 'Enviar e parar', 'Enquanto o Claude trabalha você pode mandar mensagem: ele responde na hora e segue. Com a caixa vazia, o botão vira Parar: segure 1 segundo (ou segure Esc).'],
    ['#cab [data-acao="inicio"]', 'Início', 'Volta para a tela inicial. A conversa segue aberta na barra lateral.'],
  ],
};
const temCaixa = () => { if (!$('.caixa')) A.inicio(); };
const ONDE = [
  ['Começar uma conversa', 'Botão Nova conversa, no alto da barra lateral (Ctrl+N).', '#lado .lado-topo .btn', mostraLado, 'chat'],
  ['Abrir um projeto', 'Barra lateral, seção Projetos: clique no projeto para ver as conversas dele.', '#lado [data-sec="pj"]', mostraLado, 'pasta'],
  ['Continuar de onde parou', 'Recentes, na tela inicial, ou "Última conversa" dentro do projeto.', '.recentes', irInicio, 'volta'],
  ['Anotar uma ideia para depois', 'Barra lateral, seção Rascunhos, botão +.', '#lado [data-sec="rs"]', mostraLado, 'lapis'],
  ['Trocar modelo ou pensamento', 'Caixa de mensagem, botão da direita.', '.caixa [data-acao="modelo"]', temCaixa, 'faisca'],
  ['Mudar a permissão', 'Caixa de mensagem, botão com o escudo.', '.caixa [data-acao="modo"]', temCaixa, 'escudo'],
  ['Anexar arquivo ou imagem', 'Clipe na caixa de mensagem, ou arraste o arquivo para a janela.', '.caixa [data-acao="anexar"]', temCaixa, 'clipe'],
  ['Ver o que o Claude fez', 'Botão Passos, no alto de uma conversa aberta: pensamentos, comandos, leituras e mudanças.', '#cab [data-pn="Passos"]', null, 'passos'],
  ['Arquivos mudados, prévia e terminal', 'Botões no alto de uma conversa de projeto aberta.', '#cab [data-pn="Mudanças"]', null, 'diff'],
  ['Conta, limites e trocar de conta', 'Embaixo da barra lateral.', '#lado .conta', mostraLado, 'casa'],
  ['Opções: tema, pastas, atualização', 'Embaixo da barra lateral: clique na conta e depois em Opções.', '#lado .conta', mostraLado, 'opcoes'],
  ['Fechar o FCC', '✕ esconde na bandeja; segure 1 segundo para fechar de vez.', '.bc.x', null, 'fechar'],
];
let TOUR = null;
function tour(passos, chave, depois) {
  fimTour(true); fecharMenu(); document.activeElement?.blur?.();
  const el = document.createElement('div'); el.className = 'tour'; el.innerHTML = '<div class="tour-luz"></div><div class="tour-card"></div>'; document.body.appendChild(el);
  TOUR = { passos, chave, depois, i: -1, el, luz: $('.tour-luz', el), card: $('.tour-card', el), ult: '' };
  el.onclick = e => { const b = e.target.closest('[data-t]'); if (b) b.dataset.t === 'fim' ? fimTour() : passoTour(+b.dataset.t); };
  passoTour(1); requestAnimationFrame(seguirTour);
}
function passoTour(d) {
  const T = TOUR; if (!T) return; let i = T.i + d;
  if (T.passos.length === 1) T.passos[0][3]?.();
  else while (i >= 0 && i < T.passos.length) { const p = T.passos[i]; p[3]?.(); if (!p[0] || $(p[0])) break; i += d < 0 ? -1 : 1; }
  if (i < 0) return; if (i >= T.passos.length) return fimTour();
  T.i = i; const [alvo, tit, txt] = T.passos[i], n = T.passos.length, ult = i === n - 1;
  if (!fixa && !alvo.startsWith('#lado')) $('#lado').classList.remove('mostra');
  T.card.innerHTML = `<b>${esc(tit)}</b><p>${esc(txt)}</p><div class="tour-rod">${n > 1 ? `<span class="n">${i + 1} de ${n}</span>` : ''}<div class="esp"></div>${n > 1 && !ult ? '<button class="btn" data-t="fim">Pular</button>' : ''}${i > 0 ? '<button class="btn" data-t="-1">Voltar</button>' : ''}<button class="btn prim" data-t="1">${ult ? (n > 1 ? 'Concluir' : 'Entendi') : 'Próximo'}</button></div>`;
  T.card.classList.remove('troca'); T.card.getBoundingClientRect(); T.card.classList.add('troca'); T.ult = '';
}
function seguirTour() {
  const T = TOUR; if (!T) return; requestAnimationFrame(seguirTour);
  const alvo = T.passos[T.i][0], e = alvo && $(alvo), r = e && e.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const b = r && r.width ? { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 } : { x: W / 2, y: H / 2, w: 0, h: 0 };
  const cw = T.card.offsetWidth, ch = T.card.offsetHeight; let x, y;
  if (!b.w) { x = W / 2 - cw / 2; y = H / 2 - ch / 2; }
  else if (b.y + b.h + ch + 12 < H) { x = b.x; y = b.y + b.h + 10; }
  else if (b.y - ch - 10 > 0) { x = b.x; y = b.y - ch - 10; }
  else if (b.x + b.w + cw + 12 < W) { x = b.x + b.w + 10; y = b.y + b.h / 2 - ch / 2; }
  else { x = b.x - cw - 10; y = b.y + b.h / 2 - ch / 2; }
  x = Math.max(12, Math.min(x, W - cw - 12)); y = Math.max(12, Math.min(y, H - ch - 12));
  const k = [b.x, b.y, b.w, b.h, x, y].map(Math.round).join();
  if (k === T.ult) return; T.ult = k;
  Object.assign(T.luz.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' }); T.card.style.left = x + 'px'; T.card.style.top = y + 'px';
}
function fimTour(troca) {
  const T = TOUR; if (!T) return; TOUR = null; if (T.chave) gravar('ca-tour-' + T.chave, true);
  if (troca) return T.el.remove(); T.depois?.();
  T.el.classList.add('sai'); setTimeout(() => T.el.remove(), 200);
  if (!fixa) $('#lado').classList.remove('mostra'); setTimeout(() => $('#txt')?.focus({ preventScroll: true }), 220);
}
document.addEventListener('keydown', e => { if (!TOUR) return; e.preventDefault(); e.stopPropagation();
  if (e.key === 'Escape') fimTour(); else if (e.key === 'ArrowRight' || e.key === 'Enter') passoTour(1); else if (e.key === 'ArrowLeft') passoTour(-1); }, true);
function tourConvSePrimeira() { if (!ler('ca-tour-conv', false)) setTimeout(() => { if (tAtual() && !TOUR && !$('.tampa') && !ler('ca-tour-conv', false)) tour(TOURS.conv, 'conv'); }, 900); }
Object.assign(A, {
  ajuda(b) { const t = tAtual();
    menu(b, '<div class="tm">Ajuda</div>' + op('ti', 'Tour da tela inicial', 'Onde fica cada coisa', 0, 'casa') + op('tc', 'Tour da conversa', t ? 'Passos, painéis, enviar e parar' : 'Abra uma conversa primeiro', 0, 'chat') + '<hr>' + op('of', 'Onde fica…', 'Ache qualquer coisa do FCC', 0, 'busca') + op('at', 'Atalhos do teclado', 0, 0, 'tres'),
      k => { if (k === 'ti') A.tourInicio(); else if (k === 'tc') t ? tour(TOURS.conv, 'conv') : aviso('Abra uma conversa para ver este tour.'); else if (k === 'of') A.onde(); else if (k === 'at') A.atalhos(); }); },
  tourInicio() { fecharJan(); setTimeout(() => tour(TOURS.inicio, 'inicio'), 160); },
  onde() { janela('Onde fica…', '<p class="fraco jan-sub">Clique em Mostrar e o FCC aponta o lugar na tela.</p>' + ONDE.map(([n, s, , , ico], i) => cart(ico || 'busca', n, s, `<button class="btn" data-acao="ondeVer" data-i="${i}">Mostrar</button>`)).join(''), 'ajuda'); },
  ondeVer(b) { const p = ONDE[+b.dataset.i]; fecharJan(); setTimeout(() => tour([[p[2], p[0], p[1], p[3]]]), 160); },
  atalhos() {
    const G = [['Conversa', [['Enter', 'Enviar a mensagem'], ['Shift+Enter', 'Quebrar a linha'], ['Esc', 'Parar o Claude, negar um pedido ou fechar menu, janela e painel']]],
      ['Navegação', [['Ctrl+N', 'Nova conversa'], ['Ctrl+K', 'Buscar projetos e conversas'], ['Ctrl+B', 'Barra lateral fixa ou automática']]],
      ['Tour', [['←|→', 'Andar entre os passos'], ['Esc', 'Pular o tour']]]];
    const teclas = k => k.split('|').map(g => g.split('+').map(x => `<kbd>${esc(x)}</kbd>`).join('<span class="mais">+</span>')).join('<span class="ou">ou</span>');
    janela('Atalhos do teclado', '<p class="fraco jan-sub">Teclas que agilizam o uso do FCC.</p>' + G.map(([t, L]) => `<div class="sec">${t}</div><div class="atl">${L.map(([k, s]) => `<div class="atl-lin"><span class="atl-tx">${s}</span><span class="atl-k">${teclas(k)}</span></div>`).join('')}</div>`).join(''), 'ajuda'); },
});

/* ---------- início ---------- */
mostrar(true); desenharLado(true); carregarRasc();
PREP = api.preparar().then(r => { CONTA = (r && r.conta) || { estado: 'sem' }; const F = (r && r.faltam) || [];
  if (CONTA.estado === 'ok') { api.contas().then(L => { CONTAS = L || []; }); lerUso(); if (F.length && !D.teste) perguntarFaltam(F); }
  else if (!D.teste) boas(F);
  refazLado(); if (atual.tipo === 'inicio' || atual.tipo === 'nova') { const tx = $('#txt')?.value; atual.texto = tx; mostrar(true); } }).catch(() => { CONTA = { estado: 'sem' }; })
  .finally(() => setTimeout(() => { if (!BOAS && !$('.tampa') && !ler('ca-tour-inicio', false) && atual.tipo === 'inicio' && !TOUR && !D.teste?.roteiro) tour(TOURS.inicio, 'inicio'); }, 700));
api.projetos().then(L => { if (L && L.length) { PROJ = L; refazLado(); } }).catch(() => { });
// atualização ou recarga da tela: reabre as conversas que estavam abertas
if (D.atualizou && (D.sessao || []).length) {
  (async () => { await PREP; let ativa = null;
    for (const x of D.sessao) {
      const p = projDe(x.dir) || PROJ.find(y => y.n === x.proj) || null;
      const t = await abrir(p, x.modo || (p ? 'nova' : 'livre'), { sessao: x.sessao, modelo: x.modelo, esf: x.esf, pensar: x.pensar, titulo: x.nome, nomeado: x.nomeado, antes: x.antes, modoChat: 'resume', fundo: true });
      if (!t) continue; t.usada = true; if (x.ativa) ativa = t;
      if (x.continuar) { t.texto = ''; const tx = 'O programa foi atualizado e reaberto enquanto você trabalhava. Continue de onde parou (docs\\PARADA.md).'; t.itens.push({ k: 'eu', txt: tx }); t.estado = 'trabalhando'; t.t0 = Date.now(); api.chatEnviar(t.id, tx); }
      else if (x.texto) t.texto = x.texto;
    }
    if (ativa) { atual = { tipo: 'conv', id: ativa.id }; mostrar(); } else desenharLado();
    if (D.recarregou) aviso('Tela do FCC atualizada sem fechar. Conversas reabertas.');
  })();
}
if (D.abrirProjeto) { const p = PROJ.find(x => x.n.toLowerCase() === String(D.abrirProjeto).toLowerCase()); if (p) PREP.then(() => A.ultima(null, p)); }
if (D.teste?.autoteste) PREP.finally(() => setTimeout(() => api.fimTeste('tela nova abriu: ' + $$('.lado, #cab').length + ' partes'), 1500));   // testar-puro: abre, confere e fecha
window.CA = { CONVS, get atual() { return atual; }, A, draw, boas, boasPasta };
})();
