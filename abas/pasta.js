// Backend of the "Pasta do FCC" window: what is inside the install root, what can leave, send a copy, remove FCC.
// Logic only (no Electron import): main.js passes the Electron pieces in `dep`, tests pass fakes.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./caminhos');
const INV = require('./inventario');
const ENVIO = require('./envio');
const REM = require('./remover');

const CACHE_MS = 60000;
const AUTO_CHAVE = 'autoMemoryEnabled';   // Claude Code setting; stored in perfil\claude\settings.json (default on when absent)

// ---- sizes: async, never follows junctions/symlinks, one level of concurrency batches so the main process keeps breathing ----
const memo = new Map();   // folder path -> bytes, valid during one measurement round
async function tam(p) {
  let st;
  try { st = await fs.promises.lstat(p); } catch { return 0; }
  if (st.isSymbolicLink()) return 0;
  if (!st.isDirectory()) return st.size;
  const chave = path.resolve(p).toLowerCase();
  if (memo.has(chave)) return memo.get(chave);
  let nomes = [];
  try { nomes = await fs.promises.readdir(p); } catch { return 0; }
  let t = 0;
  for (let i = 0; i < nomes.length; i += 48) {
    const lote = await Promise.all(nomes.slice(i, i + 48).map((n) => tam(path.join(p, n))));
    for (const x of lote) t += x;
  }
  memo.set(chave, t);
  return t;
}

// Explorer-style units (1024). GB: one decimal, MB/KB: none; comma decimal.
function fmt(b) {
  b = Math.max(0, Number(b) || 0);
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(1).replace('.', ',') + ' GB';
  if (b >= 1024 ** 2) return Math.round(b / 1024 ** 2) + ' MB';
  return Math.round(b / 1024) + ' KB';
}
const gbNum = (b) => Math.round((b / 1024 ** 3) * 100) / 100;

const existe = (f) => { try { fs.lstatSync(f); return true; } catch { return false; } };
const subpastas = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; } };
const dentroDe = (pai, f) => { const r = path.relative(path.resolve(pai), path.resolve(f)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const foraDaRaiz = (d) => !dentroDe(C.raiz(), d) && !dentroDe(d, C.raiz());
const soma = async (lista) => { let t = 0; for (const p of lista) t += await tam(p); return t; };

// ---- memory-automatic setting ----
const arqSettings = () => path.join(C.perfilClaude(), 'settings.json');
function lerAuto() {
  try { const j = JSON.parse(fs.readFileSync(arqSettings(), 'utf8')); return j[AUTO_CHAVE] !== false; } catch { return true; }
}
function gravarAuto(v) {
  const f = arqSettings();
  let j = {};
  if (existe(f)) { try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { throw new Error('settings.json do perfil está com erro; não mexi nele'); } }
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('settings.json do perfil não é um objeto; não mexi nele');
  j[AUTO_CHAVE] = !!v;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const t = f + '.fcc-tmp';
  fs.writeFileSync(t, JSON.stringify(j, null, 2), 'utf8');
  fs.renameSync(t, f);
}

// ---- measured part of the data (cached) ----
async function medir(dep) {
  memo.clear();
  const R = C.raiz(), CL = C.perfilClaude(), CA = C.casa();
  const totalB = await tam(R);
  const [bPerfil, bProj, bConta, bFerr] = [await tam(C.perfil()), await tam(C.projetos()), await tam(C.conta()), await tam(C.ferramentas())];

  // profile items: map to whatever folders caminhos.js defines; missing ones are skipped
  let perfil = null;
  let vazio = true;
  try { vazio = fs.readdirSync(C.perfil()).length === 0; } catch { }
  if (!vazio) {
    const itens = [];
    const add = async (nome, desc, pastas) => { const ex = pastas.filter(existe); if (ex.length) itens.push([nome, desc, fmt(await soma(ex))]); };
    await add('Regras e preferências', 'Como o Claude trabalha com você', [C.regras(), path.join(CL, 'CLAUDE.md'), path.join(CL, 'settings.json')]);
    const skills = [path.join(CL, 'skills'), path.join(CA, 'skills')];
    const nSk = skills.reduce((n, d) => n + subpastas(d).length, 0);
    await add('Skills', `${nSk} skills`, skills);
    await add('Memórias e lições', 'O que o Claude aprendeu com você', [path.join(CA, 'memoria'), path.join(CA, 'memoria-fcc'), path.join(CA, 'aprendizado')]);
    await add('Conversas', 'Histórico de cada projeto', [path.join(CL, 'projects')]);
    await add('Dados do programa', 'Opções, grupos e conversas locais', [C.dados()]);
    perfil = { tam: fmt(bPerfil), itens };
  }

  // projects: top-level folders, biggest first
  const projetos = [];
  for (const nome of subpastas(C.projetos())) projetos.push([nome, await tam(path.join(C.projetos(), nome))]);
  projetos.sort((a, b) => b[1] - a[1]);

  const lista = await INV.listarDentroAsync(tam);
  const dentro = lista.map((x) => [x.nome, x.paraQue, fmt(x.tamanho), x.essencial]);
  const dentroB = lista.reduce((n, x) => n + x.tamanho, 0);

  const bRegras = await tam(C.regras());
  const bSkills = await soma([path.join(CL, 'skills'), path.join(CA, 'skills')]);

  return {
    total: fmt(totalB), bPerfil, bProj, bConta, bFerr, perfil,
    projetos: projetos.map(([n, b]) => [n, fmt(b)]), nProjetos: projetos.length,
    dentro, dentroTam: fmt(dentroB),
    envio: { regras: fmt(bRegras), skills: fmt(bSkills) },
    precisa: fmt(bPerfil + bProj),
  };
}

const maiuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function dataBR(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const z = (n) => String(n).padStart(2, '0');
  return `${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function criar(dep) {
  dep = dep || {};
  let cache = null, medindo = null;

  function medidas() {
    if (cache && Date.now() - cache.t < CACHE_MS) return Promise.resolve(cache.v);
    if (!medindo) medindo = medir(dep).then((v) => { cache = { t: Date.now(), v }; return v; }).finally(() => { medindo = null; });
    return medindo;
  }
  const esquecer = () => { cache = null; };

  async function dados() {
    const m = await medidas();
    const ativa = ((dep.contaAtiva && dep.contaAtiva()) || '').toLowerCase();
    const contas = ((dep.listarContas && dep.listarContas()) || []).map((c) => {
      if (c.expirou) return [c.email, 'Login expirou', 'amb'];
      const plano = maiuscula(c.plano || '');
      const eh = ativa && String(c.email).toLowerCase() === ativa;
      return [c.email, eh ? 'Conta ativa' + (plano ? ' · ' + plano : '') : (plano || 'Conta guardada'), 'ok'];
    });
    const sistema = INV.listarSistema().map((i) => {
      const dt = dataBR(i.data);
      const tit = i.conversa && dep.tituloConversa ? dep.tituloConversa(i.conversa) : '';
      return { id: i.id, nome: i.nome, sub: tit ? `${dt} · conversa "${tit}"` : dt, origem: i.origem || 'Detectado' };
    });
    const bl = (id, b, d) => ({ id, tam: fmt(b), gb: gbNum(b), d });
    return {
      raiz: C.raiz(), total: m.total,
      blocos: [
        bl('perfil', m.bPerfil, 'Regras, skills e conversas'),
        bl('projects', m.bProj, `Pasta projects: ${m.nProjetos} projetos`),
        bl('conta', m.bConta, 'Seus logins. Não vai para o perfil'),
        bl('ferramentas', m.bFerr, 'Programas que se baixam de novo'),
      ],
      perfil: m.perfil,
      outro: (dep.getOutro && dep.getOutro()) || null,
      auto: lerAuto(),
      contas,
      projetos: m.projetos, nProjetos: m.nProjetos,
      dentro: m.dentro, dentroTam: m.dentroTam,
      sistema,
      envio: m.envio, precisa: m.precisa,
    };
  }

  const falha = (msg) => ({ ok: false, msg });

  async function abrir(arg) {
    const mapa = { raiz: C.raiz(), perfil: C.perfil(), ferramentas: C.ferramentas() };
    let p = typeof arg === 'string' && Object.hasOwn(mapa, arg) ? mapa[arg] : null;
    if (!p && arg === 'envio') p = dep.ultimoEnvio || null;
    else if (!p && typeof arg === 'string' && dep.ultimoEnvio && path.resolve(arg) === path.resolve(dep.ultimoEnvio)) p = arg;
    if (!p) return falha('pasta desconhecida');
    const r = await dep.abrir(p);
    return r ? falha(String(r)) : { ok: true };
  }

  async function desinstalar(id) {
    const it = INV.listarSistema().find((i) => i.id === id);
    if (!it) return falha('item não encontrado');
    if (it.desinstalar) {
      try { dep.executar(it.desinstalar); return { ok: true, msg: 'Desinstalador aberto' }; } catch (e) { return falha(e.message); }
    }
    await dep.abrirUri('ms-settings:appsfeatures');
    return { ok: true, msg: 'Abri Aplicativos instalados do Windows' };
  }

  async function tirar(nome) {
    if (typeof nome !== 'string' || !nome || /[\\/]/.test(nome) || nome === '.' || nome === '..') return falha('nome inválido');
    const it = INV.dentroBase().find((x) => x.nome === nome);
    if (!it) return falha('essa pasta não está em ferramentas');
    if (it.essencial) return falha('Essa ferramenta é necessária para o FCC funcionar');
    try { await dep.lixeira(C.ferramentas(nome)); } catch (e) { return falha('não consegui mandar para a Lixeira: ' + e.message); }
    esquecer();
    return { ok: true };
  }

  async function enviar() {
    const base = await dep.escolherPasta('Escolha onde guardar a cópia do perfil');
    if (!base) return { ok: false, cancelado: true };
    if (!foraDaRaiz(base)) return falha('Escolha uma pasta fora da pasta do FCC');
    const destino = path.join(base, 'perfil-para-enviar');
    let out;
    try { out = ENVIO.prepararEnvio(destino); } catch (e) { return falha(e.message); }
    dep.ultimoEnvio = destino;
    return { ok: true, pasta: destino, tam: fmt(await (async () => { memo.clear(); return tam(destino); })()), retidos: out.retidos.length, caminhosPessoais: out.caminhosPessoais.length };
  }

  async function remover(arg) {
    const salvar = !!(arg && arg.salvar);
    let salvarPerfilEm = null;
    if (salvar) {
      const base = await dep.escolherPasta('Escolha onde guardar o perfil antes de remover');
      if (!base) return { ok: false, cancelado: true };
      if (!foraDaRaiz(base)) return falha('Escolha uma pasta fora da pasta do FCC');
      for (const sub of ['perfil', 'projects']) {
        let n = [];
        try { n = fs.readdirSync(path.join(base, sub)); } catch { }
        if (n.length) return falha(`Já existe uma pasta "${sub}" não vazia ali; escolha outro lugar`);
      }
      const m = await medidas();
      const precisa = (m.bPerfil || 0) + (m.bProj || 0);
      try {
        const st = (dep.espacoLivre || ((d) => { const x = fs.statfsSync(d); return x.bavail * x.bsize; }))(base);
        if (Number.isFinite(st) && st < precisa) return falha(`Precisa de ${fmt(precisa)} livres nesse disco; tem ${fmt(st)}`);
      } catch { }
      salvarPerfilEm = base;
    }
    let r;
    try { r = await (dep.executarRemocao || REM.executarRemocao)({ pararTudo: dep.pararTudo, salvarPerfilEm, pid: process.pid }); }
    catch (e) { return falha(e.message); }
    if (dep.sair) setTimeout(dep.sair, 600);
    return { ok: true, perfilSalvo: r && r.perfilSalvo ? r.perfilSalvo.destino : null, erros: (r && r.erros) || [] };
  }

  async function acao(nome, arg) {
    try {
      switch (nome) {
        case 'abrir': return await abrir(arg);
        case 'auto': gravarAuto(!!arg); return { ok: true, auto: lerAuto() };
        case 'ignorar': return INV.ignorar(String(arg)) ? { ok: true } : falha('item não encontrado');
        case 'desinstalar': return await desinstalar(String(arg));
        case 'tirar': return await tirar(arg);
        case 'enviar': return await enviar();
        case 'remover': return await remover(arg);
        default: return falha('ação desconhecida: ' + nome);
      }
    } catch (e) { return falha(e && e.message ? e.message : String(e)); }
  }

  return { dados, acao, esquecer };
}

module.exports = { criar, fmt, tam, lerAuto, gravarAuto, AUTO_CHAVE };
