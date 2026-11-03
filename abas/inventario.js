// What FCC installed or created: system snapshots (read only), diff, registry in inventario\sistema.json, folders inside FCC.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const caminhos = require('./caminhos');

const CATEGORIAS = ['programas', 'path', 'inicio', 'servicos', 'atalhos', 'pastas'];

const PS = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Nomes($p) { if ($p -and (Test-Path -LiteralPath $p)) { @(Get-ChildItem -LiteralPath $p -Force -Directory | ForEach-Object { $_.Name }) } else { @() } }
$progs = @()
foreach ($k in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*') {
  foreach ($i in (Get-ItemProperty -Path $k)) {
    if ($i.SystemComponent -eq 1) { continue }
    if ([string]::IsNullOrWhiteSpace($i.DisplayName)) { continue }
    $progs += [pscustomobject]@{ nome = [string]$i.DisplayName; versao = [string]$i.DisplayVersion; desinstalar = [string]$i.UninstallString; data = [string]$i.InstallDate }
  }
}
$path = @(); $up = [Environment]::GetEnvironmentVariable('Path','User')
if ($up) { $path = @($up -split ';' | Where-Object { $_ }) }
$inicio = @()
foreach ($k in 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run','HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run') {
  $o = Get-ItemProperty -Path $k
  if ($o) { $inicio += @($o.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { $_.Name }) }
}
$serv = @(Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services' | ForEach-Object { $_.PSChildName })
$atalhos = @()
foreach ($d in (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'), (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs')) {
  if (Test-Path -LiteralPath $d) { $atalhos += @(Get-ChildItem -LiteralPath $d -Recurse -Force -Filter *.lnk | ForEach-Object { $_.Name }) }
}
$pastas = @()
$raizes = [ordered]@{ APPDATA = $env:APPDATA; LOCALAPPDATA = $env:LOCALAPPDATA; PROGRAMS = (Join-Path $env:LOCALAPPDATA 'Programs'); PROGRAMFILES = $env:ProgramFiles; PROGRAMFILESX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'); LOCALBIN = (Join-Path $env:USERPROFILE '.local\bin') }
foreach ($r in $raizes.Keys) { foreach ($n in (Nomes $raizes[$r])) { $pastas += ($r + '\' + $n) } }
[pscustomobject]@{ programas = @($progs); path = @($path); inicio = @($inicio); servicos = @($serv); atalhos = @($atalhos); pastas = @($pastas) } | ConvertTo-Json -Depth 4 -Compress
`;

function executarPs() {
  const cod = Buffer.from(PS, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', cod],
      { windowsHide: true, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8', timeout: 120000 },
      (err, out) => (err ? reject(err) : resolve(out)));
  });
}

function normalizar(o) {
  const r = {};
  for (const c of CATEGORIAS) r[c] = Array.isArray(o && o[c]) ? o[c] : (o && o[c] != null ? [o[c]] : []);
  return r;
}

async function foto(opc) {
  const exec = (opc && opc.executar) || executarPs;
  const txt = String(await exec()).replace(/^﻿/, '').trim();
  return normalizar(JSON.parse(txt));
}

const chave = (c, x) => (c === 'programas' ? String(x && x.nome) : String(x)).toLowerCase();

function diferenca(a, b) {
  const A = normalizar(a), B = normalizar(b), r = {};
  for (const c of CATEGORIAS) {
    const tinha = new Set(A[c].map((x) => chave(c, x)));
    r[c] = B[c].filter((x) => !tinha.has(chave(c, x)));
  }
  return r;
}

const arquivo = () => caminhos.inventario('sistema.json');

function ler() {
  try {
    const v = JSON.parse(fs.readFileSync(arquivo(), 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function gravar(itens) {
  fs.mkdirSync(caminhos.inventario(), { recursive: true });
  const tmp = arquivo() + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(itens, null, 2), 'utf8');
  fs.renameSync(tmp, arquivo());
}

function registrar(dif, opc) {
  const conversa = (opc && opc.conversa) || null;
  const itens = ler();
  const ids = new Set(itens.map((i) => i.id));
  const data = new Date().toISOString();
  let novos = 0;
  for (const c of CATEGORIAS) {
    for (const x of (dif && dif[c]) || []) {
      const nome = c === 'programas' ? String(x.nome) : String(x);
      const id = c + ':' + nome.toLowerCase();
      if (ids.has(id)) continue;
      ids.add(id);
      itens.push({ id, tipo: c, nome, data, conversa, desinstalar: c === 'programas' ? (x.desinstalar || null) : null, origem: 'Detectado' });
      novos++;
    }
  }
  if (novos || !fs.existsSync(arquivo())) gravar(itens);
  return novos;
}

const listarSistema = () => ler().filter((i) => !i.ignorado);

function ignorar(id) {
  const itens = ler();
  const it = itens.find((i) => i.id === id);
  if (!it) return false;
  it.ignorado = true;
  gravar(itens);
  return true;
}

function tamanho(p) {
  let st;
  try { st = fs.lstatSync(p); } catch { return 0; }
  if (!st.isDirectory()) return st.size;
  if (st.isSymbolicLink()) return 0;
  let t = 0;
  let nomes = [];
  try { nomes = fs.readdirSync(p); } catch { return 0; }
  for (const n of nomes) t += tamanho(path.join(p, n));
  return t;
}

const DICIONARIO = {
  claude: ['Claude Code, o assistente que o FCC usa', true],
  node: ['Node.js, roda programas JavaScript e o npm', false],
  dotnet: ['.NET, necessário para programas feitos em C#', false],
  ollama: ['Ollama, roda modelos de IA no próprio computador', false],
  python: ['Python, linguagem e pip', false],
  git: ['Git, controle de versões', false],
};

// Folders inside ferramentas\ with what they are for. tamFn (optional, may be async) gives the size: lets callers measure without blocking.
function dentroBase() {
  let nomes = [];
  try { nomes = fs.readdirSync(caminhos.ferramentas(), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; }
  return nomes.map((nome) => { const d = DICIONARIO[nome.toLowerCase()]; return { nome, paraQue: d ? d[0] : '', essencial: !!(d && d[1]) }; });
}

function listarDentro() {
  return dentroBase().map((x) => ({ ...x, tamanho: tamanho(caminhos.ferramentas(x.nome)) }));
}

async function listarDentroAsync(tamFn) {
  const base = dentroBase(), saida = [];
  for (const x of base) saida.push({ ...x, tamanho: await tamFn(caminhos.ferramentas(x.nome)) });
  return saida;
}

function envInstaladores() {
  const f = caminhos.ferramentas, t = caminhos.temp;
  const env = {
    npm_config_prefix: f('npm'),
    npm_config_cache: t('npm-cache'),
    PIP_CACHE_DIR: t('pip-cache'),
    PYTHONUSERBASE: f('python-user'),
    NUGET_PACKAGES: f('nuget'),
    DOTNET_CLI_HOME: f('dotnet-home'),
    OLLAMA_MODELS: f('ollama', 'models'),
    TEMP: t(),
    TMP: t(),
  };
  for (const v of Object.values(env)) fs.mkdirSync(v, { recursive: true });
  return env;
}

function vigiar(idConversa) {
  const linhas = [];
  const log = (m) => linhas.push(String(m));
  log.linhas = linhas;
  const antes = foto().catch((e) => { log('foto antes falhou: ' + (e && e.message)); return null; });
  return {
    log,
    fim: async () => {
      try {
        const a = await antes;
        if (!a) return null;
        const b = await foto();
        const dif = diferenca(a, b);
        registrar(dif, { conversa: idConversa });
        return dif;
      } catch (e) { log('vigiar falhou: ' + (e && e.message)); return null; }
    },
  };
}

module.exports = { foto, diferenca, registrar, listarSistema, ignorar, listarDentro, listarDentroAsync, dentroBase, envInstaladores, vigiar };
