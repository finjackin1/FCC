'use strict';
// Pure mode: FCC started on a fresh, empty root (name with spaces and "ç") must carry nothing personal and touch nothing in the user's home.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const assert = require('assert');

const ABAS = path.resolve(__dirname, '..');
const ELECTRON = path.join(ABAS, 'node_modules', 'electron', 'dist', 'electron.exe');
const home = process.env.USERPROFILE || os.homedir();
const ALVOS = [
  { nome: '.claude', dir: path.join(home, '.claude') },
  { nome: '.claude.json', dir: path.join(home, '.claude.json'), arquivo: true },
  { nome: 'APPDATA', dir: process.env.APPDATA },
  { nome: 'LOCALAPPDATA', dir: process.env.LOCALAPPDATA },
];
const FCC_ANTIGO_ABERTO = (() => { try { return /FCC\.exe/i.test(cp.execFileSync('tasklist', ['/FI', 'IMAGENAME eq FCC.exe', '/NH'], { encoding: 'utf8', windowsHide: true })); } catch { return false; } })();
// Electron's own (crashpad), plus the old FCC's account folder while the user's old FCC.exe is open (it rewrites it on its own; this test runs electron.exe, never FCC.exe)
// 04/11: Claude Code sessions already running before the test (this dev chat, old FCC) rewrite ~\.claude.json and .claude\backups every few seconds
const CLAUDE_ABERTO = (() => { try { return /claude\.exe/i.test(cp.execFileSync('tasklist', ['/FI', 'IMAGENAME eq claude.exe', '/NH'], { encoding: 'utf8', windowsHide: true })); } catch { return false; } })();
const MUDOU_SOZINHO_OK = new RegExp(['crashpad', FCC_ANTIGO_ABERTO && '^\\.claude\\\\fcc-contas', CLAUDE_ABERTO && '^\\.claude\\.json$', CLAUDE_ABERTO && '^\\.claude\\\\backups$'].filter(Boolean).join('|'), 'i');
if (CLAUDE_ABERTO) console.log('aviso: há Claude Code aberto fora do teste; .claude.json e .claude\\backups não contam');

function foto() {
  const f = new Map();
  for (const a of ALVOS) {
    if (!a.dir) continue;
    if (a.arquivo) { try { f.set(a.nome, fs.statSync(a.dir).mtimeMs); } catch { } continue; }
    let nomes = []; try { nomes = fs.readdirSync(a.dir); } catch { continue; }
    for (const n of nomes) {
      const p = path.join(a.dir, n);
      // top level names for APPDATA/LOCALAPPDATA; names + mtimes for .claude
      let m = 0; if (a.nome === '.claude') { try { m = fs.statSync(p).mtimeMs; } catch { } }
      f.set(a.nome + '\\' + n, m);
    }
  }
  return f;
}
function diferencas(a, b) {
  const d = new Set();
  for (const [k, v] of b) if (!a.has(k) || a.get(k) !== v) d.add(k);
  for (const k of a.keys()) if (!b.has(k)) d.add(k);
  return d;
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function limpar(base) {
  // unlink junctions/symlinks first: rm -r in Electron's Node follows them
  const varrer = (d, prof) => {
    let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const f = path.join(d, e.name);
      try { if (fs.lstatSync(f).isSymbolicLink()) { fs.unlinkSync(f); continue; } } catch { }
      if (e.isDirectory() && prof < 6) varrer(f, prof + 1);
    }
  };
  varrer(base, 0);
  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { console.log('aviso: não limpou ' + base + ': ' + e.message); }
}

async function principal() {
  assert.ok(fs.existsSync(ELECTRON), 'electron.exe não achado: ' + ELECTRON);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-puro-'));
  const raiz = path.join(base, 'Pasta com espaço e ação ç');
  fs.mkdirSync(raiz);
  try {
    const A = foto(); await espera(2000); const B = foto();
    const ruido = diferencas(A, B);   // changes with no FCC running: not ours

    const saida = path.join(raiz, 'cenas-teste');
    fs.mkdirSync(saida, { recursive: true });
    const env = { ...process.env, FCC_RAIZ: raiz };
    delete env.ELECTRON_RUN_AS_NODE;
    const filho = cp.spawn(ELECTRON, [path.join(ABAS, 'main.js'), '--autoteste', saida], { cwd: ABAS, env, stdio: 'ignore', windowsHide: true });
    const fim = await new Promise((ok) => {
      let feito = false;
      const fechar = (v) => { if (!feito) { feito = true; ok(v); } };
      filho.on('exit', (c) => fechar({ codigo: c }));
      filho.on('error', (e) => fechar({ erro: e.message }));
      setTimeout(() => { try { cp.execFileSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { } fechar({ tempo: true }); }, 90000);
    });
    assert.ok(!fim.erro, 'não abriu o Electron: ' + fim.erro);
    assert.ok(!fim.tempo, 'FCC não terminou em 90 s (matei a árvore)');
    await espera(500);

    const D = foto();
    const novos = [...diferencas(B, D)].filter((k) => !ruido.has(k));
    const ignorados = [...ruido, ...novos.filter((k) => MUDOU_SOZINHO_OK.test(k))];
    const reais = novos.filter((k) => !MUDOU_SOZINHO_OK.test(k));
    console.log('ignorados (mudam sem o FCC ou são do Electron): ' + (ignorados.length ? ignorados.join(', ') : '(nenhum)'));
    assert.deepStrictEqual(reais, [], 'o FCC mexeu fora da pasta dele: ' + reais.join(', '));

    const C = (() => { process.env.FCC_RAIZ = raiz; return require('../caminhos'); })();
    const skills = path.join(C.perfilClaude(), 'skills');
    const temSkills = fs.existsSync(skills) && fs.readdirSync(skills).length > 0;
    assert.ok(!temSkills, 'perfil\\claude tem skills em modo puro');
    const regras = C.regras();
    assert.ok(!fs.existsSync(regras) || fs.readdirSync(regras).length === 0, 'perfil\\regras não está vazio');
    assert.ok(fs.existsSync(path.join(C.configClaude(), 'CLAUDE.md')), 'conta\\config\\CLAUDE.md não existe');
    console.log('ok');
  } finally { limpar(base); }
}
principal().catch((e) => { console.error('FALHOU: ' + (e && e.message || e)); process.exit(1); });
