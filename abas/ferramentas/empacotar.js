// Packs the program into a temporary folder, tests the NEW .exe there (selftest: screen opens whole, no JS error) and only then updates
// the dev install root <repo>\dist\FCC in place (only what changed; user folders beside FCC.exe are never touched).
// NEVER closes the open program (the Claude runs inside it and would fall with it). With the program open, the new build goes to
// <root>\temp\atualizacao\pendente and the watcher (atualizar.js) applies it when the program closes and opens it again where it stopped.
// Usage (in the abas folder):  node ferramentas\empacotar.js [--reiniciar]
//   --zip [file] only builds, tests and writes the release zip (FCC-<version>.zip); the dev install stays as it is
//   --reiniciar  asks the open program to save the tabs, close and come back updated (only with the user's approval)
'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { packager } = require('@electron/packager');
const A = require('./atualizar');

const ABAS = path.resolve(__dirname, '..');
const REPO = path.resolve(ABAS, '..');
const RAIZ = path.join(REPO, 'dist', 'FCC');          // dev install root
const TEMP = path.join(RAIZ, 'temp', 'build');        // 24/11: was <repo>	emp (project folder, never cleaned)
// main.js runs resources\app\ferramentas\atualizar.js, so that one tool file ships; the rest of ferramentas stays out.
// The folder itself must not be ignored, or its children would never be visited.
const ignorar = (p) => /^\/ferramentas\/(?!atualizar\.js$)/.test(p.replace(/\\/g, '/')) || /^\/\.git/.test(p) || /\/(\.playwright-cli|\.github)(\/|$)/.test(p.replace(/\\/g, '/')) || /^\/node_modules\/@anthropic-ai\/claude-agent-sdk-(win32|linux|darwin)/.test(p);   // the library uses the user's claude.exe, not the embedded one (300 MB)

(async () => {
  fs.rmSync(TEMP, { recursive: true, force: true }); fs.mkdirSync(TEMP, { recursive: true });   // only the last build's leftovers are kept
  const tmp = fs.mkdtempSync(path.join(TEMP, 'fcc-empacotar-'));
  console.log('building in', tmp);
  const [eletron] = await packager({ dir: ABAS, out: tmp, name: 'FCC', executableName: 'FCC', platform: 'win32', arch: 'x64', icon: path.join(ABAS, 'icone.ico'),
    asar: false, prune: true, overwrite: true, quiet: true, ignore: ignorar,
    win32metadata: { FileDescription: 'FCC - finjackin Claude Center', ProductName: 'FCC', CompanyName: 'finjackin' } });
  // 25/11 layout like FAH: root = FCC.exe (small launcher) + licenses + folders; the Electron program and its ~20 files go to modulos\
  const saida = path.join(tmp, 'FCC'), MOD = path.join(saida, 'modulos');
  fs.mkdirSync(saida, { recursive: true }); fs.renameSync(eletron, MOD);
  // Electron's own LICENSE gets a clear name and stays with its files in modulos; FCC's licenses (GPL + Agent SDK exception + notices) go to the root
  if (fs.existsSync(path.join(MOD, 'LICENSE'))) fs.renameSync(path.join(MOD, 'LICENSE'), path.join(MOD, 'LICENSE-ELECTRON.txt'));
  for (const [de, para] of [['LICENSE', 'LICENSE.txt'], ['LICENSE-EXCEPTION.txt', 'LICENSE-EXCEPTION.txt'], ['THIRD-PARTY-NOTICES.txt', 'THIRD-PARTY-NOTICES.txt']]) {
    if (!fs.existsSync(path.join(REPO, de))) { console.log('NÃO APLICADO: falta', path.join(REPO, de)); return; }
    fs.copyFileSync(path.join(REPO, de), path.join(saida, para));
  }
  // launcher: C# compiled by the .NET Framework csc.exe every Windows 10/11 has
  const CSC = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
  if (!fs.existsSync(CSC)) { console.log('NÃO APLICADO: falta o compilador', CSC); return; }
  const versao = require(path.join(ABAS, 'package.json')).version.replace(/[^0-9.]/g, '') || '0.0.0';
  const ver = path.join(tmp, 'Versao.cs');
  fs.writeFileSync(ver, `[assembly: System.Reflection.AssemblyVersion("${versao}")]\n[assembly: System.Reflection.AssemblyFileVersion("${versao}")]\n`, 'utf8');
  try { cp.execFileSync(CSC, ['/nologo', '/target:winexe', '/optimize+', '/codepage:65001', '/win32icon:' + path.join(ABAS, 'icone.ico'), '/out:' + path.join(saida, 'FCC.exe'), path.join(__dirname, 'lancador', 'FCC.cs'), ver], { stdio: 'pipe', windowsHide: true }); }
  catch (e) { console.log('NÃO APLICADO: o FCC.exe da raiz não compilou\n' + String(e.stdout || e.message)); return; }
  // selftest of the new build THROUGH the root launcher (window off screen; runs beside the open copy without touching it)
  const at = fs.mkdtempSync(path.join(TEMP, 'fcc-autoteste-')), resArq = path.join(at, 'resultado.txt');
  // tests run on a throwaway root: the packaged folder must stay program-only (a run beside FCC.exe would create conta, perfil, temp inside it)
  const envTeste = { ...process.env, FCC_RAIZ: fs.mkdtempSync(path.join(TEMP, 'fcc-raiz-teste-')) };
  try { cp.execFileSync(path.join(saida, 'FCC.exe'), ['--autoteste', at], { timeout: 30000, stdio: 'ignore', env: envTeste }); } catch (e) { console.log('autoteste: o FCC.exe da raiz saiu com erro', e.message); }
  for (let i = 0; i < 240 && !fs.existsSync(resArq); i++) await new Promise((r) => setTimeout(r, 500));   // launcher returns at once; the program writes the result
  await new Promise((r) => setTimeout(r, 1500));   // program exiting releases its files
  const res = fs.existsSync(resArq) ? fs.readFileSync(resArq, 'utf8') : 'SEM RESULTADO';
  console.log('autoteste:', res.trim().replace(/\n/g, ' | '), '| capturas em', at);
  // 24/11: old UI and its prototype comparison removed; gate = new screen opened with both parts and no JS error
  let aprovado = /tela nova abriu: 2 partes/.test(res);
  if (!aprovado) console.log('REPROVADO: a tela nova não abriu inteira');
  if (!/erros js: 0/.test(res)) { aprovado = false; console.log('REPROVADO: erro de JavaScript na tela:', (res.match(/erros js: .*/) || ['sem contagem'])[0]); }
  if (!aprovado) { console.log('NÃO APLICADO: o .exe de', RAIZ, 'continua o antigo. Corrija e rode de novo. Build testado em', saida); return; }

  // --zip <file>: release package (folder FCC\ at the zip top, program only); the dev install is not touched
  const iz = process.argv.indexOf('--zip');
  if (iz > 0) {
    const zip = path.resolve(process.argv[iz + 1] || path.join(TEMP, `FCC-${versao}.zip`));
    fs.mkdirSync(path.dirname(zip), { recursive: true }); fs.rmSync(zip, { force: true });
    const TAR = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');   // Windows bsdtar writes zip with -a
    cp.execFileSync(TAR, ['-a', '-c', '-f', zip, '-C', tmp, 'FCC'], { stdio: 'inherit', windowsHide: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('zip da release pronto:', zip, `(${Math.round(fs.statSync(zip).size / 1048576)} MB)`);
    return;
  }

  const { PEND, EXE } = A.caminhosAtualizacao(RAIZ);
  if (!A.rodando(RAIZ)) {
    const r = A.aplicar(saida, RAIZ); fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(PEND, { recursive: true, force: true });
    console.log(`${RAIZ} updated: ${r.novos} copied, ${r.iguais} same, ${r.removidos} removed (the program was closed)`);
    return;
  }
  // program open: the new build waits in temp\atualizacao\pendente; the watcher applies it when the program closes and opens it again
  fs.rmSync(PEND, { recursive: true, force: true }); fs.mkdirSync(path.dirname(PEND), { recursive: true }); fs.cpSync(saida, PEND, { recursive: true }); fs.rmSync(tmp, { recursive: true, force: true });
  A.soltarVigia(RAIZ, process.execPath);
  console.log('programa aberto: the new .exe is ready in', PEND, 'and enters by itself when the program closes (it opens again and continues where it stopped).');
  const d = A.diferencas(PEND, RAIZ), n = d.mudados.length + d.removidos.length;
  if (!n) { fs.rmSync(PEND, { recursive: true, force: true }); console.log('NADA MUDOU: o build é igual ao instalado'); return; }
  const pedido = process.argv.includes('--reiniciar') ? '--reiniciar-para-atualizar' : '--tela-ao-vivo';
  cp.spawn(EXE, [pedido], { detached: true, stdio: 'ignore' }).unref();
  if (pedido === '--reiniciar-para-atualizar') console.log('asked the program to save the tabs and restart already updated');
  else console.log(`${n} arquivo(s) mudaram: só CSS entra na hora; o resto espera o clique em "Atualizar agora" (ou o fechamento do programa)`);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
