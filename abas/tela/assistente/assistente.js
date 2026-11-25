// Assistente V1 (11/11/2026): conversation with Claude in the small window (prototype B). Ids 'assist-…' (main.js routes their events here).
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICO = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  parar: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  abrir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
};
$$('[data-ico]').forEach(e => e.innerHTML = ICO[e.dataset.ico]);
$$('[data-ondas]').forEach(o => o.innerHTML = '<i></i>'.repeat(+o.dataset.ondas || 16));

const A = $('#assist'), lista = $('[data-lista]'), vazio = $('.vazio'), campo = $('[data-form] input'), btEnviar = $('[data-enviar]');
const NOMES = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus', fable: 'Fable' }, PENS = { low: 'baixo', medium: 'médio', high: 'alto' };
let D = { livre: '' }, conv = null, n = 0, cur = null, turno = '', espera = null, streamou = new Set(), msgAtual = null, modo = localStorage.getItem('modo') || 'voz';
const audio = new Audio();

function estado(e) { A.dataset.estado = e; btEnviar.innerHTML = e === 'pensando' ? ICO.parar : ICO.enviar; btEnviar.dataset.tit = e === 'pensando' ? 'Parar (Esc)' : 'Enviar (Enter)'; }
function definirModo(m) { modo = m; A.dataset.modo = m; localStorage.setItem('modo', m); $$('[data-modo] button').forEach(b => b.classList.toggle('sel', b.dataset.m === m)); if (m === 'texto') calar(); }
const rolar = () => { lista.scrollTop = lista.scrollHeight; };
function bolha(quem, texto) { const b = document.createElement('div'); b.className = 'msg ' + quem; b.textContent = texto || ''; lista.append(b); rolar(); return b; }
function linha(txt, k) { const l = document.createElement('div'); l.className = 'linha' + (k ? ' ' + k : ''); l.textContent = txt; lista.append(l); rolar(); return l; }
function esperando() { tirarEspera(); espera = bolha('ia'); espera.innerHTML = '<span class="pontos"><i></i><i></i><i></i></span>'; }
function tirarEspera() { if (espera) { espera.remove(); espera = null; } }
function modelo(m, esf) { $('[data-ast]').dataset.tit = `Claude ${NOMES[m] || m}${esf ? ' · pensamento ' + (PENS[esf] || esf) : ''}`; }

async function abrirConversa() {
  const id = 'assist-' + (++n), sessao = (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
  const r = await api.chatAbrir({ id, dir: D.livre, modo: 'livre', sessao, nome: 'assistente', modelo: 'haiku', esf: 'low' });
  if (!r || r.erro) { linha(r && r.erro || 'Não consegui abrir a conversa.', 'erro'); return null; }
  modelo('haiku', 'low');
  return conv = { id, sessao: r.sessao || sessao, usada: false };
}
async function enviar(txt) {
  txt = txt.trim(); if (!txt) return;
  calar(); bolha('voce', txt); esperando(); estado('pensando'); turno = ''; cur = null;
  if (!conv && !(await abrirConversa())) { tirarEspera(); estado('parado'); return; }
  conv.usada = true; api.chatEnviar(conv.id, txt);
}
function parar() { if (conv && A.dataset.estado === 'pensando') api.chatParar(conv.id); }
function fecharConversa() { if (conv) api.chatFechar(conv.id); conv = null; cur = null; turno = ''; tirarEspera(); }
function limpar() { fecharConversa(); calar(); lista.replaceChildren(vazio); vazio.style.animation = 'none'; void vazio.offsetWidth; vazio.style.animation = ''; estado('parado'); campo.focus(); }

// ---- voice: reply spoken with Vivienne (edge-tts in main) ----
let nFala = 0;
async function falar(txt) {
  if (modo !== 'voz' || !txt.trim()) return;
  const meu = ++nFala; const r = await api.falar(txt);
  if (meu !== nFala || modo !== 'voz') return;
  if (!r || r.erro) { if (r && r.erro) linha(r.erro, 'erro'); return; }
  if (!r.arq) return;
  audio.src = 'file:///' + r.arq.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
  try { await audio.play(); estado('falando'); } catch (e) { linha('Não consegui tocar a voz.', 'erro'); }
}
function calar() { nFala++; api.calar(); audio.pause(); if (A.dataset.estado === 'falando') estado('parado'); }
audio.onended = () => { if (A.dataset.estado === 'falando') { estado('parado'); campo.focus(); } };
setInterval(() => { const f = A.dataset.estado === 'falando'; $$('[data-ondas] i').forEach(i => i.style.height = f ? 4 + Math.random() * 20 + 'px' : '4px'); }, 110);

// ---- conversation events ----
api.ao('chat:msg', (id, x) => {
  if (!conv || id !== conv.id) return;
  if (x.type === 'stream_event') {
    const e = x.event;
    if (e.type === 'message_start') msgAtual = e.msg;
    if (e.type === 'content_block_delta' && e.delta && e.delta.type === 'text_delta' && e.delta.text) {
      tirarEspera(); if (!cur) { cur = bolha('ia'); cur.classList.add('digitando'); }
      cur.textContent += e.delta.text; turno += e.delta.text; if (msgAtual) streamou.add(msgAtual); rolar();
    }
    return;
  }
  if (x.type === 'assistant') {
    if (!streamou.has(x.id)) for (const b of x.content) if (b.type === 'text' && b.text) { tirarEspera(); bolha('ia', b.text); turno += b.text + '\n'; }
    for (const b of x.content) if (b.type === 'tool_use') {
      if (cur) { cur.classList.remove('digitando'); cur = null; }
      if (!/trocar_modelo$/.test(b.name)) { tirarEspera(); linha('· ' + acao(b)); esperando(); }
    }
    return;
  }
  if (x.type === 'result') {
    tirarEspera(); if (cur) cur.classList.remove('digitando'); cur = null;
    if (x.erro && x.texto) linha(x.texto, 'erro');
    estado('parado'); const t = turno; turno = ''; falar(t);
  }
});
function acao(b) {
  const i = b.input || {}, nome = String(b.name).replace(/^mcp__\w+__/, '');
  const m = { Bash: 'rodando um comando', PowerShell: 'rodando um comando', Read: 'lendo ' + base(i.file_path), Write: 'escrevendo ' + base(i.file_path), Edit: 'editando ' + base(i.file_path),
    Grep: 'procurando nos arquivos', Glob: 'procurando arquivos', WebSearch: 'pesquisando na internet', WebFetch: 'abrindo uma página', Agent: 'chamando um ajudante', Skill: 'abrindo uma skill' }[nome];
  return m || 'usando ' + nome;
}
const base = (p) => String(p || '').split(/[\\/]/).pop();
api.ao('chat:auto', (id, r) => { if (!conv || id !== conv.id) return; modelo(r.modelo, r.esf); linha(`Trocou para ${NOMES[r.modelo] || r.modelo} · pensamento ${PENS[r.esf] || r.esf}`, 'troca'); });
api.ao('chat:fim', (id, erro) => { if (!conv || id !== conv.id) return; tirarEspera(); if (erro) linha(erro, 'erro'); conv = null; estado('parado'); });
api.ao('chat:perm', (id, p) => {
  if (!conv || id !== conv.id) return; tirarEspera();
  const c = document.createElement('div'); c.className = 'perm'; c.dataset.req = p.req;
  if (p.tool === 'AskUserQuestion' || p.tool === 'ExitPlanMode') {
    c.innerHTML = '<b></b><div class="bts"><button class="sim" data-a="fcc">Abrir no FCC</button><button data-a="negar">Agora não</button></div>';
    $('b', c).textContent = p.tool === 'ExitPlanMode' ? 'O Claude montou um plano para você aprovar.' : 'O Claude quer te perguntar uma coisa.';
  } else {
    c.innerHTML = '<b></b><code></code><div class="bts"><button class="sim" data-a="permitir">Permitir</button><button data-a="negar">Negar</button></div>';
    $('b', c).textContent = 'Posso ' + acao({ name: p.tool, input: p.input }).replace(/^usando/, 'usar') + '?';
    const inp = p.input || {}; $('code', c).textContent = inp.command || inp.file_path || inp.url || inp.query || JSON.stringify(inp).slice(0, 300);
  }
  c.onclick = (ev) => { const b = ev.target.closest('[data-a]'); if (!b) return; c.classList.add('feito');
    if (b.dataset.a === 'fcc') return abrirNoFcc();
    api.chatPerm(id, p.req, b.dataset.a === 'negar' ? { acao: 'negar' } : { acao: 'permitir' }); if (b.dataset.a !== 'negar') esperando(); };
  lista.append(c); rolar();
});
api.ao('chat:perm-fim', (id, req) => { const c = $(`.perm[data-req="${req}"]`); if (c) c.classList.add('feito'); });

// ---- show / hide ----
api.ao('assist:mostrar', (tema) => {
  document.documentElement.dataset.tema = tema === 'claro' ? 'claro' : 'escuro';
  A.classList.remove('saindo', 'nasce'); void A.offsetWidth; A.classList.add('nasce'); setTimeout(() => campo.focus(), 30);
});
api.ao('assist:esconder', esconder);
function esconder() { calar(); A.classList.remove('nasce'); A.classList.add('saindo'); setTimeout(() => { api.esconder(); A.classList.remove('saindo'); }, 300); }
function abrirNoFcc() {
  const s = conv && conv.usada ? conv.sessao : null;
  if (s) { api.chatFechar(conv.id); conv = null; }
  calar(); api.abrirNoFcc(s); if (s) { lista.replaceChildren(vazio); estado('parado'); }
}

// ---- controls ----
$$('[data-modo] button').forEach(b => b.onclick = () => definirModo(b.dataset.m));
$('[data-fechar]').onclick = esconder;
$('[data-abrir]').onclick = abrirNoFcc;
$('[data-nova]').onclick = limpar;
$('[data-calar]').onclick = () => { calar(); campo.focus(); };
$$('[data-sug]').forEach(b => b.onclick = () => enviar(b.textContent));
$('[data-form]').addEventListener('submit', (ev) => { ev.preventDefault(); if (A.dataset.estado === 'pensando' && !campo.value.trim()) return parar(); const t = campo.value; campo.value = ''; enviar(t); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target === campo && !e.isComposing) { e.preventDefault(); $('[data-form]').requestSubmit(); return; }   // explicit: implicit form submit needs a keypress the test runner doesn't send
  if (e.key !== 'Escape') return;
  if (A.dataset.estado === 'pensando') parar(); else if (A.dataset.estado === 'falando') calar(); else esconder();
});

// tip on hover for everything with a title (same as prototype)
let dica;
document.addEventListener('mouseover', (e) => {
  const t0 = e.target.closest('[title]'); if (t0) { t0.dataset.tit = t0.title; t0.removeAttribute('title'); }
  const t = e.target.closest('[data-tit]'); dica?.remove(); dica = null; if (!t) return;
  dica = document.createElement('div'); dica.className = 'dica'; dica.textContent = t.dataset.tit; document.body.append(dica);
  const r = t.getBoundingClientRect(), d = dica.getBoundingClientRect();
  dica.style.left = Math.max(4, Math.min(innerWidth - d.width - 4, r.left + r.width / 2 - d.width / 2)) + 'px';
  dica.style.top = (r.top - d.height - 6 < 4 ? r.bottom + 6 : r.top - d.height - 6) + 'px';
});
document.addEventListener('mousedown', () => { dica?.remove(); dica = null; });

definirModo(modo); estado('parado');
api.dados().then(d => { D = d; document.documentElement.dataset.tema = d.tema === 'claro' ? 'claro' : 'escuro'; });
