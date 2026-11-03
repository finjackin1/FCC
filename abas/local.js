// Plain conversation with local AI (23/10/2026, user request): talks direct to Ollama (/api/chat), WITHOUT Claude Code.
// Via Claude Code each request carried ~17–30k tokens of rules and tools (minutes on 1st request); here only short memory
// (casa\memoria\local.md: what exists and how it works; AI only reads, doesn't save) + the conversation.
// Tools with same names and fields as Claude's (Read, Glob, Grep, Write, Edit, PowerShell, WebFetch, Skill): UI shows them the same.
// Returns messages in Claude Code library format (stream_event, assistant, user, result): main.js and UI unchanged.
'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const crypto = require('crypto');

module.exports = function (dep) {      // dep = { OP, OLLAMA_URL, PASTA_CONVERSAS, CASA, PENSAR, logApp, vel(aba, {tps, fim, primeira}) }
  const PASTA = dep.PASTA_CONVERSAS;           // one conversation = <sessao>.json (Claude Code doesn't store these)
  // 24/10: all from CCT home (casa\memoria\local.md, casa\skills + user's personal layer, casa\aprendizado)
  const CASA = dep.CASA;
  const MEMORIA = path.join(CASA, 'memoria', 'local.md');
  const APRENDI = path.join(CASA, 'aprendizado', 'APRENDIZADOS.md');
  // local AI aliases: "x.local = y" applies only here and overrides "x = z" (e.g. rea = short skill re-pratico; Claude keeps full one)
  const apsLocal = () => { const L = dep.apelidos ? dep.apelidos() : [], m = new Map(); for (const l of L) { const [k, v] = l.split("=").map(x => x.trim()); if (!k.endsWith(".local") && !m.has(k)) m.set(k, v); } for (const l of L) { const [k, v] = l.split("=").map(x => x.trim()); if (k.endsWith(".local")) m.set(k.slice(0, -6), v); } return [...m].map(([k, v]) => k + " = " + v); };
  const pastasSkills = () => [path.join(CASA, 'skills'), ...(dep.camada && dep.camada() ? String(dep.camada()).split(';').map(x => x.trim()).filter(Boolean) : [])];
  const arq = (s) => path.join(PASTA, String(s).replace(/[^\w-]/g, '') + '.json');
  const ler = (s) => { try { return JSON.parse(fs.readFileSync(arq(s), 'utf8')); } catch { return null; } };
  const gravar = (s, x) => { try { fs.mkdirSync(PASTA, { recursive: true }); fs.writeFileSync(arq(s), JSON.stringify(x), 'utf8'); } catch (e) { dep.logApp('conversa local: ' + e.message); } };
  const corta = (t, n) => (t = String(t == null ? '' : t)).length > n ? t.slice(0, n) + `\n… (cortado: ${t.length - n} caracteres a mais)` : t;

  // ---- memory (30/10, user request: local AI remembers, learns, knows what it's doing; minimum tokens) ----
  // Built by the program, never by an extra model call:
  //  fatos  → casa\memoria\ia-local\lembrancas.md ("- data · geral|<projeto> · fato"): geral always in system (stable = KV cache),
  //           project ones enter the request when its words match (each fact once per chat)
  //  diário → ia-local\diario\<projeto>.md, 1 line per request (pedido → fez → resposta); last 3 go with a new chat's 1st request
  //  tarefa → what the previous request did (tool steps leave the window), so follow-ups know where they are
  const MEMDIR = path.join(CASA, 'memoria', 'ia-local'), LEMB = path.join(MEMDIR, 'lembrancas.md');
  const projDe = (dir) => /chat-livre$/i.test(dir) ? 'chat-livre' : path.basename(dir);
  const umaLinha = (t, n) => { t = String(t || '').replace(/\[(pistas|memória|lembro|tarefa)\][\s\S]*$/, '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const data = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const lembrancas = () => { try { return fs.readFileSync(LEMB, 'utf8').split(/\r?\n/).filter(l => /^- \S+ · [^·]+ · /.test(l)); } catch { return []; } };
  const fatoDe = (l) => l.replace(/^- \S+ · [^·]+ · /, '');
  function lembrar(fato, onde) {
    const f = umaLinha(fato, 220).replace(/^(que|de)\s+/i, ''); if (f.length < 6) throw new Error('fato curto demais');
    if (lembrancas().some(l => semAc(fatoDe(l)) === semAc(f))) return 'Já estava guardado.';
    fs.mkdirSync(MEMDIR, { recursive: true }); if (!fs.existsSync(LEMB)) fs.writeFileSync(LEMB, '# Local AI memory: what it learned about him and the projects (one fact per line; edit/delete freely)\n', 'utf8');
    fs.appendFileSync(LEMB, `- ${data()} · ${onde} · ${f}\n`, 'utf8'); return 'Guardado na memória.';
  }
  function esquecer(alvo, proj) {
    const L = lembrancas(), vis = L.filter(l => / · geral · /.test(l) || l.includes(` · ${proj} · `)); let sai;
    if (/^\d+$/.test(alvo)) sai = vis[parseInt(alvo, 10) - 1]; else { const a = semAc(alvo); sai = a.length >= 3 && vis.find(l => semAc(fatoDe(l)).includes(a)); }
    if (!sai) return null;
    const tudo = fs.readFileSync(LEMB, 'utf8').split(/\r?\n/), i = tudo.indexOf(sai); if (i >= 0) tudo.splice(i, 1); fs.writeFileSync(LEMB, tudo.join('\n'), 'utf8'); return fatoDe(sai);
  }
  const memGeral = () => lembrancas().filter(l => / · geral · /.test(l)).slice(-12).map(l => '- ' + fatoDe(l)).join('\n');
  function memDoPedido(proj, chaves, ja) {      // project facts: newest 2 + those sharing a 4+ letter word with request; max 5, each once per chat
    const L = lembrancas().filter(l => l.includes(` · ${proj} · `) && !ja.includes(semAc(fatoDe(l)).slice(0, 50)));
    const bate = L.filter(l => chaves.some(c => c.length >= 4 && semAc(l).includes(c))), R = [...new Set([...bate.slice(-3), ...L.slice(-2)])].slice(-5).map(fatoDe);
    R.forEach(f => ja.push(semAc(f).slice(0, 50))); return R;
  }
  const DIARIO = (proj) => path.join(MEMDIR, 'diario', proj.replace(/[^\w.-]/g, '_') + '.md');
  const diarioLer = (proj, n) => { try { return fs.readFileSync(DIARIO(proj), 'utf8').split(/\r?\n/).filter(l => l.startsWith('- ')).slice(-n); } catch { return []; } };
  function diarioPor(proj, linha) {
    try { const f = DIARIO(proj), L = diarioLer(proj, 39); fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, `# Local AI diary: ${proj} (1 line per request, last 40)\n` + [...L, linha].join('\n') + '\n', 'utf8'); } catch (e) { dep.logApp('diário local: ' + e.message); }
  }
  // "lembre que…", "anote:", "guarde isso: …" at message start: saved by the program (small model often forgot to call the tool)
  // tested with qwen2.5-coder 7b: it said "Entendido" and called nothing; so the program catches, anywhere in the message:
  //  "lembre que X" / "anota: X" · "X, guarda isso" · and statements about himself ("meu nome é", "eu prefiro", "meu … favorito")
  const VERBO = '(?:lembr[ae](?:-se)?|anot[ae]|guard[ae]|grav[ae]|memoriz[ae])';
  const SOBRE_ELE = /\b(meu nome [ée]|me chamo|eu prefiro|prefiro que|eu gosto|n[ãa]o gosto|eu odeio|eu uso|eu moro|eu trabalho|minh?[ao] [\wçãéêíóõú ]{1,25} favorit[oa]|sempre (quero|fa[çc]a|use)|nunca (fa[çc]a|use|quero))\b/i;
  function fatosDe(txt) {
    const t = String(txt).replace(/\[anexo:[\s\S]*?(\[fim do anexo\]|\])/g, ' '), R = [];
    const a = t.match(new RegExp(VERBO + '\\s*(?:isso|isto|sempre)?\\s*(?:que|de|:)\\s+([\\s\\S]{6,})', 'i')); if (a) R.push({ f: a[1], pedido: true });
    const b = !a && t.match(new RegExp('^([\\s\\S]{6,}?)[\\s,;.!-]+(?:e\\s+)?' + VERBO + '\\s+(?:isso|isto|disso)\\b', 'i')); if (b) R.push({ f: b[1].replace(/^\s*(ali[áa]s|ah|ent[ãa]o|olha)[,!]?\s*/i, ''), pedido: true });
    if (!R.length) for (const s of t.split(/(?<=[.!?\n])\s+/)) if (SOBRE_ELE.test(s) && !/\?\s*$/.test(s)) R.push({ f: s.replace(/^\s*(oi|ol[áa]|ali[áa]s|ah|ent[ãa]o)[,!]?\s*/i, '').replace(/[.!]+$/, '') });
    return R.map(x => ({ ...x, f: x.f.replace(/^\s*(oi|ol[áa])[,!]?\s*/i, '').trim() })).filter(x => x.f.length >= 6).slice(0, 3);
  }
  // attached files (@path, from drag-and-drop): small text goes inside the request; others become a note (Read gives a summary)
  function anexos(txt) {
    const R = []; let resto = String(txt);
    for (;;) { const m = resto.match(/^\s*@(?:"([^"]+)"|(\S+))[ \t]*\n?/); if (!m) break; const f = m[1] || m[2]; if (!/^[a-z]:[\\/]/i.test(f)) break; R.push(f); resto = resto.slice(m[0].length); }
    if (!R.length) return txt;
    const blocos = R.map(f => { let st; try { st = fs.statSync(f); } catch { return `[anexo: ${f} (não achei)]`; }
      if (/\.(png|jpe?g|gif|webp)$/i.test(f)) return `[anexo: imagem ${f}; você não vê imagens: diga isso se ele pedir o que tem nela]`;
      if (st.size <= 12000 && !binario(f)) return `[anexo: ${f}]\n${fs.readFileSync(f, 'utf8')}\n[fim do anexo]`;
      return `[anexo: ${f}, ${Math.round(st.size / 1024)} KB: leia com Read só o que precisar]`; });
    return blocos.join('\n') + '\n\n' + (resto.trim() || 'Veja o anexo.');
  }

  function ultimaDaPasta(dir) {          // "Retomar": most recent local conversation in this folder
    let melhor = null, t = 0;
    try { for (const f of fs.readdirSync(PASTA)) { if (!f.endsWith('.json')) continue; const p = path.join(PASTA, f), m = fs.statSync(p).mtimeMs; if (m <= t) continue; const j = ler(f.slice(0, -5)); if (j && j.dir && j.dir.toLowerCase() === String(dir).toLowerCase()) { melhor = f.slice(0, -5); t = m; } } } catch { }
    return melhor;
  }
  function historico(s, ate) {
    const j = ler(s); if (!j) return [];
    const T = j.tela || []; if (!ate) return T;
    const i = T.findIndex(x => x.uuid === ate); return i < 0 ? T : T.slice(0, i + 1);
  }

  // ---- tools ----
  // minimal descriptions: sent in every request (24/10, user request: minimum tokens)
  const FERR = [
    ['Read', 'Ler arquivo', { file_path: 's', offset: 'n', limit: 'n' }, ['file_path']],
    ['Glob', 'Achar arquivos (ex. **/*.md)', { pattern: 's', path: 's' }, ['pattern']],
    ['Grep', 'Buscar texto (regex) nos arquivos', { pattern: 's', path: 's', glob: 's' }, ['pattern']],
    ['Write', 'Criar/substituir arquivo', { file_path: 's', content: 's' }, ['file_path', 'content']],
    ['Edit', 'Trocar trecho exato (old_string único)', { file_path: 's', old_string: 's', new_string: 's', replace_all: 'b' }, ['file_path', 'old_string', 'new_string']],
    ['PowerShell', 'Rodar comando PowerShell 5.1', { command: 's', description: 's' }, ['command']],
    ['Skill', 'Abrir receita (sem skill = lista)', { skill: 's' }, []],
    ['Aprender', 'Guardar 1 lição reaproveitável: situação → faça X, evita Y', { licao: 's' }, ['licao']],
    ['Lembrar', 'Guardar fato duradouro sobre ele ou o projeto (nome, gosto, decisão, onde fica algo); geral=true se vale para todo projeto', { fato: 's', geral: 'b' }, ['fato']],
    ['MCP', 'Servidor MCP (sem ferramenta = lista)', { servidor: 's', ferramenta: 's', args: 'o' }, []],
    ['Rodar', 'Rodar arquivo .js/.py/.ps1 da pasta e ver saída e erros (para testar seu código)', { arquivo: 's', args: 's' }, ['arquivo']],
    ['WebSearch', 'Pesquisar na internet', { query: 's' }, ['query']],
    ['WebFetch', 'Abrir página', { url: 's' }, ['url']],
  ].map(([name, description, props, required]) => ({ type: 'function', function: { name, description, parameters: { type: 'object', required,
    properties: Object.fromEntries(Object.entries(props).map(([k, t]) => [k, { type: { s: 'string', n: 'integer', b: 'boolean', o: 'object' }[t] }])) } } }));
  const WEB = new Set(['WebSearch', 'WebFetch']);
  // 30/10: stall watchdog (s): 1st piece may wait model load + prompt read; between pieces a working model sends many per second
  const [VIGIA_1 = 300, VIGIA_N = 90, VIGIA_F = 300] = dep.vigia || [];   // dep.vigia = test only
  // 30/10: Ollama sends NOTHING while the model writes a tool call (args come whole at the end) → 30b writing calc.js after "Vou criar…:" looked stalled at 90 s
  // tool call written as text: <tool_call>{…}</tool_call>, ```json {…}```, or the whole reply being {"name","arguments"}; only known tool names
  const chamadasNoTexto = (t) => { const R = [], nomes = new Set(FERR.map(f => f.function.name)), ok = (s) => { try { const x = JSON.parse(s), a = x.arguments || x.parameters || x.input;
      if (x && nomes.has(x.name) && a && typeof a === 'object') R.push({ function: { name: x.name, arguments: a } }); } catch { } };
    for (const m of String(t).matchAll(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g)) ok(m[1]);
    if (!R.length) for (const m of String(t).matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g)) ok(m[1]);
    // real qwen2.5-coder 7b (30/10): several {"name":…,"arguments":…} one per line, loose → every top-level {…} in the text
    if (!R.length) { const s = String(t); let ini = -1, nv = 0, aspas = false, esc = false;
      for (let i = 0; i < s.length; i++) { const c = s[i]; if (aspas) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') aspas = false; continue; }
        if (c === '"' && nv) aspas = true; else if (c === '{') { if (!nv++) ini = i; } else if (c === '}' && nv && !--nv) ok(s.slice(ini, i + 1)); } }
    // real qwen3-coder 30b (30/10): its native format as text, <function=Write><parameter=file_path>\n…\n</parameter>…</function>; every param must be closed (cut reply = no call)
    if (!R.length) for (const m of String(t).matchAll(/<function=([\w-]+)>([\s\S]*?)(?:<\/function>|(?=<function=)|$)/g)) { if (!nomes.has(m[1])) continue;
      const a = {}; for (const p of m[2].matchAll(/<parameter=([\w-]+)>\n?([\s\S]*?)\n?<\/parameter>/g)) a[p[1]] = /^(-?\d+(\.\d+)?|true|false)$/.test(p[2].trim()) ? JSON.parse(p[2].trim()) : p[2];
      if (Object.keys(a).length && !/<parameter=[\w-]+>(?![\s\S]*<\/parameter>)/.test(m[2])) R.push({ function: { name: m[1], arguments: a } }); }
    return R; };
  // reply ending in a promise ("Vou ler o arquivo:", "Agora vou…", "Let me…") without calling any tool = it stopped thinking it did
  const PROMETEU = (t) => { const s = String(t).trim(); if (/:\s*$/.test(s)) return true; const fr = s.split(/(?<=[.!?])\s+|\n+/).filter(x => x.trim()).pop() || '';
    return /^(\W*)(ok|certo|beleza|então|agora|primeiro|em seguida|a seguir)?[,!\s]*(eu\s+)?(vou|vamos|irei|deixa eu|deixe-me|let me|i'?ll|i will|now i)\b/i.test(fr.trim()); };
  // internet only when user asks (24/10): without ask, internet tools aren't even sent (fewer tokens) and are refused
  const PEDIU_WEB = /(internet|pesquis|google|na web|online|site|p[áa]gina|https?:\/\/|www\.|not[íi]cia|busque na|procure na|olhe na|cota[çc][ãa]o|pre[çc]o atual)/i;
  // 24/10 (user request): MCP FOLDER comes from local AI options (ini mcp=); mcp.json lives in it. With no server in it, adds
  // official file server (@modelcontextprotocol/server-filesystem, via npx) with access to that folder: MCP always works.
  const mcpPasta = () => (dep.mcpPasta ? dep.mcpPasta() : CASA);
  const mcpArq = () => path.join(mcpPasta(), 'mcp.json');
  const mcpLista = () => { let L = {}; try { L = JSON.parse(fs.readFileSync(mcpArq(), 'utf8').replace(/^\uFEFF/, '')).mcpServers || {}; } catch { }
    return Object.keys(L).length ? L : { arquivos: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', mcpPasta()] } }; };
  const ferrDo = (web, prog) => FERR.filter(f => (web || !WEB.has(f.function.name)) && (prog || f.function.name !== 'Rodar')).map(f => f.function.name !== 'MCP' ? f : { ...f, function: { ...f.function, description: `Servidor MCP (${Object.keys(mcpLista()).map(n => n === 'arquivos' && mcpLista().arquivos.args.includes(mcpPasta()) ? 'arquivos: só a pasta ' + mcpPasta() : n).join(', ')}); sem ferramenta = lista` } });

  // ---- MCP client (stdio, JSON-RPC one line per message): starts server on 1st use and keeps it running ----
  const MCPS = new Map();
  process.on('exit', () => { for (const m of MCPS.values()) try { m.p.kill(); } catch { } });
  function mcp(nome) {
    const ja = MCPS.get(nome); if (ja && ja.pasta === mcpPasta()) return ja;   // folder changed in options: restart server on new one
    if (ja) { MCPS.delete(nome); try { ja.p.kill(); } catch { } }
    const cfg = mcpLista()[nome]; if (!cfg) throw new Error(`servidor MCP "${nome}" não está em ${mcpArq()}`);
    if (!cfg.command) throw new Error('só servidores MCP locais (command) são aceitos');
    const sh = /\.(cmd|bat)$/i.test(cfg.command) || !/[\\/]/.test(cfg.command); try { fs.mkdirSync(mcpPasta(), { recursive: true }); } catch { }
    const p = cp.spawn(cfg.command, (cfg.args || []).map(a => sh && /\s/.test(a) ? `"${a}"` : a), { cwd: mcpPasta(), env: { ...process.env, ...(cfg.env || {}) }, windowsHide: true, shell: sh });
    const esp = new Map(); let seq = 0, resto = '';
    const m = { p, pedir: (method, params) => new Promise((ok, falha) => { const id = ++seq; esp.set(id, { ok, falha }); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); setTimeout(() => { if (esp.delete(id)) falha(new Error('o servidor MCP não respondeu em 60 s')); }, 60000); }) };
    p.stdout.on('data', (d) => { const ls = (resto + d).split('\n'); resto = ls.pop(); for (const l of ls) { let x; try { x = JSON.parse(l); } catch { continue; } const e = x.id != null && esp.get(x.id); if (e) { esp.delete(x.id); x.error ? e.falha(new Error(x.error.message || 'erro do MCP')) : e.ok(x.result); } } });
    p.on('exit', () => { MCPS.delete(nome); for (const e of esp.values()) e.falha(new Error('o servidor MCP fechou')); esp.clear(); });
    p.on('error', (e) => { MCPS.delete(nome); for (const x of esp.values()) x.falha(e); esp.clear(); });
    m.pronto = m.pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fcc-ia-local', version: '1' } }).then(() => p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'));
    m.pasta = mcpPasta(); MCPS.set(nome, m); return m;
  }
  async function usarMcp(a) {
    const L = mcpLista(), nomes = Object.keys(L);
    if ((!a.servidor || !L[a.servidor]) && nomes.length === 1) a.servidor = nomes[0];   // small model gets name wrong: with only 1 server, it's that one
    if (!a.servidor || !L[a.servidor]) return (a.servidor ? `Não existe "${a.servidor}". ` : '') + (nomes.length ? 'Servidores: ' + nomes.join(', ') : `Nenhum servidor em ${mcpArq()}.`);
    const m = mcp(a.servidor); await m.pronto;
    const lista = async () => { const r = await m.pedir('tools/list', {}); m.nomes = (r.tools || []).map(t => t.name); return `Ferramentas de ${a.servidor} (use MCP com servidor="${a.servidor}", ferramenta e args):\n` + ((r.tools || []).map(t => `- ${t.name}(${Object.keys((t.inputSchema && t.inputSchema.properties) || {}).join(', ')}): ${String(t.description || '').split('\n')[0].slice(0, 100)}`).join('\n') || 'nenhuma.'); };
    if (!a.ferramenta) return await lista();
    if (!m.nomes) await lista(); if (!m.nomes.includes(a.ferramenta)) return `Não existe a ferramenta "${a.ferramenta}". ` + await lista();
    const extra = Object.fromEntries(Object.entries(a).filter(([k]) => !['servidor', 'ferramenta', 'args'].includes(k)));   // small model puts fields outside args
    const r = await m.pedir('tools/call', { name: a.ferramenta, arguments: { ...extra, ...(a.args || {}) } });
    const t = (r.content || []).map(c => c.type === 'text' ? c.text : `[${c.type}]`).join('\n');
    if (r.isError) throw new Error(t || 'a ferramenta MCP falhou');
    // 24/10: binary file read via MCP came as raw bytes (model "read" assembly); becomes same summary as Read
    const ctl = (t.match(/[\x00-\x08\x0e-\x1f�]/g) || []).length;
    if (t.length > 200 && ctl / t.length > 0.02) { const f = String((a.args && a.args.path) || a.path || ''); return f && fs.existsSync(f) ? resumoBinario(f) : 'Conteúdo binário (não é texto): use Read no arquivo para ver um resumo.'; }
    return corta(t || '(sem resposta)', 20000);
  }
  const MUDA = new Set(['Write', 'Edit', 'PowerShell', 'MCP', 'Rodar']);

  // ---- programming mode (30/10, user: "local AI must get code right as often as Claude, even if slower") ----
  // Small model's errors come from not running what it wrote. So the PROGRAM checks: syntax after every Write/Edit of code,
  // Rodar tool to test, and before the final answer: "you didn't run it" (≤2) + one review pass against the request.
  // Instructions: casa\memoria\programar.md; recipes casa\memoria\programar\*.md (1st line "palavras: a, b"), ≤2 matching the request.
  const PROGRAMAR = /(\.(js|mjs|cjs|ts|tsx|py|ps1|json|html?|css|bat|cmd)\b|c[óo]digo|fun[çc][ãa]o|script|classe|m[ée]todo|\bbug|corrij|conserte|implement|refator|compil|\bnode\b|python|javascript|typescript|powershell|exporta|d[áa] erro|programa(r|[çc][ãa]o)\b)/i;
  const CODIGO = /\.(js|mjs|cjs|py|ps1|psm1|json)$/i;
  const progOn = (t) => dep.OP.programar === 'sempre' || (dep.OP.programar !== 'nunca' && PROGRAMAR.test(t));
  const NODE_ENV = { ...process.env, ELECTRON_RUN_AS_NODE: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' };   // execPath = node even inside Electron
  const executar = (cmd, args, cwd, ms, sinal) => new Promise((ok) => { let out = '', p;
    try { p = cp.spawn(cmd, args, { cwd, env: NODE_ENV, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return ok({ cod: null, out: e.message, falta: true }); }
    const mata = () => { try { cp.execFile('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }); } catch { } };
    const rel = setTimeout(() => { out += `\n(parado: passou de ${ms / 1000} s; espera teclado ou loop infinito?)`; mata(); }, ms); if (sinal) sinal.addEventListener('abort', mata);
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('error', (e) => { clearTimeout(rel); ok({ cod: null, out: e.message, falta: e.code === 'ENOENT' }); }); p.on('close', (c) => { clearTimeout(rel); ok({ cod: c, out: out.trim() }); }); });
  const comoRodar = (f, args) => { const e = path.extname(f).toLowerCase();
    if (/^\.(js|cjs|mjs)$/.test(e)) return [process.execPath, [f, ...args]];
    if (e === '.py') return ['python', [f, ...args]];
    if (e === '.ps1') return ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', f, ...args]];
    return null; };
  const partes = (s) => (String(s || '').match(/"[^"]*"|'[^']*'|\S+/g) || []).map(x => x.replace(/^(["'])([\s\S]*)\1$/, '$2'));
  async function sintaxe(f) {        // '' = ok (or no checker installed)
    const e = path.extname(f).toLowerCase(); let r;
    if (e === '.json') { try { JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); return ''; } catch (x) { return x.message; } }
    if (/^\.(js|cjs|mjs)$/.test(e)) r = await executar(process.execPath, ['--check', f], path.dirname(f), 20000);
    else if (e === '.py') r = await executar('python', ['-c', 'import ast,sys;ast.parse(open(sys.argv[1],encoding="utf-8").read(),sys.argv[1])', f], path.dirname(f), 20000);
    else if (/^\.psm?1$/.test(e)) r = await executar('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${f.replace(/'/g, "''")}',[ref]$null,[ref]$e);$e|%{'linha '+$_.Extent.StartLineNumber+': '+$_.Message};if($e){exit 1}`], path.dirname(f), 30000);
    else return '';
    return r.falta || r.cod === 0 ? '' : corta(r.out.replace(/^.*node:internal.*$/gm, '').trim() || 'falhou', 1500);
  }
  function receitas(ped) {
    const d = path.join(CASA, 'memoria', 'programar'), ch = new Set(semAc(ped).match(/[a-z0-9]{3,}/g) || []), R = [];
    let L = []; try { L = fs.readdirSync(d).filter(f => /\.md$/i.test(f)); } catch { }
    for (const f of L) { let t = ''; try { t = fs.readFileSync(path.join(d, f), 'utf8'); } catch { continue; }
      const pal = ((t.match(/^palavras:(.*)$/im) || [])[1] || '').split(',').map(x => semAc(x.trim())).filter(Boolean), n = pal.filter(p => ch.has(p) || (p.includes(' ') && semAc(ped).includes(p))).length;
      if (n) R.push({ n, t: t.replace(/^palavras:.*\r?\n/im, '').trim().slice(0, 1500) }); }
    return R.sort((a, b) => b.n - a.n).slice(0, 2).map(x => x.t);
  }
  const PULAR = /^(node_modules|\.git|dist|build|__pycache__|\.venv|venv)$/i;
  function andar(raiz, cada, max = 20000) {
    let n = 0; const ir = (d) => { let L; try { L = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const x of L) { if (n++ > max) return; const p = path.join(d, x.name); if (x.isDirectory()) { if (!PULAR.test(x.name)) ir(p); } else if (cada(p) === false) { n = max + 1; return; } } };
    ir(raiz);
  }
  const globRe = (g) => new RegExp('^' + g.replace(/\\/g, '/').split('**/').map(p => p.replace(/[.+^${}()|[\]]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')).join('(?:.*/)?') + '$', 'i');
  // skills: casa first, then personal layer (same name = casa wins); alias (apelidos.txt) becomes name
  function listaSkills() {
    const L = [], vistos = new Set();
    for (const raiz of pastasSkills()) { let ds = []; try { ds = fs.readdirSync(raiz); } catch { } for (const d of ds) { const f = path.join(raiz, d, 'SKILL.md'); if (!vistos.has(d.toLowerCase()) && fs.existsSync(f)) { vistos.add(d.toLowerCase()); L.push({ n: d, f }); } } }
    return L;
  }
  const descr = (f) => { try { const t = fs.readFileSync(f, 'utf8'), m = t.match(/description:\s*(?:[>|]-?\s*\n\s*)?"?([^"\n]+)/); return m ? m[1].trim() : ''; } catch { return ''; } };
  function acharSkill(nome) {
    let n = String(nome || '').toLowerCase().replace(/^.*:/, '').replace(/^\//, '').trim();
    for (const l of apsLocal()) { const [a, b] = l.split('=').map(x => x.trim().toLowerCase()); if (a === n) n = b; }
    return listaSkills().find(x => x.n.toLowerCase() === n);
  }
  function skills(nome) {
    const s = nome && acharSkill(nome);
    if (s) return corta(fs.readFileSync(s.f, 'utf8'), 5000) + `\n(skill em ${s.f}; leia o resto só se precisar)`;   // 24/10: local is slow: only skill start
    return (nome ? `Não existe a skill "${nome}". ` : '') + 'Skills:\n' + listaSkills().map(x => `- ${x.n}: ${descr(x.f)}`).join('\n');
  }
  // list for UI "/" menu (same format as Claude commands)
  const BASICOS = () => [['skills', 'lista as skills da casa'], ['memoria', 'o que a IA local lembra de você e deste projeto'], ['esquecer', 'apaga uma lembrança (número ou palavra)'], ['limpar', 'esquece a conversa até aqui (menos tokens)'], ['ajuda', 'o que dá para digitar com /']];
  const comandos = () => [...BASICOS().map(([n, d]) => ({ n, d })), ...listaSkills().filter(x => !['caveman', 'ultracave'].includes(x.n)).map(x => ({ n: x.n, d: descr(x.f) }))];
  // local AI is slow: instead of full rules it gets only HINTS (24/10, user request): where project stopped (1 line),
  // skill/alias names and up to 3 lessons whose words match request. Claude reads whole home; local, only this.
  const semAc = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function pistas(dir, pedido) {
    const L = [];
    try { const p = fs.readFileSync(path.join(dir, 'docs', 'PARADA.md'), 'utf8').split(/\r?\n/).find(l => /^parado:/i.test(l.trim())); if (p) L.push('Onde parou: ' + p.replace(/^parado:\s*/i, '').slice(0, 160)); } catch { }
    const ap = apsLocal().map(l => l.replace(/\s*=\s*/, '=')).join(', ');
    const chaves = [...new Set(semAc(pedido).match(/[a-z0-9]{3,}/g) || [])];
    // only skills matching request (name, alias or description): full list distracts small model
    const ach = new Set(); for (const l of apsLocal()) { const [a, b] = l.split('=').map(x => semAc(x.trim())); if (chaves.includes(a)) ach.add(b); }
    // match by name, or by 2+ request words in description (1 loose word like "arquivos" pulled wrong skill)
    for (const x of listaSkills()) { const n = semAc(x.n), ds = new Set(semAc(descr(x.f)).split(/\W+/)); if (chaves.some(c => c.length >= 5 && n.includes(c)) || chaves.filter(c => c.length >= 5 && ds.has(c)).length >= 2) ach.add(n); if (ach.size >= 3) break; }
    if (ach.size) L.push('Skill útil para este pedido: ' + [...ach].join(', ') + ' (chame Skill uma vez e siga)');
    if (ap) L.push('Apelidos: ' + ap);
    if (chaves.length) { try { const lic = fs.readFileSync(APRENDI, 'utf8').split(/\r?\n/).filter(l => /^\s*-\s/.test(l) && chaves.some(c => semAc(l).includes(c))).slice(-3); if (lic.length) L.push('Lições:\n' + lic.join('\n')); } catch { } }
    return L.join('\n');
  }
  // binary (24/10): raw bytes confuse model; return useful summary (type, installer/language by markers, readable strings)
  const binario = (f) => { try { const fd = fs.openSync(f, 'r'), b = Buffer.alloc(8000), n = fs.readSync(fd, b, 0, 8000, 0); fs.closeSync(fd); return b.subarray(0, n).includes(0); } catch { return false; } };
  const MARCAS = [['Inno Setup', /Inno Setup/], ['NSIS', /Nullsoft|NSIS/], ['InstallShield', /InstallShield/], ['WiX/MSI', /Windows Installer|WixBundle/], ['.NET', /mscoree\.dll|_CorExeMain|System\.Runtime/], ['Delphi', /Borland|Embarcadero|TApplication/], ['Qt', /Qt5Core|Qt6Core|QWidget/], ['Electron', /electron\.asar/], ['Python (PyInstaller)', /PyInstaller|python3\d*\.dll|MEIPASS/], ['Go', /Go build ID|runtime\.goexit/], ['Rust', /rustc|\.rs:\d/], ['C/C++ (MSVC)', /MSVCP\d+|VCRUNTIME\d+|msvcrt\.dll/], ['Unity', /UnityPlayer|UnityEngine/], ['Java', /java\/lang/], ['Node (pkg)', /pkg\/prelude/], ['UPX', /UPX[01!]/]];
  function resumoBinario(f) {
    const st = fs.statSync(f), fd = fs.openSync(f, 'r'), tam = Math.min(st.size, 8 * 1024 * 1024), b = Buffer.alloc(tam); fs.readSync(fd, b, 0, tam, 0); fs.closeSync(fd);
    const txt = b.toString('latin1'), tipo = b[0] === 0x4d && b[1] === 0x5a ? 'executável Windows (PE, "MZ")' : b[0] === 0x50 && b[1] === 0x4b ? 'zip/jar/apk' : b[0] === 0x7f && b[1] === 0x45 ? 'ELF (Linux)' : 'binário';
    const ach = MARCAS.filter(([, re]) => re.test(txt)).map(([n]) => n);
    const strs = [...new Set(txt.match(/[\x20-\x7e]{12,}/g) || [])].filter(x => /[a-z]{4}/i.test(x) && !/^[A-Za-z0-9+\/=]{20,}$/.test(x)).slice(0, 40);
    return `Arquivo binário (não dá para ler como texto). ${f}\nTipo: ${tipo} · ${(st.size / 1048576).toFixed(1)} MB\nMarcas achadas: ${ach.join(', ') || 'nenhuma conhecida'}\nTextos legíveis (amostra):\n${strs.join('\n')}`;
  }
  async function rodar(nome, a, dir, sinal) {
    const cam = (f) => path.resolve(dir, String(f || ''));
    // 24/10: pattern with full path ("C:\pasta\arq.exe", "C:\pasta\*.md") becomes folder (path) + relative pattern; before gave "Nenhum arquivo"
    const absGlob = (a, k) => { const p = String(a[k] || ''); if (!/^([a-z]:)?[\\/]/i.test(p)) return; const ps = p.split(/[\\/]+/), i = ps.findIndex(x => /[*?[{]/.test(x));
      if (i < 0) { a.path = path.dirname(p); a[k] = path.basename(p); } else { a.path = ps.slice(0, i).join('\\') || '\\'; a[k] = ps.slice(i).join('/'); } };
    switch (nome) {
      case 'Read': { if (!fs.existsSync(cam(a.file_path))) { const d = path.dirname(cam(a.file_path)); let L = []; try { L = fs.readdirSync(d).slice(0, 40); } catch { }   // 30/10: 7b asked "notes.txt" for notas.txt and gave up
          throw new Error(`não existe: ${cam(a.file_path)}` + (L.length ? `. Nessa pasta tem: ${L.join(', ')}` : '')); }
        if (binario(cam(a.file_path))) return resumoBinario(cam(a.file_path));
        const L = fs.readFileSync(cam(a.file_path), 'utf8').replace(/\r?\n$/, '').split(/\r?\n/), ini = Math.max(1, a.offset || 1), fim = Math.min(L.length, ini - 1 + (a.limit || 2000));
        return corta(L.slice(ini - 1, fim).map((l, i) => `${ini + i}\t${l}`).join('\n') + (fim < L.length ? `\n… (${L.length} linhas no total; use offset para ler o resto)` : ''), 30000); }
      case 'Glob': { absGlob(a, 'pattern'); const raiz = cam(a.path || '.'), re = globRe(a.pattern || '*'), R = []; andar(raiz, (p) => { if (re.test(path.relative(raiz, p).replace(/\\/g, '/'))) R.push(p); if (R.length >= 200) return false; }); return R.length ? R.join('\n') : 'Nenhum arquivo.'; }
      case 'Grep': { if (a.glob) absGlob(a, 'glob'); const raiz = cam(a.path || '.'), re = new RegExp(a.pattern, 'i'), g = a.glob ? globRe(a.glob.includes('/') ? a.glob : '**/' + a.glob) : null, R = [];
        const um = (p) => { try { if (fs.statSync(p).size > 2e6) return; const t = fs.readFileSync(p, 'utf8'); if (t.includes('\u0000')) return; t.split(/\r?\n/).forEach((l, i) => { if (R.length < 150 && re.test(l)) R.push(`${p}:${i + 1}: ${l.trim().slice(0, 200)}`); }); } catch { } };
        if (fs.existsSync(raiz) && fs.statSync(raiz).isFile()) um(raiz); else andar(raiz, (p) => { if (!g || g.test(path.relative(raiz, p).replace(/\\/g, '/'))) um(p); if (R.length >= 150) return false; });
        return R.length ? R.join('\n') : 'Nada encontrado.'; }
      case 'Write': { const f = cam(a.file_path); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, String(a.content == null ? '' : a.content), 'utf8'); return `Arquivo salvo: ${f}`; }
      case 'Edit': { const f = cam(a.file_path), t = fs.readFileSync(f, 'utf8'), o = String(a.old_string || ''); if (!o) throw new Error('old_string vazio');
        const n = t.split(o).length - 1; if (!n) throw new Error('old_string não aparece no arquivo (leia o arquivo antes)'); if (n > 1 && !a.replace_all) throw new Error(`old_string aparece ${n} vezes: inclua mais texto em volta ou use replace_all`);
        fs.writeFileSync(f, a.replace_all ? t.split(o).join(a.new_string || '') : t.replace(o, () => a.new_string || ''), 'utf8'); return `Arquivo editado: ${f}`; }
      case 'PowerShell': return await new Promise((ok) => {
        const p = cp.spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', String(a.command || '')], { cwd: dir, windowsHide: true }); let out = '';
        const fim = (x) => { clearTimeout(rel); ok(corta(out.trim() || '(sem saída)', 20000) + (x != null ? `\n(código de saída ${x})` : '')); };
        const longo = /ghidra|analyzeHeadless|dotnet-(de)?compilar|dotnet(\.exe)? build|extrair/i.test(String(a.command || ''));   // RE: Ghidra takes up to 30 min
        const rel = setTimeout(() => { try { cp.execFile('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }); } catch { } out += `\n(parado: passou de ${longo ? 30 : 2} minutos)`; }, longo ? 1800000 : 120000);
        if (sinal) sinal.addEventListener('abort', () => { try { cp.execFile('taskkill', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }); } catch { } });
        p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; }); p.on('close', fim); p.on('error', (e) => { out += e.message; fim(null); });
      });
      case 'WebFetch': { if (!/^https?:\/\//i.test(a.url || '')) throw new Error('url precisa começar com http:// ou https://');
        const r = await fetch(a.url, { signal: sinal ? AbortSignal.any([sinal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) }); let t = await r.text();
        t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
        return `(${r.status}) ` + corta(t, 20000); }
      case 'Rodar': { const f = cam(a.arquivo); if (!fs.existsSync(f)) throw new Error(`não existe: ${f}`); const c = comoRodar(f, partes(a.args)); if (!c) throw new Error('Rodar aceita .js, .py ou .ps1');
        const r = await executar(c[0], c[1], dir, 60000, sinal); if (r.falta) throw new Error(`não achei o programa para rodar ${path.extname(f)} (${r.out})`);
        return corta(r.out || '(sem saída)', 8000) + `\n(código de saída ${r.cod})`; }
      case 'Skill': return skills(a.skill);
      case 'Aprender': { const l = String(a.licao || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (l.length < 10 || !/(→|->)/.test(l)) throw new Error('formato: situação → faça X, evita Y (só lição que serve de novo)');
        try { if (semAc(fs.readFileSync(APRENDI, 'utf8')).includes(semAc(l).slice(0, 60))) return 'Já estava guardada.'; } catch { }
        const d = new Date(), data = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        fs.mkdirSync(path.dirname(APRENDI), { recursive: true }); fs.appendFileSync(APRENDI, `\n- ${data} · local · ${l}`, 'utf8'); return 'Lição guardada.'; }
      case 'Lembrar': return lembrar(a.fato, a.geral ? 'geral' : projDe(dir));
      case 'MCP': return await usarMcp(a);
      case 'WebSearch': { const r = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(a.query || ''), { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: sinal ? AbortSignal.any([sinal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
        const h = await r.text(), L = [], tx = (x) => x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();
        for (const m of h.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)) { let u = m[1]; const g = u.match(/uddg=([^&]+)/); if (g) u = decodeURIComponent(g[1]); L.push(`- ${tx(m[2])} | ${u}\n  ${tx(m[3]).slice(0, 200)}`); if (L.length >= 6) break; }
        return L.length ? L.join('\n') : 'Nada encontrado.'; }
    }
    throw new Error(`ferramenta desconhecida: ${nome}`);
  }

  // ---- one conversation: same contract as library query() (message iterator + interrupt/close/setModel…) ----
  function query({ prompt, options: o }) {
    const sessao = o.sessao, dir = o.cwd, aba = o.aba;
    const j = ler(sessao) || { dir, nome: o.nome || '', criado: Date.now(), msgs: [], tela: [] };
    // 26/10: conversation came from Claude (AI switched in same tab): keeps going with what was said
    if (o.herdar && !j.msgs.length) for (const h of o.herdar) { const u = h.r === 'eu', t = String(h.txt || ''); if (!t.trim()) continue;
      j.msgs.push({ role: u ? 'user' : 'assistant', content: t });
      j.tela.push({ type: u ? 'user' : 'assistant', uuid: crypto.randomUUID(), n: j.msgs.length - 1, message: u ? { role: 'user', content: t } : { id: 'her_' + j.msgs.length, role: 'assistant', content: [{ type: 'text', text: t }] } }); }
    if (o.ate) { const i = j.tela.findIndex(x => x.uuid === o.ate); if (i >= 0) { const n = j.tela[i].n; j.tela = j.tela.slice(0, i + 1); j.msgs = j.msgs.slice(0, n); } }   // edited message: go back to that point
    let modelo = o.model, semTools = false, semThink = false, ac = null, fechado = false;
    const sempre = new Set();                       // tools allowed "always" in this conversation
    const saida = [], acordar = []; const por = (m) => { saida.push(m); const a = acordar.shift(); if (a) a(); };
    const guardar = (m) => { j.tela.push({ ...m, n: j.msgs.length }); };
    const sistema = () => {
      let mem = ''; try { mem = fs.readFileSync(MEMORIA, 'utf8').trim(); } catch { }
      const d = new Date(), proj = /chat-livre$/i.test(dir) ? 'chat livre (sem projeto)' : path.basename(dir);
      const curta = dep.breve || '';   // 02/11: fixed brevity line (Ultracave mode removed)
      // FIXED instructions (hints go with message, in comLembrete): same across requests = Ollama reuses
      // already-processed start (KV cache). Hints here changed each message and reprocessed all ("Sim" took 25 s).
      const mg = memGeral();
      return [mem, mg ? 'O que ele te contou (palavras dele: "eu/meu" = ele):\n' + mg : '', `Pasta: ${dir} · projeto: ${proj} · hoje: ${d.toLocaleDateString('pt-BR')}`,o.semCodigo ? 'Sem código na resposta, só se pedirem.' : '', o.instrucao || '', curta, dep.modoTexto ? dep.modoTexto(aba) : ''].filter(Boolean).join('\n');
    };
    // conversation must fit context: oldest start drops (memory stays)
    const ctx = Math.max(4096, parseInt(dep.OP.ctxSimples, 10) || 16384);
    // 26/10 (user request): reads only the latest messages, smartly: ~5, more if short, fewer if long.
    // Current request (last user msg on) goes whole; before it, newest first within a budget;
    // old long ones keep start+end; old tool steps leave (their answer stays). Less to read = faster reply.
    // 30/10: program's own nudges ("continue", "call the tool") are user role but not his request
    const PROG = /^\(programa\)/;
    const pedidoIdx = (L) => { let i = L.length - 1; while (i > 0 && (L[i].role !== 'user' || PROG.test(String(L[i].content || '')))) i--; return Math.max(0, i); };
    const janela = (L) => {
      const ini = pedidoIdx(L);
      const atual = L.slice(ini), antes = L.slice(0, ini).filter(m => m.role !== 'tool' && String(m.content || '').trim());
      const enx = (m) => { const c = String(m.content || ''); return { role: m.role, content: c.length > 1600 ? c.slice(0, 900) + '\n[…trecho do meio cortado…]\n' + c.slice(-500) : c }; };
      const VERBA = 7000, MIN = 2, MAX = 12; const pega = []; let tam = 0;
      for (let i = antes.length - 1; i >= 0 && pega.length < MAX; i--) { const m = enx(antes[i]), t = m.content.length;
        if (pega.length >= MIN && (tam + t > VERBA || (pega.length >= 6 && tam + t > VERBA / 2))) break; pega.unshift(m); tam += t; }
      const fixas = antes.filter(m => m.role === 'user' && /^Skill \S+ \(siga/.test(m.content) && !pega.some(p => p.content === m.content)).slice(-1);
      let r = [...fixas, ...pega]; while (r.length && r[0].role !== 'user') r.shift();
      // 30/10: requests that left the window stay as 1 short line each (knows what was talked about, ~15 tokens each)
      const fora = antes.filter(m => m.role === 'user' && !/^Skill \S+ \(siga/.test(m.content) && !PROG.test(m.content) && !r.some(x => x.content === enx(m).content)).slice(-8).map(m => '- ' + umaLinha(m.content, 80));
      if (fora.length) r = [{ role: 'user', content: '[antes nesta conversa, pedidos dele]\n' + fora.join('\n') }, { role: 'assistant', content: 'Ok, lembro.' }, ...r];
      return [...r, ...atual]; };
    // 30/10: big tool results used to push the request itself out (2 long Reads = empty list) → model lost what it was doing.
    // Now the current request ALWAYS stays; its older tool results shrink first (start+end), the newest one last.
    const caber = (L) => { const lim = (ctx - 2000) * 3.2, tam = (m) => String(m.content || '').length + JSON.stringify(m.tool_calls || '').length + 20, soma = (X) => X.reduce((s, m) => s + tam(m), 0);
      const ini = pedidoIdx(L), ult = L.length - 1, curto = (m, max) => { const c = String(m.content || ''); return c.length <= max ? m : { ...m, content: c.slice(0, Math.floor(max * 0.7)) + '\n[…cortado para caber…]\n' + c.slice(-Math.floor(max * 0.3)) }; };
      for (const max of [6000, 2500, 800]) { if (soma(L.slice(ini)) <= lim) break; L = L.map((m, i) => i > ini && i < ult && m.role === 'tool' ? curto(m, max) : m); }
      if (soma(L.slice(ini)) > lim && L[ult].role === 'tool') L = [...L.slice(0, ult), curto(L[ult], Math.max(800, lim - soma(L.slice(ini, ult))))];
      let t = soma(L.slice(ini)), i = ini; while (i > 0 && t + tam(L[i - 1]) <= lim) { t += tam(L[i - 1]); i--; }
      while (i < ini && L[i].role !== 'user') i++; return L.slice(i); };

    let web = false;                                // did this user request mention internet?
    let prog = false, modeloT = '';                 // 30/10: programming request → coder mode (+ ini modeloCodigo, if set, for this request)
    let travar = false;                             // 24/10: model in tool loop → next request goes without tools (must answer)
    // 24/10: what goes with user's last message (request only, not saved):
    //  - request HINTS (where stopped, matching skill, aliases, lessons);
    //  - asked detail/explanation → "não repita" (8b got stuck on 1 repeated line);
    //  (skill cited by name/alias enters history once, in turno())
    const DETALHE = /(detalh|explic|como (eu )?(fa[çc]o|resolv|funciona|consigo)|passo a passo|por ?qu[eê]|n[ãa]o entendi|mais (info|coisa)|elabor)/i;
    // SAVED in message (j.msgs; UI uses j.tela): history identical across requests = Ollama reuses all
    const comExtras = (ped) => { const det = DETALHE.test(ped);
      const pi = pistas(dir, ped), proj = projDe(dir), chaves = [...new Set(semAc(ped).match(/[a-z0-9]{4,}/g) || [])];
      // memory (30/10): saved in message like hints = cached; diary only on chat's 1st request, task only if previous request used tools
      j.memJa = j.memJa || []; const lb2 = memDoPedido(proj, chaves, j.memJa), M = [];
      if (!j.diaJa) { j.diaJa = true; const di = diarioLer(proj, 3); if (di.length) M.push('Últimas vezes neste projeto (pedido → fez → resposta):\n' + di.join('\n')); }
      if (lb2.length) M.push('Você lembra:\n' + lb2.map(x => '- ' + x).join('\n'));
      // 30/10: request that stopped midway (error, stall, step limit, user stop, program closed) → says what was asked, done, and why it stopped
      const tf = j.tarefa; if (tf && tf.estado !== 'pronto') M.push(`[tarefa interrompida] Pedido: ${tf.pedido}. Já feito: ${j.ultFeito ? '\n' + j.ultFeito + '\n' : tf.feitos.length ? tf.feitos.join(', ') : 'nada ainda'}. Parou: ${tf.motivo || 'o programa fechou no meio'}. Se ele pedir para continuar, retome daí sem refazer o que já foi feito.`);
      else if (j.ultFeito) M.push(`[tarefa] No pedido anterior você usou (ferramenta → o que mostrou):\n${j.ultFeito}\nUse isso se o pedido atual precisar; não refaça.`);   // 30/10: old tool results leave the window; 7b re-did the old task to find them
      // 30/10: 7b answered the OLD question when memory came after the request → request repeated last
      // 30/10: programming request → coder instructions + matching recipes (in the saved message = cached)
      let pg = ''; if (prog) { try { pg = fs.readFileSync(path.join(CASA, 'memoria', 'programar.md'), 'utf8').trim(); } catch { } const rc = receitas(ped); if (rc.length) pg += '\n\nReceitas da casa para este pedido:\n' + rc.join('\n---\n'); }
      return ped + (M.length ? '\n\n[memória]\n' + M.join('\n') : '') + (pi ? '\n\n[pistas]\n' + pi : '') + (pg ? '\n\n[modo programador]\n' + pg : '') + (M.length || pi || pg ? `\n\nResponda ao pedido atual: «${ped.length > 300 ? ped.slice(0, 300) + '…' : ped}»` : '') +(det ? '\n\n(Responda com detalhes e passos concretos. Não repita a resposta anterior.)' : ''); };
    async function pedir(eventoId) {
      const corpo = { model: modeloT || modelo, stream: true, keep_alive: dep.OP.manter || '30m', options: { num_ctx: ctx }, messages: [{ role: 'system', content: sistema() }, ...caber(janela(j.msgs))] };
      if (!semTools && !travar) corpo.tools = ferrDo(web, prog);
      if (!semThink) corpo.think = /gpt-oss/i.test(corpo.model) ? (['low', 'medium', 'high'].includes(dep.OP.nivel) ? dep.OP.nivel : 'low') : dep.PENSAR.get(aba) === 2;
      ac = new AbortController(); const t0 = Date.now();
      // 30/10 (user: "parou no meio e não voltou por nada"): no watchdog = a hung Ollama froze the request AND every next one (requests run in line).
      // Silence > VIGIA_1 before 1st piece (load + read prompt) or > VIGIA_N between pieces = program stops it and goes on (turno continues/reports).
      let tv = null, travou = ''; const vigia = (s) => { clearTimeout(tv); tv = setTimeout(() => { travou = `o Ollama ficou ${s} s sem mandar nada`; ac.abort(); }, s * 1000); };
      vigia(VIGIA_1);
      let txt = '', pen = '', calls = [], bloco = null, idx = -1, fimJ = null, resto = '', n = 0, t1 = 0, ultVel = 0, aberto = false;
      const abrir = (tipo) => { if (bloco === tipo) return; if (bloco) por({ type: 'stream_event', event: { type: 'content_block_stop', index: idx } }); bloco = tipo; idx++; por({ type: 'stream_event', event: { type: 'content_block_start', index: idx, content_block: { type: tipo } } }); };
      try {
      const r = await fetch(dep.OLLAMA_URL + '/api/chat', { method: 'POST', body: JSON.stringify(corpo), signal: ac.signal });
      if (r.status === 400) { clearTimeout(tv); const t = await r.text();          // model without tools / without thinking: retry without the field (like Locally Uncensored)
        if (/tools/i.test(t) && !semTools) { semTools = true; return pedir(eventoId); } if (/think/i.test(t) && !semThink) { semThink = true; return pedir(eventoId); } throw new Error(t.slice(0, 300)); }
      if (!r.ok) throw new Error(`Ollama respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
      por({ type: 'stream_event', event: { type: 'message_start', message: { id: eventoId, usage: { input_tokens: 0 } } } }); aberto = true;
      const dec = new TextDecoder();
      for await (const pedaco of r.body) {
        const ls = (resto + dec.decode(pedaco, { stream: true })).split('\n'); resto = ls.pop();
        for (const l of ls) {
          if (!l.trim()) continue; let x; try { x = JSON.parse(l); } catch { continue; }
          if (x.error) throw new Error(x.error);
          const m = x.message || {};
          if (m.thinking) { abrir('thinking'); pen += m.thinking; por({ type: 'stream_event', event: { type: 'content_block_delta', index: idx, delta: { type: 'thinking_delta', thinking: m.thinking } } }); }
          if (m.content) { abrir('text'); txt += m.content; por({ type: 'stream_event', event: { type: 'content_block_delta', index: idx, delta: { type: 'text_delta', text: m.content } } }); }
          if (m.tool_calls) calls.push(...m.tool_calls);
          if (m.thinking || m.content) { const a = Date.now(); if (!t1) t1 = a; n++; if (n >= 20 && a - t1 > 1500 && a - ultVel > 1000) { ultVel = a; dep.vel(aba, { tps: n / ((a - t1) / 1000) }); } }
          if (x.done) fimJ = x;
        }
        vigia(!t1 ? VIGIA_1 : corpo.tools && PROMETEU(txt) ? VIGIA_F : VIGIA_N);   // re-armed AFTER this piece: its text decides the wait
      }
      } catch (e) { if (!travou && (ac.signal.aborted || !aberto)) throw e; dep.logApp(`conversa local ${aba}: resposta cortada (${travou || e.message})`); } finally { clearTimeout(tv); }   // dropped connection mid-reply = 'cortado' (continues)
      if (!aberto) por({ type: 'stream_event', event: { type: 'message_start', message: { id: eventoId, usage: { input_tokens: 0 } } } });
      // qwen2.5-coder & co. sometimes WRITE the tool call as text instead of calling it → reply looked cut ("{"name": "Read"…") and nothing ran
      if (!calls.length && !travou && corpo.tools) calls = chamadasNoTexto(txt);
      if (bloco) por({ type: 'stream_event', event: { type: 'content_block_stop', index: idx } });
      const uso = { input_tokens: (fimJ && fimJ.prompt_eval_count) || 0, output_tokens: (fimJ && fimJ.eval_count) || n };
      por({ type: 'stream_event', event: { type: 'message_delta', usage: uso } });
      if (fimJ && fimJ.eval_count && fimJ.eval_duration) dep.vel(aba, { tps: fimJ.eval_count / (fimJ.eval_duration / 1e9), fim: true, primeira: ((t1 || Date.now()) - t0) / 1000 });
      // fim: stop = finished · length = hit token/context limit · cortado = stream closed without "done" · travou = watchdog
      return { txt, pen, calls, uso, comFerr: !!corpo.tools, fim: travou ? 'travou' : !fimJ ? 'cortado' : fimJ.done_reason === 'length' ? 'length' : 'stop', travou };
    }

    // "/" commands (24/10): home ones answer instantly, no tokens; /<skill> [request] loads skill into conversation
    function responderJa(txt, resp, guardarMsg) {
      const eu = { type: 'user', uuid: crypto.randomUUID(), message: { role: 'user', content: txt } }; guardar(eu); por(eu);
      const msg = { type: 'assistant', uuid: crypto.randomUUID(), message: { id: 'loc_' + crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text: resp }] } }; guardar(msg); por(msg);
      if (guardarMsg) j.msgs.push({ role: 'user', content: guardarMsg }, { role: 'assistant', content: resp });
      por({ type: 'result', subtype: 'success', is_error: false, result: resp, duration_ms: 0, usage: { input_tokens: 0, output_tokens: 0 } }); gravar(sessao, j);
    }
    function comando(txt) {
      const m = txt.match(/^\/([\w:.-]+)\s*([\s\S]*)$/); if (!m) return null;
      const c = m[1].toLowerCase(), resto = m[2].trim();
      if (c === 'ajuda' || c === 'help') return responderJa(txt, 'Comandos: ' + comandos().map(x => '/' + x.n).join(' · ') + '\n/<skill> <pedido> = faz o pedido seguindo a skill.'), true;
      if (c === 'skills') return responderJa(txt, skills('')), true;
      if (c === 'memoria' || c === 'memória') { const p = projDe(dir), L = lembrancas().filter(l => / · geral · /.test(l) || l.includes(` · ${p} · `)), di = diarioLer(p, 5);
        return responderJa(txt, (L.length ? 'O que eu lembro:\n' + L.map((l, i) => `${i + 1}. ${fatoDe(l)}${/ · geral · /.test(l) ? '' : ' (' + p + ')'}`).join('\n') + '\n\nPara apagar: /esquecer número ou palavra.' : 'Ainda não guardei nada. Diga "lembre que…" e eu guardo.') + (di.length ? '\n\nÚltimas vezes neste projeto:\n' + di.join('\n') : '')), true; }
      if (c === 'esquecer') { const s = resto && esquecer(resto, projDe(dir)); return responderJa(txt, s ? `Esqueci: ${s}` : 'Não achei isso na memória. Veja a lista com /memoria.'), true; }
      if (c === 'limpar' || c === 'clear') { j.msgs = []; j.tarefa = null; j.ultFeito = ''; return responderJa(txt, 'Esqueci a conversa até aqui (a tela continua). Próximo pedido começa limpo.'), true; }
      const s = acharSkill(c);
      if (!s) return responderJa(txt, `Não conheço /${c}. ` + 'Comandos: ' + comandos().map(x => '/' + x.n).join(' · ')), true;
      const corpo = fs.readFileSync(s.f, 'utf8').replace(/^\uFEFF?---[\s\S]*?\n---\s*\n/, '').trim();
      if (!resto) return responderJa(txt, `Skill ${s.n} pronta. Diga o que fazer.`, `Siga a skill ${s.n} nos próximos pedidos:\n${corpo}`), true;
      return `Siga a skill ${s.n}:\n${corpo}\n\nPedido: ${resto}`;   // becomes the real request
    }
    async function turno(txt) {
      if (/^\/[\w:.-]+/.test(txt.trim())) { const r = comando(txt.trim()); if (r === true) return; if (typeof r === 'string') txt = r; }
      const t0 = Date.now(), uuidEu = crypto.randomUUID(); let ent = 0, sai = 0, final = '', repet = 0; const feitas = new Set(), conta = {}; travar = false;
      web = PEDIU_WEB.test(txt); prog = progOn(txt); modeloT = prog && dep.OP.modeloCodigo ? dep.OP.modeloCodigo : '';
      // programming gate (30/10): passou = a run AFTER the last code change exited 0 and printed something (module with only exports prints nothing = not a test)
      const escritos = new Set(); let rodouDepois = true, passou = true, cobraRodar = 0, revisou = false, cobraSint = 0, cobraSalvar = 0;
      const maxV = () => prog ? 30 : 14;              // coder mode: write → run → fix needs more steps (slow is ok, wrong is not)
      { const pal = new Set(semAc(txt).match(/[a-z0-9-]{3,}/g) || []), ap = apsLocal().map(l => l.split('=').map(x => semAc(x.trim())));
        const n = (ap.find(([a]) => pal.has(a)) || [])[1] || (listaSkills().find(x => pal.has(semAc(x.n))) || {}).n, s = n && acharSkill(n);
        // once per conversation: then it's in history (question like "você usou o rea?" doesn't pay skill again)
        j.skInj = j.skInj || []; const nova = s && !/^\//.test(txt.trim()) && !j.skInj.includes(s.n);
        // stays in history (not UI): Ollama reuses processed start, so next messages are fast
        if (nova) { j.skInj.push(s.n); j.msgs.push({ role: 'user', content: `Skill ${s.n} (siga estes passos; se não der, diga o que falta):\n` + fs.readFileSync(s.f, 'utf8').replace(/^﻿?---[\s\S]*?\n---\s*\n/, '').trim().slice(0, 3000) }, { role: 'assistant', content: `Ok, sigo a skill ${s.n}.` }); } }
      const tela = txt; txt = anexos(txt); const feitos = [], mostrou = [], vistos = new Set();
      { const F = fatosDe(txt), ok = [];
        for (const x of F) { try { const r = lembrar(x.f, /\b(neste|nesse|deste|desse|do) projeto\b|\baqui\b/i.test(x.f) && projDe(dir) !== 'chat-livre' ? projDe(dir) : 'geral'); if (/^Guardado/.test(r)) ok.push(x.f); } catch { } }
        if (ok.length) txt += `\n\n(O programa guardou na sua memória: ${ok.join(' · ')}. ${F.some(x => x.pedido) ? 'Confirme em 1 frase e siga.' : 'Não comente isso, só responda.'})`; }
      j.msgs.push({ role: 'user', content: comExtras(txt) }); const eu = { type: 'user', uuid: uuidEu, message: { role: 'user', content: tela } }; guardar(eu); por(eu);
      // 30/10 (user: "memória do que está fazendo"): task state saved at every step; crash/stall/limit/stop leaves for the next request what was asked, done, and why it stopped
      j.tarefa = { pedido: umaLinha(tela, 120), feitos: [], estado: 'andando', motivo: '' };
      const cutucar = (t) => j.msgs.push({ role: 'user', content: '(programa) ' + t });   // nudge: history only, not on screen
      let ok = false, motivo = '', cont = 0, cutuca = 0, trav = 0, emendar = false;
      try {
        for (let volta = 0; volta < maxV() && !fechado; volta++) {
          const id = 'loc_' + crypto.randomUUID();
          const r = await pedir(id); ent = Math.max(ent, r.uso.input_tokens); sai += r.uso.output_tokens;
          final = emendar ? final + r.txt : r.txt.trim() ? r.txt : final; emendar = false;
          const rc = r.fim === 'travou' ? [] : r.calls;
          const calls = rc.map(c => ({ id: 'tool_' + crypto.randomUUID().slice(0, 12), nome: c.function && c.function.name, args: (c.function && c.function.arguments) || {} }));
          const content = [...(r.pen ? [{ type: 'thinking', thinking: r.pen }] : []), ...(r.txt ? [{ type: 'text', text: r.txt }] : []), ...calls.map(c => ({ type: 'tool_use', id: c.id, name: c.nome, input: c.args }))];
          const msg = { type: 'assistant', uuid: crypto.randomUUID(), message: { id, role: 'assistant', content } };
          j.msgs.push({ role: 'assistant', content: r.txt, ...(calls.length ? { tool_calls: rc } : {}) }); guardar(msg); por(msg);
          if (!calls.length) {
            // reply cut (stall, stream closed, limit): continue where it stopped; total silence twice = Ollama stuck, give up and say so
            if (r.fim !== 'stop') { if ((r.fim === 'travou' && trav++ >= 1) || cont++ >= 2) { motivo = r.travou || 'a resposta saiu cortada'; break; }
              emendar = !!r.txt.trim(); cutucar(emendar ? 'Sua resposta foi cortada no meio. Continue exatamente de onde parou, sem repetir o que já escreveu.' : 'Você não respondeu. Responda agora ao pedido.'); continue; }
            if (!r.txt.trim() && cutuca < 2) { cutuca++; cutucar('Você não respondeu nada. Responda agora ao pedido, em texto, com o que já descobriu.'); continue; }
            if (!r.comFerr && chamadasNoTexto(r.txt).length && cutuca < 2) { cutuca++; cutucar('As ferramentas estão desligadas agora. Não escreva chamadas de ferramenta: responda em texto ao pedido com o que já descobriu.'); continue; }
            if (r.comFerr && PROMETEU(r.txt) && cutuca < 2) { cutuca++; cutucar('Você disse que ia fazer, mas não chamou nenhuma ferramenta, então nada foi feito. Chame a ferramenta agora. Se já terminou, dê a resposta final.'); continue; }
            // 30/10 baseline: 7b pasted the code in chat and saved nothing → request names a code file = must be saved
            if (prog && r.comFerr && !escritos.size && /```/.test(r.txt) && /\b[\w.-]+\.(js|mjs|cjs|ts|py|ps1|json|html?|css|bat|cmd)\b/i.test(tela) && cobraSalvar < 2) { cobraSalvar++; cutucar('Você mostrou o código no chat, mas não salvou nenhum arquivo, então nada foi feito. Salve com Write no arquivo pedido (nome exato) e teste com Rodar.'); continue; }
            // 30/10 coder gate (rule, not advice): no delivery until a run after the last change PASSED; else the program warns him (below)
            if (prog && r.comFerr && escritos.size) {
              const ruins = []; for (const f of escritos) { if (!fs.existsSync(f)) continue; const s = await sintaxe(f); if (s) ruins.push(`${path.basename(f)}: ${s}`); }
              if (ruins.length && cobraSint++ < 3) { rodouDepois = passou = false; cutucar('O código ainda tem erro de sintaxe, então não funciona:\n' + ruins.join('\n') + '\nCorrija com Edit e teste com Rodar.'); continue; }
              if (!passou && cobraRodar < 6) { cobraRodar++; cutucar((rodouDepois ? 'O último teste FALHOU (ou não imprimiu nada), então o código ainda não está certo. Leia o erro, corrija o código e rode de novo.' : 'Você mudou código e não rodou depois da última mudança, então não sabe se funciona.') + ' Regra: só pode entregar depois de um teste que passa. Crie um teste curto _teste_<nome> (.js/.py) que usa o seu código com os exemplos do pedido e casos de borda (vazio, inválido, acentos, zero) e imprime OK no fim; rode com Rodar. Script de linha de comando: rode o próprio script com argumentos e compare a saída com o pedido.'); continue; }
              if (!revisou) { revisou = true; cutucar('Revisão final antes de entregar: releia o pedido dele e confira, uma por uma, cada exigência no código (nomes exatos, formato de saída, erros que deve lançar, não alterar a entrada, casos de borda). Achou falha: corrija e rode o teste de novo. Tudo certo: responda em até 3 linhas o que fez e como testou.'); continue; }
            }
            ok = true; break;
          }
          const res = [];
          for (const c of calls) {
            let txtR = '', erro = false; const chave = c.nome + JSON.stringify(c.args); conta[c.nome] = (conta[c.nome] || 0) + 1;
            try {
              // loop guards (24/10): repeated call doesn't run; Skill max 2 and Aprender 1 per request
              if (feitas.has(chave)) { repet++; throw new Error('já feito acima: use aquele resultado e responda'); }
              if ((c.nome === 'Skill' && conta.Skill > 2) || (c.nome === 'Aprender' && conta.Aprender > 1) || (c.nome === 'Lembrar' && conta.Lembrar > 2)) { repet++; throw new Error('limite desta ferramenta no pedido: responda agora'); }
              feitas.add(chave); cutuca = 0;   // 30/10: a new call = progress → nudge budget back (30b promised "Vou corrigir…:" at final review after spending it early)
              const f = path.resolve(dir, String(c.args.file_path || c.args.arquivo || ''));
              const dentro = f.toLowerCase().startsWith(dir.toLowerCase() + path.sep) || f.toLowerCase() === dir.toLowerCase();
              // MCP: listing servers/tools and read-only tools (list_, read_, get_, search_…) need no permission
              const mcpLe = c.nome === 'MCP' && (!c.args.ferramenta || /^(list|read|get|search|directory_tree|find|describe|query)/i.test(String(c.args.ferramenta)));
              // RE: identify only (reads file, changes nothing) runs without asking
              const reLe = c.nome === 'PowerShell' && /^\s*(cmd\s+\/c\s+)?["']?A:[\\/]+opt[\\/]+re[\\/]+bin[\\/]+identificar\.cmd/i.test(String(c.args.command || '')) && !/[;&|>]/.test(String(c.args.command || '').replace(/^\s*cmd\s+\/c\s+/i, ''));
              const auto = !MUDA.has(c.nome) || mcpLe || reLe || sempre.has(c.nome) || (dep.OP.perm === 'auto' && (c.nome === 'Write' || c.nome === 'Edit' || c.nome === 'Rodar') && dentro);
              if (WEB.has(c.nome) && !web) throw new Error('internet só quando ele pedir');
              if (dep.OP.perm === 'plan' && MUDA.has(c.nome)) throw new Error('modo "só planejar": não mude nada, só descreva o plano');
              if (!auto) {
                // Rodar asks with the same card as PowerShell (UI knows it): shows the real command line
                const p = c.nome === 'Rodar' ? await o.canUseTool('PowerShell', { command: (comoRodar(f, partes(c.args.args)) || ['?', [f]]).flat().map(x => /\s/.test(x) ? `"${x}"` : x).join(' '), description: 'testar o código' }, { signal: ac.signal, suggestions: [{ type: 'local', tool: 'Rodar' }] }) : await o.canUseTool(c.nome, c.args, { signal: ac.signal, suggestions: [{ type: 'local', tool: c.nome }] });
                if (p.behavior !== 'allow') { erro = true; txtR = 'NÃO FEITO: o usuário negou' + (p.message ? ' (' + p.message + ')' : '') + '. Não diga que fez nem invente o resultado; diga o que faria e por quê.'; if (p.interrupt) ac.abort(); }
                else { if (p.updatedPermissions) sempre.add(c.nome); if (p.updatedInput && c.nome !== 'Rodar') c.args = p.updatedInput; }
              }
              if (!erro && c.nome === 'Skill' && j.skInj && acharSkill(c.args.skill) && j.skInj.includes(acharSkill(c.args.skill).n)) txtR = 'Essa skill já está na conversa: siga ela e responda.';   // doesn't pay again
              else if (!erro) txtR = await rodar(c.nome, c.args, dir, ac.signal);
              if (!erro && MUDA.has(c.nome) && c.nome !== 'Rodar') { feitas.clear(); feitas.add(chave); }   // 30/10: files changed → re-running the same test/Read is NOT a repeat (blocked the fix→rerun loop)
              // 30/10: code file saved → program checks syntax right away (small model doesn't notice its own typos)
              if (!erro && (c.nome === 'Write' || c.nome === 'Edit') && CODIGO.test(f)) { escritos.add(f); rodouDepois = passou = false; const s = await sintaxe(f); txtR += s ? `\nERRO DE SINTAXE (o arquivo não funciona assim):\n${s}\nCorrija agora.` : '\nSintaxe ok (falta testar rodando).';
                // 30/10 (user: "rule followed to the letter"): request didn't look like code but it is writing code → coder mode turns on now
                if (!prog && dep.OP.programar !== 'nunca') { prog = true; let pg = ''; try { pg = fs.readFileSync(path.join(CASA, 'memoria', 'programar.md'), 'utf8').trim(); } catch { } const rc = receitas(tela); if (rc.length) pg += '\n\nReceitas da casa para este pedido:\n' + rc.join('\n---\n');
                  txtR += '\n\n[modo programador ligado pelo programa: você está escrevendo código]\n' + (pg || 'Teste com Rodar antes de entregar.'); } }
              if (!erro && (c.nome === 'Rodar' || (c.nome === 'PowerShell' && /\b(node|python|py|pytest)\b|\.ps1\b/i.test(String(c.args.command || ''))))) {
                rodouDepois = true; const cod = (String(txtR).match(/\(código de saída (-?\d+)\)\s*$/) || [])[1];
                passou = cod === '0' && !/\(parado: passou de/.test(txtR) && !/^\(sem saída\)/.test(String(txtR).trim()); }
            } catch (e) { erro = true; txtR = 'Erro: ' + (e.message || e); }
            j.msgs.push({ role: 'tool', tool_name: c.nome, content: txtR });
            { const a = c.args || {}, alvo = a.file_path || a.arquivo ? path.basename(String(a.file_path || a.arquivo)) : a.command ? String(a.command).slice(0, 40) : a.pattern || a.skill || a.fato || a.query || a.url || '';
              const rot = `${c.nome}${alvo ? ' ' + umaLinha(alvo, 40) : ''}${erro ? ' (' + (/^NÃO FEITO/.test(txtR) ? 'negado' : 'erro') + ')' : ''}`; feitos.push(rot);
              if (!vistos.has(rot)) { vistos.add(rot); mostrou.push(`- ${rot} → ${umaLinha(String(txtR).replace(/^\d+\t/gm, ''), 220)}`); } }
            res.push({ type: 'tool_result', tool_use_id: c.id, content: txtR, is_error: erro });
          }
          const rm = { type: 'user', uuid: crypto.randomUUID(), message: { role: 'user', content: res } }; guardar(rm); por(rm);
          if (repet >= 2 || volta >= maxV() - 4) travar = true;
          j.tarefa.feitos = [...new Set(feitos)].slice(-12); gravar(sessao, j);   // progress on disk at every step (crash keeps it)
          if (ac.signal.aborted) break;
        }
        if (!ok && !motivo) motivo = fechado ? 'a conversa foi fechada' : `chegou no limite de ${maxV()} passos`;
        // stopped by the program: says so on screen and how to resume (before it just stayed silent)
        // 30/10 coder gate end: code changed and no passing run → the PROGRAM says so (doesn't depend on the model admitting it)
        const semTeste = prog && !passou && [...escritos].some(f => !/^_teste_/i.test(path.basename(f)) && fs.existsSync(f));
        const aviso = [...(!ok ? [`Parei no meio: ${motivo}. Mande "continue" que eu retomo de onde parei.`] : []), ...(semTeste ? ['Aviso do programa: o código mudou e NÃO passou em nenhum teste rodado depois da última mudança. Pode não funcionar.'] : [])];
        if (aviso.length && !fechado) { const av = { type: 'assistant', uuid: crypto.randomUUID(), message: { id: 'loc_' + crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text: aviso.map(x => `(${x})`).join('\n') }] } }; guardar(av); por(av); if (semTeste) final += '\n\n(' + aviso[aviso.length - 1] + ')'; }
        por({ type: 'result', subtype: 'success', is_error: false, result: final, duration_ms: Date.now() - t0, usage: { input_tokens: ent, output_tokens: sai } });
      } catch (e) {
        const parou = e.name === 'AbortError' || (ac && ac.signal.aborted); motivo = parou ? 'ele parou o pedido' : 'erro: ' + umaLinha(e.message, 80);
        if (!parou) dep.logApp(`conversa local ${aba}: ${e.message}`);
        por({ type: 'result', subtype: parou ? 'error_during_execution' : 'error', is_error: true, result: parou ? '' : 'A IA local parou com erro: ' + e.message, duration_ms: Date.now() - t0, usage: { input_tokens: ent, output_tokens: sai } });
      }
      for (const f of escritos) if (/^_teste_/i.test(path.basename(f))) try { fs.rmSync(f, { force: true }); } catch { }   // coder mode scratch tests don't stay in his folder
      // memory (30/10): what this request did → next request ([tarefa]) and project diary
      const fz = [...new Set(feitos)]; Object.assign(j.tarefa, { feitos: fz.slice(-12), estado: ok ? 'pronto' : 'interrompido', motivo }); j.ultFeito = mostrou.slice(-8).join('\n').slice(-1800);   // what each tool SHOWED: ≤8 tools, ≤1.8k chars (~500 tokens)
      if (fz.length || (final.trim() && tela.trim().length >= 12)) diarioPor(projDe(dir), `- ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${umaLinha(tela.replace(/@(?:"[^"]+"|\S+)/g, (x) => '[' + path.basename(x.replace(/^@"?|"$/g, '')) + ']'), 90)} → ${fz.length ? umaLinha(fz.join(', '), 90) : 'só conversa'} → ${umaLinha(final, 110)}${ok ? '' : ' (parou: ' + motivo + ')'}`);
      gravar(sessao, j);
    }

    (async () => {
      por({ type: 'system', subtype: 'init', session_id: sessao, model: modelo, slash_commands: comandos().map(x => x.n) });
      for await (const m of prompt) { if (fechado) break; const c = m.message && m.message.content; await turno(typeof c === 'string' ? c : (c || []).map(b => b.text || '').join('\n')); }
      fechado = true; por(null);
    })().catch(e => { dep.logApp('conversa local: ' + (e.stack || e)); fechado = true; por(null); });

    const it = {
      async *[Symbol.asyncIterator]() { while (true) { if (!saida.length) await new Promise(r => acordar.push(r)); const m = saida.shift(); if (m === null) return; yield m; } },
      interrupt: async () => { if (ac) ac.abort(); },
      close: () => { fechado = true; if (ac) ac.abort(); por(null); },
      setModel: async (m) => { modelo = m; semTools = semThink = false; },
      setMaxThinkingTokens: async () => { },          // "think" comes from dep.PENSAR each request
      applyFlagSettings: async () => { },
      initializationResult: async () => ({ commands: comandos().map(x => ({ name: x.n, description: x.d })) }),
    };
    return it;
  }
  return { query, historico, ultimaDaPasta, existe: (s) => !!ler(s), comandos };
};
