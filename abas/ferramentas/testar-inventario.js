'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc inv '));
process.env.FCC_RAIZ = raiz;
const caminhos = require('../caminhos');
const inv = require('../inventario');

(async () => {
  try {
    const vazio = JSON.stringify({ programas: [], path: [], inicio: [], servicos: [], atalhos: [], pastas: [] });
    const com = JSON.stringify({ programas: [{ nome: 'Fake Prog', versao: '1', desinstalar: 'x.exe', data: '20261102' }], path: ['C:\\fake'], inicio: [], servicos: [], atalhos: [], pastas: [] });
    const a = await inv.foto({ executar: async () => vazio });
    const b = await inv.foto({ executar: async () => '\ufeff' + com });
    const dif = inv.diferenca(a, b);
    assert.strictEqual(dif.programas.length, 1);
    assert.deepStrictEqual(dif.path, ['C:\\fake']);
    assert.strictEqual(inv.diferenca(b, a).programas.length, 0, 'removed ignored');

    inv.registrar(dif, { conversa: 'c1' });
    let l = inv.listarSistema();
    const p = l.find((i) => i.nome === 'Fake Prog');
    assert.ok(p && p.conversa === 'c1' && p.origem === 'Detectado' && p.desinstalar === 'x.exe');
    const n = l.length;
    inv.registrar(dif, { conversa: 'c2' });
    assert.strictEqual(inv.listarSistema().length, n, 'no duplicate');
    assert.ok(inv.ignorar(p.id));
    assert.ok(!inv.listarSistema().some((i) => i.id === p.id));
    inv.registrar(dif, { conversa: 'c3' });
    assert.ok(!inv.listarSistema().some((i) => i.id === p.id), 'ignored does not return');

    fs.mkdirSync(caminhos.ferramentas('claude', 'sub'), { recursive: true });
    fs.writeFileSync(caminhos.ferramentas('claude', 'sub', 'a.txt'), '12345');
    fs.mkdirSync(caminhos.ferramentas('outra'), { recursive: true });
    const d = inv.listarDentro();
    const cl = d.find((x) => x.nome === 'claude');
    assert.ok(cl && cl.tamanho === 5 && cl.essencial === true && cl.paraQue);
    assert.strictEqual(d.find((x) => x.nome === 'outra').essencial, false);

    const env = inv.envInstaladores();
    assert.strictEqual(Object.keys(env).length, 9);
    for (const v of Object.values(env)) {
      assert.ok(path.resolve(v).startsWith(raiz + path.sep), v);
      assert.ok(fs.existsSync(v));
    }

    const v = inv.vigiar('c9');
    assert.ok(typeof v.fim === 'function');
    await v.fim();

    const t0 = Date.now();
    const real = await inv.foto();
    const ms = Date.now() - t0;
    assert.ok(real.programas.length > 0, 'programas vazio');
    assert.ok(ms < 5000, 'lento: ' + ms);
    console.log('foto real: ' + ms + ' ms, programas=' + real.programas.length + ', servicos=' + real.servicos.length + ', atalhos=' + real.atalhos.length + ', pastas=' + real.pastas.length);
    console.log('ok');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
