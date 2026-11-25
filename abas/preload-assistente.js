// Bridge for the assistant window (assistente.js): only the chat calls it needs + voice.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  dados: () => ipcRenderer.invoke('assist-dados'),
  chatAbrir: (o) => ipcRenderer.invoke('chat-abrir', o),
  chatEnviar: (id, t) => ipcRenderer.send('chat-enviar', id, t),
  chatParar: (id) => ipcRenderer.invoke('chat-parar', id),
  chatPerm: (id, req, r) => ipcRenderer.send('chat-perm', id, req, r),
  chatFechar: (id) => ipcRenderer.send('chat-fechar', id),
  falar: (t) => ipcRenderer.invoke('assist-falar', t),
  calar: () => ipcRenderer.send('assist-calar'),
  esconder: () => ipcRenderer.send('assist-esconder'),
  abrirNoFcc: (sessao) => ipcRenderer.send('assist-abrir-fcc', sessao),
  ao: (canal, fn) => ipcRenderer.on(canal, (e, ...a) => fn(...a)),
});
