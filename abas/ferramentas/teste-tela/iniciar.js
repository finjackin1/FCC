// harness: copies abas to ./app (patched fake login), builds fixture root, launches electron with CDP on 9333
const fs = require('fs'), path = require('path'), cp = require('child_process');
const SRC = path.resolve(__dirname, '../..'), D = path.resolve(SRC, '../dist/FCC/temp/teste'), APP = path.join(D, 'app'), RAIZ = path.join(D, 'raiz'); fs.mkdirSync(D, { recursive: true });
const w = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
// kill old
try { cp.execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='electron.exe'\\" | Where-Object { $_.CommandLine -like '*temp\\teste*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`); } catch { }
fs.rmSync(APP, { recursive: true, force: true }) ;
const copia = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { if (e.name === 'node_modules') continue; const x = path.join(a, e.name), y = path.join(b, e.name); e.isDirectory() ? copia(x, y) : fs.copyFileSync(x, y); } };
copia(SRC, APP);
cp.execSync(`cmd /c mklink /J "${path.join(APP, 'node_modules')}" "${path.join(SRC, 'node_modules')}"`, { stdio: 'ignore' });
let m = fs.readFileSync(path.join(APP, 'main.js'), 'utf8');
m = m.replace('function contaStatus() {', 'function contaStatus() {\n  if (global.FAKE_LOGIN !== false) return Promise.resolve({ estado: "ok", email: "um@exemplo.com", plano: "max" });');
fs.writeFileSync(path.join(APP, 'main.js'), m);
fs.rmSync(RAIZ, { recursive: true, force: true });
for (const p of ['Alfa', 'Beta']) { w(path.join(RAIZ, 'projects', p, 'CLAUDE.md'), '# ' + p); w(path.join(RAIZ, 'projects', p, 'docs', 'PARADA.md'), '# parada'); }
w(path.join(RAIZ, 'perfil', 'regras', 'CLAUDE-global.md'), '# regras');
w(path.join(RAIZ, 'perfil', 'claude', 'skills', 'minha-skill', 'SKILL.md'), '---\nname: minha-skill\ndescription: Skill de teste\n---\nx');
w(path.join(RAIZ, 'perfil', 'dados', 'x.txt'), 'x');
fs.mkdirSync(path.join(RAIZ, 'conta', 'config'), { recursive: true });
const elec = path.join(SRC, 'node_modules', 'electron', 'dist', 'electron.exe');
const f = fs.openSync(path.join(D, 'electron.log'), 'w');
const ch = cp.spawn(elec, [APP, '--remote-debugging-port=9333', '--roteiro', 'espera:99999999'], { detached: true, stdio: ['ignore', f, f], env: (() => { const e = { ...process.env, FCC_RAIZ: RAIZ, FCC_TESTE_API: '1' }; delete e.ELECTRON_RUN_AS_NODE; return e; })() });
ch.unref(); console.log('pid', ch.pid);
