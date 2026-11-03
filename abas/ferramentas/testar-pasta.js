'use strict';
// Isolated test of abas\pasta.js: root, outside folders, fake trash all live in os.tmpdir(). No Electron, registry or network.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-pasta-'));
const raiz = path.join(base, 'Meu Lugar Ação');
process.env.FCC_RAIZ = raiz;

const PASTA = require('../pasta');
const C = require('../caminhos');
const INV = require('../inventario');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const existe = (f) => { try { fs.lstatSync(f); return true; } catch { return false; } };
const escrever = (f, conteudo) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, conteudo); };
const bytes = (n) => Buffer.alloc(n, 97);

async function main() {
  // ---- fixture ----
  const fora = path.join(base, 'fora');            // sibling of the root, never inside it
  const lixo = path.join(base, 'lixeira-fake');
  const grande = path.join(base, 'grande-fora');   // big folder outside the root, reached only through a junction
  fs.mkdirSync(fora, { recursive: true });
  fs.mkdirSync(lixo, { recursive: true });
  escrever(path.join(grande, 'enorme.bin'), bytes(3 * 1024 * 1024));

  escrever(path.join(raiz, 'perfil', 'claude', 'skills', 'a', 'SKILL.md'), bytes(2000));
  const settingsF = path.join(raiz, 'perfil', 'claude', 'settings.json');
  escrever(settingsF, JSON.stringify({ outra: 1, aninhado: { x: [1, 2] } }));
  escrever(path.join(raiz, 'projects', 'p1', 'f.txt'), bytes(5000));
  escrever(path.join(raiz, 'projects', 'p2', 'f.txt'), bytes(1000));
  escrever(path.join(raiz, 'conta', 'x', 'login.txt'), bytes(700));
  escrever(path.join(raiz, 'ferramentas', 'claude', 'claude.exe'), bytes(40000));
  escrever(path.join(raiz, 'ferramentas', 'extra-nao-essencial', 'x.bin'), bytes(20000));
  fs.symlinkSync(grande, path.join(raiz, 'projects', 'junc'), 'junction');

  // a system inventory item for ignorar
  INV.registrar({ programas: [{ nome: 'Programa Teste', desinstalar: 'C:\\x\\un.exe' }, { nome: 'Sem Desinstalador' }], path: [], inicio: [], servicos: [], atalhos: [], pastas: [] });

  // ---- fakes ----
  const reg = { abrir: [], abrirUri: [], executar: [], lixeira: [], remocao: [], sair: 0 };
  let escolha = null;
  const dep = {
    listarContas: () => [{ email: 'a@x', plano: 'pro' }, { email: 'b@x', expirou: true }],
    contaAtiva: () => 'A@x',
    escolherPasta: async () => escolha,
    abrir: async (p) => { reg.abrir.push(p); return ''; },
    abrirUri: async (u) => { reg.abrirUri.push(u); },
    executar: (c) => { reg.executar.push(c); },
    lixeira: async (p) => { reg.lixeira.push(p); fs.renameSync(p, path.join(lixo, path.basename(p))); },
    executarRemocao: async (o) => { reg.remocao.push(o); return { erros: [] }; },
    sair: () => { reg.sair++; },
    pararTudo: async () => { },
  };
  const P = PASTA.criar(dep);

  // ---- fmt ----
  assert.strictEqual(PASTA.fmt(0), '0 KB');
  assert.strictEqual(PASTA.fmt(1536 * 1024), '2 MB');
  assert.strictEqual(PASTA.fmt(1.5 * 1024 ** 3), '1,5 GB');

  // ---- dados() shape ----
  const d = await P.dados();
  assert.strictEqual(d.raiz, raiz);
  assert.strictEqual(typeof d.total, 'string');
  assert.deepStrictEqual(d.blocos.map((b) => b.id), ['perfil', 'projects', 'conta', 'ferramentas']);
  for (const b of d.blocos) { assert.strictEqual(typeof b.tam, 'string'); assert.strictEqual(typeof b.gb, 'number'); assert.strictEqual(typeof b.d, 'string'); }
  assert.deepStrictEqual(d.contas, [['a@x', 'Conta ativa · Pro', 'ok'], ['b@x', 'Login expirou', 'amb']]);
  assert.strictEqual(d.auto, true, 'auto defaults to true when key absent');
  assert.ok(d.perfil && d.perfil.itens.length >= 1, 'perfil block present');

  // projects sorted biggest first; junction target not counted
  const nomes = d.projetos.map((p) => p[0]);
  assert.strictEqual(nomes[0], 'p1');
  assert.ok(nomes.indexOf('p1') < nomes.indexOf('p2'));
  const jn = d.projetos.find((p) => p[0] === 'junc');
  assert.ok(!jn || jn[1] === '0 KB', 'junction not listed or counted as 0');
  assert.strictEqual(d.blocos[1].tam, '6 KB', 'projects total ignores junction target (' + d.blocos[1].tam + ')');
  assert.ok(!/MB|GB/.test(d.total), 'total does not include the 3 MB outside folder: ' + d.total);
  assert.strictEqual(d.blocos[2].tam, '1 KB');
  assert.strictEqual(d.blocos[3].tam, '59 KB');

  // dentro: essential flag
  const ess = d.dentro.find((x) => x[0] === 'claude'), nao = d.dentro.find((x) => x[0] === 'extra-nao-essencial');
  assert.ok(ess && ess[3] === true && ess[2] === '39 KB');
  assert.ok(nao && nao[3] === false && nao[2] === '20 KB');

  // sistema list
  assert.strictEqual(d.sistema.length, 2);

  // ---- cache: 2nd dados() within 60 s does not re-measure ----
  escrever(path.join(raiz, 'projects', 'p2', 'novo.txt'), bytes(100000));
  const d2 = await P.dados();
  assert.strictEqual(d2.projetos.find((p) => p[0] === 'p2')[1], '1 KB', 'cached: new file not seen yet');
  P.esquecer();
  const d3 = await P.dados();
  assert.strictEqual(d3.projetos.find((p) => p[0] === 'p2')[1], '99 KB', 'after esquecer: re-measured');
  assert.strictEqual(d3.projetos[0][0], 'p2', 'order follows size after re-measure');

  // ---- auto ----
  let r = await P.acao('auto', false);
  assert.deepStrictEqual(r, { ok: true, auto: false });
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(settingsF, 'utf8')), { outra: 1, aninhado: { x: [1, 2] }, autoMemoryEnabled: false });
  assert.strictEqual(PASTA.lerAuto(), false);
  r = await P.acao('auto', true);
  assert.strictEqual(r.auto, true);
  assert.strictEqual(JSON.parse(fs.readFileSync(settingsF, 'utf8')).outra, 1);
  assert.ok(!existe(settingsF + '.fcc-tmp'));
  // broken settings.json: refused, file untouched
  fs.writeFileSync(settingsF, '{ quebrado');
  r = await P.acao('auto', false);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(fs.readFileSync(settingsF, 'utf8'), '{ quebrado');
  assert.strictEqual(PASTA.lerAuto(), true, 'unreadable settings reads as default on');
  // array settings: refused too
  fs.writeFileSync(settingsF, '[1]');
  assert.strictEqual((await P.acao('auto', false)).ok, false);
  assert.strictEqual(fs.readFileSync(settingsF, 'utf8'), '[1]');

  // ---- abrir ----
  r = await P.acao('abrir', 'raiz');
  assert.deepStrictEqual(r, { ok: true });
  assert.strictEqual(reg.abrir[0], raiz);
  await P.acao('abrir', 'perfil'); await P.acao('abrir', 'ferramentas');
  assert.strictEqual(reg.abrir[1], C.perfil()); assert.strictEqual(reg.abrir[2], C.ferramentas());
  assert.strictEqual((await P.acao('abrir', 'envio')).ok, false, 'no send folder yet');
  assert.strictEqual((await P.acao('abrir', 'C:\\Windows')).ok, false, 'arbitrary path refused');
  for (const ruim of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) assert.strictEqual((await P.acao('abrir', ruim)).ok, false, 'prototype key refused: ' + ruim);
  assert.strictEqual(reg.abrir.length, 3);

  // ---- ignorar / desinstalar ----
  const progs = INV.listarSistema();
  const comUn = progs.find((i) => i.nome === 'Programa Teste'), semUn = progs.find((i) => i.nome === 'Sem Desinstalador');
  r = await P.acao('desinstalar', comUn.id);
  assert.strictEqual(r.ok, true); assert.deepStrictEqual(reg.executar, ['C:\\x\\un.exe']);
  r = await P.acao('desinstalar', semUn.id);
  assert.strictEqual(r.ok, true); assert.deepStrictEqual(reg.abrirUri, ['ms-settings:appsfeatures']);
  assert.strictEqual((await P.acao('desinstalar', 'nao:existe')).ok, false);
  assert.deepStrictEqual(await P.acao('ignorar', comUn.id), { ok: true });
  assert.strictEqual(INV.listarSistema().length, 1);
  assert.strictEqual((await P.acao('ignorar', 'nao:existe')).ok, false);

  // ---- tirar ----
  r = await P.acao('tirar', 'claude');
  assert.strictEqual(r.ok, false); assert.ok(existe(C.ferramentas('claude')), 'essential stays'); assert.strictEqual(reg.lixeira.length, 0);
  for (const ruim of ['..', '.', 'a\\b', 'a/b', '', null, 5, 'inexistente']) {
    r = await P.acao('tirar', ruim);
    assert.strictEqual(r.ok, false, 'refuses ' + JSON.stringify(ruim));
  }
  assert.strictEqual(reg.lixeira.length, 0);
  r = await P.acao('tirar', 'extra-nao-essencial');
  assert.deepStrictEqual(r, { ok: true });
  assert.ok(!existe(C.ferramentas('extra-nao-essencial')));
  assert.ok(existe(path.join(lixo, 'extra-nao-essencial', 'x.bin')));
  const d4 = await P.dados();   // tirar called esquecer(): re-measured
  assert.ok(!d4.dentro.find((x) => x[0] === 'extra-nao-essencial'));

  // ---- enviar ----
  escolha = null;
  assert.deepStrictEqual(await P.acao('enviar'), { ok: false, cancelado: true });
  escolha = path.join(raiz, 'temp');   // inside root
  fs.mkdirSync(escolha, { recursive: true });
  r = await P.acao('enviar');
  assert.strictEqual(r.ok, false); assert.ok(!existe(path.join(escolha, 'perfil-para-enviar')));
  escolha = base;                      // contains the root: also refused
  assert.strictEqual((await P.acao('enviar')).ok, false);
  escolha = fora;
  fs.writeFileSync(settingsF, JSON.stringify({ outra: 1 }));
  r = await P.acao('enviar');
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.ok(r.pasta.endsWith('perfil-para-enviar'));
  assert.strictEqual(r.pasta, path.join(fora, 'perfil-para-enviar'));
  assert.ok(existe(path.join(r.pasta, 'perfil', 'perfil.json')));
  assert.strictEqual(typeof r.tam, 'string');
  r = await P.acao('abrir', 'envio');
  assert.deepStrictEqual(r, { ok: true }); assert.strictEqual(reg.abrir[3], path.join(fora, 'perfil-para-enviar'));
  // second send to the same non-empty destination: refused, not overwritten
  assert.strictEqual((await P.acao('enviar')).ok, false);

  // ---- remover ----
  escolha = fora;
  fs.mkdirSync(path.join(fora, 'perfil'), { recursive: true });
  fs.writeFileSync(path.join(fora, 'perfil', 'algo.txt'), 'x');
  r = await P.acao('remover', { salvar: true });
  assert.strictEqual(r.ok, false); assert.strictEqual(reg.remocao.length, 0); assert.strictEqual(reg.sair, 0);
  // a non-empty "projects" there is refused too
  const comProj = path.join(base, 'com-proj'); fs.mkdirSync(path.join(comProj, 'projects'), { recursive: true });
  fs.writeFileSync(path.join(comProj, 'projects', 'y.txt'), 'y');
  escolha = comProj;
  r = await P.acao('remover', { salvar: true });
  assert.strictEqual(r.ok, false); assert.ok(/projects/.test(r.msg), r.msg); assert.strictEqual(reg.remocao.length, 0);
  // not enough free space: refused with the amount needed
  const vazia = path.join(base, 'vazia'); fs.mkdirSync(vazia);
  escolha = vazia; dep.espacoLivre = () => 10;
  r = await P.acao('remover', { salvar: true });
  assert.strictEqual(r.ok, false); assert.ok(/^Precisa de .+ livres/.test(r.msg), r.msg); assert.strictEqual(reg.remocao.length, 0);
  delete dep.espacoLivre;
  escolha = null;
  assert.deepStrictEqual(await P.acao('remover', { salvar: true }), { ok: false, cancelado: true });
  escolha = path.join(raiz, 'temp');
  assert.strictEqual((await P.acao('remover', { salvar: true })).ok, false, 'save target inside root refused');
  assert.strictEqual(reg.remocao.length, 0);
  // normal removal
  r = await P.acao('remover');
  assert.strictEqual(r.ok, true); assert.strictEqual(reg.remocao.length, 1);
  assert.strictEqual(reg.remocao[0].salvarPerfilEm, null);
  assert.strictEqual(typeof reg.remocao[0].pararTudo, 'function');
  await sleep(1000);
  assert.strictEqual(reg.sair, 1, 'sair called after removal');
  // removal saving the profile to an empty outside folder
  const limpa = path.join(base, 'limpa'); fs.mkdirSync(limpa);
  escolha = limpa;
  r = await P.acao('remover', { salvar: true });
  assert.strictEqual(r.ok, true); assert.strictEqual(reg.remocao[1].salvarPerfilEm, limpa);
  await sleep(1000);
  assert.strictEqual(reg.sair, 2);
  // failing removal: ok:false, no sair
  dep.executarRemocao = async () => { throw new Error('boom'); };
  r = await P.acao('remover');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.msg, 'boom');
  await sleep(900);
  assert.strictEqual(reg.sair, 2);

  // ---- unknown action ----
  r = await P.acao('nada');
  assert.strictEqual(r.ok, false);
}

function limpar() { try { fs.rmSync(base, { recursive: true, force: true }); } catch { } }

main().then(() => {
  limpar();
  console.log('ok testar-pasta');
}).catch((e) => {
  console.error('FALHOU testar-pasta:', e && e.stack || e);
  limpar();
  process.exit(1);
});
