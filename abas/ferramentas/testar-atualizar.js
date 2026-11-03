// Test of the updater: user folders are never touched, hostile packages are refused before any write, the watcher applies a pending build.
// Fixture root has spaces and accents; it lives under <repo>\testes and only that fixture is removed at the end.
// Usage: node ferramentas\testar-atualizar.js   (no real install, no FCC.exe opened)
'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const crypto = require('crypto');
const assert = require('assert');
const A = require('./atualizar');

const REPO = path.resolve(__dirname, '..', '..');
const R = path.join(REPO, 'testes', 'raiz atualização ção');
const sha = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const grava = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
function* arqs(d, b = d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* arqs(p, b); else yield path.relative(b, p); } }
const foto = (d) => { const m = {}; for (const r of arqs(d)) m[r] = sha(path.join(d, r)); return m; };

const PROT = ['perfil\\a.txt', 'conta\\config\\.credentials.json', 'projects\\p\\f.txt', 'ferramentas\\t.txt', 'temp\\keep.txt', 'inventario\\i.json'];
function preparaRaiz() {
  fs.rmSync(R, { recursive: true, force: true });
  grava(path.join(R, 'FCC.exe'), 'exe-velho');
  grava(path.join(R, 'resources', 'app', 'main.js'), 'main-velho');
  grava(path.join(R, 'resources', 'app', 'old.js'), 'obsoleto');
  PROT.forEach((p, i) => grava(path.join(R, p), 'conteudo protegido ' + i + ' ç'));
}
function pacote(dir, extra = {}) {
  grava(path.join(dir, 'FCC.exe'), 'exe-novo');
  grava(path.join(dir, 'resources', 'app', 'main.js'), 'main-novo');
  grava(path.join(dir, 'x.dll'), 'dll');
  for (const [k, v] of Object.entries(extra)) grava(path.join(dir, k), v);
}
const lerR = (rel) => fs.readFileSync(path.join(R, rel), 'utf8');
const protegidos = () => PROT.map(p => path.join(R, p));

try {
  // 1. normal apply
  preparaRaiz();
  const pk = path.join(R, '..', 'pacote-atualizar-teste'); fs.rmSync(pk, { recursive: true, force: true }); pacote(pk);
  const antes = Object.fromEntries(protegidos().map(f => [f, sha(f)]));
  const r = A.aplicar(pk, R);
  assert.strictEqual(lerR('FCC.exe'), 'exe-novo'); assert.strictEqual(lerR('resources\\app\\main.js'), 'main-novo'); assert.strictEqual(lerR('x.dll'), 'dll');
  assert(!fs.existsSync(path.join(R, 'resources', 'app', 'old.js')), 'old.js should be removed');
  for (const f of protegidos()) assert.strictEqual(sha(f), antes[f], 'protected file changed: ' + f);
  assert.strictEqual(r.removidos, 1);
  const r2 = A.aplicar(pk, R); assert.strictEqual(r2.novos, 0, 'second apply should copy nothing');
  console.log('ok aplicar: package applied, old.js removed, 6 protected files identical');

  // 2. hostile packages: refused, nothing written
  for (const evil of ['perfil\\evil.txt', 'PERFIL\\evil.txt', 'Conta\\config\\x', 'projects\\p\\evil', 'ferramentas\\evil', 'temp\\evil', 'inventario\\evil']) {
    preparaRaiz();
    const mal = path.join(R, '..', 'pacote-malicioso-teste'); fs.rmSync(mal, { recursive: true, force: true }); pacote(mal, { [evil]: 'evil' });
    const f0 = foto(R);
    assert.throws(() => A.aplicar(mal, R), /recusado/, 'should refuse ' + evil);
    assert.deepStrictEqual(foto(R), f0, 'nothing may be written when refusing ' + evil);
    assert.strictEqual(lerR('FCC.exe'), 'exe-velho'); assert(fs.existsSync(path.join(R, 'resources', 'app', 'old.js')));
    fs.rmSync(mal, { recursive: true, force: true });
  }
  console.log('ok recusa: 7 hostile packages refused, root byte-identical');

  // 3. watcher script
  preparaRaiz();
  const { PEND, TRAVA, LOG } = A.caminhosAtualizacao(R);
  assert.strictEqual(PEND, path.join(R, 'temp', 'atualizacao', 'pendente'));
  pacote(PEND);
  const a3 = Object.fromEntries(protegidos().map(f => [f, sha(f)]));
  const t0 = Date.now();
  const env = { ...process.env, FCC_RAIZ: R, FCC_TESTE_NAO_ABRIR: '1' };
  const c = cp.spawnSync(process.execPath, [path.join(__dirname, 'atualizar.js')], { env, encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(c.status, 0, 'watcher exit: ' + c.status + ' ' + c.stderr);
  assert.strictEqual(lerR('FCC.exe'), 'exe-novo'); assert.strictEqual(lerR('x.dll'), 'dll');
  assert(!fs.existsSync(path.join(R, 'resources', 'app', 'old.js')));
  assert(!fs.existsSync(PEND), 'pendente should be gone'); assert(!fs.existsSync(TRAVA), 'lock should be gone');
  assert(fs.existsSync(LOG) && /applied/.test(fs.readFileSync(LOG, 'utf8')), 'log missing');
  for (const f of protegidos()) if (!/keep\.txt$/.test(f)) assert.strictEqual(sha(f), a3[f], 'protected changed by watcher: ' + f);
  assert.strictEqual(lerR('temp\\keep.txt'), 'conteudo protegido 4 ç');
  console.log('ok vigia: applied, pendente and lock gone, log written (' + (Date.now() - t0) + ' ms)');

  // 4. watcher with hostile pending build: refused, kept aside, program not touched
  preparaRaiz(); pacote(PEND, { 'perfil\\evil.txt': 'evil' });
  const c2 = cp.spawnSync(process.execPath, [path.join(__dirname, 'atualizar.js')], { env, encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(c2.status, 0);
  assert.strictEqual(lerR('FCC.exe'), 'exe-velho'); assert(!fs.existsSync(path.join(R, 'perfil', 'evil.txt')));
  assert(fs.existsSync(PEND + '-falhou') && !fs.existsSync(TRAVA) && /FAILED/.test(fs.readFileSync(LOG, 'utf8')));
  console.log('ok vigia hostil: refused, build kept in pendente-falhou');

  // 5. no FCC_RAIZ: exits with message, writes nothing
  const env0 = { ...process.env, FCC_TESTE_NAO_ABRIR: '1' }; delete env0.FCC_RAIZ;
  const c3 = cp.spawnSync(process.execPath, [path.join(__dirname, 'atualizar.js')], { env: env0, encoding: 'utf8', timeout: 30000 });
  assert.strictEqual(c3.status, 2); assert(/FCC_RAIZ/.test(c3.stderr));
  console.log('ok sem FCC_RAIZ: exit 2');

  // 6. rodando(): fixture exe is not running
  assert.strictEqual(A.rodando(R), false);
  console.log('ok rodando: false for fixture root');
  console.log('ok testar-atualizar');
} finally {
  for (const d of [R, path.join(R, '..', 'pacote-atualizar-teste'), path.join(R, '..', 'pacote-malicioso-teste')]) fs.rmSync(d, { recursive: true, force: true });
}
