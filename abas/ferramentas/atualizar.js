// Updates the installed .exe without dropping the conversation: Claude runs INSIDE the program, so a build never closes the open copy.
// The new build waits in <root>\temp\atualizacao\pendente and this watcher (detached, no window) waits for the program to close
// (X button or "restart to update"), copies only what changed into <root> and reopens the program with --atualizou.
// Root R = folder of FCC.exe. The user folders beside it (perfil, conta, projects, ferramentas, temp, inventario) are NEVER touched:
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

// is an FCC.exe of THIS root open? (copies from other folders, e.g. tests, do not count)
function rodando(R) {
  try {
    const { EXE } = caminhosAtualizacao(R);
    const r = cp.execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='FCC.exe'\" | ForEach-Object { $_.ExecutablePath }"], { encoding: 'utf8', windowsHide: true });
    return r.split(/\r?\n/).some(l => l.trim() && path.resolve(l.trim()).toLowerCase() === EXE.toLowerCase());
  } catch { return false; }
}
// copies into R only what changed; stale files in resources\app go away; everything else under R stays
function aplicar(origem, R) {
  R = path.resolve(R);
  const todos = [...arquivos(origem)];
  const ruim = todos.find(rel => PROTEGIDAS.includes(rel.split(path.sep)[0].toLowerCase()));
  if (ruim) { const e = new Error('pacote recusado: contém pasta do usuário (' + ruim + ')'); e.protegido = true; throw e; }
  fs.mkdirSync(R, { recursive: true });
  let novos = 0, iguais = 0, removidos = 0; const lista = new Set();
  for (const rel of todos) {
    lista.add(rel.toLowerCase());
    const de = path.join(origem, rel), para = path.join(R, rel);
    if (fs.existsSync(para) && fs.statSync(para).size === fs.statSync(de).size && hash(para) === hash(de)) { iguais++; continue; }
    fs.mkdirSync(path.dirname(para), { recursive: true }); fs.copyFileSync(de, para); novos++;
  }
  const app = path.join(R, 'resources', 'app');
  if (fs.existsSync(app)) for (const rel of arquivos(app)) { const r = path.join('resources', 'app', rel).toLowerCase(); if (!lista.has(r)) { fs.unlinkSync(path.join(app, rel)); removidos++; } }
  return { novos, iguais, removidos };
}
function abrir(R, args = []) {
  if (process.env.FCC_TESTE_NAO_ABRIR === '1') return;
  const { EXE } = caminhosAtualizacao(R);
  cp.spawn(EXE, args, { detached: true, stdio: 'ignore', cwd: path.resolve(R) }).unref();
}
// starts the watcher as an independent process (does not die with the caller)
function soltarVigia(R, execPath) {
  const exe = execPath || process.execPath;
  const env = { ...process.env, FCC_RAIZ: path.resolve(R) };
  if (!/^node(\.exe)?$/i.test(path.basename(exe))) env.ELECTRON_RUN_AS_NODE = '1';
  cp.spawn(exe, [__filename], { env, detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(__filename) }).unref();
}
module.exports = { caminhosAtualizacao, rodando, aplicar, abrir, soltarVigia, log, PROTEGIDAS };

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
    while (rodando(R)) await esperar(2000);
    await esperar(1500);                                    // Windows releases the files of the program that just closed
    let r = null, erro = '';
    for (let i = 0; i < 10 && !r; i++) { try { r = aplicar(PEND, R); } catch (e) { erro = e.message; if (e.protegido) break; await esperar(1500); } }
    if (r) { fs.rmSync(PEND, { recursive: true, force: true }); log(R, `applied: ${r.novos} copied, ${r.iguais} same, ${r.removidos} removed`); }
    else { const f = PEND + '-falhou'; fs.rmSync(f, { recursive: true, force: true }); fs.renameSync(PEND, f); log(R, 'FAILED to copy (' + erro + '); old .exe stays; build kept in temp\\atualizacao\\pendente-falhou'); }
    abrir(R, ['--atualizou']); log(R, 'program opened again');
  } finally { try { fs.unlinkSync(TRAVA); } catch { } }
})().catch(e => { try { log(path.resolve(process.env.FCC_RAIZ || '.'), 'ERROR watcher: ' + (e.stack || e)); } catch { } });
