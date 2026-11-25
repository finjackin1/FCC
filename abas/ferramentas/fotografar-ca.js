'use strict';
// Captures the new UI (tela\ca) in the real main.js, test mode (fake root, nothing saved). Uso: node ferramentas\fotografar-ca.js <pasta-saida>
const path = require('path'), fs = require('fs'), os = require('os');
const ABAS = path.join(__dirname, '..');
if (!process.versions.electron) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'fcc-ca-'));
  const saida = path.resolve(process.argv[2] || path.join(ABAS, '..', '..', '_ferramentas', 'temp', 'ca'));
  fs.mkdirSync(saida, { recursive: true });
  const r = require('child_process').spawnSync(require(path.join(ABAS, 'node_modules', 'electron')), [__filename],
    { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 120000, env: { ...process.env, FCC_TESTE_RAIZ: raiz, FCC_TESTE_CA: '1', FCC_SAIDA: saida } });
  try { fs.rmSync(raiz, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { }
  process.exit(r.status === null ? 1 : r.status);
}
const raiz = process.env.FCC_TESTE_RAIZ, SAIDA = process.env.FCC_SAIDA;
for (const n of ['Alfa', 'Beta', 'Gama']) {
  const d = path.join(raiz, 'projects', n); fs.mkdirSync(path.join(d, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), `# ${n}: projeto de teste\n`); fs.writeFileSync(path.join(d, 'docs', 'PARADA.md'), `# PARADA ${n}\nParado: x\n`);
}
fs.mkdirSync(path.join(raiz, 'perfil', 'dados'), { recursive: true }); fs.writeFileSync(path.join(raiz, 'perfil', 'dados', 'fcc.ini'), 'inicio=claude\r\n');
fs.mkdirSync(path.join(raiz, 'home'), { recursive: true });
process.env.FCC_RAIZ = raiz; process.env.USERPROFILE = path.join(raiz, 'home'); process.env.HOME = path.join(raiz, 'home');
process.env.PATH = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
process.argv.push('--roteiro', 'espera:3600000');
const { app, BrowserWindow, ipcMain } = require('electron');
require(path.join(ABAS, 'main.js'));
const trocar = (canal, fn) => { try { ipcMain.removeHandler(canal); } catch { } ipcMain.handle(canal, fn); };
const CONTA = { estado: 'ok', email: 'teste@teste.t', plano: 'pro' };
const HIST = [{ type: 'user', texto: 'pergunta antiga um', uuid: 'u1' },
  { type: 'assistant', id: 'h0', uuid: 'u1b', content: [{ type: 'thinking', thinking: 'Vou ler o arquivo e rodar o teste.' }, { type: 'tool_use', id: 'f1', name: 'Read', input: { file_path: 'C:\\x\\main.js' } }, { type: 'tool_use', id: 'f2', name: 'Bash', input: { command: 'npm test' } }, { type: 'tool_use', id: 'f3', name: 'Edit', input: { file_path: 'C:\\x\\main.js', old_string: 'a = 1', new_string: 'a = 2' } }] },
  { type: 'user', uuid: 'u1c', resultados: [{ id: 'f1', txt: 'linha 1\nlinha 2' }, { id: 'f2', txt: '3 testes passaram' }, { id: 'f3', txt: 'ok' }] },
{ type: 'assistant', id: 'h1', uuid: 'u2', content: [{ type: 'text', text: 'Resposta **antiga** um.\n\n- item\n- item 2' }] }];
trocar('conta', () => CONTA); trocar('preparar', () => ({ conta: CONTA, falhou: false }));
trocar('contas', () => []); trocar('lim-uso', () => null); trocar('chat-titulo', () => '');
trocar('chat-abrir', (e, o) => o.dir ? ({ sessao: o.sessao || 's-teste', comandos: [], historico: HIST }) : ({ erro: 'SEM PASTA (dir vazio)' }));
ipcMain.removeAllListeners('chat-enviar'); ipcMain.on('chat-enviar', () => { });
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const erros = [];
app.whenReady().then(async () => {
  let w; for (let i = 0; i < 50 && !w; i++) { await espera(200); w = BrowserWindow.getAllWindows().find(x => !x.isDestroyed() && /ca[\\/]index\.html/.test(x.webContents.getURL())); }
  if (!w) { console.log('janela ca não apareceu: ' + BrowserWindow.getAllWindows().map(x => x.webContents.getURL()).join(' | ')); app.exit(1); return; }
  const wc = w.webContents;
  wc.on('console-message', (e, lv, msg, ln, src) => { if (lv >= 2) erros.push(msg + ' @' + path.basename(src || '') + ':' + ln); });
  await espera(3000);
  const foto = async (nome) => { const img = await wc.capturePage(); fs.writeFileSync(path.join(SAIDA, nome + '.png'), img.toPNG()); console.log('foto ' + nome); };
  const js = (c) => wc.executeJavaScript(c).catch(e => 'ERRO ' + e.message);
  console.log('erros iniciais:', JSON.stringify(await js('window.__erros||[]')));
  await foto('1-inicio');
  const passos = (process.env.FCC_PASSOS || '').split(';;').filter(Boolean);
  let i = 2; for (const p of passos) { console.log('passo', p.slice(0, 80), '->', JSON.stringify(await js(p))); await espera(1200); await foto(i++ + '-passo'); }
  console.log('erros console:', erros.length ? erros.join('\n') : 'nenhum');
  app.exit(0);
});
