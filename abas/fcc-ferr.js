// FCC's own tools for Claude (08/11, plan item 7; 21/11: FCC is Claude-only), served in-process by main.js.
// Pure parts here (definitions, PARADA/memory files); actions needing the window (model switch, notice, second opinion) come in ctx from main.js.
'use strict';
const path = require('path');
const fs = require('fs');

// campo: [tipo ('s' | 'a|b|c' enum), obrigatório, descrição]
const DEFS = [
  ['instalar_ferramenta', 'Antes de instalar um programa/ferramenta: devolve a pasta do FCC onde instalar (nunca no sistema sem perguntar) e registra no inventário com o comando de desinstalar.',
    { nome: ['s', true, 'nome curto, ex. ffmpeg'], motivo: ['s', true, 'para que serve'], desinstalar: ['s', false, 'comando para remover, se houver'] }],
  ['salvar_parada', 'Grava docs\\PARADA.md do projeto no formato padrão (onde parou), para qualquer IA continuar.',
    { em_andamento: ['s', true, 'o que está sendo feito agora'], feito: ['s', true, 'o que ficou pronto'], proximo: ['s', true, 'próximo passo exato'],
      mantido: ['s', false, 'pendências deixadas de propósito'], arquivos: ['s', false, 'arquivos mexidos'], pergunta: ['s', false, 'última pergunta feita a ele, ou nenhuma'] }],
  ['salvar_memoria', 'Guarda 1 fato durável (gosto dele, regra, decisão) na memória comum que todas as IAs leem.',
    { nome: ['s', true, 'slug-curto-em-kebab'], descricao: ['s', true, 'resumo de 1 linha'], tipo: ['user|feedback|project|reference', true, 'tipo do fato'],
      texto: ['s', true, 'o fato; feedback/project: com "Why:" e "How to apply:"'], so_projeto: ['sim|nao', false, 'sim = vale só para este projeto'] }],
  ['pedir_ajuda', 'Pede segunda opinião/revisão a outro Claude (só leitura) e devolve a resposta dele. Use em bug difícil ou revisão independente.',
    { pedido: ['s', true, 'tarefa completa: arquivos, contexto, o que se espera'] }],
  ['avisar', 'Mostra uma notificação do Windows para ele (tarefa longa terminou, precisa dele).', { texto: ['s', true, 'mensagem curta'] }],
  ['trocar_modelo', 'Troca modelo/pensamento desta conversa antes da próxima tarefa (menor que dá conta).',
    { modelo: ['s', true, 'haiku|sonnet|opus'], pensamento: ['low|medium|high', true, 'nível'], tarefa: ['s', true, 'qual tarefa'] }],
];

function jsonSchema(campos) {
  const properties = {}, required = [];
  for (const [k, [t, obr, d]] of Object.entries(campos)) { properties[k] = t === 's' ? { type: 'string', description: d } : { type: 'string', enum: t.split('|'), description: d }; if (obr) required.push(k); }
  return { type: 'object', properties, required };
}
function zodSchema(z, campos) {
  const o = {};
  for (const [k, [t, obr, d]] of Object.entries(campos)) { let s = t === 's' ? z.string() : z.enum(t.split('|')); s = s.describe(d); o[k] = obr ? s : s.optional(); }
  return o;
}
const lista = (sem = []) => DEFS.filter(d => !sem.includes(d[0])).map(([nome, descricao, campos]) => ({ nome, descricao, campos, schema: jsonSchema(campos) }));

// _perfil\memoria above the project (optional parent layout); else FCC home memory
function pastaMemoria(dir, casa) {
  let d = path.resolve(dir || '.');
  for (let i = 0; i < 6; i++) { const m = path.join(d, '_perfil', 'memoria'); if (fs.existsSync(path.join(m, 'MEMORY.md'))) return m; const up = path.dirname(d); if (up === d) break; d = up; }
  return casa ? path.join(casa, 'memoria') : null;
}
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const linha = (s) => String(s || '').replace(/\s*\r?\n\s*/g, ' ').trim();

function salvarParada(dir, a) {
  const f = path.join(dir, 'docs', 'PARADA.md'); fs.mkdirSync(path.dirname(f), { recursive: true });
  const t = [`# PARADA ${path.basename(dir)} ${hoje()}`, `In progress: ${linha(a.em_andamento)}`, `Done: ${linha(a.feito)}`, `Next step: ${linha(a.proximo)}`,
    a.mantido ? `Kept: ${linha(a.mantido)}` : '', a.arquivos ? `Files touched: ${linha(a.arquivos)}` : '', `Last question: ${linha(a.pergunta) || 'none'}`].filter(Boolean).join('\n') + '\n';
  fs.writeFileSync(f, t, 'utf8'); return `PARADA salva em ${f}`;
}
function salvarMemoria(dir, casa, a) {
  let m = pastaMemoria(dir, casa); if (!m) return 'erro: não achei a pasta de memória';
  const slug = String(a.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'fato';
  if (a.so_projeto === 'sim') { const p = path.join(m, 'projetos', path.basename(dir)); fs.mkdirSync(p, { recursive: true }); m = p; if (!fs.existsSync(path.join(m, 'MEMORY.md'))) fs.writeFileSync(path.join(m, 'MEMORY.md'), '', 'utf8'); }
  const f = path.join(m, slug + '.md'), novo = !fs.existsSync(f);
  fs.writeFileSync(f, `---\nname: ${slug}\ndescription: ${linha(a.descricao)}\nmetadata:\n  type: ${a.tipo || 'project'}\n---\n\n${String(a.texto || '').trim()}\n`, 'utf8');
  const idx = path.join(m, 'MEMORY.md'); let t = ''; try { t = fs.readFileSync(idx, 'utf8'); } catch { }
  const ln = `- [${slug}](${slug}.md) — ${linha(a.descricao)}`, re = new RegExp(`^- \\[[^\\]]*\\]\\(${slug.replace(/[-]/g, '\\-')}\\.md\\).*$`, 'm');
  t = re.test(t) ? t.replace(re, ln) : t.replace(/\s*$/, '') + (t.trim() ? '\n' : '') + ln + '\n';
  fs.writeFileSync(idx, t, 'utf8'); return `${novo ? 'Memória criada' : 'Memória atualizada'}: ${f}`;
}

// ctx = { dir, casa, raiz, inventario, modelo(a), avisar(texto), ajuda(pedido) }
async function executar(nome, a, ctx) {
  a = a || {};
  switch (nome) {
    case 'instalar_ferramenta': {
      const n = String(a.nome || '').replace(/[^\w.-]+/g, '-').slice(0, 40) || 'ferramenta', p = path.join(ctx.raiz, 'ferramentas', n);
      fs.mkdirSync(p, { recursive: true });
      try { ctx.inventario && ctx.inventario.registrar({ programas: [{ nome: `${a.nome} (${linha(a.motivo).slice(0, 60)})`, desinstalar: a.desinstalar || `rmdir /s /q "${p}"` }] }); } catch { }
      return `Instale em: ${p}\nRegistrado no inventário. Fora dessa pasta (sistema, PATH global, registro) só com permissão dele.`;
    }
    case 'salvar_parada': return salvarParada(ctx.dir, a);
    case 'salvar_memoria': return salvarMemoria(ctx.dir, ctx.casa, a);
    case 'pedir_ajuda': return (await ctx.ajuda(String(a.pedido || ''))) || '(sem resposta)';
    case 'avisar': ctx.avisar(String(a.texto || '').slice(0, 200)); return 'avisado';
    case 'trocar_modelo': return (await ctx.modelo(a)) || 'ok';
  }
  throw new Error('ferramenta desconhecida: ' + nome);
}

module.exports = { lista, zodSchema, executar, pastaMemoria, salvarParada, salvarMemoria };
