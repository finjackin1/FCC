// "Prepare a copy of my profile to send to a friend". Copies only an allow-list of the profile, withholds files that hold an
// e-mail address or a token, and reports personal absolute paths (outside the root) so the user can decide. Never touches the source.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./caminhos');

const MAX_TEXTO = 5 * 1024 * 1024;
const EXT_TEXTO = new Set(['.md', '.json', '.js', '.py', '.ps1', '.txt', '.ini', '.yaml', '.yml', '.toml', '.sh', '.cmd', '.bat', '.cfg', '.env', '.html', '.ts', '.xml', '.jsonl']);
const low = (s) => String(s).toLowerCase();

// ---- secrets ----
const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const EMAIL_OK = (e) => {
  const m = low(e), d = m.slice(m.lastIndexOf('@') + 1);
  if (m === 'noreply@anthropic.com') return true;
  return /^(example\.(com|org|net)|example|localhost|test|invalid)$/.test(d) || /(^|\.)example\.(com|org|net)$/.test(d);
};
const RE_TOKEN = [
  /(?:accessToken|refreshToken|oauthAccount)/,
  /sk-ant-[A-Za-z0-9_-]{8,}/,
  /\bghp_[A-Za-z0-9]{16,}/,
  /\bgithub_pat_[A-Za-z0-9_]{16,}/,
  /\bgh[osu]_[A-Za-z0-9]{16,}/,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bBearer\s+[A-Za-z0-9._~+\/=-]{20,}/,
  /(?<![A-Za-z0-9_-])sk-(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{20,}/,            // generic sk-... API keys (must hold a digit: not a slug)
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/,        // JWT
  /(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}(?![A-Za-z0-9_-])/,             // Google API key
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/,
];
const RE_CHAVE = /(?:api[_-]?key|[A-Za-z_]*token|secret)["']?\s*[:=]\s*["']?([A-Za-z0-9_\-.+\/=]{20,})/gi;
const PLACEHOLDER = /^(x+|\*+|\.+|your[_-].*|example.*|placeholder.*|changeme.*|replace.*)$/i;

// Returns [{motivo:'e-mail'|'token'}] (at most one of each).
function acharSegredos(texto) {
  const r = [];
  for (const m of texto.matchAll(RE_EMAIL)) { if (!EMAIL_OK(m[0])) { r.push({ motivo: 'e-mail' }); break; } }
  let tok = RE_TOKEN.some((re) => re.test(texto));
  if (!tok) for (const m of texto.matchAll(RE_CHAVE)) { if (!PLACEHOLDER.test(m[1])) { tok = true; break; } }
  if (tok) r.push({ motivo: 'token' });
  return r;
}

// ---- personal paths ----
const normCmp = (s) => low(String(s).replace(/\\\\+/g, '\\').replace(/\//g, '\\')).replace(/\\+$/, '');
const RE_CAMINHO = [
  /(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s"'`<>|*?]*/g,
  /(?<![\w.:\/])\/[A-Za-z]\/(?:Users|Documents|Documentos)\/[^\s"'`<>|*?]*/g,
  /(?<![\w.:\/])\/mnt\/[a-z]\/[^\s"'`<>|*?]*/g,
];
function dentroDaRaiz(achado, raizN) {
  let a = achado;
  let m = /^\/(?:mnt\/)?([A-Za-z])\/(.*)$/.exec(a);
  if (m) a = m[1].toUpperCase() + ':\\' + m[2];
  const n = normCmp(a);
  return n === raizN || n.startsWith(raizN + '\\');
}
function acharCaminhos(texto, raiz) {
  const raizN = normCmp(raiz), out = [];
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const variantes = [raiz, raiz.replace(/\\/g, '/'), raiz.replace(/\\/g, '\\\\')];
  const reRaiz = new RegExp(variantes.map(esc).join('|'), 'gi');   // root may contain spaces: mask it before looking for paths
  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].length > 20000) continue;
    const l = linhas[i].replace(reRaiz, '<RAIZ>');
    for (const re of RE_CAMINHO) {
      re.lastIndex = 0;
      let achou = null, ini = 0;
      for (const m of l.matchAll(re)) { if (!dentroDaRaiz(m[0].replace(/[.,;:)\]}]+$/, ''), raizN)) { achou = m[0]; ini = m.index; break; } }
      if (achou) { out.push({ linha: i + 1, trecho: l.length - ini > 100 ? l.slice(ini, ini + 100) + "…" : l.slice(ini) }); break; }
    }
  }
  return out;
}

// ---- selection ----
const SO_ESTES_CLAUDE = ['skills', 'agents', 'CLAUDE.md', 'settings.json'];
const FORA_REGRAS_TOPO = ['historico'];
const FORA_CASA_TOPO = ['orquestra', 'projetos'];
// lessons / memories: excluded at any depth, in every source (file or folder name)
const ehAprendizados = (nome) => /^(aprendizad|memori|memory|lesson|li[cç][oõ]e)/i.test(nome);
const EXT_IMG = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp']);   // copied unscanned
const EXT_BINARIO = new Set(['.db', '.sqlite', '.sqlite3', '.mdb', '.exe', '.dll', '.so', '.dylib', '.bin', '.zip', '.7z', '.rar', '.gz', '.tgz', '.tar', '.bz2', '.xz', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pyc', '.class', '.jar', '.msi', '.iso', '.dat', '.lnk', '.mp3', '.mp4', '.wav', '.mov', '.avi', '.mkv', '.woff', '.woff2', '.ttf', '.otf', '.eot']);
const RAIZ_NEUTRA = 'C:\\FCC-RAIZ-ENVIO';   // stands for the sender's root inside the copy; the receiver's restaurar swaps it for its own root

// Returns {texto, enc:'utf8'|'le'|'be', bom:Buffer} or null for a real binary.
function decodificar(buf) {
  const b0 = buf[0], b1 = buf[1];
  const par = (x, enc, bom) => ({ texto: enc === 'utf8' ? x.toString('utf8') : (enc === 'le' ? x.toString('utf16le') : Buffer.from(x).swap16().toString('utf16le')), enc, bom });
  const corte = (x) => x.subarray(0, x.length - (x.length % 2));
  if (buf.length >= 3 && b0 === 0xEF && b1 === 0xBB && buf[2] === 0xBF) return par(buf.subarray(3), 'utf8', buf.subarray(0, 3));
  if (buf.length >= 2 && b0 === 0xFF && b1 === 0xFE) return par(corte(buf.subarray(2)), 'le', buf.subarray(0, 2));
  if (buf.length >= 2 && b0 === 0xFE && b1 === 0xFF) return par(corte(buf.subarray(2)), 'be', buf.subarray(0, 2));
  const n = Math.min(buf.length, 8192) & ~1;
  if (n >= 4) {
    let pares = 0, impares = 0;
    for (let i = 0; i < n; i += 2) { if (buf[i] === 0) pares++; if (buf[i + 1] === 0) impares++; }
    const m = n / 2;
    if (impares >= m * 0.9 && pares <= m * 0.1) return par(corte(buf), 'le', Buffer.alloc(0));
    if (pares >= m * 0.9 && impares <= m * 0.1) return par(corte(buf), 'be', Buffer.alloc(0));
  }
  if (buf.subarray(0, 8192).includes(0)) return null;
  return par(buf, 'utf8', Buffer.alloc(0));
}
function codificar(d, texto) {
  let corpo;
  if (d.enc === 'utf8') corpo = Buffer.from(texto, 'utf8');
  else { corpo = Buffer.from(texto, 'utf16le'); if (d.enc === 'be') corpo.swap16(); }
  return Buffer.concat([d.bom, corpo]);
}

// Sender's root (any separator style) -> neutral placeholder, so the copy carries no personal location.
function neutralizarRaiz(t, raiz) {
  const segs = path.resolve(raiz).split(/[\\/]+/).filter(Boolean);
  const re = new RegExp(segs.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(?:\\\\{1,2}|/)') + '(?![A-Za-z0-9_-])', 'gi');
  return t.replace(re, (m) => {
    if (/\\\\/.test(m)) return RAIZ_NEUTRA.replace(/\\/g, '\\\\');
    if (m.includes('/') && !m.includes('\\')) return RAIZ_NEUTRA.replace(/\\/g, '/');
    return RAIZ_NEUTRA;
  });
}
const ehCredencial = (nome) => { const n = low(nome); return n === '.credentials.json' || n === '.env' || n.startsWith('.env.') || n.endsWith('.pem') || n.endsWith('.key'); };

function semBarra(p) { return path.resolve(p); }
function dentro(pai, f) { const r = path.relative(semBarra(pai), semBarra(f)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); }

function validarDestino(destino) {
  if (!destino || typeof destino !== 'string') throw new Error('destino invalido');
  const d = semBarra(destino);
  if (dentro(C.raiz(), d)) throw new Error('destino dentro da raiz do FCC');
  if (dentro(d, C.raiz())) throw new Error('destino contem a raiz do FCC');
  let st = null;
  try { st = fs.lstatSync(d); } catch { }
  if (st) {
    if (!st.isDirectory() || st.isSymbolicLink()) throw new Error('destino existe e nao e pasta');
    if (fs.readdirSync(d).length) throw new Error('destino nao esta vazio');
  }
  return d;
}

function prepararEnvio(destino) {
  const dest = validarDestino(destino);
  const raiz = C.raiz();
  const out = { copiados: 0, retidos: [], ignorados: [], caminhosPessoais: [], bytes: 0 };
  const destPerfil = path.join(dest, 'perfil');
  fs.mkdirSync(destPerfil, { recursive: true });
  const rel = (f) => path.relative(dest, f);

  const copiarArquivo = (src, dst) => {
    const nome = path.basename(src);
    if (ehCredencial(nome)) { out.retidos.push({ arquivo: rel(dst), motivo: 'token' }); return; }
    const ext = low(path.extname(nome));
    if (ext === '.jsonl') return;   // conversations: never, anywhere
    const st = fs.statSync(src);
    if (EXT_IMG.has(ext)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst); out.copiados++; out.bytes += st.size; return;
    }
    if (EXT_BINARIO.has(ext)) { out.ignorados.push({ arquivo: rel(dst), motivo: 'binario' }); return; }
    if (st.size > MAX_TEXTO) { out.retidos.push({ arquivo: rel(dst), motivo: 'grande demais para verificar' }); return; }
    const buf = fs.readFileSync(src);
    const dec = decodificar(buf);
    if (!dec) { out.ignorados.push({ arquivo: rel(dst), motivo: 'binario' }); return; }
    const seg = acharSegredos(dec.texto);
    if (seg.length) { for (const s of seg) out.retidos.push({ arquivo: rel(dst), motivo: s.motivo }); return; }
    for (const c of acharCaminhos(dec.texto, raiz)) out.caminhosPessoais.push({ arquivo: rel(dst), linha: c.linha, trecho: c.trecho });
    const neutro = neutralizarRaiz(dec.texto, raiz);
    const saida = neutro === dec.texto ? buf : codificar(dec, neutro);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, saida); out.copiados++; out.bytes += saida.length;
  };

  // excluir(relParts, nome, ehDir) -> true to skip silently
  const andar = (src, dst, excluir, partes) => {
    let ents;
    try { ents = fs.readdirSync(src, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const s = path.join(src, e.name), d = path.join(dst, e.name);
      if (excluir(partes, e.name, e.isDirectory())) continue;
      let l;
      try { l = fs.lstatSync(s); } catch { continue; }
      if (l.isSymbolicLink()) { out.retidos.push({ arquivo: rel(d), motivo: 'atalho/junction ignorado' }); continue; }
      if (l.isDirectory()) andar(s, d, excluir, partes.concat(e.name));
      else if (l.isFile()) copiarArquivo(s, d);
    }
  };

  // lessons/memories (files or folders) are out at any depth; historico\ only at the top of regras; orquestra\ projetos\ only at the top of casa
  const semLicoes = (p, nome) => ehAprendizados(nome);
  // claude: only the four allowed entries
  for (const nome of SO_ESTES_CLAUDE) {
    const s = path.join(C.perfilClaude(), nome), d = path.join(destPerfil, 'claude', nome);
    let l; try { l = fs.lstatSync(s); } catch { continue; }
    if (l.isSymbolicLink()) { out.retidos.push({ arquivo: rel(d), motivo: 'atalho/junction ignorado' }); continue; }
    if (l.isDirectory()) andar(s, d, semLicoes, [nome]); else if (l.isFile()) copiarArquivo(s, d);
  }
  andar(C.regras(), path.join(destPerfil, 'regras'),
    (p, nome, dir) => semLicoes(p, nome) || (p.length === 0 && dir && FORA_REGRAS_TOPO.includes(low(nome))), []);
  andar(C.casa(), path.join(destPerfil, 'casa'),
    (p, nome, dir) => semLicoes(p, nome) || (p.length === 0 && dir && FORA_CASA_TOPO.includes(low(nome))), []);

  // perfil.json: origem is a neutral placeholder (the sender's root was replaced by it in the copied texts), so the receiver's restaurar swaps it for its own root
  let ferr = [];
  try { const j = JSON.parse(fs.readFileSync(C.perfilJson(), 'utf8')); if (Array.isArray(j.ferramentas)) ferr = j.ferramentas.slice(); } catch { }
  const pj = JSON.stringify({ versao: 1, origem: RAIZ_NEUTRA, pastas: [], ferramentas: ferr }, null, 2);
  fs.writeFileSync(path.join(destPerfil, 'perfil.json'), pj);
  out.bytes += Buffer.byteLength(pj);
  return out;
}

module.exports = { prepararEnvio, acharSegredos, acharCaminhos, EXT_TEXTO };
