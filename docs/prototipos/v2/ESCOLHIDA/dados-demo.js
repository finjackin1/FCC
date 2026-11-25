// SAMPLE data of chosen interface (23/10/2026): used by prototype (motor.js) and app AUTOTEST (copy in
// abas\tela\v2\, by copiar-prototipo.ps1), so app and prototype shots have same content.
window.DEMO2 = (() => {
  // ---- sample data ----
  const P = [
    { n: 'FCC', prog: 1, l: 'F', st: 'testar', pend: ['teste', 'mudancas'], d: 'projetos e conversas do Claude Code', dt: '22/10', id: 'hoje', voce: 'fechar o programa uma vez e seguir PRA-TESTAR (L a S).', prox: 'esperar o relato dele.', itens: ['Linha "trabalhando" com a seta', 'Editar mensagem'] },
    { n: 'Painel', l: 'P', st: 'decidir', pend: ['decidir', 'mudancas'], d: 'hub dos aparelhos da casa', dt: '21/10', id: 'ontem', voce: 'escolher a cor do palco.', prox: 'aplicar a cor escolhida.', itens: [] },
    { n: 'Som', prog: 1, l: 'S', st: 'testar', d: 'equalizador e efeitos de todo o som', dt: '20/10', id: '2 dias', voce: '3 itens em PRA-TESTAR.', prox: 'ler o relato e corrigir.', itens: ['Travadas: usar o PC normal', 'Som 7.1 (jeito do Sonar)', 'Crossfeed (novo, aba Efeitos)'] },
    { n: 'Espelho', prog: 1, l: 'E', st: 'testar', pend: ['teste', 'publicado'], d: 'celular no PC', dt: '20/10', id: '2 dias', voce: '11 itens em PRA-TESTAR.', prox: 'ler o relato e corrigir.', itens: ['Barra do editor sem tranco', 'Câmera deitada'] },
    { n: 'Controles', l: 'C', st: 'livre', pend: ['publicar'], d: 'controles controles de jogo', dt: '18/10', id: '4 dias', voce: '', prox: '', itens: [] },
    { n: 'Bancada', l: 'B', st: 'livre', d: 'bancada de testes', dt: '15/10', id: '1 semana', voce: '', prox: '', itens: [] },
    { n: 'Teclado', l: 'T', st: 'livre', d: 'teclado sem o driver', dt: '11/10', id: '11 dias', voce: '', prox: '', itens: [] },
    { n: 'Narrador', l: 'N', st: 'parado', d: 'narrador de livros', dt: '02/10', id: '3 semanas', voce: '', prox: '', itens: [] },
  ];
  // sheet data (in app from disk): instructions, memory, past conversations
  for (const q of P) Object.assign(q, { dir: 'C:\\Projetos\\' + q.n, instr: q.d + '. Antes de mexer, ler o PARADA. Interface ≥ 99,50% igual ao protótipo escolhido…',
    mem: [{ n: 'PARADA.md', d: 'onde parou · ' + q.id, arq: 'docs\\PARADA.md' }, { n: 'CONTEXTO.md', d: 'ficha do projeto', arq: 'docs\\CONTEXTO.md' }, { n: 'contexto\\', d: '6 arquivos de detalhe', arq: 'docs\\contexto' }, { n: 'Memória do Claude', d: '3 notas sobre este projeto', arq: '' }],
    conversas: [{ id: 's1', txt: 'Linha "trabalhando" sem tranco', quando: 'hoje 00:10', tok: '410 mil' }, { id: 's2', txt: 'Build sem fechar o programa', quando: 'ontem 21:40', tok: '96 mil' }, { id: 's3', txt: 'Teste do PRA-TESTAR', quando: '21/10', tok: '31 mil' }] });
  // everything windows show (in app: tela\ponte.js builds with real data)
  const MIN = 6e4, H = 36e5, AGORA = +new Date(2026, 9, 28, 7, 36);   // account window countdown: reset moments in ms (like main.js), fixed clock lim.demo so photos match
  const D = {
    pasta: { raiz: 'C:\\FCC', total: '15,1 GB',
      blocos: [{ id: 'perfil', tam: '2,4 GB', gb: 2.4, d: 'Regras, skills e conversas' }, { id: 'projects', tam: '9,6 GB', gb: 9.6, d: 'Pasta projects: 11 projetos' }, { id: 'conta', tam: '12 MB', gb: .01, d: 'Seus logins. Não vai para o perfil' }, { id: 'ferramentas', tam: '3,1 GB', gb: 3.1, d: 'Programas que se baixam de novo' }],
      perfil: { tam: '2,4 GB', itens: [['Regras e preferências', 'Como o Claude trabalha com você', '48 KB'], ['Skills', '31 skills', '14 MB'], ['Memórias e lições', 'O que o Claude aprendeu', '2 MB'], ['Conversas', 'Todo o histórico, para retomar', '2,3 GB'], ['Dados do programa', 'Abas, rascunhos, estatísticas', '420 KB']] },
      outro: null, auto: true, contas: [['voce@exemplo.com', 'Conta ativa · Max', 'ok'], ['outra@exemplo.com', 'Login expirou', 'amb']],
      projetos: [['Jogo', '6,6 GB'], ['Clone', '1,3 GB'], ['Leitor', '784 MB'], ['Hub', '376 MB'], ['Mesa', '337 MB'], ['Espelho-app', '130 MB'], ['Teclas', '56 MB'], ['Controle', '24 MB'], ['Lab', '12 MB'], ['Chat', '8 MB'], ['FCC', '4 MB']], nProjetos: 11,
      dentro: [['claude-code', 'Motor das conversas', '240 MB', true], ['node', 'Usado pelo Claude nos projetos', '92 MB', false], ['dotnet', 'Compilar projetos em C#', '783 MB', false]], dentroTam: '1,1 GB',
      sistema: [{ id: 'vcredist', nome: 'Visual C++ Redistributable', sub: '12/10/2026 · necessário para o Claude Code', origem: 'Instalado pelo FCC' }, { id: 'gh', nome: 'GitHub CLI', sub: '28/10/2026 · conversa "Publicar Controle"', origem: 'Detectado' }, { id: 'py313', nome: 'Python 3.13', sub: '02/11/2026 · conversa "Testes FAH"', origem: 'Detectado' }],
      envio: { regras: '48 KB', skills: '14 MB' }, precisa: '12 GB' },
    contas: [{ email: 'voce@exemplo.com', plano: 'Max', quando: 'agora', assinou: new Date(2026, 5, 9).toISOString() }, { email: 'outra@exemplo.com', plano: 'Pro', quando: 'hoje 09:12', assinou: new Date(2026, 3, 30).toISOString(), uso: { sessao: { pct: 18, volta: '13:40', ate: AGORA + 6 * H + 4 * MIN }, semana: { pct: 71, volta: 'sexta às 10:00', ate: AGORA + 51 * H } } }],
    raiz: 'C:\\Projetos', conta: { email: 'voce@exemplo.com', plano: 'Max', desde: '18/10', versao: '2.1.98 · em dia' },
    lim: { demo: AGORA, sessao: { pct: 62, volta: '09:50', ate: AGORA + 2 * H + 14 * MIN }, semana: { pct: 35, volta: 'segunda às 08:00', ate: AGORA + 96 * H + 54 * MIN } },
    memConversa: 24,
    est: { total: '1,55 mi', rotulo: 'Tokens nos últimos 7 dias', delta: '▲ 18% que a semana passada', mini: [['chat', '14', 'conversas'], ['relogio', '6 h 10', 'com o Claude'], ['raio', '62%', 'do limite de 5 h']],
      dias: [['qui', 180], ['sex', 245], ['sáb', 60], ['dom', 35], ['seg', 290], ['ter', 410], ['qua', 330]], escala: [400, 300, 200, 100, 0], max: 420,
      proj: [['FCC', 570], ['Painel', 254], ['Som', 167], ['Espelho', 93], ['outros', 66]],
      recentes: [['FCC', 'Opus 5.5', 'hoje 00:10', '1 h 22', '410 mil'], ['Painel', 'Opus 5.5', 'ontem 21:40', '35 min', '96 mil'], ['Som', 'Sonnet 5.5', 'ontem 14:02', '12 min', '31 mil']] },
    regras: [{ n: 'Regras da casa', arq: 'CLAUDE-global.md', tx: 'Resposta curta e direta, português. Modo automático: com o aval, faz tudo sozinho… Parada sempre grave no PARADA.md…', pasta: 'A:\\…\\FCC\\familias' }, { n: 'Gostos', arq: 'GOSTOS.md', tx: 'Telas extras como janela por cima. Botões da barra estreitos, fechar 40 na borda; segurar 1 s sai…', pasta: 'A:\\…\\FCC\\familias' }, { n: 'Aprendizados', arq: 'APRENDIZADOS.md', tx: 'Botão dentro de um trecho que um timer refaz perde o clique… Programa em que o próprio Claude roda: o build nunca fecha…', pasta: 'A:\\…\\FCC\\familias' }],
    memorias: [{ id: 'm1', tx: 'Avaliação honesta > concordância', quando: 'hoje' }, { id: 'm2', tx: 'Ele testa pelo .exe, não pelo código', quando: '22/10' }, { id: 'm3', tx: 'Nunca publicar sem o aval dele naquele pedido', quando: '11/10' }], memPasta: '%USERPROFILE%\\.claude\\…\\memory',
    skills: [{ n: 'design-ux-ui', d: 'a porta da interface: 3 propostas antes de codar' }, { n: 'faxina-projeto', d: 'formato da casa para a pasta' }, { n: 'interface-polida', d: 'padrão de interface aprovado' }, { n: 'testar-com-ele', d: 'provar sozinho antes de pedir teste' }, { n: 'engenharia-reversa', d: 'mod, protocolo, decompilar' }],
    prep: { pct: 50, aviso: 'Num PC recém-formatado a 1ª vez leva alguns minutos; depois, 1 segundo.', et: [['Visual C++ (peça do Windows)', 'ok', 'ok'], ['Claude Code', 'ok', 'ok'], ['Regras e skills', 'esperando', 'espera'], ['Conta', 'esperando', 'espera']].map(([nome, txt, st]) => ({ nome, txt, st })) },
    rascunhos: [{ id: 'r1', titulo: 'Ideia: app de treino com o DualSense', quando: 'hoje 01:20' }, { id: 'r2', titulo: 'Prompt de troca de personagens', quando: 'ontem 22:05' }, { id: 'r3', titulo: 'Comparar placas de vídeo', quando: '21/10' }],
    assistentes: [{ id: 'a1', titulo: 'Previsão do tempo amanhã', quando: 'hoje 09:12' }, { id: 'a2', titulo: 'Lembrete da reunião', quando: 'ontem 18:40' }],
    sessao: [{ nome: 'Som' }, { nome: 'Espelho' }, { nome: 'Chat livre' }], fecharNome: 'FCC',
    versao: 'versão de 22/10 · 23:58', claudeVersao: '2.1.98 · em dia', pastas: ['C:\\Projetos', 'C:\\Trabalho'],
  };
  const CONVERSA = () => [
    { k: 'eu', txt: 'Continue de onde parou (docs\\PARADA.md).' },
    { k: 'ferr', verbo: 'Leu', alvo: 'docs\\PARADA.md', res: '40 linhas' }, { k: 'ferr', verbo: 'Leu', alvo: 'docs\\PRA-TESTAR.md', res: '52 linhas' },
    { k: 'ia', html: '<p>Li o PARADA. Paramos esperando o seu teste:</p><ul><li>Linha "trabalhando" com a seta</li><li>Editar mensagem</li><li>Conta e limites ao vivo</li></ul><p>Você precisa: fechar o programa uma vez; ele volta sozinho, novo.</p>' },
    { k: 'eu', txt: '@C:\\Users\\voce\\Desktop\\seta-erro.log\nA seta ao lado da ação não abre direito.' },
    { k: 'pensou', seg: 8, txt: 'Procurando onde a linha é desenhada.' }, { k: 'ferr', verbo: 'Buscou', alvo: 'rodapeHTML', res: '3 resultados' }, { k: 'ferr', verbo: 'Editou', alvo: 'abas\\tela\\app.js', res: 'salvo' },
    { k: 'ia', html: '<p>Achei: a linha era refeita 6 vezes por segundo e o clique se perdia. Agora só o ícone e o tempo mudam.</p>' },
  ];
  return { P, D, CONVERSA };
})();