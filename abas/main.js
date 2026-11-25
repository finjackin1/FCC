// Claude Code with tabs (21/oct/2026): Electron main process.
// FCC (was iniciar-claude). Replaces console menu of iniciar-claude.bat (backup still works): same logic (projects, PARADA, account, setup, briefing),
// with UI of proposal C "Chrome" (docs\prototipos\abas\ESCOLHIDA). Each tab runs claude.exe in a real terminal (ConPTY).
'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, screen, Notification } = require('electron');
// UI requests slower than 150 ms go to log: where the app "hangs" (23/10, optimization)
{ const h = ipcMain.handle.bind(ipcMain); ipcMain.handle = (n, fn) => h(n, async (...a) => { const t0 = Date.now(); try { if (PORTAO_RESTAURO.has(n) && typeof RESTAURADO !== 'undefined') await RESTAURADO; return await fn(...a); } finally { const ms = Date.now() - t0; if (ms > 150 && typeof logApp === 'function') logApp(`lento: ${n} ${ms} ms`); } }); }
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const pty = require('@lydell/node-pty');

const C = require('./caminhos');
const P = require('./perfil');
const INV = require('./inventario');
const REST = require('./restaurar');
const PASTA = require('./pasta');
const PORTAO_RESTAURO = new Set(['dados', 'projetos', 'preparar', 'conta', 'contas', 'conta-usar', 'chat-abrir', 'pasta-dados', 'pasta-acao']);   // wait for a pending profile restore first
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
// modelo = Claude alias (fable/opus/sonnet/haiku) for next tabs; esforco = thinking (low..max)
const OP = { explorer: '1', excRapido: '0', modelo: 'sonnet', esforco: 'medium', texto: '', barraUso: 'atual', autoConta: '1', pctUso: '1', pastas: '', codigo: '0', auto: '1', lembrar: '1', tema: 'claro', painel: '1', passos: '0', passagem: '100000',
  tam: 'max', perm: 'default', avisoFim: '1', enter: 'continuar', camada: '', mcp: '', autoAtual: '1' };   // 24/10: camada = user's PERSONAL skills folder (besides casa\skills); mcp = MCP folder (empty = casa)   // 23/10: interface 2 (AI window, Options, tray, ExitLag size)
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
// house skills only exist if the profile has them: option set but skill missing = behave as normal
// 02/11 (user request): Ultracave mode removed; both AIs always get this short brevity line instead (no skill needed)
const ASSIST_REGRA = 'Você está na janelinha do assistente do FCC (atalho Ctrl+Alt+Espaço). Responda em 1 a 3 frases curtas, em texto corrido simples, sem markdown, listas ou código: a resposta pode ser lida em voz alta. Conversa e perguntas rápidas: fique no modelo pequeno. Tarefa de verdade (mexer em arquivos, programar, pesquisar a fundo): chame trocar_modelo antes, com o modelo e pensamento que a tarefa pede.';
const BREVE = 'Seja breve em todas as respostas: vá direto ao ponto, sem introdução, sem repetir o pedido, sem resumo no fim e sem oferecer o que não foi pedido. Breve não é incompleto: faça o trabalho inteiro e mantenha tudo o que muda o resultado (passos, números, nomes de arquivo, avisos, código pedido).';
// ---- CCT home (24/10, user request): clean skeleton independent of anyone's personal stuff ----
// casa\REGRAS.md (core, in every conversation) · skills\ (local plugin "casa" → /casa:<name>) · memoria\claude.md
// · apelidos.txt · projetos\_modelo · mcp.json. Personal layer: OP.camada.
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
function regrasCasa(ia, semMemoria) {
  const ap = apelidos().filter(l => !/\.local\s*=/.test(l)).map(l => l.replace(/\s*=\s*/, '=')).join(', ') || 'nenhum';   // "x.local = y": old local-AI aliases, ignored
  // 24/10: user with own rules (conta\config\CLAUDE.md) gets only 1 home line (avoids ~300 repeated tokens per conversation)
  const proprias = ia === 'claude' && fs.existsSync(path.join(C.configClaude(), 'CLAUDE.md'));
  const nucleo = proprias ? `FCC home: ${CASA} (skills /casa:*; aliases: ${ap}).`   // 25/10: internal text in terse English (fewer tokens); reply stays Portuguese
    : lerCasa('REGRAS.md').replace(/\{CASA\}/g, CASA).replace(/\{APELIDOS\}/g, ap);
  return [nucleo, ia === 'claude' && !semMemoria ? lerCasa('memoria/claude.md') : ''].filter(Boolean).join('\n');
}
const appendClaude = (assist, semMemoria) => [regrasCasa('claude', semMemoria), OP.codigo === '1' ? '' : SEM_CODIGO, INSTRUCAO(), BREVE, assist ? ASSIST_REGRA : ''].filter(Boolean).join('\n\n');
// RULES LIVE (12/11): fingerprint of what a Claude conversation reads as rules when it opens = FCC append + CLAUDE.md of the account config,
// the profile and the folder + its parents (with their @imports). Memory and state docs (memoria, PARADA, CONTEXTO) do NOT count:
// they change all the time and are read on demand. Changed before a message = conversation reopens (resume) and the message goes to the new one.
function assinaturaRegras(o, assist) {
  const h = crypto.createHash('sha1'), vistos = new Set();
  const ler = (f, nivel) => {
    const k = path.resolve(f).toLowerCase(); if (vistos.has(k) || nivel > 4 || /[\\/]memoria[\\/]|PARADA\.md$|CONTEXTO\.md$/i.test(f)) return; vistos.add(k);
    let t; try { t = fs.readFileSync(f, 'utf8'); } catch { return; }
    h.update(k + '\n' + t);
    for (const m of t.matchAll(/^@(\S+)/gm)) ler(path.resolve(path.dirname(f), m[1].replace(/^~[\\/]/, os.homedir() + path.sep)), nivel + 1);
  };
  h.update(appendClaude(assist, true));
  const dirs = [C.configClaude(), C.perfilClaude()];
  for (let d = o.dir && path.resolve(o.dir); d; d = path.dirname(d) === d ? null : path.dirname(d)) dirs.push(d);
  for (const d of dirs) for (const n of ['CLAUDE.md', path.join('.claude', 'CLAUDE.md'), 'CLAUDE.local.md']) ler(path.join(d, n), 0);
  return h.digest('hex');
}
async function reabrirPorRegras(c) {
  const id = c.o.id; registrar('REGRAS mudaram: ' + c.o.dir);
  AJUDANTES.pararDaAba(id); fecharChat(id);
  const r = await abrirChat({ ...c.o, modo: 'resume', sessao: c.sessao, ate: null, aviso: null, prefixo: null, passagem: false, modelo: c.modelo, esf: c.esf });
  const n = CHATS.get(id); if (n && c.auto) n.auto = c.auto;
  enviar('chat:regras', id, { erro: r && (r.erro || (r.semConversa && 'conversa não encontrada')) });
  return n;
}
// built-in rule (always, also in pure mode): where things go; the only instruction FCC adds by itself
const INSTRUCAO = () => `Programas, ferramentas e arquivos criados vão para as pastas do FCC (ferramentas\\ e temp\\ dentro de ${C.raiz()}). Instalar algo no sistema só se não houver outro jeito, e avise antes. Arquivos temporários: apague assim que não servirem mais; temp\\ nunca passa de 15 GB.`;
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
// 08/11 bug (user report): app closed without beforeunload (update/crash/shutdown) → project kept a conversation from hours before,
// "Continuar" reopened it and the work done after was invisible. Main records it itself after every reply and every passagem.
function anotarConversa(c, sessao) {
  if (QUIETO || !c || !c.o || !c.o.dir || c.o.modo === 'livre') return;
  try { const k = c.o.dir.toLowerCase(), conv = lerConversas(), v = conv[k] || {}, d = new Date();
    let txt = String(c.ultResp || '').replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim(); if (txt.length > 220) txt = txt.slice(0, 220) + '…';
    conv[k] = { ...v, dir: c.o.dir, sessao: sessao || c.sessao, modelo: c.modelo || v.modelo, esf: c.esf || v.esf, pensar: c.o.pensar != null ? c.o.pensar : v.pensar, quando: `${ddmm(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`, txt: txt || v.txt || '' };
    fs.writeFileSync(CONVERSAS, JSON.stringify(conv, null, 1), 'utf8'); } catch (e) { logApp('anotarConversa: ' + e.message); }
}
// newest conversation of a passagem chain (elos keep insertion order: last child = newest)
function pontaDoElo(s) {
  const e = lerElos(), filhos = {}; for (const [n, a] of Object.entries(e)) filhos[a] = n;
  for (let i = 0, vistos = new Set([s]); i < 200 && filhos[s] && !vistos.has(filhos[s]); i++) { s = filhos[s]; vistos.add(s); }
  return s;
}
function lerProjetos() {
  const ult = ultimasAberturas(), conv = lerConversas();
  const raizes = [RAIZ, ...OP.pastas.split(';').map(s => s.trim()).filter(s => s && fs.existsSync(s))];
  const lista = [];
  // 24/11: any subfolder of a projects folder is a project (new users have no CLAUDE.md); an added folder that is itself a project counts alone
  const ehProj = (d) => ['CLAUDE.md', '.git'].some(x => fs.existsSync(path.join(d, x)));
  for (const r of raizes) {
    let ds = []; try { ds = fs.readdirSync(r, { withFileTypes: true }).filter(d => d.isDirectory() && !/^[_.]/.test(d.name)).sort((a, b) => a.name.localeCompare(b.name)).map(d => path.join(r, d.name)); } catch { }
    if (r !== RAIZ && ehProj(r) && !ds.some(ehProj)) ds = [r];   // folder of projects has project subfolders; a project folder does not
    for (const dir of ds) if (!lista.some(p => p.dir.toLowerCase() === dir.toLowerCase())) { const p = lerProjeto(dir, ult); p.ult = conv[dir.toLowerCase()] || null; lista.push(p); }
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
let CLAUDE_EXE = '';   // 24/11: found once, kept while the file exists ("where" blocks the main process)
function acharClaude() {
  if (CLAUDE_EXE && fs.existsSync(CLAUDE_EXE)) return CLAUDE_EXE;
  const propria = C.ferramentas('claude', 'claude.exe');
  if (fs.existsSync(propria)) return (CLAUDE_EXE = propria);
  const local = path.join(os.homedir(), '.local', 'bin', 'claude.exe');   // fora: leitura
  if (fs.existsSync(local)) return (CLAUDE_EXE = local);
  try { const r = cp.execSync('where claude', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).split(/\r?\n/).filter(Boolean); const exe = r.find(x => /\.exe$/i.test(x)) || r[0]; if (exe) return (CLAUDE_EXE = exe); } catch { }
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
// SDK error texts come in English: show the ones the user can act on in pt-BR
function ptSdk(t) { return /^s*Not logged in/i.test(String(t || '')) ? 'Sua conta do Claude saiu. Clique na conta (embaixo, à esquerda) e entre de novo.' : t; }
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


let win = null;
function enviar(canal, ...a) { if (/^assist/.test(String(a[0])) && ASSIST) return ASSIST.enviar(canal, ...a); if (win && !win.isDestroyed()) win.webContents.send(canal, ...a); }   // assistant window's conversations (ids 'assist…') go to it
let ASSIST = null;   // assistente.js (V1 11/11)

// ---- conversation (chat proposal C, 21/oct/2026): each tab talks to Claude Code via official library (Agent SDK),
// running user's claude.exe (same account, rules, skills, hooks). App draws chat and answers permissions. ----
let SDK = null;
const sdk = async () => SDK || (SDK = await import('@anthropic-ai/claude-agent-sdk'));
const CHATS = new Map();
const NUVEM = ['fable', 'opus', 'sonnet', 'haiku'];
function cortar(v, n = 400) {
  if (typeof v === 'string') return v.length > n ? v.slice(0, n) + '…' : v;
  if (v && typeof v === 'object') { const o = Array.isArray(v) ? [] : {}; for (const k of Object.keys(v).slice(0, 50)) o[k] = cortar(v[k], n); return o; }
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
    return { type: 'assistant', id: m.message && m.message.id, uuid: m.uuid, content: c.map(b => b.type === 'text' ? { type: 'text', text: ptSdk(b.text) } : b.type === 'thinking' ? { type: 'thinking', thinking: b.thinking || '' }
      : b.type === 'tool_use' ? { type: 'tool_use', id: b.id, name: b.name, input: cortar(b.input, 4000) } : { type: b.type }) };
  }
  if (m.type === 'user') {
    const c = m.message && m.message.content;
    if (typeof c === 'string') return { type: 'user', uuid: m.uuid, texto: cortar(c, 4000), meta: !!m.isMeta };
    const res = (c || []).filter(b => b.type === 'tool_result').map(b => { const t = textoDe(b.content); return { id: b.tool_use_id, erro: !!b.is_error, linhas: t ? t.split('\n').length : 0, txt: cortar(t, 4000) }; });
    return { type: 'user', uuid: m.uuid, resultados: res, texto: cortar(textoDe(c), 4000), meta: !!m.isMeta };
  }
  if (m.type === 'result') { const u = m.usage || {}; return { type: 'result', subtype: m.subtype, erro: !!m.is_error, texto: ptSdk(cortar(m.result || (m.errors || []).join(' '), 600)), ms: m.duration_ms || 0,
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
  f.por = (txt, uid) => { f.itens.push({ type: 'user', message: { role: 'user', content: txt }, parent_tool_use_id: null, origin: { kind: 'human' }, ...(uid ? { uuid: uid } : {}) }); if (f.acorda) { f.acorda(); f.acorda = null; } };
  f.fechar = () => { f.fim = true; if (f.acorda) { f.acorda(); f.acorda = null; } };
  f.iter = (async function* () { while (!f.fim) { if (f.itens.length) yield f.itens.shift(); else await new Promise(r => { f.acorda = r; }); } })();
  return f;
}
// ---- permissions + FCC tools (fcc-ferr.js, served in-process to Claude) ----
const F = require('./fcc-ferr.js');
const NAV = require('./navegador.js');   // Prévia panel = Claude's browser
const CADEIA_PASTA = new Set();
function escopoPerm(tool, input) {
  if (/^(Read|Grep|Glob|LS|WebSearch|WebFetch|TodoWrite|TodoRead|NotebookRead)$/.test(tool) || /^mcp__fcc__/.test(tool)) return 'seguro';
  if (tool === 'PowerShell' || tool === 'Bash') {
    const cmd = String((input && (input.command || input.CommandLine || input.cmd)) || '');
    if (/\b(format|diskpart|cipher\s+\/w|bcdedit|reg\s+delete|sc\s+delete|git\s+push\s+--force|git\s+reset\s+--hard|git\s+clean\s+-[fd]|rm\s+-rf\s+[\/\\~]|del\s+\/[sqf]|rd\s+\/s|rmdir\s+\/s|Remove-Item\b.*-Recurse(?!.*temp))\b/i.test(cmd)) return 'perigoso';
    if (/^\s*(git\s+(status|diff|log|show|branch)|dir|ls|cat|type|where|which|Get-(ChildItem|Content|Item|Location)|Test-Path|Select-String|node\s+(-v|--version|-c\b))\b/i.test(cmd) && !/[|;&><`]|\b(Remove-Item|del|rm|mv|cp|Set-Content|Out-File|New-Item)\b/i.test(cmd)) return 'seguro';
  }
  return 'cadeia';
}
function pedirPerm(c, o) {
  return (tool, input, x) => {
    const esc = escopoPerm(tool, input);
    if (tool !== 'AskUserQuestion' && tool !== 'ExitPlanMode') {
      if (c.modo === 'plan' && esc !== 'seguro') return Promise.resolve({ behavior: 'deny', message: 'Modo Planejar: só leitura. Termine o plano e chame ExitPlanMode.' });
      if (esc === 'seguro') return Promise.resolve({ behavior: 'allow', updatedInput: input });
      if (esc !== 'perigoso' && ((c.modo === 'auto' && !c.classif) || c.cadeiaTurno || c.cadeiaPasta || CADEIA_PASTA.has((o.dir || '').toLowerCase()))) {
        return Promise.resolve({ behavior: 'allow', updatedInput: input, cadeia: c.cadeiaPasta ? 'pasta' : 'turno' });
      }
    }
    return new Promise((ok) => {
      const req = crypto.randomUUID(); c.perms.set(req, { ok, tool, input, sug: x && x.suggestions });
      if (x && x.signal) x.signal.addEventListener('abort', () => { if (c.perms.delete(req)) { ok({ behavior: 'deny', message: 'cancelado' }); enviar('chat:perm-fim', o.id, req); } });
      enviar('chat:perm', o.id, { req, tool, input: cortar(input, tool === 'ExitPlanMode' ? 20000 : 600) });
    });
  };
}
function rodarAjuda(exe, args, o) {   // headless second opinion; stdin closed (claude -p would wait on it)
  return new Promise((ok) => {
    let out = '', err = ''; const p = cp.spawn(exe, args, { ...o, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const t = setTimeout(() => { try { cp.execFile('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }, () => { }); } catch { } }, 15 * 60000);
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
    p.on('error', (e) => { clearTimeout(t); ok('erro: ' + e.message); });
    p.on('close', () => { clearTimeout(t); ok(out.trim().slice(-20000) || (err.trim() ? 'erro: ' + err.trim().slice(-500) : '(sem resposta)')); });
  });
}
async function ajudaDeOutroClaude(pedido, dir) {
  const claude = acharClaude(); if (!claude) return 'Não achei o Claude Code neste PC.';
  const env = cfgClaude().env; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
  return rodarAjuda(claude, ['-p', pedido, '--permission-mode', 'default', '--allowedTools', 'Read,Grep,Glob'], { cwd: dir, env });
}
async function trocarModeloFcc(c, aba, a) {
  if (!c) return 'conversa não encontrada';
  const tarefa = String(a.tarefa || '').slice(0, 60);
  if (!NUVEM.includes(a.modelo)) return 'modelo do Claude: haiku, sonnet ou opus';
  const esf = ['low', 'medium', 'high'].includes(a.pensamento) ? a.pensamento : c.esf;
  await aplicarAuto(c, aba, { modelo: a.modelo, esf, aviso: `Automático: ${a.modelo} · ${esf} (${tarefa})` }); return `ok: ${a.modelo}/${esf}`;
}
async function ferramentaFcc(aba, nome, a) {
  const c = CHATS.get(aba) || ([...CHATS.entries()].find(([k]) => String(k) === String(aba)) || [])[1] || null;
  const dir = c && c.o && c.o.dir ? c.o.dir : C.raiz();
  return F.executar(nome, a, { dir, casa: CASA, raiz: C.raiz(), inventario: INV,
    avisar: (t) => { try { new Notification({ title: 'FCC', body: t, icon: path.join(__dirname, 'icone.ico') }).show(); } catch (e) { logApp('avisar: ' + e.message); } },
    ajuda: (pedido) => ajudaDeOutroClaude(pedido, dir), modelo: (x) => trocarModeloFcc(c, aba, x) });
}
async function abrirChat(o) {
  // o = { id, dir, modo: continuar|retomar|nova|livre|resume, nome, sessao, modelo, esf }
  const assist = /^assist/.test(String(o.id));   // assistant window: small model by default, trocar_modelo always on
  if (!o.dir) return { erro: 'Não sei em qual pasta abrir essa conversa.' };   // 24/11 bug: ca.js "ultima" got the click event as project → dir undefined crashed abrirSessao
  const claude = acharClaude(); if (!claude) return { erro: 'Não achei o Claude Code neste Windows.' };
  const S = await sdk();
  const cfg = cfgClaude(), env = cfg.env; gitNoPath(env);
  for (const k of Object.keys(env)) if (/^CLAUDE_CODE_(CHILD_SESSION|ENTRYPOINT|MESSAGING_|SESSION_|SSE_PORT)|^CLAUDECODE$|^CLAUDE_PID$/.test(k)) delete env[k];
  try { Object.assign(env, INV.envInstaladores()); } catch (e) { logApp('env instaladores: ' + e.message); }
  env.TERM_PROGRAM = 'FCC'; env.FCC_ABA = String(o.id); env.FCC_PID = String(process.pid);   // orq.py workers: which conversation hears them, and they die if this program dies
  // 02/11 (user request): helpers run inside the turn, nothing left in the background after the task; long commands may take up to 1 h, 10 min when none is given
  env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = '1'; env.BASH_MAX_TIMEOUT_MS = '3600000'; env.BASH_DEFAULT_TIMEOUT_MS = '600000';
  if (!NUVEM.includes(o.modelo)) return { erro: 'Modelo desconhecido: ' + o.modelo };
  let sessao = o.sessao, historico = [];
  if (o.modo === 'resume' && !o.ate && sessao) { const p = pontaDoElo(sessao); if (p !== sessao) { logApp(`resume: ${sessao.slice(0, 8)} → ${p.slice(0, 8)} (ponta do elo)`); sessao = p; o = { ...o, sessao: p, antes: null }; } }
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
  const c = { fila, perms: new Map(), sessao, mud: retoma && !o.ate ? lerMud(sessao) : [], modo: OP.perm === 'auto' ? 'auto' : 'default', cadeiaTurno: false, cadeiaPasta: CADEIA_PASTA.has((o.dir || '').toLowerCase()), classif: OP.perm === 'auto' };   // classif: auto chosen in Options = classifier decides, what it asks becomes a card
  // auto mode = same as user's terminal (classifier decides; only what it would ask becomes permission card)
  const opts = { cwd: o.dir, env, model: o.modelo, permissionMode: c.modo, pathToClaudeCodeExecutable: claude, includePartialMessages: true, settingSources: ['user', 'project', 'local'],
    systemPrompt: { type: 'preset', preset: 'claude_code', append: appendClaude(assist) },
    plugins: pluginCasa(),
    canUseTool: pedirPerm(c, o), enableFileCheckpointing: true,   // checkpoints: "Voltar arquivos" per user message
    stderr: (d) => { if (/error/i.test(d)) logApp(`chat ${o.id}: ${String(d).slice(0, 300)}`); } };
  // extra tools (claude.ai connectors, MCP, app skills) off by default: fewer tokens on open (23/10, user request).
  // Toggles skill "ferramentas" via file <pasta>\.claude\ferramentas-ligadas; on change, conversation reopens by itself (vigiarFerramentas).
  c.ferr = ferramentasLigadas(o.dir); c.o = o; c.env = env; c.claude = claude;
  try { c.regras = assinaturaRegras(o, assist); } catch (e) { logApp('regras: ' + e.message); }   // rules live: compared before each message (chat-enviar)
  if (cfg.settings) opts.settings = cfg.settings;
  // measured 23/10 (intercepted request): 1st request 17,100 → 8,900 tokens
  if (!c.ferr) { Object.assign(env, { ENABLE_CLAUDEAI_MCP_SERVERS: 'false', CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: '1' }); opts.strictMcpConfig = true;
    // 25/10 (user request): Agent allowed (heavy search in subagent = smaller main conversation)
    let base = {}; if (cfg.settings) { try { base = JSON.parse(fs.readFileSync(cfg.settings, 'utf8').replace(/^﻿/, '')) || {}; } catch (e) { logApp('perfil settings: ' + e.message); } }   // SDK takes path OR object: merge profile into the object
    opts.settings = { ...base, skillOverrides: { ...(base.skillOverrides || {}), ... Object.fromEntries(skillsDoApp().map(n => [n, 'off'])) } }; opts.disallowedTools = ['Workflow', 'ScheduleWakeup', 'ReportFindings', 'ListAgents', 'Monitor']; }
  { opts.effort = o.esf; opts.thinking = { type: 'adaptive', display: 'summarized' }; opts.agentProgressSummaries = true; }   // 01/11: every subagent reports a one-line status (task_progress.summary)
  // auto mode (24/10, user request): Claude plans tasks and switches own model/thinking between them (trocar_modelo);
  // each switch becomes learning data (auto.js). Short instruction in server "instructions": only exists with auto on.
  // 08/11 (plan item 7): server always exists with FCC's own tools (fcc-ferr.js; deferred = no tokens until used)
  {
    const { z } = require('zod'), aut = OP.auto === '1' || assist;
    const tools = F.lista(['trocar_modelo']).map(d => S.tool(d.nome, d.descricao, F.zodSchema(z, d.campos), async (a) => {
      try { return { content: [{ type: 'text', text: String(await ferramentaFcc(o.id, d.nome, a)) }] }; } catch (e) { return { content: [{ type: 'text', text: 'erro: ' + e.message }], isError: true }; } }));
    if (aut) tools.unshift(S.tool('trocar_modelo', 'Troca modelo/pensamento desta conversa antes da próxima tarefa', { modelo: z.enum(['haiku', 'sonnet', 'opus']), pensamento: z.enum(['low', 'medium', 'high']), tarefa: z.string() },
        async (a) => { const r = { modelo: a.modelo, esf: a.pensamento, aviso: `Automático: ${{ haiku: 'Haiku 5.5', sonnet: 'Sonnet 5.5', opus: 'Opus 5.5' }[a.modelo]} · pensamento ${{ low: 'Baixo', medium: 'Médio', high: 'Alto' }[a.pensamento]} (${String(a.tarefa).slice(0, 60)})` };
          c.auto = c.auto || {}; auto().trocaDoClaude(c, a.modelo, a.pensamento, a.tarefa); await aplicarAuto(c, o.id, r);
          return { content: [{ type: 'text', text: `ok: ${a.modelo}/${a.pensamento}` }] }; }, { alwaysLoad: true }));
    if (!assist) tools.push(...NAV.ferramentas(S, z, o.id, (id) => enviar('previa:abrir', id)));   // 24/11: Claude's browser = Prévia panel
    opts.mcpServers = { fcc: S.createSdkMcpServer({ name: 'fcc', version: '1',
      instructions: (aut ? 'Token economy: split the request into tasks; per task pick the smallest model/thinking that gets it right; call trocar_modelo when a task needs another level. Default thinking low; medium/high only for the hard part, then back. Prefer changing only thinking: changing model re-reads the whole conversation (cache lost). ' + auto().dicas() + ' ' : '')
        + 'FCC tools: instalar_ferramenta before installing anything; salvar_parada / salvar_memoria to record state and durable facts; pedir_ajuda for a read-only second opinion (another Claude); avisar = Windows notice when a long task ends.' + (assist ? '' : ' Browser: whenever you need one (open, test or read a site or web app, log in), use navegador_* = the FCC Prévia panel he sees; never open an external browser.'),
      tools }) };
    opts.allowedTools = tools.map(t => 'mcp__fcc__' + t.name);
  }
  // auto off: thinking on/off from the tab's "pensar" switch
  if (OP.auto !== '1' && !assist) opts.thinking = o.pensar ? { type: 'enabled', budgetTokens: 8000, display: 'summarized' } : { type: 'disabled' };
  opts.disallowedTools = [...(opts.disallowedTools || []), 'EnterPlanMode'];   // Claude can't enter plan mode alone; user picks Planejar (ExitPlanMode = plan card)
  if (retoma) { opts.resume = sessao; if (o.ate) { opts.resumeSessionAt = o.ate; opts.forkSession = true; } }   // edited message: go back to that point in a conversation copy
  else { opts.sessionId = sessao; if (o.nome) opts.extraArgs = { name: o.nome }; }
  let q;
  try { q = S.query({ prompt: fila.iter, options: opts }); } catch (e) { logApp('chat: ' + e.message); return { erro: 'Não consegui abrir o Claude Code: ' + e.message }; }
  c.q = q; CHATS.set(o.id, c); c.modelo = o.modelo; c.esf = o.esf; abrirSessao(c, o);
  if (o.prefixo) { c.prefixo = o.prefixo; delete o.prefixo; }   // set before the tab can send anything
  if (passou) c.prefixo = `[New conversation: previous one got too big. State in ${passou}; read it and continue.]\n\n`;
  if (o.modo === 'livre') escreverBriefing(ultimaConta);
  registrar(`${o.modo === 'livre' ? 'CHAT LIVRE' : o.dir}`);
  if (o.modo !== 'livre' && o.modo !== 'resume' && !o.passagem && OP.explorer === '1' && !QUIETO) shell.openPath(o.dir);
  (async () => {
    try { for await (const m of q) { c.msgT = Date.now(); try { registrarMud(c, m); } catch { } const x = enxugar(m); if (x) { if (x.type === 'system' && x.session_id) c.sessao = x.session_id; if (x.type === 'result') { c.ocupado = false; c.turnou = true; c.cadeiaTurno = false; anotarUso(c, x); fecharVigia(o.id); } enviar('chat:msg', o.id, x); if (x.type === 'result' && !c.passando) vigiarFerramentas(c);
      if (x.type === 'stream_event' && x.event.type === 'message_start' && x.event.uso) { c.ctxAgora = x.event.uso.ent; if (c.ctx0 == null) c.ctx0 = c.ctxAgora; }
      if (x.type === 'result') { c.ultResp = x.texto; if (assist) assistTurnou(c.sessao || o.sessao, c.primeiro, x.texto); AJUDANTES.pararDaAba(o.id); anotarConversa(c); PASSAGEM.ver(c); fimDeTurno(c, o.id); }   // turn over = no helper has a reason to live (leftover killed)
      if (x.type === 'assistant' && x.content.some(b => b.type === 'tool_use' && !/^(AskUserQuestion|ExitPlanMode)$/.test(b.name))) PASSAGEM.ver(c, true);
      if (c.auto && OP.auto === '1') { if (x.type === 'assistant') for (const b of x.content) if (b.type === 'tool_use') aplicarAuto(c, o.id, auto().escalar(c)); if (x.type === 'result') auto().fim(c, x.uso); } } } c.ocupado = false; if (!c.fechado) enviar('chat:fim', o.id, ''); }
    catch (e) { logApp(`chat ${o.id}: ${e.stack || e}`); c.ocupado = false; if (!c.fechado) enviar('chat:fim', o.id, e.message || String(e)); }   // closed by app (edit, terminal): not marked "ended"
    finally { soltarPassagem(c); fecharSessao(c); fecharVigia(o.id); if (CHATS.get(o.id) === c) { CHATS.delete(o.id); } }
  })();
  let comandos = [];
  try { const ini = await Promise.race([q.initializationResult(), new Promise(r => setTimeout(() => r(null), 30000))]); if (ini && ini.commands) comandos = ini.commands.map(x => ({ n: x.name, d: x.description || '' })); } catch (e) { logApp('init: ' + e.message); }
  // opening sends nothing: reads only what CLAUDE.md loads when USER sends (Continue text stays in box; 23/10)
  if (o.aviso) fila.por(o.aviso);
  return { ok: true, sessao, historico, histAntes, antes: ant || null, comandos, passou: !!passou };
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
const CASA_PAR = { caveman: 'caveman', ultracave: 'ultracave', 'projeto-novo': 'projeto-novo', preparar: 'preparar-ferramentas', economizar: 'fazer-mais-rapido' };
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
const PASS_REC = require('./passagem.js').recentes;
const PASSAGEM = require('./passagem.js')({ limite: () => parseInt(OP.passagem, 10), aberta: (c) => !c.fechado && CHATS.get(c.o.id) === c, trocar: (c) => trocarConversa(c).catch((e) => { logApp('passagem: ' + e.message); enviar('chat:passagem', c.o.id, { fase: 2, mil: 0, erro: e.message, pend: 0 }); }),
  aviso: (c, mil) => { registrar(`PASSAGEM ${c.o.dir}: ${mil} mil tokens`); enviar('chat:passagem', c.o.id, { fase: 1, mil }); } });
async function trocarConversa(c) {
  const id = c.o.id, nova = crypto.randomUUID(), rel = path.relative(c.o.dir, c.arqPassagem), mil = Math.round(c.ctxAgora / 1000), pend = c.pendentes || [];
  AJUDANTES.pararDaAba(id); fecharChat(id);
  let rec = ''; try { const S = await sdk(); rec = PASS_REC(await comPrazo(S.getSessionMessages(c.sessao, { dir: c.o.dir }), 8000) || []); } catch (e) { logApp('passagem recentes: ' + e.message); }   // 14/11: last exchanges go along
  const prefixo = `[New conversation: previous one hit ${mil}k tokens. State in ${rel}${/PARADA\.md$/.test(rel) ? ' (already loaded if CLAUDE.md imports it)' : ''}; read it and continue. Before acting, open the memories and skills that fit the task (as CLAUDE.md says).]${rec ? `\nLast exchanges of the previous conversation (user verbatim, your replies cut; context only, not new requests):\n\n${rec}\n[/end of previous exchanges]` : ''}\n\n`;
  const r = await abrirChat({ ...c.o, modo: c.o.modo === 'livre' ? 'livre' : 'nova', sessao: nova, ate: null, aviso: null, modelo: c.modelo, esf: c.esf, passagem: true, prefixo });
  const n = CHATS.get(id);
  if (n && !r.erro) { gravarElo(nova, c.sessao); anotarConversa(c, nova); }
  if (n && c.auto) n.auto = { ...c.auto, ctx: 0 };
  const segue = n && !pend.length && c.continuar;   // work left and nobody needs to type: new conversation resumes alone
  enviar('chat:passagem', id, { fase: 2, mil, sessao: nova, erro: r && (r.erro || null), pend: n ? pend.length + (segue ? 1 : 0) : 0 });
  if (n) for (const t of pend) enviarAoChat(n, id, t);
  if (segue) enviarAoChat(n, id, 'Continue the task now; do not stop until it is done or you need the user.');
}
function enviarAoChat(c, id, txt, uid) { if (c.prefixo) { txt = c.prefixo + txt; c.prefixo = null; } c.fila.por(txt, uid); }
// turn over: context meter + Windows notice (Opções "Seu FCC" > avisoFim) when FCC is not in front
async function fimDeTurno(c, id) {
  if (ATUALIZAR_DEPOIS) setTimeout(() => { if (ATUALIZAR_DEPOIS && ocioso()) { enviar('atualizando'); atualizarAgora(); } }, 1500);
  try { const u = c.q.getContextUsage && await comPrazo(c.q.getContextUsage(), 5000); if (u) enviar('chat:ctx', id, { pct: Math.round(u.percentage || 0), usados: u.totalTokens || 0, max: u.maxTokens || 0 }); } catch (e) { logApp('ctx: ' + e.message); }
  if (OP.avisoFim === '0' || QUIETO || !win || win.isDestroyed() || (win.isFocused() && win.isVisible())) return;
  try { const n = new Notification({ title: 'Claude terminou' + (c.o && c.o.dir ? ' · ' + path.basename(c.o.dir) : ''), body: String(c.ultResp || 'Resposta pronta.').split(/\s+/).join(' ').slice(0, 140), icon: path.join(__dirname, 'icone.ico') });
    n.on('click', () => { try { if (win.isMinimized()) win.restore(); win.show(); win.focus(); enviar('abrir-conv', id); } catch { } }); n.show(); } catch (e) { logApp('avisoFim: ' + e.message); }
}
function respostaPerm(id, req, r) {
  const c = CHATS.get(id); const p = c && c.perms.get(req); if (!p) return;
  c.perms.delete(req);
  if (r.acao === 'negar') { p.ok({ behavior: 'deny', message: r.msg || 'O usuário negou.', interrupt: !!r.parar }); return; }
  if (p.tool === 'ExitPlanMode' && c.modo === 'plan') { const m = OP.perm === 'auto' ? 'auto' : 'default'; c.modo = m; Promise.resolve(c.q.setPermissionMode && c.q.setPermissionMode(m)).catch(e => logApp('modo: ' + e.message)); enviar('chat:modo', id, m); }
  if (r.acao === 'cadeia' || r.acao === 'aprovado') c.cadeiaTurno = true;
  if (r.acao === 'sempre') { c.cadeiaTurno = true; c.cadeiaPasta = true; if (c.o && c.o.dir) CADEIA_PASTA.add(c.o.dir.toLowerCase()); }
  const cad = r.acao === 'sempre' ? 'pasta' : (r.acao === 'cadeia' || r.acao === 'aprovado') ? 'turno' : '';
  p.ok({ behavior: 'allow', updatedInput: r.input ? { ...p.input, ...r.input } : p.input, ...(cad ? { cadeia: cad } : {}), ...(r.acao === 'sempre' && p.sug ? { updatedPermissions: p.sug } : {}) });
  if (c.cadeiaTurno || c.cadeiaPasta) {
    for (const [req2, p2] of [...c.perms.entries()]) {
      if (p2.tool === 'AskUserQuestion' || p2.tool === 'ExitPlanMode' || escopoPerm(p2.tool, p2.input) === 'perigoso') continue;
      c.perms.delete(req2);
      p2.ok({ behavior: 'allow', updatedInput: p2.input, cadeia: c.cadeiaPasta ? 'pasta' : 'turno', ...(p2.sug ? { updatedPermissions: p2.sug } : {}) });
      enviar('chat:perm-fim', id, req2, r.acao === 'sempre' ? 'sempre' : 'cadeia');
    }
  }
}
// orq.py workers: live status for the conversation that launched them
const AJUDANTES = require('./ajudantes.js')(path.join(CASA, 'orquestra', 'vivo'), enviar, logApp);
if (!QUIETO) setInterval(() => { if (CHATS.size) AJUDANTES.passo(); }, 1500);
// conversation died while noting (edit, reopen, crash): no phase 2 will come; without this the tab would hide everything from then on
function soltarPassagem(c) { if (c.passando !== 1) return; c.passando = 0; clearTimeout(c.passTimer); enviar('chat:passagem', c.o.id, { fase: 0 }); }
function fecharChat(id) {
  const c = CHATS.get(id); if (!c) return; c.fechado = true; soltarPassagem(c); for (const [req] of c.perms) respostaPerm(id, req, { acao: 'negar', msg: 'aba fechada' }); c.fila.fechar(); try { c.q.close(); } catch { } CHATS.delete(id); fecharSessao(c);
}
// panel shortcuts: project .exe (dist\) and reports folder
function acharExe(dir) {
  const d = path.join(dir, 'dist'); const ok = (f) => /\.exe$/i.test(f) && !/^unins/i.test(path.basename(f));
  try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && ok(p)) return p; if (e.isDirectory()) { const x = fs.readdirSync(p).map(f => path.join(p, f)).find(f => ok(f) && path.basename(f, '.exe').toLowerCase() === e.name.toLowerCase()) || fs.readdirSync(p).map(f => path.join(p, f)).find(ok); if (x) return x; } } } catch { }
  return null;
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
  const proj = o.modo === 'livre' || /chat-livre$/i.test(o.dir) ? 'Chat livre' : path.basename(o.dir || '?');
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
async function preparar(instalar) {   // 24/11: first call only checks; installs after the user agrees (first-run screen)
  const et = [...ETAPAS.map(e => ({ id: e.id, nome: e.nome, st: 'espera', txt: 'esperando' })), { id: 'memoria', nome: 'Regras e skills', st: 'espera', txt: 'esperando' },
    { id: 'conta', nome: 'Conta', st: 'espera', txt: 'esperando' }];
  const plog = [`${new Date().toLocaleString('pt-BR')} | preparar (abas)`], t0 = Date.now(), marca = (o) => plog.push(`  (${o}: ${Date.now() - t0} ms)`);
  const mostra = (pct, aviso, cor) => enviar('preparo', { et, pct, aviso, cor });
  mostra(0, 'Num PC recém-formatado a 1ª vez leva alguns minutos; depois, 1 segundo.', 'dim');
  let falhou = false;
  for (let i = 0; i < ETAPAS.length; i++) {
    const e = ETAPAS[i], v = et[i];
    if (e.checa()) { v.st = 'ok'; v.txt = 'ok'; mostra(Math.round((i + 1) * 100 / et.length)); continue; }
    if (!instalar) { v.st = 'falta'; v.txt = 'faltando'; continue; }
    if (QUIETO) { v.st = 'falhou'; v.txt = 'faltando (teste não instala)'; falhou = true; continue; }   // test never installs anything on PC
    v.st = 'rodando'; v.txt = 'instalando…'; mostra(Math.round(i * 100 / et.length), e.admin ? 'O Windows vai pedir permissão para instalar: clique em Sim.' : 'Baixando e instalando; não feche esta janela.', 'amb');
    const r = await rodarEtapa(e);
    if (e.checa()) { v.st = 'ok'; v.txt = 'instalado agora'; registrar('PREPARAR: instalou ' + e.nome); }
    else { v.st = 'falhou'; v.txt = 'não instalou'; falhou = true; registrar('PREPARAR: ERRO em ' + e.nome); }
    plog.push(`  ${e.nome}: ${v.txt} (${r.replace(/^(ok|erro )/, '')})`);
    mostra(Math.round((i + 1) * 100 / et.length));
  }
  marca('etapas');
  const n0 = ETAPAS.length, em = et[n0]; em.txt = !fs.existsSync(path.join(CASA, 'REGRAS.md')) ? 'nenhuma ainda' : CASA_NOVA ? 'ligada agora' : 'ok'; em.st = 'ok';   // 04/11: fresh install (pure mode) has no house yet; not a failure
  mostra(Math.round((n0 + 1) * 100 / et.length));
  const ec = et[n0 + 1];
  if (acharClaude()) { ec.st = 'rodando'; ec.txt = 'conferindo…'; mostra(90); ultimaConta = await contaStatus(); guardarContaAtual(ultimaConta); ec.st = ultimaConta.estado === 'ok' ? 'ok' : 'espera'; ec.txt = ultimaConta.estado === 'ok' ? ultimaConta.email : 'entrar na conta'; }
  else { ultimaConta = { estado: 'ausente' }; ec.txt = 'precisa do Claude Code'; }
  marca('conta'); for (const v of et) plog.push(`  ${v.nome}: ${v.txt}`);
  try { const ant = (lerLinhas(PREP_LOG) || []).filter(Boolean).slice(-120); fs.writeFileSync(PREP_LOG, [...ant, ...plog].join('\r\n') + '\r\n', 'utf8'); } catch { }
  mostra(100, falhou ? `Algo não instalou: detalhes em ${path.basename(CCT)}\\relatorios\\preparar.txt.` : 'Tudo pronto.', falhou ? 'erro' : 'ok');
  if (ultimaConta.estado === 'ok') escreverBriefing(ultimaConta);
  return { conta: ultimaConta, falhou, faltam: et.slice(0, ETAPAS.length).filter(v => v.st === 'falta').map(v => ({ id: v.id, nome: v.nome })) };
}

// ---- tabs from last time ----
function lerSessao() { try { return JSON.parse(fs.readFileSync(SESSAO, 'utf8')); } catch { return []; } }
function salvarSessao(abas) { if (QUIETO || DEMO) return; try { fs.writeFileSync(SESSAO, JSON.stringify(abas, null, 1), 'utf8'); } catch { } }

// ---- IPC ----
ipcMain.handle('dados', () => ({ demo: DEMO, projetos: lerProjetos(), op: { ...OP }, raiz: RAIZ, livre: LIVRE, temp: C.temp(), mcp: C.dados('mcp'), temRegras: fs.existsSync(FAM), teste: TESTE, sessao: lerSessao(), atualizou: !QUIETO && (process.argv.includes('--atualizou') || RECARREGOU), recarregou: RECARREGOU && !(RECARREGOU = false), abrirProjeto: QUIETO ? null : arg('--projeto'), pendente: !QUIETO && fs.existsSync(PENDENTE), versao: app.getVersion(), autoAtual: ATUAL.ultimo }));
ipcMain.handle('preparar', (e, instalar) => preparar(instalar));
ipcMain.handle('conta', async () => { ultimaConta = await contaStatus(); guardarContaAtual(ultimaConta); return ultimaConta; });
ipcMain.handle('sair-conta', async () => { try { const f = arqConta(ultimaConta.email || ''), j = JSON.parse(fs.readFileSync(f, 'utf8')); j.expirou = true; gravarSeguro(f, JSON.stringify(j)); } catch { }   // logout on site invalidates saved login
  const c = acharClaude(); if (c) { await new Promise(ok => cp.execFile(c, ['auth', 'logout'], { windowsHide: true, timeout: 20000 }, () => ok())); } registrar(`LOGOUT (${ultimaConta.email || ''})`); return (ultimaConta = await contaStatus()); });
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
ipcMain.handle('conta-esgotou', (e, ate) => { guardarUso(ultimaConta.email, { sessao: { pct: 100, volta: '', ate: (ate || 0) * 1000 } }); return proximaConta(ultimaConta.email); });
function listarContas() {
  let L = []; try { L = fs.readdirSync(CONTAS_DIR).filter(f => f.endsWith('.json')).map(f => { try { const j = JSON.parse(fs.readFileSync(path.join(CONTAS_DIR, f), 'utf8')); return { email: j.email, plano: j.plano, t: j.quando || 0, expirou: !!j.expirou, uso: j.uso || null, assinou: (j.conta && j.conta.subscriptionCreatedAt) || '' }; } catch { return null; } }).filter(Boolean); } catch { }
  return L.sort((a, b) => b.t - a.t).map(x => ({ email: x.email, plano: x.plano, expirou: x.expirou, uso: x.uso, assinou: x.assinou, quando: quandoCurto(x.t) }));
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
  const L = LOGIN = { p, saida: '', url: '', email, inicio: Date.now(), feito: false, credAnt: (() => { try { return fs.statSync(CRED).mtimeMs; } catch { return 0; } })() };
  p.onData(d => { L.saida = (L.saida + d).slice(-20000); const u = L.saida.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').match(/https:\/\/[^\s"'<>]+oauth[^\s"'<>]*/i); if (u && !L.url) { L.url = u[0]; enviar('login:url', L.url); }
    if (/press enter/i.test(d)) p.write('\r'); });
  // no paste: while the browser finishes, check the saved login every 2 s; when it is in, stop the CLI and finish here
  L.vigia = setInterval(async () => { if (LOGIN !== L) return clearInterval(L.vigia); if (Date.now() - L.inicio > 600000) { clearInterval(L.vigia); try { p.kill(); } catch { } return; }
    // only a NEW saved login counts: with an account already in, status is "ok" from the start (bug 07/11: CLI killed before callback)
    let mt = 0; try { mt = fs.statSync(CRED).mtimeMs; } catch { } if (mt <= L.credAnt) return;
    const st = await contaStatus(); if (st.estado === 'ok' && LOGIN === L) { clearInterval(L.vigia); L.feito = true; try { p.kill(); } catch { } } }, 2000);
  p.onExit(async ({ exitCode }) => { clearInterval(L.vigia); if (LOGIN !== L) return; LOGIN = null; const ct = await contaStatus(); ultimaConta = ct;
    const ok = ct.estado === 'ok' && (exitCode === 0 || L.feito); if (ok) { fecharUso(); guardarContaAtual(ct); escreverBriefing(ct); registrar('LOGIN: ok ' + ct.email); } else registrar('LOGIN: ERRO ' + exitCode);
    enviar('conta', ct); enviar('login:fim', { ok, conta: ct, erro: ok ? '' : (L.cancelado ? 'cancelado' : (L.saida.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).pop() || 'o login não terminou').slice(0, 200)) }); });
  return { ok: true };
});
ipcMain.handle('login-cancelar', () => { if (LOGIN) { LOGIN.cancelado = true; try { LOGIN.p.kill(); } catch { } } return true; });
ipcMain.on('login-abrir', () => { if (LOGIN && LOGIN.url) shell.openExternal(LOGIN.url); });
ipcMain.handle('opcao', (e, k, v) => { if (k in OP) { OP[k] = String(v); salvarOpcoes(); if (k === 'pastas') return lerProjetos(); } return null; });
ipcMain.handle('projetos', () => lerProjetos());
// conversation name from topic (24/10, user request): 1 short request, no tools or rules, Haiku Low (~300 tokens). Returns 2-5 words or '' (UI retries on next reply).
ipcMain.handle('chat-titulo', (e, pedido, resposta, modelo, sessao, dir) => titular(pedido, resposta, modelo, sessao, dir));
async function titular(pedido, resposta, modelo, sessao, dir) {
  const p = '2-5 word pt-BR title for this chat topic. Title only, no quotes/period.\n\nPedido: ' + String(pedido || '').slice(0, 1200) + '\n\nInício da resposta: ' + String(resposta || '').slice(0, 600);
  const limpar = (x) => String(x || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
  const ok = (x) => { x = limpar(x).replace(/^(t[íi]tulo\s*:\s*)/i, '').replace(/^["'“”«*#\s]+|["'“”»*.\s]+$/g, '').slice(0, 60); return x.split(/\s+/).length <= 8 ? x : ''; };
  try {
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
}
ipcMain.handle('chat-abrir', (e, o) => abrirChat(o).catch(err => { logApp('chat-abrir: ' + (err.stack || err)); return { erro: 'Não consegui abrir a conversa: ' + err.message }; }));
// auto mode (auto.js): before each Claude message picks model + thinking; UI gets the switch (chat:auto)
let AUTO = null;
const auto = () => AUTO || (AUTO = require('./auto.js')(QUIETO ? C.temp('fcc-auto-teste.json') : C.dados('fcc-auto.json'), logApp));
async function aplicarAuto(c, id, r) {
  if (!r || (r.modelo === c.modelo && r.esf === c.esf)) return;
  try { if (r.modelo !== c.modelo) { await c.q.setModel(r.modelo); c.modelo = r.modelo; } if (r.esf !== c.esf) { await c.q.applyFlagSettings({ effortLevel: r.esf }); c.esf = r.esf; } enviar('chat:auto', id, r); }
  catch (err) { logApp('auto: ' + err.message); }
}
ipcMain.on('chat-enviar', async (e, id, txt, uid) => { let c = CHATS.get(id); if (!c) return; if (c.primeiro == null) c.primeiro = String(txt || '');
  // rules changed since the conversation opened (and it is between turns): reopen it on the same session first, then send there
  if (c.regras && c.turnou && !c.ocupado && !c.passando && !c.perms.size) { let a = c.regras; try { a = assinaturaRegras(c.o, String(id).startsWith('assist')); } catch (err) { logApp('regras: ' + err.message); } if (a !== c.regras) { c = await reabrirPorRegras(c); if (!c) return; } }
  c.cadeiaTurno = false; c.ocupado = true;   // turn running: live screen update waits (tentarAoVivo)
  const assistLeve = String(id).startsWith('assist') && !((auto().tipoDe(txt, c.auto && c.auto.ant).base ?? 0) >= 3);   // assistant: chat and quick questions stay on the small model (Claude itself calls trocar_modelo for real tasks)
  const mm = /^\/model\s+(haiku|sonnet|opus|fable)\b/i.exec(txt.trim());   // 24/11: /model typed in chat = manual switch (watcher learns, keeps real model)
  if (mm) { if (c.auto && OP.auto === '1') auto().trocouNaMao(c, mm[1].toLowerCase(), null); c.modelo = mm[1].toLowerCase(); }
  if (OP.auto === '1' && !assistLeve && !txt.trim().startsWith('/')) { c.auto = c.auto || {}; await aplicarAuto(c, id, auto().escolher(c, txt)); }
  if (c.passando) { (c.pendentes = c.pendentes || []).push(txt); return; }   // noting where it stopped: goes to new conversation
  iniciarVigia(id);   // turn starts: snapshot of the system; closed when the result arrives
  enviarAoChat(c, id, txt, uid); });
ipcMain.handle('chat-parar', async (e, id) => { const c = CHATS.get(id); if (!c) return; c.parou = true; c.nParar = (c.nParar || 0) + 1; for (const [req] of c.perms) respostaPerm(id, req, { acao: 'negar', msg: 'interrompido', parar: true }); try { await c.q.interrupt(); } catch (err) { logApp('interrupt: ' + err.message); } });
ipcMain.handle('chat-modelo', async (e, id, m) => { const c = CHATS.get(id); if (!c) return false; if (c.auto && OP.auto === '1') auto().trocouNaMao(c, m, null); try { await c.q.setModel(m); c.modelo = m; return true; } catch (err) { logApp('setModel: ' + err.message); return false; } });
// --- v4 panels data: permission mode, context usage, changed files, project files, side question ---
ipcMain.handle('chat-modo', async (e, id, modo) => { const c = CHATS.get(id); if (!c) return { erro: 'Conversa não encontrada.' };
  modo = ['default', 'plan'].includes(modo) ? modo : 'auto';   // Automático, Perguntar, Planejar (no accept-edits mode)
  if (typeof c.q.setPermissionMode === 'function') { try { await c.q.setPermissionMode(modo); } catch (err) { logApp('modo: ' + err.message); return { erro: err.message }; } c.modo = modo; return { ok: true }; }
  c.modo = modo; return { ok: true }; });
// changes log: raw tool_use arrives before the tool runs, so "before" content can still be read
// history is saved per conversation (dados\mudancas\<session>.json) so it survives restarts; the file follows c.sessao
const mudArq = (s) => C.dados('mudancas', String(s).replace(/[^\w-]/g, '') + '.json');
function lerMud(s) { try { return JSON.parse(fs.readFileSync(mudArq(s), 'utf8')); } catch { return []; } }
function gravarMud(c) {
  if (QUIETO || DEMO) return; clearTimeout(c.mudT);
  c.mudT = setTimeout(() => { try { fs.mkdirSync(C.dados('mudancas'), { recursive: true }); fs.writeFileSync(mudArq(c.sessao), JSON.stringify(c.mud)); } catch (e) { logApp('mud gravar: ' + e.message); } }, 800);
}
function registrarMud(c, m) {
  const cont = m && m.message && Array.isArray(m.message.content) ? m.message.content : null; if (!cont) return;
  if (m.type === 'assistant') for (const b of cont) {
    if (b.type === 'tool_use' && (b.name === 'Bash' || b.name === 'PowerShell') && b.input && MUD.mudaSistema(b.input.command)) { (c.mud = c.mud || []).push({ id: b.id, nome: b.name, input: { command: b.input.command }, t: Date.now(), dir: c.o.dir }); gravarMud(c); continue; }
    if (b.type !== 'tool_use' || !['Edit', 'MultiEdit', 'Write'].includes(b.name) || !b.input || !b.input.file_path) continue;
    const abs = path.isAbsolute(b.input.file_path) ? b.input.file_path : path.join(c.o.dir, b.input.file_path);
    const existia = fs.existsSync(abs); let antes;
    let cortado = false;
    if (b.name === 'Write' && existia) { try { const t = fs.readFileSync(abs, 'utf8'); cortado = t.length > 524288; antes = cortado ? t.split('\n').slice(0, 400).join('\n') : t; } catch { antes = ''; } }   // full copy ≤512 KB = Desfazer can restore it
    (c.mud = c.mud || []).push({ id: b.id, nome: b.name, input: b.input, existia, antes, ...(cortado ? { cortado: true } : {}), t: Date.now() }); if (c.mud.length > 500) c.mud.shift(); gravarMud(c);
  } else if (m.type === 'user' && c.mud) for (const b of cont) if (b.type === 'tool_result' && b.is_error && c.mud.some(r => r.id === b.tool_use_id)) { c.mud = c.mud.filter(r => r.id !== b.tool_use_id); gravarMud(c); }
}
const MUD = require('./mudancas');
ipcMain.handle('chat-mud', (e, id) => { const c = CHATS.get(id); if (!c || !c.mud || !c.mud.length) return [];
  try { return MUD.resumo(c.mud, c.o.dir, f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }); } catch (err) { logApp('mud: ' + err.message); return []; } });
ipcMain.handle('arquivos', (e, dir) => { try { const dirs = [], files = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) { if (d.name.startsWith('.') || d.name === 'node_modules') continue; (d.isDirectory() ? dirs : files).push(d.name); }
  const o = (a) => a.sort((x, y) => x.localeCompare(y, 'pt-BR')).slice(0, 200); return { dirs: o(dirs), files: o(files) }; } catch { return { dirs: [], files: [] }; } });
// 13/11 (user request): message sent while Claude works = quick answer NOW from a forked copy (no tools, not saved), then the
// message + that answer go into the main conversation (folds at the next tool boundary, or a new turn right after the result)
ipcMain.handle('chat-junto', async (e, id, txt) => { const c = CHATS.get(id); if (!c) return { erro: 'Conversa não encontrada.' };
  if (!c.sessao) { enviarAoChat(c, id, txt); return { erro: 'sem-lado' }; }
  const n0 = c.nParar || 0; let q2, resp = '', erro = ''; const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 60000);
  try { const S = await sdk();
    q2 = S.query({ prompt: String(txt) + '\n\n(Mensagem enviada enquanto você ainda trabalha na tarefa acima, que continua em paralelo. Chamadas de ferramenta sem resultado ainda estão rodando, não foram interrompidas. Responda já, curto, em pt-BR, com o que sabe até aqui. Não use ferramentas.)',
      options: { cwd: c.o.dir, env: c.env, model: c.modelo || c.o.modelo, pathToClaudeCodeExecutable: c.claude, resume: c.sessao, forkSession: true, persistSession: false, maxTurns: 1, tools: [], permissionMode: 'default',effort: 'low', abortController: ac } });
    for await (const m of q2) if (m.type === 'result') resp = (m.result || '').trim();
  } catch (err) { erro = ac.signal.aborted ? 'Tempo esgotado (60 s).' : err.message; }
  finally { clearTimeout(t); try { q2 && q2.close && q2.close(); } catch { } }
  if (CHATS.get(id) !== c || (c.nParar || 0) !== n0) return { txt: resp, erro, fora: true };   // closed or stopped meanwhile: not folded
  const junto = resp ? `\n\n[FCC-junto] Sent while you were working. The user already got this quick parallel answer (written without results of tools still running): «${resp}». Take both into account, change plan if needed; don't repeat it.`
    : '\n\n[FCC-junto] Sent while you were working (the quick parallel answer failed). Take it into account, change plan if needed.';
  if (!c.ocupado) iniciarVigia(id); c.cadeiaTurno = false; c.ocupado = true;
  enviarAoChat(c, id, String(txt) + junto);
  return resp ? { txt: resp } : { erro: erro || 'Sem resposta.' }; });
ipcMain.handle('chat-esforco', async (e, id, v) => { const c = CHATS.get(id); if (!c) return false; if (c.auto && OP.auto === '1') auto().trocouNaMao(c, null, v); try { await c.q.applyFlagSettings({ effortLevel: v }); c.esf = v; return true; } catch (err) { logApp('effort: ' + err.message); return false; } });
ipcMain.on('chat-perm', (e, id, req, r) => respostaPerm(id, req, r));
ipcMain.on('chat-fechar', (e, id) => { AJUDANTES.pararDaAba(id); fecharChat(id); });
ipcMain.on('conversa-fechada', (e, x) => { if (!x || !x.dir) return; const c = lerConversas(); c[x.dir.toLowerCase()] = x; try { fs.writeFileSync(CONVERSAS, JSON.stringify(c, null, 1), 'utf8'); } catch (err) { logApp('conversas: ' + err.message); } });
ipcMain.handle('anexar', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] }); return r.canceled ? [] : r.filePaths; });
// 25/11 composer extras: pasted image/file → temp file path; "@" file search; dictation (Windows Win+H); export conversation
ipcMain.handle('colar-imagem', (e, bytes, ext) => { try { const d = C.temp('colados'); fs.mkdirSync(d, { recursive: true });
  const velho = Date.now() - 7 * 864e5; for (const n of fs.readdirSync(d)) { const p = path.join(d, n); try { if (fs.statSync(p).mtimeMs < velho) fs.unlinkSync(p); } catch { } }
  const p = path.join(d, 'colado-' + new Date().toISOString().replace(/[:.]/g, '-') + '.' + (String(ext || 'png').replace(/[^\w]/g, '') || 'png'));
  fs.writeFileSync(p, Buffer.from(bytes)); return p; } catch (err) { logApp('colar: ' + err.message); return null; } });
const BUSCA = new Map();   // dir → { t, lista } (30 s)
ipcMain.handle('arquivos-busca', (e, dir, q) => { try {
  let b = BUSCA.get(dir); if (!b || Date.now() - b.t > 30000) { const lista = []; const PULA = /^(node_modules|bin|obj|dist|\..*)$/i;
    const andar = (d, rel) => { if (lista.length >= 5000) return; let it = []; try { it = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const x of it) { if (lista.length >= 5000) return; const r = rel ? rel + path.sep + x.name : x.name; if (x.isDirectory()) { if (!PULA.test(x.name)) andar(path.join(d, x.name), r); } else lista.push(r); } };
    andar(dir, ''); b = { t: Date.now(), lista }; BUSCA.set(dir, b); }
  const t = String(q || '').toLowerCase().split('/').join(path.sep); if (!t) return b.lista.slice(0, 30);
  const nota = (r) => { const l = r.toLowerCase(), n = l.slice(l.lastIndexOf(path.sep) + 1); return n.startsWith(t) ? 0 : n.includes(t) ? 1 : l.includes(t) ? 2 : 9; };
  return b.lista.map(r => [nota(r), r]).filter(x => x[0] < 9).sort((a, b2) => a[0] - b2[0] || a[1].length - b2[1].length).slice(0, 30).map(x => x[1]);
} catch (err) { logApp('busca: ' + err.message); return []; } });
ipcMain.handle('ditado', () => { try {   // Windows voice typing = Win+H; text box already has focus
  const ps = "Add-Type -Name K -Namespace W -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e);'; $z=[UIntPtr]::Zero; [W.K]::keybd_event(0x5B,0,0,$z); [W.K]::keybd_event(0x48,0,0,$z); [W.K]::keybd_event(0x48,0,2,$z); [W.K]::keybd_event(0x5B,0,2,$z)";
  require('child_process').spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')], { windowsHide: true, stdio: 'ignore' }).on('error', (err) => logApp('ditado: ' + err.message));
  return true; } catch (err) { logApp('ditado: ' + err.message); return false; } });
ipcMain.handle('exportar', async (e, nome, txt) => { try {
  const r = await dialog.showSaveDialog(win, { title: 'Exportar conversa', defaultPath: path.join(app.getPath('documents'), String(nome || 'conversa').replace(/[<>:"/|?*\x5c]+/g, ' ').trim().slice(0, 80) + '.md'), filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Texto', extensions: ['txt'] }] });
  if (r.canceled || !r.filePath) return null; fs.writeFileSync(r.filePath, String(txt || ''), 'utf8'); return r.filePath; } catch (err) { logApp('exportar: ' + err.message); return { erro: err.message }; } });
// per-hunk undo in Mudanças: ref = "<tool_use id>|<k>" (Edit 0, MultiEdit i, Write w)
ipcMain.handle('mud-desfazer', (e, id, ref) => { const c = CHATS.get(id); if (!c || !c.mud) return { erro: 'Conversa não encontrada.' };
  const [tid, k] = String(ref).split('|'); const r = c.mud.find(x => x.id === tid); if (!r) return { erro: 'Mudança não encontrada.' };
  if ((r.desf || []).includes(k)) return { ok: true };
  const inp = r.input || {}, abs = path.isAbsolute(inp.file_path) ? inp.file_path : path.join(c.o.dir, inp.file_path);
  try {
    if (r.nome === 'Write') {
      if (!r.existia) { if (fs.existsSync(abs)) shell.trashItem(abs).catch(err => logApp('desfazer lixeira: ' + err.message)); }
      else { if (r.cortado || r.antes == null) return { erro: 'Arquivo grande demais: não guardei a versão anterior inteira.' }; fs.writeFileSync(abs, r.antes, 'utf8'); }
    } else {
      const ed = r.nome === 'MultiEdit' ? (inp.edits || [])[+k] : inp; if (!ed) return { erro: 'Trecho não encontrado.' };
      const atual = fs.readFileSync(abs, 'utf8'), novo = String(ed.new_string || ''), velho = String(ed.old_string || '');
      if (!novo) return { erro: 'Não sei onde o trecho estava (ele só apagou texto).' };
      if (!atual.includes(novo)) return { erro: 'O trecho mudou depois: não dá para desfazer sozinho.' };
      fs.writeFileSync(abs, ed.replace_all ? atual.split(novo).join(velho) : atual.replace(novo, () => velho), 'utf8');
    }
    (r.desf = r.desf || []).push(k); gravarMud(c); return { ok: true };
  } catch (err) { logApp('desfazer: ' + err.message); return { erro: err.message }; } });
// "Voltar arquivos" on a user bubble: file checkpoints (enableFileCheckpointing) back to before that message
ipcMain.handle('chat-voltar', async (e, id, uid, txt, dry) => { const c = CHATS.get(id); if (!c || !c.q || !c.q.rewindFiles) return { erro: 'Conversa não está aberta.' };
  const tentar = async (u) => { try { return await c.q.rewindFiles(u, { dryRun: !!dry }); } catch (err) { return { canRewind: false, error: err.message }; } };
  let r = uid ? await tentar(uid) : null;
  if ((!r || !r.canRewind) && txt && c.sessao) { try { const S = await sdk(); const L = await comPrazo(S.getSessionMessages(c.sessao, { dir: c.o.dir }), 8000) || [];
      const tx = (m) => { const ct = m.message && m.message.content; return typeof ct === 'string' ? ct : Array.isArray(ct) ? ct.filter(b => b.type === 'text').map(b => b.text).join('\n') : ''; };
      const alvo = String(txt).trim(); const m = L.filter(m => m.type === 'user' && m.uuid && tx(m).trim().endsWith(alvo)).pop();
      if (m && m.uuid !== uid) r = await tentar(m.uuid); } catch (err) { logApp('voltar: ' + err.message); } }
  return r || { canRewind: false, error: 'Ponto não encontrado.' }; });
ipcMain.handle('programa', (e, dir) => { const x = acharExe(dir); if (x) cp.spawn(x, [], { cwd: path.dirname(x), detached: true, stdio: 'ignore' }).unref(); return x ? path.basename(x) : null; });
// 25/11 (pedido dele): project icon in the sidebar = icon inside its .exe (brought back from the old UI, 27/10); double click opens the .exe
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
  partes.sort((x, y) => (y.e[0] || 256) - (x.e[0] || 256)); const png = partes[0].d.readUInt32BE(0) === 0x89504e47 && partes[0]; if (png) return 'data:image/png;base64,' + png.d.toString('base64');
  const cab = Buffer.alloc(6 + partes.length * 16); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(partes.length, 4); let pos = cab.length;
  partes.forEach((p, i) => { p.e.copy(cab, 6 + i * 16, 0, 12); cab.writeUInt32LE(p.d.length, 6 + i * 16 + 8); cab.writeUInt32LE(pos, 6 + i * 16 + 12); pos += p.d.length; });
  return 'data:image/x-icon;base64,' + Buffer.concat([cab, ...partes.map(p => p.d)]).toString('base64');
}
ipcMain.handle('icones', async (e, dirs) => {
  const r = {};
  for (const dir of dirs || []) {
    const exe = acharExe(dir); if (!exe) continue;
    const lanc = path.join(path.dirname(dir), path.basename(dir) + '.exe');   // exe without own icon (.NET apphost): launcher icon beside the project
    try { const k = exe + '|' + fs.statSync(exe).mtimeMs; if (!ICONES.has(k)) { let u = null; try { u = iconeDoExe(exe); } catch { } if (!u) try { if (fs.existsSync(lanc)) u = iconeDoExe(lanc); } catch { } ICONES.set(k, u); } if (ICONES.get(k)) r[dir] = ICONES.get(k); } catch { }
  }
  return r;
});
// 25/11 (pedido dele): rename a project "por completo". FCC renames the folder and moves its conversations/memory; the rest
// (files, code, texts) is a NON-NEGOTIABLE order in the project's CLAUDE.md + memory: next session Claude renames everything first.
const projAberto = (dir) => [...CHATS.values()].some(c => c && c.o && c.o.dir && c.o.dir.toLowerCase() === String(dir).toLowerCase());
const RENOMEAR_INI = '<!-- FCC-RENOMEAR: inicio -->', RENOMEAR_FIM = '<!-- FCC-RENOMEAR: fim -->';
function ordemRenomear(dirNovo, antigos, novo) {
  const d = new Date(), quando = `${ddmm(d)}/${d.getFullYear()}`, lista = antigos.map(x => `"${x}"`).join(', ');
  const bloco = [RENOMEAR_INI,
    '## RENOMEAÇÃO PENDENTE (INEGOCIÁVEL, fazer ANTES de qualquer pedido)',
    `Em ${quando} o usuário renomeou este projeto pelo FCC. Nomes antigos: ${antigos.join(' | ')}. Nome novo: ${novo}.`,
    `O FCC já renomeou a pasta. Antes de atender QUALQUER pedido do usuário, mesmo que ele peça outra coisa, troque ${lista} por "${novo}" em TUDO do projeto:`,
    '- nomes de arquivos e pastas (inclusive .sln, .csproj, .exe, ícones, instaladores);',
    '- conteúdo: código, namespaces, classes, package.json/manifestos, títulos de janela, textos da interface, README, docs, PARADA, CONTEXTO, CLAUDE.md, memória;',
    '- variações: minúsculas, MAIÚSCULAS, CamelCase, com espaço, hífen ou sublinhado.',
    'Não mexa em node_modules, bin, obj, .git nem em dist (refaça o build se o projeto tiver um). Quando acabar: apague este bloco inteiro deste CLAUDE.md, apague a memória renomear-pendente e conte ao usuário o que foi renomeado. Só então atenda o pedido.',
    RENOMEAR_FIM, ''].join('\n');
  const f = path.join(dirNovo, 'CLAUDE.md'); let txt = ''; try { txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch { }
  const i = txt.indexOf(RENOMEAR_INI), j = txt.indexOf(RENOMEAR_FIM);
  if (i >= 0 && j > i) txt = txt.slice(0, i) + txt.slice(j + RENOMEAR_FIM.length).replace(/^\r?\n/, '');
  fs.writeFileSync(f, bloco + txt, 'utf8');
  const md = memDir(dirNovo); fs.mkdirSync(md, { recursive: true });
  fs.writeFileSync(path.join(md, 'renomear-pendente.md'), ['---', 'name: renomear-pendente',
    `description: INEGOCIÁVEL - projeto renomeado de ${antigos.join(' / ')} para ${novo}; renomear tudo antes de atender qualquer pedido`,
    'metadata:', '  type: project', '---', '',
    `Em ${quando} o usuário renomeou o projeto pelo FCC: ${lista} -> "${novo}". A pasta já foi renomeada.`,
    '**Why:** ele quer o projeto renomeado por completo, não só a pasta; isso é inegociável.',
    '**How to apply:** na próxima vez que mexer no projeto, ANTES de atender o pedido, renomeie todos os arquivos, pastas e textos com o nome antigo (todas as variações), seguindo o bloco RENOMEAÇÃO PENDENTE do CLAUDE.md. Depois apague esse bloco e esta memória.', ''].join('\n'), 'utf8');
  const idx = path.join(md, 'MEMORY.md'); let m = ''; try { m = fs.readFileSync(idx, 'utf8'); } catch { }
  m = m.split(/\r?\n/).filter(l => !l.includes('renomear-pendente.md')).join('\n');
  fs.writeFileSync(idx, `- [Renomeação pendente](renomear-pendente.md) — INEGOCIÁVEL: renomear tudo de ${antigos.join('/')} para ${novo} antes de qualquer pedido\n` + m, 'utf8');
}
ipcMain.handle('projeto-renomear', async (e, dir, novo) => {
  dir = path.resolve(String(dir || '')); novo = String(novo || '').trim();
  if (!fs.existsSync(dir)) return { erro: 'A pasta do projeto não existe mais.' };
  if (!novo || /[<>:"/\\|?*\x00-\x1f]/.test(novo) || /[. ]$/.test(novo) || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(novo) || /^[_.]/.test(novo)) return { erro: 'Nome inválido. Não use \\ / : * ? " < > |, nem comece com _ ou ponto.' };
  const velho = path.basename(dir), dirNovo = path.join(path.dirname(dir), novo);
  if (novo === velho) return { erro: 'É o mesmo nome.' };
  if (fs.existsSync(dirNovo) && dirNovo.toLowerCase() !== dir.toLowerCase()) return { erro: 'Já existe uma pasta com esse nome.' };
  if (projAberto(dir)) return { erro: 'Feche as conversas abertas desse projeto antes de renomear.' };
  try { await fs.promises.rename(dir, dirNovo); } catch (err) { logApp('renomear: ' + err.message); return { erro: 'Não deu para renomear: algum programa está usando a pasta (o programa do projeto, um editor ou um terminal aberto nela). Feche e tente de novo.' }; }
  // conversations and memory: perfil\claude\projects\<key of the folder path> (conta\config\projects is a junction to it)
  try { const base = path.join(C.perfilClaude(), 'projects'), a = path.join(base, chaveProj(dir)), b = path.join(base, chaveProj(dirNovo)); if (fs.existsSync(a) && !fs.existsSync(b)) fs.renameSync(a, b); } catch (err) { logApp('renomear conversas: ' + err.message); }
  try { const conv = lerConversas(), k = dir.toLowerCase(), kn = dirNovo.toLowerCase(); if (conv[k]) { const v = { ...conv[k], dir: dirNovo }; delete conv[k]; conv[kn] = v; fs.writeFileSync(CONVERSAS, JSON.stringify(conv, null, 1), 'utf8'); } } catch (err) { logApp('renomear lista: ' + err.message); }
  try { const L = OP.pastas.split(';').map(s => s.trim()); if (L.some(s => s.toLowerCase() === dir.toLowerCase())) { OP.pastas = L.map(s => s.toLowerCase() === dir.toLowerCase() ? dirNovo : s).join(';'); salvarOpcoes(); } } catch { }
  // older names stay in the order until Claude does the work (renamed twice before opening = both names)
  let antigos = [velho]; try { const t = fs.readFileSync(path.join(dirNovo, 'CLAUDE.md'), 'utf8'), m = t.match(/Nomes antigos: (.+?)\. Nome novo/); if (m) antigos = [...new Set([...m[1].split(' | '), velho])].filter(x => x !== novo); } catch { }
  try { ordemRenomear(dirNovo, antigos, novo); } catch (err) { logApp('renomear ordem: ' + err.message); return { dir: dirNovo, aviso: 'Pasta renomeada, mas não consegui gravar o aviso no CLAUDE.md do projeto.' }; }
  registrar(`RENOMEAR: ${velho} -> ${novo}`);
  return { dir: dirNovo };
});
ipcMain.handle('projeto-excluir', async (e, dir) => {   // to the Recycle Bin, never a permanent delete
  dir = path.resolve(String(dir || '')); if (!fs.existsSync(dir)) return { erro: 'A pasta do projeto não existe mais.' };
  if (projAberto(dir)) return { erro: 'Feche as conversas abertas desse projeto antes de excluir.' };
  try { await shell.trashItem(dir); registrar('EXCLUIR: ' + dir + ' (Lixeira)'); return { ok: true }; } catch (err) { logApp('excluir: ' + err.message); return { erro: 'Não deu para mandar para a Lixeira: algum programa está usando a pasta. Feche e tente de novo.' }; }
});
ipcMain.handle('pasta', (e, dir) => { shell.openPath(dir); return true; });
ipcMain.handle('parada', (e, dir) => { const f = ['PARADA.md', 'PRA-TESTAR.md'].map(x => path.join(dir, 'docs', x)).filter(x => fs.existsSync(x)); for (const x of f) cp.spawn('notepad.exe', [x], { detached: true, stdio: 'ignore' }).unref(); return f.length > 0; });
ipcMain.on('sessao', (e, abas) => salvarSessao(abas));
ipcMain.on('janela', (e, a) => {
  if (!win) return;
  if (a === 'min') win.minimize(); else if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (a === 'bandeja') { win.hide(); avisarBandeja(); }
  else if (a === 'sair' || a === 'fechar') sairDeVerdade(); else if (a === 'atualizar') sairDeVerdade(true);   // update: window stays showing "Atualizando…" until it closes
});
ipcMain.on('tamanho', (e, t) => { OP.tam = t === 'min' ? 'min' : 'max'; salvarOpcoes(); aplicarTamanho(); });
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
ipcMain.handle('criar-pasta-projetos', async () => { const r = await dialog.showOpenDialog(win, { title: 'Onde criar a pasta Projetos', defaultPath: app.getPath('documents'), buttonLabel: 'Criar aqui', properties: ['openDirectory'] });
  if (r.canceled) return null; const d = path.join(r.filePaths[0], 'Projetos'); try { fs.mkdirSync(d, { recursive: true }); return d; } catch { return null; } });
ipcMain.handle('escolher-pasta', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
let ERROS_JS = 0, ERRO_JS1 = '';   // 25/10: JavaScript error in UI fails build (empacotar.js reads 'erros js')
ipcMain.on('fim-teste', (e, rel) => { if (rel) try { fs.writeFileSync(path.join(TESTE.autoteste, 'resultado.txt'), rel + '\nerros js: ' + ERROS_JS + (ERROS_JS ? ' (' + ERRO_JS1 + ')' : ''), 'utf8'); } catch { } app.exit(0); });

// ---- test script (keys sent straight to page; user's mouse and keyboard stay free) ----
const TECLA_CODIGO = { Enter: 'Return', Esc: 'Escape' };
async function rodarRoteiro() {
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  let wc = win.webContents;
  for (const passo of TESTE.roteiro.split(';').map(s => s.trim()).filter(Boolean)) {
    const [k, ...r] = passo.split(':'); const v = r.join(':');
    logApp('roteiro: ' + passo);
    if (k === 'espera') await esperar(+v);
    else if (k === 'alvo') { if (v === 'assist' && ASSIST) { ASSIST.mostrar(); await esperar(1500); wc = ASSIST.wc(); } else wc = win.webContents; }   // steps go to the assistant window (FCC_TESTE_ASSIST=1)
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
    else if (k === 'sair') { for (const id of [...CHATS.keys()]) fecharChat(id); if (USO_Q) { try { USO_Q.q.close(); } catch { } USO_Q = null; } await esperar(500); app.exit(0); return; }
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
    bandeja.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir', click: mostrarJanela }, { label: 'Assistente (Ctrl+Alt+Espaço)', click: () => ASSIST && ASSIST.mostrar() }, { type: 'separator' }, { label: 'Sair', click: sairDeVerdade }]));
    bandeja.on('click', mostrarJanela);
  } catch (e) { logApp('bandeja: ' + e.message); }
}
function avisarBandeja() { if (avisouBandeja || !bandeja) return; avisouBandeja = true; try { bandeja.displayBalloon({ title: 'Claude Code continua aberto', content: 'As conversas seguem na bandeja. Para sair: segure o ✕ por 1 segundo ou "Sair" aqui.', iconType: 'info' }); } catch { } }
// Stops everything the app owns (conversations, terminals, helpers). Used on real quit and before removing FCC.
function pararTudo() {
  // 01/11 (user request): helpers stop with the program; closing the CLI alone leaves its children running on Windows
  if (!QUIETO) { for (const c of CHATS.values()) c.fechado = true; AJUDANTES.pararTudo(path.basename(acharClaude() || 'claude.exe')); }
  for (const id of [...CHATS.keys()]) fecharChat(id); if (USO_Q) { try { USO_Q.q.close(); } catch { } USO_Q = null; }
}
function sairDeVerdade(ficar) { SAINDO = true; try { if (!ficar && win && !win.isDestroyed()) win.hide(); } catch { } // 24/11: janela some na hora; o resto fecha por trás
  if (bandeja) { try { bandeja.destroy(); } catch { } bandeja = null; } if (win && !win.isDestroyed()) win.close(); else app.quit(); }
const pad = (n) => String(n).padStart(2, '0');
const quando = (d) => { d = new Date(d); const h = new Date(), ont = new Date(h); ont.setDate(h.getDate() - 1);
  return (d.toDateString() === h.toDateString() ? 'hoje' : d.toDateString() === ont.toDateString() ? 'ontem' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const volta = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const h = new Date(), am = new Date(h); am.setDate(h.getDate() + 1); const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  return d.toDateString() === h.toDateString() ? hm : d.toDateString() === am.toDateString() ? 'amanhã às ' + hm : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getDay()] + ' às ' + hm; };
const comPrazo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
let CLAUDE_VER = null;
function claudeVersao() { if (CLAUDE_VER != null) return Promise.resolve(CLAUDE_VER); const c = acharClaude(); if (!c) return Promise.resolve('não instalado');
  return new Promise(ok => cp.execFile(c, ['--version'], { windowsHide: true, timeout: 8000, encoding: 'utf8' }, (err, out) => { CLAUDE_VER = err ? '—' : (String(out).match(/\d+\.\d+\.\d+/) || ['—'])[0]; ok(CLAUDE_VER); })); }
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
const primeiras = (txt, n) => txt.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^(#|@|---|name:|description:|metadata:|type:)/.test(l)).slice(0, n).join(' ').replace(/[*_`]/g, '');
function regrasEMemoria() {
  const fam = FAM;
  const regras = [['Regras da casa', 'CLAUDE-global.md'], ['Gostos', 'GOSTOS.md']].filter(([, a]) => fs.existsSync(path.join(fam, a)))
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
      const r = R[x.sessionId] || {}, assist = !!r.assist || ehAssistNome(x.customTitle);
      const gen = (y) => !y || /^chat livre( \(local\))?$/i.test(y) || ehAssistNome(y), t = r.titulo || (!gen(x.customTitle) && x.customTitle) || (!gen(x.summary) && x.summary) || x.firstPrompt;   // app names every free conversation "chat livre" (assistant: "assistente"): then 1st message applies
      if (!t) continue;                                                    // opened and never used: nothing to save
      if (assist && !r.titulo) nomearAssist(x.sessionId, x.firstPrompt, '');   // assistant chat still called "assistente": Haiku names it (background, once)
      L.push({ id: x.sessionId, dir: d, assist, titulo: String(t).replace(/\s+/g, ' ').trim().slice(0, 90), t: x.lastModified || 0, quando: quando(x.lastModified || Date.now()) });
    }
  }
  return L.sort((a, b) => b.t - a.t);
}
// 14/11 (user request): assistant window chats get their own rail section ("Assistente") and a real name (Haiku, from the 1st message),
// instead of drafts all called "assistente". Mark + name live in fcc-rascunhos.json (assist, titulo); renameSession too (Retomar).
const ehAssistNome = (y) => /^assistente( \(local\))?$/i.test(String(y || '').trim());
let FILA_NOME = Promise.resolve(); const NOMEANDO = new Set();
function rascMudou() { if (win && !win.isDestroyed()) win.webContents.send('rasc-mudou'); }
function nomearAssist(id, pedido, resposta) {
  if (QUIETO || !id || NOMEANDO.has(id) || !String(pedido || '').trim()) return; NOMEANDO.add(id);
  FILA_NOME = FILA_NOME.then(async () => {
    if ((lerRasc()[id] || {}).titulo) return;
    const t = await titular(pedido, resposta, 'haiku', id, LIVRE); if (!t) return;
    const R = lerRasc(); R[id] = { ...(R[id] || {}), assist: 1, titulo: t }; gravarRasc(R); rascMudou();
  }).catch(e => logApp('nomear assistente: ' + e.message)).finally(() => NOMEANDO.delete(id));
}
function assistTurnou(id, pedido, resposta) {
  if (QUIETO || !id) return; const R = lerRasc(), r = R[id] = R[id] || {};
  if (!r.assist) { r.assist = 1; gravarRasc(R); }
  if (r.titulo) rascMudou(); else nomearAssist(id, pedido, resposta);
}
function levarConversa(id, de, para) {
  const a = sessArq(de, id), b = sessArq(para, id);
  if (a.toLowerCase() !== b.toLowerCase() && fs.existsSync(a) && !fs.existsSync(b)) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
}
async function rascunhoAcao(ac, id, v) {
  const L = await rascunhos(), c = L.find(x => x.id === id); if (!c) return { ok: false, erro: 'Esse rascunho não existe mais.' };
  const R = lerRasc(); R[id] = R[id] || {};
  if (ac === 'abrir') { levarConversa(id, c.dir, LIVRE); return { ok: true }; }
  if (ac === 'renomear') { R[id].titulo = String(v || '').trim().slice(0, 90); gravarRasc(R); return { ok: true }; }
  if (ac === 'apagar') { try { await shell.trashItem(sessArq(c.dir, id)); } catch (e) { return { ok: false, erro: 'Não consegui mandar para a Lixeira: ' + e.message }; }
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
ipcMain.handle('rascunhos', () => QUIETO ? [] : rascunhos().catch(e => { logApp('rascunhos: ' + e.message); return []; }));
ipcMain.handle('rascunho', (e, ac, id, v) => QUIETO ? { ok: false } : rascunhoAcao(ac, id, v).catch(er => ({ ok: false, erro: er.message })));
// ---- window ----
// temp (24/11, pedido dele): ao abrir apaga o que ficou parado 7 dias; se passar de 15 GB apaga do mais velho ao mais novo
const TEMP_FICA = new Set(['electron', 'atualizacao', 'preparar', 'abas', 'claude', 'casa-plugin', 'node-compile-cache', 'crash']);
async function limparTemp() {
  const P = fs.promises, raiz = C.temp(), ag = Date.now(), L = [];
  const tam = async p => { try { const st = await P.lstat(p); if (!st.isDirectory()) return st.size; let n = 0; for (const x of await P.readdir(p)) n += await tam(path.join(p, x)); return n; } catch { return 0; } };
  for (const n of await P.readdir(raiz).catch(() => [])) { if (TEMP_FICA.has(n)) continue; const p = path.join(raiz, n); try { L.push({ p, t: (await P.stat(p)).mtimeMs, b: await tam(p) }); } catch { } }
  let total = L.reduce((s, x) => s + x.b, 0); L.sort((a, b) => a.t - b.t);
  for (const x of L) { if (ag - x.t < 7 * 864e5 && total <= 15 * 2 ** 30) break; await P.rm(x.p, { recursive: true, force: true }).then(() => { total -= x.b; }, () => { }); }
}
app.on('web-contents-created', (e, wc) => { if (wc.getType() === 'webview') NAV.registrar(wc); });
app.whenReady().then(() => {
  if (SAINDO) return;
  if (!QUIETO) setTimeout(limparTemp, 60000);
  setTimeout(() => { sdk().catch(() => { }); conferirIcones(); claudeVersao().catch(() => { }); }, 2500);
  if (!QUIETO) setTimeout(() => { if (OP.autoAtual !== '0') procurarAtualizacao('ao abrir'); }, 15000);   // auto-update check, after warm-up   // warm up slow stuff before 1st click                       // closing to apply pending update
  lerOpcoes();
  const teste = QUIETO;
  const [lw, la] = TAM[OP.tam === 'min' ? 'min' : 'max'];
  const opts = { width: teste ? (process.env.CCT_TESTE_MIN ? 1080 : 1440) : lw, height: teste ? (process.env.CCT_TESTE_MIN ? 608 : 810) : la, minWidth: 1080, minHeight: 608, frame: false, backgroundColor: OP.tema === 'escuro' ? '#202124' : '#dfe3e8', title: 'Claude Code',
    icon: path.join(__dirname, 'icone.ico'), show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, webviewTag: true, backgroundThrottling: !teste } };   // test: offscreen window keeps painting (shot)
  if (teste) { opts.x = -4000; opts.y = 100; opts.skipTaskbar = true; }
  win = new BrowserWindow(opts);
  win.setMenu(null);
  win.webContents.on('will-attach-webview', NAV.proteger);
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
  win.webContents.on('did-finish-load', () => { win.webContents.setZoomFactor(1); });
  if (!teste) criarBandeja();
  if (!teste || (TESTE.roteiro && process.env.FCC_TESTE_ASSIST)) { try { ASSIST = require('./assistente.js')({ C, logApp, LIVRE, tema: () => OP.tema, abrirNoFcc: (sessao) => { mostrarJanela(); if (sessao && win && !win.isDestroyed()) win.webContents.send('abrir-livre', sessao, (lerRasc()[sessao] || {}).titulo || ''); } }); } catch (e) { logApp('assistente: ' + (e.stack || e)); } }
  win.loadFile(path.join(__dirname, 'tela', 'ca', 'index.html'));
  win.once('ready-to-show', () => { if (teste) win.showInactive(); else win.show(); if (TESTE.roteiro) setTimeout(rodarRoteiro, 500); });
  win.on('maximize', () => enviar('max', true)); win.on('unmaximize', () => enviar('max', false));
  win.on('close', (e) => {
    if (!SAINDO && !QUIETO) { e.preventDefault(); win.hide(); avisarBandeja(); return; }   // ✕ (or Alt+F4) hides to tray; quit = hold ✕ 1 s or "Sair" in tray
    pararTudo(); if (ASSIST) ASSIST.destruir();   // hidden assistant window would keep the app alive
  });
});
// single instance: opening again brings up already-open window
// (tests skip the lock: run beside open copy without bringing it forward)
const SEGUNDA = !QUIETO && !app.requestSingleInstanceLock(); if (SEGUNDA) app.quit();
// new .exe waiting in temp\atualizacao\pendente (build doesn't close app: Claude runs inside). Applied by watcher
// (resources\app\ferramentas\atualizar.js, run by this exe as node): waits for this app to close, copies and reopens with --atualizou.
const PENDENTE = C.temp('atualizacao', 'pendente'), VIGIA = path.join(process.resourcesPath || CCT, 'app', 'ferramentas', 'atualizar.js'), NODE = process.execPath;
function soltarVigia() { if (!fs.existsSync(PENDENTE) || !fs.existsSync(VIGIA) || !fs.existsSync(NODE)) return false; cp.spawn(NODE, [VIGIA], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', FCC_RAIZ: CCT }, detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(VIGIA) }).unref(); return true; }
let SAINDO = false;
// auto-update (03/11): GitHub releases/latest -> download, check, extract into PENDENTE; watcher applies on close
const ATUAL = { rodando: null, ultimo: null };
function procurarAtualizacao(motivo) {
  if (ATUAL.rodando) return ATUAL.rodando;
  const pode = app.isPackaged && C.ehDaRaiz(process.execPath, CCT);
  if (!pode && !process.env.FCC_TESTE_API) return Promise.resolve(ATUAL.ultimo = { estado: 'erro', versao: '', erro: 'só a cópia instalada procura atualização', quando: Date.now() });
  enviar('atualizacao', { estado: 'procurando' });
  ATUAL.rodando = require('./atualizacao.js').procurar({ atual: app.getVersion(), pasta: path.dirname(PENDENTE), progresso: (b, t) => enviar('atualizacao', { estado: 'baixando', pct: t ? Math.round(b * 100 / t) : 0 }) })
    .catch(e => ({ estado: 'erro', versao: '', erro: e.message }))
    .then(r => { r.quando = Date.now(); ATUAL.ultimo = r; ATUAL.rodando = null; logApp('atualização (' + motivo + '): ' + r.estado + ' ' + (r.versao || '') + ' ' + (r.erro || ''));
      if (r.estado === 'pronta' && pode) { soltarVigia(); tentarAoVivo('github'); }
      enviar('atualizacao', r); return r; });
  return ATUAL.rodando;
}
ipcMain.handle('atualizar-procurar', () => QUIETO && !process.env.FCC_TESTE_API ? { estado: 'erro', erro: 'teste não procura atualização' } : procurarAtualizacao('botão'));
if (!QUIETO && !SEGUNDA && app.isPackaged && C.ehDaRaiz(process.execPath, CCT) && soltarVigia()) {
  logApp('atualização pendente: fechando para o vigia aplicar'); SAINDO = true;
  // 25/10: before, it vanished silently and icon seemed not to open (user rebooted PC, thought it failed): warn and exit
  app.whenReady().then(() => { const w = new BrowserWindow({ width: 380, height: 104, frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: false, backgroundColor: '#14161d', title: 'FCC', icon: path.join(__dirname, 'icone.ico') });
    w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="margin:0;font:14px Segoe UI,sans-serif;color:#f1f3f9;background:#14161d;display:flex;align-items:center;gap:14px;padding:0 22px;height:100vh;box-sizing:border-box;-webkit-app-region:drag"><div style="width:18px;height:18px;border:2px solid #ff7849;border-right-color:transparent;border-radius:50%;animation:g .8s linear infinite"></div><div><b>Atualizando o FCC…</b><div style="color:#8a92aa;font-size:12px;margin-top:3px">Ele abre sozinho em alguns segundos.</div></div><style>@keyframes g{to{transform:rotate(360deg)}}</style></body>'));
    setTimeout(() => app.quit(), 1800); });          // opening with pending build (e.g. after PC reboot), apply first
}
app.on('second-instance', (e, argv) => {
  const ip = argv.indexOf('--projeto'); if (ip >= 0 && argv[ip + 1] && win) { mostrarJanela(); enviar('abrir-projeto', argv[ip + 1]); return; }   // project icon at root (launcher)
  if (argv.includes('--tela-ao-vivo')) { tentarAoVivo('build'); return; }   // empacotar.js: new build in PENDENTE
  if (argv.includes('--reiniciar-para-atualizar') && win) { logApp('reiniciar para atualizar (pedido pelo build)'); reiniciarParaAtualizar(); return; }
  mostrarJanela();
});
app.on('window-all-closed', () => app.quit());
// UPDATE with the program open: nothing reloads or closes by itself.
let RECARREGOU = false, AO_VIVO = false;
const ocioso = () => ![...CHATS.values()].some(c => c.ocupado || c.passando || c.perms.size);
const RELINK = "for (const l of document.querySelectorAll('link[rel=stylesheet]')) { const u = new URL(l.href); u.searchParams.set('v', Date.now()); l.href = u.href; } 1";
// comparing/copying hundreds of MB froze the program ~20 s when done on the main process: it runs in a worker thread
const noFundo = (fn, ...args) => new Promise((ok, erro) => {
  const w = new (require('worker_threads').Worker)("const { workerData: d, parentPort: p } = require('worker_threads'); p.postMessage(require(d.m)[d.fn](...d.args));", { eval: true, workerData: { m: VIGIA, fn, args } });
  w.once('message', ok); w.once('error', erro); w.once('exit', () => erro(new Error('worker saiu sem resposta')));
});
const podeAtualizar = () => app.isPackaged && C.ehDaRaiz(process.execPath, CCT) && !QUIETO && win && !win.isDestroyed() && fs.existsSync(PENDENTE);
async function aplicarAgora(d) {
  const r = await noFundo('aplicar', PENDENTE, CCT); await fs.promises.rm(PENDENTE, { recursive: true, force: true });
  logApp(`ao vivo: aplicado ${r.novos} copiado(s), ${r.removidos} removido(s)`);
  const todos = [...d.mudados, ...d.removidos], ehAssist = (x) => /[\\/]tela[\\/]assistente[\\/]/i.test(x);
  return { assist: todos.some(ehAssist), principal: todos.some(x => !ehAssist(x)), wa: ASSIST && ASSIST.wc && ASSIST.wc() };
}
// CSS only: applied at once, nothing reloads. Anything else: only shows the "Atualizar agora" button; nothing happens without the click.
async function tentarAoVivo(motivo) {
  if (AO_VIVO || !podeAtualizar()) return;
  AO_VIVO = true;
  try {
    const d = await noFundo('diferencas', PENDENTE, CCT), todos = [...d.mudados, ...d.removidos];
    if (todos.length && require(VIGIA).soTela(d) && todos.every(r => /\.css$/i.test(r))) {
      const t = await aplicarAgora(d);
      if (t.assist && t.wa) t.wa.executeJavaScript(RELINK).catch(() => { });
      if (t.principal) { win.webContents.executeJavaScript(RELINK).catch(() => { }); enviar('tela-atualizada'); }
    } else { logApp(`ao vivo (${motivo}): ${todos.length} arquivo(s); esperando o clique em "Atualizar agora"`); enviar('versao-pronta'); }
  } catch (e) { logApp('ao vivo: ' + e.message + '; fica para quando fechar'); }
  AO_VIVO = false;
}
// click: screen-only = reload the page; anything else = save tabs, close and the watcher reopens updated
// 25/11: clicked while Claude works = applies by itself when the turn ends (button said nothing and vanished before)
let ATUALIZAR_DEPOIS = false;
ipcMain.handle('atualizar-agora', () => atualizarAgora());
async function atualizarAgora() {
  if (AO_VIVO || !podeAtualizar()) return 'nada';
  if (!ocioso()) { ATUALIZAR_DEPOIS = true; return 'depois'; }
  ATUALIZAR_DEPOIS = false; AO_VIVO = true;
  try {
    const d = await noFundo('diferencas', PENDENTE, CCT);
    if (require(VIGIA).soTela(d)) {
      const t = await aplicarAgora(d);
      if (t.assist && t.wa) { for (const id of [...CHATS.keys()]) if (String(id).startsWith('assist')) fecharChat(id); t.wa.reloadIgnoringCache(); }
      if (t.principal) recarregarTela();
    } else reiniciarParaAtualizar();
  } catch (e) { logApp('atualizar agora: ' + e.message); AO_VIVO = false; return 'erro'; }
  AO_VIVO = false; return 'ok';
}
function reiniciarParaAtualizar() { soltarVigia(); enviar('reiniciar'); setTimeout(() => { if (win && !win.isDestroyed()) sairDeVerdade(true); }, 8000); }
// main window: renderer saves tabs + drafts + active tab (api.sessao), answers; then chats close and the page reloads; 'dados' says atualizou once
let RECARGA = null;
function recarregarTela() {
  if (!win || win.isDestroyed()) return;
  RECARGA = setTimeout(() => { RECARGA = null; logApp('ao vivo: a tela não respondeu; a tela nova entra ao reabrir'); }, 10000);
  enviar('tela-recarregar');
}
ipcMain.on('tela-recarregar-ok', () => {
  if (!RECARGA) return; clearTimeout(RECARGA); RECARGA = null;
  if (!ocioso()) { logApp('ao vivo: ficou ocupado antes de recarregar; tento de novo quando parar'); const t = setInterval(() => { if (ocioso()) { clearInterval(t); recarregarTela(); } }, 2000); return; }
  for (const id of [...CHATS.keys()]) if (!String(id).startsWith('assist')) fecharChat(id);
  RECARREGOU = true; logApp('ao vivo: tela recarregada'); win.webContents.reloadIgnoringCache();
});
