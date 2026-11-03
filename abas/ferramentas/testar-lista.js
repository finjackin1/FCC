'use strict';
// "Para testar" list, machine checks (02/11): replaces PRA-TESTAR items CI (checked item becomes [x]) and DC (list keeps scroll when checking).
// Uso: node ferramentas\testar-lista.js   (relaunches itself in Electron; window offscreen, files in os.tmpdir())
const path = require('path'), fs = require('fs'), os = require('os'), assert = require('assert');
const ABAS = path.join(__dirname, '..');
if (!process.versions.electron) {
  const r = require('child_process').spawnSync(require(path.join(ABAS, 'node_modules', 'electron')), [__filename], { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 120000 });
  process.exit(r.status === null ? 1 : r.status);
}
const { app, BrowserWindow } = require('electron'), url = require('url');
let falhas = 0;
const ok = (nome, f) => Promise.resolve().then(f).then(() => console.log('ok    ' + nome), (e) => { falhas++; console.log('FALHOU ' + nome + ': ' + e.message); });

// ---- 1. [x] in PRA-TESTAR.md (pra-testar.js, used by main.js 'testes-feitos') ----
async function arquivo() {
  const { marcar } = require(path.join(ABAS, 'pra-testar.js'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-lista-')), arq = path.join(dir, 'PRA-TESTAR.md');
  const escreve = (t) => fs.writeFileSync(arq, t, 'utf8'), le = () => fs.readFileSync(arq, 'utf8');
  try {
    await ok('1 item marcado vira [x], os outros ficam', () => {
      escreve('# Testes\r\n- [ ] AA. abrir a lista\r\n- [ ] AB. marcar um item\r\n');
      assert.deepStrictEqual(marcar(arq, ['AA. abrir a lista']), { ok: true, n: 1 });
      assert.strictEqual(le(), '# Testes\r\n- [x] AA. abrir a lista\r\n- [ ] AB. marcar um item\r\n');
    });
    await ok('2 linha sem caixa, com * e numerada; BOM e \\n mantidos', () => {
      escreve('﻿* item um\n1. item dois\n- item três\n');
      assert.strictEqual(marcar(arq, ['item um', 'item dois', 'item três']).n, 3);
      assert.strictEqual(le(), '﻿* [x] item um\n1. [x] item dois\n- [x] item três\n');
    });
    await ok('3 já [x] não muda; texto parecido não marca', () => {
      const t = '- [x] feito\n- [ ] feito demais\n'; escreve(t);
      assert.strictEqual(marcar(arq, ['feito', 'feito d']).n, 0); assert.strictEqual(le(), t);
    });
    await ok('4 arquivo que não existe', () => assert.deepStrictEqual(marcar(path.join(dir, 'nao.md'), ['x']), { ok: false }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// ---- 2. list keeps scroll when checking (same painel.js the program uses, through the prototype) ----
async function tela() {
  const html = path.join(ABAS, '..', 'docs', 'prototipos', 'v2', 'ESCOLHIDA', 'proposta.html');
  const w = new BrowserWindow({ width: 1440, height: 810, show: false, x: -4000, y: 100, frame: false, skipTaskbar: true, webPreferences: { backgroundThrottling: false } });
  const js = (c) => w.webContents.executeJavaScript(c), espera = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    await w.loadURL(url.pathToFileURL(html).href + '#cena=tl-aberta'); await espera(1500);
    const ini = JSON.parse(await js(`(() => { const q = M.P.find(x => x.n === 'FCC'); q.itens = Array.from({ length: 30 }, (_, i) => 'Item de teste número ' + (i + 1)); M.S.tst.FCC = []; M.draw();
      const l = document.querySelector('.tl-lista'); l.scrollTop = l.scrollHeight; return JSON.stringify({ st: l.scrollTop, max: l.scrollHeight - l.clientHeight }); })()`));
    await ok('5 lista tem rolagem e foi até embaixo', () => { assert.ok(ini.max > 200, 'lista não rola: ' + ini.max); assert.ok(ini.st > 200, 'não rolou: ' + ini.st); });
    await espera(300);
    await js(`(() => { const its = [...document.querySelectorAll('.tl-lista label.tl-it:not(.feito)')]; its[its.length - 2].click(); })()`);
    await espera(1200);
    const fim = JSON.parse(await js(`(() => { const l = document.querySelector('.tl-lista'); return JSON.stringify({ st: l.scrollTop, feitos: (M.S.tst.FCC || []).length, sep: !!l.querySelector('.tl-sep') }); })()`));
    await ok('6 marcar um item: ele vai para Testados', () => { assert.strictEqual(fim.feitos, 1); assert.ok(fim.sep, 'sem divisória Testados'); });
    await ok('7 marcar um item: a lista fica onde estava (não volta ao topo)', () => assert.ok(Math.abs(fim.st - ini.st) < 80, `antes ${ini.st}, depois ${fim.st}`));
  } finally { w.destroy(); }
}

app.on('window-all-closed', () => { });
app.whenReady().then(async () => {
  try { await arquivo(); await tela(); } catch (e) { falhas++; console.log('FALHOU geral: ' + e.message); }
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo'); app.exit(falhas ? 1 : 0);
});
