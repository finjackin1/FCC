(async () => { const R = {}; const T = () => jan();
  await tecla('k', { ctrlKey: true }, 'body'); R.focoBusca = document.activeElement?.id;
  document.activeElement.value = 'Alf'; document.activeElement.dispatchEvent(new Event('input', { bubbles: true })); await espera(500); R.busca = ($q('#lado')?.innerText || '').replace(/\n+/g, ' / ').slice(0, 200) + ' || ' + ($q('.menu,.res')?.innerText || '').replace(/\n+/g, ' / ').slice(0, 150);
  await tecla('Escape'); document.activeElement.blur?.();
  const cb = () => $q('#lado .conta .item');
  await clk(cb(), 400); R.menuConta = menuT().join(' | '); await opc('Gerenciar contas', 800); R.contas = T(); await fechar();
  await clk(cb(), 400); await opc('Adicionar conta', 800); R.add = T().slice(0, 200); await ac('loginCancelar', 400); R.add2 = T();
  await clk(cb(), 400); await opc('Opções', 800);
  const nav = i => clk('.op-nav button:nth-child(' + (i + 2) + ')', 500); const sec = () => $q('.op-trilho section.on')?.innerText.replace(/\n+/g, ' / ').slice(0, 300);
  for (let i = 0; i < 4; i++) { await nav(i); R['op' + i] = sec(); }
  await nav(0); for (const v of ['escuro', 'auto', 'claro']) { await clk('[data-acao="escolha"][data-v="' + v + '"]', 350); R['tema_' + v] = document.documentElement.dataset.tema; }
  await nav(1); for (const k of ['excRapido']) { await clk('[data-k="' + k + '"]', 250); R[k] = $q('[data-k="' + k + '"]').className; await clk('[data-k="' + k + '"]', 250); }
  await nav(2); await clk('[data-k="autoAtual"]', 250); R.auto = $q('[data-k="autoAtual"]').className; await clk('[data-k="autoAtual"]', 250); await ac('procurarAtual', 1500); R.procurar = AVS.splice(0).join('|');
  await nav(3); await clk('[data-k="avisoFim"]', 250); R.avisoFim = $q('[data-k="avisoFim"]').className; await clk('[data-k="avisoFim"]', 250);
  await ac('memoria', 1200); R.mem = T().slice(0, 300); await fechar();
  await clk(cb(), 400); await opc('Opções', 600); await nav(3); await ac('estat', 1000); R.est = T().slice(0, 250); await clk('[data-per="30"]', 500); R.est30 = T().slice(0, 80); await fechar();
  await clk(cb(), 400); await opc('Opções', 600); await nav(3); await ac('pastaFcc', 2500); R.pasta = T().slice(0, 500);
  const rem = $q('.tampa [data-a="remover"]'); if (rem) { rem.click(); await espera(400); R.rem = 'cf=' + (window.CF || []).length + ' disabled=' + rem.disabled; }
  await fechar(); R.ERR = ERR; return JSON.stringify(R, null, 1); })()
