const assert = require('assert'); const path = require('path');
const { resumo, mudaSistema } = require('../mudancas');
const D = path.resolve('C:/proj'); const P = (f) => path.join(D, f);
const ler = (f) => f === P('a.js') ? 'x\ny\nnovo1\nnovo2\nz\n' : '';
const sem = (e) => { const { t, abs, onde, tipo, ...o } = e; return o; };   // fields added for the screen: time, full path, folder, kind
let r = resumo([{ nome: 'Edit', input: { file_path: P('a.js'), old_string: 'velho', new_string: 'novo1\nnovo2' } }], D, ler);
assert.deepStrictEqual(sem(r[0]), { f: 'a.js', a: 2, r: 1, novo: false, h: [['@', 'linha 3'], ['-', 'velho'], ['+', 'novo1'], ['+', 'novo2']] });
assert.strictEqual(r[0].tipo, 'arq'); assert.strictEqual(r[0].abs, path.normalize(P('a.js'))); assert.strictEqual(r[0].onde, D);
r = resumo([{ nome: 'MultiEdit', input: { file_path: P('sub/b.js'), edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: 'd' }] } }], D, ler);
assert.strictEqual(r[0].f, 'sub\\b.js'); assert.strictEqual(r[0].a, 2); assert.strictEqual(r[0].r, 2); assert.strictEqual(r[0].h[0][1], 'trecho');
r = resumo([{ nome: 'Write', existia: false, input: { file_path: P('n.txt'), content: 'a\nb\n' } }], D, ler);
assert.deepStrictEqual(sem(r[0]), { f: 'n.txt', a: 2, r: 0, novo: true, h: [['@', 'arquivo novo'], ['+', 'a'], ['+', 'b']] });
r = resumo([{ nome: 'Write', existia: true, antes: 'o1\no2', input: { file_path: P('n.txt'), content: 'q' } }], D, ler);
assert.deepStrictEqual(r[0].h, [['@', 'arquivo reescrito'], ['-', 'o1'], ['-', 'o2'], ['+', 'q']]); assert.strictEqual(r[0].novo, false);
r = resumo([{ nome: 'Edit', input: { file_path: P('a.js'), old_string: 'p', new_string: 'q' } }, { nome: 'Write', existia: false, input: { file_path: P('o.txt'), content: 'u' } }, { nome: 'Edit', input: { file_path: P('a.js'), old_string: 'r', new_string: 's\nt' } }], D, ler);
assert.strictEqual(r.length, 2); const a = r.find(x => x.f === 'a.js'); assert.strictEqual(a.a, 3); assert.strictEqual(a.r, 2); assert.strictEqual(a.h.filter(x => x[0] === '@').length, 2);
r = resumo([{ nome: 'Write', existia: false, input: { file_path: 'D:\\outro\\x.txt', content: 'a' } }], D, ler);
assert.strictEqual(r[0].f, 'D:\\outro\\x.txt'); assert.strictEqual(r[0].onde, 'D:\\outro');
r = resumo([{ nome: 'Write', existia: false, input: { file_path: P('g.txt'), content: Array.from({ length: 1000 }, (_, i) => 'l' + i).join('\n') } }], D, ler);
assert.strictEqual(r[0].h.length, 601); assert.strictEqual(r[0].a, 1000); assert.deepStrictEqual(r[0].h[600], ['@', '… mais 401 linhas']);
// newest first, mixed with commands that change the PC
r = resumo([{ nome: 'Write', t: 100, existia: false, input: { file_path: P('v.txt'), content: 'a' } }, { nome: 'PowerShell', t: 200, dir: D, input: { command: 'Set-Content C:\\x\\y.txt "oi"' } }], D, ler);
assert.strictEqual(r.length, 2); assert.strictEqual(r[0].tipo, 'cmd'); assert.strictEqual(r[1].f, 'v.txt'); assert.ok(r[0].h.some(x => x[1] === 'C:\\x\\y.txt'));
// which commands count as a change
for (const c of ['npm install foo', 'echo oi > a.txt', 'Remove-Item C:\\x', 'git commit -m x', 'winget install x']) assert.ok(mudaSistema(c), c);
for (const c of ['ls -la', 'git status', 'node a.js 2>&1', 'cat a | grep x', 'echo oi 2>/dev/null', 'Get-ChildItem C:\\', 'node -e "x => 1"']) assert.ok(!mudaSistema(c), c);
console.log('Tudo certo');
