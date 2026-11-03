// Packs the program into a temporary folder, tests the NEW .exe there (selftest + appearance 100% equal to the prototype) and only then updates
// the dev install root <repo>\dist\FCC in place (only what changed; user folders beside FCC.exe are never touched).
// NEVER closes the open program (the Claude runs inside it and would fall with it). With the program open, the new build goes to
// <root>\temp\atualizacao\pendente and the watcher (atualizar.js) applies it when the program closes and opens it again where it stopped.
// Usage (in the abas folder):  node ferramentas\empacotar.js [--reiniciar]
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
const TEMP = path.join(REPO, 'temp');
// main.js runs resources\app\ferramentas\atualizar.js, so that one tool file ships; the rest of ferramentas stays out.
// The folder itself must not be ignored, or its children would never be visited.
const ignorar = (p) => /^\/ferramentas\/(?!atualizar\.js$)/.test(p.replace(/\\/g, '/')) || /^\/\.git/.test(p) || /\/(\.playwright-cli|\.github)(\/|$)/.test(p.replace(/\\/g, '/')) || /^\/node_modules\/@anthropic-ai\/claude-agent-sdk-(win32|linux|darwin)/.test(p);   // the library uses the user's claude.exe, not the embedded one (300 MB)

(async () => {
  fs.mkdirSync(TEMP, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(TEMP, 'fcc-empacotar-'));
  console.log('building in', tmp);
  const [saida] = await packager({ dir: ABAS, out: tmp, name: 'FCC', executableName: 'FCC', platform: 'win32', arch: 'x64', icon: path.join(ABAS, 'icone.ico'),
    asar: false, prune: true, overwrite: true, quiet: true, ignore: ignorar,
    win32metadata: { FileDescription: 'FCC - finjackin Claude Center', ProductName: 'FCC', CompanyName: 'finjackin' } });
  const exeNovo = path.join(saida, 'FCC.exe');
  // license files ship beside FCC.exe (GPL + Agent SDK exception + notices); Electron's own LICENSE gets a clear name
  if (fs.existsSync(path.join(saida, 'LICENSE'))) fs.renameSync(path.join(saida, 'LICENSE'), path.join(saida, 'LICENSE-ELECTRON.txt'));
  for (const [de, para] of [['LICENSE', 'LICENSE.txt'], ['LICENSE-EXCEPTION.txt', 'LICENSE-EXCEPTION.txt'], ['THIRD-PARTY-NOTICES.txt', 'THIRD-PARTY-NOTICES.txt']]) {
    if (!fs.existsSync(path.join(REPO, de))) { console.log('NÃO APLICADO: falta', path.join(REPO, de)); return; }
    fs.copyFileSync(path.join(REPO, de), path.join(saida, para));
  }
  // selftest of the new .exe (window off screen; runs beside the open copy without touching it)
  const at = fs.mkdtempSync(path.join(TEMP, 'fcc-autoteste-'));
  // tests run on a throwaway root: the packaged folder must stay program-only (a run beside FCC.exe would create conta, perfil, temp inside it)
  const envTeste = { ...process.env, FCC_RAIZ: fs.mkdtempSync(path.join(TEMP, 'fcc-raiz-teste-')) };
  try { cp.execFileSync(exeNovo, ['--autoteste', at], { timeout: 120000, stdio: 'ignore', env: envTeste }); } catch (e) { console.log('autoteste: o .exe saiu com erro', e.message); }
  const res = fs.existsSync(path.join(at, 'resultado.txt')) ? fs.readFileSync(path.join(at, 'resultado.txt'), 'utf8') : 'SEM RESULTADO';
  console.log('autoteste:', res.trim().replace(/\n/g, ' | '), '| capturas em', at);
  // rule: every screen 100% equal to the prototype (shots of the new .exe against the prototype, never against old shots)
  let aprovado = true;
  try { const r = cp.execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'conferir.ps1'), '-ExeArq', exeNovo], { encoding: 'utf8', timeout: 400000, env: envTeste }); console.log('aparência:', r.trim().split(/\r?\n/).filter(l => /REPROV|APROV/.test(l)).join(' | ')); }
  catch (e) { aprovado = false; console.log('aparência: REPROVADO', String(e.stdout || '').trim().split(/\r?\n/).filter(l => /REPROV/.test(l)).join(' | ')); }
  if (!/erros js: 0/.test(res)) { aprovado = false; console.log('REPROVADO: erro de JavaScript na tela:', (res.match(/erros js: .*/) || ['sem contagem'])[0]); }
  if (!/terminal: ok/.test(res) || !aprovado) { console.log('NÃO APLICADO: o .exe de', RAIZ, 'continua o antigo. Corrija e rode de novo. Build testado em', saida); return; }

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
  if (process.argv.includes('--reiniciar')) { cp.spawn(EXE, ['--reiniciar-para-atualizar'], { detached: true, stdio: 'ignore' }).unref(); console.log('asked the program to save the tabs and restart already updated'); }
})().catch(e => { console.error('ERRO', e); process.exit(1); });
