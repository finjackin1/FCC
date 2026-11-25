// History of changes made by a conversation (pure; file reader injected): files edited by Edit/MultiEdit/Write (anywhere on the PC)
// and system-changing commands (Bash/PowerShell: installs, file writes, registry...), newest first.
const path = require('path');
const CAP = 600;
const linhas = (s) => { s = String(s == null ? '' : s); if (!s) return []; const l = s.split(/\r?\n/); if (l[l.length - 1] === '') l.pop(); return l; };

// does a shell command change something on the PC? (reads, lists and tests don't count)
const MUDA = /(^|[\s;|&(])(set-content|add-content|out-file|new-item|remove-item|rename-item|move-item|copy-item|set-itemproperty|new-itemproperty|remove-itemproperty|set-executionpolicy|rm|del|rmdir|mkdir|md|mv|move|cp|copy|ren|touch|tee|chmod|setx|schtasks|taskkill|stop-process|expand-archive|compress-archive|unzip|reg\s+(add|delete|import)|sed\s+-i|winget\s+(install|uninstall|upgrade)|(npm|pnpm|yarn)\s+(i|install|add|uninstall|remove|update)|pip3?\s+(install|uninstall)|choco\s+(install|uninstall|upgrade)|scoop\s+(install|uninstall)|git\s+(commit|push|pull|checkout|reset|merge|rebase|add|rm|mv|clean|stash)|dotnet\s+(add|new))\b/i;
const redireciona = (c) => /(?<![=\-<>])>>?\s*[^\s=&|>]/.test(c.replace(/\d?>&\d|\d?>\s*(\/dev\/null|\$null|nul)\b/gi, ''));
const mudaSistema = (cmd) => !!cmd && (MUDA.test(cmd) || redireciona(cmd));
const caminhos = (cmd) => [...new Set((String(cmd).match(/[A-Za-z]:[\\/][^\s"'|;<>`]+/g) || []).map(p => p.replace(/[),.]+$/, '')))].slice(0, 12);

function resumo(registros, dir, lerArquivo) {
  const mapa = new Map(), cmds = [];
  for (const r of registros || []) {
    const inp = r.input || {};
    if (r.nome === 'Bash' || r.nome === 'PowerShell') {
      const cmd = String(inp.command || ''); if (!mudaSistema(cmd)) continue;
      const h = [['@', 'comando ' + (r.nome === 'Bash' ? 'Bash' : 'PowerShell') + (r.dir ? ' em ' + r.dir : '')]];
      for (const l of linhas(cmd).slice(0, 40)) h.push(['+', l]);
      const cs = caminhos(cmd); if (cs.length) { h.push(['@', 'mexe em']); for (const p of cs) h.push(['+', p]); }
      cmds.push({ tipo: 'cmd', f: linhas(cmd)[0].slice(0, 80), onde: r.dir || '', a: 0, r: 0, novo: false, h, t: r.t || 0 });
      continue;
    }
    const fp = inp.file_path; if (!fp) continue;
    const abs = path.isAbsolute(fp) ? fp : path.join(dir || '', fp);
    const rel = path.relative(dir || '', abs);
    const f = (!rel || rel.startsWith('..') || path.isAbsolute(rel)) ? abs.replace(/\//g, '\\') : rel.replace(/\//g, '\\');
    const chave = path.normalize(abs).toLowerCase();   // Windows: C:\\x, c:\\x and C:/x are one file
    let e = mapa.get(chave);
    if (!e) { e = { tipo: 'arq', f, abs: path.normalize(abs), onde: path.dirname(path.normalize(abs)), a: 0, r: 0, novo: false, h: [], t: 0 }; mapa.set(chave, e); }
    e.t = r.t || e.t;
    const add = (sinal, t) => { e.h.push([sinal, t]); if (sinal === '+') e.a++; else if (sinal === '-') e.r++; };
    const desf = r.desf || [], cab = (n, k) => desf.includes(String(k)) ? e.h.push(['@', n + ' · desfeito']) : e.h.push(r.id ? ['@', n, r.id + '|' + k] : ['@', n]);
    const edit = (velho, novo, k) => {
      let n = 'trecho';
      try { const cont = String(lerArquivo(abs) || ''); const i = novo ? cont.indexOf(novo) : -1; if (i >= 0) n = 'linha ' + (cont.slice(0, i).split('\n').length); } catch { }
      cab(n, k);
      for (const l of linhas(velho)) add('-', l);
      for (const l of linhas(novo)) add('+', l);
    };
    if (r.nome === 'Write') {
      if (r.existia) { cab('arquivo reescrito', 'w'); for (const l of linhas(r.antes)) add('-', l); }
      else { e.novo = true; cab('arquivo novo', 'w'); }
      for (const l of linhas(inp.content)) add('+', l);
    } else if (r.nome === 'MultiEdit') (inp.edits || []).forEach((x, i) => edit(x.old_string, x.new_string, i));
    else edit(inp.old_string, inp.new_string, 0);
  }
  const out = [...mapa.values(), ...cmds].sort((a, b) => b.t - a.t);
  for (const e of out) if (e.h.length > CAP) { const n = e.h.length - CAP; e.h = e.h.slice(0, CAP); e.h.push(['@', `… mais ${n} linhas`]); }
  return out;
}
module.exports = { resumo, mudaSistema };
