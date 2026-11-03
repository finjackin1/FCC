// Changes summary per file from recorded Edit/MultiEdit/Write tool calls (pure; file reader injected)
const path = require('path');
const CAP = 600;
const linhas = (s) => { s = String(s == null ? '' : s); if (!s) return []; const l = s.split(/\r?\n/); if (l[l.length - 1] === '') l.pop(); return l; };

function resumo(registros, dir, lerArquivo) {
  const mapa = new Map();
  for (const r of registros || []) {
    const inp = r.input || {}; const fp = inp.file_path; if (!fp) continue;
    const abs = path.isAbsolute(fp) ? fp : path.join(dir || '', fp);
    const rel = path.relative(dir || '', abs);
    const f = (!rel || rel.startsWith('..') || path.isAbsolute(rel)) ? abs.replace(/\//g, '\\') : rel.replace(/\//g, '\\');
    const chave = path.normalize(abs).toLowerCase();   // Windows: C:\\x, c:\\x and C:/x are one file
    let e = mapa.get(chave);
    if (!e) { e = { f, a: 0, r: 0, novo: false, h: [] }; mapa.set(chave, e); }
    const add = (sinal, t) => { e.h.push([sinal, t]); if (sinal === '+') e.a++; else if (sinal === '-') e.r++; };
    const edit = (velho, novo) => {
      let n = 'trecho';
      try { const cont = String(lerArquivo(abs) || ''); const i = novo ? cont.indexOf(novo) : -1; if (i >= 0) n = 'linha ' + (cont.slice(0, i).split('\n').length); } catch { }
      add('@', n);
      for (const l of linhas(velho)) add('-', l);
      for (const l of linhas(novo)) add('+', l);
    };
    if (r.nome === 'Write') {
      if (r.existia) { add('@', 'arquivo reescrito'); for (const l of linhas(r.antes)) add('-', l); }
      else { e.novo = true; add('@', 'arquivo novo'); }
      for (const l of linhas(inp.content)) add('+', l);
    } else if (r.nome === 'MultiEdit') for (const x of inp.edits || []) edit(x.old_string, x.new_string);
    else edit(inp.old_string, inp.new_string);
  }
  const out = [];
  for (const e of mapa.values()) { if (e.h.length > CAP) { const n = e.h.length - CAP; e.h = e.h.slice(0, CAP); e.h.push(['@', `… mais ${n} linhas`]); } out.push(e); }
  return out;
}
module.exports = { resumo };
