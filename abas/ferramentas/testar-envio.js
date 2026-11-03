'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-env-'));
const raiz = path.join(base, 'Raiz Ação');
fs.mkdirSync(raiz);
process.env.FCC_RAIZ = raiz;

const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f, o); else o.push(f); } return o; };
const w = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };

(async () => { try {
  const C = require('../caminhos');
  const E = require('../envio');
  const P = C.perfil(), CL = C.perfilClaude(), RG = C.regras(), CA = C.casa();
  const rj = JSON.stringify(C.raiz()).slice(1, -1);   // root as written inside JSON

  w(path.join(CL, 'skills', 'minha', 'SKILL.md'), '# skill\nusa ' + C.raiz() + '\\perfil\\regras e noreply@anthropic.com, a@example.com\n');
  w(path.join(CL, 'skills', 'minha', 'contato.md'), 'fale com fulano@gmail.com\n');
  w(path.join(CL, 'skills', 'minha', 'img.png'), Buffer.from([0x89, 0x50, 0, 1, 2]));
  w(path.join(CL, 'settings.json'), '{"hooks":{"command":"python \\"' + rj + '\\\\perfil\\\\regras\\\\x.py\\"","alt":"' + C.raiz().replace(/\\/g, '/') + '/y.py"}}');
  w(path.join(CL, 'CLAUDE.md'), '# regras\n');
  w(path.join(CL, 'agents', 'ag.md'), 'agente\n');
  w(path.join(CL, 'projects', 'k', 'c.jsonl'), '{"cwd":"x"}\n');
  w(path.join(CL, '.credentials.json'), '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-aaaaaaaaaaaaaaaaaaaa"}}');
  w(path.join(CL, 'plugins', 'p.json'), '{}');
  w(path.join(CL, 'todos', 't.json'), '{}');
  w(path.join(RG, 'REGRAS.md'), 'regra\nver E:\\\\Meus Docs\\\\x agora\nok\n');
  w(path.join(RG, 'GOSTOS.md'), 'gosto\nC:\\Users\\Fulano\\Desktop\n');
  w(path.join(RG, 'APRENDIZADOS.md'), 'licao\n');
  w(path.join(RG, 'APRENDIZADOS-extra.md'), 'licao\n');
  w(path.join(RG, 'historico', 'h.md'), 'h\n');
  w(path.join(CA, 'memoria', 'm.md'), 'm\n');
  w(path.join(CA, 'memoria-fcc', 'm.md'), 'm\n');
  w(path.join(CA, 'aprendizado', 'a.md'), 'a\n');
  w(path.join(CA, 'orquestra', 'o.md'), 'o\n');
  w(path.join(CA, 'projetos', 'p.md'), 'p\n');
  w(path.join(CA, 'skills', 's', 'SKILL.md'), 'casa skill /c/Users/fulano/x e ' + C.raiz().replace(/\\/g, '/') + '/ok\n');
  w(path.join(CA, 'mcp.json'), '{"servers":{"x":{"token": "abcdefabcdefabcdefabcdef1234"}}}');
  w(path.join(CA, 'LEIA-ME.md'), 'leia\n');
  w(path.join(P, 'dados', 'fcc.ini'), '[a]\nb=1\n');
  w(path.join(P, 'chat-livre', 'c.md'), 'c\n');
  w(path.join(C.conta(), 'config', 'x.json'), '{}');
  w(path.join(raiz, 'backup', 'b.md'), 'b\n');
  w(C.perfilJson(), JSON.stringify({ versao: 1, origem: 'D:\\Antigo', pastas: ['D:\\Antigo\\p'], ferramentas: ['git'] }));

  // review round 2: unknown extensions, UTF-16, depth, new token shapes, binaries
  const u16 = (t, bom) => Buffer.concat([bom ? Buffer.from([0xFF, 0xFE]) : Buffer.alloc(0), Buffer.from(t, 'utf16le')]);
  const u16be = (t) => Buffer.concat([Buffer.from([0xFE, 0xFF]), Buffer.from(t, 'utf16le').swap16()]);
  w(path.join(CL, 'skills', 'minha', 'dados.csv'), 'nome,email\nfulano,fulano@gmail.com\n');
  w(path.join(CL, 'skills', 'minha', 'estilo.css'), 'a { color: red; } /* sk-learn */\n');
  w(path.join(CL, 'skills', 'minha', 'log.log'), 'ok token: "curto"\nsiga beltrano@empresa.com.br\n');
  w(path.join(CL, 'skills', 'minha', 'notas.txt'), u16('minha chave sk-ant-api03-abcdefgh12345678', true));
  w(path.join(CL, 'skills', 'minha', 'sem-bom.txt'), u16('contato zeca@gmail.com aqui\n', false));
  w(path.join(CL, 'skills', 'minha', 'be.txt'), u16be('contato maria@gmail.com aqui\n'));
  w(path.join(CL, 'skills', 'minha', 'ps.ps1'), u16('Write-Host "ola " ; $r = "' + C.raiz() + '\\perfil"\r\n', true));
  w(path.join(CL, 'skills', 'y', 'memoria', 'm.md'), 'memoria\n');
  w(path.join(CL, 'skills', 'y', 'Memory.md'), 'memory\n');
  w(path.join(CL, 'skills', 'y', 'data.db'), Buffer.from([0x53, 0x51, 0, 0, 1, 2, 3]));
  w(path.join(CL, 'skills', 'y', 'blob.sqlite'), 'SQLite format 3 sem nul\n');
  w(path.join(CL, 'skills', 'y', 'cru.bin'), Buffer.from([1, 0, 2, 0, 3, 0, 9, 8, 7]));
  w(path.join(CL, 'skills', 'y', 'conv.jsonl'), '{"a":1}\n');
  w(path.join(CL, 'agents', 'lessons', 'l.md'), 'licoes\n');
  w(path.join(CA, 'x', 'aprendizado', 'APRENDIZADOS.md'), 'licao aninhada\n');
  w(path.join(CA, 'x', 'nota.md'), 'nota ok\n');
  w(path.join(CA, 'x', 'z.jsonl'), '{"b":2}\n');
  w(path.join(CA, 'chave-jwt.md'), 'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U\n');
  w(path.join(CA, 'chave-sk.md'), 'OPENAI sk-proj-AbCd1234EfGh5678IjKl9012\n');
  w(path.join(CA, 'chave-aiza.md'), 'g: AIzaSyA-1234567890abcdefghijklmnopqrstu\n');
  w(path.join(CA, 'chave-pem.md'), 'x\n-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----\n');
  w(path.join(CA, 'curtas.md'), 'sk-learn, task-sk-runner, eyJ.a.b, AIzaCurto e -----BEGIN CERTIFICATE-----\n');

  const dest = path.join(base, 'enviar');
  const r = E.prepararEnvio(dest);
  const rels = walk(dest).map((f) => path.relative(dest, f).replace(/\\/g, '/')).sort();
  const esperado = [
    'perfil/casa/LEIA-ME.md',
    'perfil/casa/x/nota.md',
    'perfil/casa/curtas.md',
    'perfil/claude/skills/minha/estilo.css',
    'perfil/claude/skills/minha/ps.ps1',
    'perfil/casa/skills/s/SKILL.md',
    'perfil/claude/CLAUDE.md',
    'perfil/claude/agents/ag.md',
    'perfil/claude/settings.json',
    'perfil/claude/skills/minha/SKILL.md',
    'perfil/claude/skills/minha/img.png',
    'perfil/perfil.json',
    'perfil/regras/GOSTOS.md',
    'perfil/regras/REGRAS.md',
  ].sort();
  assert.deepStrictEqual(rels, esperado);
  assert.strictEqual(r.copiados, esperado.length - 1);
  assert.ok(r.bytes > 0);

  const ret = (sufixo) => r.retidos.filter((x) => x.arquivo.replace(/\\/g, '/').endsWith(sufixo));
  assert.deepStrictEqual(ret('skills/minha/contato.md').map((x) => x.motivo), ['e-mail']);
  assert.deepStrictEqual(ret('casa/mcp.json').map((x) => x.motivo), ['token']);
  assert.strictEqual(ret('SKILL.md').length, 0, 'placeholders allowed');
  assert.strictEqual(ret('settings.json').length, 0);

  // personal paths
  const cp = r.caminhosPessoais;
  const f = (s) => cp.filter((x) => x.arquivo.replace(/\\/g, '/').endsWith(s));
  assert.strictEqual(f('regras/REGRAS.md').length, 1);
  assert.strictEqual(f('regras/REGRAS.md')[0].linha, 2);
  assert.ok(f('regras/REGRAS.md')[0].trecho.includes('Meus Docs'));
  assert.strictEqual(f('regras/GOSTOS.md').length, 1);
  assert.strictEqual(f('casa/skills/s/SKILL.md').length, 1, '/c/Users flagged, in-root forward-slash path not');
  assert.ok(f('casa/skills/s/SKILL.md')[0].trecho.startsWith('/c/Users'));
  assert.strictEqual(f('claude/settings.json').length, 0, 'hook inside root not flagged');
  assert.strictEqual(f('claude/skills/minha/SKILL.md').length, 0);
  assert.strictEqual(cp.length, 3);

  // perfil.json
  const pj = JSON.parse(fs.readFileSync(path.join(dest, 'perfil', 'perfil.json'), 'utf8'));
  assert.ok(pj.origem && pj.origem !== C.raiz() && !pj.origem.toLowerCase().includes('raiz ação') && !pj.origem.includes('Antigo'), 'origem neutral: ' + pj.origem);
  assert.deepStrictEqual(pj.ferramentas, ['git']);
  assert.deepStrictEqual(pj.pastas, []);
  assert.strictEqual(pj.versao, 1);

  // final scan of the copy
  for (const x of walk(dest)) {
    assert.ok(!x.endsWith('.jsonl') && !/credentials/i.test(x) && !/aprendizados/i.test(x), x);
    if (x.endsWith('.png')) continue;
    const t = fs.readFileSync(x, 'utf8');
    assert.deepStrictEqual(E.acharSegredos(t), [], x);
  }
  // review round 2
  const mot = (s) => ret(s).map((x) => x.motivo);
  assert.deepStrictEqual(mot('minha/dados.csv'), ['e-mail']);
  assert.deepStrictEqual(mot('minha/log.log'), ['e-mail']);
  assert.deepStrictEqual(mot('minha/notas.txt'), ['token'], 'UTF-16 LE BOM scanned');
  assert.deepStrictEqual(mot('minha/sem-bom.txt'), ['e-mail'], 'UTF-16 LE without BOM scanned');
  assert.deepStrictEqual(mot('minha/be.txt'), ['e-mail'], 'UTF-16 BE scanned');
  for (const k of ['chave-jwt.md', 'chave-sk.md', 'chave-aiza.md', 'chave-pem.md']) assert.deepStrictEqual(mot('casa/' + k), ['token'], k);
  assert.strictEqual(ret('curtas.md').length, 0, 'short words are not keys');
  const ign = r.ignorados.map((x) => x.arquivo.replace(/\\/g, '/')).sort();
  assert.deepStrictEqual(ign, ['perfil/claude/skills/y/blob.sqlite', 'perfil/claude/skills/y/cru.bin', 'perfil/claude/skills/y/data.db']);
  const tudo = walk(dest).map((x) => x.replace(/\\/g, '/'));
  for (const proibido of ['.jsonl', '.db', '.sqlite', '.bin', '.csv', '.log', 'notas.txt', 'sem-bom', 'be.txt', 'memoria', 'Memory', 'lessons', 'aprendizado', 'chave-'])
    assert.ok(!tudo.some((x) => x.slice(dest.length).includes(proibido)), proibido);
  // nothing in the copy names the sender's root; UTF-16 file rewritten and still UTF-16 with BOM
  for (const x of tudo) {
    if (x.endsWith('.png')) continue;
    const b = fs.readFileSync(x);
    const t = b[0] === 0xFF && b[1] === 0xFE ? b.subarray(2).toString('utf16le') : b.toString('utf8');
    assert.ok(!t.toLowerCase().includes('raiz ação'), 'sender root left in ' + x);
    assert.ok(!/fulano@gmail|zeca@|maria@|beltrano@|sk-ant-api|sk-proj|AIzaSy|BEGIN RSA/.test(t), x);
  }
  const ps = fs.readFileSync(path.join(dest, 'perfil', 'claude', 'skills', 'minha', 'ps.ps1'));
  assert.ok(ps[0] === 0xFF && ps[1] === 0xFE && ps.subarray(2).toString('utf16le').includes('FCC-RAIZ-ENVIO\\perfil'));
  assert.ok(fs.readFileSync(path.join(dest, 'perfil', 'claude', 'settings.json'), 'utf8').includes('FCC-RAIZ-ENVIO'));
  assert.ok(!fs.existsSync(path.join(dest, 'perfil', 'dados')));
  assert.ok(!fs.existsSync(path.join(dest, 'conta')) && !fs.existsSync(path.join(dest, 'backup')));

  // refusals
  assert.throws(() => E.prepararEnvio(dest), /vazio/);
  assert.throws(() => E.prepararEnvio(path.join(raiz, 'enviar')), /raiz/);
  assert.throws(() => E.prepararEnvio(raiz), /raiz/);
  assert.throws(() => E.prepararEnvio(base), /raiz/);
  const vazio = path.join(base, 'vazio'); fs.mkdirSync(vazio);
  assert.strictEqual(E.prepararEnvio(vazio).copiados, esperado.length - 1, 'empty existing dir accepted');

  // detectors
  assert.deepStrictEqual(E.acharSegredos('x ghp_' + 'a'.repeat(30)).map((s) => s.motivo), ['token']);
  assert.deepStrictEqual(E.acharSegredos('Authorization: Bearer ' + 'abc123'.repeat(5)).map((s) => s.motivo), ['token']);
  assert.deepStrictEqual(E.acharSegredos('"apiKey": "' + 'Z9'.repeat(15) + '"').map((s) => s.motivo), ['token']);
  assert.deepStrictEqual(E.acharSegredos('"token": "curto"'), []);
  assert.deepStrictEqual(E.acharSegredos('a@b.example.com e x@example.org'), []);
  assert.deepStrictEqual(E.acharSegredos('sk-learn e task-sk-runner-with-a-long-name'), []);
  assert.deepStrictEqual(E.acharSegredos('-----BEGIN CERTIFICATE-----'), []);

  // receiver side: restaurar turns the placeholder into the receiver's own root (hook path + UTF-16 untouched by it)
  const raiz2 = path.join(base, 'Outra Raiz'); fs.mkdirSync(raiz2);
  fs.cpSync(path.join(dest, 'perfil'), path.join(raiz2, 'perfil'), { recursive: true });
  process.env.FCC_RAIZ = raiz2;
  const R = require('../restaurar');
  assert.strictEqual(R.precisaRestaurar(), true);
  const rr = await R.restaurarPerfil();
  assert.deepStrictEqual(rr.erros, []);
  const s2 = fs.readFileSync(path.join(raiz2, 'perfil', 'claude', 'settings.json'), 'utf8');
  assert.ok(s2.includes(JSON.stringify(raiz2).slice(1, -1)) && !s2.includes('FCC-RAIZ-ENVIO'), s2);
  assert.strictEqual(R.precisaRestaurar(), false);
  console.log('ok');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  fs.rmSync(base, { recursive: true, force: true });
} })();
