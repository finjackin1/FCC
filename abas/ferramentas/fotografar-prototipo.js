// Fotografa as cenas do protótipo no MESMO motor do programa (Electron), para a conferência de aparência exigir 100% (25/10/2026, pedido dele).
// Antes era o Chrome: bordas suavizadas de outro jeito davam 0,01–0,2% de diferença em toda tela sem ser diferença de desenho.
// Uso: electron.exe ferramentas\fotografar-prototipo.js <proposta.html> <pasta saída> <cena,cena,...>
'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path'), url = require('url');
const [html, saida, lista] = process.argv.slice(-3);
app.on('window-all-closed', () => { });   // entre um lote e outro não há janela: sem isto o Electron sai
app.whenReady().then(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const cenas = lista.split(',').filter(Boolean), base = url.pathToFileURL(html).href;
  const foto = async (nome) => {
    const w = new BrowserWindow({ width: 1440, height: 810, frame: false, show: false, x: -4000, y: 100, skipTaskbar: true, webPreferences: { backgroundThrottling: false } });
    try { await w.loadURL(base + '#cena=' + nome); await new Promise(r => setTimeout(r, 1500));
      await w.webContents.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'); w.webContents.invalidate(); await new Promise(r => setTimeout(r, 150));
      fs.writeFileSync(path.join(saida, nome + '.png'), (await w.webContents.capturePage()).toPNG()); }
    catch (e) { console.log('ERRO ' + nome + ': ' + e.message); } finally { w.destroy(); }
  };
  for (let i = 0; i < cenas.length; i += 4) await Promise.all(cenas.slice(i, i + 4).map(foto));
  app.exit(0);
});
