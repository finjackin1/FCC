// Uso: node ferramentas\testar-caminhos.js  (só calcula caminhos; não grava nada)
'use strict';
const path = require('path');
const assert = require('assert');
const CAM = require.resolve('../caminhos.js');

function comRaiz(r, f) {
  const antes = process.env.FCC_RAIZ; process.env.FCC_RAIZ = r; delete require.cache[CAM];
  try { f(require(CAM)); } finally { if (antes === undefined) delete process.env.FCC_RAIZ; else process.env.FCC_RAIZ = antes; delete require.cache[CAM]; }
}
const dentro = (r, p) => { const rel = path.relative(r, p); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); };

for (const r of ['D:\\FCC', 'D:\\Meus Programas\\FCC Ação', 'C:\\Users\\José da Silva\\Área de Trabalho\\FCC']) {
  comRaiz(r, (C) => {
    assert.strictEqual(C.raiz(), r);
    for (const n of ['perfil', 'conta', 'configClaude', 'contas', 'perfilClaude', 'regras', 'casa', 'dados', 'perfilJson', 'projetos', 'ferramentas', 'temp', 'inventario']) assert(dentro(r, C[n]()), `${n} fora da raiz: ${C[n]()}`);
    assert(dentro(C.perfil(), C.dados('fcc.ini')), 'dados fora do perfil');
    assert(!dentro(C.perfil(), C.conta()), 'conta não pode estar no perfil');
    assert(!dentro(C.perfil(), C.configClaude()), 'config do Claude não pode estar no perfil');
    assert(!dentro(C.perfil(), C.projetos()), 'projects fica fora do perfil');
    assert(dentro(C.conta(), C.contas()), 'contas fica em conta');
  });
}
comRaiz('D:\\Meus Programas\\FCC Ação', (C) => assert.strictEqual(C.chaveProjeto('D:\\Projetos\\FCC'), 'D--Projetos-FCC'));
console.log('ok testar-caminhos');
