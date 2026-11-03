// Auto-update from GitHub (same flow as scrcpy-f atualizar.py, user request 03/11/2026):
// 1. ask GitHub releases/latest of REPO; pick asset FCC-<ver>.zip; compare tag with this version (package.json).
// 2. download to temp\atualizacao\<nome>.parcial, check size + sha256 (asset "digest" published by GitHub). Mismatch = deleted.
// 3. extract with Windows tar into temp\atualizacao\extraido, find folder holding FCC.exe, refuse user folders, move to
//    temp\atualizacao\pendente. The existing watcher (ferramentas\atualizar.js) applies it when the program closes (no admin).
// FCC_TESTE_API = path/file:// URL of a fake releases JSON (test bench only, publishes nothing).
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const https = require('https');
const { fileURLToPath } = require('url');

const REPO = 'finjackin1/FCC';                 // assumed name (03/11): repo is created only when user asks to publish
const API = `https://api.github.com/repos/${REPO}/releases/latest`;
const ASSET = /^FCC-v?[\w.]+\.zip$/i;
const PROTEGIDAS = ['perfil', 'conta', 'projects', 'ferramentas', 'temp', 'inventario'];   // same list as ferramentas\atualizar.js
const ESPERA = 20000;
const TAR = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');   // Windows bsdtar (opens zip); a Git tar first in PATH would not

// "1.2.10" > "1.2.9"; non-numeric parts count as 0
function maisNova(a, b) {
  const p = (v) => String(v || '').replace(/^v/i, '').split(/[.\-+]/).map(x => parseInt(x, 10) || 0);
  const x = p(a), y = p(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
}
const ehArquivo = (u) => /^file:/i.test(u) || /^[a-z]:[\\/]/i.test(u);
const caminhoDe = (u) => /^file:/i.test(u) ? fileURLToPath(u) : u;

// GET with redirects (GitHub asset URL redirects to objects.githubusercontent.com); returns the response stream
function pedir(url, n = 0) {
  return new Promise((ok, falha) => {
    const r = https.get(url, { headers: { 'User-Agent': 'FCC', Accept: 'application/vnd.github+json' }, timeout: ESPERA }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && n < 5) { res.resume(); return pedir(new URL(res.headers.location, url).href, n + 1).then(ok, falha); }
      if (res.statusCode !== 200) { res.resume(); return falha(new Error('HTTP ' + res.statusCode)); }
      ok(res);
    });
    r.on('timeout', () => r.destroy(new Error('demorou demais')));
    r.on('error', falha);
  });
}
async function lerJson(url) {
  if (ehArquivo(url)) return JSON.parse(fs.readFileSync(caminhoDe(url), 'utf8'));
  const res = await pedir(url); let t = '';
  res.setEncoding('utf8'); for await (const p of res) t += p;
  return JSON.parse(t);
}

// {info, erro}: info = versao, nome, url, tamanho, sha256
async function ultima(url = process.env.FCC_TESTE_API || API) {
  let d;
  try { d = await lerJson(url); } catch (e) { return { info: null, erro: /404/.test(e.message) ? 'o FCC ainda não tem versão publicada no GitHub' : 'sem resposta do GitHub (' + e.message + ')' }; }
  const tag = String(d.tag_name || '');
  const a = (d.assets || []).find(x => ASSET.test(String(x.name || '')));
  if (!a) return { info: null, erro: `a versão ${tag || '?'} não tem o zip do programa` };
  const dg = String(a.digest || '');
  return { info: { versao: tag.replace(/^v/i, ''), nome: String(a.name), url: a.browser_download_url, tamanho: +a.size || 0, sha256: dg.startsWith('sha256:') ? dg.slice(7).toLowerCase() : '' }, erro: '' };
}

const apagar = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch { } };

// download + check; {arq, erro}. progresso(baixado, total)
async function baixar(info, pasta, progresso) {
  fs.mkdirSync(pasta, { recursive: true });
  const nome = path.basename(info.nome), destino = path.join(pasta, nome), parcial = destino + '.parcial';
  const soma = crypto.createHash('sha256'); let baixado = 0, ultimo = 0;
  try {
    const ent = ehArquivo(info.url) ? fs.createReadStream(caminhoDe(info.url)) : await pedir(info.url);
    const sai = fs.createWriteStream(parcial);
    for await (const p of ent) {
      soma.update(p); baixado += p.length;
      if (!sai.write(p)) await new Promise(r => sai.once('drain', r));
      if (progresso && Date.now() - ultimo > 200) { ultimo = Date.now(); progresso(baixado, info.tamanho); }
    }
    await new Promise((r, f) => sai.end(e => e ? f(e) : r()));
  } catch (e) { apagar(parcial); return { arq: null, erro: 'o download falhou (' + e.message + ')' }; }
  if (info.tamanho && baixado !== info.tamanho) { apagar(parcial); return { arq: null, erro: `o arquivo chegou incompleto (${baixado} de ${info.tamanho})` }; }
  if (info.sha256 && soma.digest('hex') !== info.sha256) { apagar(parcial); return { arq: null, erro: 'o arquivo chegou diferente do publicado (conferência)' }; }
  try { apagar(destino); fs.renameSync(parcial, destino); } catch (e) { return { arq: null, erro: 'não consegui guardar o arquivo (' + e.message + ')' }; }
  return { arq: destino, erro: '' };
}

function* arquivos(d, base = d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* arquivos(p, base); else yield path.relative(base, p); } }

// zip -> pendente (only if it holds FCC.exe at top or inside one folder, and no user folder). {ok, erro}
function extrair(zip, pasta, pend) {
  const tmp = path.join(pasta, 'extraido');
  apagar(tmp); fs.mkdirSync(tmp, { recursive: true });
  try { cp.execFileSync(TAR, ['-xf', zip, '-C', tmp], { windowsHide: true, stdio: 'ignore', timeout: 300000 }); }
  catch { apagar(tmp); return { ok: false, erro: 'não consegui abrir o zip baixado' }; }
  let nova = fs.existsSync(path.join(tmp, 'FCC.exe')) ? tmp : null;
  if (!nova) for (const e of fs.readdirSync(tmp, { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(tmp, e.name, 'FCC.exe'))) { nova = path.join(tmp, e.name); break; }
  if (!nova) { apagar(tmp); return { ok: false, erro: 'o zip não tem o FCC.exe' }; }
  const ruim = [...arquivos(nova)].find(rel => PROTEGIDAS.includes(rel.split(path.sep)[0].toLowerCase()));
  if (ruim) { apagar(tmp); return { ok: false, erro: 'zip recusado: traz pasta do usuário (' + ruim.split(path.sep)[0] + ')' }; }
  try { apagar(pend); fs.renameSync(nova, pend); } catch (e) { apagar(tmp); return { ok: false, erro: 'não consegui preparar a versão nova (' + e.message + ')' }; }
  apagar(tmp); apagar(zip);
  return { ok: true, erro: '' };
}

// whole flow. o = { atual: '1.0.0', pasta: <temp\atualizacao>, url?, progresso? }
// -> { estado: 'em-dia' | 'pronta' | 'ja-pronta' | 'erro', versao, erro }
async function procurar(o) {
  const pend = path.join(o.pasta, 'pendente'), marca = path.join(o.pasta, 'versao-pendente.txt');
  if (fs.existsSync(pend)) { let v = ''; try { v = fs.readFileSync(marca, 'utf8').trim(); } catch { } return { estado: 'ja-pronta', versao: v, erro: '' }; }
  const { info, erro } = await ultima(o.url);
  if (!info) return { estado: 'erro', versao: '', erro };
  if (!maisNova(info.versao, o.atual)) return { estado: 'em-dia', versao: info.versao, erro: '' };
  const b = await baixar(info, o.pasta, o.progresso);
  if (!b.arq) return { estado: 'erro', versao: info.versao, erro: b.erro };
  const x = extrair(b.arq, o.pasta, pend);
  if (!x.ok) return { estado: 'erro', versao: info.versao, erro: x.erro };
  try { fs.writeFileSync(marca, info.versao, 'utf8'); } catch { }
  return { estado: 'pronta', versao: info.versao, erro: '' };
}

module.exports = { REPO, API, maisNova, ultima, baixar, extrair, procurar };
