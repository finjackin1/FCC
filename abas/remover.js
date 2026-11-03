// "Remove FCC" backend. planoRemocao() only reads; executarRemocao() stops the app, saves the profile if asked, and hands everything
// destructive (kill leftovers, unlink junctions, Recycle Bin delete, then traces) to a detached one-shot PowerShell script that waits
// for this process to exit (a running app cannot delete its own folder).
// What was installed on the system (inventario) is NEVER touched here: it is only listed in the plan.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const C = require('./caminhos');
const inventario = require('./inventario');

const CHAVE_INICIO = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';

const lst = (f) => { try { return fs.lstatSync(f); } catch { return null; } };
const norm = (p) => path.resolve(String(p)).replace(/[\\/]+$/, '').toLowerCase();
const aspas = (s) => "'" + String(s).replace(/'/g, "''") + "'";   // PowerShell single-quoted literal

function tamanho(p) {   // never follows links
  const st = lst(p);
  if (!st) return 0;
  if (st.isSymbolicLink()) return 0;
  if (!st.isDirectory()) return st.size;
  let t = 0, nomes = [];
  try { nomes = fs.readdirSync(p); } catch { return 0; }
  for (const n of nomes) t += tamanho(path.join(p, n));
  return t;
}

function contarArquivos(p) {
  const st = lst(p);
  if (!st || st.isSymbolicLink()) return 0;
  if (!st.isDirectory()) return 1;
  let t = 0, nomes = [];
  try { nomes = fs.readdirSync(p); } catch { return 0; }
  for (const n of nomes) t += contarArquivos(path.join(p, n));
  return t;
}

// Runs a PowerShell script (UTF-16 -EncodedCommand: no quoting problems), input via env FCC_ENTRADA (JSON),
// output = base64 of UTF-8 JSON (no console code page problems with accents).
function ps(script, entrada) {
  const corpo = "$ProgressPreference='SilentlyContinue'; $ErrorActionPreference='Stop'\n" + script +
    "\n[Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($saida)))";
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand',
    Buffer.from(corpo, 'utf16le').toString('base64')],
  { env: { ...process.env, FCC_ENTRADA: JSON.stringify(entrada || {}) }, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(Buffer.from(out.trim(), 'base64').toString('utf8'));
}

function pastasPadrao() {
  const casa = os.homedir();
  const l = [path.join(casa, 'Desktop')];
  if (process.env.OneDrive) l.push(path.join(process.env.OneDrive, 'Desktop'));
  if (process.env.APPDATA) l.push(path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
  return l;
}
const chaveInicioPS = (k) => String(k).replace(/^(HKCU|HKLM)(?=\\)/i, (m) => m.toUpperCase() + ':');

// True when "texto" mentions the root as a whole path (not a sibling like <root>2).
function citaRaiz(texto, raiz) {
  const t = String(texto).toLowerCase(), r = raiz.toLowerCase();
  for (let i = t.indexOf(r); i >= 0; i = t.indexOf(r, i + 1)) {
    const c = t[i + r.length];
    if (c === undefined || '\\/"\''.includes(c)) return true;
  }
  return false;
}
function dentroDaRaiz(alvo, raiz) {
  if (!alvo) return false;
  const a = norm(alvo), r = raiz.toLowerCase();
  return a === r || a.startsWith(r + '\\');
}

// Short (8.3) and long spellings of the root: Windows may store either in a shortcut or a Run value.
function raizesPossiveis() {
  const l = [norm(C.raiz())];
  try { const n = norm(fs.realpathSync.native(C.raiz())); if (!l.includes(n)) l.push(n); } catch { }
  return l;
}

function achar(opts) {
  const raizes = raizesPossiveis();
  const pastas = (opts && opts.pastasAtalho) || pastasPadrao();
  const chaves = [(opts && opts.chaveInicio) || CHAVE_INICIO].map(chaveInicioPS);
  const r = ps(`
$in = $env:FCC_ENTRADA | ConvertFrom-Json
$sh = New-Object -ComObject WScript.Shell
$lnks = @(); $runs = @()
foreach ($p in @($in.pastas)) {
  if (Test-Path -LiteralPath $p) {
    Get-ChildItem -LiteralPath $p -Recurse -Filter *.lnk -File -ErrorAction SilentlyContinue | ForEach-Object {
      try { $t = [string]$sh.CreateShortcut($_.FullName).TargetPath } catch { $t = '' }
      $lnks += [pscustomobject]@{ caminho = $_.FullName; alvo = $t }
    }
  }
}
$skip = 'PSPath','PSParentPath','PSChildName','PSDrive','PSProvider'
foreach ($k in @($in.chaves)) {
  if (Test-Path -LiteralPath $k) {
    $o = Get-ItemProperty -LiteralPath $k
    foreach ($pr in $o.PSObject.Properties) { if ($skip -notcontains $pr.Name) { $runs += [pscustomobject]@{ chave = $k; nome = $pr.Name; valor = [string]$pr.Value } } }
  }
}
$saida = ConvertTo-Json -Compress -InputObject ([pscustomobject]@{ lnks = @($lnks); runs = @($runs) })
`, { pastas, chaves });
  const rastros = [];
  for (const l of [].concat(r.lnks || [])) if (raizes.some((r) => dentroDaRaiz(l.alvo, r))) rastros.push({ tipo: 'atalho', caminho: l.caminho });
  for (const v of [].concat(r.runs || [])) if (raizes.some((r) => citaRaiz(v.valor, r))) rastros.push({ tipo: 'inicio', chave: v.chave, nome: v.nome, valor: v.valor });
  return rastros;
}

function planoRemocao(opts) {
  const raiz = C.raiz();
  const sai = [];
  let nomes = [];
  try { nomes = fs.readdirSync(raiz); } catch { }
  for (const nome of nomes) sai.push({ nome, caminho: path.join(raiz, nome), bytes: tamanho(path.join(raiz, nome)) });
  return { sai, fica: inventario.listarSistema(), rastros: achar(opts) };
}

// Saves perfil\ AND projects\ (UI promises both; 03/11 review: projects used to go to the Recycle Bin unsaved).
function salvarPerfil(destino) {
  const base = path.resolve(destino);
  const dest = path.join(base, 'perfil');
  if (norm(destino) === norm(C.raiz()) || norm(dest).startsWith(norm(C.raiz()) + '\\')) throw new Error('salvarPerfilEm is inside the folder being removed');
  if (!lst(C.perfil())) throw new Error('no perfil folder to save');
  const pares = [[C.perfil(), dest]];
  if (lst(C.projetos())) pares.push([C.projetos(), path.join(base, 'projects')]);
  for (const [, d] of pares) { let n = []; try { n = fs.readdirSync(d); } catch { } if (n.length) throw new Error(`${d} already exists and is not empty`); }
  let arquivos = 0;
  fs.mkdirSync(base, { recursive: true });
  for (const [o, d] of pares) {
    const esperado = contarArquivos(o);
    // links/junctions are skipped: cpSync walks into junctions and would copy whatever they point at (outside data, loops)
    fs.cpSync(o, d, { recursive: true, dereference: false, force: false, errorOnExist: false, filter: (s) => { const st = lst(s); return !!st && !st.isSymbolicLink(); } });
    const obtido = contarArquivos(d);
    if (obtido < esperado) throw new Error(`copy of ${path.basename(o)} incomplete: ${obtido} of ${esperado} files (nothing was removed; partial copy left in ${d})`);
    arquivos += obtido;
  }
  return { destino: dest, pasta: base, arquivos, projetos: pares.length > 1 };
}

// Everything destructive runs in this detached script, in this order: wait for the app to exit -> check the Recycle Bin can take
// the folder (else abort, nothing touched) -> kill leftover processes running from the root -> unlink all junctions/symlinks (so a
// recycle/delete never reaches their targets) -> send the root to the Recycle Bin -> ONLY THEN remove shortcuts/autostart entries.
function textoScript(raiz, pid, log, rastros, opc) {
  const raizes = raizesPossiveis();
  const mb = opc && opc.testeLixeiraMB !== undefined && opc.testeLixeiraMB !== '' ? Number(opc.testeLixeiraMB) : null;
  const falhar = opc && opc.testeFalharApagar ? 1 : 0;
  const rj = Buffer.from(JSON.stringify(rastros), 'utf8').toString('base64');
  return `# FCC one-shot removal. Waits for the app to exit, sends the install folder to the Recycle Bin, then removes traces, logs, deletes itself.
$raiz = ${aspas(raiz)}
$log = ${aspas(log)}
$pidApp = ${Number(pid) | 0}
$prefixos = @(${raizes.map((r) => aspas(r + '\\')).join(',')})
$testeMB = ${mb === null || Number.isNaN(mb) ? '$null' : String(mb)}
$testeFalhar = ${falhar}
$rastros = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${aspas(rj)})) | ConvertFrom-Json
$desligadas = New-Object System.Collections.ArrayList
function L($m) {   # retries: a reader holding the log (the app, a test) made Add-Content drop lines silently
  $s = (Get-Date -Format 's') + ' ' + $m + [Environment]::NewLine
  for ($i = 0; $i -lt 40; $i++) { try { [IO.File]::AppendAllText($log, $s, (New-Object Text.UTF8Encoding $true)); return } catch { Start-Sleep -Milliseconds 50 } }
}

function Tamanho($d) {   # bytes, never follows links
  $t = [long]0
  try {
    foreach ($e in (New-Object IO.DirectoryInfo $d).EnumerateFileSystemInfos()) {
      if ($e.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
      if ($e.Attributes -band [IO.FileAttributes]::Directory) { $t += Tamanho $e.FullName } else { $t += $e.Length }
    }
  } catch { }
  return $t
}

# Returns $null when the Recycle Bin can take the root, else the message for the user.
function ChecarLixeira {
  $drv = [IO.Path]::GetPathRoot($raiz)
  if (-not $drv -or $drv.Length -lt 3 -or $drv[1] -ne ':') { return 'Este local não tem Lixeira; nada foi apagado.' }
  if (-not [IO.Directory]::Exists($drv + '$Recycle.Bin')) { return 'Este disco não tem Lixeira; nada foi apagado.' }
  $capMB = $null
  try {
    $vol = Get-CimInstance Win32_Volume -Filter ("DriveLetter='" + $drv.Substring(0, 2) + "'")
    if ($vol -and ([string]$vol.DeviceID) -match '([{][0-9A-Fa-f-]+[}])') {
      $k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\BitBucket\\Volume\\' + $Matches[1]
      if (Test-Path -LiteralPath $k) {
        $p = Get-ItemProperty -LiteralPath $k
        if ($p.NukeOnDelete -eq 1) { return 'A Lixeira deste disco apaga direto; nada foi apagado.' }
        if ($p.MaxCapacity -gt 0) { $capMB = [long]$p.MaxCapacity }
      }
    }
  } catch { L ('bin capacity unreadable: ' + $_.Exception.Message) }
  if ($null -eq $capMB) {   # conservative fallback: 10% of the drive
    try { $capMB = [long][math]::Floor((New-Object IO.DriveInfo $drv).TotalSize / 10 / 1MB) } catch { $capMB = 0 }
  }
  if ($null -ne $testeMB) { $capMB = [long]$testeMB }
  $tam = Tamanho $raiz
  L ('size ' + $tam + ' bytes; bin capacity ' + $capMB + ' MB')
  if ($tam -ge ($capMB * 1MB)) { return 'A pasta é grande demais para a Lixeira; nada foi apagado.' }
  return $null
}

# Unlinks every junction/symlink under the root; real folders are walked, links are never followed.
function Desligar($d) {
  $itens = @()
  try { $itens = @((New-Object IO.DirectoryInfo $d).EnumerateFileSystemInfos()) } catch { L ('walk ' + $d + ': ' + $_.Exception.Message); return }
  foreach ($e in $itens) {
    if ($e.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      try {
        if ($e.Attributes -band [IO.FileAttributes]::Directory) { [IO.Directory]::Delete($e.FullName) } else { [IO.File]::Delete($e.FullName) }
        [void]$desligadas.Add($e.FullName); L ('unlinked ' + $e.FullName)
      } catch { L ('ERROR unlink ' + $e.FullName + ': ' + $_.Exception.Message) }
    } elseif ($e.Attributes -band [IO.FileAttributes]::Directory) { Desligar $e.FullName }
  }
}

L ('start; waiting for pid ' + $pidApp)
try { Wait-Process -Id $pidApp -Timeout 600 -ErrorAction Stop } catch { }
if (Get-Process -Id $pidApp -ErrorAction SilentlyContinue) {
  L 'ERROR app still running after 10 min; nothing removed'
} else {
  Start-Sleep -Seconds 1
  $msg = $null
  try { $msg = ChecarLixeira } catch { $msg = 'Não foi possível verificar a Lixeira; nada foi apagado. (' + $_.Exception.Message + ')' }
  if ($msg) {
    L ('ERROR ' + $msg)
  } else {
    foreach ($pr in @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ProcessId -ne $PID })) {
      $exe = ([string]$pr.ExecutablePath).ToLowerInvariant()
      if ($prefixos | Where-Object { $exe.StartsWith($_) }) {
        try { Stop-Process -Id $pr.ProcessId -Force -ErrorAction Stop; L ('killed ' + $pr.ProcessId + ' ' + $exe) } catch { L ('ERROR kill ' + $pr.ProcessId + ': ' + $_.Exception.Message) }
      }
    }
    Start-Sleep -Milliseconds 500
    Desligar $raiz
    Add-Type -AssemblyName Microsoft.VisualBasic
    $espera = 2; if ($testeFalhar) { $espera = 0 }
    for ($i = 1; $i -le 6; $i++) {
      if (-not (Test-Path -LiteralPath $raiz)) { break }
      try {
        if ($testeFalhar) { throw 'simulated failure (test)' }
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($raiz, 'OnlyErrorDialogs', 'SendToRecycleBin', 'ThrowException')
      } catch { L ('try ' + $i + ': ' + $_.Exception.Message); Start-Sleep -Seconds $espera }
    }
    if (Test-Path -LiteralPath $raiz) {
      L ('ERROR folder still exists: ' + $raiz + '; shortcuts and autostart entries kept')
      L ('junctions unlinked (' + $desligadas.Count + '; prepararConfig recreates the standard ones in conta\\config on next open): ' + ($desligadas -join ' | '))
    } else {
      L ('OK removed to Recycle Bin: ' + $raiz)
      $n = 0
      foreach ($f in @($rastros.lnks)) {
        if (-not $f) { continue }
        try { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($f, 'OnlyErrorDialogs', 'SendToRecycleBin', 'ThrowException'); $n++; L ('trace removed: ' + $f) } catch { L ('ERROR trace ' + $f + ': ' + $_.Exception.Message) }
      }
      foreach ($v in @($rastros.runs)) {
        if (-not $v) { continue }
        try { Remove-ItemProperty -LiteralPath $v.chave -Name $v.nome -ErrorAction Stop; $n++; L ('trace removed: ' + $v.chave + ' ' + $v.nome) } catch { L ('ERROR trace ' + $v.nome + ': ' + $_.Exception.Message) }
      }
      L ('traces removed: ' + $n)
    }
  }
}
Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
`;
}

async function executarRemocao(opts) {
  opts = opts || {};
  const raiz = C.raiz();
  const erros = [];
  if (typeof opts.pararTudo !== 'function') throw new Error('pararTudo is required');
  await opts.pararTudo();

  let salvo = null;
  if (opts.salvarPerfilEm) salvo = salvarPerfil(opts.salvarPerfilEm);   // throws: whole removal aborted, nothing deleted yet

  // Traces: found now (state may have changed since the plan was shown) but removed by the script only after the delete worked.
  let rastros = [];
  try { rastros = achar(opts); } catch (e) { erros.push('scan: ' + e.message); }
  const aRemover = {
    lnks: rastros.filter((x) => x.tipo === 'atalho').map((x) => x.caminho),
    runs: rastros.filter((x) => x.tipo === 'inicio').map((x) => ({ chave: x.chave, nome: x.nome })),
  };

  // The only write outside the root: the root is the thing being removed, so the script and its log live elsewhere.
  const pasta = opts.pastaScript || os.tmpdir();
  fs.mkdirSync(pasta, { recursive: true });
  const d = new Date(), z = (n, w = 2) => String(n).padStart(w, '0');
  const carimbo = `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}-${z(d.getMilliseconds(), 3)}`;
  const script = path.join(pasta, `fcc-remover-${carimbo}.ps1`);
  const log = path.join(pasta, `fcc-remover-${carimbo}.log`);
  fs.writeFileSync(script, '\ufeff' + textoScript(raiz, opts.pid || process.pid, log, aRemover, { testeLixeiraMB: process.env.FCC_TESTE_LIXEIRA_MB, testeFalharApagar: process.env.FCC_TESTE_FALHAR_APAGAR }), 'utf8');
  // Started through WMI (Win32_Process.Create): the new process is not a child of this one, so it survives this process exiting
  // even when the parent runs inside a job object that kills its descendants. Fallback: plain spawn.
  const linha = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + script + '"';
  let iniciou = false;
  try {
    const r = ps(`
$in = $env:FCC_ENTRADA | ConvertFrom-Json
$si = ([wmiclass]'Win32_ProcessStartup').CreateInstance(); $si.ShowWindow = 0
$r = ([wmiclass]'Win32_Process').Create($in.linha, $in.pasta, $si)
$saida = ConvertTo-Json -Compress -InputObject ([pscustomobject]@{ rc = [int]$r.ReturnValue })
`, { linha, pasta });
    iniciou = r.rc === 0;
    if (!iniciou) erros.push('wmi start returned ' + r.rc);
  } catch (e) { erros.push('wmi start: ' + e.message); }
  if (!iniciou) {
    const filho = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script], { stdio: 'ignore', windowsHide: true, cwd: pasta });
    filho.on('error', () => { });
    filho.unref();
  }
  return { script, log, rastrosAgendados: aRemover.lnks.length + aRemover.runs.length, erros, perfilSalvo: salvo };
}

module.exports = { planoRemocao, executarRemocao };
