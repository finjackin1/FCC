// Test of auto-update from GitHub (atualizacao.js) with a FAKE releases JSON and local zips (file://): nothing published, no network.
// Checks: version compare, up to date, download+sha256+size check, extract (top folder or flat), refuse user folders / zip without
// FCC.exe, already-pending, missing JSON. Fixture under <repo>\testes\atualizacao teste ção (removed at the end).
// Usage: node ferramentas\testar-atualizacao.js
'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const crypto = require('crypto');
const assert = require('assert');
const { pathToFileURL } = require('url');
const U = require('../atualizacao');

const REPO = path.resolve(__dirname, '..', '..');
const F = path.join(REPO, 'testes', 'atualizacao teste ção');
const TAR = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
const grava = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let ok = 0; const caso = async (n, fn) => { await fn(); ok++; console.log('ok  ' + n); };

// zip of a fake build; top = folder name inside zip ('' = flat); extra = more files {rel: text}
function zipar(nome, top, extra = {}, semExe = false) {
  const src = path.join(F, 'src-' + nome); fs.rmSync(src, { recursive: true, force: true });
  const base = top ? path.join(src, top) : src;
  if (!semExe) grava(path.join(base, 'FCC.exe'), 'exe-novo ' + nome);
  grava(path.join(base, 'resources', 'app', 'main.js'), 'main-novo');
  for (const [r, t] of Object.entries(extra)) grava(path.join(base, r), t);
  const z = path.join(F, 'pub', nome); fs.mkdirSync(path.dirname(z), { recursive: true }); fs.rmSync(z, { force: true });
  cp.execFileSync(TAR, ['-a', '-cf', z, '-C', src, '.'], { stdio: 'ignore' });
  return z;
}
// fake GitHub answer; mexe(asset) lets a case break size/digest
function api(tag, zip, mexe = (a) => a) {
  const a = zip ? mexe({ name: path.basename(zip), size: fs.statSync(zip).size, digest: 'sha256:' + sha256(zip), browser_download_url: pathToFileURL(zip).href }) : null;
  const j = path.join(F, 'api-' + tag + '-' + Math.random().toString(36).slice(2) + '.json');
  grava(j, JSON.stringify({ tag_name: tag, assets: a ? [{ name: 'outra-coisa.txt', size: 1 }, a] : [] }));
  return j;
}
const pasta = () => { const p = path.join(F, 'temp', 'atualizacao'); fs.rmSync(p, { recursive: true, force: true }); fs.mkdirSync(p, { recursive: true }); return p; };
const sobras = (p) => fs.readdirSync(p).filter(x => /\.parcial$|^extraido$|\.zip$/i.test(x));

(async () => {
  fs.rmSync(F, { recursive: true, force: true });
  await caso('maisNova', () => {
    assert(U.maisNova('1.0.1', '1.0.0')); assert(U.maisNova('v1.2.10', '1.2.9')); assert(U.maisNova('2', '1.9.9'));
    assert(!U.maisNova('1.0.0', '1.0.0')); assert(!U.maisNova('0.9', '1.0.0')); assert(!U.maisNova('', '1.0.0'));
  });
  await caso('em dia: tag igual não baixa nada', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.0.0', zipar('FCC-1.0.0.zip', 'FCC')) });
    assert.strictEqual(r.estado, 'em-dia'); assert(!fs.existsSync(path.join(p, 'pendente'))); assert.deepStrictEqual(sobras(p), []);
  });
  await caso('versão nova (zip com pasta FCC): baixa, confere, vira pendente', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.2.0', zipar('FCC-1.2.0.zip', 'FCC')) });
    assert.strictEqual(r.estado, 'pronta', JSON.stringify(r)); assert.strictEqual(r.versao, '1.2.0');
    assert.strictEqual(fs.readFileSync(path.join(p, 'pendente', 'FCC.exe'), 'utf8'), 'exe-novo FCC-1.2.0.zip');
    assert(fs.existsSync(path.join(p, 'pendente', 'resources', 'app', 'main.js')));
    assert.strictEqual(fs.readFileSync(path.join(p, 'versao-pendente.txt'), 'utf8'), '1.2.0'); assert.deepStrictEqual(sobras(p), []);
    const r2 = await U.procurar({ atual: '1.0.0', pasta: p, url: path.join(F, 'nao-existe.json') });
    assert.strictEqual(r2.estado, 'ja-pronta'); assert.strictEqual(r2.versao, '1.2.0');
  });
  await caso('zip sem pasta (FCC.exe na raiz do zip)', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.3.0', zipar('FCC-1.3.0.zip', '')) });
    assert.strictEqual(r.estado, 'pronta', JSON.stringify(r)); assert(fs.existsSync(path.join(p, 'pendente', 'FCC.exe')));
  });
  await caso('sha256 diferente: apaga, nada pendente', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.4.0', zipar('FCC-1.4.0.zip', 'FCC'), a => ({ ...a, digest: 'sha256:' + '0'.repeat(64) })) });
    assert.strictEqual(r.estado, 'erro'); assert(/diferente do publicado/.test(r.erro)); assert(!fs.existsSync(path.join(p, 'pendente'))); assert.deepStrictEqual(sobras(p), []);
  });
  await caso('tamanho diferente: apaga', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.4.1', zipar('FCC-1.4.1.zip', 'FCC'), a => ({ ...a, size: a.size + 10 })) });
    assert.strictEqual(r.estado, 'erro'); assert(/incompleto/.test(r.erro)); assert.deepStrictEqual(sobras(p), []);
  });
  await caso('zip com pasta do usuário (perfil): recusado', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.5.0', zipar('FCC-1.5.0.zip', 'FCC', { 'perfil\\x.txt': 'mau' })) });
    assert.strictEqual(r.estado, 'erro'); assert(/pasta do usuário \(perfil\)/.test(r.erro), r.erro); assert(!fs.existsSync(path.join(p, 'pendente'))); assert(!fs.existsSync(path.join(p, 'extraido')));
  });
  await caso('zip sem FCC.exe: recusado', async () => {
    const p = pasta(); const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.6.0', zipar('FCC-1.6.0.zip', 'FCC', {}, true)) });
    assert.strictEqual(r.estado, 'erro'); assert(/não tem o FCC\.exe/.test(r.erro)); assert(!fs.existsSync(path.join(p, 'pendente')));
  });
  await caso('versão sem zip / sem resposta', async () => {
    const p = pasta();
    const r = await U.procurar({ atual: '1.0.0', pasta: p, url: api('v1.7.0', null) }); assert.strictEqual(r.estado, 'erro'); assert(/não tem o zip/.test(r.erro));
    const r2 = await U.procurar({ atual: '1.0.0', pasta: p, url: path.join(F, 'nao-existe.json') }); assert.strictEqual(r2.estado, 'erro'); assert(/sem resposta/.test(r2.erro));
  });
  await caso('variável FCC_TESTE_API troca o endereço', async () => {
    const p = pasta(); process.env.FCC_TESTE_API = api('v1.0.0', zipar('FCC-1.0.0.zip', 'FCC'));
    const r = await U.procurar({ atual: '1.0.0', pasta: p }); delete process.env.FCC_TESTE_API; assert.strictEqual(r.estado, 'em-dia');
  });
  fs.rmSync(F, { recursive: true, force: true });
  console.log(`atualizacao: ${ok} casos ok`);
})().catch(e => { console.error('FALHOU: ' + (e.stack || e)); process.exit(1); });
