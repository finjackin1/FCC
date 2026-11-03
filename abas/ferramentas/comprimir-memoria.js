// Comprime arquivos de memória (.md) em ultracave português, via claude CLI (23/10/2026, pedido dele: mínimo de tokens).
// Backup antes em FCC\familias\historico\2026-10-23-antes-caveman\projetos\. Recusa resultado < 25% ou que perdeu caminho/comando.
// Uso: node comprimir-memoria.js <arq.md> [...]   (env MODELO, padrão sonnet)
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const C = require('../caminhos');
const RAIZ = C.perfil(), BK = path.join(C.regras(), 'historico', '2026-10-23-antes-caveman', 'projetos');
const PROMPT = `Reescreva o arquivo de memória abaixo no MÍNIMO de palavras, em português, estilo "ultracave": fragmentos telegráficos, cada fato 1 vez, sem artigos/conectivos/explicação/justificativa/exemplo redundante/histórico do que já foi superado, sem repetir. META: no máximo METADE do tamanho original. Juntar itens parecidos numa linha. Leitor = Claude (entende abreviação óbvia).
NUNCA perder: regras, decisões, números, datas de decisão, nomes, caminhos, comandos, nomes de arquivo, URLs, código, crases, "não/nunca/só", passos de teste, pendências. Manter títulos markdown e linhas fixas (ex.: "SEMPRE AO ABRIR: ..." e "ID: NAO-EXCLUIR ..." e linhas que começam com @) EXATAS.
Responda SÓ com o arquivo novo, sem comentário, sem cercas de código em volta.

ARQUIVO:
`;
const env = { ...process.env }; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$/.test(k)) delete env[k];
const claude = path.join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe');
const tokens = (t) => (t.match(/`[^`]+`|[A-Za-z]:\\[^\s)`'"]+|https?:\/\/\S+/g) || []);
for (const f of process.argv.slice(2)) {
  try {
    const orig = fs.readFileSync(f, 'utf8');
    const b = path.join(BK, path.relative(RAIZ, f)); fs.mkdirSync(path.dirname(b), { recursive: true }); if (!fs.existsSync(b)) fs.writeFileSync(b, orig);
    const r = cp.spawnSync(claude, ['-p', '--model', process.env.MODELO || 'sonnet', '--tools', ''], { input: PROMPT + orig, encoding: 'utf8', env, timeout: 300000, maxBuffer: 1 << 24, windowsHide: true });
    let novo = String(r.stdout || '').trim().replace(/^```\w*\n|\n```$/g, '');
    if (!novo || novo.length < orig.length * 0.25) { console.log(`RECUSADO ${f}: saída vazia/curta demais`); continue; }
    const falta = tokens(orig).filter(x => !novo.includes(x));
    if (falta.length > 2) { console.log(`RECUSADO ${f}: perdeu ${falta.slice(0, 3).join(' | ')}`); continue; }
    if (novo.length >= orig.length) { console.log(`IGUAL ${f}`); continue; }
    fs.writeFileSync(f, novo + '\n'); console.log(`${orig.length} -> ${novo.length + 1}  ${path.relative(RAIZ, f)}`);
  } catch (e) { console.log(`ERRO ${f}: ${e.message}`); }
}
