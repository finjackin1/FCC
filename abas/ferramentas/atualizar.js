// Updates the installed .exe without dropping the conversation: Claude runs INSIDE the program, so a build never closes the open copy.
// The new build waits in <root>\temp\atualizacao\pendente and this watcher (detached, no window) waits for the program to close
// (X button or "restart to update"), copies only what changed into <root> and reopens the program with --atualizou.
// Root R = folder of the root FCC.exe (launcher; the program is modulos\FCC.exe). A package with modulos\ replaces the old flat
// layout: root items it now carries inside modulos are removed after the copy. The user folders beside it (perfil, conta, projects, ferramentas, temp, inventario) are NEVER touched:
// a package carrying any of them is refused before anything is written.
// Usage: set FCC_RAIZ=<root> and run: node ferramentas\atualizar.js   (empacotar.js and the program call it; also a module)
'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const crypto = require('crypto');

const PROTEGIDAS = ['perfil', 'conta', 'projects', 'ferramentas', 'temp', 'inventario'];

function caminhosAtualizacao(R) {
  R = path.resolve(R);
  const dir = path.join(R, 'temp', 'atualizacao');
  return { RAIZ: R, EXE: path.join(R, 'FCC.exe'), PEND: path.join(dir, 'pendente'), TRAVA: path.join(dir, 'vigia.pid'), LOG: path.join(dir, 'log.txt') };
}
const log = (R, t) => { try { const { LOG } = caminhosAtualizacao(R); fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${new Date().toISOString()} | ${t}\r\n`); } catch { } };
const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
function* arquivos(d, base = d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* arquivos(p, base); else yield path.relative(base, p); } }

// program exe -> its install root: <root>\modulos\FCC.exe (since 25/11, layout like FAH) or <root>\FCC.exe (older builds)
const raizDoExe = (exe) => { const d = path.dirname(path.resolve(exe)); return path.basename(d).toLowerCase() === 'modulos' ? path.dirname(d) : d; };
// is an FCC.exe of THIS root open (launcher or program)? (copies from other folders, e.g. tests, do not count)
function rodando(R) {
  try {
    R = path.resolve(R).toLowerCase();
    // the watcher itself runs as FCC.exe (ELECTRON_RUN_AS_NODE): skip own pid and any atualizar.js process, or it waits forever
    const r = cp.execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='FCC.exe'\" | Where-Object { $_.ProcessId -ne " + process.pid + " -and $_.CommandLine -notmatch 'atualizar\\.js' } | ForEach-Object { $_.ExecutablePath }"], { encoding: 'utf8', windowsHide: true });
    return r.split(/\r?\n/).some(l => l.trim() && raizDoExe(l.trim()).toLowerCase() === R);
  } catch { return false; }
}
// the program folder (resources\app) of each layout the package carries; stale files there go away
const PASTAS_APP = [path.join('modulos', 'resources', 'app'), path.join('resources', 'app')];
// old flat layout -> modulos: root items that the package now carries inside modulos (Electron dlls, paks, locales, resources...)
function soltosVelhos(origem, R) {
  const m = path.join(origem, 'modulos');
  if (!fs.existsSync(m) || !fs.existsSync(R)) return [];
  const dentro = new Set(fs.readdirSync(m).map(n => n.toLowerCase()));
  return fs.readdirSync(R).filter(n => { const l = n.toLowerCase(); return dentro.has(l) && l !== 'fcc.exe' && l !== 'modulos' && !PROTEGIDAS.includes(l); });
}
// a file in use (the watcher's own exe/dlls) cannot be overwritten, but Windows lets it be renamed: move it aside, copy, drop it later
function copiar(de, para) {
  try { fs.copyFileSync(de, para); }
  catch (e) {
    if (!fs.existsSync(para) || !['EBUSY', 'EPERM', 'EACCES'].includes(e.code)) throw e;
    const velho = para + '.velho-' + Date.now(); fs.renameSync(para, velho); fs.copyFileSync(de, para);
    try { fs.unlinkSync(velho); } catch { }
  }
}
function limparVelhos(R) {
  for (const d of [R, path.join(R, 'modulos')]) { let n = []; try { n = fs.readdirSync(d); } catch { } for (const f of n) if (/\.velho-\d+$/.test(f)) try { fs.unlinkSync(path.join(d, f)); } catch { } }
}
// copies into R only what changed; stale files of the program folder go away; everything else under R stays
function aplicar(origem, R) {
  R = path.resolve(R);
  const todos = [...arquivos(origem)];
  const ruim = todos.find(rel => PROTEGIDAS.includes(rel.split(path.sep)[0].toLowerCase()));
  if (ruim) { const e = new Error('pacote recusado: contém pasta do usuário (' + ruim + ')'); e.protegido = true; throw e; }
  fs.mkdirSync(R, { recursive: true }); limparVelhos(R);
  let novos = 0, iguais = 0, removidos = 0; const lista = new Set();
  for (const rel of todos) {
    lista.add(rel.toLowerCase());
    const de = path.join(origem, rel), para = path.join(R, rel);
    if (fs.existsSync(para) && fs.statSync(para).size === fs.statSync(de).size && hash(para) === hash(de)) { iguais++; continue; }
    fs.mkdirSync(path.dirname(para), { recursive: true }); copiar(de, para); novos++;
  }
  for (const base of PASTAS_APP) {
    const app = path.join(R, base);
    if (fs.existsSync(path.join(origem, base)) && fs.existsSync(app)) for (const rel of arquivos(app)) { const r = path.join(base, rel).toLowerCase(); if (!lista.has(r)) { fs.unlinkSync(path.join(app, rel)); removidos++; } }
  }
  for (const n of soltosVelhos(origem, R)) { fs.rmSync(path.join(R, n), { recursive: true, force: true }); removidos++; }
  return { novos, iguais, removidos };
}
// what aplicar() would change, without writing: { mudados: [rel], removidos: [rel] } (rel to R). main.js uses it to see if a build only touches the screen
function diferencas(origem, R) {
  R = path.resolve(R); const mudados = [], removidos = [], lista = new Set();
  for (const rel of arquivos(origem)) {
    lista.add(rel.toLowerCase());
    const de = path.join(origem, rel), para = path.join(R, rel);
    if (!(fs.existsSync(para) && fs.statSync(para).size === fs.statSync(de).size && hash(para) === hash(de))) mudados.push(rel);
  }
  for (const base of PASTAS_APP) {
    const app = path.join(R, base);
    if (fs.existsSync(path.join(origem, base)) && fs.existsSync(app)) for (const rel of arquivos(app)) { const r = path.join(base, rel); if (!lista.has(r.toLowerCase())) removidos.push(r); }
  }
  removidos.push(...soltosVelhos(origem, R));
  return { mudados, removidos };
}
// only the screen changed (everything under resources\app\tela\) = the open program reloads it without closing (main.js tentarAoVivo)
const soTela = (d) => [...d.mudados, ...d.removidos].every(rel => PASTAS_APP.some(b => rel.toLowerCase().startsWith(path.join(b, 'tela') + path.sep)));
function abrir(R, args = []) {
  if (process.env.FCC_TESTE_NAO_ABRIR === '1') return;
  const { EXE } = caminhosAtualizacao(R);
  // the watcher runs with ELECTRON_RUN_AS_NODE=1: if inherited, FCC.exe starts as plain node and dies ("bad option")
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE; delete env.FCC_RAIZ;
  cp.spawn(EXE, args, { detached: true, stdio: 'ignore', cwd: path.resolve(R), env }).unref();
}
// starts the watcher as an independent process (does not die with the caller)
function soltarVigia(R, execPath) {
  const exe = execPath || process.execPath;
  const env = { ...process.env, FCC_RAIZ: path.resolve(R) };
  if (!/^node(\.exe)?$/i.test(path.basename(exe))) env.ELECTRON_RUN_AS_NODE = '1';
  cp.spawn(exe, [__filename], { env, detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(__filename) }).unref();
}
module.exports = { caminhosAtualizacao, rodando, aplicar, diferencas, soTela, abrir, soltarVigia, log, PROTEGIDAS };

if (require.main === module) (async () => {
  if (!process.env.FCC_RAIZ) { console.error('atualizar.js: FCC_RAIZ not set (install root = folder of FCC.exe); nothing done'); process.exit(2); }
  const R = path.resolve(process.env.FCC_RAIZ);
  const { PEND, TRAVA } = caminhosAtualizacao(R);
  if (!fs.existsSync(PEND)) return;
  // one watcher only: another alive = this one leaves
  try { const pid = +fs.readFileSync(TRAVA, 'utf8'); if (pid && pid !== process.pid) { try { process.kill(pid, 0); return; } catch { } } } catch { }
  fs.mkdirSync(path.dirname(TRAVA), { recursive: true });
  fs.writeFileSync(TRAVA, String(process.pid));
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    log(R, 'watcher: new build ready in temp\\atualizacao\\pendente; waiting for the program to close');
    while (rodando(R) && fs.existsSync(PEND)) await esperar(2000);
    if (!fs.existsSync(PEND)) { log(R, 'watcher: build already applied by the open program (screen-only, live); leaving'); return; }
    await esperar(1500);                                    // Windows releases the files of the program that just closed
    let r = null, erro = '';
    for (let i = 0; i < 10 && !r; i++) { try { r = aplicar(PEND, R); } catch (e) { erro = e.message; if (e.protegido) break; await esperar(1500); } }
    if (r) { fs.rmSync(PEND, { recursive: true, force: true }); log(R, `applied: ${r.novos} copied, ${r.iguais} same, ${r.removidos} removed`); }
    else { const f = PEND + '-falhou'; fs.rmSync(f, { recursive: true, force: true }); fs.renameSync(PEND, f); log(R, 'FAILED to copy (' + erro + '); old .exe stays; build kept in temp\\atualizacao\\pendente-falhou'); }
    abrir(R, ['--atualizou']); log(R, 'program opened again');
  } finally { try { fs.unlinkSync(TRAVA); } catch { } }
})().catch(e => { try { log(path.resolve(process.env.FCC_RAIZ || '.'), 'ERROR watcher: ' + (e.stack || e)); } catch { } });
