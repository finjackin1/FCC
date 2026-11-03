'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const VELHO = 'D:\\Velho Lugar\\FCC';
const tmpRaiz = () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-rest-'));
  const raiz = path.join(base, 'Novo Lugar Ação');
  fs.mkdirSync(raiz);
  process.env.FCC_RAIZ = raiz;
  return { base, raiz };
};
const limpar = ({ base, raiz }) => {
  const cfg = path.join(raiz, 'conta', 'config');
  try { for (const n of fs.readdirSync(cfg)) { const f = path.join(cfg, n); if (fs.lstatSync(f).isSymbolicLink()) fs.unlinkSync(f); } } catch { }
  fs.rmSync(base, { recursive: true, force: true });
};
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f, o); else o.push(f); } return o; };

async function principal() {
  const t = tmpRaiz();
  try {
    const C = require('../caminhos');
    const R = require('../restaurar');
    const kv = C.chaveProjeto(VELHO), kn = C.chaveProjeto(C.raiz());
    const projs = path.join(C.perfilClaude(), 'projects');
    fs.mkdirSync(path.join(C.perfil(), 'dados'), { recursive: true });
    fs.mkdirSync(C.conta(), { recursive: true });
    fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: VELHO, pastas: [VELHO + '\\projects\\a', 'E:\\fora'], ferramentas: ['git', 'node'] }));
    fs.mkdirSync(C.ferramentas('node'), { recursive: true });

    const jv = JSON.stringify(VELHO).slice(1, -1);
    const linhaCwd = JSON.stringify({ type: 'user', cwd: VELHO + '\\projects\\a', message: { content: 'estou em ' + VELHO + ' ação' } });
    const ruim = '{"cwd":"' + jv + '", quebrada';
    const a = [linhaCwd, ruim, '{"x":1}\r'].join('\n') + '\n';
    const b = '{"cwd":"E:\\\\outro"}\n{"y":2}\n';
    fs.mkdirSync(path.join(projs, kv, 'subagents'), { recursive: true });
    fs.writeFileSync(path.join(projs, kv, 'a.jsonl'), a);
    fs.writeFileSync(path.join(projs, kv, 'b.jsonl'), b);
    fs.writeFileSync(path.join(projs, kv, 'subagents', 's.jsonl'), linhaCwd + '\n');
    // outside project
    const kf = C.chaveProjeto('E:\\Outro\\Proj');
    fs.mkdirSync(path.join(projs, kf), { recursive: true });
    fs.writeFileSync(path.join(projs, kf, 'z.jsonl'), '{"cwd":"E:\\\\Outro\\\\Proj"}\n');
    // collision: old subproject folder and an existing new one with the same file name
    fs.mkdirSync(path.join(projs, kv + '-sub'), { recursive: true });
    fs.mkdirSync(path.join(projs, kn + '-sub'), { recursive: true });
    fs.writeFileSync(path.join(projs, kv + '-sub', 'c.jsonl'), '{"cwd":"' + jv + '\\\\sub"}\n');
    fs.writeFileSync(path.join(projs, kn + '-sub', 'c.jsonl'), '{"cwd":"novo"}\n');
    // sibling project (FCC-old) shares the key prefix but is not inside the old root: untouched
    const sib = '{"cwd":"' + jv + '-old"}\n';
    fs.mkdirSync(path.join(projs, kv + '-old'), { recursive: true });
    fs.writeFileSync(path.join(projs, kv + '-old', 'd.jsonl'), sib);
    // plugins
    fs.mkdirSync(path.join(C.perfilClaude(), 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(C.perfilClaude(), 'plugins', 'installed.json'), '{"p":"' + jv + '\\\\plugins\\\\x"}');

    // text files: settings hook, CLAUDE.md import, rules, casa, skill, agent; history stays
    const vf = VELHO.replace(/\\/g, '/');
    const txt = {
      [path.join(C.perfilClaude(), 'settings.json')]: '{"command":"python -I \\"' + vf + '/perfil/regras/ferramentas/x.py\\""}',
      [path.join(C.perfilClaude(), 'CLAUDE.md')]: '@' + vf + '/perfil/regras/CLAUDE-global.md',
      [path.join(C.regras(), 'REGRAS.md')]: 'veja ' + VELHO + '\\perfil\\casa e ' + VELHO + 'X\\nao e D:\\Velho Lugar\\FCC-2\\nao',
      [path.join(C.casa(), 'skills', 'a', 'SKILL.md')]: 'json "' + jv + '\\\\perfil"',
      [path.join(C.perfilClaude(), 'skills', 's', 'SKILL.md')]: VELHO + '\\projects\\a',
      [path.join(C.perfilClaude(), 'agents', 'ag.md')]: VELHO,
      [path.join(C.regras(), 'historico', 'velho.md')]: VELHO,
    };
    for (const [f, c] of Object.entries(txt)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); }

    assert.strictEqual(R.precisaRestaurar(), true);
    assert.deepStrictEqual(R.faltando().ferramentas, ['git']);
    const inoB = fs.statSync(path.join(projs, kv, 'b.jsonl')).ino;
    const r = await R.restaurarPerfil();
    assert.deepStrictEqual(r.erros, []);
    assert.strictEqual(R.precisaRestaurar(), false);
    assert.ok(r.colisoes >= 1, 'colisoes');
    assert.ok(!fs.existsSync(path.join(projs, kv)), 'old key gone');
    const na = fs.readFileSync(path.join(projs, kn, 'a.jsonl'), 'utf8').split('\n');
    const o = JSON.parse(na[0]);
    assert.strictEqual(o.cwd, C.raiz() + '\\projects\\a');
    assert.strictEqual(o.message.content, 'estou em ' + VELHO + ' ação');
    assert.strictEqual(na[1], ruim);
    assert.strictEqual(na[2], '{"x":1}\r');
    assert.strictEqual(fs.readFileSync(path.join(projs, kn, 'b.jsonl'), 'utf8'), b);
    assert.strictEqual(fs.statSync(path.join(projs, kn, 'b.jsonl')).ino, inoB, 'untouched file not rewritten');
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(projs, kn, 'subagents', 's.jsonl'), 'utf8')).cwd, C.raiz() + '\\projects\\a');
    assert.ok(fs.existsSync(path.join(projs, kf, 'z.jsonl')), 'outside project keeps key');
    assert.strictEqual(fs.readdirSync(path.join(projs, kn + '-sub')).length, 2, 'collision keeps both');
    assert.strictEqual(fs.readFileSync(path.join(projs, kv + '-old', 'd.jsonl'), 'utf8'), sib, 'sibling FCC-old untouched');
    assert.ok(!fs.existsSync(path.join(projs, kn + '-old')), 'sibling not renamed');
    // backup
    const bk = walk(r.backup).filter((f) => path.basename(f) === 'a.jsonl');
    assert.strictEqual(bk.length, 1);
    assert.strictEqual(fs.readFileSync(bk[0], 'utf8'), a);
    assert.ok(fs.existsSync(path.join(r.backup, 'perfil.json')));
    assert.ok(!walk(r.backup).some((f) => path.basename(f) === 'b.jsonl'), 'no backup for untouched');
    // text files
    const N = C.raiz(), nf = N.replace(/\\/g, '/'), lerT = (f) => fs.readFileSync(f, 'utf8');
    const ks = Object.keys(txt);
    assert.strictEqual(lerT(ks[0]), '{"command":"python -I \\"' + nf + '/perfil/regras/ferramentas/x.py\\""}');
    assert.strictEqual(lerT(ks[1]), '@' + nf + '/perfil/regras/CLAUDE-global.md');
    assert.strictEqual(lerT(ks[2]), 'veja ' + N + '\\perfil\\casa e ' + VELHO + 'X\\nao e D:\\Velho Lugar\\FCC-2\\nao');
    assert.strictEqual(lerT(ks[3]), 'json "' + JSON.stringify(N).slice(1, -1) + '\\\\perfil"');
    assert.strictEqual(lerT(ks[4]), N + '\\projects\\a');
    assert.strictEqual(lerT(ks[5]), N);
    assert.strictEqual(lerT(ks[6]), VELHO, 'historico untouched');
    assert.strictEqual(r.textos, 7, 'texts rewritten (6 + plugin)');
    assert.ok(fs.existsSync(path.join(r.backup, 'claude', 'settings.json')), 'text backup');
    // plugins + perfil.json
    assert.ok(fs.readFileSync(path.join(C.perfilClaude(), 'plugins', 'installed.json'), 'utf8').includes(JSON.stringify(C.raiz()).slice(1, -1)));
    const pj = JSON.parse(fs.readFileSync(C.perfilJson(), 'utf8'));
    assert.strictEqual(pj.origem, C.raiz());
    assert.deepStrictEqual(pj.pastas, [C.raiz() + '\\projects\\a', 'E:\\fora']);
    // no credentials, empty conta
    assert.ok(!fs.existsSync(path.join(C.perfilClaude(), '.credentials.json')));
    assert.deepStrictEqual(fs.readdirSync(C.contas()), []);
    // second run: nothing to do
    assert.strictEqual(R.precisaRestaurar(), false);

    // crash simulation: origem back to old value after steps 2-3 finished
    fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: VELHO, pastas: [VELHO + '\\projects\\a'] }));
    assert.strictEqual(R.precisaRestaurar(), true);
    const antes = fs.readFileSync(path.join(projs, kn, 'a.jsonl'), 'utf8');
    const r2 = await R.restaurarPerfil();
    assert.deepStrictEqual(r2.erros, []);
    assert.strictEqual(r2.renomeadas, 0);
    assert.strictEqual(r2.reescritas, 0);
    assert.strictEqual(fs.readFileSync(path.join(projs, kn, 'a.jsonl'), 'utf8'), antes);
    assert.strictEqual(r2.textos || 0, 0, 'rerun rewrites no text');
    assert.strictEqual(R.precisaRestaurar(), false);
  } finally { limpar(t); }
}

function nested() {   // pure: new root inside old, old inside new, rerun never doubles
  const R = require('../restaurar');
  const V = 'E:\\A', Nd = 'E:\\A\\B';
  const t1 = R.trocarRaizTexto('x E:\\A\\perfil y E:/A/c', V, Nd);
  assert.strictEqual(t1, 'x E:\\A\\B\\perfil y E:/A/B/c');
  assert.strictEqual(R.trocarRaizTexto(t1, V, Nd), t1, 'rerun same');
  assert.strictEqual(R.trocarRaizTexto('E:\\A\\B\\p', Nd, V), 'E:\\A\\p', 'old inside new');
  assert.strictEqual(R.trocarPrefixo('E:\\A\\B\\p', V, Nd), null, 'cwd already new');
  assert.strictEqual(R.trocarPrefixo('E:\\A\\p', V, Nd), 'E:\\A\\B\\p');
}

// new root inside old root: a rerun after a crash must not rename E--A-B-p to E--A-B-B-p; sibling stays
async function aninhada() {
  const t = tmpRaiz();
  try {
    const C = require('../caminhos');
    const R = require('../restaurar');
    const velho = t.base, kv = C.chaveProjeto(velho), kn = C.chaveProjeto(C.raiz());
    assert.ok(kn.startsWith(kv + '-'), 'fixture is nested');
    const projs = path.join(C.perfilClaude(), 'projects');
    fs.mkdirSync(C.perfil(), { recursive: true });
    const poj = () => fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: velho }));
    poj();
    const jv = JSON.stringify(velho).slice(1, -1);
    fs.mkdirSync(path.join(projs, kv + '-projects-a'), { recursive: true });
    fs.writeFileSync(path.join(projs, kv + '-projects-a', 'a.jsonl'), '{"cwd":"' + jv + '\\\\projects\\\\a"}\n');
    fs.mkdirSync(path.join(projs, kv), { recursive: true });
    fs.writeFileSync(path.join(projs, kv, 'r.jsonl'), '{"cwd":"' + jv + '"}\n');
    const sib = '{"cwd":"' + jv + '-old"}\n';
    fs.mkdirSync(path.join(projs, kv + '-old'), { recursive: true });
    fs.writeFileSync(path.join(projs, kv + '-old', 's.jsonl'), sib);
    const r1 = await R.restaurarPerfil();
    assert.deepStrictEqual(r1.erros, []);
    assert.strictEqual(r1.renomeadas, 2, 'root + sub renamed');
    const lista = () => fs.readdirSync(projs).sort();
    const depois1 = lista();
    assert.ok(depois1.includes(kn + '-projects-a') && depois1.includes(kn) && depois1.includes(kv + '-old'), depois1.join(','));
    assert.ok(!depois1.some((n) => n.startsWith(kn + '-' + kn.slice(kv.length + 1))), 'no doubled key: ' + depois1.join(','));
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(projs, kn + '-projects-a', 'a.jsonl'), 'utf8')).cwd, C.raiz() + '\\projects\\a');
    assert.strictEqual(fs.readFileSync(path.join(projs, kv + '-old', 's.jsonl'), 'utf8'), sib, 'sibling untouched');
    // crash rerun
    const conteudo = fs.readFileSync(path.join(projs, kn + '-projects-a', 'a.jsonl'), 'utf8');
    poj();
    const r2 = await R.restaurarPerfil();
    assert.deepStrictEqual(r2.erros, []);
    assert.strictEqual(r2.renomeadas, 0, 'rerun renames nothing');
    assert.strictEqual(r2.reescritas, 0, 'rerun rewrites nothing');
    assert.deepStrictEqual(lista(), depois1, 'rerun keeps the folder list');
    assert.strictEqual(fs.readFileSync(path.join(projs, kn + '-projects-a', 'a.jsonl'), 'utf8'), conteudo);
    assert.strictEqual(fs.readFileSync(path.join(projs, kv + '-old', 's.jsonl'), 'utf8'), sib);
  } finally { limpar(t); }
}

// cp1252 (non UTF-8) text keeps its bytes; the old path inside is still rewritten
async function cp1252() {
  const t = tmpRaiz();
  try {
    const C = require('../caminhos');
    const R = require('../restaurar');
    fs.mkdirSync(C.regras(), { recursive: true });
    fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: VELHO }));
    const f = path.join(C.regras(), 'velho.md');
    const orig = Buffer.from('a\xe7\xe3o \x93x\x94 ' + VELHO + '\\perfil fim ação', 'latin1');
    fs.writeFileSync(f, orig);
    const r = await R.restaurarPerfil();
    assert.deepStrictEqual(r.erros, []);
    const out = fs.readFileSync(f);
    const esperado = Buffer.from('a\xe7\xe3o \x93x\x94 ' + C.raiz() + '\\perfil fim a\xe7\xe3o', 'latin1');
    assert.ok(out.equals(esperado), 'accents byte-identical, path rewritten: ' + JSON.stringify(out.toString('latin1')));
    assert.strictEqual(r.latin1, 1, 'reported');
    assert.ok(r.avisos.some((a) => a.includes('velho.md')));
    // a valid UTF-8 file still goes out as UTF-8
    fs.writeFileSync(path.join(C.regras(), 'u.md'), 'ação ' + VELHO);
    fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: VELHO }));
    const r2 = await R.restaurarPerfil();
    assert.deepStrictEqual(r2.erros, []);
    assert.strictEqual(fs.readFileSync(path.join(C.regras(), 'u.md'), 'utf8'), 'ação ' + C.raiz());
    assert.ok(!r2.latin1);
  } finally { limpar(t); }
}

// same-second rerun: backup keeps the original bytes, not the already rewritten file
async function backupNaoSobrescreve() {
  const t = tmpRaiz();
  const RD = Date;
  try {
    const C = require('../caminhos');
    const R = require('../restaurar');
    global.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(2030, 0, 1, 12, 0, 0); } };   // same backup folder both runs
    fs.mkdirSync(C.regras(), { recursive: true });
    const poj = () => fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: VELHO }));
    const f = path.join(C.regras(), 'x.md');
    const orig = 'original ' + VELHO;
    fs.writeFileSync(f, orig);
    poj();
    const r1 = await R.restaurarPerfil();
    assert.deepStrictEqual(r1.erros, []);
    const bk = path.join(r1.backup, 'regras', 'x.md');
    assert.strictEqual(fs.readFileSync(bk, 'utf8'), orig);
    fs.writeFileSync(f, 'editado ' + VELHO);   // changed afterwards, still names the old root
    poj();
    const r2 = await R.restaurarPerfil();
    assert.deepStrictEqual(r2.erros, []);
    assert.strictEqual(r2.backup, r1.backup, 'same backup folder');
    assert.strictEqual(r2.textos, 1);
    assert.strictEqual(fs.readFileSync(f, 'utf8'), 'editado ' + C.raiz());
    assert.strictEqual(fs.readFileSync(bk, 'utf8'), orig, 'first backup kept');
  } finally { global.Date = RD; limpar(t); }
}

async function grande() {
  const t = tmpRaiz();
  try {
    delete require.cache[require.resolve('../caminhos')];
    const C = require('../caminhos');
    const R = require('../restaurar');
    const kv = C.chaveProjeto(VELHO);
    const pasta = path.join(C.perfilClaude(), 'projects', kv);
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(C.perfilJson(), JSON.stringify({ versao: 1, origem: VELHO }));
    const arq = path.join(pasta, 'big.jsonl');
    const ws = fs.createWriteStream(arq);
    const lixo = 'x'.repeat(1000);
    const alvo = 50 * 1024 * 1024;
    let n = 0, bytes = 0;
    while (bytes < alvo) {
      const l = JSON.stringify({ i: n, cwd: n % 10 === 0 ? VELHO + '\\p' : 'E:\\q', t: lixo }) + '\n';
      bytes += l.length; n++;
      if (!ws.write(l)) await new Promise((r) => ws.once('drain', r));
    }
    await new Promise((r) => ws.end(r));
    if (global.gc) global.gc();
    const base = process.memoryUsage().rss;
    let max = base;
    const iv = setInterval(() => { max = Math.max(max, process.memoryUsage().rss); }, 20);
    const r = await R.restaurarPerfil();
    clearInterval(iv);
    max = Math.max(max, process.memoryUsage().rss);
    assert.deepStrictEqual(r.erros, []);
    assert.strictEqual(r.reescritas, 1);
    assert.ok(max - base < 100 * 1024 * 1024, 'memory growth ' + Math.round((max - base) / 1048576) + ' MB');
    const nova = path.join(C.perfilClaude(), 'projects', C.chaveProjeto(C.raiz()), 'big.jsonl');
    const fd = fs.openSync(nova, 'r'); const buf = Buffer.alloc(3000); fs.readSync(fd, buf, 0, 3000, 0); fs.closeSync(fd);
    assert.strictEqual(JSON.parse(buf.toString('utf8').split('\n')[0]).cwd, C.raiz() + '\\p');
  } finally { limpar(t); }
}

(async () => {
  nested();
  await principal();
  await aninhada();
  await cp1252();
  await backupNaoSobrescreve();
  await grande();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
