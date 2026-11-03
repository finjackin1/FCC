'use strict';
// "Para testar" (25/10, user request): items checked in UI become [x] in project's docs\PRA-TESTAR.md (AI reads file and sees them as tested).
// Keeps BOM and line endings; only list lines whose text matches an item exactly, and never ones already [x].
const fs = require('fs');
function marcar(arq, itens) {
  if (!fs.existsSync(arq)) return { ok: false };
  const raw = fs.readFileSync(arq, 'utf8'), bom = raw.charCodeAt(0) === 0xFEFF, nl = raw.includes('\r\n') ? '\r\n' : '\n'; let n = 0;
  const L = raw.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => { const m = /^(\s*(?:-|\*|\d+[.)])\s+)(\[ \]\s*)?(.+)$/.exec(l); if (m && !/\[x\]/i.test(l) && itens.includes(m[3].trim())) { n++; return m[1] + '[x] ' + m[3]; } return l; });
  if (n) fs.writeFileSync(arq, (bom ? '\uFEFF' : '') + L.join(nl), 'utf8');
  return { ok: true, n };
}
module.exports = { marcar };
