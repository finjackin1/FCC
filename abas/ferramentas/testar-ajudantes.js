// Test (01/11): helpers stop on quit and report status. Isolated: own fake tree and temp folder, touches no real worker.
// Fake CLI = cmd.exe child of this node. Under it: node (helper) -> node (grandchild) must die; ping under node dies too (console tool);
// notepad-like program copy must SURVIVE (a program Claude opened stays open).
const cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const AJ = require('../ajudantes.js');
const dorme = (ms) => new Promise(r => setTimeout(r, ms));
const vivo = (p) => { try { process.kill(p, 0); return true; } catch { return false; } };
let falhas = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FALHA ') + t); if (!c) falhas++; };

(async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-ajud-')), pids = path.join(d, 'pids.txt');
  // program copy with a name outside the console tools list: stands for FAH or a game
  const prog = path.join(d, 'programa.exe'); fs.copyFileSync(process.execPath, prog);
  const neto = path.join(d, 'neto.js'), filho = path.join(d, 'filho.js');
  fs.writeFileSync(neto, `require('fs').appendFileSync(${JSON.stringify(pids)}, 'neto ' + process.pid + '\\n'); setInterval(() => {}, 1000);`);
  fs.writeFileSync(filho, `const cp = require('child_process'), fs = require('fs');
    fs.appendFileSync(${JSON.stringify(pids)}, 'filho ' + process.pid + '\\n');
    cp.spawn(process.execPath, [${JSON.stringify(neto)}], { stdio: 'ignore' });
    const p = cp.spawn(${JSON.stringify(prog)}, [${JSON.stringify(neto.replace('neto', 'prog'))}], { stdio: 'ignore', detached: true });   // node ties non-detached children to itself (job object): they'd die with it, whatever we do
    setInterval(() => {}, 1000);`);
  fs.writeFileSync(path.join(d, 'prog.js'), `require('fs').appendFileSync(${JSON.stringify(pids)}, 'prog ' + process.pid + '\\n'); setInterval(() => {}, 1000);`);
  const cli = cp.spawn('cmd.exe', ['/d', '/c', process.execPath, filho], { stdio: 'ignore', windowsHide: true });
  // a worker status file of this owner, a dead one and one of another program
  const vivoD = path.join(d, 'vivo'); fs.mkdirSync(vivoD);
  const orq = cp.spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const grava = (n, j) => fs.writeFileSync(path.join(vivoD, n), JSON.stringify(j));
  grava('a.json', { pid: orq.pid, fcc: process.pid, aba: 'A', id: 'w1', ult: 'Lendo main.js', n: 3, t: 1, outra: true });
  grava('morto.json', { pid: 999999, fcc: process.pid, aba: 'A', id: 'w2' });
  grava('outro.json', { pid: process.pid, fcc: 1, aba: 'B', id: 'w3' });

  process.on('exit', () => { try { cp.execFileSync('taskkill', ['/T', '/F', '/PID', String(cli.pid)], { stdio: 'ignore' }); } catch { } try { orq.kill(); } catch { } });   // failure mustn't leave them running
  for (let i = 0; i < 40 && !(fs.existsSync(pids) && fs.readFileSync(pids, 'utf8').trim().split('\n').length >= 3); i++) await dorme(250);
  const P = Object.fromEntries(fs.readFileSync(pids, 'utf8').trim().split('\n').map(l => l.trim().split(' ')).map(([k, v]) => [k, +v]));
  ok(P.filho && P.neto && P.prog, 'árvore falsa montada ' + JSON.stringify(P));

  const msgs = [], logs = [], A = AJ(vivoD, (c, aba, m) => msgs.push([c, aba, m]), (t) => logs.push(t));
  ok(A.ler().length === 1, 'só lê ajudante deste programa');
  ok(!fs.existsSync(path.join(vivoD, 'morto.json')), 'apaga arquivo de ajudante morto');
  ok(fs.existsSync(path.join(vivoD, 'outro.json')), 'não mexe no ajudante de outro programa');
  A.passo();
  ok(msgs.length === 1 && msgs[0][1] === 'A' && msgs[0][2].lista[0].ult === 'Lendo main.js', 'conversa recebe o que ele está fazendo');
  A.passo(); ok(msgs.length === 1, 'sem mudança não manda de novo');
  grava('a.json', { pid: orq.pid, fcc: process.pid, aba: 'A', id: 'w1', ult: 'Editando app.js', n: 4, t: 2, outra: true });
  A.passo(); ok(msgs.length === 2 && msgs[1][2].lista[0].n === 4, 'manda quando muda');

  const t0 = Date.now(); A.pararTudo('cmd.exe'); const ms = Date.now() - t0;
  await dorme(500);
  ok(!vivo(cli.pid), 'CLI falso parou');
  ok(!vivo(P.filho), 'ajudante filho parou');
  ok(!vivo(P.neto), 'neto parou');
  ok(!vivo(orq.pid), 'worker registrado parou');
  ok(vivo(P.prog), 'programa aberto pelo Claude continua aberto');
  ok(ms < 8000, `fechar levou ${ms} ms`); console.log('log:', logs.join(' | '));
  A.passo(); ok(msgs[msgs.length - 1][2].lista.length === 0, 'linha some quando o ajudante acaba');
  try { process.kill(P.prog); } catch { }
  await dorme(300); try { fs.rmSync(d, { recursive: true, force: true }); } catch { }
  console.log(falhas ? `FALHOU: ${falhas}` : 'Tudo certo'); process.exit(falhas ? 1 : 0);
})();
