// Assistant V1 (11/11/2026, plan "Assistente"; his choice: prototype B "Janelinha" + voice Vivienne).
// Small always-on-top window, bottom-right of the screen, hidden until Ctrl+Alt+Space (or tray item "Assistente").
// Talks to Claude through the same chat-* IPC as the main window: conversation ids start with 'assist', main.js enviar() routes them here.
// "Voz" mode: the reply is spoken (edge-tts with Python from PATH, package in ferramentas\edge-tts) → mp3 in temp\assistente, played by the window.
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { BrowserWindow, screen, globalShortcut, ipcMain } = require('electron');

const VOZ = 'fr-FR-VivienneMultilingualNeural', ATALHO = 'Control+Alt+Space', LARG = 400, ALT = 500, MARGEM = 16;

module.exports = function ({ C, logApp, LIVRE, tema, abrirNoFcc }) {
  let w = null, pronta = false, fila = [], nFala = 0, falaAtual = null;

  function criar() {
    w = new BrowserWindow({ width: LARG, height: ALT, frame: false, resizable: false, maximizable: false, minimizable: false, fullscreenable: false,
      alwaysOnTop: true, skipTaskbar: true, show: false, transparent: true, backgroundColor: '#00000000', title: 'Assistente', icon: path.join(__dirname, 'icone.ico'),
      webPreferences: { preload: path.join(__dirname, 'preload-assistente.js'), contextIsolation: true, sandbox: false } });
    w.setMenu(null); w.setAlwaysOnTop(true, 'floating');
    w.webContents.on('console-message', (e, ...a) => { const m = e.message || a[1], nv = e.level || a[0]; if (nv === 'error' || nv === 3) logApp('assistente console: ' + m); });
    w.webContents.on('render-process-gone', (e, d) => logApp('assistente caiu: ' + JSON.stringify(d)));
    w.webContents.on('did-finish-load', () => { pronta = true; for (const x of fila.splice(0)) w.webContents.send(...x); });
    w.on('closed', () => { w = null; pronta = false; });
    w.loadFile(path.join(__dirname, 'tela', 'assistente', 'index.html'));
  }
  // bottom-right of the screen where the mouse is, 16 px from the taskbar/edges
  function posicionar() {
    const a = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    w.setBounds({ x: a.x + a.width - LARG - MARGEM, y: a.y + a.height - ALT - MARGEM, width: LARG, height: ALT });
  }
  function mostrar() {
    if (!w) criar();
    if (!w.isVisible()) posicionar();
    w.show(); w.focus(); enviar('assist:mostrar', tema());
  }
  function alternar() { if (w && w.isVisible() && w.isFocused()) enviar('assist:esconder'); else mostrar(); }
  function enviar(canal, ...a) { if (!w) return; if (pronta) w.webContents.send(canal, ...a); else fila.push([canal, ...a]); }

  // ---- voice: text → mp3 (edge-tts). Python from PATH, else the usual per-user install ----
  function python() {
    const cands = ['python'];
    const loc = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Python');
    try { if (loc) for (const d of fs.readdirSync(loc).filter(x => /^Python3\d+$/.test(x)).sort().reverse()) cands.push(path.join(loc, d, 'python.exe')); } catch { }
    return cands;
  }
  function falar(texto) {
    const pasta = C.temp('assistente'); fs.mkdirSync(pasta, { recursive: true });
    for (const f of fs.readdirSync(pasta)) if (/^fala-\d+\.mp3$/.test(f)) { try { fs.unlinkSync(path.join(pasta, f)); } catch { } }   // only the last reply is kept
    if (falaAtual) { try { falaAtual.kill(); } catch { } falaAtual = null; }
    const arq = path.join(pasta, `fala-${++nFala}.mp3`), txt = String(texto).replace(/[*_`#>|]/g, '').slice(0, 3000);
    const env = { ...process.env, PYTHONPATH: C.ferramentas('edge-tts'), PYTHONIOENCODING: 'utf-8' };
    const cands = python();
    return new Promise((ok) => {
      const tentar = (i) => {
        if (i >= cands.length) return ok({ erro: 'Não achei o Python para a voz.' });
        const p = falaAtual = cp.spawn(cands[i], ['-m', 'edge_tts', '--voice', VOZ, '--text', txt, '--write-media', arq], { env, windowsHide: true });
        let err = ''; p.stderr.on('data', d => { err += d; });
        p.on('error', () => tentar(i + 1));
        p.on('close', (code) => { if (falaAtual === p) falaAtual = null; if (code === 0 && fs.existsSync(arq)) return ok({ arq }); if (code === null) return ok({ parou: true });
          logApp('assistente voz: ' + cands[i] + ' saiu ' + code + ' ' + err.slice(-300)); if (/No module named/.test(err)) return tentar(i + 1); ok({ erro: 'A voz não respondeu (sem internet?).' }); });
      };
      tentar(0);
    });
  }

  ipcMain.handle('assist-dados', () => ({ livre: LIVRE, tema: tema() }));
  ipcMain.handle('assist-falar', (e, t) => falar(t).catch(er => ({ erro: er.message })));
  ipcMain.on('assist-calar', () => { if (falaAtual) { try { falaAtual.kill(); } catch { } } });
  ipcMain.on('assist-esconder', () => { if (w) w.hide(); });
  ipcMain.on('assist-abrir-fcc', (e, sessao) => { if (w) w.hide(); abrirNoFcc(sessao); });

  let ok = false;
  try { ok = globalShortcut.register(ATALHO, alternar); } catch (e) { logApp('assistente atalho: ' + e.message); }
  if (!ok) logApp('assistente: atalho Ctrl+Alt+Espaço já está em uso por outro programa');
  const { app } = require('electron'); app.on('will-quit', () => { try { globalShortcut.unregister(ATALHO); } catch { } });

  return { mostrar, alternar, enviar, atalhoOk: ok, wc: () => w && w.webContents, destruir() { if (w) { try { w.destroy(); } catch { } } } };
};
