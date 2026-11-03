// Moving the install (or the profile) to another place: fixes what depends on the old install path.
// Order matters and every step is idempotent: perfil.json "origem" is updated LAST, so a crash just means the next start redoes the work.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./caminhos');
const P = require('./perfil');

const norm = (p) => path.resolve(String(p)).replace(/[\\/]+$/, '').toLowerCase();
const dentro = (a, b) => norm(a).startsWith(norm(b) + '\\');   // a strictly inside b
const lst = (f) => { try { return fs.lstatSync(f); } catch { return null; } };
const esc = (s) => JSON.stringify(String(s)).slice(1, -1);
const regexLit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function lerPerfilJson() {
  try { return JSON.parse(fs.readFileSync(C.perfilJson(), 'utf8')); } catch { return null; }
}

function precisaRestaurar() {
  const j = lerPerfilJson();
  if (!j || typeof j.origem !== 'string' || !j.origem) return false;
  return norm(j.origem) !== norm(C.raiz());
}

// Replaces the prefix of a path (case-insensitive, at a path boundary). Returns null when it doesn't start with the old root.
function trocarPrefixo(valor, velho, novo) {
  if (typeof valor !== 'string' || valor.length < velho.length) return null;
  if (valor.slice(0, velho.length).toLowerCase() !== velho.toLowerCase()) return null;
  const resto = valor.slice(velho.length);
  if (resto && !/^[\\/]/.test(resto)) return null;
  if (dentro(novo, velho)) {   // new root inside old: already rewritten → leave
    const t = valor.slice(0, novo.length);
    if (t.toLowerCase() === novo.toLowerCase() && (valor.length === novo.length || /^[\\/]/.test(valor.slice(novo.length)))) return null;
  }
  return novo + resto;
}

// Path in text, any separator style: X\Y, X\\Y (JSON), X/Y; stops at a path boundary.
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
// Old root → new root in text. Mentions of the new root are shielded first, so a rerun (or new inside old) never doubles it.
function trocarRaizTexto(t, velho, novo) {
  const guardados = [];
  let s = !dentro(novo, velho) ? t : t.replace(padraoCaminho(novo), (m) => { guardados.push(m); return `\u0000${guardados.length - 1}\u0000`; });
  s = s.replace(padraoCaminho(velho), substituto(novo));
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[+i]);
}
const EXT_TEXTO = new Set(['.md', '.json', '.ps1', '.py', '.js', '.txt']);
const PULAR_TEXTO = new Set(['historico', 'backup', 'node_modules', '.git']);
function arquivosTexto(f, saida) {
  const l = lst(f);
  if (!l || l.isSymbolicLink()) return saida;
  if (l.isDirectory()) { for (const n of fs.readdirSync(f)) if (!PULAR_TEXTO.has(n.toLowerCase())) arquivosTexto(path.join(f, n), saida); }
  else if (l.isFile() && EXT_TEXTO.has(path.extname(f).toLowerCase())) saida.push(f);
  return saida;
}

function hora() {
  const d = new Date(), p = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function contarColisoes(a, b) {   // names present in both folders (files), recursively
  let n = 0;
  for (const nome of fs.readdirSync(a)) {
    const de = path.join(a, nome), para = path.join(b, nome), ld = lst(de), lp = lst(para);
    if (!lp) continue;
    if (ld.isDirectory() && !ld.isSymbolicLink() && lp.isDirectory() && !lp.isSymbolicLink()) n += contarColisoes(de, para);
    else n++;
  }
  return n;
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

// Streams a file line by line as latin1 (byte-exact); the callback gets each line without "\n" (a "\r" stays) and returns the line to write.
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

function escrever(ws, texto) {
  return ws.write(texto, 'latin1') ? null : new Promise((r) => ws.once('drain', r));
}

// Rewrites top-level cwd in lines that mention the old root. Returns true when the file was replaced.
async function reescreverJsonl(arq, velho, novo) {
  const agulha = Buffer.from(esc(velho), 'utf8').toString('latin1').toLowerCase();
  let tem = false;
  await lerLinhas(arq, (l) => { if (!tem && l.toLowerCase().includes(agulha)) tem = true; });
  if (!tem) return false;

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
          const corpo = cr ? l.slice(0, -1) : l;
          const o = JSON.parse(Buffer.from(corpo, 'latin1').toString('utf8'));
          const c = o && typeof o === 'object' && !Array.isArray(o) ? trocarPrefixo(o.cwd, velho, novo) : null;
          if (c !== null) {
            o.cwd = c;
            saida = Buffer.from(JSON.stringify(o), 'utf8').toString('latin1') + (cr ? '\r' : '');
            mudou = true;
          }
        } catch { /* bad line stays as is */ }
      }
      const w = escrever(ws, nl ? saida + '\n' : saida);
      if (w) await w;
    })]);
    await Promise.race([falha, new Promise((r) => ws.end(r))]);
  } catch (e) { ws.destroy(); try { fs.unlinkSync(tmp); } catch { } throw e; }
  if (!mudou) { fs.unlinkSync(tmp); return false; }
  return { tmp };
}

// First top-level "cwd" string found in a conversation file (null when none); stops reading as soon as it finds one.
async function primeiroCwd(arq) {
  const rs = fs.createReadStream(arq, { encoding: 'latin1', highWaterMark: 1 << 16 });
  const fechado = new Promise((r) => { rs.on('close', r); rs.on('error', r); });
  const acha = (l) => {
    if (!l.includes('"cwd"')) return null;
    try { const o = JSON.parse(Buffer.from(l, 'latin1').toString('utf8')); return o && typeof o.cwd === 'string' ? o.cwd : null; } catch { return null; }
  };
  try {
    let resto = '';
    for await (const pedaco of rs) {
      const partes = (resto + pedaco).split('\n');
      resto = partes.pop();
      for (const l of partes) { const c = acha(l); if (c !== null) return c; }
    }
    return acha(resto);
  } finally { rs.destroy(); await fechado; }   // handle must be closed before the folder is renamed (Windows)
}
// True when some conversation in the folder ran with cwd === root or inside it (keys are lossy: E--FCC-old also fits E:\FCC\old).
async function cwdDentroDe(pasta, raiz) {
  let arqs = [];
  try { arqs = jsonlDe(pasta, []); } catch { return false; }
  const r = norm(raiz);
  for (const arq of arqs) {
    let c = null;
    try { c = await primeiroCwd(arq); } catch { }
    if (typeof c !== 'string') continue;
    const n = norm(c);
    if (n === r || n.startsWith(r + '\\')) return true;
  }
  return false;
}

function guardar(arq, backupDir) {   // hard link keeps the old bytes (rewrite replaces the file); copy when linking fails
  const rel = path.relative(C.perfil(), arq);
  const dest = path.join(backupDir, rel);
  if (lst(dest)) return;   // same-second rerun: the first backup holds the original, never overwrite it with rewritten bytes
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try { fs.linkSync(arq, dest); } catch { if (!lst(dest)) fs.copyFileSync(arq, dest); }
}

async function restaurarPerfil() {
  const r = { renomeadas: 0, reescritas: 0, colisoes: 0, backup: null, erros: [] };
  const j = lerPerfilJson();
  if (!j || typeof j.origem !== 'string' || !j.origem) return r;
  const velho = j.origem, novo = C.raiz();
  const falha = (etapa, e) => r.erros.push(`${etapa}: ${e && e.message ? e.message : e}`);

  // 1. backup
  const backupDir = path.join(C.perfil(), 'backup', hora());
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(C.perfilJson(), path.join(backupDir, 'perfil.json'));
    r.backup = backupDir;
  } catch (e) { falha('backup', e); return r; }

  // 2. conversation folders
  const projs = path.join(C.perfilClaude(), 'projects');
  const kVelho = C.chaveProjeto(velho).toLowerCase(), kNovo = C.chaveProjeto(novo);
  const pastas = [];
  if (lst(projs) && lst(projs).isDirectory()) {
    const kNovoBaixo = kNovo.toLowerCase();
    const aninhada = kNovoBaixo.startsWith(kVelho);   // new key extends the old one (new root inside old)
    for (const e of fs.readdirSync(projs, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const n = e.name, baixo = n.toLowerCase();
      if (aninhada && (baixo === kNovoBaixo || baixo.startsWith(kNovoBaixo + '-'))) continue;   // already new (rerun after a crash); step 2b collects it
      let casa = baixo === kVelho;
      if (!casa && baixo.startsWith(kVelho) && n[kVelho.length] === '-') {
        try { casa = await cwdDentroDe(path.join(projs, n), velho); } catch { casa = false; }   // sibling like FCC-old fails this
      }
      if (!casa) continue;
      const alvo = kNovo + n.slice(kVelho.length);
      if (alvo === n) { pastas.push(path.join(projs, n)); continue; }
      const de = path.join(projs, n), para = path.join(projs, alvo);
      try {
        if (lst(para)) { r.colisoes += contarColisoes(de, para); P.juntar(de, para); }
        else fs.renameSync(de, para);
        r.renomeadas++;
        pastas.push(para);
      } catch (e) { falha('pasta ' + n, e); }
    }
    // also folders already carrying the new key (a crashed run, or a merge target)
    for (const e of fs.readdirSync(projs, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const f = path.join(projs, e.name), b = e.name.toLowerCase(), k = kNovo.toLowerCase();
      if ((b === k || (b.startsWith(k) && e.name[k.length] === '-')) && !pastas.includes(f)) pastas.push(f);
    }
  }

  // 3. cwd inside the conversations
  for (const pasta of pastas) {
    let arqs = [];
    try { arqs = jsonlDe(pasta, []); } catch (e) { falha('listar ' + pasta, e); }
    for (const arq of arqs) {
      try {
        const res = await reescreverJsonl(arq, velho, novo);
        if (!res) continue;
        try { guardar(arq, backupDir); } catch (e) { try { fs.unlinkSync(res.tmp); } catch { } throw e; }
        fs.renameSync(res.tmp, arq);
        r.reescritas++;
      } catch (e) { falha('jsonl ' + arq, e); }
    }
  }

  // 4. text files that name the old root: plugins\*.json, settings.json, CLAUDE.md, regras, casa, skills, agents (history/backup kept as is)
  const alvos = [];
  try {
    const plug = path.join(C.perfilClaude(), 'plugins');
    if (lst(plug) && lst(plug).isDirectory()) for (const nome of fs.readdirSync(plug)) if (nome.toLowerCase().endsWith('.json')) alvos.push(path.join(plug, nome));
    for (const n of ['settings.json', 'CLAUDE.md']) alvos.push(path.join(C.perfilClaude(), n));
    for (const d of [C.regras(), C.casa(), path.join(C.perfilClaude(), 'skills'), path.join(C.perfilClaude(), 'agents')]) arquivosTexto(d, alvos);
  } catch (e) { falha('listar texto', e); }
  for (const f of alvos) {
    try {
      const l = lst(f);
      if (!l || !l.isFile() || l.size > 5 * 1024 * 1024) continue;
      const buf = fs.readFileSync(f);
      if (buf.subarray(0, 8192).includes(0)) continue;
      let t = buf.toString('utf8'), cod = 'utf8';
      if (!Buffer.from(t, 'utf8').equals(buf)) { t = buf.toString('latin1'); cod = 'latin1'; }   // not valid UTF-8 (cp1252): keep every byte
      const n2 = trocarRaizTexto(t, velho, novo);
      if (n2 === t) continue;
      if (cod === 'latin1' && /[^\u0000-ÿ]/.test(n2)) throw new Error('cp1252 file, new path has characters it cannot hold');
      guardar(f, backupDir);
      const tmp = f + '.fcc-tmp';
      fs.writeFileSync(tmp, n2, cod);
      fs.renameSync(tmp, f);
      r.textos = (r.textos || 0) + 1;
      if (cod === 'latin1') { r.latin1 = (r.latin1 || 0) + 1; r.avisos = (r.avisos || []).concat('cp1252 text kept byte-exact: ' + path.relative(C.perfil(), f)); }
    } catch (e) { falha('texto ' + path.relative(C.perfil(), f), e); }
  }

  // 5. perfil.json, only when nothing failed (otherwise the next start retries)
  if (r.erros.length === 0) {
    try {
      const novoJ = Object.assign({}, j, { origem: novo });
      if (Array.isArray(j.pastas)) novoJ.pastas = j.pastas.map((p) => { const t = trocarPrefixo(p, velho, novo); return t === null ? p : t; });
      const tmp = C.perfilJson() + '.fcc-tmp';
      fs.writeFileSync(tmp, JSON.stringify(novoJ, null, 2), 'utf8');
      fs.renameSync(tmp, C.perfilJson());
    } catch (e) { falha('perfil.json', e); }
  }

  // 6. junctions etc.
  try { P.prepararConfig(); } catch (e) { falha('prepararConfig', e); }
  return r;
}

function faltando() {
  const j = lerPerfilJson();
  const lista = j && Array.isArray(j.ferramentas) ? j.ferramentas : [];
  const falta = [];
  for (const it of lista) {
    const nome = typeof it === 'string' ? it : it && it.nome;
    if (!nome) continue;
    if (!lst(C.ferramentas(nome))) falta.push(nome);
  }
  return { ferramentas: falta };
}

module.exports = { precisaRestaurar, restaurarPerfil, faltando, trocarRaizTexto, trocarPrefixo };
