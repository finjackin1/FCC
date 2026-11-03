// Claude Code with tabs (21/oct/2026): Electron main process.
// FCC (was iniciar-claude). Replaces console menu of iniciar-claude.bat (backup still works): same logic (projects, PARADA, account, local AI, setup, briefing),
// with UI of proposal C "Chrome" (docs\prototipos\abas\ESCOLHIDA). Each tab runs claude.exe in a real terminal (ConPTY).
'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, screen } = require('electron');
// UI requests slower than 150 ms go to log: where the app "hangs" (23/10, optimization)
{ const h = ipcMain.handle.bind(ipcMain); ipcMain.handle = (n, fn) => h(n, async (...a) => { const t0 = Date.now(); try { if (PORTAO_RESTAURO.has(n) && typeof RESTAURADO !== 'undefined') await RESTAURADO; return await fn(...a); } finally { const ms = Date.now() - t0; if (ms > 150 && typeof logApp === 'function') logApp(`lento: ${n} ${ms} ms`); } }); }
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const http = require('http');
const pty = require('@lydell/node-pty');

const C = require('./caminhos');
const P = require('./perfil');
const INV = require('./inventario');
const REST = require('./restaurar');
const PASTA = require('./pasta');
const PORTAO_RESTAURO = new Set(['dados', 'projetos', 'preparar', 'conta', 'contas', 'conta-usar', 'chat-abrir', 'pty-abrir', 'pasta-dados', 'pasta-acao']);   // wait for a pending profile restore first
app.setPath('userData', C.temp('electron')); app.setPath('temp', C.temp()); app.setPath('crashDumps', C.temp('crash'));   // Electron would otherwise write to the user's roaming profile
fs.mkdirSync(C.dados(), { recursive: true }); fs.mkdirSync(C.temp(), { recursive: true });
process.env.CLAUDE_CONFIG_DIR = C.configClaude();   // SDK calls in this process (listSessions, getSessionMessages, renameSession) must read the FCC profile, not the home .claude folder

// ---- paths: every one comes from caminhos.js (install root = folder of FCC.exe; layout described there) ----
const CCT = C.raiz();   // install root only
const RAIZ = C.projetos();
const FAM = C.regras();   // rules, tastes, lessons
const RELS = C.dados('relatorios');
fs.mkdirSync(RELS, { recursive: true });
const LOG = path.join(RELS, 'lancamentos.txt');
const LOG_APP = path.join(RELS, 'fcc.log');
// --demo-primeira (25/10, user request): simulated first run, real FCC untouched (Electron data and options in temp folder, nothing saved to session)
const DEMO = process.argv.includes('--demo-primeira'), DEMO_DIR = C.temp('demo-primeira');
if (DEMO) { try { fs.rmSync(DEMO_DIR, { recursive: true, force: true }); } catch { } fs.mkdirSync(DEMO_DIR, { recursive: true }); app.setPath('userData', path.join(DEMO_DIR, 'electron')); }
const INI = process.env.CCT_TESTE_INI || (DEMO ? path.join(DEMO_DIR, 'fcc.ini') : C.dados('fcc.ini'));
const SESSAO = C.dados('fcc-abas.json');
const LIVRE = path.join(C.perfil(), 'chat-livre');
const OLLAMA_URL = 'http://127.0.0.1:11434';
const ARGS = process.argv.slice(1);
const arg = (n) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : null; };
// Tests (window always offscreen, user's mouse/keyboard untouched):
//   --cena <name> / --autoteste <folder>: prototype data, scene captures to compare with prototype.
//   --roteiro "tecla:Enter;espera:3000;texto:abc;foto:<file>;sair": real data, no session/launch saving, no Explorer.
const TESTE = { cena: arg('--cena'), autoteste: arg('--autoteste'), roteiro: arg('--roteiro'), medir: arg('--medir') };   // --medir "selector,selector": element positions to log
const QUIETO = !!(TESTE.cena || TESTE.autoteste || TESTE.roteiro);
// 25/10 (user request, fewer tokens): command output cut at 15k chars (default 30k), MCP at 10k tokens (default 25k);
// applies to conversations and terminal (inherit env). Claude filters and rereads if it needs the rest.
process.env.BASH_MAX_OUTPUT_LENGTH = process.env.BASH_MAX_OUTPUT_LENGTH || '15000'; process.env.MAX_MCP_OUTPUT_TOKENS = process.env.MAX_MCP_OUTPUT_TOKENS || '10000';

function logApp(t) { try { fs.appendFileSync(LOG_APP, `${new Date().toISOString()} | ${t}\n`); } catch { } }
// Profile moved to another root (copy received / FCC moved): rewrite it once, before any conversation starts. Result stays in memory for the Pasta window.
let OUTRO = null;
const RESTAURADO = (async () => {
  try {
    if (!REST.precisaRestaurar()) return;
    const r = await REST.restaurarPerfil();
    OUTRO = { ferramentas: REST.faltando().ferramentas, erros: r.erros || [] };
    logApp(`restaurar: ${r.renomeadas} pastas, ${r.reescritas} arquivos, erros: ${(r.erros || []).length}`);
  } catch (e) { OUTRO = { ferramentas: [], erros: [String(e && e.message || e)] }; logApp('restaurar: ' + (e && e.stack || e)); }
})();
process.on('uncaughtException', (e) => logApp('ERRO ' + (e.stack || e)));
process.on('unhandledRejection', (e) => logApp('ERRO (promessa) ' + ((e && e.stack) || e)));
{ let ult = Date.now(); setInterval(() => { const a = Date.now(); if (a - ult > 2500) logApp(`processo principal parado ${a - ult} ms`); ult = a; }, 500); }   // hang watchdog

// ---- options (same .ini as console menu) ----
// modelo = Claude alias (fable/opus/sonnet/haiku) for next tabs; esforco = thinking (low..max); ia = 'claude' or local model
const OP = { explorer: '1', modelo: 'sonnet', esforco: 'medium', aoSair: 'menu', letra: 'escolhe', texto: '', barraUso: 'atual', autoConta: '1', pctUso: '1', nivel: 'low', pastas: '', codigo: '0', ia: 'claude', ctx: '65536', ctxSimples: '16384', ajudante: '0', auto: '1', lembrar: '1', tema: 'claro', painel: '1', passos: '0', pensar: '0', modoLocal: '', passagem: '100000',
  tam: 'max', fechar: 'bandeja', iaLocal: '', manter: '30m', fimLocal: 'descarregar', perm: 'auto', enter: 'continuar', camada: '', mcp: '', inicio: '', autoAtual: '1' };   // 24/10: camada = user's PERSONAL skills folder (besides casa\skills); mcp = local AI mcp.json (empty = casa\mcp.json)   // 23/10: interface 2 (AI window, Options, tray, ExitLag size)
function lerOpcoes() {
  try { for (const l of fs.readFileSync(INI, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) { const m = l.match(/^\s*(\w+)\s*=(.*)$/); if (m && m[1] in OP) OP[m[1]] = m[2].trim(); } } catch { }
  if (/^Continue de onde parou/i.test(OP.texto)) OP.texto = '';   // 23/10: no auto text; typed "continue" is enough (CLAUDE-global)
  OP.modelo = 'sonnet'; OP.esforco = 'medium';      // 24/10 (user request): every new conversation starts Sonnet Medium; change applies to that conversation only
  if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(OP.esforco)) OP.esforco = 'medium';
  if (/mcp\.json$/i.test(OP.mcp)) OP.mcp = path.dirname(OP.mcp);   // 24/10: mcp= is now the FOLDER (mcp.json inside)
}
function salvarOpcoes() {
  const l = ['; opções do FCC (o programa grava sozinho)', ...Object.keys(OP).map(k => `${k}=${OP[k]}`)];
  try { fs.writeFileSync(INI, l.join('\r\n') + '\r\n', 'utf8'); } catch (e) { logApp('ini: ' + e.message); }
}
// "IA local ajudando" option (26/10): Claude delegates code to best installed coding model via skill ia-local-ajudante
function regraAjudante() {
  if (!OP.ajudante || OP.ajudante === '0') return '';
  const nota = (n) => { const b = n.replace(/:[^:]+$/, ''); const c = CATALOGO.find(x => x.id === b); return c ? c.cod || 0 : /coder/.test(n) ? 3 : 0; };
  const L = modelosDoDisco().sort((a, b) => nota(b.n) - nota(a.n));
  if (!L.length) return '';
  const temPlacar = fs.existsSync(path.join(C.casa(), 'placar.md')), temLicoes = fs.existsSync(path.join(C.casa(), 'memoria', 'local-codigo.md'));   // only name files that exist
  return 'LOCAL AI HELPER ON (user setting, pre-approved: skip the "Passar para a IA local?" question). Delegate via skill ia-local-ajudante: ' +
    (OP.ajudante === 'tudo' ? 'any self-contained code or test file/function ≥40 lines' : 'self-contained code ≥120 lines') + '. You spec, review and fix; never delegate multi-file edits or UI design.\n' +
    'Installed (best coding first, GB): ' + L.map(m => m.n + ' ' + m.gb).join(', ') + '. Pick the model per task yourself (fits 8 GB VRAM = fast; bigger = smarter but slower' + (temPlacar ? '; read placar.md first' : '') + ').' +
    (temPlacar ? ' After each task log result per model in placar.md' + (temLicoes ? ' + 1 lesson in casa\\memoria\\local-codigo.md' : '') + ', so model choice and prompts improve over time.' : '');
}
// house skills only exist if the profile has them: option set but skill missing = behave as normal
const temSkill = (n) => { try { return fs.existsSync(path.join(C.perfilClaude(), 'skills', n)); } catch { return false; } };
// 02/11 (user request): Ultracave mode removed; both AIs always get this short brevity line instead (no skill needed)
const BREVE = 'Seja breve em todas as respostas: vá direto ao ponto, sem introdução, sem repetir o pedido, sem resumo no fim e sem oferecer o que não foi pedido. Breve não é incompleto: faça o trabalho inteiro e mantenha tudo o que muda o resultado (passos, números, nomes de arquivo, avisos, código pedido).';
// ---- CCT home (24/10, user request): clean skeleton shared by both AIs, independent of anyone's personal stuff ----
// casa\REGRAS.md (core, in every conversation) · skills\ (Claude: local plugin "casa" → /casa:<name>; local: /<name>) · memoria\claude.md and local.md
// · aprendizado\APRENDIZADOS.md (both AIs write; that's how they improve) · apelidos.txt · projetos\_modelo · mcp.json. Personal layer: OP.camada.
const CASA = C.casa();
// 27/10: other PCs get only the .exe → casa ships in resources\casa (empacotar.js extraResource); copied once, never overwrites the user's edits
function garantirCasa() {
  const de = path.join(process.resourcesPath || '', 'casa');
  if (fs.existsSync(path.join(CASA, 'REGRAS.md')) || !fs.existsSync(de)) return false;
  try { fs.cpSync(de, CASA, { recursive: true, force: false, errorOnExist: false }); logApp('casa copiada do programa para ' + CASA); return true; } catch (e) { logApp('casa: não copiou ' + e.message); return false; }
}
const CASA_NOVA = garantirCasa();
const lerCasa = (f) => { try { return fs.readFileSync(path.join(CASA, f), 'utf8').replace(/^﻿/, '').replace(/<!--[\s\S]*?-->/g, '').trim(); } catch { return ''; } };
const apelidos = () => lerCasa('apelidos.txt').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='));
function regrasCasa(ia) {
  const ap = apelidos().filter(l => !/\.local\s*=/.test(l)).map(l => l.replace(/\s*=\s*/, '=')).join(', ') || 'nenhum';   // "x.local = y" is local AI only
  // 24/10: user with own rules (conta\config\CLAUDE.md) gets only 1 home line (avoids ~300 repeated tokens per conversation)
  const proprias = ia === 'claude' && fs.existsSync(path.join(C.configClaude(), 'CLAUDE.md'));
  const nucleo = proprias ? `FCC home: ${CASA} (skills /casa:*; lessons in aprendizado\\APRENDIZADOS.md: grep before, add 1 line "situation → do X" after; aliases: ${ap}).`   // 25/10: internal text in terse English (fewer tokens); reply stays Portuguese
    : lerCasa('REGRAS.md').replace(/\{CASA\}/g, CASA).replace(/\{APELIDOS\}/g, ap);
  return [nucleo, ia === 'claude' ? lerCasa('memoria/claude.md') : ''].filter(Boolean).join('\n');
}
// built-in rule (always, also in pure mode): where things go; the only instruction FCC adds by itself
const INSTRUCAO = () => `Programas, ferramentas e arquivos criados vão para as pastas do FCC (ferramentas\\ e temp\\ dentro de ${C.raiz()}). Instalar algo no sistema só se não houver outro jeito, e avise antes.`;
const SEM_CODIGO = 'No-code mode (menu option): user does not want to see code. Replies: no code blocks, snippets, commands, diffs, logs or error messages; explain in plain pt-BR what was done, the result and what the user must do. File/folder names OK when the user needs to open them. If the user asks to see code, show it for that request only.';

// ---- launches ----
function pad2(n) { return String(n).padStart(2, '0'); }
function agora() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function registrar(o) {
  if (QUIETO) return;
  try {
    fs.appendFileSync(LOG, `${agora()} | ${o}\r\n`, 'utf8');
    const l = fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(Boolean);
    if (l.length > 300) fs.writeFileSync(LOG, l.slice(-200).join('\r\n') + '\r\n', 'utf8');
  } catch { }
}
function ultimasAberturas() {
  const u = {};
  try {
    for (const l of fs.readFileSync(LOG, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      let d = null, m;
      if ((m = l.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/))) d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
      else if ((m = l.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/))) d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      const k = l.match(/\|\s*(.+?)(\s+\(IA local[^)]*\))?\s*$/);
      if (d && k) u[k[1].toLowerCase()] = d;
    }
  } catch { }
  return u;
}

// ---- projects (same rule as menu: folder with CLAUDE.md at root; _ excluded) ----
function idade(d) { const h = new Date(); h.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0); const n = Math.round((h - x) / 864e5); return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} d`; }
function ddmm(d) { return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; }
function lerLinhas(f, n) { try { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).slice(0, n || 1e9); } catch { return null; } }
const GIT = new Map();   // dir -> { t, v }: git costs ~50 ms; redo at most every 60 s
function gitEstado(dir) {
  if (!fs.existsSync(path.join(dir, '.git'))) return null;
  const c = GIT.get(dir); if (c && Date.now() - c.t < 60000) return c.v;
  const git = (a) => { try { return cp.execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', windowsHide: true, timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
  const tag = git(['describe', '--tags', '--exact-match', 'HEAD']), sujo = git(['status', '--porcelain', '--untracked-files=no']);
  const v = sujo === null ? null : tag && !sujo ? 'publicado' : 'mudancas';
  GIT.set(dir, { t: Date.now(), v }); return v;
}
function lerProjeto(dir, ult) {
  const p = { n: path.basename(dir), dir, parada: ['PARADA.md', 'PRA-TESTAR.md'].some(f => fs.existsSync(path.join(dir, 'docs', f))), l: '', d: '', st: 'livre', voce: '', prox: '', itens: [], pt: 0, dt: '', id: '', ult: '', chave: 0 }; p.prog = !!acharExe(dir);   // 27/10: project sheet shows "Abrir o programa" only when dist has an .exe
  const l1 = (lerLinhas(path.join(dir, 'CLAUDE.md'), 1) || [''])[0];
  const m1 = l1.match(/^\s*#?\s*[^:]+:\s*(.+)$/); if (m1) p.d = m1[1].trim();
  const pt = lerLinhas(path.join(dir, 'docs', 'PRA-TESTAR.md'));
  if (pt) { p.itens = pt.filter(x => /^\s*(-|\*|\d+[.)])\s+(.+)$/.test(x) && !/\[x\]/.test(x)).map(x => x.replace(/^\s*(-|\*|\d+[.)])\s+(\[ \]\s*)?/, '').trim()); p.pt = p.itens.length; }
  const pa = path.join(dir, 'docs', 'PARADA.md');
  let mot = '', dtP = null;
  const txt = lerLinhas(pa, 40);
  if (txt) {
    dtP = fs.statSync(pa).mtime;
    for (const l of txt) {
      let m;
      if (!mot && (m = l.match(/^\s*-?\s*(Motivo(?: da parada)?|Parado)\s*:\s*(.*)$/))) mot = m[2];
      if (!p.voce && (m = l.match(/^\s*O que (ele|eu|voc[eê]) precisa fazer\s*:\s*(.+)$/))) p.voce = m[2].trim();
      if (!p.prox && (m = l.match(/^\s*Pr[oó]ximo passo[^:]*:\s*(.+)$/))) p.prox = m[1].trim();
    }
    if (!mot) mot = txt.slice(0, 6).join(' ');
  }
  if (/^\s*(nada|nenhum|-|—)/.test(p.voce)) p.voce = '';
  const a = mot.toLowerCase();
  if (p.pt > 0 || /teste|testar/.test(a)) p.st = 'testar';
  else if (/decis|decid|aval|permiss|d[uú]vida|escolh|aprova/.test(a) || p.voce) p.st = 'decidir';
  else if (/pausa|sem tarefa|sem objetivo/.test(a)) p.st = 'parado';
  // pending dots (25/10, user request): test (yellow), decide (red), publish (orange), changes (blue), published (green),
  // stopped (gray); "working" (purple) added by UI. Publish state from git: current version tagged and nothing changed = published.
  p.pend = [];
  if (p.pt > 0 || /teste|testar/.test(a)) p.pend.push('teste');
  if (/decis|decid|aval|permiss|d[uú]vida|escolh|aprova/.test(a.replace(/s[oó] com (o )?aval/g, ''))) p.pend.push('decidir');
  if (txt && /(commit|tag|push|release|publica)[^\n]{0,80}(esperando|falta|aguardando) (o )?aval|pronto (para|p\/) publicar/i.test(txt.join('\n'))) p.pend.push('publicar');
  const g = gitEstado(dir); if (g) p.pend.push(g);
  if (/pausa|sem tarefa|sem objetivo/.test(a) || !p.pend.length) p.pend.push('parado');
  if (p.st === 'testar' && !p.voce && p.pt > 0) p.voce = p.pt === 1 ? '1 item em PRA-TESTAR.' : `${p.pt} itens em PRA-TESTAR.`;
  if (dtP) { p.dt = ddmm(dtP); p.id = idade(dtP); }
  const u = ult[dir.toLowerCase()];
  if (u) p.ult = `${ddmm(u)} ${pad2(u.getHours())}:${pad2(u.getMinutes())}`;
  p.chave = Math.max(dtP ? +dtP : 0, u ? +u : 0);
  return p;
}
// each project's conversation when tab was closed (Continue returns to it; Home shows last message)
const CONVERSAS = QUIETO ? C.temp('fcc-conversas-teste.json') : C.dados('fcc-conversas.json');   // test doesn't touch user's file
// tab chain new→previous conversation (passagem). Kept by main: tab file written by an old exe may lack "antes" (27/10 bug)
const ELOS = QUIETO ? C.temp('fcc-elos-teste.json') : C.dados('fcc-elos.json');
function lerElos() { try { return JSON.parse(fs.readFileSync(ELOS, 'utf8')); } catch { return {}; } }
function gravarElo(nova, antiga) { try { const e = lerElos(); e[nova] = antiga; const k = Object.keys(e); for (const x of k.slice(0, Math.max(0, k.length - 300))) delete e[x]; fs.writeFileSync(ELOS, JSON.stringify(e, null, 1), 'utf8'); } catch (er) { logApp('elos: ' + er.message); } }
function lerConversas() { try { return JSON.parse(fs.readFileSync(CONVERSAS, 'utf8')); } catch { return {}; } }
function lerProjetos() {
  const ult = ultimasAberturas(), conv = lerConversas();
  const raizes = [RAIZ, ...OP.pastas.split(';').map(s => s.trim()).filter(s => s && fs.existsSync(s))];
  const lista = [];
  for (const r of raizes) {
    let ds = []; try { ds = fs.readdirSync(r, { withFileTypes: true }); } catch { }
    for (const d of ds.filter(d => d.isDirectory() && d.name[0] !== '_').sort((a, b) => a.name.localeCompare(b.name))) {
      const dir = path.join(r, d.name);
      if (fs.existsSync(path.join(dir, 'CLAUDE.md'))) { const p = lerProjeto(dir, ult); p.ult = conv[dir.toLowerCase()] || null; lista.push(p); }
    }
  }
  let usadas = '';
  for (const p of lista) {
    let lt = ''; for (const c of p.n.toUpperCase()) if (c >= 'A' && c <= 'Z' && !usadas.includes(c)) { lt = c; break; }
    if (!lt) lt = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(c => !usadas.includes(c)) || '';
    p.l = lt; usadas += lt;
  }
  const precisa = lista.filter(p => p.st === 'testar' || p.st === 'decidir').sort((a, b) => b.chave - a.chave);
  const outros = lista.filter(p => p.st !== 'testar' && p.st !== 'decidir').sort((a, b) => b.chave - a.chave);
  return [...precisa, ...outros];
}

// ---- free chat briefing (same as console menu) ----
const ROT = { testar: 'você testa', decidir: 'você decide', livre: 'livre', parado: 'parado' };
function escreverBriefing(conta) {
  try {
    fs.mkdirSync(LIVRE, { recursive: true });
    const cm = path.join(LIVRE, 'CLAUDE.md');
    if (!fs.existsSync(cm)) fs.writeFileSync(cm, ['# Chat livre (pasta perfil\\chat-livre, aberta pelo chat livre do FCC)', '@BRIEFING.md',
      '- O BRIEFING acima é a situação atual de todos os projetos, refeito pelo menu a cada login e a cada chat livre. Use-o para responder e orientar sem pedir contexto; ele não é tarefa: espere o pedido.',
      '- Para mexer num projeto, leia antes o CLAUDE.md e o docs\\PARADA.md dele.'].join('\r\n') + '\r\n', 'utf8');
    const L = lerProjetos(); const n = L.filter(p => p.st === 'testar' || p.st === 'decidir').length;
    const d = new Date(); const l = [`# Briefing (gerado pelo FCC em ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}; não editar, é refeito)`];
    if (conta && conta.email) l.push(`Conta: ${conta.email}${conta.plano ? ` (${conta.plano})` : ''}`);
    if (!fs.existsSync(path.join(C.configClaude(), 'CLAUDE.md'))) l.push('ATENÇÃO: não existe conta\\config\\CLAUDE.md (pasta do FCC), então as regras globais não carregaram. A cópia está em ' + FAM + '\\CLAUDE-global.md: leia e avise ele logo no começo.');
    const pm = path.basename(CCT)[0] === '_' && lerLinhas(path.join(CCT, 'docs', 'PARADA.md'));   // as project (CCT) it's already in list below
    if (pm) { l.push('', `## O próprio menu (${path.basename(CCT)})`); for (const x of pm.filter(x => /^\s*(Motivo|Pr[oó]ximo passo|O que (ele|voc[eê]) precisa)/.test(x))) l.push(`- ${x.trim()}`); }
    l.push('', `## Projetos (${L.length}) em ${RAIZ}`);
    L.forEach((p, i) => {
      if (i === 0 && n > 0) l.push('### Precisam dele'); if (i === n) l.push('### Os outros');
      l.push(`- ${p.n}: ${ROT[p.st]}${p.d ? ` (${p.d})` : ''}; ${p.dt ? `PARADA de ${p.dt} (${p.id})` : 'sem PARADA'}`);
      if (p.voce) l.push(`  - Ele precisa: ${p.voce}`); if (p.prox) l.push(`  - Próximo passo: ${p.prox}`);
    });
    const lg = lerLinhas(LOG); if (lg) { l.push('', '## Últimas aberturas pelo menu'); for (const x of lg.filter(Boolean).slice(-5)) l.push(`- ${x}`); }
    fs.writeFileSync(path.join(LIVRE, 'BRIEFING.md'), l.join('\r\n') + '\r\n', 'utf8');
  } catch (e) { logApp('briefing: ' + e.message); }
}

// ---- Claude Code, account, git ----
function acharClaude() {
  const propria = C.ferramentas('claude', 'claude.exe');
  if (fs.existsSync(propria)) return propria;
  const local = path.join(os.homedir(), '.local', 'bin', 'claude.exe');   // fora: leitura
  if (fs.existsSync(local)) return local;
  try { const r = cp.execSync('where claude', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).split(/\r?\n/).filter(Boolean); const exe = r.find(x => /\.exe$/i.test(x)) || r[0]; if (exe) return exe; } catch { }
  return null;
}
// system snapshot around conversations/terminals (what got installed on this PC): never throws, never blocks the turn
const VIGIAS = new Map();
function iniciarVigia(chave) {
  if (QUIETO || DEMO || VIGIAS.has(chave)) return;
  try { VIGIAS.set(chave, INV.vigiar(String(chave))); } catch (e) { logApp('vigiar: ' + e.message); }
}
function fecharVigia(chave) {
  const v = VIGIAS.get(chave); if (!v) return;
  VIGIAS.delete(chave);
  try { Promise.resolve(v.fim()).catch((e) => logApp('vigiar fim: ' + (e && e.message))); } catch (e) { logApp('vigiar fim: ' + e.message); }
}
function cfgClaude(base) {         // account/profile split: env for any Claude Code launch + profile settings path (or null)
  let r;
  try { r = P.prepararConfig(); } catch (e) { logApp('perfil: ' + e.message); r = { env: { CLAUDE_CONFIG_DIR: C.configClaude() }, settings: null }; }
  return { env: { ...(base || process.env), ...r.env, FCC_CONTAS: C.contas() }, settings: r.settings };
}
function contaStatus() {
  return new Promise((ok) => {
    const c = acharClaude(); if (!c) return ok({ estado: 'ausente' });
    cp.execFile(c, ['auth', 'status'], { windowsHide: true, encoding: 'utf8', timeout: 20000, env: cfgClaude().env }, (err, out) => {
      try { const j = JSON.parse(out); return ok({ estado: j.loggedIn ? 'ok' : 'sem', email: j.email || '', plano: j.subscriptionType || '' }); } catch { }
      ok({ estado: err ? 'sem' : 'ok', email: '', plano: '' });
    });
  });
}
function gitNoPath(env) {           // GitHub Desktop git (folder changes per version: take newest)
  try {
    const gh = path.join(process.env.LOCALAPPDATA, 'GitHubDesktop');   // fora: leitura
    const d = fs.readdirSync(gh).filter(x => x.startsWith('app-')).map(x => path.join(gh, x, 'resources', 'app', 'git', 'cmd')).filter(x => fs.existsSync(path.join(x, 'git.exe'))).sort().pop();
    if (d && !(env.Path || '').includes(d)) env.Path = d + ';' + (env.Path || '');
  } catch { }
}

// ---- local AI (Ollama): same recipe as console menu (docs\contexto\ia-local.md) ----
// models default to ferramentas\ollama\models (unless OLLAMA_MODELS is set)
function OP_MODELOS() { return process.env.OLLAMA_MODELS || C.ferramentas('ollama', 'models'); }
function acharOllama() {
  for (const f of [C.ferramentas('ollama', 'app', 'ollama.exe'), path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe')]) if (fs.existsSync(f)) return f;   // fora: leitura
  try { return cp.execSync('where ollama', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).split(/\r?\n/)[0] || null; } catch { return null; }
}
// installed models read from disk (Ollama manifests): instant, no server start (before, F4 list
// waited for "ollama serve": several seconds). Name as in Ollama: library\qwen3\8b = qwen3:8b; others = owner/model:tag
function modelosDoDisco() {
  const raiz = path.join(OP_MODELOS(), 'manifests'), L = [];
  const ls = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } };
  for (const reg of ls(raiz).filter(x => x.isDirectory())) for (const dono of ls(path.join(raiz, reg.name)).filter(x => x.isDirectory())) for (const mod of ls(path.join(raiz, reg.name, dono.name)).filter(x => x.isDirectory()))
    for (const tag of ls(path.join(raiz, reg.name, dono.name, mod.name)).filter(x => x.isFile())) {
      let gb = 0; try { const j = JSON.parse(fs.readFileSync(path.join(raiz, reg.name, dono.name, mod.name, tag.name), 'utf8')); gb = Math.round((j.layers || []).reduce((s, l) => s + (l.size || 0), 0) / 1073741824); } catch { }
      const base = reg.name === 'registry.ollama.ai' && dono.name === 'library' ? mod.name : reg.name === 'registry.ollama.ai' ? `${dono.name}/${mod.name}` : `${reg.name}/${dono.name}/${mod.name}`;
      L.push({ n: tag.name === 'latest' ? base + ':latest' : `${base}:${tag.name}`, gb });
    }
  return L.sort((a, b) => a.n.localeCompare(b.n));
}
let OLLAMA_NOSSO = null, MATANDO = null;                    // pid of "ollama serve" THIS app started (one already running is not stopped)
const MODELOS_CARREGADOS = new Set(), PTYS_LOCAIS = new Set();
async function ollamaNoAr() { try { const r = await fetch(OLLAMA_URL + '/api/version', { signal: AbortSignal.timeout(1000) }); return r.ok; } catch { return false; } }
async function garantirOllama() {
  if (MATANDO) await MATANDO;              // server shutting down: wait before deciding
  if (await ollamaNoAr()) return '';
  const exe = acharOllama(); if (!exe) return 'o Ollama não está instalado';
  const env = { ...process.env, OLLAMA_MODELS: OP_MODELOS(), OLLAMA_CONTEXT_LENGTH: OP.ctx,
    OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || OP.manter || '30m' };   // Ollama default is 5 min: after a pause big model reloaded from scratch (Locally Uncensored uses 30 min)
  // NO detached: detached from console, each process Ollama spawns to run model got a visible cmd window (21/10).
  // With hidden console (windowsHide), children inherit it and nothing shows.
  const filho = cp.spawn(exe, ['serve'], { env, stdio: 'ignore', windowsHide: true }); filho.unref(); OLLAMA_NOSSO = filho.pid;
  for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); if (await ollamaNoAr()) { registrar('IA LOCAL: servidor do Ollama ligado'); return ''; } }
  return 'o servidor do Ollama não respondeu';
}
async function modelosLocais() {
  try { const r = await fetch(OLLAMA_URL + '/api/tags', { signal: AbortSignal.timeout(3000) }); const j = await r.json(); return (j.models || []).map(m => ({ n: m.name, gb: Math.round(m.size / 1073741824) })).sort((a, b) => a.n.localeCompare(b.n)); } catch { return []; }
}
// Bridge between Claude Code and Ollama (21/10): adds "think" or "no think" to each request per tab button.
// With thinking off Claude Code sends no setting and qwen thinks anyway (measured: "oi" 38 s thinking vs 5 s without).
const PENSAR = new Map();                   // tab → local AI mode 0 fast / 1 normal / 2 think (only 2 turns model thinking on)
const nivelP = (v) => v === true ? 2 : v === false ? 0 : Math.min(2, Math.max(0, parseInt(v, 10) || 0));
// 26/10 (user request): same model, each mode adds bigger guidance before the message; all answer in pt-BR
const MODOS_LOCAL = [
  'Modo RÁPIDO: vá direto à resposta, em poucas frases. Sem introdução, sem repetir a pergunta, sem resumo no fim. Se faltar um dado essencial, faça uma pergunta curta.',
  '',
  'Modo PENSAR: pense em português e com calma antes de responder: 1) o que exatamente está sendo pedido e qual o objetivo por trás; 2) o que você sabe com certeza e o que é suposição; 3) duas ou três formas de resolver e por que escolhe uma; 4) confira contas, lógica e casos-limite; 5) procure o erro na sua própria resposta antes de entregar. Na resposta final: conclusão primeiro, depois o raciocínio que importa, passos concretos, riscos e alternativas. Diga com honestidade o que é incerto. Não despeje o rascunho, só o que ajuda.'];
const modoTexto = (aba) => MODOS_LOCAL[PENSAR.has(aba) ? PENSAR.get(aba) : 1];
let PONTE = null;
function ponte() {
  if (PONTE) return PONTE;
  return (PONTE = new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const m = req.url.match(/^\/a\/([^/]+)(\/.*)$/); const aba = m ? m[1] : null; const caminho = m ? m[2] : req.url;
      const partes = []; req.on('data', d => partes.push(d));
      req.on('end', () => {
        const orig = Buffer.concat(partes); let corpo = orig, mexeu = false, stream = false;
        if (aba && req.method === 'POST' && /\/v1\/messages(\?|$)/.test(caminho)) {
          try { const j = JSON.parse(corpo); stream = !!j.stream; if (/gpt-oss/i.test(j.model || '')) { j.thinking = { type: 'enabled' }; j.output_config = { ...(j.output_config || {}), effort: ['low', 'medium', 'high'].includes(OP.nivel) ? OP.nivel : 'low' }; }
          else j.thinking = PENSAR.get(aba) === 2 ? { type: 'enabled', budget_tokens: 8000 } : { type: 'disabled' };
            const mt = modoTexto(aba); j.system = typeof j.system === 'string' ? j.system + '\n\n' + mt : [...(j.system || []), { type: 'text', text: mt }]; corpo = Buffer.from(JSON.stringify(j)); mexeu = true; } catch { }
        }
        const pedir = (b, ultima) => {
          const r2 = http.request({ host: '127.0.0.1', port: 11434, path: caminho, method: req.method, headers: { ...req.headers, host: '127.0.0.1:11434', 'content-length': b.length } }, (resp) => {
            // model not accepting think setting returns 400: retry once without it (like Locally Uncensored)
            if (resp.statusCode === 400 && !ultima) { resp.resume(); return pedir(orig, true); }
            res.writeHead(resp.statusCode, resp.headers);
            const med = stream && resp.statusCode === 200 ? medidor(aba) : null;
            resp.on('data', (d) => { res.write(d); if (med) med.pedaco(d); });
            resp.on('end', () => { res.end(); if (med) med.fim(); });
          });
          r2.on('error', (e) => { res.writeHead(502); res.end(e.message); });
          r2.end(b);
        };
        pedir(corpo, !mexeu);
      });
    });
    s.listen(0, '127.0.0.1', () => ok(s.address().port));
  }));
}
// local AI speed (tokens/s, thinking included), measured on reply through bridge:
// counts 1st to last token (excluding model load and prompt read), like Locally Uncensored when
// Ollama's own numbers missing; at end uses Ollama's total token count. Small requests (title etc.) don't count.
let ULT_LOCAL = { tps: '', primeira: '' };
function medidor(aba) {
  let resto = '', n = 0, t1 = 0, tN = 0, saida = 0, ultEnvio = 0; const tIni = Date.now();
  const fmt = (x) => x < 10 ? x.toFixed(1).replace('.', ',') : String(Math.round(x));
  return {
    pedaco(d) {
      const ls = (resto + d.toString('utf8')).split('\n'); resto = ls.pop();
      for (const l of ls) {
        if (!l.startsWith('data:')) continue; let j; try { j = JSON.parse(l.slice(5)); } catch { continue; }
        if (j.type === 'content_block_delta') { const a = Date.now(); if (!t1) t1 = a; tN = a; n++; }
        else if (j.type === 'message_delta' && j.usage && j.usage.output_tokens) saida = j.usage.output_tokens;
      }
      const a = Date.now();
      if (n >= 20 && a - t1 > 1500 && a - ultEnvio > 1000) { ultEnvio = a; enviar('chat:vel', aba, { tps: fmt(n / ((a - t1) / 1000)) }); }
    },
    fim() { const s = (tN - t1) / 1000, tk = Math.max(saida, n); if (n >= 20 && s > 0.5) { enviar('chat:vel', aba, { tps: fmt(tk / s), fim: true }); ULT_LOCAL = { tps: fmt(tk / s) + ' tok/s', primeira: fmt((t1 - tIni) / 1000) + ' s' }; } },
  };
}
function envLocal(env, modelo, porta, aba) {
  Object.assign(env, { ANTHROPIC_BASE_URL: porta ? `http://127.0.0.1:${porta}/a/${aba}` : OLLAMA_URL, ANTHROPIC_AUTH_TOKEN: 'ollama', ANTHROPIC_MODEL: modelo, ANTHROPIC_DEFAULT_OPUS_MODEL: modelo, ANTHROPIC_DEFAULT_SONNET_MODEL: modelo,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: modelo, ANTHROPIC_DEFAULT_FABLE_MODEL: modelo, CLAUDE_CODE_SUBAGENT_MODEL: modelo, CLAUDE_CODE_MAX_CONTEXT_TOKENS: OP.ctx,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1', DISABLE_AUTOUPDATER: '1', DISABLE_GROWTHBOOK: '1',
    ENABLE_CLAUDEAI_MCP_SERVERS: 'false', DISABLE_PROMPT_CACHING: '1' });
  delete env.ANTHROPIC_API_KEY;
}

// ---- each tab's state via Claude Code's own hooks (this session only, via --settings; user's settings.json unchanged):
// prompt sent / tool running = working; finished / asked permission = waiting for you ----
const EST_DIR = C.temp('abas');
function ajustesDaAba(id, pf) {     // pf = profile settings.json path (from cfgClaude().settings) or null
  fs.mkdirSync(EST_DIR, { recursive: true });
  const f = path.join(EST_DIR, id + '.txt'); try { fs.unlinkSync(f); } catch { } ESTADOS.delete(id);
  const h = (st) => [{ hooks: [{ type: 'command', command: `cmd /c "echo ${st}>${f}"` }] }];
  const tab = { UserPromptSubmit: h('trabalhando'), PreToolUse: h('trabalhando'), Stop: h('esperando'), Notification: h('esperando') };
  let perfil = {};
  if (pf) { try { const j = JSON.parse(fs.readFileSync(pf, 'utf8').replace(/^﻿/, '')); if (j && typeof j === 'object' && !Array.isArray(j)) perfil = j; } catch (e) { logApp('perfil settings: ' + e.message); } }
  const hooks = { ...(perfil.hooks && typeof perfil.hooks === 'object' ? perfil.hooks : {}) };
  for (const [ev, arr] of Object.entries(tab)) hooks[ev] = [...(Array.isArray(hooks[ev]) ? hooks[ev] : []), ...arr];
  const s = { ...perfil, theme: OP.tema === 'escuro' ? 'dark' : 'light', hooks };
  const arq = path.join(EST_DIR, id + '.json'); fs.writeFileSync(arq, JSON.stringify(s), 'utf8');
  return arq;
}
const ESTADOS = new Map();
setInterval(() => {
  for (const id of PTYS.keys()) {
    let st = ''; try { st = fs.readFileSync(path.join(EST_DIR, id + '.txt'), 'utf8').trim(); } catch { continue; }
    if (st && ESTADOS.get(id) !== st) { ESTADOS.set(id, st); enviar('pty:estado', id, st); }
  }
}, 250);

// ---- terminals (one ConPTY per tab) ----
const PTYS = new Map();
let win = null;
function enviar(canal, ...a) { if (win && !win.isDestroyed()) win.webContents.send(canal, ...a); }
async function abrirTerminal(o) {
  // o = { id, dir, modo: continuar|retomar|nova|livre|resume|login|teste, nome, sessao, ia, cols, rows }
  const claude = acharClaude();
  const cfg = cfgClaude(), env = cfg.env; gitNoPath(env);
  // session markers of a Claude that opened this app: if inherited, each tab would think it's a "child session"
  for (const k of ['CLAUDECODE', 'CLAUDE_PID', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_SSE_PORT']) delete env[k];
  env.TERM_PROGRAM = 'FCC';
  if (o.modo !== 'teste' && o.modo !== 'login') { try { Object.assign(env, INV.envInstaladores()); } catch (e) { logApp('env instaladores: ' + e.message); } }
  let exe = claude, args = [];
  if (o.modo === 'teste') { exe = 'cmd.exe'; args = ['/c', 'echo terminal ok & ver']; }
  else if (o.modo === 'login') { if (!claude) return { erro: 'Não achei o Claude Code neste Windows.' }; args = ['auth', 'login']; }
  else {
    if (!claude) return { erro: 'Não achei o Claude Code neste Windows.' };
    const local = o.ia && o.ia !== 'claude';
    if (local) { const e = await garantirOllama(); if (e) return { erro: `IA local: ${e}.` }; PENSAR.set(o.id, nivelP(o.pensar)); envLocal(env, o.ia, await ponte(), o.id); MODELOS_CARREGADOS.add(o.ia); PTYS_LOCAIS.add(o.id); marcarUso(o.ia); }
    if (o.modo === 'retomar') args.push('-c');
    else if (o.modo === 'resume') args.push('--resume', o.sessao);
    else { args.push('--session-id', o.sessao); if (o.nome) args.push('-n', o.nome + (local ? ' (local)' : '')); }
    if (local) args.push('--model', o.ia); else { args.push('--model', o.modelo || OP.modelo); args.push('--effort', o.esf || OP.esforco); }
    args.push('--append-system-prompt', [OP.codigo === '1' ? '' : SEM_CODIGO, INSTRUCAO()].filter(Boolean).join('\n\n'));
    args.push('--settings', ajustesDaAba(o.id, cfg.settings));
    if (o.modo === 'continuar' && OP.texto) args.push(OP.texto.replace(/"/g, "'"));
    if (o.modo === 'livre') escreverBriefing(ultimaConta);
    registrar(`${o.modo === 'livre' ? 'CHAT LIVRE' : o.dir}${local ? ` (IA local ${o.ia})` : ''}`);
    if (o.modo !== 'livre' && o.modo !== 'resume' && OP.explorer === '1' && !QUIETO) shell.openPath(o.dir);
  }
  let p;
  try { p = pty.spawn(exe, args, { name: 'xterm-256color', cols: o.cols || 120, rows: o.rows || 30, cwd: o.dir, env, useConpty: true }); }
  catch (e) { logApp('pty: ' + e.message); return { erro: 'Não consegui abrir o terminal: ' + e.message }; }
  PTYS.set(o.id, p);
  const chaveVigia = 'pty-' + o.id; if (o.modo !== 'teste' && o.modo !== 'login') iniciarVigia(chaveVigia);
  p.onData(d => enviar('pty:dados', o.id, d));
  p.onExit(({ exitCode }) => { PTYS.delete(o.id); fecharVigia(chaveVigia); if (PTYS_LOCAIS.delete(o.id)) liberarLocal(); enviar('pty:saiu', o.id, exitCode); if (o.modo === 'login') contaStatus().then(c => { ultimaConta = c; enviar('conta', c); if (c.estado === 'ok') escreverBriefing(c); registrar(c.estado === 'ok' ? 'LOGIN: ok' : 'LOGIN: ERRO'); }); });
  return { ok: true };
}

// ---- conversation (chat proposal C, 21/oct/2026): each tab talks to Claude Code via official library (Agent SDK),
// running user's claude.exe (same account, rules, skills, hooks). App draws chat and answers permissions. ----
let SDK = null;
const sdk = async () => SDK || (SDK = await import('@anthropic-ai/claude-agent-sdk'));
const CHATS = new Map();
const NUVEM = ['fable', 'opus', 'sonnet', 'haiku'];
function cortar(v, n = 400) {
  if (typeof v === 'string') return v.length > n ? v.slice(0, n) + '…' : v;
  if (v && typeof v === 'object') { const o = Array.isArray(v) ? [] : {}; for (const k of Object.keys(v).slice(0, 20)) o[k] = cortar(v[k], n); return o; }
  return v;
}
function textoDe(c) { return typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : ''; }
// only what UI uses (tool results and big files don't pass whole)
function enxugar(m) {
  if (!m || m.parent_tool_use_id) return null;                 // subagent internal work: UI shows only agent line
  if (m.type === 'stream_event') {
    const e = m.event || {}; const r = { type: e.type, index: e.index };
    if (e.content_block) r.bloco = e.content_block.type;
    if (e.delta) r.delta = { type: e.delta.type, text: e.delta.text, thinking: e.delta.thinking };
    if (e.message) r.msg = e.message.id;
    const u = (e.message && e.message.usage) || e.usage; if (u) r.uso = { ent: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), sai: u.output_tokens || 0 };
    return { type: 'stream_event', event: r };
  }
  if (m.type === 'assistant') {
    const c = (m.message && m.message.content) || [];
    return { type: 'assistant', id: m.message && m.message.id, uuid: m.uuid, content: c.map(b => b.type === 'text' ? { type: 'text', text: b.text } : b.type === 'thinking' ? { type: 'thinking', thinking: b.thinking || '' }
      : b.type === 'tool_use' ? { type: 'tool_use', id: b.id, name: b.name, input: cortar(b.input) } : { type: b.type }) };
  }
  if (m.type === 'user') {
    const c = m.message && m.message.content;
    if (typeof c === 'string') return { type: 'user', uuid: m.uuid, texto: cortar(c, 4000), meta: !!m.isMeta };
    const res = (c || []).filter(b => b.type === 'tool_result').map(b => { const t = textoDe(b.content); return { id: b.tool_use_id, erro: !!b.is_error, linhas: t ? t.split('\n').length : 0, txt: cortar(t, 300) }; });
    return { type: 'user', uuid: m.uuid, resultados: res, texto: cortar(textoDe(c), 4000), meta: !!m.isMeta };
  }
  if (m.type === 'result') { const u = m.usage || {}; return { type: 'result', subtype: m.subtype, erro: !!m.is_error, texto: cortar(m.result || (m.errors || []).join(' '), 600), ms: m.duration_ms || 0,
    uso: { ent: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), cache: u.cache_read_input_tokens || 0, sai: u.output_tokens || 0 } }; }
  // background helpers (30/10 bug: agent/command in background ends the turn → UI looked stopped until it came back by itself)
  if (m.type === 'system' && m.subtype === 'background_tasks_changed') return { type: 'system', subtype: m.subtype, tarefas: (m.tasks || []).filter(x => !x.ambient).map(x => ({ id: x.task_id, desc: cortar(x.description || '', 160), tipo: x.task_type })) };
  if (m.type === 'system' && (m.subtype === 'task_started' || m.subtype === 'task_progress')) { const u = m.usage || {}; return { type: 'system', subtype: m.subtype, id: m.task_id, ferrId: m.tool_use_id, desc: cortar(m.description || '', 160), tipo: m.task_type, ult: m.last_tool_name, n: u.tool_uses || 0, resumo: cortar(m.summary || '', 160) }; }
  if (m.type === 'system') return { type: 'system', subtype: m.subtype, model: m.model, comandos: m.slash_commands, session_id: m.session_id };
  if (m.type === 'rate_limit_event') { const i = m.rate_limit_info || {}; return { type: 'limite', status: i.status, volta: i.resetsAt, tipo: i.rateLimitType, uso: i.utilization }; }
  return null;
}
function filaDeEntrada() {             // user messages enter here while conversation is open
  const f = { itens: [], acorda: null, fim: false };
  f.por = (txt) => { f.itens.push({ type: 'user', message: { role: 'user', content: txt }, parent_tool_use_id: null, origin: { kind: 'human' } }); if (f.acorda) { f.acorda(); f.acorda = null; } };
  f.fechar = () => { f.fim = true; if (f.acorda) { f.acorda(); f.acorda = null; } };
  f.iter = (async function* () { while (!f.fim) { if (f.itens.length) yield f.itens.shift(); else await new Promise(r => { f.acorda = r; }); } })();
  return f;
}
// local AI = plain conversation direct to Ollama (local.js), no Claude Code (23/10: its prompt made each reply take minutes)
let LOCAL = null;
const motorLocal = () => LOCAL || (LOCAL = require('./local.js')({ OP, OLLAMA_URL, PASTA_CONVERSAS: C.dados('conversas-locais'), PENSAR, modoTexto, logApp, breve: BREVE, temSkill, CASA, regrasCasa, apelidos, camada: () => OP.camada, mcpPasta: () => OP.mcp || CASA,
  vel: (aba, v) => { const fmt = (x) => x < 10 ? x.toFixed(1).replace('.', ',') : String(Math.round(x)); enviar('chat:vel', aba, { tps: fmt(v.tps), fim: !!v.fim }); if (v.fim) ULT_LOCAL = { tps: fmt(v.tps) + ' tok/s', primeira: fmt(v.primeira) + ' s' }; } }));
async function abrirChatLocal(o) {
  const e = await garantirOllama(); if (e) return { erro: `IA local: ${e}.` };
  const L = motorLocal(); PENSAR.set(o.id, nivelP(o.pensar)); MODELOS_CARREGADOS.add(o.modelo); marcarUso(o.modelo);
  let sessao = o.sessao;
  if (o.modo === 'retomar') sessao = L.ultimaDaPasta(o.dir) || sessao;
  const retoma = o.modo === 'resume' || (o.modo === 'retomar' && sessao !== o.sessao);
  if (o.modo === 'resume' && !o.ate && !L.existe(sessao)) return { semConversa: true };
  const historico = retoma && !o.ate ? L.historico(sessao).map(enxugar).filter(Boolean) : [];
  const fila = filaDeEntrada(), c = { fila, perms: new Map(), local: true, simples: true, sessao, o };
  const q = L.query({ prompt: fila.iter, options: { cwd: o.dir, aba: o.id, sessao, model: o.modelo, nome: o.nome, ate: o.ate, herdar: o.herdar, semCodigo: OP.codigo === '1' ? '' : SEM_CODIGO, instrucao: INSTRUCAO(),
    canUseTool: (tool, input, x) => new Promise((ok) => {
      const req = crypto.randomUUID(); c.perms.set(req, { ok, input, sug: x && x.suggestions });
      if (x && x.signal) x.signal.addEventListener('abort', () => { if (c.perms.delete(req)) { ok({ behavior: 'deny', message: 'cancelado' }); enviar('chat:perm-fim', o.id, req); } });
      enviar('chat:perm', o.id, { req, tool, input: cortar(input, 600) });
    }) } });
  c.q = q; CHATS.set(o.id, c); c.modelo = o.modelo; abrirSessao(c, o);
  registrar(`${o.modo === 'livre' ? 'CHAT LIVRE' : o.dir} (IA local ${o.modelo}, conversa simples)`);
  if (o.modo !== 'livre' && o.modo !== 'resume' && OP.explorer === '1' && !QUIETO) shell.openPath(o.dir);
  (async () => {
    try { for await (const m of q) { const x = enxugar(m); if (x) { if (x.type === 'result') { anotarUso(c, x); fecharVigia(o.id); } enviar('chat:msg', o.id, x); } } if (!c.fechado) enviar('chat:fim', o.id, ''); }
    catch (err) { logApp(`chat local ${o.id}: ${err.stack || err}`); if (!c.fechado) enviar('chat:fim', o.id, err.message || String(err)); }
    finally { fecharSessao(c); fecharVigia(o.id); if (CHATS.get(o.id) === c) { CHATS.delete(o.id); liberarLocal(); } }
  })();
  if (o.aviso) fila.por(o.aviso);
  return { ok: true, sessao, historico, comandos: L.comandos(), local: true, simples: true };
}
async function abrirChat(o) {
  // o = { id, dir, modo: continuar|retomar|nova|livre|resume, nome, sessao, modelo, esf }
  if (!NUVEM.includes(o.modelo)) return abrirChatLocal(o);
  const claude = acharClaude(); if (!claude) return { erro: 'Não achei o Claude Code neste Windows.' };
  const S = await sdk();
  const cfg = cfgClaude(), env = cfg.env; gitNoPath(env);
  for (const k of Object.keys(env)) if (/^CLAUDE_CODE_(CHILD_SESSION|ENTRYPOINT|MESSAGING_|SESSION_|SSE_PORT)|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
  try { Object.assign(env, INV.envInstaladores()); } catch (e) { logApp('env instaladores: ' + e.message); }
  env.TERM_PROGRAM = 'FCC'; env.FCC_ABA = String(o.id); env.FCC_PID = String(process.pid);   // orq.py workers: which conversation hears them, and they die if this program dies
  // 02/11 (user request): helpers run inside the turn, nothing left in the background after the task; long commands may take up to 1 h, 10 min when none is given
  env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = '1'; env.BASH_MAX_TIMEOUT_MS = '3600000'; env.BASH_DEFAULT_TIMEOUT_MS = '600000';
  const local = !NUVEM.includes(o.modelo);
  if (local) { const e = await garantirOllama(); if (e) return { erro: `IA local: ${e}.` }; PENSAR.set(o.id, nivelP(o.pensar)); envLocal(env, o.modelo, await ponte(), o.id); MODELOS_CARREGADOS.add(o.modelo); marcarUso(o.modelo); }
  let sessao = o.sessao, historico = [];
  if (o.modo === 'retomar') {          // "-c": most recent conversation in this folder
    try { const L = await S.listSessions({ dir: o.dir }); const u = L.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))[0]; if (u) sessao = u.sessionId; } catch (e) { logApp('listSessions: ' + e.message); }
  }
  let retoma = o.modo === 'resume' || (o.modo === 'retomar' && sessao !== o.sessao), passou = null;
  const lerHist = async (s) => { try { return (await S.getSessionMessages(s, { dir: o.dir })).map(m => enxugar({ ...m, parent_tool_use_id: m.parent_tool_use_id })).filter(Boolean); } catch (e) { logApp('historico: ' + e.message); return []; } };
  if (retoma && !o.ate) historico = await lerHist(sessao);
  // 27/10 bug: tab moved to new conversation (passagem) and app closed before its 1st message → new id has no file yet.
  // Show previous conversation and open the new one with same id; 1st message carries the hint where to read.
  const ant = o.antes || (o.modo === 'resume' ? lerElos()[sessao] : null); let histAntes = [];
  if (o.modo === 'resume' && !o.ate && !historico.length && ant) {
    historico = await lerHist(ant);
    if (historico.length) { retoma = false; const par = path.join(o.dir, 'docs', 'PARADA.md'); passou = fs.existsSync(par) ? 'docs\\PARADA.md (already loaded if CLAUDE.md imports it)' : path.join('.claude', `passagem-${String(ant).slice(0, 8)}.md`); }
  } else if (o.modo === 'resume' && !o.ate && historico.length && ant) histAntes = await lerHist(ant);   // restored tab shows previous conversation too
  if (o.modo === 'resume' && !o.ate && !historico.length) return { semConversa: true };      // conversation no longer exists (or never got a message)
  const fila = filaDeEntrada();
  const c = { fila, perms: new Map(), local, sessao };
  // auto mode = same as user's terminal (classifier decides; only what it would ask becomes permission card)
  const opts = { cwd: o.dir, env, model: o.modelo, permissionMode: ['auto', 'default', 'plan'].includes(OP.perm) ? OP.perm : 'auto', pathToClaudeCodeExecutable: claude, includePartialMessages: true, settingSources: ['user', 'project', 'local'],
    systemPrompt: { type: 'preset', preset: 'claude_code', append: [regrasCasa('claude'), OP.codigo === '1' ? '' : SEM_CODIGO, INSTRUCAO(), BREVE, regraAjudante()].filter(Boolean).join('\n\n') },
    plugins: pluginCasa(),
    canUseTool: (tool, input, x) => new Promise((ok) => {
      const req = crypto.randomUUID(); c.perms.set(req, { ok, input, sug: x && x.suggestions });
      if (x && x.signal) x.signal.addEventListener('abort', () => { if (c.perms.delete(req)) { ok({ behavior: 'deny', message: 'cancelado' }); enviar('chat:perm-fim', o.id, req); } });
      enviar('chat:perm', o.id, { req, tool, input: cortar(input, tool === 'ExitPlanMode' ? 20000 : 600) });
    }),
    stderr: (d) => { if (/error/i.test(d)) logApp(`chat ${o.id}: ${String(d).slice(0, 300)}`); } };
  // extra tools (claude.ai connectors, MCP, app skills) off by default: fewer tokens on open (23/10, user request).
  // Toggles skill "ferramentas" via file <pasta>\.claude\ferramentas-ligadas; on change, conversation reopens by itself (vigiarFerramentas).
  c.ferr = ferramentasLigadas(o.dir); c.o = o; c.env = env; c.claude = claude;
  if (cfg.settings) opts.settings = cfg.settings;
  // measured 23/10 (intercepted request): 1st request 17,100 → 8,900 tokens
  if (!local && !c.ferr) { Object.assign(env, { ENABLE_CLAUDEAI_MCP_SERVERS: 'false', CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: '1' }); opts.strictMcpConfig = true;
    // 25/10 (user request): Agent allowed (heavy search in subagent = smaller main conversation)
    let base = {}; if (cfg.settings) { try { base = JSON.parse(fs.readFileSync(cfg.settings, 'utf8').replace(/^﻿/, '')) || {}; } catch (e) { logApp('perfil settings: ' + e.message); } }   // SDK takes path OR object: merge profile into the object
    opts.settings = { ...base, skillOverrides: { ...(base.skillOverrides || {}), ... Object.fromEntries(skillsDoApp().map(n => [n, 'off'])) } }; opts.disallowedTools = ['Workflow', 'ScheduleWakeup', 'ReportFindings', 'ListAgents', 'Monitor']; }
  if (!local) { opts.effort = o.esf; opts.thinking = { type: 'adaptive', display: 'summarized' }; opts.agentProgressSummaries = true; }   // 01/11: every subagent reports a one-line status (task_progress.summary)
  // auto mode (24/10, user request): Claude plans tasks and switches own model/thinking between them (trocar_modelo);
  // each switch becomes learning data (auto.js). Short instruction in server "instructions": only exists with auto on.
  if (!local && OP.auto === '1') {
    const { z } = require('zod');
    opts.mcpServers = { fcc: S.createSdkMcpServer({ name: 'fcc', version: '1',
      instructions: 'Token economy: split the request into tasks; per task pick the smallest model/thinking that gets it right; call trocar_modelo when a task needs another level. Default thinking low; medium/high only for the hard part, then back. Prefer changing only thinking: changing model re-reads the whole conversation (cache lost). ' + auto().dicas(),
      tools: [S.tool('trocar_modelo', 'Troca modelo/pensamento desta conversa antes da próxima tarefa', { modelo: z.enum(['haiku', 'sonnet', 'opus']), pensamento: z.enum(['low', 'medium', 'high']), tarefa: z.string() },
        async (a) => { const r = { modelo: a.modelo, esf: a.pensamento, aviso: `Automático: ${{ haiku: 'Haiku 5.5', sonnet: 'Sonnet 5.5', opus: 'Opus 5.5' }[a.modelo]} · pensamento ${{ low: 'Baixo', medium: 'Médio', high: 'Alto' }[a.pensamento]} (${String(a.tarefa).slice(0, 60)})` };
          c.auto = c.auto || {}; auto().trocaDoClaude(c, a.modelo, a.pensamento, a.tarefa); await aplicarAuto(c, o.id, r);
          return { content: [{ type: 'text', text: `ok: ${a.modelo}/${a.pensamento}` }] }; }, { alwaysLoad: true })] }) };
    opts.allowedTools = ['mcp__fcc__trocar_modelo'];
  }
  // local AI: "think" (qwen reasons first; much slower) or "fast reply" (no reasoning: 'oi' drops ~38 s to ~5 s in Ollama)
  else opts.thinking = o.pensar ? { type: 'enabled', budgetTokens: 8000, display: 'summarized' } : { type: 'disabled' };
  if (retoma) { opts.resume = sessao; if (o.ate) { opts.resumeSessionAt = o.ate; opts.forkSession = true; } }   // edited message: go back to that point in a conversation copy
  else { opts.sessionId = sessao; if (o.nome) opts.extraArgs = { name: o.nome + (local ? ' (local)' : '') }; }
  let q;
  try { q = S.query({ prompt: fila.iter, options: opts }); } catch (e) { logApp('chat: ' + e.message); return { erro: 'Não consegui abrir o Claude Code: ' + e.message }; }
  c.q = q; CHATS.set(o.id, c); c.modelo = o.modelo; c.esf = o.esf; abrirSessao(c, o);
  if (o.prefixo) { c.prefixo = o.prefixo; delete o.prefixo; }   // set before the tab can send anything
  if (passou) c.prefixo = `[New conversation: previous one got too big. State in ${passou}; read it and continue.]\n\n`;
  if (o.modo === 'livre') escreverBriefing(ultimaConta);
  registrar(`${o.modo === 'livre' ? 'CHAT LIVRE' : o.dir}${local ? ` (IA local ${o.modelo})` : ''}`);
  if (o.modo !== 'livre' && o.modo !== 'resume' && !o.passagem && OP.explorer === '1' && !QUIETO) shell.openPath(o.dir);
  (async () => {
    try { for await (const m of q) { c.msgT = Date.now(); try { registrarMud(c, m); } catch { } const x = enxugar(m); if (x) { if (x.type === 'system' && x.session_id) c.sessao = x.session_id; if (x.type === 'result') { anotarUso(c, x); fecharVigia(o.id); } enviar('chat:msg', o.id, x); if (x.type === 'result' && !local && !c.passando) vigiarFerramentas(c);
      if (x.type === 'stream_event' && x.event.type === 'message_start' && x.event.uso) { c.ctxAgora = x.event.uso.ent; if (c.ctx0 == null) c.ctx0 = c.ctxAgora; }
      if (x.type === 'result' && !local) { c.ultResp = x.texto; AJUDANTES.pararDaAba(o.id); PASSAGEM.ver(c); }   // turn over = no helper has a reason to live (leftover killed)
      if (x.type === 'assistant' && !local && x.content.some(b => b.type === 'tool_use' && !/^(AskUserQuestion|ExitPlanMode)$/.test(b.name))) PASSAGEM.ver(c, true);
      if (c.auto && OP.auto === '1') { if (x.type === 'assistant') for (const b of x.content) if (b.type === 'tool_use') aplicarAuto(c, o.id, auto().escalar(c)); if (x.type === 'result') auto().fim(c, x.uso); } } } if (!c.fechado) enviar('chat:fim', o.id, ''); }
    catch (e) { logApp(`chat ${o.id}: ${e.stack || e}`); if (!c.fechado) enviar('chat:fim', o.id, e.message || String(e)); }   // closed by app (edit, terminal): not marked "ended"
    finally { soltarPassagem(c); fecharSessao(c); fecharVigia(o.id); if (CHATS.get(o.id) === c) { CHATS.delete(o.id); if (local) liberarLocal(); } }
  })();
  let comandos = [];
  try { const ini = await Promise.race([q.initializationResult(), new Promise(r => setTimeout(() => r(null), 30000))]); if (ini && ini.commands) comandos = ini.commands.map(x => ({ n: x.name, d: x.description || '' })); } catch (e) { logApp('init: ' + e.message); }
  // opening sends nothing: reads only what CLAUDE.md loads when USER sends (Continue text stays in box; 23/10)
  if (o.aviso) fila.por(o.aviso);
  return { ok: true, sessao, historico, histAntes, antes: ant || null, comandos, local, passou: !!passou };
}
const FERR = (dir) => path.join(dir, '.claude', 'ferramentas-ligadas');
function ferramentasLigadas(dir) { try { return fs.existsSync(FERR(dir)); } catch { return false; } }
function skillsDoApp() {             // account-synced skills (anthropic-skills:*, account plugins): hidden without skill ferramentas
  const h = C.perfilClaude(), n = new Set();
  const varrer = (d, pre) => { try { for (const x of fs.readdirSync(d, { withFileTypes: true })) if (x.isDirectory()) { const p = path.join(d, x.name); if (fs.existsSync(path.join(p, 'SKILL.md'))) n.add(pre + x.name); else varrer(p, pre); } } catch { } };
  try { for (const g of fs.readdirSync(path.join(h, 'skills', 'synced'))) varrer(path.join(h, 'skills', 'synced', g), 'anthropic-skills:'); } catch { }
  try { for (const g of fs.readdirSync(path.join(h, 'plugins', 'synced'))) { const d = path.join(h, 'plugins', 'synced', g); try { for (const p of fs.readdirSync(d, { withFileTypes: true })) if (p.isDirectory()) varrer(path.join(d, p.name), p.name + ':'); } catch { } } } catch { }
  return [...n];
}
// casa (bundle for those without user's skills) and perfil\claude\skills have pairs doing the same (25/10, user request: shorter list).
// skillOverrides doesn't hide plugin skills (tested 25/10): with pairs present, plugin goes via %TEMP% folder with
// plugin.json + shortcuts (junction) only for unpaired skills. No pairs = casa folder directly.
const CASA_PAR = { caveman: 'caveman', ultracave: 'ultracave', 'projeto-novo': 'projeto-novo', preparar: 'preparar-ferramentas', economizar: 'fazer-mais-rapido', aprender: 'auto-aprendizado' };
let PLUGIN_CASA = null;
function pluginCasa() {
  if (PLUGIN_CASA) return PLUGIN_CASA;
  if (!fs.existsSync(path.join(CASA, '.claude-plugin'))) return (PLUGIN_CASA = []);
  const tem = (d) => fs.existsSync(path.join(C.perfilClaude(), 'skills', d, 'SKILL.md'));
  let todas = []; try { todas = fs.readdirSync(path.join(CASA, 'skills')).filter(n => fs.existsSync(path.join(CASA, 'skills', n, 'SKILL.md'))); } catch { }
  const ficam = todas.filter(n => !(CASA_PAR[n] && tem(CASA_PAR[n])));
  if (ficam.length === todas.length) return (PLUGIN_CASA = [{ type: 'local', path: CASA }]);
  try {
    // NEVER recursive rmSync here: in Electron's Node it follows junction and deletes the ORIGINAL (tested 25/10). Remove link with unlink.
    const d = C.temp('casa-plugin'), sk = path.join(d, 'skills');
    fs.mkdirSync(path.join(d, '.claude-plugin'), { recursive: true }); fs.mkdirSync(sk, { recursive: true });
    for (const n of fs.readdirSync(sk)) { const l = path.join(sk, n); if (fs.lstatSync(l).isSymbolicLink()) fs.unlinkSync(l); }
    fs.copyFileSync(path.join(CASA, '.claude-plugin', 'plugin.json'), path.join(d, '.claude-plugin', 'plugin.json'));
    for (const n of ficam) fs.symlinkSync(path.join(CASA, 'skills', n), path.join(d, 'skills', n), 'junction');
    return (PLUGIN_CASA = [{ type: 'local', path: d }]);
  } catch (e) { logApp('pluginCasa: ' + e.message); return (PLUGIN_CASA = [{ type: 'local', path: CASA }]); }
}
// end of reply: skill "ferramentas" created/deleted the file → reopen same conversation with/without tools
async function vigiarFerramentas(c) {
  const quer = ferramentasLigadas(c.o.dir); if (quer === c.ferr || c.fechado || c.perms.size) return;
  const id = c.o.id; registrar(`FERRAMENTAS ${quer ? 'ligadas' : 'desligadas'}: ${c.o.dir}`);
  fecharChat(id);
  const r = await abrirChat({ ...c.o, modo: 'resume', sessao: c.sessao, ate: null, aviso: quer ? 'Ferramentas ligadas. Continue a tarefa.' : null });
  enviar('chat:ferramentas', id, { ligadas: quer, erro: r && (r.erro || (r.semConversa && 'conversa não encontrada')) });
}
// big conversation: passagem.js decides, here is the wiring
const PASSAGEM = require('./passagem.js')({ limite: () => parseInt(OP.passagem, 10), aberta: (c) => !c.fechado && CHATS.get(c.o.id) === c, trocar: (c) => trocarConversa(c).catch((e) => { logApp('passagem: ' + e.message); enviar('chat:passagem', c.o.id, { fase: 2, mil: 0, erro: e.message, pend: 0 }); }),
  aviso: (c, mil) => { registrar(`PASSAGEM ${c.o.dir}: ${mil} mil tokens`); enviar('chat:passagem', c.o.id, { fase: 1, mil }); } });
async function trocarConversa(c) {
  const id = c.o.id, nova = crypto.randomUUID(), rel = path.relative(c.o.dir, c.arqPassagem), mil = Math.round(c.ctxAgora / 1000), pend = c.pendentes || [];
  AJUDANTES.pararDaAba(id); fecharChat(id);
  const prefixo = `[New conversation: previous one hit ${mil}k tokens. State in ${rel}${/PARADA\.md$/.test(rel) ? ' (already loaded if CLAUDE.md imports it)' : ''}; read it and continue.]\n\n`;
  const r = await abrirChat({ ...c.o, modo: c.o.modo === 'livre' ? 'livre' : 'nova', sessao: nova, ate: null, aviso: null, modelo: c.modelo, esf: c.esf, passagem: true, prefixo });
  const n = CHATS.get(id);
  if (n && !r.erro) gravarElo(nova, c.sessao);
  if (n && c.auto) n.auto = { ...c.auto, ctx: 0 };
  const segue = n && !pend.length && c.continuar;   // work left and nobody needs to type: new conversation resumes alone
  enviar('chat:passagem', id, { fase: 2, mil, sessao: nova, erro: r && (r.erro || null), pend: n ? pend.length + (segue ? 1 : 0) : 0 });
  if (n) for (const t of pend) enviarAoChat(n, id, t);
  if (segue) enviarAoChat(n, id, 'Continue the task now; do not stop until it is done or you need the user.');
}
function enviarAoChat(c, id, txt) { if (c.prefixo) { txt = c.prefixo + txt; c.prefixo = null; } c.fila.por(txt); }
function respostaPerm(id, req, r) {
  const c = CHATS.get(id); const p = c && c.perms.get(req); if (!p) return;
  c.perms.delete(req);
  if (r.acao === 'negar') p.ok({ behavior: 'deny', message: r.msg || 'O usuário negou.', interrupt: !!r.parar });
  else p.ok({ behavior: 'allow', updatedInput: r.input ? { ...p.input, ...r.input } : p.input, ...(r.acao === 'sempre' && p.sug ? { updatedPermissions: p.sug } : {}) });
}
// orq.py workers: live status for the conversation that launched them
const AJUDANTES = require('./ajudantes.js')(path.join(CASA, 'orquestra', 'vivo'), enviar, logApp);
if (!QUIETO) setInterval(() => { if (CHATS.size) AJUDANTES.passo(); }, 1500);
// conversation died while noting (edit, reopen, crash): no phase 2 will come; without this the tab would hide everything from then on
function soltarPassagem(c) { if (c.passando !== 1) return; c.passando = 0; clearTimeout(c.passTimer); enviar('chat:passagem', c.o.id, { fase: 0 }); }
function fecharChat(id) {
  const c = CHATS.get(id); if (!c) return; c.fechado = true; soltarPassagem(c); for (const [req] of c.perms) respostaPerm(id, req, { acao: 'negar', msg: 'aba fechada' }); c.fila.fechar(); try { c.q.close(); } catch { } CHATS.delete(id); fecharSessao(c);
  if (c.local) liberarLocal();
}
// local AI: no tab using it → model unloads and server started by app is stopped (no idle consumption)
function liberarLocal(tudo) {
  const usando = [...CHATS.values()].some(c => c.local) || [...PTYS_LOCAIS].some(id => PTYS.has(id)) || USO_MOD || PULLS.size > 0;
  if (usando && !tudo) return;
  if (!tudo && OP.fimLocal === 'manter') return;            // option: model stays loaded after last local conversation
  if (tudo) for (const ac of PULLS.values()) ac.abort();
  for (const m of MODELOS_CARREGADOS) fetch(OLLAMA_URL + '/api/generate', { method: 'POST', body: JSON.stringify({ model: m, keep_alive: 0 }), signal: AbortSignal.timeout(5000) }).catch(() => { });
  MODELOS_CARREGADOS.clear();
  // stop now (no wait): reopening window right after caught server mid-shutdown
  if (OLLAMA_NOSSO) { const pid = OLLAMA_NOSSO; OLLAMA_NOSSO = null; MATANDO = new Promise(ok => cp.execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => { registrar('IA LOCAL: servidor do Ollama encerrado (nenhuma aba usando)'); MATANDO = null; ok(); })); }
}
// ---- local AI models screen (proposal A "Janela", docs\prototipos\modelos\ESCOLHIDA) ----
let USO_MOD = false;                         // models window open: Ollama server stays on
const PULLS = new Map();                     // model → download AbortController
// model store (proposal B "Vitrine", 23/10): families with variants (tags checked in Ollama registry on 23/10/2026).
// cod 1-5 = coding fit (store puts these first; Claude helper picks best installed) · tipo: pop (popular) | livre (unfiltered) · caps: f = tools (Claude Code edits files), v = images, p = thinks · qual 1–5
const CATALOGO = [
  { id: 'qwen3.5', cod: 3, nome: 'Qwen3.5', de: 'Alibaba', tipo: 'pop', caps: 'fp', ctx: 256, hot: 1, lic: 'Apache-2.0', desc: 'Geração nova do Qwen: mais esperto que o Qwen3 no mesmo tamanho; ferramentas e pensar.', v: [['4b', 3], ['9b', 4, 1]] },
  { id: 'qwen3.8', nome: 'Qwen3.8', de: 'Alibaba', tipo: 'pop', caps: 'fp', ctx: 256, hot: 1, lic: 'Apache-2.0', desc: 'O Qwen mais recente e capaz; grande para placa de 8 GB (roda em parte na memória).', v: [['27b', 5]] },
  { id: 'qwen3.6', cod: 3, nome: 'Qwen3.6 MoE', de: 'Alibaba', tipo: 'pop', caps: 'fp', ctx: 256, lic: 'Apache-2.0', desc: 'Grande, mas só usa 3B por vez: mais rápido do que o tamanho sugere.', v: [['35b-a3b', 5]], ativo: 0.09 },
  { id: 'gemma4', nome: 'Gemma 4', de: 'Google', tipo: 'pop', caps: 'v', ctx: 128, hot: 1, lic: 'Gemma', desc: 'Nova geração do Gemma: bom em português, lê imagens.', v: [['e4b', 3], ['12b', 4, 1], ['26b-a4b', 5, 0, 0.15]] },
  { id: 'granite4.2', nome: 'Granite 4.2', de: 'IBM', tipo: 'pop', caps: 'f', ctx: 128, lic: 'Apache-2.0', desc: 'Leve e bom com ferramentas.', v: [['3b', 3]] },
  { id: 'qwen3', cod: 2, nome: 'Qwen3', de: 'Alibaba', tipo: 'pop', caps: 'fp', ctx: 40, hot: 1, lic: 'Apache-2.0', desc: 'O melhor para programar no seu PC: segue instruções, usa ferramentas e pensa quando pedido.', v: [['4b', 3], ['8b', 4, 1], ['14b', 4], ['32b', 5]] },
  { id: 'qwen3-coder', cod: 5, nome: 'Qwen3 Coder', de: 'Alibaba', tipo: 'pop', caps: 'f', ctx: 256, hot: 1, lic: 'Apache-2.0', desc: 'Feito para código e agentes. Grande, mas só usa 3B por vez: mais rápido do que o tamanho sugere.', v: [['30b', 5]], ativo: 0.1 },
  { id: 'gemma3', nome: 'Gemma 3', de: 'Google', tipo: 'pop', caps: 'v', ctx: 128, lic: 'Gemma', desc: 'Conversa natural, bom em português e lê imagens. Não usa ferramentas: não mexe em arquivos.', v: [['4b', 3], ['12b', 4], ['27b', 5]] },
  { id: 'llama3.2', nome: 'Llama 3.2', de: 'Meta', tipo: 'pop', caps: 'f', ctx: 128, lic: 'Llama 3.2', desc: 'Pequeno e rápido: bom para resumir e responder coisa simples.', v: [['1b', 2], ['3b', 3]] },
  { id: 'gpt-oss', cod: 3, nome: 'gpt-oss', de: 'OpenAI', tipo: 'pop', caps: 'fp', ctx: 128, hot: 1, lic: 'Apache-2.0', desc: 'Raciocínio forte com ferramentas, aberto da OpenAI. Sempre pensa: escolha baixo, médio ou alto.', v: [['20b', 4, 0, 0.18]], niveis: 1 },
  { id: 'deepseek-r1', nome: 'DeepSeek R1', de: 'DeepSeek', tipo: 'pop', caps: 'p', ctx: 128, lic: 'MIT', desc: 'Pensa bastante antes de responder: matemática e lógica.', v: [['7b', 3], ['8b', 3], ['14b', 4]] },
  { id: 'qwen2.5-coder', cod: 4, nome: 'Qwen2.5 Coder', de: 'Alibaba', tipo: 'pop', caps: 'f', ctx: 32, lic: 'Apache-2.0', desc: 'Especialista em código: completa, corrige e explica.', v: [['7b', 4, 1], ['14b', 4]] },
  { id: 'qwen3-vl', nome: 'Qwen3 VL', de: 'Alibaba', tipo: 'pop', caps: 'fvp', ctx: 256, lic: 'Apache-2.0', desc: 'Qwen3 que lê imagens e telas, com ferramentas.', v: [['8b', 4]] },
  { id: 'llama3.1', nome: 'Llama 3.1', de: 'Meta', tipo: 'pop', caps: 'f', ctx: 128, lic: 'Llama 3.1', desc: 'Conversa estável e bom com ferramentas.', v: [['8b', 3]] },
  { id: 'mistral-nemo', nome: 'Mistral Nemo', de: 'Mistral + NVIDIA', tipo: 'pop', caps: 'f', ctx: 128, lic: 'Apache-2.0', desc: 'Bom em textos longos e em várias línguas.', v: [['12b', 4]] },
  { id: 'phi4-mini', nome: 'Phi-4 mini', de: 'Microsoft', tipo: 'pop', caps: 'f', ctx: 128, lic: 'MIT', desc: 'Pequeno e esperto em raciocínio e contas.', v: [['3.8b', 3]] },
  { id: 'devstral', cod: 3, nome: 'Devstral', de: 'Mistral', tipo: 'pop', caps: 'f', ctx: 128, lic: 'Apache-2.0', desc: 'Agente de programação: mexe em vários arquivos. Grande para 8 GB.', v: [['24b', 5]] },
  { id: 'qwen2.5vl', nome: 'Qwen2.5 VL', de: 'Alibaba', tipo: 'pop', caps: 'v', ctx: 125, lic: 'Apache-2.0', desc: 'Lê imagens, capturas de tela e documentos escaneados.', v: [['7b', 4]] },
  { id: 'mistral-small3.2', nome: 'Mistral Small 3.2', de: 'Mistral', tipo: 'pop', caps: 'fv', ctx: 128, lic: 'Apache-2.0', desc: 'Equilibrado, usa ferramentas e lê imagens; grande para placa de 8 GB.', v: [['24b', 5]] },
  { id: 'huihui_ai/qwen3-abliterated', cod: 2, nome: 'Qwen3 abliterado', de: 'huihui_ai', tipo: 'livre', caps: 'fp', ctx: 40, hot: 1, lic: 'Apache-2.0', desc: 'Qwen3 sem as recusas. Mantém ferramentas e o modo pensar.', v: [['4b', 3], ['8b', 4, 1], ['14b', 4]] },
  { id: 'dolphin3', nome: 'Dolphin 3', de: 'Cognitive Computations', tipo: 'livre', caps: 'f', ctx: 128, lic: 'Llama 3.1', desc: 'Clássico sem filtro em cima do Llama 3.1; usa ferramentas.', v: [['8b', 3]] },
  { id: 'huihui_ai/deepseek-r1-abliterated', nome: 'DeepSeek R1 abliterado', de: 'huihui_ai', tipo: 'livre', caps: 'p', ctx: 128, lic: 'MIT', desc: 'R1 sem recusas: pensa antes e não foge do assunto.', v: [['8b', 3]] },
  { id: 'huihui_ai/qwen2.5-coder-abliterate', cod: 3, nome: 'Qwen2.5 Coder abliterado', de: 'huihui_ai', tipo: 'livre', caps: 'f', ctx: 32, lic: 'Apache-2.0', desc: 'Programador sem recusas.', v: [['7b', 4]] },
  { id: 'huihui_ai/llama3.2-abliterate', cod: 1, nome: 'Llama 3.2 abliterado', de: 'huihui_ai', tipo: 'livre', caps: 'f', ctx: 128, lic: 'Llama 3.2', desc: 'Pequeno, rápido e sem recusas.', v: [['3b', 3]] },
  { id: 'hermes3', nome: 'Hermes 3', de: 'Nous Research', tipo: 'livre', caps: 'f', ctx: 128, lic: 'Llama 3', desc: 'Segue papéis e instruções sem sermão.', v: [['3b', 2], ['8b', 3]] },
].map(c => ({ ...c, v: c.v.map(([t, qual, rec, ativo]) => ({ t, tag: c.id + ':' + t, qual, rec: !!rec, gb: 0, ativo: ativo || c.ativo || 0 })) }));
const catDe = (tag) => { for (const c of [...CATALOGO, ...LIB]) { const v = c.v.find(x => x.tag === tag || x.tag + ':latest' === tag); if (v) return { c, v }; } return null; };
const USOS = C.dados('fcc-modelos.json');      // last use of each local model (Ollama doesn't store it)
function marcarUso(m) { if (QUIETO) return; try { const u = JSON.parse(fs.readFileSync(USOS, 'utf8')); u[m] = ddmm(new Date()); fs.writeFileSync(USOS, JSON.stringify(u, null, 1), 'utf8'); } catch { try { fs.writeFileSync(USOS, JSON.stringify({ [m]: ddmm(new Date()) }), 'utf8'); } catch { } } }
const GB = (b) => b / 1e9;
async function tamanhoOllama(nome) {             // sum of library manifest layers (no download)
  const [rep, tag] = nome.includes(':') ? nome.split(':') : [nome, 'latest'];
  try { const r = await fetch(`https://registry.ollama.ai/v2/${rep.includes('/') ? rep : 'library/' + rep}/manifests/${tag}`, { headers: { Accept: 'application/vnd.docker.distribution.manifest.v2+json' }, signal: AbortSignal.timeout(10000) }); if (!r.ok) return null; const j = await r.json(); return GB((j.layers || []).reduce((s, l) => s + (l.size || 0), 0)); } catch { return null; }
}
let PC_CACHE = null;
async function infoPC() {
  if (!PC_CACHE) {
    let placa = '', vram = 0;
    try {
      const out = await new Promise(ok => cp.execFile('powershell.exe', ['-NoProfile', '-Command', "Get-ItemProperty 'HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*' -ErrorAction SilentlyContinue | ForEach-Object { $_.DriverDesc + '|' + $_.'HardwareInformation.qwMemorySize' }"], { windowsHide: true, encoding: 'utf8', timeout: 15000 }, (e, o) => ok(o || '')));
      for (const l of out.split(/\r?\n/)) { const [n, m] = l.split('|'); const g = Math.round(GB(+m || 0) / 1.073741824); if (n && g > vram) { vram = g; placa = n.trim(); } }
    } catch { }
    PC_CACHE = { placa: placa || 'placa de vídeo', vram: vram || 0, ram: Math.round(os.totalmem() / 1073741824) };
  }
  let livre = 0; try { const s = fs.statfsSync(OP_MODELOS()); livre = Math.round(s.bavail * s.bsize / 1e9); } catch { }
  return { ...PC_CACHE, livre };
}
async function listarModelos() {
  const e = await garantirOllama(); if (e) return { erro: e, inst: [] };
  let usos = {}; try { usos = JSON.parse(fs.readFileSync(USOS, 'utf8')); } catch { }
  try {
    const j = await (await fetch(OLLAMA_URL + '/api/tags', { signal: AbortSignal.timeout(8000) })).json();
    return { inst: (j.models || []).map(m => { const c = catDe(m.name); const d = new Date(m.modified_at); return { id: m.name, n: c ? c.c.nome + ' ' + c.v.t : nomeAmigavel(m.name), gb: GB(m.size), quando: ddmm(d), uso: usos[m.name] ? (usos[m.name] === ddmm(new Date()) ? 'hoje' : usos[m.name]) : 'nunca' }; }) };
  } catch (err) { return { erro: err.message, inst: [] }; }
}
// hf.co/autor/Repo-GGUF:Q4_K_M → "Repo (Q4_K_M)"; modelscope.cn/autor/Repo-GGUF → "Repo"; nome:latest → nome
function nomeAmigavel(id) { const m = id.match(/^(?:hf\.co|huggingface\.co|modelscope\.cn)\/[^/]+\/([^:]+)(?::(.+))?$/i); if (m) return m[1].replace(/-GGUF$/i, '') + (m[2] && m[2] !== 'latest' ? ` (${m[2]})` : ''); return id.replace(/:latest$/, ''); }
const TAMS = new Map();                       // size of each tag (Ollama registry), cached while app is open
const LOJA_INFO = C.dados('fcc-loja.json');   // 1-day cache of what ollama.com shows
const ptNum = (s) => s.replace(/^([\d.]+)([KMB])$/i, (_, n, u) => n.replace('.', ',') + ({ k: ' mil', m: ' mi', b: ' bi' })[u.toLowerCase()]);
const ptQuando = (s) => { const m = String(s || '').match(/(\d+|an?) (year|month|week|day|hour|minute)s? ago/); if (!m) return s || ''; const n = /^an?$/.test(m[1]) ? 1 : +m[1]; const P = { year: ['ano', 'anos'], month: ['mês', 'meses'], week: ['semana', 'semanas'], day: ['dia', 'dias'], hour: ['hora', 'horas'], minute: ['minuto', 'minutos'] }[m[2]]; return `há ${n} ${n === 1 ? P[0] : P[1]}`; };
async function infoOllama(id) {
  const h = await (await fetch('https://ollama.com/' + (id.includes('/') ? id : 'library/' + id), { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) })).text();
  const r = { pulls: '', quando: '', caps: '', tags: {} };
  const p = h.match(/<span >([\d.]+[KMB]?)<\/span>\s*<span class="hidden sm:flex">&nbsp;Downloads/); if (p) r.pulls = ptNum(p[1]);
  const q = h.match(/Updated&nbsp;<\/span>\s*<span >([^<]+)</); if (q) r.quando = ptQuando(q[1].trim());
  const cs = new Set([...h.matchAll(/text-indigo-600[^>]*>(tools|thinking|vision)</g)].map(m => m[1])); r.caps = (cs.has('tools') ? 'f' : '') + (cs.has('vision') ? 'v' : '') + (cs.has('thinking') ? 'p' : '');
  for (const m of h.matchAll(/href="\/(?:library\/)?[^"]*?:([\w.-]+)" class="sm:hidden[\s\S]*?<p class="flex text-neutral-500">([^<]+)<\/p>/g)) {
    const [gb, ctx, ent] = m[2].split('·').map(s => s.trim()); const g = parseFloat(gb) * (/MB/.test(gb) ? .001 : 1);
    r.tags[m[1]] = { gb: g || 0, ctx: (ctx || '').replace(/ context window/, ''), ent: (ent || '').replace('Text', 'texto').replace('Image', 'imagem') };
  }
  return r;
}
async function catalogo() {
  let cache = {}; try { cache = JSON.parse(fs.readFileSync(LOJA_INFO, 'utf8')); } catch { }
  if (cache._tam && Date.now() - cache._tam.t < 864e5) for (const [k, v] of Object.entries(cache._tam.v)) if (!TAMS.has(k)) TAMS.set(k, v);
  await Promise.all(CATALOGO.map(async c => { let i = cache[c.id]; if (!i || Date.now() - i.t > 864e5) { try { i = { ...(await infoOllama(c.id)), t: Date.now() }; cache[c.id] = i; } catch (e) { logApp('loja info ' + c.id + ': ' + e.message); } }
    if (!i) return; c.baixados = i.pulls; c.atualizado = i.quando; if (i.caps) c.caps = i.caps; for (const v of c.v) { const t = i.tags[v.t]; if (t) { v.ctx = t.ctx; v.ent = t.ent; } } }));   // exact size comes from registry (catalogoTam)
  try { LIB = await biblioteca(cache); } catch (e) { logApp('loja biblioteca: ' + e.message); }
  const r = [...await catalogoTam(), ...LIB]; cache._tam = { t: (cache._tam && Date.now() - cache._tam.t < 864e5) ? cache._tam.t : Date.now(), v: Object.fromEntries(TAMS) };
  if (!QUIETO) try { fs.writeFileSync(LOJA_INFO, JSON.stringify(cache), 'utf8'); } catch { }
  return r;
}
// 28/10: whole Ollama library (ollama.com/library, ~260 models) after the curated list; size estimated from params (exact on download), 1-day cache
let LIB = [];
const qualDe = (b) => b < 3 ? 2 : b < 9 ? 3 : b < 20 ? 4 : 5;
async function biblioteca(cache) {
  if (cache._lib && Date.now() - cache._lib.t < 864e5) return cache._lib.v;
  const h = await (await fetch('https://ollama.com/library', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) })).text();
  const ja = new Set(CATALOGO.map(c => c.id)), L = [];
  for (const b of h.split('<a href="/library/').slice(1)) {
    const id = (b.match(/^([a-z0-9._-]+)"/) || [])[1]; if (!id || ja.has(id)) continue;
    const desc = ((b.match(/<p class="max-w-lg[^>]*>([^<]*)</) || [])[1] || '').trim().replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const cs = new Set([...b.matchAll(/text-indigo-600[^>]*>(tools|thinking|vision)</g)].map(m => m[1]));
    const tams = [...b.matchAll(/text-blue-600[^>]*>([^<]+)</g)].map(m => m[1].trim());
    const p = b.match(/<span >([\d.]+[KMB]?)<\/span>\s*<span class="hidden sm:flex">&nbsp;Pulls/), q = b.match(/title="([A-Z][a-z]{2} \d+, \d{4}[^"]*)"/);
    L.push({ id, nome: id, de: 'Ollama', tipo: 'mais', caps: (cs.has('tools') ? 'f' : '') + (cs.has('vision') ? 'v' : '') + (cs.has('thinking') ? 'p' : ''), desc, baixados: p ? ptNum(p[1]) : '', atualizado: q ? ptRel(q[1]) : '',
      v: (tams.length ? tams : ['latest']).map(t => { const mx = t.match(/(\d+)x([\d.]+)/), n = mx ? mx[1] * mx[2] : parseFloat((t.match(/[\d.]+/) || [0])[0]) * (/m$/i.test(t) ? .001 : 1); return { t, tag: id + ':' + t, qual: n ? qualDe(n) : 3, rec: false, gb: n ? +(n * 0.62 + 0.3).toFixed(1) : 0, ativo: 0 }; }) });
  }
  cache._lib = { t: Date.now(), v: L }; return L;
}
async function catalogoTam() { await Promise.all(CATALOGO.flatMap(c => c.v.map(async v => { if (!TAMS.has(v.tag)) { const g = await tamanhoOllama(v.tag); if (g) TAMS.set(v.tag, g); } v.gb = TAMS.get(v.tag) || 0; }))); return CATALOGO; }
async function baixarModelo(id) {
  if (PULLS.has(id)) return;
  const e = await garantirOllama(); if (e) return enviar('mod:fim', id, { ok: false, erro: e });
  const ac = new AbortController(); PULLS.set(id, ac);
  const camadas = new Map(); let ultEnvio = 0, base = { b: 0, t: Date.now() }, velo = 0, ok = false, erro = '';
  try {
    const r = await fetch(OLLAMA_URL + '/api/pull', { method: 'POST', body: JSON.stringify({ model: id, stream: true }), signal: ac.signal });
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!l) continue;
        const j = JSON.parse(l);
        if (j.error) throw new Error(j.error);
        if (j.digest && j.total) camadas.set(j.digest, { t: j.total, c: j.completed || 0 });
        if (j.status === 'success') ok = true;
        const tot = [...camadas.values()].reduce((s, x) => s + x.t, 0), feito = [...camadas.values()].reduce((s, x) => s + x.c, 0), agora = Date.now();
        if (agora - base.t >= 1000) { velo = Math.round((feito - base.b) / 1048576 / ((agora - base.t) / 1000)); base = { b: feito, t: agora }; }
        if (tot && agora - ultEnvio > 250) { ultEnvio = agora; enviar('mod:progresso', id, { pct: Math.floor(feito * 100 / tot), feito: GB(feito), gb: GB(tot), velo: Math.max(0, velo) }); }
      }
    }
  } catch (err) { erro = ac.signal.aborted ? 'cancelado' : err.message; }
  PULLS.delete(id);
  if (ok) registrar(`MODELO baixado: ${id}`);
  enviar('mod:fim', id, { ok, erro });
  liberarLocal();
}
async function apagarModelo(id) {
  // unload first (model loaded in a conversation), then delete; with timeout so it never waits forever
  try { await fetch(OLLAMA_URL + '/api/generate', { method: 'POST', body: JSON.stringify({ model: id, keep_alive: 0 }), signal: AbortSignal.timeout(15000) }); } catch { }
  MODELOS_CARREGADOS.delete(id);
  try { const r = await fetch(OLLAMA_URL + '/api/delete', { method: 'DELETE', body: JSON.stringify({ model: id }), signal: AbortSignal.timeout(60000) }); if (r.ok) registrar(`MODELO apagado: ${id}`); return r.ok; } catch (e) { logApp('apagar: ' + e.message); return false; }
}
const milhar = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n);
// store sources (23/10, user request "more sources"): official Ollama, Ollama community, Hugging Face (general + curators who
// convert to GGUF: Unsloth, Bartowski, LM Studio Community, mradermacher), ModelScope. Each result has what
// Locally Uncensored shows: downloads, likes, updated, features, context, quantization, size.
const FONTES = ['ollama', 'comunidade', 'hf', 'unsloth', 'bartowski', 'lmstudio-community', 'mradermacher', 'ms'];
const ptRel = (d) => { const s = (Date.now() - new Date(d)) / 1000; if (!(s > 0)) return ''; const U = [[31536000, 'ano', 'anos'], [2592000, 'mês', 'meses'], [604800, 'semana', 'semanas'], [86400, 'dia', 'dias'], [3600, 'hora', 'horas']]; for (const [t, a, b] of U) if (s >= t) { const n = Math.floor(s / t); return `há ${n} ${n === 1 ? a : b}`; } return 'agora'; };
async function buscarModelos(texto, fontes) {
  const q = encodeURIComponent(texto.trim()); if (!q) return [];
  const F = Array.isArray(fontes) && fontes.length ? fontes : fontes && FONTES.includes(fontes) ? [fontes] : FONTES;
  const T = (u, o = {}) => fetch(u, { ...o, headers: { 'User-Agent': 'Mozilla/5.0', ...(o.headers || {}) }, signal: AbortSignal.timeout(15000) });
  const tarefas = [];
  // Ollama: site search lists official library (/library/x) and community (/owner/x); each page gives downloads etc.
  if (F.includes('ollama') || F.includes('comunidade')) tarefas.push((async () => {
    const h = await (await T('https://ollama.com/search?q=' + q)).text();
    const of = F.includes('ollama') ? [...new Set([...h.matchAll(/href="\/library\/([a-z0-9._-]+)"/g)].map(m => m[1]))].slice(0, 4) : [];
    const co = F.includes('comunidade') ? [...new Set([...h.matchAll(/href="\/(?!library\/|public\/|blog\/|docs\/)([a-z0-9_-]+\/[a-z0-9._-]+)"/g)].map(m => m[1]).filter(n => !/\.(png|svg|ico|js|css|json)$/.test(n)))].slice(0, 4) : [];
    return Promise.all([...of.map(n => [n, 'ollama']), ...co.map(n => [n, 'comunidade'])].map(async ([n, f]) => {
      let i = {}; try { i = await infoOllama(n); } catch { } const t = i.tags && (i.tags.latest || Object.values(i.tags)[0]);
      return { id: n, n, de: f === 'ollama' ? 'Ollama oficial' : `${n.split('/')[0]} · Ollama comunidade`, gb: (t && t.gb) || await tamanhoOllama(n), fonte: f,
        baixados: i.pulls ? i.pulls + ' downloads' : '', quando: i.quando || '', caps: i.caps || '', ctx: t ? t.ctx : '', ent: t ? t.ent : '', q: 'Q4_K_M' };
    }));
  })());
  // Hugging Face: general (5) + each curator (3), GGUF repos only; size and quant from Q4_K_M file (or 1st)
  const hf = (autor, lim) => (async () => {
    const L = await (await T(`https://huggingface.co/api/models?search=${q}&filter=gguf&sort=downloads&direction=-1&limit=${lim}${autor ? '&author=' + autor : ''}`)).json();
    return Promise.all(L.map(async m => {
      let quant = 'Q4_K_M', gb = null, quando = '', likes = m.likes || 0;
      try { const d = await (await T(`https://huggingface.co/api/models/${m.id}?blobs=true`)).json(); quando = ptRel(d.lastModified); likes = d.likes || likes;
        const fs2 = (d.siblings || []).filter(s => /\.gguf$/i.test(s.rfilename) && !/mmproj/i.test(s.rfilename)); const f = fs2.find(s => /Q4_K_M/i.test(s.rfilename)) || fs2[0];
        if (f) { gb = f.size ? GB(f.size) : null; const mq = f.rfilename.match(/(I?Q\d[\w]*|F16|BF16)/i); if (mq) quant = mq[1].toUpperCase(); }
        var visao = (d.siblings || []).some(s => /mmproj/i.test(s.rfilename)); } catch { }
      return { id: `hf.co/${m.id}:${quant}`, n: `${m.id.split('/')[1]} (${quant})`, de: `${m.id.split('/')[0]} · Hugging Face`, gb, q: quant, fonte: autor || 'hf',
        baixados: `${milhar(m.downloads || 0)} downloads`, curtidas: likes, quando, caps: visao ? 'v' : '' };
    }));
  })();
  if (F.includes('hf')) tarefas.push(hf('', 5));
  for (const a of ['unsloth', 'bartowski', 'lmstudio-community', 'mradermacher']) if (F.includes(a)) tarefas.push(hf(a, 3));
  if (F.includes('ms')) tarefas.push((async () => {
    const r = await (await T('https://www.modelscope.cn/api/v1/dolphin/models', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ PageSize: 4, PageNumber: 1, SortBy: 'Default', Target: '', SingleCriterion: [], Name: decodeURIComponent(q) + ' gguf' }) })).json();
    const L = ((r.Data || {}).Model || {}).Models || [];
    return L.filter(m => /gguf/i.test(m.Name)).map(m => ({ id: `modelscope.cn/${m.Path}/${m.Name}`, n: m.Name, de: `${m.Path} · ModelScope`, gb: null, fonte: 'ms', baixados: `${milhar(m.Downloads || 0)} downloads`, quando: m.LastUpdatedTime ? ptRel(m.LastUpdatedTime * 1000) : '' }));
  })());
  const res = await Promise.allSettled(tarefas), vistos = new Set();
  return res.flatMap(x => x.status === 'fulfilled' ? x.value : []).filter(x => !vistos.has(x.id) && vistos.add(x.id));
}
let ACH = null;
async function acharGGUFcache() { if (!ACH || Date.now() - ACH.t > 300000) ACH = { t: Date.now(), p: acharGGUF() }; return ACH.p; }
async function acharGGUF() {                   // models from other apps (LM Studio, GPT4All, Jan, Msty…), without freezing app
  const h = os.homedir(), L = process.env.LOCALAPPDATA || '', R = process.env.APPDATA || '';   // fora: leitura
  const lugares = [['LM Studio', path.join(h, '.lmstudio', 'models')], ['LM Studio', path.join(h, '.cache', 'lm-studio', 'models')], ['GPT4All', path.join(L, 'nomic.ai', 'GPT4All')], ['Jan', path.join(R, 'Jan', 'data', 'models')], ['Jan', path.join(h, 'jan', 'models')], ['Msty', path.join(R, 'Msty', 'models')], ['Downloads', path.join(h, 'Downloads')]];
  const achados = []; let vistos = 0;
  const andar = async (d, de, nivel) => {
    if (nivel > 4 || vistos > 5000 || achados.length >= 20) return; let es = []; try { es = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) { vistos++; const p = path.join(d, e.name);
      if (e.isDirectory()) await andar(p, de, nivel + 1);
      else if (/\.gguf$/i.test(e.name) && !/mmproj/i.test(e.name)) { try { achados.push({ n: e.name, de, gb: GB((await fs.promises.stat(p)).size), caminho: p }); } catch { } } }
  };
  for (const [de, d] of lugares) await andar(d, de, de === 'Downloads' ? 3 : 0);
  return achados.slice(0, 20);
}function importarGGUF(caminho, nome) {
  return new Promise((ok) => {
    const exe = acharOllama(); if (!exe) return ok({ erro: 'o Ollama não está instalado' });
    const mf = C.temp('modelfile-' + Date.now()); fs.writeFileSync(mf, `FROM "${caminho}"\n`, 'utf8');
    const env = { ...process.env, OLLAMA_MODELS: OP_MODELOS() };
    const p = cp.spawn(exe, ['create', nome, '-f', mf], { env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => err += d);
    p.on('close', (c) => { try { fs.unlinkSync(mf); } catch { } if (c === 0) registrar(`MODELO adicionado: ${nome}`); ok(c === 0 ? { ok: true } : { erro: (err.split(/\r?\n/).filter(Boolean).pop() || 'falhou').slice(0, 200) }); });
  });
}

// panel shortcuts: project .exe (dist\) and reports folder
function acharExe(dir) {
  const d = path.join(dir, 'dist'); const ok = (f) => /\.exe$/i.test(f) && !/^unins/i.test(path.basename(f));
  try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && ok(p)) return p; if (e.isDirectory()) { const x = fs.readdirSync(p).map(f => path.join(p, f)).find(f => ok(f) && path.basename(f, '.exe').toLowerCase() === e.name.toLowerCase()) || fs.readdirSync(p).map(f => path.join(p, f)).find(ok); if (x) return x; } } } catch { }
  return null;
}
function acharRelatorios(dir) {
  const c = [path.join(dir, 'relatorios')]; try { for (const e of fs.readdirSync(path.join(dir, 'dist'), { withFileTypes: true })) if (e.isDirectory()) c.push(path.join(dir, 'dist', e.name, 'relatorios')); } catch { }
  return c.find(x => fs.existsSync(x)) || null;
}

// ---- usage stats (proposal A, docs\prototipos\estatisticas\ESCOLHIDA): one session per tab (open → close);
// each reply stores input tokens (with cache), output and time. Test writes to temp file. ----
const ESTAT = QUIETO ? C.temp('fcc-estatisticas-teste.json') : C.dados('fcc-estatisticas.json');
let EST = null, estTimer = null;
function estLer() {
  if (EST) return EST;
  try { EST = JSON.parse(fs.readFileSync(ESTAT, 'utf8')); } catch { EST = { sessoes: [] }; }
  for (const s of EST.sessoes) if (!s.fim) s.fim = s.turnos.length ? s.ini + (s.turnos[s.turnos.length - 1].min * 60000 + s.turnos[s.turnos.length - 1].ms) : s.ini;   // crashed without closing
  return EST;
}
function estSalvar(agora) {
  clearTimeout(estTimer);
  const gravar = () => { try { const E = estLer(); const lim = Date.now() - 400 * 864e5; E.sessoes = E.sessoes.filter(s => s.ini > lim).slice(-2000); fs.writeFileSync(ESTAT, JSON.stringify(E), 'utf8'); } catch (e) { logApp('estatísticas: ' + e.message); } };
  if (agora) gravar(); else estTimer = setTimeout(gravar, 1500);
}
function abrirSessao(c, o) {
  const proj = o.modo === 'livre' || /chat-livre$/i.test(o.dir) ? 'Chat livre' : path.basename(o.dir);
  c.est = { id: o.id + '-' + Date.now(), proj, dir: o.dir, mod: o.modelo, ini: Date.now(), fim: null, turnos: [] };
  estLer().sessoes.push(c.est); estSalvar();
}
function anotarUso(c, x) {
  if (!c.est || !x.uso || (!x.uso.ent && !x.uso.sai)) return;
  const ms = x.ms || 0, min = Math.max(0, (Date.now() - ms - c.est.ini) / 60000);
  c.est.turnos.push({ min: Math.round(min * 100) / 100, ent: x.uso.ent, cache: x.uso.cache, sai: x.uso.sai, ms, mod: c.modelo });
  c.est.mod = c.modelo; estSalvar();
}
function fecharSessao(c) {                     // tab closed with no reply doesn't become session
  if (!c.est || c.est.fim) return; c.est.fim = Date.now();
  if (!c.est.turnos.length) { const E = estLer(); E.sessoes = E.sessoes.filter(s => s !== c.est); }
  estSalvar(true);
}
ipcMain.handle('es-dados', () => ({ agora: Date.now(), sessoes: estLer().sessoes }));

// ---- setup (user request, 20/oct/2026): checks what Claude Code needs on Windows and installs what's missing ----
const PREP_DIR = C.temp('preparar');
const PREP_LOG = path.join(RELS, 'preparar.txt');
const BAIXAR = "function Baixar($u, $n) { $f = Join-Path $DIR $n; Invoke-WebRequest $u -OutFile $f -UseBasicParsing; return $f }\n";
const ETAPAS = [
  { id: 'vc', nome: 'Visual C++ (peça do Windows)', admin: true,
    checa: () => { try { return /Installed\s+REG_DWORD\s+0x1/.test(cp.execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /v Installed', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true })); } catch { return false; } },
    codigo: BAIXAR + "$f = Baixar 'https://aka.ms/vs/17/release/vc_redist.x64.exe' 'vc_redist.x64.exe'\n$p = Start-Process $f -ArgumentList '/install /quiet /norestart' -Wait -PassThru\nif (@(0, 1638, 3010) -notcontains $p.ExitCode) { throw \"o instalador do Visual C++ devolveu $($p.ExitCode)\" }" },
  { id: 'claude', nome: 'Claude Code', checa: () => !!acharClaude(),
    codigo: "& { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression } *>> (Join-Path $DIR 'claude-instalador.txt')\nif (-not (Test-Path (Join-Path $env:USERPROFILE '.local\\bin\\claude.exe'))) { throw 'o instalador terminou, mas o claude.exe não apareceu' }" },
];
// 27/10: winget step removed (failed on friend's PC; nothing needs it). Ollama: official installer (Inno, per-user, no admin).
// WaitForExit, not -Wait: -Wait also waits for the Ollama tray app the installer leaves running
const ETAPA_OLLAMA = { id: 'ollama', nome: 'Ollama (IA local)', checa: () => !!acharOllama(),
  codigo: BAIXAR + "$f = Baixar 'https://ollama.com/download/OllamaSetup.exe' 'OllamaSetup.exe'\n$p = Start-Process $f -ArgumentList '/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES' -PassThru\n$p.WaitForExit()\nif ($p.ExitCode -ne 0) { throw \"o instalador do Ollama devolveu $($p.ExitCode)\" }" };
function rodarEtapa(e) {
  return new Promise((ok) => {
    fs.mkdirSync(PREP_DIR, { recursive: true });
    const res = path.join(PREP_DIR, e.id + '.res'); try { fs.unlinkSync(res); } catch { }
    const ps1 = path.join(PREP_DIR, e.id + '.ps1');
    const txt = `$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'\r\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12\r\n$DIR = '${PREP_DIR}'; $RES = '${res}'\r\ntry {\r\n${e.codigo}\r\n'ok' | Set-Content -LiteralPath $RES -Encoding UTF8\r\n} catch { ('erro ' + $_.Exception.Message) | Set-Content -LiteralPath $RES -Encoding UTF8 }`;
    fs.writeFileSync(ps1, '\uFEFF' + txt, 'utf8');
    const cmd = e.admin ? ['-NoProfile', '-Command', `Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${ps1}"'`] : ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1];
    cp.execFile('powershell.exe', cmd, { windowsHide: true }, () => { let m = ''; try { m = fs.readFileSync(res, 'utf8').replace(/^\uFEFF/, '').trim(); } catch { m = 'erro o instalador fechou sem dar resposta'; } ok(m); });
  });
}
let ultimaConta = { estado: 'conf' };
async function preparar() {
  const et = [...ETAPAS.map(e => ({ id: e.id, nome: e.nome, st: 'espera', txt: 'esperando' })), { id: 'memoria', nome: 'Regras e skills', st: 'espera', txt: 'esperando' },
    { id: 'ollama', nome: 'Ollama (IA local)', st: 'espera', txt: 'esperando' }, { id: 'conta', nome: 'Conta', st: 'espera', txt: 'esperando' }];
  const plog = [`${new Date().toLocaleString('pt-BR')} | preparar (abas)`], t0 = Date.now(), marca = (o) => plog.push(`  (${o}: ${Date.now() - t0} ms)`);
  const mostra = (pct, aviso, cor) => enviar('preparo', { et, pct, aviso, cor });
  mostra(0, 'Num PC recém-formatado a 1ª vez leva alguns minutos; depois, 1 segundo.', 'dim');
  let falhou = false;
  for (let i = 0; i < ETAPAS.length; i++) {
    const e = ETAPAS[i], v = et[i];
    if (e.checa()) { v.st = 'ok'; v.txt = 'ok'; mostra(Math.round((i + 1) * 100 / et.length)); continue; }
    if (QUIETO) { v.st = 'falhou'; v.txt = 'faltando (teste não instala)'; falhou = true; continue; }   // test never installs anything on PC
    v.st = 'rodando'; v.txt = 'instalando…'; mostra(Math.round(i * 100 / et.length), e.admin ? 'O Windows vai pedir permissão para instalar: clique em Sim.' : 'Baixando e instalando; não feche esta janela.', 'amb');
    const r = await rodarEtapa(e);
    if (e.checa()) { v.st = 'ok'; v.txt = 'instalado agora'; registrar('PREPARAR: instalou ' + e.nome); }
    else { v.st = 'falhou'; v.txt = 'não instalou'; falhou = true; registrar('PREPARAR: ERRO em ' + e.nome); }
    plog.push(`  ${e.nome}: ${v.txt} (${r.replace(/^(ok|erro )/, '')})`);
    mostra(Math.round((i + 1) * 100 / et.length));
  }
  marca('etapas');
  const n0 = ETAPAS.length, em = et[n0]; em.txt = !fs.existsSync(path.join(CASA, 'REGRAS.md')) ? 'nenhuma ainda' : CASA_NOVA ? 'ligada agora' : 'ok'; em.st = 'ok';   // 04/11: fresh install (pure mode) has no house yet; not a failure mostra(Math.round((n0 + 1) * 100 / et.length));
  const eo = et[n0 + 1]; eo.st = 'ok'; eo.txt = acharOllama() ? 'ok' : 'não instalado'; mostra(Math.round((n0 + 2) * 100 / et.length));
  const ec = et[n0 + 2];
  if (acharClaude()) { ec.st = 'rodando'; ec.txt = 'conferindo…'; mostra(90); ultimaConta = await contaStatus(); guardarContaAtual(ultimaConta); ec.st = ultimaConta.estado === 'ok' ? 'ok' : 'espera'; ec.txt = ultimaConta.estado === 'ok' ? ultimaConta.email : 'entrar na conta'; }
  else { ultimaConta = { estado: 'ausente' }; ec.txt = 'precisa do Claude Code'; }
  marca('conta'); for (const v of et) plog.push(`  ${v.nome}: ${v.txt}`);
  try { const ant = (lerLinhas(PREP_LOG) || []).filter(Boolean).slice(-120); fs.writeFileSync(PREP_LOG, [...ant, ...plog].join('\r\n') + '\r\n', 'utf8'); } catch { }
  mostra(100, falhou ? `Algo não instalou: detalhes em ${path.basename(CCT)}\\relatorios\\preparar.txt.` : 'Tudo pronto.', falhou ? 'erro' : 'ok');
  if (ultimaConta.estado === 'ok') escreverBriefing(ultimaConta);
  return { conta: ultimaConta, falhou };
}

// ---- tabs from last time ----
function lerSessao() { try { return JSON.parse(fs.readFileSync(SESSAO, 'utf8')); } catch { return []; } }
function salvarSessao(abas) { if (QUIETO || DEMO) return; try { fs.writeFileSync(SESSAO, JSON.stringify(abas, null, 1), 'utf8'); } catch { } }

// ---- IPC ----
ipcMain.handle('dados', () => ({ demo: DEMO, projetos: lerProjetos(), op: { ...OP }, raiz: RAIZ, livre: LIVRE, temp: C.temp(), mcp: C.dados('mcp'), temRegras: fs.existsSync(FAM), teste: TESTE, sessao: lerSessao(), atualizou: !QUIETO && process.argv.includes('--atualizou'), abrirProjeto: QUIETO ? null : arg('--projeto'), trilho: lerTrilho(), pendente: !QUIETO && fs.existsSync(PENDENTE), versao: app.getVersion(), autoAtual: ATUAL.ultimo }));
ipcMain.handle('preparar', () => preparar());
ipcMain.handle('conta', async () => { ultimaConta = await contaStatus(); guardarContaAtual(ultimaConta); return ultimaConta; });
ipcMain.handle('sair-conta', async () => { try { const f = arqConta(ultimaConta.email || ''), j = JSON.parse(fs.readFileSync(f, 'utf8')); j.expirou = true; gravarSeguro(f, JSON.stringify(j)); } catch { }   // logout on site invalidates saved login
  const c = acharClaude(); if (c) { try { cp.execFileSync(c, ['auth', 'logout'], { windowsHide: true, timeout: 20000 }); } catch { } } registrar(`LOGOUT (${ultimaConta.email || ''})`); return (ultimaConta = await contaStatus()); });
// ---- primed accounts (23/10, user request): login of each account used here saved in conta\contas (C.contas())
// (same place and protection as Claude Code login, C: only); switch = restore .credentials.json + oauthAccount of
// .claude.json, no browser. Before switching, current account saved again (Claude Code renews token: copy stays fresh).
const CONTAS_DIR = C.contas(), CRED = path.join(C.configClaude(), '.credentials.json'), CJSON = path.join(C.configClaude(), '.claude.json');
const arqConta = (email) => path.join(CONTAS_DIR, email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_') + '.json');
const gravarSeguro = (f, txt) => { const t = f + '.fcc-tmp'; fs.writeFileSync(t, txt, 'utf8'); fs.renameSync(t, f); };
function guardarContaAtual(c) {
  try { if (!c || c.estado !== 'ok' || !c.email) return; const cred = fs.readFileSync(CRED, 'utf8'); JSON.parse(cred);
    const conta = (JSON.parse(fs.readFileSync(CJSON, 'utf8')).oauthAccount) || null; if (!conta || (conta.emailAddress || '').toLowerCase() !== c.email.toLowerCase()) return;
    fs.mkdirSync(CONTAS_DIR, { recursive: true }); let uso = null; try { uso = JSON.parse(fs.readFileSync(arqConta(c.email), 'utf8')).uso || null; } catch { }
    gravarSeguro(arqConta(c.email), JSON.stringify({ email: c.email, plano: c.plano, quando: Date.now(), cred, conta, uso }));
  } catch (e) { logApp('guardar conta: ' + e.message); }
}
function fecharUso() { ULT_USO = null; clearTimeout(USO_FIM); if (USO_Q) { try { USO_Q.q.close(); } catch { } USO_Q.fim(); USO_Q = null; } }
function guardarUso(email, uso) { try { if (!email) return; const f = arqConta(email), j = JSON.parse(fs.readFileSync(f, 'utf8')); j.uso = { ...uso, t: Date.now() }; gravarSeguro(f, JSON.stringify(j)); } catch { } }
// limit hit on this account: next saved one not expired and with limit not exhausted (or already reset)
function proximaConta(atual) { const ag = Date.now(), livre = (u) => !u || !u.sessao || u.sessao.pct < 100 || (u.sessao.ate && u.sessao.ate < ag);
  return listarContas().filter(x => x.email.toLowerCase() !== (atual || '').toLowerCase() && !x.expirou && livre(x.uso) && livre(x.uso && { sessao: x.uso.semana })).sort((a, b) => ((a.uso && a.uso.sessao && a.uso.sessao.pct) || 0) - ((b.uso && b.uso.sessao && b.uso.sessao.pct) || 0))[0] || null; }
ipcMain.handle('conta-proxima', () => proximaConta(ultimaConta.email));
ipcMain.handle('conta-esgotou', (e, ate) => { guardarUso(ultimaConta.email, { sessao: { pct: 100, volta: '', ate: (ate || 0) * 1000 } }); return proximaConta(ultimaConta.email); });
function listarContas() {
  let L = []; try { L = fs.readdirSync(CONTAS_DIR).filter(f => f.endsWith('.json')).map(f => { try { const j = JSON.parse(fs.readFileSync(path.join(CONTAS_DIR, f), 'utf8')); return { email: j.email, plano: j.plano, t: j.quando || 0, expirou: !!j.expirou, uso: j.uso || null }; } catch { return null; } }).filter(Boolean); } catch { }
  return L.sort((a, b) => b.t - a.t).map(x => ({ email: x.email, plano: x.plano, expirou: x.expirou, uso: x.uso, quando: quandoCurto(x.t) }));
}
const quandoCurto = (t) => { if (!t) return ''; const d = new Date(t), h = new Date(); return d.toDateString() === h.toDateString() ? 'hoje ' + d.toTimeString().slice(0, 5) : ddmm(d); };
async function trocarConta(email) {
  let j; try { j = JSON.parse(fs.readFileSync(arqConta(email), 'utf8')); } catch { return { erro: 'essa conta não está guardada', login: true }; }
  guardarContaAtual(ultimaConta = await contaStatus());
  const credAnt = fs.existsSync(CRED) ? fs.readFileSync(CRED, 'utf8') : null, cjAnt = fs.readFileSync(CJSON, 'utf8');
  try { gravarSeguro(CRED, j.cred); const cj = JSON.parse(cjAnt); cj.oauthAccount = j.conta; gravarSeguro(CJSON, JSON.stringify(cj, null, 2)); }
  catch (e) { return { erro: 'não consegui trocar: ' + e.message }; }
  const c = await contaStatus();
  if (c.estado !== 'ok' || (c.email || '').toLowerCase() !== email.toLowerCase()) {          // not accepted: revert
    try { if (credAnt != null) gravarSeguro(CRED, credAnt); gravarSeguro(CJSON, cjAnt); } catch { }
    try { j.expirou = true; gravarSeguro(arqConta(email), JSON.stringify(j)); } catch { }
    ultimaConta = await contaStatus(); return { erro: 'o login dessa conta expirou', login: true };
  }
  ultimaConta = c; fecharUso(); guardarContaAtual(c); registrar(`CONTA trocada para ${email}`); escreverBriefing(c); enviar('conta', c); return { ok: true, conta: c };
}
ipcMain.handle('contas', () => listarContas());
ipcMain.handle('conta-usar', (e, email) => trocarConta(email).catch(err => ({ erro: err.message })));
ipcMain.handle('conta-esquecer', (e, email) => { try { fs.unlinkSync(arqConta(email)); } catch { } return listarContas(); });
// login without terminal: hidden "claude auth login"; UI shows "finish in browser" and returns to Account by itself when done
let LOGIN = null;
ipcMain.handle('login-iniciar', async (e, email) => {
  const c = acharClaude(); if (!c) return { erro: 'Não achei o Claude Code neste Windows.' };
  if (LOGIN) { try { LOGIN.p.kill(); } catch { } LOGIN = null; }
  guardarContaAtual(ultimaConta);
  const env = cfgClaude().env; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
  const args = ['auth', 'login', '--claudeai', ...(email ? ['--email', email] : [])];
  let p; try { p = pty.spawn(c, args, { name: 'xterm-256color', cols: 200, rows: 40, cwd: C.temp(), env, useConpty: true }); } catch (err) { return { erro: err.message }; }
  const L = LOGIN = { p, saida: '', url: '', email };
  p.onData(d => { L.saida = (L.saida + d).slice(-20000); const u = L.saida.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').match(/https:\/\/[^\s"'<>]+oauth[^\s"'<>]*/i); if (u && !L.url) { L.url = u[0]; enviar('login:url', L.url); }
    if (/press enter/i.test(d)) p.write('\r'); });
  p.onExit(async ({ exitCode }) => { if (LOGIN !== L) return; LOGIN = null; const ct = await contaStatus(); ultimaConta = ct;
    const ok = ct.estado === 'ok' && exitCode === 0; if (ok) { fecharUso(); guardarContaAtual(ct); escreverBriefing(ct); registrar('LOGIN: ok ' + ct.email); } else registrar('LOGIN: ERRO ' + exitCode);
    enviar('conta', ct); enviar('login:fim', { ok, conta: ct, erro: ok ? '' : (L.cancelado ? 'cancelado' : (L.saida.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).pop() || 'o login não terminou').slice(0, 200)) }); });
  return { ok: true };
});
ipcMain.handle('login-cancelar', () => { if (LOGIN) { LOGIN.cancelado = true; try { LOGIN.p.kill(); } catch { } } return true; });
ipcMain.on('login-abrir', () => { if (LOGIN && LOGIN.url) shell.openExternal(LOGIN.url); });
ipcMain.handle('opcao', (e, k, v) => { if (k in OP) { OP[k] = String(v); salvarOpcoes(); if (k === 'ia') registrar('IA: ' + v); if (k === 'pastas') return lerProjetos(); } return null; });
ipcMain.handle('projetos', () => lerProjetos());
// conversation name from topic (24/10, user request): 1 short request, no tools or rules. Claude → Haiku Low (~300 tokens);
// local AI → same model as conversation, direct to Ollama, no thinking. Returns 2-5 words or '' (UI retries on next reply).
ipcMain.handle('chat-titulo', async (e, pedido, resposta, modelo, sessao, dir) => {
  const p = '2-5 word pt-BR title for this chat topic. Title only, no quotes/period.\n\nPedido: ' + String(pedido || '').slice(0, 1200) + '\n\nInício da resposta: ' + String(resposta || '').slice(0, 600);
  const limpar = (x) => String(x || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
  const ok = (x) => { x = limpar(x).replace(/^(t[íi]tulo\s*:\s*)/i, '').replace(/^["'“”«*#\s]+|["'“”»*.\s]+$/g, '').slice(0, 60); return x.split(/\s+/).length <= 8 ? x : ''; };
  try {
    if (!NUVEM.includes(modelo)) {
      const r = await fetch(OLLAMA_URL + '/api/chat', { method: 'POST', signal: AbortSignal.timeout(60000), body: JSON.stringify({ model: modelo, stream: false, think: false, keep_alive: OP.manter || '30m', messages: [{ role: 'user', content: p }] }) });
      return ok((await r.json()).message?.content);
    }
    const claude = acharClaude(); if (!claude) return ''; const S = await sdk(); const cfg = cfgClaude(), env = cfg.env;
    for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
    Object.assign(env, { ENABLE_CLAUDEAI_MCP_SERVERS: 'false', CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: '1' });
    let txt = '';
    for await (const m of S.query({ prompt: p, options: { cwd: C.temp(), env, pathToClaudeCodeExecutable: claude, settingSources: [], strictMcpConfig: true, model: 'haiku', effort: 'low', maxTurns: 1, tools: [], systemPrompt: 'You title chats.' } })) {
      if (m.type === 'assistant') for (const b of m.message.content || []) if (b.type === 'text') txt += b.text;
      if (m.type === 'result') break;
    }
    const t = ok(txt);
    if (t && sessao) { try { await S.renameSession(sessao, t, dir ? { dir } : undefined); SESS_CACHE.delete(dir); } catch (err) { logApp('renameSession: ' + err.message); } }   // becomes name in Retomar and rail
    return t;
  } catch (err) { logApp('titulo: ' + err.message); return ''; }
});
ipcMain.handle('mod-dados', async () => { USO_MOD = true; const [pc, cat, achados] = await Promise.all([infoPC(), catalogo(), acharGGUFcache()]); let usos = {}; try { usos = JSON.parse(fs.readFileSync(USOS, 'utf8')); } catch { }
  const inst = modelosDoDisco().map(m => ({ id: m.n, gb: m.gb, uso: usos[m.n] ? (usos[m.n] === ddmm(new Date()) ? 'hoje' : usos[m.n]) : 'nunca' })); return { pc, inst, erro: acharOllama() ? '' : 'o Ollama não está instalado', cat, achados, baixando: [...PULLS.keys()], velo: veloLer() }; });
// measured speed of each model on user's PC (⚡ button in My models): short /api/generate, Ollama eval_count / eval_duration
const VELO_ARQ = C.dados('fcc-velocidade.json');
const veloLer = () => { try { return JSON.parse(fs.readFileSync(VELO_ARQ, 'utf8')); } catch { return {}; } };
ipcMain.handle('mod-bench', async (e, m) => {
  const er = await garantirOllama(); if (er) return { erro: er };
  try { const t0 = Date.now(); const j = await (await fetch(OLLAMA_URL + '/api/generate', { method: 'POST', body: JSON.stringify({ model: m, prompt: 'Escreva duas frases sobre o mar.', stream: false, think: false, options: { num_predict: 96 } }), signal: AbortSignal.timeout(180000) })).json();
    if (j.error) return { erro: j.error }; MODELOS_CARREGADOS.add(m);
    const r = { tps: Math.round(j.eval_count / (j.eval_duration / 1e9)), primeira: ((j.prompt_eval_duration || 0) / 1e9 + 0.05).toFixed(1).replace('.', ',') + ' s', carga: Math.round((Date.now() - t0) / 100) / 10 };
    if (!QUIETO) { const v = veloLer(); v[m] = r; fs.writeFileSync(VELO_ARQ, JSON.stringify(v, null, 1), 'utf8'); } liberarLocal(); return r; } catch (err) { liberarLocal(); return { erro: err.message }; }
});
ipcMain.handle('ia-ligar', async () => { const er = await garantirOllama(); return er ? { erro: er } : { ok: true }; });
ipcMain.on('mod-fechou', () => { USO_MOD = false; liberarLocal(); });
ipcMain.handle('mod-lista', () => listarModelos());
ipcMain.on('mod-baixar', (e, id) => { baixarModelo(id); });
ipcMain.on('mod-cancelar', (e, id) => { const ac = PULLS.get(id); if (ac) ac.abort(); });
ipcMain.handle('mod-apagar', (e, id) => apagarModelo(id));
ipcMain.handle('mod-buscar', (e, tx, fonte) => buscarModelos(tx, fonte).catch(err => { logApp('busca: ' + err.message); return []; }));
ipcMain.handle('mod-arquivo', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Modelo GGUF', extensions: ['gguf'] }] }); if (r.canceled || !r.filePaths[0]) return null; const p = r.filePaths[0]; return { n: path.basename(p), pasta: path.dirname(p), gb: GB(fs.statSync(p).size), caminho: p }; });
ipcMain.handle('mod-importar', (e, caminho, nome) => importarGGUF(caminho, nome));
ipcMain.on('mod-site', (e, url) => { if (/^[a-z0-9.-]+\.[a-z]{2,}(\/[\w./-]*)?$/i.test(url)) shell.openExternal('https://' + url); });
ipcMain.handle('ia-disco', () => ({ modelos: modelosDoDisco(), ollama: !!acharOllama(), velo: veloLer() }));
// local AI chosen: start Ollama and preload model in background (tab opens without waiting for disk load)
ipcMain.on('ia-aquecer', async (e, modelo) => {
  if (QUIETO || !modelo || NUVEM.includes(modelo)) return;
  const t0 = Date.now(); if (await garantirOllama()) return;
  try { await fetch(OLLAMA_URL + '/api/generate', { method: 'POST', body: JSON.stringify({ model: modelo, keep_alive: OP.manter || '30m', options: { num_ctx: parseInt(OP.ctxSimples, 10) || 16384 } }), signal: AbortSignal.timeout(600000) }); logApp(`IA local aquecida: ${modelo} em ${Date.now() - t0} ms`); } catch (err) { logApp('aquecer: ' + err.message); }
});
ipcMain.handle('ia-lista', async () => { const erro = await garantirOllama(); const ms = erro ? [] : await modelosLocais(); return { erro: erro || (ms.length ? '' : 'nenhum modelo baixado no Ollama'), modelos: ms }; });
ipcMain.handle('pty-abrir', (e, o) => abrirTerminal(o));
ipcMain.on('pty-escrever', (e, id, d) => { const p = PTYS.get(id); if (p) p.write(d); });
ipcMain.on('pty-tamanho', (e, id, c, r) => { const p = PTYS.get(id); if (p) try { p.resize(Math.max(20, c), Math.max(5, r)); } catch { } });
ipcMain.on('pty-fechar', (e, id) => { const p = PTYS.get(id); if (p) { try { p.kill(); } catch { } PTYS.delete(id); } if (PTYS_LOCAIS.delete(id)) liberarLocal(); });
ipcMain.handle('chat-abrir', (e, o) => abrirChat(o).catch(err => { logApp('chat-abrir: ' + (err.stack || err)); return { erro: 'Não consegui abrir a conversa: ' + err.message }; }));
// auto mode (auto.js): before each Claude message picks model + thinking; UI gets the switch (chat:auto)
let AUTO = null;
const auto = () => AUTO || (AUTO = require('./auto.js')(QUIETO ? C.temp('fcc-auto-teste.json') : C.dados('fcc-auto.json'), logApp));
async function aplicarAuto(c, id, r) {
  if (!r || (r.modelo === c.modelo && r.esf === c.esf)) return;
  try { if (r.modelo !== c.modelo) { await c.q.setModel(r.modelo); c.modelo = r.modelo; } if (r.esf !== c.esf) { await c.q.applyFlagSettings({ effortLevel: r.esf }); c.esf = r.esf; } enviar('chat:auto', id, r); }
  catch (err) { logApp('auto: ' + err.message); }
}
ipcMain.on('chat-enviar', async (e, id, txt) => { const c = CHATS.get(id); if (!c) return;
  if (!c.local && OP.auto === '1' && !txt.trim().startsWith('/')) { c.auto = c.auto || {}; await aplicarAuto(c, id, auto().escolher(c, txt)); }
  if (c.passando) { (c.pendentes = c.pendentes || []).push(txt); return; }   // noting where it stopped: goes to new conversation
  iniciarVigia(id);   // turn starts: snapshot of the system; closed when the result arrives
  enviarAoChat(c, id, txt); });
ipcMain.handle('chat-parar', async (e, id) => { const c = CHATS.get(id); if (!c) return; c.parou = true; for (const [req] of c.perms) respostaPerm(id, req, { acao: 'negar', msg: 'interrompido', parar: true }); try { await c.q.interrupt(); } catch (err) { logApp('interrupt: ' + err.message); } });
ipcMain.handle('chat-modelo', async (e, id, m) => { const c = CHATS.get(id); if (!c) return false; if (c.auto && OP.auto === '1') auto().trocouNaMao(c, m, null); try { await c.q.setModel(m); c.modelo = m; return true; } catch (err) { logApp('setModel: ' + err.message); return false; } });
// --- v4 panels data: permission mode, context usage, changed files, project files, side question ---
ipcMain.handle('chat-modo', async (e, id, modo) => { const c = CHATS.get(id); if (!c) return { erro: 'Conversa não encontrada.' };
  if (typeof c.q.setPermissionMode === 'function') { try { await c.q.setPermissionMode(modo); } catch (err) { logApp('modo: ' + err.message); return { erro: err.message }; } c.modo = modo; return { ok: true }; }
  c.modo = modo; return { ok: true, local: !!c.local }; });
ipcMain.handle('chat-ctx', async (e, id) => { const c = CHATS.get(id); const vazio = { usado: (c && c.ctxAgora) || 0, total: 0, pct: 0, partes: [] };
  try { if (!c || typeof c.q.getContextUsage !== 'function') return vazio; const r = await c.q.getContextUsage();
    return { usado: r.totalTokens, total: r.maxTokens, pct: Math.round(r.percentage), partes: (r.categories || []).filter(x => x.kind === 'used' && x.tokens > 0).map(x => ({ id: x.id || '', nome: x.name, tokens: x.tokens })) };
  } catch (err) { return vazio; } });
// changes log: raw tool_use arrives before the tool runs, so "before" content can still be read
function registrarMud(c, m) {
  const cont = m && m.message && Array.isArray(m.message.content) ? m.message.content : null; if (!cont) return;
  if (m.type === 'assistant') for (const b of cont) {
    if (b.type !== 'tool_use' || !['Edit', 'MultiEdit', 'Write'].includes(b.name) || !b.input || !b.input.file_path) continue;
    const abs = path.isAbsolute(b.input.file_path) ? b.input.file_path : path.join(c.o.dir, b.input.file_path);
    const existia = fs.existsSync(abs); let antes;
    if (b.name === 'Write' && existia) { try { antes = fs.readFileSync(abs, 'utf8').split('\n').slice(0, 400).join('\n'); } catch { antes = ''; } }
    (c.mud = c.mud || []).push({ id: b.id, nome: b.name, input: b.input, existia, antes }); if (c.mud.length > 500) c.mud.shift();
  } else if (m.type === 'user' && c.mud) for (const b of cont) if (b.type === 'tool_result' && b.is_error) c.mud = c.mud.filter(r => r.id !== b.tool_use_id);
}
ipcMain.handle('chat-mud', (e, id) => { const c = CHATS.get(id); if (!c || !c.mud || !c.mud.length) return [];
  try { return require('./mudancas').resumo(c.mud, c.o.dir, f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }); } catch (err) { logApp('mud: ' + err.message); return []; } });
ipcMain.handle('arquivos', (e, dir) => { try { const dirs = [], files = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) { if (d.name.startsWith('.') || d.name === 'node_modules') continue; (d.isDirectory() ? dirs : files).push(d.name); }
  const o = (a) => a.sort((x, y) => x.localeCompare(y, 'pt-BR')).slice(0, 200); return { dirs: o(dirs), files: o(files) }; } catch { return { dirs: [], files: [] }; } });
// side question: forked copy of the session, no tools, nothing persisted → main conversation untouched
ipcMain.handle('chat-lado', async (e, id, pergunta) => { const c = CHATS.get(id); if (!c) return { erro: 'Conversa não encontrada.' };
  if (c.local) return { erro: 'A pergunta de lado só funciona com o Claude.' };
  if (!c.sessao) return { erro: 'Mande uma mensagem na conversa antes.' };
  let q2; const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 90000);
  try { const S = await sdk();
    q2 = S.query({ prompt: String(pergunta) + '\n\n(Pergunta de lado: responda curto, em pt-BR, só com o que já está nesta conversa. Não use ferramentas.)',
      options: { cwd: c.o.dir, env: c.env, model: c.modelo || c.o.modelo, pathToClaudeCodeExecutable: c.claude, resume: c.sessao, forkSession: true, persistSession: false, maxTurns: 1, tools: [], permissionMode: 'plan', abortController: ac } });
    let txt = '';
    for await (const m of q2) if (m.type === 'result') txt = m.result || '';
    return txt ? { txt } : { erro: 'Sem resposta.' };
  } catch (err) { return { erro: ac.signal.aborted ? 'Tempo esgotado (90 s).' : err.message }; }
  finally { clearTimeout(t); try { q2 && q2.close && q2.close(); } catch { } } });
ipcMain.handle('chat-pensar',async (e, id, sim) => { PENSAR.set(id, nivelP(sim)); const c = CHATS.get(id); if (!c) return false; try { await c.q.setMaxThinkingTokens(nivelP(sim) === 2 ? 8000 : 0); return true; } catch (err) { logApp('pensar: ' + err.message); return false; } });
ipcMain.handle('chat-esforco', async (e, id, v) => { const c = CHATS.get(id); if (!c) return false; if (c.auto && OP.auto === '1') auto().trocouNaMao(c, null, v); try { await c.q.applyFlagSettings({ effortLevel: v }); c.esf = v; return true; } catch (err) { logApp('effort: ' + err.message); return false; } });
ipcMain.on('chat-perm', (e, id, req, r) => respostaPerm(id, req, r));
ipcMain.on('chat-fechar', (e, id) => { AJUDANTES.pararDaAba(id); fecharChat(id); });
ipcMain.on('conversa-fechada', (e, x) => { if (!x || !x.dir) return; const c = lerConversas(); c[x.dir.toLowerCase()] = x; try { fs.writeFileSync(CONVERSAS, JSON.stringify(c, null, 1), 'utf8'); } catch (err) { logApp('conversas: ' + err.message); } });
ipcMain.handle('anexar', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] }); return r.canceled ? [] : r.filePaths; });
ipcMain.handle('programa', (e, dir) => { const x = acharExe(dir); if (x) cp.spawn(x, [], { cwd: path.dirname(x), detached: true, stdio: 'ignore' }).unref(); return x ? path.basename(x) : null; });
ipcMain.handle('relatorios', (e, dir) => { const x = acharRelatorios(dir); if (x) shell.openPath(x); return !!x; });
ipcMain.handle('tem-programa', (e, dir) => !!acharExe(dir));
// project icon = icon inside its .exe (27/10, user request): reads RT_GROUP_ICON from PE resources (largest frame); exe without own icon keeps the letter
const ICONES = new Map();   // exe|mtime -> data URL
function iconeDoExe(exe) {
  const b = fs.readFileSync(exe), pe = b.readUInt32LE(0x3c); if (b.readUInt32LE(pe) !== 0x4550) return null;
  const nSec = b.readUInt16LE(pe + 6), opt = pe + 24, dd = opt + (b.readUInt16LE(opt) === 0x20b ? 112 : 96), resRva = b.readUInt32LE(dd + 16);
  const secs = []; for (let i = 0, s = opt + b.readUInt16LE(pe + 20); i < nSec; i++, s += 40) secs.push({ va: b.readUInt32LE(s + 12), vs: Math.max(b.readUInt32LE(s + 8), b.readUInt32LE(s + 16)), raw: b.readUInt32LE(s + 20) });
  const off = (rva) => { const s = secs.find(x => rva >= x.va && rva < x.va + x.vs); return s ? rva - s.va + s.raw : -1; };
  const base = off(resRva); if (!resRva || base < 0) return null;
  const ents = (o) => { const n = b.readUInt16LE(o + 12) + b.readUInt16LE(o + 14), L = []; for (let i = 0; i < n; i++) L.push({ id: b.readUInt32LE(o + 16 + i * 8), to: b.readUInt32LE(o + 20 + i * 8) }); return L; };
  const folha = (to) => { while (to & 0x80000000) to = ents(base + (to & 0x7fffffff))[0].to; const rva = b.readUInt32LE(base + to), sz = b.readUInt32LE(base + to + 4), o = off(rva); return o < 0 ? null : b.subarray(o, o + sz); };
  const tipo = (t) => { const e = ents(base).find(x => x.id === t); return e ? ents(base + (e.to & 0x7fffffff)) : []; };
  const grupos = tipo(14), icones = tipo(3); if (!grupos.length) return null;
  const g = folha(grupos[0].to), n = g.readUInt16LE(4), partes = [];
  for (let i = 0; i < n; i++) { const e = g.subarray(6 + i * 14, 20 + i * 14), id = e.readUInt16LE(12), r = icones.find(x => x.id === id); const d = r && folha(r.to); if (d) partes.push({ e, d }); }
  if (!partes.length) return null;
  partes.sort((x, y) => (y.e[0] || 256) - (x.e[0] || 256)); const png = partes[0].d.readUInt32BE(0) === 0x89504e47 && partes[0]; if (png) return 'data:image/png;base64,' + png.d.toString('base64');   // 256 px PNG frame: best
  const cab = Buffer.alloc(6 + partes.length * 16); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(partes.length, 4); let pos = cab.length;
  partes.forEach((p, i) => { p.e.copy(cab, 6 + i * 16, 0, 12); cab.writeUInt32LE(p.d.length, 6 + i * 16 + 8); cab.writeUInt32LE(pos, 6 + i * 16 + 12); pos += p.d.length; });
  return 'data:image/x-icon;base64,' + Buffer.concat([cab, ...partes.map(p => p.d)]).toString('base64');
}
ipcMain.handle('icones', async (e, dirs) => {
  const r = {};
  for (const dir of dirs || []) {
    const exe = acharExe(dir); if (!exe) continue;
    const lanc = path.join(path.dirname(dir), path.basename(dir) + '.exe');   // exe without own icon (FAH .NET apphost): use the root launcher icon (lancador\projetos.txt)
    try { const k = exe + '|' + fs.statSync(exe).mtimeMs; if (!ICONES.has(k)) { let u = null; try { u = iconeDoExe(exe); } catch { } if (!u) try { if (fs.existsSync(lanc)) u = iconeDoExe(lanc); } catch { } ICONES.set(k, u); } if (ICONES.get(k)) r[dir] = ICONES.get(k); } catch { }
  }
  return r;
});
ipcMain.on('link', (e, u) => { if (/^https?:\/\//i.test(u)) shell.openExternal(u); });
ipcMain.handle('pasta', (e, dir) => { shell.openPath(dir); return true; });
ipcMain.handle('parada', (e, dir) => { const f = ['PARADA.md', 'PRA-TESTAR.md'].map(x => path.join(dir, 'docs', x)).filter(x => fs.existsSync(x)); for (const x of f) cp.spawn('notepad.exe', [x], { detached: true, stdio: 'ignore' }).unref(); return f.length > 0; });
// Ollama (local AI engine): first-run flow checks and installs with its own installer, user scope only (button click = permission, 25/10)
ipcMain.handle('ollama-estado', () => !!acharOllama());
ipcMain.handle('ollama-instalar', async () => { registrar('OLLAMA: instalando'); const r = await rodarEtapa(ETAPA_OLLAMA); const ok = !!acharOllama(); registrar('OLLAMA: ' + (ok ? 'instalado' : 'falhou ' + r)); return ok; });
ipcMain.handle('instalar-claude', async () => { const r = await rodarEtapa(ETAPAS.find(e => e.id === 'claude')); return !!acharClaude() || r; });
ipcMain.on('sessao', (e, abas) => salvarSessao(abas));
ipcMain.on('janela', (e, a) => {
  if (!win) return;
  if (a === 'min') win.minimize(); else if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (a === 'bandeja') { win.hide(); avisarBandeja(); }
  else if (a === 'sair' || a === 'fechar') sairDeVerdade();
});
ipcMain.on('tamanho', (e, t) => { OP.tam = t === 'min' ? 'min' : 'max'; salvarOpcoes(); aplicarTamanho(); });
ipcMain.on('reiniciar', () => { logApp('reiniciar (pedido na tela)'); if (!soltarVigia()) app.relaunch({ args: process.argv.slice(1).filter(x => x !== '--atualizou').concat('--atualizou') }); sairDeVerdade(); });
ipcMain.on('trilho-salvar', (e, x) => { if (QUIETO) return; try { fs.writeFileSync(TRILHO, JSON.stringify(x, null, 1), 'utf8'); } catch (err) { logApp('trilho: ' + err.message); } });
ipcMain.handle('ia-estado', (e, aba) => iaEstado(aba));
ipcMain.handle('ia-desligar', async () => { liberarLocal(true); if (await ollamaNoAr()) { try { cp.execFileSync('taskkill', ['/IM', 'ollama.exe', '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { } } return true; });
ipcMain.handle('ia-descarregar', async (e, m) => { const L = m ? [m] : [...MODELOS_CARREGADOS]; for (const x of L) { try { await fetch(OLLAMA_URL + '/api/generate', { method: 'POST', body: JSON.stringify({ model: x, keep_alive: 0 }), signal: AbortSignal.timeout(8000) }); } catch { } MODELOS_CARREGADOS.delete(x); } return true; });
ipcMain.handle('regras', () => regrasEMemoria());
// Pasta do FCC window: logic in pasta.js (tested alone); here only the Electron pieces
const PASTA_JANELA = PASTA.criar({
  listarContas: () => listarContas(), contaAtiva: () => ultimaConta.email || '',
  tituloConversa: (id) => { const c = CHATS.get(id); return (c && (c.titulo || (c.o && c.o.titulo))) || ''; },
  getOutro: () => OUTRO,
  escolherPasta: async (titulo) => { const r = await dialog.showOpenDialog(win, { title: titulo, properties: ['openDirectory', 'createDirectory'] }); return r.canceled || !r.filePaths[0] ? null : r.filePaths[0]; },
  abrir: (p) => shell.openPath(p), abrirUri: (u) => shell.openExternal(u),
  executar: (cmd) => { const p = cp.spawn(cmd, { shell: true, detached: true, stdio: 'ignore', windowsHide: false }); p.on('error', () => { }); p.unref(); },
  lixeira: (p) => shell.trashItem(p),
  pararTudo: async () => { pararTudo(); await new Promise(r => setTimeout(r, 800)); },
  sair: () => sairDeVerdade(),
});
ipcMain.handle('pasta-dados', () => PASTA_JANELA.dados());
ipcMain.handle('pasta-acao', (e, acao, arg) => PASTA_JANELA.acao(acao, arg));
ipcMain.handle('esquecer', (e, arq) => esquecerNota(arq));
ipcMain.on('abrir-arq', (e, base, rel) => abrirArq(base, rel));
ipcMain.on('abrir-skill', (e, n) => { const f = path.join(C.perfilClaude(), 'skills', path.basename(n), 'SKILL.md'); if (fs.existsSync(f)) cp.spawn('notepad.exe', [f], { detached: true, stdio: 'ignore' }).unref(); });
ipcMain.handle('escolher-pasta', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('versoes', async () => ({ versao: versaoPrograma(), claudeVersao: await claudeVersao(), temRegras: fs.existsSync(FAM) }));
ipcMain.handle('ficha-dados', (e, dir) => fichaDados(dir));
ipcMain.handle('captura', async (e, arq) => { win.webContents.invalidate(); await new Promise(r => setTimeout(r, 150)); const img = await win.webContents.capturePage();   /* offscreen window: force new frame before shot */ fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, img.toPNG()); return true; });
let ERROS_JS = 0, ERRO_JS1 = '';   // 25/10: JavaScript error in UI fails build (empacotar.js reads 'erros js')
ipcMain.on('fim-teste', (e, rel) => { if (rel) try { fs.writeFileSync(path.join(TESTE.autoteste, 'resultado.txt'), rel + '\nerros js: ' + ERROS_JS + (ERROS_JS ? ' (' + ERRO_JS1 + ')' : ''), 'utf8'); } catch { } app.exit(0); });
ipcMain.on('log', (e, t) => logApp('tela: ' + t));

// ---- test script (keys sent straight to page; user's mouse and keyboard stay free) ----
const TECLA_CODIGO = { Enter: 'Return', Esc: 'Escape' };
async function rodarRoteiro() {
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const wc = win.webContents;
  for (const passo of TESTE.roteiro.split(';').map(s => s.trim()).filter(Boolean)) {
    const [k, ...r] = passo.split(':'); const v = r.join(':');
    logApp('roteiro: ' + passo);
    if (k === 'espera') await esperar(+v);
    else if (k === 'tecla') {
      const partes = v.split('+'); const tecla = partes.pop(); const mods = partes.map(m => m.toLowerCase());
      const kc = TECLA_CODIGO[tecla] || tecla;
      wc.sendInputEvent({ type: 'keyDown', keyCode: kc, modifiers: mods });
      if (tecla.length === 1 && !mods.includes('control')) wc.sendInputEvent({ type: 'char', keyCode: tecla, modifiers: mods });
      wc.sendInputEvent({ type: 'keyUp', keyCode: kc, modifiers: mods }); await esperar(120);
    }
    else if (k === 'clique') { await wc.executeJavaScript(`(() => { const e = document.querySelector(${JSON.stringify(v)}); if (e) e.click(); return !!e; })()`).then(r => { if (!r) logApp('roteiro: não achei ' + v); }); await esperar(150); }
    else if (k === 'mouse') {           // real click at element center: press, wait 150 ms (like a hand), release
      const r = await wc.executeJavaScript(`(() => { const e = document.querySelector(${JSON.stringify(v)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()`);
      if (!r) logApp('roteiro: não achei ' + v);
      else { wc.sendInputEvent({ type: 'mouseMove', x: r.x, y: r.y }); wc.sendInputEvent({ type: 'mouseDown', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await esperar(150); wc.sendInputEvent({ type: 'mouseUp', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await esperar(250); }
    }
    else if (k === 'tam') { const [w, h] = v.split('x').map(Number); win.setContentSize(w, h); await esperar(400); }   // small screen check (14" 150% = 1280x688)
    else if (k === 'js') { try { await wc.executeJavaScript(v); } catch (e) { logApp('roteiro js: ' + e.message); } await esperar(150); }
    else if (k === 'ate') { const [sel, ms] = v.split('|'); const t0 = Date.now(); while (Date.now() - t0 < (+ms || 60000)) { if (await wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(sel)})`)) break; await esperar(250); } }
    else if (k === 'foco') { await wc.executeJavaScript(`(() => { const e = document.querySelector(${JSON.stringify(v)}); if (e) e.focus(); return !!e; })()`).then(r => { if (!r) logApp('roteiro: não achei ' + v); }); }   // text box: click by code doesn't give focus
    else if (k === 'texto') { for (const c of v) { wc.sendInputEvent({ type: 'char', keyCode: c }); await esperar(30); } }
    else if (k === 'foto') { await wc.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'); wc.invalidate(); await esperar(150); const img = await wc.capturePage(); fs.mkdirSync(path.dirname(v), { recursive: true }); fs.writeFileSync(v, img.toPNG()); }
    else if (k === 'sair') { for (const p of PTYS.values()) { try { p.kill(); } catch { } } for (const id of [...CHATS.keys()]) fecharChat(id); if (USO_Q) { try { USO_Q.q.close(); } catch { } USO_Q = null; } await esperar(500); app.exit(0); return; }
  }
}

// ---- interface 2 (23/10/2026): window, tray and data for AI / Rules and memory / project sheet windows ----
const TAM = { max: [1440, 810], min: [1080, 608] };          // ExitLag default: 16:9, Min. without zoom: same letters, compacto.css adjusts (23/10)
function aplicarTamanho(inicio) {
  if (!win) return; const t = OP.tam === 'min' ? 'min' : 'max'; let [w, h] = TAM[t];
  const area = screen.getDisplayMatching(win.getBounds()).workAreaSize; if (w > area.width || h > area.height) [w, h] = TAM.min;   // small screen: Min. fits
  if (win.isMaximized()) win.unmaximize();
  win.setContentSize(w, h); if (!inicio) win.center();
  win.webContents.setZoomFactor(1); enviar('tamanho', t);   // 23/10: Min. without zoom (same letters; compacto.css adjusts)
}
let bandeja = null, avisouBandeja = false;
function mostrarJanela() { if (!win) return; if (!win.isVisible()) win.show(); if (win.isMinimized()) win.restore(); win.focus(); }
function criarBandeja() {
  try {
    bandeja = new Tray(path.join(__dirname, 'icone.ico')); bandeja.setToolTip('Claude Code');
    bandeja.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir', click: mostrarJanela }, { type: 'separator' }, { label: 'Sair', click: sairDeVerdade }]));
    bandeja.on('click', mostrarJanela);
  } catch (e) { logApp('bandeja: ' + e.message); }
}
function avisarBandeja() { if (avisouBandeja || !bandeja) return; avisouBandeja = true; try { bandeja.displayBalloon({ title: 'Claude Code continua aberto', content: 'As conversas seguem na bandeja. Para sair: segure o ✕ por 1 segundo ou "Sair" aqui.', iconType: 'info' }); } catch { } }
// Stops everything the app owns (conversations, terminals, helpers, local AI). Used on real quit and before removing FCC.
function pararTudo() {
  // 01/11 (user request): helpers stop with the program; closing the CLI alone leaves its children running on Windows
  if (!QUIETO) { for (const c of CHATS.values()) c.fechado = true; AJUDANTES.pararTudo(path.basename(acharClaude() || 'claude.exe')); }
  for (const p of PTYS.values()) { try { p.kill(); } catch { } } for (const id of [...CHATS.keys()]) fecharChat(id); if (USO_Q) { try { USO_Q.q.close(); } catch { } USO_Q = null; } liberarLocal(true);
}
function sairDeVerdade() { SAINDO = true; if (bandeja) { try { bandeja.destroy(); } catch { } bandeja = null; } if (win && !win.isDestroyed()) win.close(); else app.quit(); }
// rail groups, names and pins (app only: folders unchanged)
const TRILHO = C.dados('fcc-trilho.json');
function lerTrilho() { try { return JSON.parse(fs.readFileSync(TRILHO, 'utf8')); } catch { return { grupos: [], alias: {}, fixos: [] }; } }
const pad = (n) => String(n).padStart(2, '0');
const quando = (d) => { d = new Date(d); const h = new Date(), ont = new Date(h); ont.setDate(h.getDate() - 1);
  return (d.toDateString() === h.toDateString() ? 'hoje' : d.toDateString() === ont.toDateString() ? 'ontem' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const volta = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const h = new Date(), am = new Date(h); am.setDate(h.getDate() + 1); const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  return d.toDateString() === h.toDateString() ? hm : d.toDateString() === am.toDateString() ? 'amanhã às ' + hm : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getDay()] + ' às ' + hm; };
const comPrazo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
let CLAUDE_VER = null;
function claudeVersao() { if (CLAUDE_VER != null) return Promise.resolve(CLAUDE_VER); const c = acharClaude(); if (!c) return Promise.resolve('não instalado');
  return new Promise(ok => cp.execFile(c, ['--version'], { windowsHide: true, timeout: 8000, encoding: 'utf8' }, (err, out) => { CLAUDE_VER = err ? '—' : (String(out).match(/\d+\.\d+\.\d+/) || ['—'])[0]; ok(CLAUDE_VER); })); }
function versaoPrograma() { try { const d = fs.statSync(app.isPackaged ? process.execPath : __filename).mtime; return `versão de ${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`; } catch { return ''; } }
const chaveProj = C.chaveProjeto;            // how Claude Code names perfil\claude\projects\<chave>
const memDir = (dir) => path.join(C.perfilClaude(), 'projects', chaveProj(dir), 'memory');
// account limit: asked of an open Claude conversation; if none, of a Claude Code opened just for it (no message = no token,
// ~1 s to open; measured 23/10). It closes 2 min after last query (Account window closed).
let USO_Q = null, USO_FIM = null, ULT_USO = null;
async function limUso(abaId) {
  // always own query: open conversation may have previous account's login (account switch, 23/10)
  let q = null;
  if (!q) {
    if (!USO_Q) { const claude = acharClaude(); if (!claude) return null; const S = await sdk(); const cfg = cfgClaude(), env = cfg.env; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
      let acorda; const it = (async function* () { await new Promise(ok => { acorda = ok; }); })();
      USO_Q = { q: S.query({ prompt: it, options: { cwd: C.temp(), env, pathToClaudeCodeExecutable: claude, settingSources: [], strictMcpConfig: true } }), fim: () => acorda && acorda() }; }
    q = USO_Q.q; clearTimeout(USO_FIM); USO_FIM = setTimeout(() => { if (USO_Q) { try { USO_Q.q.close(); } catch { } USO_Q.fim(); USO_Q = null; } }, 120000);
  }
  try { const u = await comPrazo(q.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET({ skipBehaviors: true }), 6000); const rl = u && u.rate_limits;
    if (rl) { const j = (x) => x && x.utilization != null ? { pct: Math.round(x.utilization), volta: volta(x.resets_at), ate: Date.parse(x.resets_at) || 0 } : null; const r = { sessao: j(rl.five_hour), semana: j(rl.seven_day) }; ULT_USO = r; guardarUso(ultimaConta.email, r); return r; } } catch (e) { logApp('uso: ' + e.message); }
  return null;
}
ipcMain.handle('lim-uso', (e, abaId) => limUso(abaId).catch(() => null));
async function iaEstado(abaId) {
  const r = { local: {}, pc: await infoPC().catch(() => null), claudeVersao: await claudeVersao() };
  const L = r.local; L.ligado = await ollamaNoAr(); L.nosso = !!OLLAMA_NOSSO; L.porta = 11434; L.pasta = OP_MODELOS();
  L.tps = ULT_LOCAL.tps; L.primeira = ULT_LOCAL.primeira;
  if (L.ligado) { try { const ps = await (await fetch(OLLAMA_URL + '/api/ps', { signal: AbortSignal.timeout(2000) })).json(); const m = (ps.models || []).find(x => x.name === OP.iaLocal || x.model === OP.iaLocal) || (ps.models || [])[0];
    if (m) { L.carregado = true; L.placa = `${GB(m.size_vram || 0).toFixed(1).replace(".", ",")} / ${r.pc ? r.pc.vram : '?'} GB`; } } catch { } }
  try { const E = estLer(), h0 = new Date(); h0.setHours(0, 0, 0, 0); const t = (E.sessoes || []).filter(s => s.ini >= +h0 && !NUVEM.includes(s.mod)).reduce((a, s) => a + (s.turnos || []).reduce((b, x) => b + (x.ent || 0) + (x.sai || 0), 0), 0); L.hoje = t >= 1000 ? Math.round(t / 1000) + ' mil' : String(t); } catch { }
  // account limit and conversation memory: asked of an open Claude conversation (preferably the one on screen)
  const c = CHATS.get(abaId) && !CHATS.get(abaId).local ? CHATS.get(abaId) : [...CHATS.values()].find(x => !x.local);
  r.lim = ULT_USO; limUso(abaId).then(u => { if (u) enviar('uso', u); }).catch(() => { });   // don't wait for Claude Code reply
  if (c && c.q) {
    if (CHATS.get(abaId) === c) { try { const cu = await comPrazo(c.q.getContextUsage(), 4000); if (cu && cu.percentage != null) r.ctx = Math.round(cu.percentage); } catch (e) { logApp('contexto: ' + e.message); } }
  }
  return r;
}
const primeiras = (txt, n) => txt.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^(#|@|---|name:|description:|metadata:|type:)/.test(l)).slice(0, n).join(' ').replace(/[*_`]/g, '');
function regrasEMemoria() {
  const fam = FAM;
  const regras = [['Regras da casa', 'CLAUDE-global.md'], ['Gostos', 'GOSTOS.md'], ['Aprendizados', 'APRENDIZADOS.md']].filter(([, a]) => fs.existsSync(path.join(fam, a)))
    .map(([n, arq]) => { const caminho = path.join(fam, arq); let tx = ''; try { tx = primeiras(fs.readFileSync(caminho, 'utf8'), 12); } catch { } return { n, arq, tx: tx.length > 700 ? tx.slice(0, 700) + '…' : tx, pasta: 'perfil\\regras', caminho }; });
  const memorias = [], base = path.join(C.perfilClaude(), 'projects');
  try { for (const d of fs.readdirSync(base)) { const md = path.join(base, d, 'memory'); if (!fs.existsSync(md)) continue;
    for (const a of fs.readdirSync(md)) { if (!/\.md$/i.test(a) || /^MEMORY\.md$/i.test(a)) continue; const arq = path.join(md, a); let tx = '';
      try { const t = fs.readFileSync(arq, 'utf8'), m = t.match(/description:\s*(.+)/); tx = (m ? m[1] : primeiras(t, 1)).trim(); } catch { } const st = fs.statSync(arq);
      memorias.push({ id: arq, tx: tx.slice(0, 140), quando: quando(st.mtime), t: +st.mtime }); } } } catch { }
  memorias.sort((a, b) => b.t - a.t);
  const skills = []; const sk = path.join(C.perfilClaude(), 'skills');
  try { for (const d of fs.readdirSync(sk, { withFileTypes: true })) { if (!d.isDirectory()) continue; let desc = ''; try { const m = fs.readFileSync(path.join(sk, d.name, 'SKILL.md'), 'utf8').match(/description:\s*"?(.+?)"?\s*$/m); desc = m ? m[1] : ''; } catch { } skills.push({ n: d.name, d: desc.length > 90 ? desc.slice(0, 90) + '…' : desc }); } } catch { }
  return { regras, memorias: memorias.slice(0, 30), memPasta: 'perfil\\claude\\projects\\…\\memory', skills };
}
function esquecerNota(arq) {
  const base = path.join(C.perfilClaude(), 'projects'); arq = path.resolve(String(arq));
  if (!arq.toLowerCase().startsWith(base.toLowerCase()) || !/\.md$/i.test(arq) || !fs.existsSync(arq)) return false;
  try { const idx = path.join(path.dirname(arq), 'MEMORY.md'); if (fs.existsSync(idx)) { const L = fs.readFileSync(idx, 'utf8').split(/\r?\n/); fs.writeFileSync(idx, L.filter(l => !l.includes(path.basename(arq))).join('\n'), 'utf8'); } } catch { }
  return shell.trashItem(arq).then(() => { registrar('MEMÓRIA esquecida: ' + path.basename(arq)); return true; }).catch(() => false);
}
function abrirArq(base, rel) {
  if (!base) return; let alvo = rel === '..' ? path.dirname(base) : rel ? path.resolve(base, rel) : memDir(base);
  if (!rel && !fs.existsSync(alvo)) alvo = path.dirname(alvo);
  if (!fs.existsSync(alvo)) return;
  if (fs.statSync(alvo).isDirectory()) shell.openPath(alvo); else cp.spawn('notepad.exe', [alvo], { detached: true, stdio: 'ignore' }).unref();
}
const SESS_CACHE = new Map();
async function fichaDados(dir) {
  const r = { instr: '', mem: [], conversas: [] };
  try { r.instr = primeiras(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 3); if (r.instr.length > 240) r.instr = r.instr.slice(0, 240) + '…'; } catch { }
  const doc = (a) => path.join(dir, 'docs', a);
  try { const st = fs.statSync(doc('PARADA.md')); r.mem.push({ n: 'PARADA.md', d: 'onde parou · ' + quando(st.mtime).split(' ')[0], arq: 'docs\\PARADA.md' }); } catch { }
  if (fs.existsSync(doc('CONTEXTO.md'))) r.mem.push({ n: 'CONTEXTO.md', d: 'ficha do projeto', arq: 'docs\\CONTEXTO.md' });
  try { const n = fs.readdirSync(doc('contexto')).filter(a => /\.md$/i.test(a)).length; if (n) r.mem.push({ n: 'contexto\\', d: `${n} ${n === 1 ? 'arquivo' : 'arquivos'} de detalhe`, arq: 'docs\\contexto' }); } catch { }
  try { const n = fs.readdirSync(memDir(dir)).filter(a => /\.md$/i.test(a) && !/^MEMORY\.md$/i.test(a)).length; r.mem.push({ n: 'Memória do Claude', d: n ? `${n} ${n === 1 ? 'nota' : 'notas'} sobre este projeto` : 'nenhuma nota ainda', arq: '' }); } catch { r.mem.push({ n: 'Memória do Claude', d: 'nenhuma nota ainda', arq: '' }); }
  try { const S = await sdk(); const cx = SESS_CACHE.get(dir); const L = cx && Date.now() - cx.t < 30000 ? cx.L : (await comPrazo(S.listSessions({ dir, limit: 4 }), 4000) || []); SESS_CACHE.set(dir, { t: Date.now(), L });
    r.conversas = L.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0)).slice(0, 4).map(s => ({ id: s.sessionId, txt: String(s.customTitle || s.summary || s.firstPrompt || 'Conversa').replace(/\s+/g, ' ').slice(0, 120), quando: quando(s.lastModified || Date.now()) })); } catch (e) { logApp('ficha: ' + e.message); }
  return r;
}

// ---- drafts (25/10/2026, user request): closed free chat never vanishes. List comes from disk (conversations Claude Code saves
// in ~\.claude\projects\<free chat folder>; old ones merged there during move); fcc-rascunhos.json keeps only name given
// by user and what left (deleted = Recycle Bin; became project). Opening an old one copies conversation to current free chat folder.
const RASC = C.dados('fcc-rascunhos.json');
const lerRasc = () => { try { return JSON.parse(fs.readFileSync(RASC, 'utf8')); } catch { return {}; } };
const gravarRasc = (r) => { if (!QUIETO) try { fs.writeFileSync(RASC, JSON.stringify(r, null, 1), 'utf8'); } catch { } };
const sessArq = (dir, id) => path.join(C.perfilClaude(), 'projects', chaveProj(dir), id + '.jsonl');
const dirsLivres = () => [LIVRE];   // old free conversations were merged here during move to FCC
async function rascunhos() {
  const R = lerRasc(), S = await sdk(), L = [], vistos = new Set();
  for (const d of dirsLivres()) {
    if (!fs.existsSync(path.dirname(sessArq(d, 'x')))) continue;
    let s = []; try { s = await comPrazo(S.listSessions({ dir: d }), 8000) || []; } catch (e) { logApp('rascunhos: ' + e.message); }
    for (const x of s) {
      if (vistos.has(x.sessionId) || (R[x.sessionId] || {}).fim || !fs.existsSync(sessArq(d, x.sessionId))) continue; vistos.add(x.sessionId);
      const gen = (y) => !y || /^chat livre( \(local\))?$/i.test(y), t = (R[x.sessionId] || {}).titulo || (!gen(x.customTitle) && x.customTitle) || (!gen(x.summary) && x.summary) || x.firstPrompt;   // app names every free conversation "chat livre": then 1st message applies
      if (!t) continue;                                                    // opened and never used: nothing to save
      L.push({ id: x.sessionId, dir: d, titulo: String(t).replace(/\s+/g, ' ').trim().slice(0, 90), t: x.lastModified || 0, quando: quando(x.lastModified || Date.now()) });
    }
  }
  return L.sort((a, b) => b.t - a.t);
}
function levarConversa(id, de, para) {
  const a = sessArq(de, id), b = sessArq(para, id);
  if (a.toLowerCase() !== b.toLowerCase() && fs.existsSync(a) && !fs.existsSync(b)) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
}
const paraLixeira = (arq) => cp.execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${arq.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`], { windowsHide: true });
async function rascunhoAcao(ac, id, v) {
  const L = await rascunhos(), c = L.find(x => x.id === id); if (!c) return { ok: false, erro: 'Esse rascunho não existe mais.' };
  const R = lerRasc(); R[id] = R[id] || {};
  if (ac === 'abrir') { levarConversa(id, c.dir, LIVRE); return { ok: true }; }
  if (ac === 'renomear') { R[id].titulo = String(v || '').trim().slice(0, 90); gravarRasc(R); return { ok: true }; }
  if (ac === 'apagar') { try { paraLixeira(sessArq(c.dir, id)); } catch (e) { return { ok: false, erro: 'Não consegui mandar para a Lixeira: ' + e.message }; }
    R[id].fim = 'apagado ' + new Date().toISOString(); gravarRasc(R); registrar(`RASCUNHO para a Lixeira: ${c.titulo}`); return { ok: true }; }
  if (ac === 'projeto') {
    const n = String(v || '').trim();
    if (!n || /[\\/:*?"<>|]/.test(n) || /^[._]/.test(n)) return { ok: false, erro: 'Nome de pasta inválido (sem \\ / : * ? " < > | e sem começar com . ou _).' };
    const dir = path.join(RAIZ, n); if (fs.existsSync(dir)) return { ok: false, erro: `Já existe a pasta ${n}.` };
    const d = new Date(), dt = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    fs.mkdirSync(path.join(dir, 'docs', 'contexto'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), `# ${n}: nasceu do rascunho "${c.titulo}" (chat livre, ${dt}). Descrever em 1 linha.\r\n- Fase 1 (discussão, skill projeto-novo): sem código antes do aval.\r\n@docs/PARADA.md\r\n@docs/CONTEXTO.md\r\n`, 'utf8');
    fs.writeFileSync(path.join(dir, 'docs', 'PARADA.md'), `# PARADA ${n} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}\r\nParado: projeto criado do rascunho "${c.titulo}"; a conversa de origem continua nesta pasta.\r\nPróximo: fase 1 (discussão) do projeto-novo.\r\n`, 'utf8');
    fs.writeFileSync(path.join(dir, 'docs', 'CONTEXTO.md'), `Estado: fase 1 (discussão), sem código.\r\nOrigem: rascunho do chat livre "${c.titulo}" (${dt}).\r\n`, 'utf8');
    levarConversa(id, c.dir, dir);
    R[id].fim = 'projeto ' + n; gravarRasc(R); registrar(`RASCUNHO virou projeto: ${c.titulo} -> ${n}`);
    rodarLancador();   // new icon beside the project
    return { ok: true, dir, n };
  }
  return { ok: false, erro: 'ação desconhecida' };
}
// 25/10 (user request, house standard): every root project has its icon (launcher) beside folder; any missing = rebuild icons
// Launcher (optional, not shipped): <root>\lancador\fazer-lancadores.ps1. Older copies find projects two folders up, which
// in this layout is OUTSIDE the root, so only a script that takes -Raiz runs, and it gets projects\ (03/11, task 10).
function lancador() {
  const f = path.join(C.raiz(), 'lancador', 'fazer-lancadores.ps1');
  try { if (/\[string\]\s*\$Raiz\b/i.test(fs.readFileSync(f, 'utf8'))) return f; registrar('ICONES: lancador sem -Raiz, nao rodei (escreveria fora da pasta do FCC)'); } catch { }
  return null;
}
function rodarLancador() {
  const f = lancador(); if (!f) return false;
  cp.spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', f, '-Raiz', RAIZ], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return true;
}
// Win11 menu (lancador\menu\instalar-menu.ps1, Appx package): lives outside the root, so it is a system item with its own undo.
function registrarMenuWin11() {
  cp.execFile('reg', ['query', 'HKCU\\Software\\FCC', '/v', 'MenuNovo'], { windowsHide: true }, (e, out) => {
    const m = !e && /MenuNovo\s+REG_SZ\s+(.+)/i.exec(String(out)); if (!m) return;
    const dir = m[1].trim(), raiz = C.raiz().toLowerCase().replace(/[\\/]+$/, '') + path.sep;
    if (!(dir.toLowerCase() + path.sep).startsWith(raiz)) return;   // another FCC installed it: not ours
    try { INV.registrar({ programas: [{ nome: 'Menu do Windows 11 do FCC', desinstalar: `powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(dir, 'instalar-menu.ps1')}" -Remover` }] }); } catch { }
  });
}
function conferirIcones() {
  if (QUIETO || !lancador()) return; registrarMenuWin11();
  try { const falta = fs.readdirSync(RAIZ, { withFileTypes: true }).filter(d => d.isDirectory() && !/^[._]/.test(d.name) && fs.existsSync(path.join(RAIZ, d.name, 'CLAUDE.md')) && !fs.existsSync(path.join(RAIZ, d.name + '.exe'))).map(d => d.name);
    if (falta.length) { registrar('ICONES: faltavam ' + falta.join(', ')); rodarLancador(); } } catch { }
}
// "Para testar": checked items become [x] in project's docs/PRA-TESTAR.md (logic in pra-testar.js, tested by testar-lista.js)
ipcMain.handle('testes-feitos', (e, dir, itens) => {
  try { const r = require('./pra-testar').marcar(path.join(dir, 'docs', 'PRA-TESTAR.md'), itens); if (r.ok) registrar(`TESTES marcados como feitos em ${path.basename(dir)}: ${r.n}`); return r; }
  catch (er) { return { ok: false, erro: er.message }; }
});
ipcMain.handle('rascunhos', () => QUIETO ? [] : rascunhos().catch(e => { logApp('rascunhos: ' + e.message); return []; }));
ipcMain.handle('rascunho', (e, ac, id, v) => QUIETO ? { ok: false } : rascunhoAcao(ac, id, v).catch(er => ({ ok: false, erro: er.message })));
// ---- window ----
app.whenReady().then(() => {
  if (SAINDO) return;
  setTimeout(() => { sdk().catch(() => { }); infoPC().catch(() => { }); conferirIcones(); claudeVersao().catch(() => { }); if (!QUIETO) { catalogo().catch(() => { }); acharGGUFcache().catch(() => { }); } }, 2500);
  if (!QUIETO) setTimeout(() => { if (OP.autoAtual !== '0') procurarAtualizacao('ao abrir'); }, 15000);   // auto-update check, after warm-up   // warm up slow stuff before 1st click                       // closing to apply pending update
  lerOpcoes();
  const teste = QUIETO;
  const [lw, la] = TAM[OP.tam === 'min' ? 'min' : 'max'];
  const opts = { width: teste ? (process.env.CCT_TESTE_MIN ? 1080 : 1440) : lw, height: teste ? (process.env.CCT_TESTE_MIN ? 608 : 810) : la, minWidth: 1080, minHeight: 608, frame: false, backgroundColor: OP.tema === 'escuro' ? '#202124' : '#dfe3e8', title: 'Claude Code',
    icon: path.join(__dirname, 'icone.ico'), show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, backgroundThrottling: !teste } };   // test: offscreen window keeps painting (shot)
  if (teste) { opts.x = -4000; opts.y = 100; opts.skipTaskbar = true; }
  win = new BrowserWindow(opts);
  win.setMenu(null);
  win.webContents.on('console-message', (e, ...a) => { const m = e.message || a[1]; const nv = e.level || a[0]; if (nv === 'error' || nv === 'warning' || nv >= 2) logApp('console: ' + m); if ((nv === 'error' || nv === 3) && /Uncaught|is not a function|is not defined|Cannot read/.test(String(m))) { ERROS_JS++; if (ERROS_JS === 1) ERRO_JS1 = String(m).slice(0, 160); } });
  // right click: copy / paste (window has no menu)
  win.webContents.on('context-menu', (e, p) => {
    const itens = [];
    if (p.isEditable) itens.push({ role: 'cut', label: 'Recortar', enabled: !!p.selectionText }, { role: 'copy', label: 'Copiar', enabled: !!p.selectionText }, { role: 'paste', label: 'Colar' }, { type: 'separator' }, { role: 'selectAll', label: 'Selecionar tudo' });
    else if (p.selectionText) itens.push({ role: 'copy', label: 'Copiar' });
    if (itens.length) Menu.buildFromTemplate(itens).popup({ window: win });
  });
  win.webContents.on('render-process-gone', (e, d) => logApp('tela caiu: ' + JSON.stringify(d)));
  win.webContents.on('preload-error', (e, p, err) => logApp('preload: ' + err));
  if (teste) win.setContentSize(1440, 810); else aplicarTamanho(true);
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(1));
  if (!teste) criarBandeja();
  win.loadFile(path.join(__dirname, 'tela', 'index.html'));
  win.once('ready-to-show', () => { if (teste) win.showInactive(); else win.show(); if (TESTE.roteiro) setTimeout(rodarRoteiro, 500); });
  win.on('maximize', () => enviar('max', true)); win.on('unmaximize', () => enviar('max', false));
  win.on('close', (e) => {
    if (!SAINDO && !QUIETO && OP.fechar !== 'sair') { e.preventDefault(); win.hide(); avisarBandeja(); return; }   // ✕ (or Alt+F4) hides to tray; quit = hold ✕ 1 s or "Sair" in tray
    pararTudo();
  });
});
// single instance: opening again brings up already-open window
// (tests skip the lock: run beside open copy without bringing it forward)
if (!QUIETO && !app.requestSingleInstanceLock()) app.quit();
// new .exe waiting in temp\atualizacao\pendente (build doesn't close app: Claude runs inside). Applied by watcher
// (resources\app\ferramentas\atualizar.js, run by this exe as node): waits for this app to close, copies and reopens with --atualizou.
const PENDENTE = C.temp('atualizacao', 'pendente'), VIGIA = path.join(process.resourcesPath || CCT, 'app', 'ferramentas', 'atualizar.js'), NODE = process.execPath;
function soltarVigia() { if (!fs.existsSync(PENDENTE) || !fs.existsSync(VIGIA) || !fs.existsSync(NODE)) return false; cp.spawn(NODE, [VIGIA], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', FCC_RAIZ: CCT }, detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(VIGIA) }).unref(); return true; }
let SAINDO = false;
// auto-update (03/11): GitHub releases/latest -> download, check, extract into PENDENTE; watcher applies on close
const ATUAL = { rodando: null, ultimo: null };
function procurarAtualizacao(motivo) {
  if (ATUAL.rodando) return ATUAL.rodando;
  const pode = app.isPackaged && path.dirname(process.execPath).toLowerCase() === CCT.toLowerCase();
  if (!pode && !process.env.FCC_TESTE_API) return Promise.resolve(ATUAL.ultimo = { estado: 'erro', versao: '', erro: 'só a cópia instalada procura atualização', quando: Date.now() });
  enviar('atualizacao', { estado: 'procurando' });
  ATUAL.rodando = require('./atualizacao.js').procurar({ atual: app.getVersion(), pasta: path.dirname(PENDENTE), progresso: (b, t) => enviar('atualizacao', { estado: 'baixando', pct: t ? Math.round(b * 100 / t) : 0 }) })
    .catch(e => ({ estado: 'erro', versao: '', erro: e.message }))
    .then(r => { r.quando = Date.now(); ATUAL.ultimo = r; ATUAL.rodando = null; logApp('atualização (' + motivo + '): ' + r.estado + ' ' + (r.versao || '') + ' ' + (r.erro || ''));
      if (r.estado === 'pronta' && pode) soltarVigia();
      enviar('atualizacao', r); return r; });
  return ATUAL.rodando;
}
ipcMain.handle('atualizar-procurar', () => QUIETO && !process.env.FCC_TESTE_API ? { estado: 'erro', erro: 'teste não procura atualização' } : procurarAtualizacao('botão'));
if (!QUIETO && app.isPackaged && path.dirname(process.execPath).toLowerCase() === CCT.toLowerCase() && soltarVigia()) {
  logApp('atualização pendente: fechando para o vigia aplicar'); SAINDO = true;
  // 25/10: before, it vanished silently and icon seemed not to open (user rebooted PC, thought it failed): warn and exit
  app.whenReady().then(() => { const w = new BrowserWindow({ width: 380, height: 104, frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: false, backgroundColor: '#14161d', title: 'FCC', icon: path.join(__dirname, 'icone.ico') });
    w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="margin:0;font:14px Segoe UI,sans-serif;color:#f1f3f9;background:#14161d;display:flex;align-items:center;gap:14px;padding:0 22px;height:100vh;box-sizing:border-box;-webkit-app-region:drag"><div style="width:18px;height:18px;border:2px solid #ff7849;border-right-color:transparent;border-radius:50%;animation:g .8s linear infinite"></div><div><b>Atualizando o FCC…</b><div style="color:#8a92aa;font-size:12px;margin-top:3px">Ele abre sozinho em alguns segundos.</div></div><style>@keyframes g{to{transform:rotate(360deg)}}</style></body>'));
    setTimeout(() => app.quit(), 1800); });          // opening with pending build (e.g. after PC reboot), apply first
}
app.on('second-instance', (e, argv) => {
  const ip = argv.indexOf('--projeto'); if (ip >= 0 && argv[ip + 1] && win) { mostrarJanela(); enviar('abrir-projeto', argv[ip + 1]); return; }   // project icon at root (launcher)
  if (argv.includes('--reiniciar-para-atualizar') && win) { logApp('reiniciar para atualizar (pedido pelo build)'); soltarVigia(); enviar('reiniciar'); setTimeout(() => { if (win && !win.isDestroyed()) sairDeVerdade(); }, 8000); return; }
  mostrarJanela();
});
app.on('window-all-closed', () => app.quit());
