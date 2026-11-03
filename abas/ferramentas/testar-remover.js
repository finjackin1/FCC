'use strict';
// Isolated: root, fake Start Menu, test registry key and salvo folder all live in os.tmpdir() / HKCU\Software\FCC-teste-remover.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync, spawn } = require('child_process');

const CHAVE = 'HKCU\\Software\\FCC-teste-remover\\Run';
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-rem-'));
const baseLonga = fs.realpathSync.native(base);   // tmpdir may be spelled 8.3; the Recycle Bin reports the long form
const raiz = path.join(base, 'Meu Lugar Ação');
process.env.FCC_RAIZ = raiz;

function ps(script, entrada) {
  const corpo = "$ProgressPreference='SilentlyContinue'; $ErrorActionPreference='Stop'\n" + script;
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(corpo, 'utf16le').toString('base64')],
    { env: { ...process.env, FCC_ENTRADA: JSON.stringify(entrada || {}) }, encoding: 'utf8', windowsHide: true, timeout: 120000 });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const existe = (f) => { try { fs.lstatSync(f); return true; } catch { return false; } };
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f, o); else o.push(f); } return o; };

async function esperaLog(f, re, ms = 40000) {
  const t0 = Date.now();
  for (;;) {
    let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch { }
    if (re.test(t)) return t;
    if (Date.now() - t0 > ms) throw new Error('log never matched ' + re + ': ' + t);
    await sleep(300);
  }
}
async function rodando(pid) {
  const out = ps('if (Get-Process -Id ' + (pid | 0) + ' -ErrorAction SilentlyContinue) { "1" } else { "0" }');
  return out.trim() === '1';
}
// Recycle Bin items (all drives) as {nome, de, caminho}
function lixeira() {
  const out = ps(`
$sh = New-Object -ComObject Shell.Application
$l = @()
foreach ($i in $sh.Namespace(10).Items()) { $l += [pscustomobject]@{ nome = $i.Name; de = [string]$i.ExtendedProperty('System.Recycle.DeletedFrom'); caminho = $i.Path } }
[Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -Compress -InputObject @($l)))))
`);
  return JSON.parse(Buffer.from(out.trim(), 'base64').toString('utf8'));
}
// Permanently deletes one Recycle Bin item ($R file/folder and its $I record).
function apagarDaLixeira(it) {
  const p = it.caminho, d = path.dirname(p), n = path.basename(p);
  if (!/^\$R/i.test(n) || !/\$Recycle\.Bin/i.test(p)) throw new Error('unexpected recycle path ' + p);
  ps(`$in = $env:FCC_ENTRADA | ConvertFrom-Json
Remove-Item -LiteralPath $in.r -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $in.i -Force -ErrorAction SilentlyContinue`, { r: p, i: path.join(d, '$I' + n.slice(2)) });
}

async function principal() {
  const C = require('../caminhos');
  const R = require('../remover');
  assert.strictEqual(C.raiz(), path.resolve(raiz));

  // fixture
  const projK = path.join(raiz, 'perfil', 'claude', 'projects', 'k');
  fs.mkdirSync(projK, { recursive: true });
  fs.writeFileSync(path.join(projK, 'a.jsonl'), '{"x":1}\n');
  fs.mkdirSync(path.join(raiz, 'perfil', 'regras'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'perfil', 'regras', 'x.md'), 'regra');
  fs.mkdirSync(path.join(raiz, 'conta', 'config'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'conta', 'config', '.credentials.json'), '{}');
  const juncao = path.join(raiz, 'conta', 'config', 'projects');
  fs.symlinkSync(path.join(raiz, 'perfil', 'claude', 'projects'), juncao, 'junction');
  const alvoFora = path.join(base, 'alvo-fora');   // outside the root: must survive the removal
  fs.mkdirSync(alvoFora, { recursive: true });
  fs.writeFileSync(path.join(alvoFora, 'dado.txt'), 'precioso');
  fs.mkdirSync(path.join(raiz, 'projects'), { recursive: true });
  fs.mkdirSync(path.join(raiz, 'projects', 'meu'), { recursive: true });   // a real project: must be saved next to the profile
  fs.writeFileSync(path.join(raiz, 'projects', 'meu', 'app.txt'), 'codigo');
  const juncaoFundo = path.join(raiz, 'projects', 'x');
  fs.symlinkSync(alvoFora, juncaoFundo, 'junction');
  const dormir = path.join(raiz, 'dormir.exe');   // a process running from inside the root: the script must kill it
  fs.copyFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'PING.EXE'), dormir);
  const dorme = spawn(dormir, ['-n', '120', '127.0.0.1'], { stdio: 'ignore', windowsHide: true });
  fs.mkdirSync(path.join(raiz, 'inventario'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'inventario', 'sistema.json'), JSON.stringify([{ id: 'programas:fake', tipo: 'programas', nome: 'Fake', data: '2026-01-01', conversa: null, desinstalar: null, origem: 'Detectado' }]));
  fs.writeFileSync(path.join(raiz, 'FCC.exe'), 'x');
  const fora = path.join(base, 'outro.exe');
  fs.writeFileSync(fora, 'y');

  const menu = path.join(base, 'Menu Iniciar', 'Programas');
  fs.mkdirSync(menu, { recursive: true });
  const lnkFcc = path.join(menu, 'FCC.lnk'), lnkOutro = path.join(menu, 'Outro.lnk');
  ps(`$in = $env:FCC_ENTRADA | ConvertFrom-Json
$sh = New-Object -ComObject WScript.Shell
foreach ($x in @($in.l)) { $s = $sh.CreateShortcut($x.lnk); $s.TargetPath = $x.alvo; $s.Save() }
New-Item -Path 'HKCU:\\Software\\FCC-teste-remover\\Run' -Force | Out-Null
Set-ItemProperty -LiteralPath 'HKCU:\\Software\\FCC-teste-remover\\Run' -Name 'FCC Teste' -Value ('"' + $in.exe + '" --oculto')
Set-ItemProperty -LiteralPath 'HKCU:\\Software\\FCC-teste-remover\\Run' -Name 'Outro' -Value ('"' + $in.fora + '"')`,
  { l: [{ lnk: lnkFcc, alvo: path.join(raiz, 'FCC.exe') }, { lnk: lnkOutro, alvo: fora }], exe: path.join(raiz, 'FCC.exe'), fora });
  assert(existe(lnkFcc) && existe(lnkOutro), 'fixture shortcuts');
  const opcRastros = { pastasAtalho: [path.join(base, 'Menu Iniciar')], chaveInicio: CHAVE };

  // plan
  const plano = R.planoRemocao(opcRastros);
  assert.deepStrictEqual(plano.sai.map((s) => s.nome).sort(), ['FCC.exe', 'conta', 'dormir.exe', 'inventario', 'perfil', 'projects']);
  assert(plano.sai.every((s) => s.bytes > 0), 'sizes');
  assert.strictEqual(plano.fica.length, 1);
  assert.strictEqual(plano.fica[0].nome, 'Fake');
  assert.strictEqual(plano.rastros.length, 2, JSON.stringify(plano.rastros));
  assert.strictEqual(plano.rastros.filter((r) => r.tipo === 'atalho').length, 1);
  assert.strictEqual(fs.realpathSync.native(plano.rastros.find((r) => r.tipo === 'atalho').caminho).toLowerCase(), fs.realpathSync.native(lnkFcc).toLowerCase());
  const ini = plano.rastros.find((r) => r.tipo === 'inicio');
  assert.strictEqual(ini.nome, 'FCC Teste');
  assert(ini.valor.includes(raiz));

  // run
  const filho = spawn(process.execPath, ['-e', 'setTimeout(()=>{},8000)'], { stdio: 'ignore' });
  const salvoEm = path.join(base, 'salvo');
  let parou = 0;
  const res = await R.executarRemocao({ ...opcRastros, pararTudo: async () => { await sleep(50); parou++; }, salvarPerfilEm: salvoEm, pid: filho.pid, pastaScript: path.join(base, 'script') });
  assert.strictEqual(parou, 1);
  assert.deepStrictEqual(res.erros, []);
  assert.strictEqual(res.rastrosAgendados, 2);
  const arqs = walk(salvoEm).map((f) => path.basename(f)).sort();
  assert(arqs.includes('a.jsonl') && arqs.includes('x.md'), 'salvo: ' + arqs);
  assert(!arqs.includes('.credentials.json'), 'login must not be saved');
  assert(existe(path.join(salvoEm, 'perfil', 'claude', 'projects', 'k', 'a.jsonl')), 'profile saved under salvo\perfil');
  assert.strictEqual(fs.readFileSync(path.join(salvoEm, 'projects', 'meu', 'app.txt'), 'utf8'), 'codigo', 'projects saved under salvo\projects');
  assert(!existe(path.join(salvoEm, 'projects', 'x')), 'junction to an outside folder is not followed nor copied');
  // right after return the child still lives: nothing destructive happened yet (junctions, traces, root all intact)
  assert(existe(juncao) && existe(juncaoFundo), 'junctions untouched before the script runs');
  assert(existe(raiz), 'root still there while pid runs');
  assert(existe(lnkFcc) && existe(lnkOutro), 'shortcuts untouched before the delete');
  assert(await rodando(dorme.pid), 'sleeper alive');
  // wait for the detached script
  let log = await esperaLog(res.log, /OK removed/);
  assert(!existe(raiz), 'root removed');
  log = await esperaLog(res.log, /traces removed: 2/);
  assert(/unlinked .*projects.x/.test(log) && /unlinked .*conta.config.projects/.test(log), 'log lists the unlinked junctions: ' + log);
  assert(new RegExp('killed ' + dorme.pid + ' .*dormir[.]exe').test(log), 'sleeper killed by pid ' + dorme.pid + ': ' + log);
  for (let i = 0; i < 20 && await rodando(dorme.pid); i++) await sleep(250);
  assert(!(await rodando(dorme.pid)), 'sleeper really gone');
  assert(existe(path.join(alvoFora, 'dado.txt')) && fs.readFileSync(path.join(alvoFora, 'dado.txt'), 'utf8') === 'precioso', 'target of the nested junction survived');
  assert(!existe(lnkFcc), 'FCC shortcut gone after the delete');
  for (let i = 0; i < 20 && existe(res.script); i++) await sleep(300);
  assert(!existe(res.script), 'script deleted itself');
  assert(existe(lnkOutro), 'other shortcut still there');
  const restantes = JSON.parse(Buffer.from(ps(`$o = Get-ItemProperty -LiteralPath 'HKCU:\\Software\\FCC-teste-remover\\Run'
$n = @($o.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { $_.Name })
[Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -Compress -InputObject $n))))`).trim(), 'base64').toString('utf8'));
  assert.deepStrictEqual([].concat(restantes), ['Outro']);


  const bin = lixeira();
  const noBin = bin.filter((i) => i.nome === path.basename(raiz) && i.de.toLowerCase() === baseLonga.toLowerCase());
  assert.strictEqual(noBin.length, 1, 'root in Recycle Bin: ' + JSON.stringify(bin.map((i) => i.nome + ' <- ' + i.de)));
  return { bin, noBin };
}

// Failure scenarios share one small fixture: root with a standard junction, a nested junction to an outside folder, a shortcut and a Run value.
async function cenario(tag, env) {
  const R = require('../remover');
  const r = path.join(base, 'cen-' + tag);
  process.env.FCC_RAIZ = r;
  fs.mkdirSync(path.join(r, 'perfil', 'claude', 'projects', 'k'), { recursive: true });
  fs.writeFileSync(path.join(r, 'perfil', 'claude', 'projects', 'k', 'a.jsonl'), '{}');
  fs.mkdirSync(path.join(r, 'conta', 'config'), { recursive: true });
  const j1 = path.join(r, 'conta', 'config', 'projects');
  fs.symlinkSync(path.join(r, 'perfil', 'claude', 'projects'), j1, 'junction');
  const alvo = path.join(base, 'alvo-' + tag);
  fs.mkdirSync(alvo, { recursive: true });
  fs.writeFileSync(path.join(alvo, 'dado.txt'), 'precioso');
  fs.mkdirSync(path.join(r, 'projects'), { recursive: true });
  const j2 = path.join(r, 'projects', 'x');
  fs.symlinkSync(alvo, j2, 'junction');
  fs.writeFileSync(path.join(r, 'FCC.exe'), 'x');
  const menu = path.join(base, 'Menu Iniciar', 'Programas');
  const lnk = path.join(menu, 'FCC-' + tag + '.lnk');
  const nomeRun = 'FCC Teste ' + tag;
  ps(`$in = $env:FCC_ENTRADA | ConvertFrom-Json
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($in.lnk); $s.TargetPath = $in.exe; $s.Save()
New-Item -Path 'HKCU:\\Software\\FCC-teste-remover\\Run' -Force | Out-Null
Set-ItemProperty -LiteralPath 'HKCU:\\Software\\FCC-teste-remover\\Run' -Name $in.nome -Value ('"' + $in.exe + '" --oculto')`, { lnk, exe: path.join(r, 'FCC.exe'), nome: nomeRun });
  const filho = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' });
  await new Promise((ok) => filho.on('exit', ok));
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  let res;
  try {
    res = await R.executarRemocao({ pastasAtalho: [path.join(base, 'Menu Iniciar')], chaveInicio: CHAVE, pararTudo: async () => { }, pid: filho.pid, pastaScript: path.join(base, 'script') });
  } finally { for (const k of Object.keys(env)) delete process.env[k]; }
  assert.deepStrictEqual(res.erros, []);
  assert.strictEqual(res.rastrosAgendados, 2);
  const temRun = () => new RegExp(nomeRun).test(ps(`(Get-ItemProperty -LiteralPath 'HKCU:\\Software\\FCC-teste-remover\\Run').PSObject.Properties.Name -join '|'`));
  return { res, r, j1, j2, alvo, lnk, temRun };
}
async function esperaFim(res) {
  for (let i = 0; i < 60 && existe(res.script); i++) await sleep(300);
  assert(!existe(res.script), 'script deleted itself');
}

// Bin too small (test override: 0 MB): nothing may be deleted or unlinked, no trace removed, clear message in the log.
async function cenarioLixeiraPequena() {
  const c = await cenario('grande', { FCC_TESTE_LIXEIRA_MB: '0' });
  const log = await esperaLog(c.res.log, /ERROR A pasta .* grande demais para a Lixeira; nada foi apagado\./);
  await esperaFim(c.res);
  assert(existe(c.r) && existe(path.join(c.r, 'FCC.exe')), 'root untouched');
  assert(fs.lstatSync(c.j1).isSymbolicLink() && fs.lstatSync(c.j2).isSymbolicLink(), 'junctions still linked');
  assert(existe(c.lnk) && c.temRun(), 'traces kept');
  assert(!/unlinked|killed|traces removed|OK removed/.test(log), 'log: ' + log);
  assert(existe(path.join(c.alvo, 'dado.txt')), 'outside target intact');
}

// Delete fails (test flag): root stays, traces stay, junctions that were unlinked are listed in the log.
async function cenarioFalhaAoApagar() {
  const c = await cenario('falha', { FCC_TESTE_FALHAR_APAGAR: '1' });
  const log = await esperaLog(c.res.log, /junctions unlinked \(\d+;/);
  await esperaFim(c.res);
  assert(/ERROR folder still exists/.test(log) && /shortcuts and autostart entries kept/.test(log), 'log: ' + log);
  assert(!/OK removed|traces removed/.test(log), 'no success lines: ' + log);
  assert(/junctions unlinked \(2;/.test(log) && /projects.x/.test(log) && /conta.config.projects/.test(log), 'unlinked junctions reported: ' + log);
  assert(existe(c.r), 'root still there');
  assert(existe(c.lnk) && c.temRun(), 'shortcut and Run value kept after failed delete');
  assert(existe(path.join(c.alvo, 'dado.txt')) && fs.readFileSync(path.join(c.alvo, 'dado.txt'), 'utf8') === 'precioso', 'outside target intact');
}

(async () => {
  let r = null, falhou = null;
  try { r = await principal(); await cenarioLixeiraPequena(); await cenarioFalhaAoApagar(); } catch (e) { falhou = e; }
  // cleanup: only what this test created
  try {
    const bin = lixeira();
    for (const it of bin) {
      const de = it.de.toLowerCase();
      if (de.startsWith(baseLonga.toLowerCase())) apagarDaLixeira(it);
    }
  } catch (e) { console.error('cleanup bin:', e.message); }
  try { ps("Remove-Item -LiteralPath 'HKCU:\\Software\\FCC-teste-remover' -Recurse -Force -ErrorAction SilentlyContinue"); } catch { }
  try {
    const cfg = path.join(raiz, 'conta', 'config');
    for (const n of fs.readdirSync(cfg)) { const f = path.join(cfg, n); if (fs.lstatSync(f).isSymbolicLink()) fs.unlinkSync(f); }
  } catch { }
  try {   // leftovers of a failed run: stray test processes, junctions (unlink first so rmSync never reaches their targets)
    ps(`$in = $env:FCC_ENTRADA | ConvertFrom-Json
Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($in.b, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-ChildItem -LiteralPath $in.b -Recurse -Force -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint } | ForEach-Object { [IO.Directory]::Delete($_.FullName) }`, { b: baseLonga + '\\' });
  } catch { }
  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { console.error('cleanup tmp:', e.message); }
  if (falhou) { console.error(falhou); process.exit(1); }
  console.log('ok');
})();
