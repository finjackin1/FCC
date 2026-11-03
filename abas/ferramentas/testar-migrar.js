// Tests migrar-perfil.js on a fixture in a temp folder with spaces and "ç", then a read-only --simular on the real data.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { migrar, fmt } = require('./migrar-perfil');
const C = require('../caminhos');

let falhas = 0;
const ok = (c, m) => { if (!c) { falhas++; console.log('FAIL: ' + m); } };
const w = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const lst = (f) => { try { return fs.lstatSync(f); } catch { return null; } };
const lerT = (f) => fs.readFileSync(f, 'utf8');

function hashes(raiz, saida = {}) {
  for (const e of fs.readdirSync(raiz, { withFileTypes: true })) {
    const f = path.join(raiz, e.name);
    if (e.isSymbolicLink()) { saida[f] = 'link:' + fs.readlinkSync(f); continue; }
    if (e.isDirectory()) { saida[f] = 'dir'; hashes(f, saida); } else saida[f] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  }
  return saida;
}
function varrer(d, cb) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); cb(f, e); if (e.isDirectory() && !e.isSymbolicLink()) varrer(f, cb); }
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migrar çtest '));
  const projetos = path.join(tmp, 'meus projetos ç');
  const fcc = path.join(projetos, 'FCC');
  const home = path.join(tmp, 'home ç', '.claude');
  const cj = path.join(tmp, 'home ç', '.claude.json');
  const app = path.join(projetos, 'app ç');
  try {
    // fixture
    w(path.join(fcc, 'memoria', 'skills', 'minha-skill', 'SKILL.md'), 'skill at ' + path.join(fcc, 'memoria', 'skills', 'minha-skill') + '\n');
    fs.mkdirSync(path.join(home, 'skills'), { recursive: true });
    fs.symlinkSync(path.join(fcc, 'memoria', 'skills', 'minha-skill'), path.join(home, 'skills', 'minha-skill'), 'junction');
    w(path.join(home, 'skills', 'real', 'SKILL.md'), 'real skill');
    w(path.join(home, 'skills', '.trash', 'lixo.md'), 'x');
    w(path.join(home, 'fcc-contas', 'a', 'x.txt'), 'conta');
    w(path.join(home, '.credentials.json'), '{"claudeAiOauth":{"accessToken":"SECRET"}}');
    w(path.join(home, 'settings.json'), JSON.stringify({ hooks: path.join(fcc, 'familias', 'h.ps1'), home, hook: 'python ' + path.join(fcc, 'familias', 'ferramentas', 'hook.py').replace(/\\/g, '/'), bin: path.join(fcc, 'familias', 'ferramentas', 'x', 'b.exe') }));
    w(path.join(home, 'CLAUDE.md'), '@' + path.join(fcc, 'familias', 'CLAUDE-global.md').replace(/\\/g, '/') + '\n');
    w(path.join(home, 'plugins', 'p.json'), '{}');
    const chave = C.chaveProjeto(app);
    const linhas = [{ cwd: app, t: 'ç' }, { cwd: path.join(app, 'sub'), t: 'b' }].map((o) => JSON.stringify(o)).join('\n') + '\n';
    w(path.join(home, 'projects', chave, 'a.jsonl'), linhas);
    w(path.join(home, 'projects', chave + '-sub', 'b.jsonl'), JSON.stringify({ cwd: path.join(app, 'sub') }) + '\n');
    w(cj, JSON.stringify({ oauthAccount: { emailAddress: 'a@b.c' }, outro: 1 }));
    w(path.join(fcc, 'familias', 'CLAUDE-global.md'), 'casa em ' + path.join(fcc, 'casa') + '\nbarra ' + path.join(fcc, 'casa').replace(/\\/g, '/') + '\n');
    w(path.join(fcc, 'familias', 'r.json'), JSON.stringify({ p: path.join(fcc, 'casa', 'x') }));
    w(path.join(fcc, 'familias', 'ferramentas', 'x', 'big.bin'), crypto.randomBytes(200000).toString('latin1'));
    w(path.join(fcc, 'familias', 'ferramentas', 'hook.py'), 'print(1)');
    w(path.join(fcc, 'familias', 'ref.md'), 'proj ' + path.join(app, 'x') + '\nraiz ' + projetos + '\nfcc-dados ' + path.join(fcc, 'dist', 'y') + '\nclaudejson ' + cj + '\n');
    fs.writeFileSync(path.join(fcc, 'familias', 'cp.md'), Buffer.from('a\xe7\xe3o \x93x\x94 ' + path.join(fcc, 'casa') + ' fim', 'latin1'));   // cp1252, not UTF-8
    w(path.join(fcc, 'familias', 'historico', 'h.md'), 'velho ' + path.join(fcc, 'dist'));
    w(path.join(fcc, 'casa', 'c.md'), 'c');
    w(path.join(fcc, 'memoria', 'ia-local', 'm.md'), 'm');
    w(path.join(fcc, 'fcc-abas.json'), JSON.stringify({ dir: path.join(fcc, 'chat-livre'), rel: path.join(fcc, 'relatorios', 'r.txt') }));
    w(path.join(fcc, 'chat-livre', 'BRIEFING.md'), 'b');
    w(path.join(home, 'projects', C.chaveProjeto(path.join(fcc, 'chat-livre')), 'l.jsonl'), JSON.stringify({ cwd: path.join(fcc, 'chat-livre') }) + '\n');
    w(path.join(fcc, 'fcc.ini'), 'a=1\r\npastas=D:\\outra\r\ncamada=' + path.join(fcc, 'memoria', 'skills') + '\r\n');
    w(path.join(app, 'src.js'), 'console.log(1)');
    w(path.join(app, '.git', 'HEAD'), 'ref');
    w(path.join(app, 'node_modules', 'm', 'i.js'), 'x');
    w(path.join(app, 'dist', 'o.js'), 'x');

    const antes = hashes(tmp);
    const base = { home, claudejson: cj, fcc, projetos };

    // run 1: no project copy
    delete process.env.FCC_RAIZ;
    const d1 = path.join(tmp, 'novo um');
    const r1 = await migrar({ ...base, destino: d1 });
    ok(r1.erros.length === 0, 'run1 errors: ' + r1.erros.join('; '));
    ok(!('FCC_RAIZ' in process.env), 'FCC_RAIZ not left set by migrar');
    process.env.FCC_RAIZ = d1;
    const sk = path.join(C.perfilClaude(), 'skills', 'minha-skill');
    ok(lst(sk) && lst(sk).isDirectory() && !lst(sk).isSymbolicLink(), 'skill is a real folder');
    ok(lerT(path.join(sk, 'SKILL.md')).startsWith('skill at ' + path.join(C.perfilClaude(), 'skills', 'minha-skill')), 'skill text rewritten: ' + lerT(path.join(sk, 'SKILL.md')));
    ok(lst(path.join(C.perfilClaude(), 'skills', 'real', 'SKILL.md')), 'real skill copied');
    ok(!lst(path.join(C.perfilClaude(), 'skills', '.trash')), '.trash skipped');
    ok(lerT(path.join(C.perfilClaude(), 'CLAUDE.md')) === '@../regras/CLAUDE-global.md', 'CLAUDE.md relative');
    const cg = lerT(path.join(C.regras(), 'CLAUDE-global.md'));
    ok(cg.includes(C.casa() + '\n') && cg.includes(C.casa().replace(/\\/g, '/')), 'regras rewritten to dest casa: ' + cg);
    ok(lerT(path.join(C.regras(), 'r.json')).includes(JSON.stringify(C.casa() + path.sep + 'x').slice(1, -1)), 'json escaped form rewritten');
    ok(lerT(path.join(C.perfilClaude(), 'settings.json')).includes(JSON.stringify(C.configClaude()).slice(1, -1)), 'home -> conta\\config in settings');
    ok(lst(path.join(C.contas(), 'a', 'x.txt')), 'conta\\contas present');
    ok(lst(path.join(C.configClaude(), '.credentials.json')), 'credentials in conta\\config');
    const cl = JSON.parse(lerT(path.join(C.configClaude(), '.claude.json')));
    ok(cl.oauthAccount && cl.oauthAccount.emailAddress === 'a@b.c' && cl.hasCompletedOnboarding === true && !('outro' in cl), '.claude.json minimal');
    let vazou = false;
    varrer(C.perfil(), (f, e) => { if (e.name.toLowerCase() === '.credentials.json') vazou = true; if (e.isFile() && /\.json$/.test(e.name) && /accessToken|refreshToken|oauthAccount/.test(lerT(f))) vazou = true; });
    ok(!vazou, 'no credential/token under perfil');
    ok(!lst(path.join(d1, 'ferramentas')) && !lst(path.join(C.regras(), 'ferramentas', 'x')), 'ferramentas folders not copied');
    ok(lerT(path.join(C.regras(), 'ferramentas', 'hook.py')) === 'print(1)', 'loose ferramentas file goes with regras');
    const st = JSON.parse(lerT(path.join(C.perfilClaude(), 'settings.json')));
    ok(st.hook === 'python ' + path.join(C.regras(), 'ferramentas', 'hook.py').replace(/\\/g, '/'), 'hook path -> regras\\ferramentas: ' + st.hook);
    ok(st.bin === C.ferramentas('x', 'b.exe'), 'tool folder path -> ferramentas\\: ' + st.bin);
    ok(JSON.stringify(r1.restantes) === JSON.stringify([path.join('perfil', 'regras', 'ref.md') + ':3', path.join('perfil', 'regras', 'ref.md') + ':4']), 'leftovers only real old-place refs: ' + JSON.stringify(r1.restantes));
    ok(lerT(path.join(C.regras(), 'ref.md')).split('\n')[3] === 'claudejson ' + cj, '~/.claude.json not turned into conta\\config.json: ' + lerT(path.join(C.regras(), 'ref.md')));
    const cpb = fs.readFileSync(path.join(C.regras(), 'cp.md'));
    ok(cpb.equals(Buffer.from('a\xe7\xe3o \x93x\x94 ' + C.casa() + ' fim', 'latin1')), 'cp1252 file: accents byte-identical, path rewritten: ' + JSON.stringify(cpb.toString('latin1')));
    ok(r1.latin1.length === 1 && /cp1252 text files/.test(r1.relatorio), 'cp1252 reported');
    ok(r1.restHist === 1, 'historico counted apart: ' + r1.restHist);
    const pj = JSON.parse(lerT(C.perfilJson()));
    ok(pj.versao === 1 && pj.origem === d1 && pj.pastas[0] === projetos && pj.ferramentas.includes('x'), 'perfil.json: ' + JSON.stringify(pj));
    ok(lst(path.join(C.perfilClaude(), 'projects', chave, 'a.jsonl')), 'key kept without --copiar-projetos');
    ok(lerT(path.join(C.perfilClaude(), 'projects', chave, 'a.jsonl')).includes(JSON.stringify(app).slice(1, -1)), 'cwd kept');
    const livreN = path.join(C.perfil(), 'chat-livre'), pl = path.join(C.perfilClaude(), 'projects', C.chaveProjeto(livreN), 'l.jsonl');
    ok(lst(path.join(livreN, 'BRIEFING.md')) && lst(pl) && JSON.parse(lerT(pl)).cwd === livreN, 'chat livre key + cwd -> perfil\\chat-livre');
    const ab = JSON.parse(lerT(C.dados('fcc-abas.json')));
    ok(ab.dir === livreN && ab.rel === path.join(C.dados('relatorios'), 'r.txt'), 'app data: chat-livre/relatorios paths moved: ' + JSON.stringify(ab));
    ok(lst(path.join(C.casa(), 'memoria-fcc', 'ia-local', 'm.md')) && lst(C.dados('fcc-abas.json')) && lst(C.dados('fcc.ini')), 'casa/dados placed');
    const ini1 = lerT(C.dados('fcc.ini'));
    ok(ini1.includes('pastas=D:\\outra;' + projetos + '\r\n') && ini1.includes('camada=' + path.join(C.perfilClaude(), 'skills')) && !ini1.includes(fcc), 'fcc.ini: pastas + camada: ' + ini1);
    ok(!lst(path.join(d1, 'projects')), 'projects not copied by default');
    ok(fs.readdirSync(C.perfil()).some((n) => /^migracao-.*\.txt$/.test(n)), 'report saved');

    // refuse non-empty destination
    let recusou = false; try { await migrar({ ...base, destino: d1 }); } catch { recusou = true; }
    ok(recusou, 'refuses non-empty destination');
    // fresh install (FCC.exe + app files, empty perfil\) is accepted; same with a non-empty data folder is refused
    const dInst = path.join(tmp, 'instalado');
    fs.mkdirSync(path.join(dInst, 'perfil'), { recursive: true });
    fs.mkdirSync(path.join(dInst, 'locales'));
    fs.writeFileSync(path.join(dInst, 'FCC.exe'), 'x');
    const rInst = await migrar({ ...base, destino: dInst, simular: true });
    ok(rInst.erros.length === 0, 'fresh install accepted');
    fs.writeFileSync(path.join(dInst, 'perfil', 'algo.txt'), 'x');
    recusou = false; try { await migrar({ ...base, destino: dInst, simular: true }); } catch { recusou = true; }
    ok(recusou, 'refuses install with non-empty perfil');
    const dSem = path.join(tmp, 'sem exe');
    fs.mkdirSync(path.join(dSem, 'locales'), { recursive: true });
    recusou = false; try { await migrar({ ...base, destino: dSem, simular: true }); } catch { recusou = true; }
    ok(recusou, 'refuses non-empty folder without FCC.exe');

    // run 2: with project copy + ferramentas, into empty perfil\ dest
    const d2 = path.join(tmp, 'novo dois');
    fs.mkdirSync(path.join(d2, 'perfil'), { recursive: true });
    const r2 = await migrar({ ...base, destino: d2, copiarProjetos: true, copiarFerramentas: true });
    ok(r2.erros.length === 0, 'run2 errors: ' + r2.erros.join('; '));
    process.env.FCC_RAIZ = d2;
    ok(lst(path.join(d2, 'projects', 'app ç', 'src.js')) && lst(path.join(d2, 'projects', 'app ç', '.git', 'HEAD')), 'project copied with .git');
    ok(!lst(path.join(d2, 'projects', 'app ç', 'node_modules')) && !lst(path.join(d2, 'projects', 'app ç', 'dist')), 'node_modules/dist skipped');
    ok(!lst(path.join(d2, 'projects', 'FCC')), 'FCC folder not copied');
    ok(lst(path.join(d2, 'ferramentas', 'x', 'big.bin')), 'ferramentas copied with flag');
    const novoApp = path.join(d2, 'projects', 'app ç');
    const nk = C.chaveProjeto(novoApp);
    const pa = path.join(C.perfilClaude(), 'projects', nk, 'a.jsonl');
    ok(lst(pa) && !lst(path.join(C.perfilClaude(), 'projects', chave)), 'key renamed');
    ok(lst(path.join(C.perfilClaude(), 'projects', nk + '-sub', 'b.jsonl')), 'sub key renamed');
    if (lst(pa)) {
      const ls = lerT(pa).trim().split('\n').map((l) => JSON.parse(l));
      ok(ls[0].cwd === novoApp && ls[0].t === 'ç' && ls[1].cwd === path.join(novoApp, 'sub'), 'cwd rewritten: ' + JSON.stringify(ls));
    }
    ok(JSON.parse(lerT(C.perfilJson())).pastas[0] === path.join(d2, 'projects'), 'pastas -> dest projects');

    // --simular writes nothing
    const d3 = path.join(tmp, 'novo tres');
    process.env.FCC_RAIZ = 'X:\\sentinela';
    const r3 = await migrar({ ...base, destino: d3, simular: true, copiarProjetos: true });
    ok(process.env.FCC_RAIZ === 'X:\\sentinela', 'caller FCC_RAIZ restored: ' + process.env.FCC_RAIZ);
    ok(!lst(d3), 'simular wrote nothing');
    ok(r3.total > 0, 'simular computes size');

    // sources untouched
    const depois = hashes(tmp);
    const novos = ['novo um', 'novo dois', 'novo tres', 'instalado', 'sem exe'].map((n) => path.join(tmp, n));
    const mudou = [];
    for (const k of Object.keys(antes)) if (antes[k] !== depois[k]) mudou.push('changed/removed ' + k);
    for (const k of Object.keys(depois)) if (!(k in antes) && !novos.some((n) => k === n || k.startsWith(n + path.sep))) mudou.push('new ' + k);
    ok(mudou.length === 0, 'sources changed: ' + mudou.slice(0, 5).join(' | '));
  } catch (e) { falhas++; console.log('EXCEPTION: ' + (e && e.stack)); }
  finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { } }

  // real-data smoke, read only
  const destReal = path.join(os.tmpdir(), 'migrar-simulacao-nao-criada-' + process.pid);
  const fccReal = process.env.FCC_ANTIGO || path.resolve(__dirname, '..', '..', '..', 'FCC');   // old FCC next to this repo (dev PC); skip when absent
  if (!lst(fccReal)) { console.log('real-data smoke skipped: no ' + fccReal); console.log(falhas ? falhas + ' failure(s)' : 'ok'); process.exit(falhas ? 1 : 0); }
  const p = spawnSync(process.execPath, [path.join(__dirname, 'migrar-perfil.js'), '--destino', destReal, '--fcc', fccReal, '--simular', '--copiar-projetos'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  ok(p.status === 0, 'real simular exit ' + p.status + ' ' + p.stderr);
  ok(!lst(destReal), 'real simular created destination');
  const m = /TOTAL: (.*)/.exec(p.stdout || '');
  console.log('simulated real size (with --copiar-projetos): ' + (m ? m[1] : '?'));
  const p2 = spawnSync(process.execPath, [path.join(__dirname, 'migrar-perfil.js'), '--destino', destReal, '--fcc', fccReal, '--simular'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const m2 = /TOTAL: (.*)/.exec(p2.stdout || '');
  console.log('simulated real size (default): ' + (m2 ? m2[1] : '?'));

  console.log(falhas ? `${falhas} failure(s)` : 'ok');
  process.exitCode = falhas ? 1 : 0;
})();
