// SAMPLE data of chosen interface (23/10/2026): used by prototype (motor.js) and app AUTOTEST (copy in
// abas\tela\v2\, by copiar-prototipo.ps1), so app and prototype shots have same content.
window.DEMO2 = (() => {
  // ---- sample data ----
  const P = [
    { n: 'FCC', prog: 1, l: 'F', st: 'testar', pend: ['teste', 'mudancas'], d: 'projetos e conversas do Claude Code', dt: '22/10', id: 'hoje', voce: 'fechar o programa uma vez e seguir PRA-TESTAR (L a S).', prox: 'esperar o relato dele.', itens: ['Linha "trabalhando" com a seta', 'Editar mensagem', 'IA local aparece na hora'] },
    { n: 'Painel', l: 'P', st: 'decidir', pend: ['decidir', 'mudancas'], d: 'hub dos aparelhos da casa', dt: '21/10', id: 'ontem', voce: 'escolher a cor do palco.', prox: 'aplicar a cor escolhida.', itens: [] },
    { n: 'Som', prog: 1, l: 'S', st: 'testar', d: 'equalizador e efeitos de todo o som', dt: '20/10', id: '2 dias', voce: '3 itens em PRA-TESTAR.', prox: 'ler o relato e corrigir.', itens: ['Travadas: usar o PC normal', 'Som 7.1 (jeito do Sonar)', 'Crossfeed (novo, aba Efeitos)'] },
    { n: 'Espelho', prog: 1, l: 'E', st: 'testar', pend: ['teste', 'publicado'], d: 'celular no PC', dt: '20/10', id: '2 dias', voce: '11 itens em PRA-TESTAR.', prox: 'ler o relato e corrigir.', itens: ['Barra do editor sem tranco', 'Câmera deitada'] },
    { n: 'Controles', l: 'C', st: 'livre', pend: ['publicar'], d: 'controles DualShock e DualSense', dt: '18/10', id: '4 dias', voce: '', prox: '', itens: [] },
    { n: 'Bancada', l: 'B', st: 'livre', d: 'bancada do háptico', dt: '15/10', id: '1 semana', voce: '', prox: '', itens: [] },
    { n: 'Teclado', l: 'T', st: 'livre', d: 'teclado sem o driver', dt: '11/10', id: '11 dias', voce: '', prox: '', itens: [] },
    { n: 'Narrador', l: 'N', st: 'parado', d: 'narrador de livros', dt: '02/10', id: '3 semanas', voce: '', prox: '', itens: [] },
  ];
  // sheet data (in app from disk): instructions, memory, past conversations
  for (const q of P) Object.assign(q, { dir: 'D:\\Projetos\\' + q.n, instr: q.d + '. Antes de mexer, ler o PARADA. Interface ≥ 99,50% igual ao protótipo escolhido…',
    mem: [{ n: 'PARADA.md', d: 'onde parou · ' + q.id, arq: 'docs\\PARADA.md' }, { n: 'CONTEXTO.md', d: 'ficha do projeto', arq: 'docs\\CONTEXTO.md' }, { n: 'contexto\\', d: '6 arquivos de detalhe', arq: 'docs\\contexto' }, { n: 'Memória do Claude', d: '3 notas sobre este projeto', arq: '' }],
    conversas: [{ id: 's1', txt: 'Linha "trabalhando" sem tranco', quando: 'hoje 00:10', tok: '410 mil' }, { id: 's2', txt: 'Build sem fechar o programa', quando: 'ontem 21:40', tok: '96 mil' }, { id: 's3', txt: 'Teste do PRA-TESTAR', quando: '21/10', tok: '31 mil' }] });
  // everything windows show (in app: tela\ponte.js builds with real data)
  const MIN = 6e4, H = 36e5, AGORA = +new Date(2026, 9, 28, 7, 36);   // account window countdown: reset moments in ms (like main.js), fixed clock lim.demo so photos match
  const D = {
    pasta: { raiz: 'D:\\Programas\\FCC', total: '15,1 GB',
      blocos: [{ id: 'perfil', tam: '2,4 GB', gb: 2.4, d: 'Regras, skills e conversas' }, { id: 'projects', tam: '9,6 GB', gb: 9.6, d: 'Pasta projects: 11 projetos' }, { id: 'conta', tam: '12 MB', gb: .01, d: 'Seus logins. Não vai para o perfil' }, { id: 'ferramentas', tam: '3,1 GB', gb: 3.1, d: 'Programas que se baixam de novo' }],
      perfil: { tam: '2,4 GB', itens: [['Regras e preferências', 'Como o Claude trabalha com você', '48 KB'], ['Skills', '31 skills', '14 MB'], ['Memórias e lições', 'O que o Claude aprendeu', '2 MB'], ['Conversas', 'Todo o histórico, para retomar', '2,3 GB'], ['Dados do programa', 'Abas, rascunhos, estatísticas', '420 KB']] },
      outro: null, auto: true, contas: [['voce@exemplo.com', 'Conta ativa · Max', 'ok'], ['outra@exemplo.com', 'Login expirou', 'amb']],
      projetos: [['FAH', '6,6 GB'], ['FClone', '1,3 GB'], ['FNarra', '784 MB'], ['FHub', '376 MB'], ['Deskf', '337 MB'], ['scrcpy-f', '130 MB'], ['FKeys', '56 MB'], ['DSE', '24 MB'], ['HapticLab', '12 MB'], ['Junto', '8 MB'], ['FCC', '4 MB']], nProjetos: 11,
      dentro: [['claude-code', 'Motor das conversas', '240 MB', true], ['node', 'Usado pelo Claude nos projetos', '92 MB', false], ['dotnet', 'Compilar projetos em C#', '783 MB', false], ['ollama', 'IA local e 1 modelo', '2,0 GB', false]], dentroTam: '3,1 GB',
      sistema: [{ id: 'vcredist', nome: 'Visual C++ Redistributable', sub: '12/10/2026 · necessário para o Claude Code', origem: 'Instalado pelo FCC' }, { id: 'gh', nome: 'GitHub CLI', sub: '28/10/2026 · conversa "Publicar DSE"', origem: 'Detectado' }, { id: 'py313', nome: 'Python 3.13', sub: '02/11/2026 · conversa "Testes FAH"', origem: 'Detectado' }],
      envio: { regras: '48 KB', skills: '14 MB' }, precisa: '12 GB' },
    contas: [{ email: 'voce@exemplo.com', plano: 'Max', quando: 'agora' }, { email: 'outra@exemplo.com', plano: 'Pro', quando: 'hoje 09:12', uso: { sessao: { pct: 18, volta: '13:40', ate: AGORA + 6 * H + 4 * MIN }, semana: { pct: 71, volta: 'sexta às 10:00', ate: AGORA + 51 * H } } }],
    raiz: 'D:\\Projetos', conta: { email: 'voce@exemplo.com', plano: 'Max', desde: '18/10', versao: '2.1.98 · em dia' },
    lim: { demo: AGORA, sessao: { pct: 62, volta: '09:50', ate: AGORA + 2 * H + 14 * MIN }, semana: { pct: 35, volta: 'segunda às 08:00', ate: AGORA + 96 * H + 54 * MIN } }, memConversa: 24,
    local: { ligado: false, porta: 11434, modelo: 'qwen3:8b', carregado: false, gb: 5, cabe: 'cabe inteiro na placa', tps: '14 tok/s', primeira: '1,8 s', placa: '5,4 / 8 GB', placaNome: 'RTX 4060', hoje: '38 mil', pasta: 'D:\\FCC\\ferramentas\\ollama\\models',
      instalados: [{ n: 'qwen3:8b', d: '5 GB · cabe na placa' }, { n: 'Qwen2.5-Coder-7B', d: '6 GB · cabe na placa' }, { n: 'Gemma-3-12B', d: '6 GB · cabe na placa' }] },
    placa: 'RTX 4060 · 8 GB',
    loja: (() => { const V = (id, L) => L.map(([t, gb, qual, rec]) => ({ t, tag: id + ':' + t, gb, qual, rec: !!rec }));
      const L = { PC: { placa: 'RTX 4060', vram: 8, ram: 32, disco: 118 }, estado: 'ok', BUSCA: [], bench: null,
        CAT: [{ id: 'qwen3', nome: 'Qwen3', de: 'Alibaba', tipo: 'pop', caps: 'fp', ctx: 40, hot: 1, lic: 'Apache-2.0', desc: 'O melhor para programar no seu PC: segue instruções, usa ferramentas e pensa quando pedido.', v: V('qwen3', [['4b', 2.5, 3], ['8b', 5.2, 4, 1], ['14b', 9.3, 4], ['32b', 20.2, 5]]) },
          { id: 'qwen3-coder', nome: 'Qwen3 Coder', de: 'Alibaba', tipo: 'pop', caps: 'f', ctx: 256, hot: 1, lic: 'Apache-2.0', desc: 'Feito para código e agentes. Grande, mas só usa 3B por vez: mais rápido do que o tamanho sugere.', v: V('qwen3-coder', [['30b', 18.6, 5]]) },
          { id: 'gemma3', nome: 'Gemma 3', de: 'Google', tipo: 'pop', caps: 'v', ctx: 128, lic: 'Gemma', desc: 'Conversa natural, bom em português e lê imagens. Não usa ferramentas: não mexe em arquivos.', v: V('gemma3', [['4b', 3.4, 3], ['12b', 8.2, 4], ['27b', 17.4, 5]]) },
          { id: 'llama3.2', nome: 'Llama 3.2', de: 'Meta', tipo: 'pop', caps: 'f', ctx: 128, lic: 'Llama 3.2', desc: 'Pequeno e rápido: bom para resumir e responder coisa simples.', v: V('llama3.2', [['1b', 1.3, 2], ['3b', 2.0, 3]]) },
          { id: 'gpt-oss', nome: 'gpt-oss', de: 'OpenAI', tipo: 'pop', caps: 'fp', ctx: 128, hot: 1, lic: 'Apache-2.0', desc: 'Raciocínio forte com ferramentas, aberto da OpenAI.', v: V('gpt-oss', [['20b', 13.8, 4]]) },
          { id: 'deepseek-r1', nome: 'DeepSeek R1', de: 'DeepSeek', tipo: 'pop', caps: 'p', ctx: 128, lic: 'MIT', desc: 'Pensa bastante antes de responder: matemática e lógica.', v: V('deepseek-r1', [['7b', 4.7, 3], ['14b', 9.0, 4]]) },
          { id: 'huihui_ai/qwen3-abliterated', nome: 'Qwen3 abliterado', de: 'huihui_ai', tipo: 'livre', caps: 'fp', ctx: 40, hot: 1, lic: 'Apache-2.0', desc: 'Qwen3 sem as recusas. Mantém ferramentas e o modo pensar.', v: V('huihui_ai/qwen3-abliterated', [['4b', 2.5, 3], ['8b', 5.0, 4, 1], ['14b', 9.0, 4]]) },
          { id: 'dolphin3', nome: 'Dolphin 3', de: 'Cognitive Computations', tipo: 'livre', caps: 'f', ctx: 128, lic: 'Llama 3.1', desc: 'Clássico sem filtro em cima do Llama 3.1; usa ferramentas.', v: V('dolphin3', [['8b', 4.9, 3]]) }],
        INST: { 'qwen3:8b': { gb: 5.2, tps: 31, primeira: '0,9 s', usado: 'hoje' }, 'huihui_ai/qwen3-abliterated:8b': { gb: 5.0, tps: 27, primeira: '1,1 s', usado: 'ontem' }, 'llama3.2:3b': { gb: 2.0, tps: 74, primeira: '0,3 s', usado: '20/10' } },
        FILA: [{ n: 'qwen3-coder:30b', gb: 18.6, pct: 46, vel: '38 MB/s', falta: '4 min', st: 'ativo' }, { n: 'gemma3:12b', gb: 8.2, pct: 12, st: 'pausado' }, { n: 'dolphin3:8b', gb: 4.9, pct: 71, st: 'falhou', erro: 'a conexão caiu' }, { n: 'llama3.2:3b', gb: 2.0, pct: 100, st: 'ok' }],
        ACHADOS: [{ n: 'Llama-3.1-8B-Instruct-Q4_K_M.gguf', de: 'LM Studio', gb: 4.9, caminho: 'C:\\Users\\…\\.lmstudio\\models' }] };
      const INFO = { qwen3: ['41,3 mi', 'há 1 ano', ['256K', '40K', '40K', '40K']], 'qwen3-coder': ['3,1 mi', 'há 3 meses', ['256K']], gemma3: ['41,3 mi', 'há 2 semanas', ['128K', '128K', '128K']], 'llama3.2': ['86,1 mi', 'há 1 ano', ['128K', '128K']], 'gpt-oss': ['9,8 mi', 'há 2 meses', ['128K']], 'deepseek-r1': ['78 mi', 'há 5 meses', ['128K', '128K']], 'huihui_ai/qwen3-abliterated': ['368,1 mil', 'há 1 ano', ['40K', '40K', '40K']], dolphin3: ['4,4 mi', 'há 1 ano', ['128K']] };
      for (const m of L.CAT) { const i = INFO[m.id]; if (i) { m.baixados = i[0]; m.atualizado = i[1]; m.v.forEach((v, k) => { v.ctx = i[2][k]; v.ent = m.caps.includes('v') ? 'texto, imagem' : 'texto'; }); } }
      L.BUSCA = [{ id: 'hf.co/mradermacher/Qwen2.5-Coder-7B-GGUF:Q4_K_M', nome: 'Qwen2.5-Coder-7B-GGUF (Q4_K_M)', de: 'mradermacher · Hugging Face', fonte: 'mradermacher', gb: 5.6, q: 'Q4_K_M', baixados: '1,7 mi downloads', curtidas: 412, quando: 'há 2 meses', caps: 'v' },
        { id: 'dolphinlabs/qwen3.5-coder', nome: 'dolphinlabs/qwen3.5-coder', de: 'dolphinlabs · Ollama comunidade', fonte: 'comunidade', gb: 2.1, q: 'Q4_K_M', baixados: '757 downloads', quando: 'há 6 dias', ctx: '256K' },
        { id: 'hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M', nome: 'Llama-3.2-3B-Instruct-GGUF (Q4_K_M)', de: 'bartowski · Hugging Face', fonte: 'bartowski', gb: 2.2, q: 'Q4_K_M', baixados: '42 mil downloads', curtidas: 96, quando: 'há 1 ano' }];
      return L; })(),
    cat: [{ n: 'qwen3:8b', gb: '5,2 GB', cabe: 'cabe', inst: true }, { n: 'gemma3:12b', gb: '8,1 GB', cabe: 'meio' }, { n: 'llama3.2:3b', gb: '2,0 GB', cabe: 'cabe' }, { n: 'qwen3:32b', gb: '20 GB', cabe: 'nao' }],
    busca: [{ n: 'Qwen2.5-Coder-7B', d: 'Hugging Face · Q4_K_M · 5,6 GB' }, { n: 'Gemma-3-12B', d: 'Hugging Face · Q4_K_M · 5,9 GB' }, { n: 'dolphin3:8b', d: 'Ollama · 4,9 GB' }], buscaTx: 'coder 9b',
    est: { total: '1,55 mi', rotulo: 'Tokens nos últimos 7 dias', delta: '▲ 18% que a semana passada', mini: [['chat', '14', 'conversas'], ['relogio', '6 h 10', 'com o Claude'], ['cpu', '14 tok/s', 'IA local'], ['raio', '62%', 'do limite de 5 h']],
      dias: [['qui', 180], ['sex', 245], ['sáb', 60], ['dom', 35], ['seg', 290], ['ter', 410], ['qua', 330]], escala: [400, 300, 200, 100, 0], max: 420,
      proj: [['FCC', 570], ['Painel', 254], ['Som', 167], ['Espelho', 93], ['outros', 66]],
      recentes: [['FCC', 'Opus 5.5', 'hoje 00:10', '1 h 22', '410 mil'], ['Painel', 'Opus 5.5', 'ontem 21:40', '35 min', '96 mil'], ['Som', 'qwen3:8b', 'ontem 14:02', '12 min', '31 mil']] },
    regras: [{ n: 'Regras da casa', arq: 'CLAUDE-global.md', tx: 'Resposta curta e direta, português. Modo automático: com o aval, faz tudo sozinho… Parada sempre grave no PARADA.md…', pasta: 'A:\\…\\FCC\\familias' }, { n: 'Gostos', arq: 'GOSTOS.md', tx: 'Telas extras como janela por cima. Botões da barra estreitos, fechar 40 na borda; segurar 1 s sai…', pasta: 'A:\\…\\FCC\\familias' }, { n: 'Aprendizados', arq: 'APRENDIZADOS.md', tx: 'Botão dentro de um trecho que um timer refaz perde o clique… Programa em que o próprio Claude roda: o build nunca fecha…', pasta: 'A:\\…\\FCC\\familias' }],
    memorias: [{ id: 'm1', tx: 'Avaliação honesta > concordância', quando: 'hoje' }, { id: 'm2', tx: 'Ele testa pelo .exe, não pelo código', quando: '22/10' }, { id: 'm3', tx: 'Nunca publicar sem o aval dele naquele pedido', quando: '11/10' }], memPasta: '%USERPROFILE%\\.claude\\…\\memory',
    skills: [{ n: 'design-ux-ui', d: 'a porta da interface: 3 propostas antes de codar' }, { n: 'faxina-projeto', d: 'formato da casa para a pasta' }, { n: 'interface-polida', d: 'padrão de interface aprovado' }, { n: 'testar-com-ele', d: 'provar sozinho antes de pedir teste' }, { n: 'engenharia-reversa', d: 'mod, protocolo, decompilar' }],
    prep: { pct: 50, aviso: 'Num PC recém-formatado a 1ª vez leva alguns minutos; depois, 1 segundo.', et: [['Visual C++ (peça do Windows)', 'ok', 'ok'], ['Claude Code', 'ok', 'ok'], ['Regras e skills', 'esperando', 'espera'], ['Ollama (IA local)', 'esperando', 'espera'], ['Conta', 'esperando', 'espera']].map(([nome, txt, st]) => ({ nome, txt, st })) },
    rascunhos: [{ id: 'r1', titulo: 'Ideia: app de treino com o DualSense', quando: 'hoje 01:20' }, { id: 'r2', titulo: 'Prompt de troca de personagens', quando: 'ontem 22:05' }, { id: 'r3', titulo: 'Comparar placas de vídeo', quando: '21/10' }],
    sessao: [{ nome: 'Som' }, { nome: 'Espelho' }, { nome: 'Chat livre' }], fecharNome: 'FCC',
    versao: 'versão de 22/10 · 23:58', claudeVersao: '2.1.98 · em dia', pastas: ['D:\\Projetos', 'D:\\Trabalho'],
  };
  const CONVERSA = () => [
    { k: 'eu', txt: 'Continue de onde parou (docs\\PARADA.md).' },
    { k: 'ferr', verbo: 'Leu', alvo: 'docs\\PARADA.md', res: '40 linhas' }, { k: 'ferr', verbo: 'Leu', alvo: 'docs\\PRA-TESTAR.md', res: '52 linhas' },
    { k: 'ia', html: '<p>Li o PARADA. Paramos esperando o seu teste:</p><ul><li>Linha "trabalhando" com a seta</li><li>Editar mensagem</li><li>IA local aparece na hora</li></ul><p>Você precisa: fechar o programa uma vez; ele volta sozinho, novo.</p>' },
    { k: 'eu', txt: '@C:\\Users\\voce\\Desktop\\seta-erro.log\nA seta ao lado da ação não abre direito.' },
    { k: 'pensou', seg: 8, txt: 'Procurando onde a linha é desenhada.' }, { k: 'ferr', verbo: 'Buscou', alvo: 'rodapeHTML', res: '3 resultados' }, { k: 'ferr', verbo: 'Editou', alvo: 'abas\\tela\\app.js', res: 'salvo' },
    { k: 'ia', html: '<p>Achei: a linha era refeita 6 vezes por segundo e o clique se perdia. Agora só o ícone e o tempo mudam.</p>' },
  ];
  return { P, D, CONVERSA };
})();