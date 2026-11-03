// Uso: node ferramentas\testar-perfil.js  (raiz descartável em temp, com espaço e acento; não toca em nada real)
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-teste-perfil-'));
process.env.FCC_RAIZ = path.join(base, 'Meus Programas', 'FCC Ação');
fs.mkdirSync(process.env.FCC_RAIZ, { recursive: true });
const C = require('../caminhos.js');
const P = require('../perfil.js');
const eJuncao = (f) => fs.lstatSync(f).isSymbolicLink();
const ler = (f) => fs.readFileSync(f, 'utf8');
const conf = (...p) => path.join(C.configClaude(), ...p), pc = (...p) => path.join(C.perfilClaude(), ...p);

try {
  // 1. fresh root
  let r = P.prepararConfig();
  assert.strictEqual(r.env.CLAUDE_CONFIG_DIR, C.configClaude());
  for (const n of P.JUNCOES) { assert(eJuncao(conf(n)), 'sem junção: ' + n); assert(fs.statSync(pc(n)).isDirectory()); }
  fs.writeFileSync(conf('projects', 'via-juncao.txt'), 'x'); assert(fs.existsSync(pc('projects', 'via-juncao.txt')), 'junção não leva ao perfil');
  assert.deepStrictEqual(r.settingsArg, []);

  // 2. CLAUDE.md import is relative, no spaces or accents
  const imp = ler(conf('CLAUDE.md')).trim();
  assert.strictEqual(imp, '@../../perfil/claude/CLAUDE.md');
  fs.writeFileSync(pc('CLAUDE.md'), 'regra', 'utf8');
  assert.strictEqual(path.resolve(C.configClaude(), imp.slice(1)), pc('CLAUDE.md'));

  // 3. idempotent; keeps content
  P.prepararConfig(); assert.strictEqual(ler(pc('projects', 'via-juncao.txt')), 'x'); assert.strictEqual(ler(conf('CLAUDE.md')).trim(), imp);

  // 4. Claude Code created a real folder first: merged, nothing lost, collision keeps both
  fs.unlinkSync(conf('todos')); fs.mkdirSync(conf('todos', 'sub'), { recursive: true });
  fs.writeFileSync(conf('todos', 'novo.txt'), 'novo'); fs.writeFileSync(conf('todos', 'sub', 'a.txt'), 'real');
  fs.writeFileSync(pc('todos', 'novo.txt'), 'antigo');
  fs.mkdirSync(pc('todos', 'sub')); fs.writeFileSync(pc('todos', 'sub', 'b.txt'), 'b');
  P.prepararConfig();
  assert(eJuncao(conf('todos')));
  assert.strictEqual(ler(pc('todos', 'novo.txt')), 'antigo');
  assert.strictEqual(ler(pc('todos', 'novo.conflito-1.txt')), 'novo');
  assert.strictEqual(ler(pc('todos', 'sub', 'a.txt')), 'real'); assert.strictEqual(ler(pc('todos', 'sub', 'b.txt')), 'b');

  // 5. junction with a missing or wrong target: recreated, the wrong target's data untouched
  const outra = path.join(base, 'outra'); fs.mkdirSync(outra); fs.writeFileSync(path.join(outra, 'guarda.txt'), 'g');
  fs.unlinkSync(conf('plans')); fs.symlinkSync(outra, conf('plans'), 'junction');
  fs.rmSync(pc('agents'), { recursive: true });        // target of a live junction gone
  P.prepararConfig();
  assert.strictEqual(path.resolve(fs.readlinkSync(conf('plans'))).toLowerCase(), pc('plans').toLowerCase());
  assert.strictEqual(ler(path.join(outra, 'guarda.txt')), 'g');
  assert(fs.statSync(conf('agents')).isDirectory());

  // 6. login never in perfil
  fs.writeFileSync(pc('.credentials.json'), '{"t":1}'); fs.writeFileSync(conf('.credentials.json'), '{"t":2}'); fs.writeFileSync(pc('.claude.json'), '{"oauthAccount":{}}');
  P.prepararConfig();
  for (const n of P.SO_CONTA) assert(!fs.existsSync(pc(n)), n + ' ficou no perfil');
  assert.strictEqual(ler(conf('.credentials.json')), '{"t":2}'); assert.strictEqual(ler(conf('.credentials.conflito-1.json')), '{"t":1}');
  assert(fs.existsSync(conf('.claude.json')));
  const achado = []; (function varre(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) varre(f); else if (P.SO_CONTA.includes(e.name) || /oauthAccount/.test(ler(f))) achado.push(f); } })(C.perfil());
  assert.deepStrictEqual(achado, []);

  // 7. text Claude left in config\CLAUDE.md moves into the profile
  fs.writeFileSync(conf('CLAUDE.md'), 'escrito pelo claude\n'); P.prepararConfig();
  assert(/regra[\s\S]*escrito pelo claude/.test(ler(pc('CLAUDE.md')))); assert.strictEqual(ler(conf('CLAUDE.md')).trim(), imp);

  // 8. settings passed when present; perfil.json without account identity
  fs.writeFileSync(pc('settings.json'), '{}'); r = P.prepararConfig();
  assert.deepStrictEqual(r.settingsArg, ['--settings', pc('settings.json')]);
  const pj = JSON.parse(ler(C.perfilJson())); assert.strictEqual(pj.versao, 1); assert(!/@/.test(JSON.stringify(pj)));

  console.log('ok testar-perfil');
} finally {
  for (const n of P.JUNCOES) { try { fs.unlinkSync(conf(n)); } catch { } }   // links first, never through them
  fs.rmSync(base, { recursive: true, force: true });
}
