// Test: auto mode rules (auto.js). Temp dirs, no network.
// Run: node abas\ferramentas\testar-unidades.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const ABAS = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-unid-')), PROJ = path.join(TMP, 'proj'); fs.mkdirSync(PROJ);
const limpa = () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { } };

let n = 0; const falhas = [];
const confere = (nome, ok, det) => { n++; console.log((ok ? 'ok   ' : 'FALHOU') + ` ${n} ${nome}` + (ok ? '' : ': ' + (det === undefined ? '' : typeof det === 'string' ? det : JSON.stringify(det)))); if (!ok) falhas.push(nome); };

// ---- AZ: auto.js rules ----
{
  const arq = path.join(TMP, 'auto.json'), logs = [];
  const mk = () => require('../auto.js')(arq, (m) => logs.push(m));
  const A = mk();
  const novo = () => ({ modelo: 'sonnet', esf: 'low', auto: {} });
  const ESC = A.ESCADA, idx = (m, e) => ESC.findIndex(x => x[0] === m && x[1] === e);
  let c = novo(), r = A.escolher(c, 'oi');
  confere('AZ "oi" -> Haiku', r && r.modelo === 'haiku', r);
  c = novo(); r = A.escolher(c, 'mude a cor do botão para azul');
  // 24/11 ladder: change request = Sonnet medium, hard = Sonnet high, big = Opus
  confere('AZ pedido de mudança -> Sonnet médio', r && r.modelo === 'sonnet' && r.esf === 'medium' && r.tipo === 'tarefa', r);
  c = novo(); r = A.escolher(c, 'o app trava e dá crash quando abro');
  confere('AZ bug/travamento -> Sonnet alto', r && r.modelo === 'sonnet' && r.esf === 'high' && r.tipo === 'difícil', r);
  c = novo(); r = A.escolher(c, 'reescreva o projeto do zero');
  confere('AZ trabalho grande -> Opus médio', r && r.modelo === 'opus' && r.esf === 'medium', r);
  // teach: after a change request the user switches to Opus high → next similar request gets taught step
  c = novo(); r = A.escolher(c, 'mude a cor do botão para azul'); c.modelo = r.modelo; c.esf = r.esf;
  const antes = idx(c.modelo, c.esf);
  A.trocouNaMao(c, 'opus', 'high'); c.modelo = 'opus'; c.esf = 'high';
  r = A.escolher(c, 'troque o texto do rodapé');
  const depois = r ? idx(r.modelo, r.esf) : idx(c.modelo, c.esf);
  confere('AZ trocar na mão ensina: próximo pedido parecido sobe um degrau', depois === antes + 1, { antes, depois, r });
  // learning persists on disk and is read by a new instance
  const B = mk(), c2 = novo(), r2 = B.escolher(c2, 'troque a fonte do título');
  confere('AZ aprendizado salvo no json e lido por outra instância', fs.existsSync(arq) && idx(r2 ? r2.modelo : 'sonnet', r2 ? r2.esf : 'low') === antes + 1, r2);
}

limpa();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo'); process.exit(falhas.length ? 1 : 0);
