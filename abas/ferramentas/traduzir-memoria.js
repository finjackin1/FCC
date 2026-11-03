// Reescreve arquivos de memória (.md) em inglês telegráfico: menos tokens a cada leitura (25/10/2026, pedido dele: "o idioma que gaste
// menos token; eu não vou ler; respostas continuam em português"). O que a TELA do FCC mostra continua em português (1ª linha do
// CLAUDE.md, campos Parado/Próximo passo/O que ele precisa fazer do PARADA). Backup antes em FCC\familias\historico\2026-10-25-antes-ingles\.
// Recusa resultado que perdeu caminho/comando/código, continuou em português, cresceu ou ficou curto demais. Usa a biblioteca do Claude
// sem as regras dele (settingSources vazio: a regra "responda em português" não interfere).
// Medido 25/10 (GOSTOS.md): 4161 → 3370 tokens (-19%) com só -8% em bytes: inglês gasta menos token por byte.
// Uso: node traduzir-memoria.js [--modelo sonnet] [--n 5] <arq.md> [...]   ou   --lista arquivo.txt (1 caminho por linha)
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('../caminhos');
const RAIZ = C.perfil(), BK = path.join(C.regras(), 'historico', '2026-10-25-antes-ingles');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODELO = arg('--modelo', 'sonnet'), N = parseInt(arg('--n', '5'), 10);
let ARQS = process.argv.slice(2).filter((a, i, v) => !a.startsWith('--') && !['--modelo', '--n', '--lista'].includes(v[i - 1]));
if (arg('--lista')) ARQS = ARQS.concat(fs.readFileSync(arg('--lista'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));
const claude = path.join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe');
const S = require(path.join(__dirname, '..', 'node_modules', '@anthropic-ai', 'claude-agent-sdk'));

const BASE = `TRANSLATE the Portuguese Markdown memory file below INTO ENGLISH and compress it for an AI reader, with the MINIMUM number of tokens. The output prose MUST be English (Portuguese only where listed below as byte-identical): terse English, telegraphic fragments, each fact once, no filler, merge duplicates, drop history that newer lines supersede. Target: at most half the original tokens. "ele"/"o usuário" = the user.
NEVER lose: rules, decisions, numbers, decision dates, names, paths, commands, file names, URLs, code, negations (never/only/don't), test steps, pending items, reasons that change behavior.
KEEP BYTE-IDENTICAL (do not translate): YAML frontmatter "name:" value; lines starting with @; fenced code blocks; anything inside backticks; Windows paths; quoted UI texts and phrases the user types (Portuguese stays Portuguese, e.g. "continue", "pode começar"); file/folder/skill/program names; lines starting with "SEMPRE AO ABRIR:" or "ID: NAO-EXCLUIR".
Markdown headings may be shortened but keep their order.`;
function extra(f) {
  const b = path.basename(f).toLowerCase();
  if (b === 'claude.md' || b === 'claude-global.md') return 'Line 1 is shown to the user in the app: keep line 1 EXACTLY as it is (Portuguese). Rewrite the rest.';
  if (b === 'parada.md') return 'Keep line 1 exactly. Lines starting with "Parado:", "Motivo:", "Próximo passo:" or "O que ele precisa fazer:" are shown to the user: keep those labels and write their content in short Portuguese. Everything else terse English. Max 8 lines total.';
  if (b === 'skill.md') return 'Frontmatter "description:" becomes one terse English line that still lists the triggers (when to use). Keep the frontmatter block format.';
  if (/aprendizados|gostos|padroes/.test(b)) return 'One line per lesson/preference; keep each date tag like (25/out) or 2026-10-24.';
  return '';
}
// texto fora de crases/aspas ainda com cara de português (palavras comuns) = o modelo não traduziu
const ptDemais = (t) => { const x = t.replace(/```[\s\S]*?```|`[^`\n]*`|"[^"\n]*"/g, ' ').toLowerCase(); const pal = x.split(/[^a-zà-ú]+/).filter(Boolean); const pt = pal.filter(w => /^(que|não|nao|com|para|uma|um|ele|só|quando|antes|depois|sem|isso|tudo|fazer|então|porque|também|mais|pelo|pela|nos|das|dos)$/.test(w)).length; return pal.length > 30 && pt / pal.length > 0.04; };
const campoPt = /^\s*-?\s*(Parado|Motivo|Pr[oó]ximo passo|O que ele precisa fazer)\s*:/;     // campos do PARADA que a tela mostra: ficam em português
const marcas = (t) => [...new Set((t.match(/`[^`\n]+`|[A-Za-z]:\\[^\s)`'"<>|*]+|https?:\/\/[^\s)`'"<>]+|^@\S+/gm) || []).map(s => s.replace(/[.,;:]+$/, '')))];
async function um(f) {
  const orig = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
  const prompt = `${BASE}\n${extra(f)}\nOutput ONLY the new file content: no comment, no code fence around it.\n\nFILE (${path.basename(f)}):\n${orig}`;
  let novo = '';
  const env = { ...process.env }; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$/.test(k)) delete env[k];
  for await (const m of S.query({ prompt, options: { cwd: os.tmpdir(), env, pathToClaudeCodeExecutable: claude, settingSources: [], strictMcpConfig: true, model: MODELO, effort: 'low', maxTurns: 1, tools: [], systemPrompt: 'You translate and compress memory files for AI agents into terse English. Output only the rewritten file.' } }))
    if (m.type === 'result') novo = String(m.result || '');
  novo = novo.trim().replace(/^```\w*\r?\n([\s\S]*)\r?\n```$/, '$1');
  const rel = path.relative(RAIZ, f);
  if (!novo || novo.length < orig.length * 0.15) return `RECUSADO ${rel}: saída vazia/curta demais`;
  if (ptDemais(novo.split(/\r?\n/).slice(1).filter(l => !campoPt.test(l)).join('\n'))) return `RECUSADO ${rel}: continuou em português`;
  if (novo.length > orig.length * 1.1) return `IGUAL ${rel}`;
  const falta = marcas(orig).filter(x => !novo.includes(x));
  if (falta.length > 2) return `RECUSADO ${rel}: perdeu ${falta.slice(0, 3).join(' | ')}`;
  const l1 = orig.split(/\r?\n/)[0];
  if (/^(claude|claude-global|parada)\.md$/i.test(path.basename(f)) && novo.split(/\r?\n/)[0] !== l1) novo = l1 + '\n' + novo.split(/\r?\n/).slice(novo.split(/\r?\n/)[0].startsWith('#') ? 1 : 0).join('\n');
  const b = path.join(BK, rel); fs.mkdirSync(path.dirname(b), { recursive: true }); if (!fs.existsSync(b)) fs.writeFileSync(b, orig);
  fs.writeFileSync(f, novo + '\n');
  return `${orig.length} -> ${novo.length + 1}  ${rel}${falta.length ? '  (sem: ' + falta.join(' | ') + ')' : ''}`;
}
(async () => {
  const fila = [...new Set(ARQS.map(a => path.resolve(a)))]; let antes = 0, depois = 0;
  const trab = async () => { while (fila.length) { const f = fila.shift(); const a = fs.statSync(f).size; let r;
    try { r = await um(f); } catch (e) { r = `ERRO ${path.relative(RAIZ, f)}: ${e.message}`; }
    const m = r.match(/^(\d+) -> (\d+)/); if (m) { antes += +m[1]; depois += +m[2]; } else { antes += a; depois += a; } console.log(r); } };
  await Promise.all(Array.from({ length: Math.max(1, N) }, trab));
  console.log(`TOTAL ${antes} -> ${depois} bytes (${Math.round(100 - depois * 100 / Math.max(1, antes))}% menor)`);
})();
