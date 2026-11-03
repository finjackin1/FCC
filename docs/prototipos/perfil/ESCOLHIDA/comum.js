// Dados de exemplo e partes comuns às 3 propostas. Estado pelo endereço: proposta-B.html#perfil.outro
const D = {
  raiz: 'D:\\Programas\\FCC',
  blocos: [
    { id:'perfil', n:'Perfil', tam:'2,4 GB', gb:2.4, cor:'var(--c-perfil)', d:'Regras, skills e conversas', leva:true },
    { id:'projects', n:'Projetos', tam:'9,6 GB', gb:9.6, cor:'var(--c-proj)', d:'Pasta projects: 11 projetos', leva:true },
    { id:'conta', n:'Conta', tam:'12 MB', gb:.05, cor:'var(--c-conta)', d:'Seus logins. Não vai para o perfil', leva:false },
    { id:'ferramentas', n:'Ferramentas', tam:'3,1 GB', gb:3.1, cor:'var(--c-ferr)', d:'Programas que se baixam de novo', leva:false },
  ],
  perfil: [
    ['Regras e preferências','Como o Claude trabalha com você','48 KB'], ['Skills','31 skills','14 MB'], ['Memórias e lições','O que o Claude aprendeu','2 MB'],
    ['Conversas','Todo o histórico, para retomar','2,3 GB'], ['Dados do programa','Abas, rascunhos, estatísticas','420 KB'] ],
  contas: [['voce@exemplo.com','Conta ativa · Pro','ok'], ['outra@exemplo.com','Login expirou','amb']],
  dentro: [
    ['Claude Code','Motor das conversas','240 MB',true], ['Node.js','Usado pelo Claude nos projetos','92 MB'], ['.NET SDK','Compilar projetos em C#','783 MB'],
    ['Ollama e 1 modelo','IA local','2,0 GB'] ],
  sistema: [
    ['Visual C++ Redistributable','12/10/2026 · necessário para o Claude Code','Instalado pelo FCC'], ['GitHub CLI','28/10/2026 · conversa "Publicar Controles"','Detectado'],
    ['Python 3.13','02/11/2026 · conversa "Testes Som"','Detectado'] ],
};
const S = { t:'perfil', v:'', auto:true, salvar:true, entra:true, sel:'perfil', tarefa:'', pct:0 };
const $ = s => document.querySelector(s);
const lista = (itens, f) => `<div class="cartao">${itens.map(f).join('')}</div>`;
const Comum = {
  avisos() {
    if (S.v === 'outro') return `<div class="aviso"><span class="ponto amb"></span><div class="t">Este perfil veio de outro PC<small>Conversas ajustadas para a pasta nova. Faltam 2 ferramentas e o login de 1 conta.</small></div><button class="bt" data-a="baixar" data-dica="Baixa o Node.js e o .NET SDK para a pasta Ferramentas">Baixar ferramentas</button><button class="bt lev" data-a="entrar">Entrar na conta</button></div>`;
    return '';
  },
  perfil() {
    if (S.v === 'novo') return `<div class="vazio"><b>Sem perfil ainda</b>O FCC está limpo: sem regras, skills ou memórias.<br>Coloque a pasta <code>perfil</code> de outro PC em ${D.raiz} ou comece assim mesmo.<br><br><button class="bt pri" data-a="colocar">Abrir a pasta do FCC</button> <button class="bt lev" data-a="tira-v">Começar sem perfil</button></div>`;
    return `<div>${Comum.avisos()}<div class="sec">O que está no perfil <b>2,4 GB</b></div>${lista(D.perfil, i => `<div class="lin"><div class="t"><b>${i[0]}</b><small>${i[1]}</small></div><span class="tam">${i[2]}</span></div>`)}
      <div class="sec">Memória</div><div class="cartao"><div class="lin"><div class="t"><b>Memória automática</b><small>O Claude anota sozinho o que aprende. As anotações ficam no perfil.</small></div><button class="chave ${S.auto?'lig':''}" data-a="auto" role="switch" aria-checked="${S.auto}" aria-label="Memória automática" data-dica="Desligada, o Claude só sabe o que está nas regras e no PARADA"></button></div></div>
      <div class="sec">Contas <b>fora do perfil, na pasta conta</b></div>${lista(D.contas, i => `<div class="lin"><span class="ponto ${i[2]}"></span><div class="t"><b>${i[0]}</b><small>${i[1]}</small></div></div>`)}
      <div class="dica-lin">Para outro PC: copie as pastas perfil e projects. Para enviar a alguém, use "Enviar a um amigo", que tira o que é pessoal.</div></div>`;
  },
  instalado() {
    if (S.v === 'vazio') return `<div class="vazio"><b>Nada instalado ainda</b>Quando o Claude instalar algo, aparece aqui, com a conversa em que aconteceu.</div>`;
    return `<div><div class="sec">Dentro do FCC <b>3,1 GB</b></div>${lista(D.dentro, i => `<div class="lin"><div class="t"><b>${i[0]}</b><small>${i[1]}</small></div><span class="tam">${i[2]}</span>${i[3] ? '<span class="tag" data-dica="O FCC precisa dele para funcionar">Essencial</span>' : `<button class="bt lev" data-a="tirar" data-dica="Vai para a Lixeira. Dá para baixar de novo">Remover</button>`}</div>`)}
      <div class="sec">No sistema <b>${D.sistema.length}</b></div>${lista(D.sistema, i => `<div class="lin"><div class="t"><b>${i[0]}</b><small>${i[1]}</small></div><span class="tag" data-dica="${i[2]==='Detectado'?'Apareceu no PC durante uma conversa. Pode ter sido você quem instalou':'O FCC instalou porque precisava'}">${i[2]}</span><button class="bt lev" data-a="desinst" data-dica="Abre o desinstalador desse programa">Desinstalar</button><button class="bt lev" data-a="ignorar" data-dica="Tira da lista sem desinstalar">Ignorar</button></div>`)}
      <div class="dica-lin">Removendo o FCC, os itens do sistema continuam no PC. A decisão é sua, item por item.</div></div>`;
  },
  enviar() {
    if (S.v === 'pronto') return `<div><div class="aviso ok"><span class="ponto ok"></span><div class="t">Cópia pronta: perfil-para-enviar.zip (14 MB)<small>Conferida: nenhum login, e-mail, conversa ou caminho pessoal.</small></div><button class="bt" data-a="colocar">Mostrar na pasta</button></div></div>`;
    if (S.v === 'gerando') return `<div class="vazio"><b>Preparando a cópia</b>Retirando o que é pessoal e conferindo o resultado.<br><br><div class="barra" style="max-width:320px;margin:auto"><i style="width:${S.pct||60}%"></i></div></div>`;
    return `<div class="dois"><div><div class="sec">Vai junto</div>${lista([['Regras e preferências','48 KB'],['Skills, sem o que foi aprendido','14 MB']], i => `<div class="lin"><span class="ponto ok"></span><div class="t"><b>${i[0]}</b></div><span class="tam">${i[1]}</span></div>`)}</div>
      <div><div class="sec">Fica só com você</div>${lista(['Contas e login','Conversas','Memórias e lições','Projetos','Dados do programa'], i => `<div class="lin"><span class="ponto vm"></span><div class="t"><b>${i}</b></div></div>`)}</div></div>`;
  },
  remover() {
    if (S.v === 'andamento') return `<div class="vazio"><b>Removendo o FCC</b>Parando conversas e ajudantes. O FCC fecha e a pasta vai para a Lixeira.<br><br><div class="barra" style="max-width:320px;margin:auto"><i style="width:40%"></i></div></div>`;
    return `<div><div class="aviso vm"><span class="ponto vm"></span><div class="t">Tudo em ${D.raiz} vai para a Lixeira<small>Inclui perfil, projetos e contas. Depois de esvaziar a Lixeira, não tem volta.</small></div></div>
      <div class="dois"><div><div class="sec">Sai junto <b>15,1 GB</b></div>${lista(D.blocos, b => `<div class="lin"><span class="ponto" style="background:${b.cor}"></span><div class="t"><b>${b.n}</b></div><span class="tam">${b.tam}</span></div>`)}<div class="dica-lin">Também saem os atalhos, o item do menu do Windows e o início automático do FCC.</div></div>
      <div><div class="sec">Continua no PC <b>${D.sistema.length}</b></div>${lista(D.sistema, i => `<div class="lin"><div class="t"><b>${i[0]}</b><small>${i[2]}</small></div></div>`)}<div class="dica-lin">Veja em Instalado, se quiser desinstalar algum.</div></div></div>
      <div class="sec">Antes de remover</div><div class="cartao"><button class="lin" style="width:100%;text-align:left" data-a="salvar" role="checkbox" aria-checked="${S.salvar}"><span class="marca ${S.salvar?'lig':''}">${S.salvar?'✓':''}</span><div class="t"><b>Salvar perfil e projetos em outra pasta</b><small>Escolha a pasta ao confirmar. Precisa de 12 GB livres.</small></div></button></div></div>`;
  },
  botaoRemover: () => `<button class="bt per segurar" id="seg" data-dica="Segure 1 s para confirmar"><i></i><span>Segure para remover o FCC</span></button>`,
};
function dica() {
  const b = document.createElement('div'); b.id = 'bal'; document.body.append(b); let tm;
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-dica]'); clearTimeout(tm); b.classList.remove('on'); if (!el) return;
    tm = setTimeout(() => { b.textContent = el.dataset.dica; const r = el.getBoundingClientRect(); b.style.left = Math.min(innerWidth - 296, Math.max(8, r.left)) + 'px'; b.style.top = (r.bottom + 8 + 40 > innerHeight ? r.top - 40 : r.bottom + 8) + 'px'; b.classList.add('on'); }, 600); });
}
function iniciar(desenhar, agir) {
  const lerHash = () => { const [t, v] = location.hash.slice(1).split('.'); if (t) { S.t = t; S.sel = t; } S.v = v || ''; };
  if (location.search.includes('cena')) document.documentElement.classList.add('cena');
  const pinta = () => { $('#app').innerHTML = desenhar(); S.entra = false; };
  window.ir = (t, v = '') => { S.t = t; S.v = v; S.entra = true; history.replaceState(0, '', '#' + t + (v ? '.' + v : '')); pinta(); };
  document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a;
    if (a === 'auto') S.auto = !S.auto; else if (a === 'salvar') S.salvar = !S.salvar; else if (a === 'tira-v') S.v = ''; else if (a.startsWith('ir:')) { const [t, v] = a.slice(3).split('.'); return ir(t, v); } else if (agir && agir(a, el) === false) return; else return;
    pinta(); });
  let tm; document.addEventListener('pointerdown', e => { const s = e.target.closest('#seg'); if (!s) return; s.classList.add('segurando'); tm = setTimeout(() => ir('remover', 'andamento'), 1200); });
  document.addEventListener('pointerup', () => { clearTimeout(tm); document.querySelectorAll('.segurando').forEach(s => s.classList.remove('segurando')); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && agir) agir('esc'); });
  addEventListener('hashchange', () => { lerHash(); S.entra = true; pinta(); });
  lerHash(); dica(); window.pinta = pinta; pinta();
}
