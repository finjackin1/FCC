// Copies today's personal data (home .claude + old FCC folder + projects) into a NEW FCC install layout.
// Never moves, deletes or writes into the sources. Text rewrite happens only in the copies.
// Usage: node migrar-perfil.js --destino <root> --fcc <old FCC dir> [--home d] [--claudejson f] [--projetos d] [--copiar-projetos] [--copiar-ferramentas] [--simular]
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const lst = (f) => { try { return fs.lstatSync(f); } catch { return null; } };
const ehDir = (f) => { const l = lst(f); return !!(l && l.isDirectory()); };
const norm = (p) => path.resolve(String(p)).replace(/[\\/]+$/, '').toLowerCase();
const esc = (s) => JSON.stringify(String(s)).slice(1, -1);
const regexLit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dentroDe = (f, base) => { const a = norm(f), b = norm(base); return a === b || a.startsWith(b + path.sep); };

function fmt(n) {
  if (n < 1024) return n + ' B';
  const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return n.toFixed(n < 10 ? 2 : 1) + ' ' + u[i];
}

const PULAR_PROJ = new Set(['node_modules', 'dist']);

// size and file count of a tree; symlinks are not followed (counted as zero)
function medir(f, filtro) {
  const l = lst(f);
  if (!l) return { bytes: 0, arqs: 0 };
  if (l.isSymbolicLink()) return { bytes: 0, arqs: 0 };
  if (!l.isDirectory()) return { bytes: l.size, arqs: 1 };
  let bytes = 0, arqs = 0;
  let nomes = []; try { nomes = fs.readdirSync(f); } catch { }
  for (const n of nomes) {
    const c = path.join(f, n);
    if (filtro && !filtro(c)) continue;
    const m = medir(c, filtro);
    bytes += m.bytes; arqs += m.arqs;
  }
  return { bytes, arqs };
}

function copiar(de, para, filtro) {
  fs.mkdirSync(path.dirname(para), { recursive: true });
  fs.cpSync(de, para, { recursive: true, preserveTimestamps: true, errorOnExist: false, force: false, filter: filtro ? (s) => filtro(s) : undefined });
}

function hora() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ---- jsonl cwd rewrite (in the copy), same rules as restaurar.js ----
function trocarPrefixo(valor, velho, novo) {
  if (typeof valor !== 'string' || valor.length < velho.length) return null;
  if (valor.slice(0, velho.length).toLowerCase() !== velho.toLowerCase()) return null;
  const resto = valor.slice(velho.length);
  if (resto && !/^[\\/]/.test(resto)) return null;
  return novo + resto;
}
async function lerLinhas(arq, aoLer) {
  const rs = fs.createReadStream(arq, { encoding: 'latin1', highWaterMark: 1 << 20 });
  let resto = '';
  for await (const pedaco of rs) {
    const partes = (resto + pedaco).split('\n');
    resto = partes.pop();
    for (const l of partes) await aoLer(l, true);
  }
  if (resto.length) await aoLer(resto, false);
}
async function reescreverJsonl(arq, velho, novo) {
  const agulha = Buffer.from(esc(velho), 'utf8').toString('latin1').toLowerCase();
  let tem = false;
  await lerLinhas(arq, (l) => { if (!tem && l.toLowerCase().includes(agulha)) tem = true; });
  if (!tem) return false;
  const st = fs.statSync(arq);
  const tmp = arq + '.fcc-tmp';
  const ws = fs.createWriteStream(tmp);
  const falha = new Promise((_, rej) => ws.on('error', rej));
  let mudou = false;
  try {
    await Promise.race([falha, lerLinhas(arq, async (l, nl) => {
      let saida = l;
      if (l.toLowerCase().includes(agulha)) {
        try {
          const cr = l.endsWith('\r');
          const o = JSON.parse(Buffer.from(cr ? l.slice(0, -1) : l, 'latin1').toString('utf8'));
          const c = o && typeof o === 'object' && !Array.isArray(o) ? trocarPrefixo(o.cwd, velho, novo) : null;
          if (c !== null) { o.cwd = c; saida = Buffer.from(JSON.stringify(o), 'utf8').toString('latin1') + (cr ? '\r' : ''); mudou = true; }
        } catch { /* bad line stays */ }
      }
      if (!ws.write(nl ? saida + '\n' : saida, 'latin1')) await new Promise((r) => ws.once('drain', r));
    })]);
    await Promise.race([falha, new Promise((r) => ws.end(r))]);
  } catch (e) { ws.destroy(); try { fs.unlinkSync(tmp); } catch { } throw e; }
  if (!mudou) { fs.unlinkSync(tmp); return false; }
  fs.renameSync(tmp, arq);
  try { fs.utimesSync(arq, st.atime, st.mtime); } catch { }
  return true;
}
function jsonlDe(dir, saida) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) jsonlDe(f, saida);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.jsonl')) saida.push(f);
  }
  return saida;
}

// ---- text rewrite ----
function padraoCaminho(p) {
  const segs = path.resolve(p).split(/[\\/]+/).filter(Boolean);
  return new RegExp(segs.map(regexLit).join('(?:\\\\{1,2}|/)') + '(?![A-Za-z0-9_-])', 'gi');
}
function substituto(novo) {
  return (m) => {
    if (/\\\\/.test(m)) return esc(novo);
    if (m.includes('/') && !m.includes('\\')) return novo.replace(/\\/g, '/');
    return novo;
  };
}
const EXT_TEXTO = new Set(['.md', '.json', '.ps1', '.py', '.js', '.txt']);
function arquivosTexto(f, saida) {
  const l = lst(f);
  if (!l || l.isSymbolicLink()) return saida;
  if (l.isDirectory()) { for (const n of fs.readdirSync(f)) arquivosTexto(path.join(f, n), saida); }
  else if (l.isFile() && EXT_TEXTO.has(path.extname(f).toLowerCase())) saida.push(f);
  return saida;
}
function ehBinario(buf) { return buf.subarray(0, 8192).includes(0); }

// FCC_RAIZ points caminhos.js at the destination only while this runs; the caller's value comes back afterwards.
async function migrar(opt) {
  const tinha = Object.prototype.hasOwnProperty.call(process.env, 'FCC_RAIZ'), antes = process.env.FCC_RAIZ;
  try { return await migrarNaRaiz(opt); }
  finally { if (tinha) process.env.FCC_RAIZ = antes; else delete process.env.FCC_RAIZ; }
}

async function migrarNaRaiz(opt) {
  const home = path.resolve(opt.home || path.join(os.homedir(), '.claude'));
  const claudejson = path.resolve(opt.claudejson || path.join(os.homedir(), '.claude.json'));
  if (!opt.fcc) throw new Error('--fcc is required (old FCC folder)');
  const fcc = path.resolve(opt.fcc);
  const projetos = path.resolve(opt.projetos || path.dirname(fcc));
  if (!opt.destino) throw new Error('--destino is required');
  const destino = path.resolve(opt.destino);
  const simular = !!opt.simular;

  // destination checks
  for (const src of [home, fcc]) if (dentroDe(destino, src)) throw new Error('destino is inside a source: ' + src);
  if (lst(destino)) {
    if (!ehDir(destino)) throw new Error('destino exists and is not a folder');
    // Allowed: empty folder, or a fresh FCC install (FCC.exe present) whose data folders are absent or empty.
    const nomes = fs.readdirSync(destino);
    const DADOS = new Set(['perfil', 'conta', 'projects', 'ferramentas', 'temp', 'inventario']);
    const vazio = (n) => { const f = path.join(destino, n); return ehDir(f) && fs.readdirSync(f).length === 0; };
    const instalacao = nomes.some((n) => n.toLowerCase() === 'fcc.exe');
    const ok = nomes.every((n) => (DADOS.has(n.toLowerCase()) ? vazio(n) : instalacao));
    if (!ok) throw new Error('destino is not empty: ' + destino);
  }

  process.env.FCC_RAIZ = destino;
  const C = require('../caminhos');
  const copiarProj = !!opt.copiarProjetos, copiarFerr = !!opt.copiarFerramentas;

  const rel = [];
  const linha = (s) => rel.push(s);
  const erros = [], pulados = [];
  const itens = [];   // {nome, de, para, filtro, bytes, arqs}
  const add = (nome, de, para, filtro) => { itens.push({ nome, de, para, filtro }); };

  // --- plan ---
  const sk = C.perfilClaude() + path.sep + 'skills';
  const skills = path.join(C.perfilClaude(), 'skills'), agents = path.join(C.perfilClaude(), 'agents');
  const nomesSkill = new Set();
  const listar = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
  for (const n of listar(path.join(home, 'skills'))) {
    if (n === '.trash') continue;
    const f = path.join(home, 'skills', n), l = lst(f);
    let de = f;
    if (l && l.isSymbolicLink()) { try { de = fs.realpathSync(f); } catch { pulados.push('skill (broken link): ' + n); continue; } }
    nomesSkill.add(n.toLowerCase());
    add('skill ' + n, de, path.join(skills, n));
  }
  for (const n of listar(path.join(fcc, 'memoria', 'skills'))) {
    if (nomesSkill.has(n.toLowerCase()) || n === '.trash') continue;
    nomesSkill.add(n.toLowerCase());
    add('skill (fcc) ' + n, path.join(fcc, 'memoria', 'skills', n), path.join(skills, n));
  }
  const nomesAg = new Set();
  for (const d of [path.join(home, 'agents'), path.join(fcc, 'memoria', 'agents')]) {
    for (const n of listar(d)) {
      if (nomesAg.has(n.toLowerCase())) continue;
      nomesAg.add(n.toLowerCase());
      const f = path.join(d, n), l = lst(f);
      let de = f;
      if (l && l.isSymbolicLink()) { try { de = fs.realpathSync(f); } catch { continue; } }
      add('agent ' + n, de, path.join(agents, n));
    }
  }
  for (const n of ['plugins', 'file-history', 'todos', 'plans']) if (lst(path.join(home, n))) add('claude/' + n, path.join(home, n), path.join(C.perfilClaude(), n));
  if (lst(path.join(home, 'settings.json'))) add('claude/settings.json', path.join(home, 'settings.json'), path.join(C.perfilClaude(), 'settings.json'));
  if (lst(path.join(home, 'projects'))) add('claude/projects (conversations)', path.join(home, 'projects'), path.join(C.perfilClaude(), 'projects'));

  const fam = path.join(fcc, 'familias');
  const ferrNomes = [];
  for (const n of listar(fam)) {
    if (n.toLowerCase() === 'ferramentas') {
      // loose files (house scripts such as the hook .py) travel with the rules; folders are portable programs
      const fd = path.join(fam, n);
      for (const m of listar(fd)) {
        const fm = path.join(fd, m);
        if (ehDir(fm)) { ferrNomes.push(m); if (copiarFerr) add('ferramentas/' + m, fm, C.ferramentas(m)); }
        else add('regras/ferramentas/' + m, fm, path.join(C.regras(), 'ferramentas', m));
      }
      if (!copiarFerr && ferrNomes.length) pulados.push('familias\\ferramentas folders (' + ferrNomes.join(', ') + '; use --copiar-ferramentas); listed in perfil.json');
      continue;
    }
    add('regras/' + n, path.join(fam, n), path.join(C.regras(), n));
  }
  for (const n of listar(path.join(fcc, 'casa'))) add('casa/' + n, path.join(fcc, 'casa', n), path.join(C.casa(), n));
  for (const n of listar(path.join(fcc, 'memoria'))) {
    if (n.toLowerCase() === 'skills' || n.toLowerCase() === 'agents') continue;
    add('casa/memoria-fcc/' + n, path.join(fcc, 'memoria', n), path.join(C.casa(), 'memoria-fcc', n));
  }
  if (lst(path.join(fcc, 'chat-livre'))) add('chat-livre', path.join(fcc, 'chat-livre'), path.join(C.perfil(), 'chat-livre'));
  for (const n of listar(fcc)) {
    if (/^fcc-.*\.json$/i.test(n) || n.toLowerCase() === 'fcc.ini') { if (lst(path.join(fcc, n)).isFile()) add('dados/' + n, path.join(fcc, n), C.dados(n)); }
  }
  for (const n of ['relatorios', 'conversas-locais']) if (lst(path.join(fcc, n))) add('dados/' + n, path.join(fcc, n), C.dados(n));
  if (lst(path.join(home, 'fcc-contas'))) add('conta/contas', path.join(home, 'fcc-contas'), C.contas());
  if (lst(path.join(home, '.credentials.json'))) add('conta/config/.credentials.json', path.join(home, '.credentials.json'), path.join(C.configClaude(), '.credentials.json'));

  const projNomes = [];
  if (copiarProj) {
    for (const e of fs.readdirSync(projetos, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const f = path.join(projetos, e.name);
      if (norm(f) === norm(fcc) || e.name.toLowerCase() === '_fcc-novo' || dentroDe(destino, f) || dentroDe(f, destino)) continue;
      projNomes.push(e.name);
      add('projects/' + e.name, f, path.join(C.projetos(), e.name), (s) => !PULAR_PROJ.has(path.basename(s).toLowerCase()));
    }
  }

  // sizes
  let total = 0;
  for (const it of itens) { const m = medir(it.de, it.filtro); it.bytes = m.bytes; it.arqs = m.arqs; total += m.bytes; }

  linha(`${simular ? 'SIMULATION (nothing written)' : 'Migration'} ${hora()}`);
  linha(`destino: ${destino}\nhome: ${home}\nfcc: ${fcc}\nprojetos: ${projetos}${copiarProj ? ' (copied)' : ' (kept in place)'}`);
  linha('\nPlan (item: files, size):');
  for (const it of itens) linha(`  ${it.nome}: ${it.arqs} files, ${fmt(it.bytes)}`);
  linha(`TOTAL: ${fmt(total)} (${total} bytes)`);

  const r = { total, itens, relatorio: null, erros, pulados, reescritos: 0, restantes: [], movidos: [] };
  if (simular) {
    for (const p of pulados) linha('skipped: ' + p);
    r.relatorio = rel.join('\n');
    return r;
  }

  // --- execute ---
  fs.mkdirSync(C.perfil(), { recursive: true });
  fs.mkdirSync(C.configClaude(), { recursive: true });
  for (const it of itens) {
    try {
      if (lst(it.para)) { pulados.push('already exists, kept: ' + it.para); continue; }
      copiar(it.de, it.para, it.filtro);
    } catch (e) { erros.push(it.nome + ': ' + (e && e.message)); }
  }

  // CLAUDE.md
  const cmd = path.join(home, 'CLAUDE.md');
  if (lst(cmd)) {
    try {
      const t = fs.readFileSync(cmd, 'utf8');
      const m = /^\s*@(\S.*?)\s*$/.exec(t);
      const alvo = path.join(fam, 'CLAUDE-global.md');
      fs.mkdirSync(C.perfilClaude(), { recursive: true });
      const so = m && t.trim().split(/\r?\n/).length === 1 && norm(m[1].replace(/\//g, '\\')) === norm(alvo);
      if (so) { fs.writeFileSync(path.join(C.perfilClaude(), 'CLAUDE.md'), '@../regras/CLAUDE-global.md', 'utf8'); linha('\nCLAUDE.md: was only an @import of familias\\CLAUDE-global.md -> relative import'); }
      else { fs.writeFileSync(path.join(C.perfilClaude(), 'CLAUDE.md'), t, 'utf8'); linha('\nCLAUDE.md: has its own text, copied as is (check it)'); }
    } catch (e) { erros.push('CLAUDE.md: ' + e.message); }
  }

  // account login
  try {
    let oa;
    try { oa = JSON.parse(fs.readFileSync(claudejson, 'utf8')).oauthAccount; } catch { }
    const j = { hasCompletedOnboarding: true };
    if (oa) j.oauthAccount = oa;
    fs.writeFileSync(path.join(C.configClaude(), '.claude.json'), JSON.stringify(j, null, 2), 'utf8');
    linha(`conta\\config\\.claude.json written (oauthAccount ${oa ? 'present' : 'NOT found in ' + claudejson})`);
  } catch (e) { erros.push('.claude.json: ' + e.message); }

  // project conversation keys
  const projs = path.join(C.perfilClaude(), 'projects');
  let renomeadas = 0, cwdReescritos = 0;
  if (copiarProj && ehDir(projs)) {
    const regs = projNomes.map((n) => ({ n, kv: C.chaveProjeto(path.join(projetos, n)).toLowerCase(), kn: C.chaveProjeto(path.join(C.projetos(), n)) }))
      .sort((a, b) => b.kv.length - a.kv.length);
    for (const e of fs.readdirSync(projs, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const baixo = e.name.toLowerCase();
      const g = regs.find((x) => baixo === x.kv || (baixo.startsWith(x.kv) && e.name[x.kv.length] === '-'));
      if (!g) continue;
      const novoNome = g.kn + e.name.slice(g.kv.length);
      let pasta = path.join(projs, e.name);
      if (novoNome !== e.name) {
        const para = path.join(projs, novoNome);
        if (lst(para)) { erros.push('key collision: ' + novoNome); continue; }
        fs.renameSync(pasta, para); pasta = para; renomeadas++;
      }
      const velho = path.join(projetos, g.n), novo = path.join(C.projetos(), g.n);
      for (const arq of jsonlDe(pasta, [])) {
        try { if (await reescreverJsonl(arq, velho, novo)) cwdReescritos++; } catch (er) { erros.push('jsonl ' + arq + ': ' + er.message); }
      }
    }
  }

  // chat livre moved from old FCC\chat-livre to perfil\chat-livre: its conversation key and cwd follow
  const livreVelho = path.join(fcc, 'chat-livre'), livreNovo = path.join(C.perfil(), 'chat-livre');
  if (ehDir(projs) && lst(livreVelho)) {
    const kv = C.chaveProjeto(livreVelho).toLowerCase(), kn = C.chaveProjeto(livreNovo);
    for (const e of fs.readdirSync(projs, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.toLowerCase() !== kv) continue;
      let pasta = path.join(projs, e.name);
      if (kn !== e.name) {
        const para = path.join(projs, kn);
        if (lst(para)) { erros.push('key collision: ' + kn); continue; }
        fs.renameSync(pasta, para); pasta = para; renomeadas++;
      }
      for (const arq of jsonlDe(pasta, [])) {
        try { if (await reescreverJsonl(arq, livreVelho, livreNovo)) cwdReescritos++; } catch (er) { erros.push('jsonl ' + arq + ': ' + er.message); }
      }
    }
  }

  // text rewrite
  const trocas = [
    ...ferrNomes.map((m) => [padraoCaminho(path.join(fam, 'ferramentas', m)), C.ferramentas(m)]),
    [padraoCaminho(livreVelho), livreNovo],
    [padraoCaminho(path.join(fcc, 'relatorios')), C.dados('relatorios')],
    [padraoCaminho(path.join(fcc, 'conversas-locais')), C.dados('conversas-locais')],
    [padraoCaminho(path.join(fcc, 'memoria', 'skills')), C.perfilClaude() + path.sep + 'skills'],
    [padraoCaminho(fam), C.regras()],
    [padraoCaminho(path.join(fcc, 'casa')), C.casa()],
    [new RegExp(padraoCaminho(home).source + '(?!\\.[A-Za-z0-9])', 'gi'), C.configClaude()],   // not ~\.claude.json
  ].map(([re, novo]) => [re, substituto(novo)]);
  const alvos = [];
  for (const d of [C.regras(), C.casa(), skills, agents]) if (ehDir(d)) arquivosTexto(d, alvos);
  for (const f of [path.join(C.perfilClaude(), 'settings.json'), path.join(C.perfilClaude(), 'CLAUDE.md')]) if (lst(f)) alvos.push(f);
  // app options/data too (fcc.ini camada= pointed at old FCC\memoria\skills)
  try { for (const n of fs.readdirSync(C.dados())) if (/^fcc-.*\.json$/i.test(n) || n.toLowerCase() === 'fcc.ini') alvos.push(C.dados(n)); } catch { }
  // projects kept in place: the app lists root\projects + fcc.ini pastas=, so add the old projects folder there
  if (!copiarProj) {
    const ini = C.dados('fcc.ini');
    try {
      const buf = fs.readFileSync(ini); let t = buf.toString('utf8'), cod = 'utf8';
      if (!Buffer.from(t, 'utf8').equals(buf)) { t = buf.toString('latin1'); cod = 'latin1'; }
      const m = t.match(/^pastas=(.*)$/m), lista = m ? m[1].split(';').map((s) => s.trim()).filter(Boolean) : [];
      if (!lista.some((p) => norm(p) === norm(projetos))) {
        lista.push(projetos);
        const nl = t.includes('\r\n') ? '\r\n' : '\n';
        t = m ? t.replace(/^pastas=.*$/m, () => 'pastas=' + lista.join(';')) : t.replace(/\s*$/, '') + nl + 'pastas=' + lista.join(';') + nl;
        fs.writeFileSync(ini, t, cod); linha('fcc.ini: pastas= now lists ' + projetos);
      }
    } catch (e) {
      if (lst(ini)) erros.push('fcc.ini pastas: ' + e.message);
      else { fs.mkdirSync(path.dirname(ini), { recursive: true }); fs.writeFileSync(ini, 'pastas=' + projetos + '\r\n', 'utf8'); linha('fcc.ini: created with pastas=' + projetos); }
    }
  }
  // leftovers: old-place paths still in text. Paths into the new root, or into the projects folder kept in place, are fine.
  const cauda = '(?:(?:\\\\{1,2}|/)[^\\s"\'`)*<>|]*)?';
  const reRef = new RegExp([home, projetos, fcc].map((p) => '(?:' + padraoCaminho(p).source + cauda + ')').join('|'), 'gi');
  const okRef = (m) => {
    const p = m.replace(/\\\\/g, '\\').replace(/\//g, '\\');
    // the old FCC folder itself is also a project (kept in place): its bare path is fine, things inside it are not
    return dentroDe(p, destino) || (!copiarProj && dentroDe(p, projetos) && (!dentroDe(p, fcc) || norm(p) === norm(fcc)));
  };
  let restHist = 0;
  const latin1 = [];
  for (const f of alvos) {
    try {
      const st = fs.statSync(f);
      if (st.size > 5 * 1024 * 1024) { pulados.push('text rewrite (>5 MB): ' + f); continue; }
      const buf = fs.readFileSync(f);
      if (ehBinario(buf)) { pulados.push('text rewrite (binary): ' + f); continue; }
      let t = buf.toString('utf8'), cod = 'utf8';
      if (!Buffer.from(t, 'utf8').equals(buf)) { t = buf.toString('latin1'); cod = 'latin1'; }   // not valid UTF-8 (cp1252): keep every byte
      let n2 = t;
      for (const [re, sub] of trocas) n2 = n2.replace(re, sub);
      if (n2 !== t) {
        if (cod === 'latin1' && /[^\u0000-\u00ff]/.test(n2)) { erros.push('rewrite ' + f + ': cp1252 file, new path has characters it cannot hold'); continue; }
        fs.writeFileSync(f, n2, cod); try { fs.utimesSync(f, st.atime, st.mtime); } catch { } r.reescritos++;
        if (cod === 'latin1') latin1.push(path.relative(destino, f));
      }
      const ls = n2.split(/\r?\n/), relf = path.relative(destino, f), hist = /(^|[\\/])historico[\\/]/i.test(relf);
      for (let i = 0; i < ls.length; i++) {
        if (!(ls[i].match(reRef) || []).some((m) => !okRef(m))) continue;
        if (hist) restHist++; else r.restantes.push(`${relf}:${i + 1}`);
      }
    } catch (e) { erros.push('rewrite ' + f + ': ' + e.message); }
  }

  // credential scan of perfil\
  const achados = [];
  (function varrer(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { varrer(f); continue; }
      if (e.name.toLowerCase() === '.credentials.json') {
        let para = path.join(C.configClaude(), e.name);
        for (let i = 1; lst(para); i++) para = path.join(C.configClaude(), `${e.name}.conflito-${i}`);
        fs.renameSync(f, para); r.movidos.push(path.relative(destino, f)); continue;
      }
      if (/\.json$/i.test(e.name)) {
        try {
          if (fs.statSync(f).size > 20 * 1024 * 1024) continue;
          const t = fs.readFileSync(f, 'utf8');
          if (/accessToken|refreshToken|oauthAccount/.test(t)) achados.push(path.relative(destino, f));
        } catch { }
      }
    }
  })(C.perfil());

  // perfil.json
  const pastas = copiarProj ? [C.projetos()] : [projetos];
  fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: destino, pastas, ferramentas: ferrNomes }, null, 2), 'utf8');

  linha(`\nconversation keys renamed: ${renomeadas}; jsonl cwd rewritten: ${cwdReescritos}`);
  linha(`text files rewritten: ${r.reescritos} (of ${alvos.length} scanned)`);
  linha(`ferramentas listed in perfil.json: ${ferrNomes.length}${copiarFerr ? ' (copied)' : ' (not copied)'}`);
  linha(`\nLeftover references (old FCC folder or old home), ${r.restantes.length}:`);
  for (const x of r.restantes.slice(0, 300)) linha('  ' + x);
  if (r.restantes.length > 300) linha(`  ... ${r.restantes.length - 300} more`);
  if (restHist) linha(`  (+ ${restHist} in historico\\ archives, left as is)`);
  r.restHist = restHist;
  r.latin1 = latin1;
  if (latin1.length) { linha('\ncp1252 text files rewritten byte-exact (not UTF-8), ' + latin1.length + ':'); for (const x of latin1) linha('  ' + x); }
  if (r.movidos.length) { linha('\nMoved to conta\\config (credentials found in perfil):'); for (const x of r.movidos) linha('  ' + x); }
  if (achados.length) { linha('\nWARNING: token-like strings in perfil json files (not moved):'); for (const x of achados) linha('  ' + x); }
  r.achados = achados;
  if (pulados.length) { linha('\nSkipped:'); for (const x of pulados) linha('  ' + x); }
  if (erros.length) { linha('\nERRORS:'); for (const x of erros) linha('  ' + x); }
  r.renomeadas = renomeadas; r.cwdReescritos = cwdReescritos;
  r.relatorio = rel.join('\n');
  fs.writeFileSync(path.join(C.perfil(), `migracao-${hora()}.txt`), r.relatorio, 'utf8');
  return r;
}

function lerArgs(argv) {
  const o = {}, mapa = { '--destino': 'destino', '--home': 'home', '--claudejson': 'claudejson', '--fcc': 'fcc', '--projetos': 'projetos' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (mapa[a]) o[mapa[a]] = argv[++i];
    else if (a === '--copiar-projetos') o.copiarProjetos = true;
    else if (a === '--copiar-ferramentas') o.copiarFerramentas = true;
    else if (a === '--simular') o.simular = true;
    else throw new Error('unknown argument: ' + a);
  }
  return o;
}

module.exports = { migrar, lerArgs, fmt };

if (require.main === module) {
  migrar(lerArgs(process.argv.slice(2))).then((r) => { console.log(r.relatorio); if (r.erros.length) process.exitCode = 1; })
    .catch((e) => { console.error('FAILED: ' + e.message); process.exitCode = 1; });
}
